/**
 * index.ts • 2025‑04‑18  (FULL FILE)
 * --------------------------------------------------------------------------
 * • CORS enabled for https://yourstorytime.vercel.app  (or ENV override)
 * • One‑free‑story gate TEMPORARILY DISABLED
 * • All other behaviour unchanged
 * --------------------------------------------------------------------------
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import { generateStory } from "./services/story.js";
import { generateSpeech, VOICES } from "./services/tts.js";

const PORT = Number(process.env.PORT) || 8080;

/* ────────── Express app ────────── */
const app = express();

/* ----------- security / logging / rate‑limit ----------- */
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN ??
      "https://yourstorytime.vercel.app", // <‑‑ default front‑end origin
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"),
);
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/* ---------------- healthcheck ---------------- */
app.get("/health", (_req, res) => res.status(200).send("ok"));

/* ---------------- story generation ---------------- */
app.post("/generate-story", async (req: Request, res: Response) => {
  try {
    /* ❗️ free‑story limit disabled for testing */
    const story = await generateStory(req.body);
    /* no markStoryUsed — unlimited stories */
    return res.status(200).json(story);
  } catch (err: any) {
    console.error("Error generating story:", err);
    return res
      .status(500)
      .json({ error: err.message ?? "Unexpected error" });
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
    res
      .status(500)
      .json({ error: err.message ?? "Unexpected error" });
  }
});

/* ---------------- voices list ---------------- */
app.get("/voices", (_req: Request, res: Response) =>
  res.status(200).json({ voices: VOICES }),
);

/* ---------------- global error handler ---------------- */
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

/* ---------------- start server ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🛫  backend listening on http://0.0.0.0:${PORT}`);
});
