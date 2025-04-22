import OpenAI from "openai";
// tiktoken import isn't used in this function, can be removed if not used elsewhere
// import { encoding_for_model } from "tiktoken";

const openai = new OpenAI();
// Consider making MODEL configurable via environment variable if not already
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// Define an interface/type for better type safety (Optional but recommended)
interface StoryParams {
  storyTitle?: string | null;
  theme: string;
  length: number; // Although length isn't directly used in the prompt generation logic here, it's passed from the form
  language: string; // <-- Add language here
  mainCharacter?: string | null;
  educationalFocus?: string | null;
  additionalInstructions?: string | null;
}

export async function generateStory(params: StoryParams): Promise<{ story: string; title: string }> {
  const {
    storyTitle,
    theme = "adventure", // Default theme if not provided
    language = "English", // <-- Destructure language, defaulting to English
    mainCharacter,
    educationalFocus,
    additionalInstructions,
    // length is destructured but not used in prompt below - using fixed word count instead
  } = params;

  // --- Prompt Construction ---
  const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
  const eduFocus = educationalFocus ? ` Subtly incorporate the theme of ${educationalFocus}.` : "";
  const addInstr = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";

  // Marker for title extraction
  const TITLE_MARKER = "Generated Title: ";

  // Modified prompt incorporating the language for both story and title
  const prompt = `Write **in ${language}** a children's story suitable for young children.
The story should have a theme of ${theme}.${characterDesc}
Keep it around 350‑450 words (which is approximately 3 minutes when read aloud).${eduFocus}${addInstr}
Ensure the story ends on a positive note and is formatted using Markdown paragraphs (use line breaks between paragraphs).

After the story, output a creative title **in ${language}** on a separate line starting with '${TITLE_MARKER}'. Do not include anything else after the title line.`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800, // Adjust if needed, 800 seems reasonable for ~450 words + title
      temperature: 0.7, // You might adjust temperature for creativity vs consistency
    });

    const raw = completion.choices[0].message?.content ?? "";

    // --- Story and Title Extraction ---
    let story = raw.trim();
    let title = storyTitle?.trim() || ""; // Use user-provided title first if available

    const titleMarkerIndex = raw.lastIndexOf(`\n${TITLE_MARKER}`);

    if (titleMarkerIndex !== -1) {
      // Extract generated title if marker found AND user didn't provide one
      const extractedTitle = raw.slice(titleMarkerIndex + TITLE_MARKER.length + 1).trim();
      if (!title) { // Only use generated title if user didn't provide one
        title = extractedTitle;
      }
      // Extract the story part before the marker
      story = raw.slice(0, titleMarkerIndex).trim();
    } else if (!title) {
      // Fallback title generation if marker fails AND user didn't provide one
      // Basic fallback - might need translation or a more robust approach if marker fails often
      title = language === "English" ? `A ${theme} story` : `Story about ${theme}`; // Very basic fallback
      // Story remains the whole raw content if marker is missing
      story = raw.trim();
    }

     // Clean up potential leading/trailing markdown formatting if necessary
     story = story.replace(/^#\s+/,''); // Example: remove leading markdown H1 if model adds it

    return { story, title };

  } catch (error) {
    console.error("Error generating story from OpenAI:", error);
    // Re-throw or return a structured error object
    throw new Error("Failed to generate story. Please try again.");
  }
}