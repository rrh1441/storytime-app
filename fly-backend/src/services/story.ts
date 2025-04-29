import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function generateStoryHandler(req: Request, res: Response): Promise<void> {
  console.log("[DEBUG] /generate-story called");

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  console.log("[DEBUG] Authorization header:", authHeader);
  console.log("[DEBUG] Request body:", req.body);

  let userId: string | null = null;

  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error("[DEBUG] Supabase token verification failed:", error);
      return res.status(401).json({ error: "Invalid or expired token", debug: { error } });
    }
    userId = user.id;
    console.log("[DEBUG] Supabase user ID resolved:", userId);
  } else {
    console.log("[DEBUG] No auth token, anonymous request.");
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const body = req.body;
  const { theme, length, language, mainCharacter, educationalFocus, additionalInstructions, storyTitle } = body;

  const prompt = `Write a children's story in ${language} about ${theme}.`;
  const TITLE_MARKER = "Generated Title: ";

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const titleMarkerIndex = raw.lastIndexOf(`\n${TITLE_MARKER}`);
    let title = storyTitle ?? "";
    let story = raw.trim();

    if (titleMarkerIndex !== -1) {
      const extractedTitle = raw.slice(titleMarkerIndex + TITLE_MARKER.length + 1).trim();
      if (!title) title = extractedTitle;
      story = raw.slice(0, titleMarkerIndex).trim();
    }

    const insertPayload = {
      user_id: userId,
      title,
      content: story,
      theme,
      language,
      length_minutes: length,
      main_character: mainCharacter,
      educational_focus: educationalFocus,
    };

    console.log("[DEBUG] Insert payload:", insertPayload);

    const { data: newStoryData, error: insertError } = await supabase
      .from('stories')
      .insert(insertPayload)
      .select('id')
      .single();

    console.log("[DEBUG] Insert result:", { data: newStoryData, error: insertError });

    if (insertError || !newStoryData) {
      return res.status(500).json({
        error: "Insert failed",
        debug: {
          insertError,
          userId,
          insertPayload,
        }
      });
    }

    return res.status(200).json({
      story,
      title,
      storyId: newStoryData.id,
      debug: {
        userId,
        insertPayload,
        newStoryData,
      },
    });
  } catch (err: any) {
    console.error("[DEBUG] Story generation failed:", err);
    return res.status(500).json({ error: err.message ?? "Unknown failure", debug: { err } });
  }
}
