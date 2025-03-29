// supabase/functions/anthropic-generate-story/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
if (!anthropicApiKey) {
  console.error("ANTHROPIC_API_KEY is not set in Supabase secrets.");
}
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TITLE_MARKER = "Generated Title: ";

console.log("Anthropic Generate Story function initializing...");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request for story generation");
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log(`Unsupported method: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!anthropic) {
      console.error("Anthropic client not initialized. Check ANTHROPIC_API_KEY secret.");
       return new Response(JSON.stringify({ error: 'Server configuration error: AI service unavailable.' }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
  }

  try {
    console.log("Handling POST request for story generation");
    // REMOVED 'length' from destructuring - it's no longer needed from input
    const {
      storyTitle,
      ageRange = "4-8",
      theme = "adventure",
      mainCharacter,
      educationalFocus,
      additionalInstructions
    } = await req.json();

    if (!ageRange || !theme) {
        throw new Error("Missing required parameters: ageRange and theme");
    }

    // Log received parameters (length is now omitted)
    console.log("Received parameters:", { storyTitle, ageRange, theme, mainCharacter, educationalFocus });

    // --- Construct the prompt dynamically ---
    const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";

    // --- FIXED Length Guidance & Token Limits (targeting ~2.5-3 min) ---
    const lengthGuidance = 'around 350-450 words (approx 2.5-3 minutes reading time)';
    const maxOutputTokens = 600; // Set a fixed token limit suitable for the target length
    // --- END FIXED Length ---

    const eduFocus = educationalFocus ? ` The story should subtly incorporate the theme of ${educationalFocus}.` : "";
    const addInstructions = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";

    // --- UPDATED Prompt uses fixed length guidance ---
    let prompt = `Write a children's story suitable for the age range ${ageRange}.
The story should have a theme of ${theme}.${characterDesc}
The story should be engaging and age-appropriate, ${lengthGuidance}.${eduFocus}${addInstructions}
Ensure the narrative is positive and concludes nicely. Structure the output in Markdown format, using paragraphs.
Do not include any conversational introduction or conclusion like 'Here is the story...' or 'I hope you enjoyed this story!'. Start the response directly with the story content.`;
    // --- END UPDATED Prompt ---

    const userProvidedTitle = storyTitle && storyTitle.trim() !== "";
    if (!userProvidedTitle) {
      prompt += `\n\nAfter generating the story, suggest a suitable and creative title for this children's story. Output the title on a single, separate line at the very end, preceded by the exact marker "${TITLE_MARKER}".`;
      console.log("Added title generation instruction to prompt.");
    } else {
        console.log("User provided title, skipping generation instruction.");
    }

    console.log("Constructed prompt (first 100 chars):", prompt.substring(0, 100));
    console.log(`Calling Anthropic model with fixed max_tokens: ${maxOutputTokens}`);

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: maxOutputTokens, // Use fixed token limit
      messages: [{ role: "user", content: prompt }],
    });

    console.log("Anthropic API call successful.");

    const rawContent = msg.content[0]?.type === 'text' ? msg.content[0].text : null;

    if (!rawContent) {
        console.error("Anthropic response content was empty or not text.");
        throw new Error('Failed to generate story content from Anthropic.');
    }

    let finalStoryContent = rawContent.trim();
    let finalTitle = userProvidedTitle ? storyTitle.trim() : "";

    if (!userProvidedTitle) {
        const titleMarkerIndex = finalStoryContent.lastIndexOf(`\n${TITLE_MARKER}`);
        if (titleMarkerIndex !== -1) {
            const extractedTitle = finalStoryContent.substring(titleMarkerIndex + TITLE_MARKER.length + 1).trim();
            if (extractedTitle) {
                 finalTitle = extractedTitle;
                 finalStoryContent = finalStoryContent.substring(0, titleMarkerIndex).trim();
                 console.log(`Generated title found: "${finalTitle}"`);
            } else {
                 console.warn("Found title marker but extracted title was empty.");
            }
        } else {
             console.warn("Title marker not found in response.");
        }
    }

    if (!finalTitle || finalTitle.trim() === "") {
        console.log("No valid title found. Creating fallback title.");
        finalTitle = `A ${theme} story for ages ${ageRange}`;
    }

    console.log("Successfully processed story content and title.");

    return new Response(
      JSON.stringify({ story: finalStoryContent, title: finalTitle }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in Anthropic Edge Function:", error);
    const message = error instanceof Error ? error.message : 'An internal error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

console.log("Anthropic Generate Story function handler registered (using fixed length).");