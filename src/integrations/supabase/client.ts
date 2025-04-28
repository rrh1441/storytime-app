// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Explicitly read from import.meta.env for Vite projects
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- Logging Added ---
console.log("[SupabaseClient] Initializing...");
console.log("[SupabaseClient] VITE_SUPABASE_URL:", SUPABASE_URL ? 'Loaded' : 'MISSING!');
// Log only a portion of the key for security, but confirm it's loaded
console.log("[SupabaseClient] VITE_SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? 'Loaded (starts: ' + SUPABASE_ANON_KEY.substring(0, 10) + '...)' : 'MISSING!');
// --- End Logging ---

// Check if variables are missing and log errors
if (!SUPABASE_URL) {
    console.error("[SupabaseClient] FATAL ERROR: VITE_SUPABASE_URL is not defined in environment variables. Check your .env file and Vercel/hosting environment variables.");
    // Optionally alert the user or throw an error to stop execution if this is critical
    // alert("Application configuration error: Supabase URL is missing. Please contact support.");
}
if (!SUPABASE_ANON_KEY) {
    console.error("[SupabaseClient] FATAL ERROR: VITE_SUPABASE_ANON_KEY is not defined in environment variables. Check your .env file and Vercel/hosting environment variables.");
    // Optionally alert the user
    // alert("Application configuration error: Supabase Key is missing. Please contact support.");
}

// Initialize client
// The '!' asserts that the values are non-null; the checks above should clarify if they are missing.
// If they *are* missing, createClient will likely error anyway, but logging helps identify *why*.
export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// --- Logging Added ---
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  // Check if the initialized client looks like a valid object
  if (supabase && typeof supabase.auth?.getSession === 'function') {
      console.log("[SupabaseClient] Supabase client instance CREATED successfully and looks valid.");
  } else {
       console.error("[SupabaseClient] Supabase client instance CREATED but appears INVALID (missing expected methods?).");
  }
} else {
  console.error("[SupabaseClient] Supabase client instance creation SKIPPED due to missing URL or Key.");
}
// --- End Logging ---