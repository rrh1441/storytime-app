/**
 * index.ts (entry point)
 * --------------------------------------------------------------------------
 * Express + Fly.io “one free story” backend.
 * --------------------------------------------------------------------------
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import helmet from "helmet";

import { generateStory } from "./services/story.js";   // you already have this
import { generateSpeech, VOICES } from "./services/tts.js";
import { checkStoryUsed, markStoryUsed } from "./services/usage.js";

/* -------------------------------------------------------------------------- */
/*  Express app setup                                                         */
/* -------------------------------------------------------------------------- */
const app = express();
const PORT: number = Number(process.env.PORT ?? 8080);

// Basic hardening & body parsing
app.use(helmet());
app.use(express.json({ limit: "2mb" }));

// HTTP request logging ──────────────────────────────────────────────────────
// Install once:  npm i morgan @types/morgan --save
// Switch "dev" to "combined" in prod if you like CloudFront / access‑log style
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Generic abuse / DDoS protection
app.use(
  rateLimit({
    windowMs: 60_000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* -------------------------------------------------------------------------- */
/*  Health check                                                              */
/* -------------------------------------------------------------------------- */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

/* -------------------------------------------------------------------------- */
/*  Story generation: 1‑time free tier                                        */
/* -------------------------------------------------------------------------- */
interface GenerateStoryBody {
  theme: string;
  mainCharacter: string;
  educationalFocus?: string;
  additionalInstructions?: string;
}

app.post(
  "/generate-story",
  async (req: Request<{}, {}, GenerateStoryBody>, res: Response) => {
    // session‑id expected from front‑end (e.g., localStorage) via header
    const sessionId = req.header("x-session-id");
    const ip = req.ip ?? req.headers["x-forwarded-for"]?.toString() ?? null;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing x-session-id header." });
    }

    try {
      // 1. Enforce “one ever”
      const alreadyUsed = await checkStoryUsed(sessionId);
      if (alreadyUsed) {
        return res
          .status(429)
          .json({ error: "Free story already used. Please upgrade." });
      }

      // 2. Business logic
      const story = await generateStory(req.body);

      // 3. Persist usage *before* responding (best‑effort)
      await markStoryUsed(sessionId, ip);

      return res.status(200).json(story);
    } catch (err: unknown) {
      // Let the central error handler capture it
      return res.status(500).json({ error: "Unexpected server error." });
    }
  }
);

/* -------------------------------------------------------------------------- */
/*  Text‑to‑speech endpoint (optional to the “one free” limit)                */
/* -------------------------------------------------------------------------- */
app.post("/tts", async (req: Request, res: Response) => {
  try {
    const { text, voice = "alloy", language = "English" } = req.body;
    const audioUrl = await generateSpeech(text, voice, language);
    return res.status(200).json({ audioUrl });
  } catch (err: unknown) {
    console.error("TTS error:", err);
    return res.status(500).json({ error: "Failed to generate speech." });
  }
});

/* -------------------------------------------------------------------------- */
/*  Available voices helper                                                   */
/* -------------------------------------------------------------------------- */
app.get("/voices", (_req: Request, res: Response) => {
  return res.status(200).json({ voices: VOICES });
});

/* -------------------------------------------------------------------------- */
/*  Centralised error handler (last piece of middleware)                      */
/* -------------------------------------------------------------------------- */
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
);

/* -------------------------------------------------------------------------- */
/*  Start the HTTP server (Fly.io needs 0.0.0.0)                              */
/* -------------------------------------------------------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🛫  Backend running on http://0.0.0.0:${PORT}`);
});