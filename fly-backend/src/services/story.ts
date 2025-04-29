// fly-backend/src/services/story.ts
// FINAL VERSION: Cleans up story insert payload, avoids schema cache conflicts

import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

interface StoryParams {
  storyTitle: string | null;
  theme: string;
  length: number;
  language: string;
  mainCharacter: string | null;
  educationalFocus: string | null;
  additionalInstructions: string | null;
}

interface UserRow {
  subscription_status: string | null;
  monthly_minutes_limit: number | null;
  minutes_used_this_period: number;
}

const FREE_ANON_MINUTES_LIMIT = 3;

function estimateWordCount(minutes: number): number {
  const wordsPerMinute = 130;
  const minWords = 150;
  const maxWords = wordsPerMinute * 75;
  const calculatedWords = Math.round(minutes * wordsPerMinute);
  return Math.max(minWords, Math.min(calculatedWords, maxWords));
}

async function generateStoryInternal(params: StoryParams): Promise<{ story: string; title: string }> {
  const { storyTitle, theme, length, language, mainCharacter, educationalFocus, additionalInstructions } = params;
  const targetWordCount = estimateWordCount(length);
  const TITLE_MARKER = "Generated Title: ";

  const prompt = `Write **in ${language}** a children's story suitable for young children.\nThe story should have a theme of ${theme}.${mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist."}${educationalFocus ? ` Subtly incorporate the theme of ${educationalFocus}.` : ""}${additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : ""}\nThe target length is approximately ${targetWordCount} words (about ${length} minutes read aloud).\nEnsure it ends positively and is formatted in Markdown paragraphs.\nAfter the story, output a creative title **in ${language}** on a separate line starting with '${TITLE_MARKER}'.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let story = raw.trim();
  let title = storyTitle?.trim() || "";
  const idx = raw.lastIndexOf(`\n${TITLE_MARKER}`);

  if (idx !== -1) {
    const extracted = raw.slice(idx + TITLE_MARKER.length + 1).trim();
    if (!title) title = extracted;
    story = raw.slice(0, idx).trim();
  }

  if (!title) title = `A Story About ${theme}`;
  return { story, title };
}

export async function generateStoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    let userId: string | null = null;
    let userProfile: UserRow | null = null;

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
      userId = user.id;

      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('subscription_status, monthly_minutes_limit, minutes_used_this_period')
        .eq('id', userId)
        .single<UserRow>();

      if (fetchErr) return res.status(500).json({ error: 'Could not retrieve user profile' });
      userProfile = data;
    } else {
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    const body = req.body as Partial<StoryParams>;
    const requestedLength = Number(body.length);
    if (!body.theme || !body.language || Number.isNaN(requestedLength) || requestedLength <= 0) {
      return res.status(400).json({ error: 'Theme, language, and valid length are required.' });
    }

    const { story, title } = await generateStoryInternal({
      storyTitle: body.storyTitle ?? null,
      theme: body.theme,
      length: requestedLength,
      language: body.language,
      mainCharacter: body.mainCharacter ?? null,
      educationalFocus: body.educationalFocus ?? null,
      additionalInstructions: body.additionalInstructions ?? null,
    });

    let storyId: string | null = null;
    if (userId) {
      const insertPayload: Record<string, any> = {
        user_id: userId,
        title,
        content: story,
        theme: body.theme,
        language: body.language,
        length_minutes: requestedLength,
        main_character: body.mainCharacter,
      };

      if (body.educationalFocus !== undefined) {
        insertPayload.educational_focus = body.educationalFocus;
      }

      const { data: newStoryData, error: insertError } = await supabase
        .from('stories')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        return res.status(500).json({
          error: 'Insert failed',
          debug: insertError,
        });
      }

      storyId = newStoryData.id;
    }

    return res.status(200).json({ story, title, storyId });
  } catch (err: any) {
    console.error('[generateStoryHandler] Fatal error:', err);
    return res.status(500).json({ error: err.message || 'Unhandled failure' });
  }
}
