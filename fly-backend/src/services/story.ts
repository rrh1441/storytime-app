// -----------------------------------------------------------------------------
// story-generator.ts  •  2025-04-28
// End‑to‑end children’s‑story generator with prompt‑injection hardening
// -----------------------------------------------------------------------------

import OpenAI from 'openai';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // explicit access key (required in most runtimes)
});

export const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export interface StoryParams {
  storyTitle?: string | null;
  theme: string;
  length: number;               // desired word count
  language: string;
  mainCharacter?: string | null;
  educationalFocus?: string | null;
  additionalInstructions?: string | null;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const TITLE_MARKER = 'Generated Title: ';

const SYSTEM_MESSAGE = `
You are an assistant that writes wholesome, age‑appropriate stories for young
children. You must refuse or safe‑complete any request that contains—or
elicits—profanity, sexual content, graphic violence, hate, or extremist
material, in accordance with OpenAI policy.`.trim();

// -----------------------------------------------------------------------------
// Helper – single moderation call
// -----------------------------------------------------------------------------
async function isFlagged(text: string): Promise<boolean> {
  const resp = await openai.moderations.create({ input: text });
  return resp.results?.[0]?.flagged ?? false;
}

// -----------------------------------------------------------------------------
// Main generator
// -----------------------------------------------------------------------------
export async function generateStory(
  params: StoryParams,
): Promise<{ story: string; title: string }> {
  // 1. ------------------------------ Input moderation -------------------------
  if (await isFlagged(JSON.stringify(params))) {
    throw new Error('Input rejected by content policy.');
  }

  // 2. ------------------------------ Prompt assembly --------------------------
  const {
    storyTitle,
    theme,
    length,
    language,
    mainCharacter,
    educationalFocus,
    additionalInstructions,
  } = params;

  const userPrompt = `
THEME: """${theme}"""
TARGET_LENGTH: """${length}"""
LANGUAGE: """${language}"""
MAIN_CHARACTER: """${mainCharacter ?? 'child'}"""
EDUCATIONAL_FOCUS: """${educationalFocus ?? 'none'}"""
EXTRA_INSTRUCTIONS: """${additionalInstructions ?? 'none'}"""

Write a children’s story of roughly TARGET_LENGTH words (≈3‑minute read) that
ends positively. Format using Markdown with a blank line between paragraphs.

After the story, output one line that starts exactly with "${TITLE_MARKER}" and
contains a creative title in the same LANGUAGE.`.trim();

  // 3. ------------------------------ Completion call -------------------------
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 820,
    temperature: 0.7,
  });

  const choice = completion.choices[0];
  if (
    ['content_filter', 'safe_completion'].includes(choice.finish_reason ?? '')
  ) {
    throw new Error('Model refused or output was filtered.');
  }

  const raw = (choice.message?.content ?? '').trim();

  // 4. ------------------------------ Output moderation -----------------------
  if (await isFlagged(raw)) {
    throw new Error('Generated story failed moderation.');
  }

  // 5. ------------------------------ Parse story + title ---------------------
  const markerPos = raw.lastIndexOf(`\n${TITLE_MARKER}`);
  let story = raw;
  let title = storyTitle?.trim() ?? '';

  if (markerPos !== -1) {
    const extractedTitle = raw
      .slice(markerPos + TITLE_MARKER.length + 1)
      .trim();
    if (!title) title = extractedTitle;
    story = raw.slice(0, markerPos).trim();
  } else if (!title) {
    title =
      language.toLowerCase() === 'english'
        ? `A ${theme} Story`
        : `Story about ${theme}`;
  }

  // Remove any leading markdown header if present
  story = story.replace(/^#+\s+/u, '');

  return { story, title };
}
