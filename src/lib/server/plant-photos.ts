import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";

import { PHOTO_BUCKET } from "./photos";

/**
 * A plant's own picture, taken when a worker registers it. Same private bucket as job proof,
 * under plants/…:
 *   1. createPlantPhotoUpload → a signed URL for plants/pending/<uuid>.<ext> (the plant has no
 *      id yet while the worker is still filling in the form)
 *   2. the phone uploads straight to storage
 *   3. attachPlantPhoto moves it to plants/<plantId>/photo.<ext> once the plant is saved
 */

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const;
type ContentType = keyof typeof EXTENSIONS;

export const PlantPhotoUploadInput = z.object({
  contentType: z.enum(Object.keys(EXTENSIONS) as [ContentType]),
});

export const AttachPlantPhotoInput = z.object({
  plantId: z.string().min(1),
  path: z.string().startsWith("plants/pending/"),
});

const plantFolder = (plantId: string) => `plants/${plantId}`;

export async function createPlantPhotoUpload(
  db: SupabaseClient,
  input: z.infer<typeof PlantPhotoUploadInput>,
) {
  const { contentType } = PlantPhotoUploadInput.parse(input);
  const path = `plants/pending/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
  const { data, error } = await db.storage
    .from(PHOTO_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return { ...data, bucket: PHOTO_BUCKET };
}

/** Move an uploaded picture onto a saved plant, replacing any earlier one. */
export async function attachPlantPhoto(
  db: SupabaseClient,
  input: z.infer<typeof AttachPlantPhotoInput>,
) {
  const { plantId, path } = AttachPlantPhotoInput.parse(input);
  const { data: plant, error: plantError } = await db
    .from("plants")
    .select("id")
    .eq("id", plantId)
    .maybeSingle();
  if (plantError) throw plantError;
  if (!plant) throw new Error(`Plant ${plantId} not found`);

  const storage = db.storage.from(PHOTO_BUCKET);
  const { data: existing } = await storage.list(plantFolder(plantId));
  if (existing?.length) {
    await storage.remove(
      existing.map((f) => `${plantFolder(plantId)}/${f.name}`),
    );
  }
  const target = `${plantFolder(plantId)}/photo.${path.split(".").pop()}`;
  const { error } = await storage.move(path, target);
  if (error)
    throw new Error("Photo not found — upload it first", { cause: error });
  return { path: target };
}

/** A signed URL for the plant's picture (1 hour), or null when it has none. */
export async function getPlantPhotoUrl(db: SupabaseClient, plantId: string) {
  const storage = db.storage.from(PHOTO_BUCKET);
  const { data: files, error } = await storage.list(plantFolder(plantId));
  if (error) throw error;
  const photo = files?.find((f) => f.name.startsWith("photo."));
  if (!photo) return null;
  const { data, error: signError } = await storage.createSignedUrl(
    `${plantFolder(plantId)}/${photo.name}`,
    60 * 60,
  );
  if (signError) throw signError;
  return data.signedUrl;
}
