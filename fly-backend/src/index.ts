// -----------------------------------------------------------------------------
// services/tts.ts  • 2025‑04‑18  (FULL FILE)
// -----------------------------------------------------------------------------
// uuid → crypto.randomUUID   → no external dependency, no crash
// -----------------------------------------------------------------------------
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import { tmpdir } from "os";
import fs from "fs/promises";
import { randomUUID } from "crypto";   // built‑in
import fetch from "node-fetch";

/* bind static ffmpeg binary */
ffmpeg.setFfmpegPath(
  typeof ffmpegStatic === "string"
    ? ffmpegStatic
    : (ffmpegStatic as unknown as string),
);

/* voices */
export const VOICES = [
  "alloy","ash","ballad","coral","echo",
  "fable","nova","onyx","sage","shimmer",
] as const;
export type VoiceId = (typeof VOICES)[number];

/* main helper */
export async function generateSpeech(
  text: string,
  voice: VoiceId,
  language = "English",
): Promise<string> {
  /* 1. call OpenAI TTS (WAV) */
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
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
  if (!r.ok) throw new Error(`OpenAI TTS failed: ${await r.text()}`);
  const wavBuf = Buffer.from(await r.arrayBuffer());

  /* 2. convert WAV → MP3 */
  const uid = randomUUID();
  const dir = path.join(tmpdir(), "storytime_tts_tmp");
  const wav = path.join(dir, `${uid}.wav`);
  const mp3 = path.join(dir, `${uid}.mp3`);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(wav, wavBuf);

  await new Promise<void>((res, rej) => {
    ffmpeg().input(wav).audioCodec("libmp3lame").format("mp3").save(mp3)
      .on("end", () => res())
      .on("error", rej);
  });

  /* 3. return base64 data‑URL (swap for real upload later) */
  const mp3Buf = await fs.readFile(mp3);
  const dataUrl = `data:audio/mpeg;base64,${mp3Buf.toString("base64")}`;

  /* 4. cleanup */
  fs.rm(dir, { recursive: true, force: true }).catch(() => {});

  return dataUrl;
}
