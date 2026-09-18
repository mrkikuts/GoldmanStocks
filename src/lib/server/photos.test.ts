/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CompleteTaskInput,
  completeTask,
  photoFolder,
  PhotoUploadInput,
} from "./photos";

// The storage + database flow is exercised against the real Supabase project by a
// throwaway script (see the B5 commit); these tests cover validation that must hold
// before anything touches the database.

/** A client that fails loudly if anything reaches the database. */
const untouchable = new Proxy(
  {},
  {
    get() {
      throw new Error("database should not be reached");
    },
  },
) as SupabaseClient;

const valid = {
  taskId: "t1",
  photoPath: "tasks/t1/abc.jpg",
  takenAt: "2026-09-21T08:15:00+03:00",
  lat: 59.42,
  lng: 24.8,
};

describe("input validation", () => {
  test("only image types the bucket accepts", () => {
    expect(
      PhotoUploadInput.safeParse({ taskId: "t1", contentType: "image/jpeg" })
        .success,
    ).toBe(true);
    expect(
      PhotoUploadInput.safeParse({ taskId: "t1", contentType: "text/html" })
        .success,
    ).toBe(false);
  });

  test("timestamps need an offset; GPS must be on the globe or null", () => {
    expect(CompleteTaskInput.safeParse(valid).success).toBe(true);
    expect(
      CompleteTaskInput.safeParse({ ...valid, lat: null, lng: null }).success,
    ).toBe(true);
    expect(
      CompleteTaskInput.safeParse({ ...valid, takenAt: "yesterday" }).success,
    ).toBe(false);
    expect(CompleteTaskInput.safeParse({ ...valid, lat: 123 }).success).toBe(
      false,
    );
  });
});

describe("completeTask", () => {
  test("a photo uploaded for another task is refused before any DB call", async () => {
    await expect(
      completeTask(untouchable, { ...valid, photoPath: "tasks/t2/abc.jpg" }),
    ).rejects.toThrow("not uploaded for this task");
  });

  test("the folder check can't be fooled by a shared id prefix", () => {
    expect("tasks/t10/x.jpg".startsWith(photoFolder("t1"))).toBe(false);
  });
});
