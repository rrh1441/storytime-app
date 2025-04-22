// -----------------------------------------------------------------------------
// TTS Service  •  2025‑04‑22
// -----------------------------------------------------------------------------

import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import { tmpdir } from "os";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import nodeFetch from "node-fetch"; // poly‑fill for Node <18

/*───────────────────────────────────────────────────────────────────────────
  Fetch helper (no @ts‑expect‑error needed)
───────────────────────────────────────────────────────────────────────────*/
const fetchFn: typeof globalThis.fetch =
  typeof globalThis.fetch === "function"
    ? globalThis.fetch
    : (nodeFetch as unknown as typeof globalThis.fetch);

/*───────────────────────────────────────────────────────────────────────────
  FFmpeg configuration
───────────────────────────────────────────────────────────────────────────*/
const ffmpegPath = (ffmpegStatic as unknown as string) ?? "";
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

/*───────────────────────────────────────────────────────────────────────────
  Public API
───────────────────────────────────────────────────────────────────────────*/
export const VOICES = [
  "alloy",
  "ash",
  "echo",
  "fable",
  "nova",
  "onyx",
] as const;
export type VoiceId = (typeof VOICES)[number];

export interface SpeechGenerationResult {
  mp3Buffer: Buffer;
  contentType: "audio/mpeg";
}

export async function generateSpeech(
  text: string,
  voice: VoiceId,
  language = "English",
): Promise<SpeechGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }

  /* 1️⃣  OpenAI TTS ‑> WAV */
  const res = await fetchFn("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice,
      input: text,
      response_format: "wav",
      // language, // uncomment when officially supported
    }),
  });

  if (!res.ok || !res.body)
    throw new Error(
      `OpenAI TTS error ${res.status}: ${res.statusText}\n${await res.text()}`,
    );

  const wavBuf = Buffer.from(await res.arrayBuffer());

  /* 2️⃣  WAV ‑> MP3 */
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
      .on("end", (_stdout: string | null, _stderr: string | null) => resolve())
      .on("error", reject)
      .save(mp3Path);
  });

  const mp3Buffer = await fs.readFile(mp3Path);

  /* 3️⃣  Cleanup */
  await fs.rm(tmpDir, { recursive: true, force: true });

  return { mp3Buffer, contentType: "audio/mpeg" };
}
