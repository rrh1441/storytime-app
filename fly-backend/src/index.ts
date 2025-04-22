/**
 * index.ts • 2025‑04‑19  (FULL FILE — production)
 * --------------------------------------------------------------------------
 * • CORS enabled for Vercel + Fly + local dev
 * • Story generation calls the real generateStory() helper
 * • Free‑story limit is still disabled
 * --------------------------------------------------------------------------
 */

import express from "express";
import cors from "cors";

import { generateStory } from "./services/story.js";     // ← real helper
import { VOICES, generateSpeech } from "./services/tts.js";

const app  = express();
const PORT = process.env.PORT || 8080;

/* ---------------- CORS ---------------- */
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

/* ---------------- middleware ---------------- */
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/* ---------------- health ---------------- */
app.get("/health", (_req, res) => res.status(200).send("OK"));

/* ---------------- story generation ---------------- */
app.post("/generate-story", async (req, res) => {
  try {
    console.log("Story generation request:", req.body);
    const { story, title } = await generateStory(req.body);  // ← real call
    res.json({ story, title });
  } catch (error) {
    console.error("Story generation error:", error);
    res.status(500).json({ error: "Failed to generate story" });
  }
});

/* ---------------- text‑to‑speech ---------------- */
app.post("/tts", async (req, res) => {
  try {
    const { text, voice, language = "English" } = req.body;

    if (!text || !voice) {
      return res.status(400).json({ error: "Text and voice are required" });
    }
    if (!VOICES.includes(voice)) {
      return res.status(400).json({ error: "Invalid voice" });
    }

    const audioUrl = await generateSpeech(text, voice, language);
    res.json({ audioUrl });
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "Failed to generate audio" });
  }
});

/* ---------------- start server ---------------- */
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🛫  backend listening on http://0.0.0.0:${PORT}`);
  });
  
