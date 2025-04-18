/**
 * index.ts • 2025‑04‑18  (FULL FILE)
 * --------------------------------------------------------------------------
 * One‑free‑story gate is TEMPORARILY DISABLED for all requests.
 * All other behaviour remains intact.
 * --------------------------------------------------------------------------
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import helmet from "helmet";

import { generateStory } from "./services/story.js";
import { generateSpeech, VOICES } from "./services/tts.js";

const PORT = Number(process.env.PORT) || 8080;

const app = express();

/* ---------------- Security / logging / rate‑limit ---------------- */
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/* ---------------- Healthcheck ---------------- */
app.get("/health", (_req, res) => res.status(200).send("ok"));

/* ---------------- Story generation ---------------- */
app.post("/generate-story", async (req: Request, res: Response) => {
  const sessionId = req.header("x-session-id") ?? "anonymous";
  const ip = req.ip;

  try {
    // ❗️Free‑story limit temporarily disabled (no usage checks)

    const story = await generateStory(req.body);

    // ❗️No markStoryUsed call either — unlimited stories during testing

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
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

/* ---------------- Start server ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🛫  backend listening on http://0.0.0.0:${PORT}`);
});
