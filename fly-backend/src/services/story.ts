import OpenAI from "openai";
import { encoding_for_model } from "tiktoken";

const openai = new OpenAI();
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function generateStory(params: any): Promise<{ story: string; title: string }> {
  const {
    storyTitle,
    theme = "adventure",
    mainCharacter,
    educationalFocus,
    additionalInstructions,
  } = params;

  const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
  const eduFocus = educationalFocus ? ` Subtly incorporate the theme of ${educationalFocus}.` : "";
  const addInstr = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";

  const TITLE_MARKER = "Generated Title: ";
  const prompt = `Write a children's story suitable for young children. The story should have a theme of ${theme}.${characterDesc} Keep it around 350‑450 words (≈3 minutes).${eduFocus}${addInstr} Ensure it ends on a positive note and output in Markdown paragraphs.\n\nAfter the story, output a creative title on a separate line starting with '${TITLE_MARKER}'.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
  });

  const raw = completion.choices[0].message?.content ?? "";
  const idx = raw.lastIndexOf(`\n${TITLE_MARKER}`);
  const title = storyTitle?.trim() || (idx !== -1 ? raw.slice(idx + TITLE_MARKER.length + 1).trim() : `A ${theme} story`);
  const story = idx !== -1 ? raw.slice(0, idx).trim() : raw.trim();
  return { story, title };
}