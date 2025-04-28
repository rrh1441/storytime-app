import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

router.get("/tts/preview", async (req, res) => {
  const voice = String(req.query.voice ?? "");
  if (!voice) return res.status(400).send("voice query param required");

  const { data, error } = await sb
    .storage.from("voice-previews")
    .createSignedUrl(`${voice}.mp3`, 60 * 60); // 1 h

  if (error) return res.status(500).send(error.message);
  res.json({ url: data.signedUrl });
});

export default router;
