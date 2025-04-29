// fly-backend/src/index.ts

import express from "express";
import type { Request, Response } from 'express'; // Import types if needed
import cors from "cors";
import morgan from "morgan";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---> CORRECTED IMPORT: Import the handler function <---
import { generateStoryHandler } from "./services/story.js";
// ---> END CORRECTION <---

import { generateSpeech, VOICES, type VoiceId } from "./services/tts.js";
import { uploadAudio } from "./services/storage.js";

/*───────────────────────────────────────────────────────────────────────────
  Environment validation
───────────────────────────────────────────────────────────────────────────*/
const {
  PORT = "8080",
  SUPABASE_URL,
  // SUPABASE_ANON_KEY, // Likely not needed here if all actions use Service Role
  SUPABASE_SERVICE_ROLE_KEY, // Needed by story.ts and storage.ts
  OPENAI_API_KEY, // Needed by tts.ts and likely story generation
} = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL env var is required.");
// Service key IS required by backend services
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required for backend operations.");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY env var is required.");


/*───────────────────────────────────────────────────────────────────────────
  Express setup
───────────────────────────────────────────────────────────────────────────*/
const app = express();

app.use(cors({
  // Keep your specific origins
  origin: [
    "https://storytime-app.fly.dev",
    "https://yourstorytime.vercel.app", // Your frontend URL
    "http://localhost:5173", // Vite default dev port
    "http://localhost:3000", // Common alternative dev port
  ],
  allowedHeaders: ["Content-Type", "Authorization"], // Ensure Authorization is allowed for passing JWT
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev")); // HTTP request logger

/*───────────────────────────────────────────────────────────────────────────
  Health check
───────────────────────────────────────────────────────────────────────────*/
app.get("/health", (_req, res) => res.status(200).send("OK"));

/*───────────────────────────────────────────────────────────────────────────
  Story generation - CORRECTED ROUTE HANDLER CALL
───────────────────────────────────────────────────────────────────────────*/
// ---> CORRECTED ROUTE <---
app.post("/generate-story", (req: Request, res: Response) => {
  // Call the actual handler function from story.ts, passing req and res
  // The handler is async and will manage sending the response itself.
  generateStoryHandler(req, res);
});
// ---> END CORRECTION <---


/*───────────────────────────────────────────────────────────────────────────
  TTS → MP3 upload (service‑role path) - Keep as is
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

    // Assuming generateSpeech and uploadAudio work correctly
    const { mp3Buffer, contentType } = await generateSpeech(text, voice as VoiceId, language);
    const audioUrl = await uploadAudio(`${Date.now()}.mp3`, mp3Buffer, contentType);

    return res.status(200).json({ audioUrl });
  } catch (err: any) {
    console.error("[/tts] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate audio." });
  }
});

/*───────────────────────────────────────────────────────────────────────────
  Listen
───────────────────────────────────────────────────────────────────────────*/
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✅  Backend listening on port ${PORT}`);
});