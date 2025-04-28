/**
 * services/usage.ts
 * --------------------------------------------------------------------------
 * Supabase helpers for enforcing the “one free story ever” rule.
 * Uses a *dedicated* service-role client that can never inherit a user JWT.
 * --------------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* -------------------------------------------------------------------------- */
/*  Run-time env-var verification ­– fail fast if the container is mis-configured */
/* -------------------------------------------------------------------------- */
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
}

/* -------------------------------------------------------------------------- */
/*  Service-only client                                                       */
/*  ­– can *never* pick up a user session                                     */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*  Public helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Returns true if this session-id has **already** used its free story.
 */
export async function checkStoryUsed(sessionId: string): Promise<boolean> {
  const { data, error } = await supabaseService
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
  const { error } = await supabaseService
    .from("story_usage")
    .upsert(
      {
        session_id: sessionId,
        ip,
        used: true,
        used_at: new Date().toISOString(),
      },
      { onConflict: "session_id" } // ensures proper UPSERT semantics
    );

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }
}
