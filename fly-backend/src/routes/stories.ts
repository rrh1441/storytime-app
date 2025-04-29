import { Router } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL = "",
  SUPABASE_SERVICE_ROLE_KEY = "",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase env vars missing for /stories routes");
}

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const router = Router();

/** GET /stories/:id  → full row */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: "Story not found" });
  return res.json(data);
});

/** PATCH /stories/:id  → partial update (markdown, title, audio_url, etc.) */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Empty payload" });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("stories")
    .update(updates)
    .eq("id", id);

  if (error) return res.status(500).json({ error: "Update failed" });
  return res.status(204).end();
});

export default router;
