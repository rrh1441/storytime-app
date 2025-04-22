// -----------------------------------------------------------------------------
// fly-backend/src/index.ts
// Express API entrypoint  •  2025‑04‑22
// -----------------------------------------------------------------------------
// * Handles story generation, TTS generation + Supabase upload
// * Provides /api/preview-voice/:label for voice samples
// * Works with `moduleResolution: node16 | nodenext` (explicit .js extensions)
// -----------------------------------------------------------------------------

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import { voicePreview } from "./routes/voicePreview.js";          // 👈  .js ext
import { generateStory } from "./services/story.js";              // 👈  .js ext
import {
  generateSpeech,
  VOICES,
  VoiceId,
  SpeechGenerationResult,
} from "./services/tts.js";                                       // 👈  .js ext

/*───────────────────────────────────────────────────────────────────────────
  Environment
───────────────────────────────────────────────────────────────────────────*/
const {
  PORT = "8080",
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  OPENAI_API_KEY,
} = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL env var is required.");
if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY env var is required.");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY env var is required.");

/*───────────────────────────────────────────────────────────────────────────
  Supabase
───────────────────────────────────────────────────────────────────────────*/
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*───────────────────────────────────────────────────────────────────────────
  Express setup
───────────────────────────────────────────────────────────────────────────*/
const app = express();                 // declare BEFORE any app.use

// CORS
app.use(
  cors({
    origin: [
      "https://storytime-app.fly.dev",
      "https://yourstorytime.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Std middleware
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Routes
app.use("/api/preview-voice", voicePreview); // voice sample endpoint

/*───────────────────────────────────────────────────────────────────────────
  Health
───────────────────────────────────────────────────────────────────────────*/
app.get("/health", (_req, res) => res.status(200).send("OK"));

/*───────────────────────────────────────────────────────────────────────────
  Story generation
───────────────────────────────────────────────────────────────────────────*/
app.post("/generate-story", async (req, res) => {
  try {
    const { story, title } = await generateStory(req.body);
    res.status(200).json({ story, title });
  } catch (err: any) {
    console.error("[/generate-story] ", err);
    res.status(500).json({ error: err.message || "Failed to generate story" });
  }
});

/*───────────────────────────────────────────────────────────────────────────
  Text‑to‑Speech + upload to Supabase
───────────────────────────────────────────────────────────────────────────*/
app.post("/tts", async (req, res) => {
  try {
    const { text, voice, language = "English" } = req.body;

    // Basic validation
    if (typeof text !== "string" || !text.trim() || typeof voice !== "string") {
      return res.status(400).json({ error: "text and voice are required" });
    }
    if (!VOICES.includes(voice as VoiceId)) {
      return res.status(400).json({ error: `Invalid voice specified: ${voice}` });
    }

    // 1. Generate speech
    const { mp3Buffer, contentType }: SpeechGenerationResult = await generateSpeech(
      text,
      voice as VoiceId,
      language,
    );

    // 2. Upload to Supabase Storage
    const bucket = "story_assets";
    const fileName = `${uuidv4()}.mp3`;
    const filePath = `audio/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, mp3Buffer, {
        contentType,
        upsert: false,
      });
    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error("Failed to store generated audio.");
    }

    // 3. Public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!urlData?.publicUrl) throw new Error("Failed to get audio URL.");
    res.status(200).json({ audioUrl: urlData.publicUrl });
  } catch (err: any) {
    console.error("[/tts] ", err);
    res.status(500).json({ error: err.message || "Failed to generate audio." });
  }
});

/*───────────────────────────────────────────────────────────────────────────
  Start server
───────────────────────────────────────────────────────────────────────────*/
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✅  Backend listening on :${PORT}`);
});
