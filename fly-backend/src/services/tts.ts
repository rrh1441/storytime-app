// services/tts.ts  •  2025‑04‑28  (stable)
// -----------------------------------------------------------------------------
// Generates speech with OpenAI TTS, converts it to MP3, uploads via the
// service‑role client, and returns the MP3 buffer + public URL.
// -----------------------------------------------------------------------------

import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import fetch, { Headers } from "node-fetch";
import { uploadAudio } from "./storage.js";

// ── ensure FFmpeg binary is available ───────────────────────────────────────
const ffmpegPath = (ffmpegStatic as unknown as string) || "";
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

// ── Voice catalogue ─────────────────────────────────────────────────────────
export const VOICES = ["alloy", "echo", "fable", "nova", "onyx", "shimmer"] as const;
export type VoiceId = (typeof VOICES)[number];

/** UI‑label → OpenAI voice ID */
const LABEL_TO_ID: Record<string, VoiceId> = {
  "Alex (US)": "alloy",
  "Ethan (US)": "echo",
  "Felix (UK)": "fable",
  "Nora (US)": "nova",
  "Oscar (US)": "onyx",
  "Selina (US)": "shimmer",
};

export interface SpeechGenerationResult {
  mp3Buffer: Buffer;
  publicUrl: string;
  contentType: "audio/mpeg";
}

/**
 * Convert a text string to speech and store the MP3 publicly.
 */
export async function generateSpeech(
  text: string,
  uiVoiceLabel: string,
  language: string = "English"
): Promise<SpeechGenerationResult> {
  // ── validate env and args ────────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY env var not set");
  }
  const voiceId = LABEL_TO_ID[uiVoiceLabel] ?? (uiVoiceLabel as VoiceId);
  if (!VOICES.includes(voiceId)) {
    throw new Error(`Unsupported voice: ${uiVoiceLabel}`);
  }

  // ── 1️⃣  Text → WAV via OpenAI TTS ─────────────────────────────────────────
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: new Headers({
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      model: "tts-1",
      voice: voiceId,
      input: text,
      language,
      response_format: "wav",
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "<no‑body>");
    throw new Error(`OpenAI TTS ${res.status}: ${res.statusText}\n${msg}`);
  }
  const wavBuf = Buffer.from(await res.arrayBuffer());

  // ── 2️⃣  WAV → MP3 via FFmpeg ──────────────────────────────────────────────
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
      .on("end", resolve)
      .on("error", reject)
      .save(mp3Path);
  });

  const mp3Buffer = await fs.readFile(mp3Path);
  await fs.rm(tmpDir, { recursive: true, force: true });

  // ── 3️⃣  Upload via service‑role client ────────────────────────────────────
  const publicUrl = await uploadAudio(`${uid}.mp3`, mp3Buffer);

  return { mp3Buffer, publicUrl, contentType: "audio/mpeg" };
}
