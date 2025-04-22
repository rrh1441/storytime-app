// -----------------------------------------------------------------------------
// GET /api/preview-voice/:label  →  returns a short MP3 sample
// -----------------------------------------------------------------------------

import { Router } from "express";
import { generateSpeech } from "../services/tts.js"; // 👈  add .js

export const voicePreview = Router();

voicePreview.get("/:label", async (req, res) => {
  try {
    const { mp3Buffer, contentType } = await generateSpeech(
      "Hi there! Here's how I sound.",
      req.params.label,
    );
    res.setHeader("Content-Type", contentType);
    res.send(mp3Buffer);
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: (err as Error).message ?? "voice preview failed" });
  }
});
