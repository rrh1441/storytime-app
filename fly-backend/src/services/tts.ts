// services/tts.ts  •  2025‑04‑28 – refactored to store audio via service‑role
// -----------------------------------------------------------------------------

import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import { tmpdir } from "os";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import nodeFetch from "node-fetch";
import { uploadAudio } from "./storage.js"; // adjust relative path if needed

// ── fetch poly‑fill (Node <18) ───────────────────────────────────────────────
const fetchFn: typeof globalThis.fetch =
  typeof globalThis.fetch === "function"
    ? globalThis.fetch
    : (nodeFetch as unknown as typeof globalThis.fetch);

// ── FFmpeg binary path ───────────────────────────────────────────────────────
const ffmpegPath = (ffmpegStatic as unknown as string) ?? "";
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

// ── Voice definitions ────────────────────────────────────────────────────────
export const VOICES = [
  "alloy",
  "echo",
  "fable",
  "nova",
  "onyx",
  "shimmer",
] as const;
export type VoiceId = (typeof VOICES)[number];

/** UI label → OpenAI voice ID */
const LABEL_TO_ID: Record<string, VoiceId> = {
  "Alex (US)": "alloy",
  "Ethan (US)": "echo",
  "Felix (UK)": "fable",
  "Nora (US)": "nova",
  "Oscar (US)": "onyx",
  "Selina (US)": "shimmer",
};

// ── Return type ──────────────────────────────────────────────────────────────
export interface SpeechGenerationResult {
  mp3Buffer: Buffer;
  contentType: "audio/mpeg";
  publicUrl: string;
}

// ── Main function ────────────────────────────────────────────────────────────
/**
 * Generates speech via OpenAI TTS, converts it to MP3, stores it in Supabase
 * Storage (service‑role client), and returns both the MP3 buffer and public URL.
 */
export async function generateSpeech(
  text: string,
  uiVoiceLabel: string,
  language = "English"
): Promise<SpeechGenerationResult> {
  const voiceId = LABEL_TO_ID[uiVoiceLabel] ?? (uiVoiceLabel as VoiceId);

  if (!VOICES.includes(voiceId)) {
    throw new Error(`Unsupported voice: ${uiVoiceLabel}`);
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }

  /* 1️⃣ OpenAI TTS → WAV */
  const res = await fetchFn("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: voiceId,
      input: text,
      response_format: "wav",
      // Include language for future-proofing if API supports it
      language,
    }),
  });

  if (!res.ok || !res.body) {
    const msg = res.body ? await res.text() : "";
    throw new Error(`OpenAI TTS error ${res.status}: ${res.statusText}\n${msg}`);
  }
  const wavBuf = Buffer.from(await res.arrayBuffer());

  /* 2️⃣ WAV → MP3 */
  const uid = randomUUID();
  const tmpDir = path.join(tmpdir(), "storytime_tts", uid);
  const wavPath = path.join(tmpDir, `${uid}.wav`);
  const mp3Path = path.join(tmpDir, `${uid}.mp3`);

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(wavPath, wavBuf);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(wavPath)
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .format("mp3")
      .on("end", () => resolve())
      .on("error", reject)
      .save(mp3Path);
  });

  const mp3Buffer = await fs.readFile(mp3Path);
  await fs.rm(tmpDir, { recursive: true, force: true });

  /* 3️⃣ Upload to Supabase Storage */
  const publicUrl = await uploadAudio(`${uid}.mp3`, mp3Buffer, "audio/mpeg");

  return { mp3Buffer, contentType: "audio/mpeg", publicUrl };
}
