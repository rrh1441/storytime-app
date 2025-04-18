// Remove the 'ts' at the beginning of the file
import OpenAI from "openai";
import { chunkText } from "../utils/chunk.js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// Fix the ffmpeg path assignment by adding a type assertion
ffmpeg.setFfmpegPath(ffmpegPath as string);

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
    // Remove the format parameter which is causing the type error
    const resp = await openai.audio.speech.create({ 
      model: "gpt-4o-mini-tts", 
      voice, 
      input: piece 
      // Remove format: "mp3" as it's not in the expected type
    });
    
    const arr = Buffer.from(await resp.arrayBuffer());
    const fn = `/tmp/seg_${i}.mp3`;
    await fs.writeFile(fn, arr);
    tmp.push(fn);
  }
  
  const final = `/tmp/${crypto.randomUUID()}.mp3`;
  
  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg();
    tmp.forEach((p) => cmd.input(p));
    // Fix the error/end handler syntax for ffmpeg
    cmd
      .on("error", (err) => reject(err))
      .on("end", () => resolve())
      .mergeToFile(final);
  });
  
  const filePath = `audio/${crypto.randomUUID()}.mp3`;
  const data = await fs.readFile(final);
  const { error } = await supabase.storage.from(bucket).upload(filePath, data, { contentType: "audio/mpeg" });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}