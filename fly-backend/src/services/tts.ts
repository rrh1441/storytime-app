ts
import OpenAI from "openai";
import { chunkText } from "../utils/chunk.js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

ffmpeg.setFfmpegPath(ffmpegPath!);
const openai = new OpenAI();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET ?? "story_assets";
const supabase = createClient(supabaseUrl!, supabaseKey!);

export const VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
] as const;

export async function generateSpeech(text: string, voice: string, language: string): Promise<string> {
  if (!VOICES.includes(voice as any)) throw new Error("Unsupported voice");
  const chunks = chunkText(text);
  const tmp: string[] = [];

  // synthesize sequentially to stay inside rate limits
  for (const [i, piece] of chunks.entries()) {
    const resp = await openai.audio.speech.create({ model: "gpt-4o-mini-tts", voice, input: piece, format: "mp3" });
    const arr = Buffer.from(await resp.arrayBuffer());
    const fn = `/tmp/seg_${i}.mp3`;
    await fs.writeFile(fn, arr);
    tmp.push(fn);
  }

  const final = `/tmp/${crypto.randomUUID()}.mp3`;
  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg();
    tmp.forEach((p) => cmd.input(p));
    cmd.on("error", reject).on("end", resolve).mergeToFile(final);
  });

  const filePath = `audio/${crypto.randomUUID()}.mp3`;
  const data = await fs.readFile(final);
  const { error } = await supabase.storage.from(bucket).upload(filePath, data, { contentType: "audio/mpeg" });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}