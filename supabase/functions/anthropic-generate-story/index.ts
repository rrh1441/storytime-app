// supabase/functions/anthropic-generate-story/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';
import OpenAI from 'npm:openai@^4.0.0';
// Import APIError types if needed for more specific error checking
import { APIError as AnthropicAPIError } from 'npm:@anthropic-ai/sdk@0.39.0/error';
import { APIError as OpenAIAPIError } from 'npm:openai@^4.0.0';

// --- API Keys & Clients ---
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

if (!anthropicApiKey) {
  console.warn("ANTHROPIC_API_KEY is not set. Anthropic provider will be unavailable.");
}
if (!openaiApiKey) {
  console.warn("OPENAI_API_KEY is not set. OpenAI fallback will be unavailable.");
}

// --- Constants ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const TITLE_MARKER = "Generated Title: ";
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const BACKOFF_FACTOR = 2;
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20240620";
const DEFAULT_AGE_DESCRIPTION = "suitable for young children"; // Use a constant for default description

console.log(`Anthropic/OpenAI Generate Story function initializing (Anthropic: ${anthropic ? 'Enabled' : 'Disabled'}, OpenAI: ${openai ? 'Enabled' : 'Disabled'})...`);

// --- Helper Function for Delays ---
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  let finalStoryContent: string | null = null;
  let finalTitle: string | null = null;
  let providerUsed: 'Anthropic' | 'OpenAI' | null = null;

  try {
    console.log("Handling POST request for story generation");
    // --- MODIFIED: Removed ageRange from destructuring ---
    const {
      storyTitle: userProvidedStoryTitle,
      theme = "adventure",
      mainCharacter,
      educationalFocus,
      additionalInstructions
    } = await req.json();
    // --- END MODIFICATION ---

    // --- MODIFIED: Removed ageRange validation ---
    if (!theme) {
      throw new Error("Missing required parameter: theme");
    }
    // --- END MODIFICATION ---

    // Log received parameters (ageRange is omitted)
    console.log("Received parameters:", { userProvidedStoryTitle, theme, mainCharacter, educationalFocus });

    // --- Shared Prompt Details ---
    const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
    const lengthGuidance = 'around 350-450 words (approx 2.5-3 minutes reading time)';
    const maxOutputTokens = 600;
    const eduFocus = educationalFocus ? ` The story should subtly incorporate the theme of ${educationalFocus}.` : "";
    const addInstructions = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";

    // --- MODIFIED Prompt (uses DEFAULT_AGE_DESCRIPTION) ---
    const basePromptInstructions = `Write a children's story ${DEFAULT_AGE_DESCRIPTION}.
The story should have a theme of ${theme}.${characterDesc}
The story should be engaging and age-appropriate, ${lengthGuidance}.${eduFocus}${addInstructions}
Ensure the narrative is positive and concludes nicely. Structure the output in Markdown format, using paragraphs.
Do not include any conversational introduction or conclusion like 'Here is the story...' or 'I hope you enjoyed this story!'. Start the response directly with the story content.`;
    // --- END MODIFIED Prompt ---

    const shouldGenerateTitle = !(userProvidedStoryTitle && userProvidedStoryTitle.trim() !== "");
    const titleInstruction = shouldGenerateTitle
      ? `\n\nAfter generating the story, suggest a suitable and creative title for this children's story. Output the title on a single, separate line at the very end, preceded by the exact marker "${TITLE_MARKER}".`
      : "";

    // --- Attempt 1: Anthropic (with Retries) ---
    let anthropicSuccess = false;
    let lastAnthropicError: any = null;

    if (anthropic) {
      console.log("Attempting story generation with Anthropic...");
      let retries = MAX_RETRIES;
      let delay = INITIAL_DELAY_MS;

      while (retries > 0) {
        try {
          const anthropicPrompt = basePromptInstructions + titleInstruction;
          console.log(`Calling Anthropic model (${ANTHROPIC_MODEL}) with max_tokens: ${maxOutputTokens}. Retries left: ${retries}`);
          const msg = await anthropic.messages.create({ model: ANTHROPIC_MODEL, max_tokens: maxOutputTokens, messages: [{ role: "user", content: anthropicPrompt }], });
          console.log("Anthropic API call successful.");
          const rawContent = msg.content[0]?.type === 'text' ? msg.content[0].text : null;
          if (!rawContent) throw new Error('Anthropic response content was empty or not text.');
          // MODIFIED: Pass DEFAULT_AGE_DESCRIPTION to parser
          const parsed = parseProviderResponse(rawContent, userProvidedStoryTitle, theme, DEFAULT_AGE_DESCRIPTION);
          finalStoryContent = parsed.story;
          finalTitle = parsed.title;
          providerUsed = 'Anthropic';
          anthropicSuccess = true;
          break;
        } catch (error) {
            lastAnthropicError = error;
            const status = (error as any)?.status;
            console.warn(`Anthropic API call failed. Status: ${status}, Retries left: ${retries - 1}`);
            if ((status === 529 || status === 429 || status >= 500) && retries > 1) {
                console.log(`Retrying Anthropic after ${delay}ms...`);
                await sleep(delay);
                delay *= BACKOFF_FACTOR;
                retries--;
            } else {
                console.error("Anthropic failed permanently or error not retryable.");
                break;
            }
        } // end catch
      } // end while
    } else {
        console.log("Anthropic client not available, skipping.");
    }

    // --- Attempt 2: OpenAI Fallback (with Retries) ---
    let openaiSuccess = false;
    let lastOpenAIError: any = null;

    if (!anthropicSuccess && openai) {
      console.log("Anthropic failed, attempting fallback with OpenAI...");
      let retries = MAX_RETRIES;
      let delay = INITIAL_DELAY_MS;

      while (retries > 0) {
        try {
           const openAIPrompt = basePromptInstructions + titleInstruction;
           console.log(`Calling OpenAI model (${OPENAI_MODEL}) with max_tokens: ${maxOutputTokens}. Retries left: ${retries}`);
           const completion = await openai.chat.completions.create({ model: OPENAI_MODEL, messages: [ { role: "user", content: openAIPrompt } ], max_tokens: maxOutputTokens });
           console.log("OpenAI API call successful.");
           const rawContent = completion.choices[0]?.message?.content;
           if (!rawContent) throw new Error('OpenAI response content was empty.');
           // MODIFIED: Pass DEFAULT_AGE_DESCRIPTION to parser
           const parsed = parseProviderResponse(rawContent, userProvidedStoryTitle, theme, DEFAULT_AGE_DESCRIPTION);
           finalStoryContent = parsed.story;
           finalTitle = parsed.title;
           providerUsed = 'OpenAI';
           openaiSuccess = true;
           break;
        } catch (error) {
            lastOpenAIError = error;
            const status = (error as any)?.status;
            console.warn(`OpenAI API call failed. Status: ${status}, Retries left: ${retries - 1}`);
            if ((status === 429 || status >= 500) && retries > 1) {
                console.log(`Retrying OpenAI after ${delay}ms...`);
                await sleep(delay);
                delay *= BACKOFF_FACTOR;
                retries--;
            } else {
                console.error("OpenAI failed permanently or error not retryable.");
                break;
            }
        } // end catch
      } // end while
    } else if (!anthropicSuccess) {
        console.log("Anthropic failed and OpenAI client not available, cannot fallback.");
    }

    // --- Final Check and Response ---
    if (providerUsed && finalStoryContent && finalTitle) {
      console.log(`Successfully generated story using ${providerUsed}.`);
      return new Response(
        JSON.stringify({ story: finalStoryContent, title: finalTitle }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      console.error("Failed to generate story using both Anthropic and OpenAI.");
      if (lastAnthropicError) console.error("Last Anthropic Error:", lastAnthropicError);
      if (lastOpenAIError) console.error("Last OpenAI Error:", lastOpenAIError);
      throw new Error("Both AI providers failed after retries.");
    }

  } catch (error) {
    // --- User-Friendly Final Error Handling ---
    console.error("Detailed Error in Story Generation Function:", error);
    let userErrorMessage = "We're having trouble generating the story right now, possibly due to high demand on our AI partners' servers. Please try again in a few moments.";
    if (!anthropicApiKey && !openaiApiKey) { userErrorMessage = "AI story generation is currently unavailable due to configuration issues. Please contact support."; }
    else if (error instanceof Error && error.message === "Both AI providers failed after retries.") { userErrorMessage = "We're having trouble generating the story right now, possibly due to high demand on our AI partners' servers (Anthropic/OpenAI). Please try again in a few moments."; }
    else if (error instanceof Error) { userErrorMessage = `Failed to start story generation: ${error.message}`; }
    console.error("Final error message sent to user:", userErrorMessage);
    return new Response( JSON.stringify({ error: userErrorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 } );
  }
});

// --- Helper function to parse response content ---
// MODIFIED: ageRange parameter changed to ageDescription for fallback title
function parseProviderResponse(
    rawContent: string,
    userProvidedTitle: string | null | undefined,
    theme: string,
    ageDescription: string // Changed from ageRange
): { story: string; title: string } {
    let story = rawContent.trim();
    let title = (userProvidedTitle && userProvidedTitle.trim() !== "") ? userProvidedTitle.trim() : "";

    if (!title) { // Only look for marker if user didn't provide title
        const titleMarkerIndex = story.lastIndexOf(`\n${TITLE_MARKER}`);
        if (titleMarkerIndex !== -1) {
            const extractedTitle = story.substring(titleMarkerIndex + TITLE_MARKER.length + 1).trim();
            if (extractedTitle) {
                 title = extractedTitle;
                 story = story.substring(0, titleMarkerIndex).trim();
                 console.log(`Parsed generated title: "${title}"`);
            } else { console.warn("Found title marker but extracted title was empty during parsing."); }
        } else { console.warn("Title marker not found in response during parsing."); }
    }
    // Fallback title if still empty after parsing
    if (!title || title.trim() === "") {
        console.log("No valid title parsed or provided. Creating fallback title.");
        // MODIFIED: Use ageDescription in fallback
        title = `A ${theme} story ${ageDescription}`;
    }
    return { story, title };
}
// ---

console.log("Anthropic/OpenAI story generation function handler registered.");