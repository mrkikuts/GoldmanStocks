import { createServerFn } from "@tanstack/react-start";

import {
  completeTask as completeTaskImpl,
  createPhotoUploadUrl as createPhotoUploadUrlImpl,
  CompleteTaskInput,
  PhotoUploadInput,
} from "@/lib/server/photos";

/**
 * Server-function wrappers for B5's photo proof, the pieces `src/lib/server/photos.ts` left for
 * track A's client to supply.
 *
 * These use the service-role client rather than the request's session: the bucket is private with
 * no storage policies, so only the service role can mint a signed upload URL. It is imported
 * inside the handler because `@/lib/supabase/server` is marked server-only — a static import
 * would put it in the client's module graph.
 */

/** Step 1: a one-time signed URL the worker's phone uploads the photo straight to. */
export const createPhotoUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: PhotoUploadInput) => PhotoUploadInput.parse(input))
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/lib/supabase/server");
    return createPhotoUploadUrlImpl(getAdminClient(), data);
  });

/** Step 3: record the proof and mark the task done. Rejects a photo that never arrived. */
export const completeTask = createServerFn({ method: "POST" })
  .inputValidator((input: CompleteTaskInput) => CompleteTaskInput.parse(input))
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/lib/supabase/server");
    return completeTaskImpl(getAdminClient(), data);
  });
