// services/storage.ts
// --------------------------------------------------------------------------
// Shared helper for uploading files to Supabase Storage using *service‑role*
// credentials. This client bypasses RLS on storage.objects by design.
// --------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Environment validation – fail fast if mis‑configured.
// ---------------------------------------------------------------------------
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
}

// ---------------------------------------------------------------------------
// Service‑role client (never persists or auto‑injects user sessions)
// ---------------------------------------------------------------------------
const supabaseService: SupabaseClient = createClient(
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

const BUCKET = "story-audio" as const;

/**
 * Uploads a Buffer to the configured Storage bucket and returns a public URL.
 * The upload path is automatically namespaced with a timestamp for uniqueness.
 */
export async function uploadAudio(
  filename: string,
  file: Buffer,
  contentType: string = "audio/mpeg"
): Promise<string> {
  const objectPath = `${Date.now()}_${filename}`;

  const { error } = await supabaseService.storage
    .from(BUCKET)
    .upload(objectPath, file, { contentType, upsert: true });

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }

  const { data } = supabaseService.storage.from(BUCKET).getPublicUrl(objectPath);
  if (!data.publicUrl) {
    throw new Error("Failed to retrieve public URL for uploaded audio.");
  }
  return data.publicUrl;
}

export { supabaseService };
