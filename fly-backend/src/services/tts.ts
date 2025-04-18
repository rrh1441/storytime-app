// -----------------------------------------------------------------------------
// tts.ts  • 2025‑04‑18   (FULL FILE – no external uuid dependency)
// -----------------------------------------------------------------------------
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import { tmpdir } from "os";
import fs from "fs/promises";
import { randomUUID } from "crypto";   // ← built‑in
import fetch from "node-fetch";

/* locate ffmpeg binary ------------------------------------------------------ */
ffmpeg.setFfmpegPath(
  typeof ffmpegStatic === "string"
    ? ffmpegStatic
    : (ffmpegStatic as unknown as string),
);

/* public voice list --------------------------------------------------------- */
export const VOICES = [
  "alloy", "ash", "ballad", "coral", "echo",
  "fable", "nova", "onyx", "sage", "shimmer",
] as const;
export type VoiceId = (typeof VOICES)[number];

/* main helper ----------------------------------------------------------------*/
export async function generateSpeech(
  text: string,
  voice: VoiceId,
  language = "English",
): Promise<string> {
  /* ---- 1. call OpenAI TTS and get raw WAV --------------------------------- */
  const apiResp = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice,
      input: text,
      language,
      format: "wav",
    }),
  });

  if (!apiResp.ok) {
    const err = await apiResp.text();
    throw new Error(`OpenAI TTS failed: ${err}`);
  }
  const wavBuffer = Buffer.from(await apiResp.arrayBuffer());

  /* ---- 2. convert WAV → MP3 via ffmpeg ------------------------------------ */
  const uid = randomUUID();
  const tmpFolder = path.join(tmpdir(), "storytime_tts_tmp");
  const wavPath = path.join(tmpFolder, `${uid}.wav`);
  const mp3Path = path.join(tmpFolder, `${uid}.mp3`);

  await fs.mkdir(tmpFolder, { recursive: true });
  await fs.writeFile(wavPath, wavBuffer);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(wavPath)
      .audioCodec("libmp3lame")
      .format("mp3")
      .save(mp3Path)
      .on("end", () => resolve())   // stdout/stderr ignored
      .on("error", reject);
  });

  /* ---- 3. return MP3 as base64 data‑URL (swap with S3/R2 upload in prod) -- */
  const mp3Buf = await fs.readFile(mp3Path);
  const dataUrl = `data:audio/mpeg;base64,${mp3Buf.toString("base64")}`;

  /* ---- 4. cleanup (best‑effort) ------------------------------------------ */
  fs.rm(tmpFolder, { recursive: true, force: true }).catch(() => {});

  return dataUrl;
}
