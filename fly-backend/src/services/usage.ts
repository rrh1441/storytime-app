/**
 * services/usage.ts
 * --------------------------------------------------------------------------
 * Supabase helpers for enforcing the “one free story ever” rule.
 * --------------------------------------------------------------------------
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/* -------------------------------------------------------------------------- */
/*  Run‑time env‑var verification so the container fails fast if mis‑configured */
/* -------------------------------------------------------------------------- */
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  // Optional: tune fetch timeout etc. here
});

/* -------------------------------------------------------------------------- */
/*  Public helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Returns true if this session‑id has **already** used its free story.
 */
export async function checkStoryUsed(sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("story_usage")
    .select("used")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    // Bubble a typed error so index.ts can respond 5xx & log once.
    throw new Error(`Supabase read error: ${error.message}`);
  }
  return Boolean(data?.used);
}

/**
 * Marks the sessionId as “used”, recording the client IP and timestamp.
 * idempotent: UPSERT on the PK (session_id).
 */
export async function markStoryUsed(
  sessionId: string,
  ip: string | null
): Promise<void> {
  const { error } = await supabase.from("story_usage").upsert({
    session_id: sessionId,
    ip,
    used: true,
    used_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }
}