// fly-backend/src/index.ts
// Full file — includes /stories CRUD router

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { generateStoryHandler } from "./services/story.js";
import { generateSpeech, VOICES, type VoiceId } from "./services/tts.js";
import storiesRouter from "./routes/stories.js";           // ← NEW
import { uploadAudio } from "./services/storage.js";

const {
  PORT = "8080",
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  OPENAI_API_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL env var is required.");
if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY env var is required.");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY env var is required.");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required.");

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const app = express();

/* ──────────────── Middleware ───────────────── */
app.use(
  cors({
    origin: [
      "https://storytime-app.fly.dev",
      "https://yourstorytime.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

/* ──────────────── Healthcheck ──────────────── */
app.get("/health", (_req, res) => res.status(200).send("OK"));

/* ──────────────── Core routes ──────────────── */
app.post("/generate-story", generateStoryHandler);

app.post("/tts", async (req, res) => {
  try {
    const { text, voice, language = "English", storyId } = req.body as {
      text: string;
      voice: string;
      language?: string;
      storyId?: string;
    };

    if (!text?.trim() || !voice) {
      return res
        .status(400)
        .json({ error: "'text' and 'voice' fields are required." });
    }
    if (!VOICES.includes(voice as VoiceId)) {
      return res.status(400).json({ error: `Unsupported voice: ${voice}` });
    }

    const { mp3Buffer, publicUrl } = await generateSpeech(text, voice, language);

    if (storyId && publicUrl) {
      const { error } = await supabase
        .from("stories")
        .update({ audio_url: publicUrl })
        .eq("id", storyId);

      if (error) {
        console.error(
          `[TTS] Failed to link audio_url for story ${storyId}:`,
          error
        );
      } else {
        console.log(`[TTS] audio_url linked to story ${storyId}`);
      }
    }

    return res.status(200).json({ audioUrl: publicUrl });
  } catch (err: any) {
    console.error("[/tts]", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to generate audio." });
  }
});

/* ──────────────── NEW: stories CRUD ─────────── */
app.use("/stories", storiesRouter);

/* ──────────────── Startup ───────────────────── */
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✅  Backend listening on :${PORT}`);
});
