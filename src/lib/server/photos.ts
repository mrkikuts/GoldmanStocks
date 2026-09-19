import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";

import type { TaskPhoto } from "@/lib/types";
import { localDate } from "@/lib/weather";

/**
 * Photo proof of work (B5), backend only. The flow a worker app will use:
 *   1. createPhotoUploadUrl(taskId) → a one-time signed upload URL
 *   2. upload the photo with `supabase.storage.from(PHOTO_BUCKET).uploadToSignedUrl(path, token, file)`
 *   3. completeTask({ taskId, photoPath: path, takenAt, lat, lng }) → task is done, with proof
 *
 * Every function takes the service-role Supabase client; `createServerFn` wrappers
 * are added when track A's client (A1) lands.
 */

export const PHOTO_BUCKET = "task-photos";

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const;

export const PhotoUploadInput = z.object({
  taskId: z.string().min(1),
  contentType: z.enum(Object.keys(EXTENSIONS) as [keyof typeof EXTENSIONS]),
});
export type PhotoUploadInput = z.infer<typeof PhotoUploadInput>;

export const CompleteTaskInput = z.object({
  taskId: z.string().min(1),
  /** the `path` returned by createPhotoUploadUrl */
  photoPath: z.string().min(1),
  /** when the photo was taken, ISO 8601 with offset */
  takenAt: z.iso.datetime({ offset: true }),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});
export type CompleteTaskInput = z.infer<typeof CompleteTaskInput>;

/** A photo may only be attached to the task it was uploaded for. */
export function photoFolder(taskId: string) {
  return `tasks/${taskId}/`;
}

async function assertTaskExists(db: SupabaseClient, taskId: string) {
  const { data, error } = await db
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Task ${taskId} not found`);
}

/** Step 1: a signed URL the worker's phone can upload one photo to (valid for 2 hours). */
export async function createPhotoUploadUrl(
  db: SupabaseClient,
  input: PhotoUploadInput,
) {
  const { taskId, contentType } = PhotoUploadInput.parse(input);
  await assertTaskExists(db, taskId);
  const path = `${photoFolder(taskId)}${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
  const { data, error } = await db.storage
    .from(PHOTO_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data; // { signedUrl, token, path }
}

type PhotoRow = {
  id: string;
  task_id: string;
  storage_path: string;
  taken_at: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

const fromRow = (r: PhotoRow): TaskPhoto => ({
  id: r.id,
  taskId: r.task_id,
  storagePath: r.storage_path,
  takenAt: r.taken_at,
  lat: r.lat,
  lng: r.lng,
  createdAt: r.created_at,
});

/**
 * Step 3: record the proof and mark the task done. Refuses photos that weren't
 * uploaded for this task or that never arrived in storage.
 */
export async function completeTask(
  db: SupabaseClient,
  input: CompleteTaskInput,
): Promise<TaskPhoto> {
  const { taskId, photoPath, takenAt, lat, lng } =
    CompleteTaskInput.parse(input);
  if (!photoPath.startsWith(photoFolder(taskId))) {
    throw new Error("That photo was not uploaded for this task");
  }
  await assertTaskExists(db, taskId);

  const { data: uploaded, error: existsError } = await db.storage
    .from(PHOTO_BUCKET)
    .exists(photoPath);
  // Storage answers a missing object with an error ("Bad Request"), not `false`.
  if (existsError || !uploaded) {
    throw new Error("Photo not found — upload it first", {
      cause: existsError,
    });
  }

  const { data: photo, error: insertError } = await db
    .from("task_photos")
    .insert({
      task_id: taskId,
      storage_path: photoPath,
      taken_at: takenAt,
      lat,
      lng,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  const { data: task, error: updateError } = await db
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .select("title, plant_id, worker_id")
    .single();
  if (updateError) throw updateError;

  // The job becomes part of the plant's history: a done care event, and a fresh last-care date.
  if (task.plant_id) {
    const date = localDate(new Date(takenAt));
    const { error: careError } = await db.from("care_events").insert({
      plant_id: task.plant_id,
      task_id: taskId,
      worker_id: task.worker_id,
      date,
      action: task.title,
      done: true,
    });
    if (careError) throw careError;
    const { error: plantError } = await db
      .from("plants")
      .update({ last_care: date })
      .eq("id", task.plant_id);
    if (plantError) throw plantError;
  }

  return fromRow(photo as PhotoRow);
}

/** The latest proof photo for a task, with a signed download URL (valid for 1 hour). */
export async function getTaskPhotoUrl(db: SupabaseClient, taskId: string) {
  const { data, error } = await db
    .from("task_photos")
    .select()
    .eq("task_id", taskId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const photo = fromRow(data as PhotoRow);
  const { data: signed, error: signError } = await db.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(photo.storagePath, 60 * 60);
  if (signError) throw signError;
  return { ...photo, url: signed.signedUrl };
}
