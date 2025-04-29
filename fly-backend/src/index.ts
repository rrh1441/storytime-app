// fly-backend/src/index.ts  •  Clean final version
// -----------------------------------------------------------------------------
// REST API entry‑point for StoryTime backend.
// * /generate-story  – LLM story generation
// * /tts             – OpenAI TTS → MP3 → Supabase Storage (service‑role)
// -----------------------------------------------------------------------------

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { generateStoryHandler } from "./services/story.js";
import { generateSpeech, VOICES, type VoiceId } from "./services/tts.js";
import { uploadAudio } from "./services/storage.js";

/*───────────────────────────────────────────────────────────────────────────
  Environment validation
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
  Supabase anon client – only for public data & Auth endpoints
───────────────────────────────────────────────────────────────────────────*/
const supabasePublic: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/*───────────────────────────────────────────────────────────────────────────
  Express setup
───────────────────────────────────────────────────────────────────────────*/
const app = express();

app.use(cors({
  origin: [
    "https://storytime-app.fly.dev",
    "https://yourstorytime.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

/*───────────────────────────────────────────────────────────────────────────
  Health check
───────────────────────────────────────────────────────────────────────────*/
app.get("/health", (_req, res) => res.status(200).send("OK"));

/*───────────────────────────────────────────────────────────────────────────
  Story generation
───────────────────────────────────────────────────────────────────────────*/
app.post("/generate-story", generateStoryHandler);

/*───────────────────────────────────────────────────────────────────────────
  TTS → MP3 upload (service‑role path)
───────────────────────────────────────────────────────────────────────────*/
app.post("/tts", async (req, res) => {
  try {
    const { text, voice, language = "English" } = req.body as {
      text: string;
      voice: string;
      language?: string;
    };

    if (!text?.trim() || !voice) {
      return res.status(400).json({ error: "'text' and 'voice' fields are required." });
    }
    if (!VOICES.includes(voice as VoiceId)) {
      return res.status(400).json({ error: `Unsupported voice: ${voice}` });
    }

    const { mp3Buffer, contentType } = await generateSpeech(text, voice as VoiceId, language);
    const audioUrl = await uploadAudio(`${Date.now()}.mp3`, mp3Buffer, contentType);

    return res.status(200).json({ audioUrl });
  } catch (err: any) {
    console.error("[/tts]", err);
    return res.status(500).json({ error: err.message || "Failed to generate audio." });
  }
});

/*───────────────────────────────────────────────────────────────────────────
  Listen
───────────────────────────────────────────────────────────────────────────*/
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✅  Backend listening on :${PORT}`);
});
