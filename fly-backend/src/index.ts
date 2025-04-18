/**
 * index.ts • 2025‑04‑18
 * --------------------------------------------------------------------------
 * Adds an env‑flag (DISABLE_STORY_LIMIT=true) that bypasses the one‑free‑story
 * enforcement — handy for temporary testing.  All other behavior unchanged.
 * --------------------------------------------------------------------------
 */
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import helmet from "helmet";

import { generateStory } from "./services/story.js";
import { generateSpeech, VOICES } from "./services/tts.js";
import { checkStoryUsed, markStoryUsed } from "./services/usage.js";

const PORT = Number(process.env.PORT) || 8080;
const STORY_LIMIT_DISABLED = process.env.DISABLE_STORY_LIMIT === "true";

const app = express();

/* ---------------- Security / logging / rate‑limit ---------------- */
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false }));

/* ---------------- Healthcheck ---------------- */
app.get("/health", (_req, res) => res.status(200).send("ok"));

/* ---------------- Story generation ---------------- */
app.post("/generate-story", async (req: Request, res: Response) => {
  const sessionId = req.header("x-session-id") ?? "anonymous";
  const ip        = req.ip;

  try {
    if (!STORY_LIMIT_DISABLED) {
      const alreadyUsed = await checkStoryUsed(sessionId);
      if (alreadyUsed) {
        return res.status(429).json({ error: "Free story already used. Upgrade to continue." });
      }
    }

    const story = await generateStory(req.body);

    if (!STORY_LIMIT_DISABLED) {
      await markStoryUsed(sessionId, ip);
    }

    return res.status(200).json(story);
  } catch (err: any) {
    console.error("Error generating story:", err);
    return res.status(500).json({ error: err.message ?? "Unexpected error" });
  }
});

/* ---------------- TTS ---------------- */
app.post("/tts", async (req: Request, res: Response) => {
  try {
    const { text, voice = "alloy", language = "English" } = req.body;
    const audioUrl = await generateSpeech(text, voice, language);
    res.status(200).json({ audioUrl });
  } catch (err: any) {
    console.error("Error generating speech:", err);
    res.status(500).json({ error: err.message ?? "Unexpected error" });
  }
});

app.get("/voices", (_req: Request, res: Response) => res.status(200).json({ voices: VOICES }));

/* ---------------- Global error handler ---------------- */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ---------------- Start server ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🛫  backend listening on http://0.0.0.0:${PORT}`);
});
