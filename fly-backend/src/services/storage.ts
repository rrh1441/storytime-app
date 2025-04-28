// services/storage.ts
// --------------------------------------------------------------------------
// Upload helper that always bypasses RLS by using the service‑role key.
// Bucket name is configurable via env (STORY_AUDIO_BUCKET) and defaults to
// `story_assets`.
// --------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ── Env validation ──────────────────────────────────────────────────────────
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  STORY_AUDIO_BUCKET,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
}

// ── Service‑role client (never auto‑injects user JWT) ───────────────────────
export const supabaseService: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    },
  }
);

// ── Bucket config ───────────────────────────────────────────────────────────
const BUCKET = (STORY_AUDIO_BUCKET || "story_assets") as const;

/** Ensure bucket exists (idempotent). */
await supabaseService.storage
  .createBucket(BUCKET, { public: true })
  .catch(() => {}); // ignore "already exists"

/**
 * Upload a Buffer to Supabase Storage and return its public URL.
 */
export async function uploadAudio(
  filename: string,
  file: Buffer,
  contentType: string = "audio/mpeg"
): Promise<string> {
  const objectPath = `${Date.now()}_${randomUUID()}_${filename}`;

  const { error } = await supabaseService.storage
    .from(BUCKET)
    .upload(objectPath, file, { contentType, upsert: true });

  if (error) {
    console.error("Storage upload raw error →", error); // ← detailed log
    throw new Error(`Supabase upload error: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabaseService.storage.from(BUCKET).getPublicUrl(objectPath);

  if (!publicUrl) {
    throw new Error("Failed to retrieve public URL for uploaded audio.");
  }
  return publicUrl;
}
