/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const PREVIEW_TEXT =
  "At exactly midnight, a balloon the size of a house floated past the window";

const VOICES = ["alloy", "echo", "fable", "nova", "onyx", "shimmer"] as const;

/* ---------- clients ---------- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function uploadIfMissing(voice: string, data: Buffer) {
  const object = `${voice}.mp3`;
  const { data: head, error: headErr } = await supabase
    .storage.from("voice-previews")
    .list("", { search: object, limit: 1 });
  if (headErr) throw headErr;
  if (head && head.length) return console.log(`✔ ${object} exists – skip`);

  const { error } = await supabase
    .storage.from("voice-previews")
    .upload(object, data, { contentType: "audio/mpeg", upsert: true });
  if (error) throw error;
  console.log(`⬆ uploaded ${object}`);
}

async function main() {
  for (const voice of VOICES) {
    console.log(`🎙  ${voice}`);
    const res = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: PREVIEW_TEXT,
      format: "mp3",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    await uploadIfMissing(voice, buf);
  }
  console.log("✅ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
