import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
if (!anthropicApiKey) {
  console.error("ANTHROPIC_API_KEY is not set in Supabase secrets.");
}

const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TITLE_MARKER = "Generated Title: "; // Marker for parsing

console.log("Anthropic Generate Story function initializing...");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log(`Unsupported method: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log("Handling POST request for story generation");
    const {
      // MODIFIED: Destructure storyTitle, allow it to be null/empty
      storyTitle,
      ageRange = "4-8",
      theme = "adventure",
      mainCharacter,
      length = "medium",
      educationalFocus,
      additionalInstructions
    } = await req.json();

    if (!ageRange || !theme) {
        throw new Error("Missing required parameters: ageRange and theme");
    }

    console.log("Received parameters:", { storyTitle, ageRange, theme, length, mainCharacter, educationalFocus });

    const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
    let lengthGuidance = 'around 600-900 words';
    let maxOutputTokens = 1200;
    if (length === 'short') {
        lengthGuidance = 'around 300-500 words';
        maxOutputTokens = 700;
    } else if (length === 'long') {
        lengthGuidance = 'around 1000-1500 words';
        maxOutputTokens = 2000;
    }
    const eduFocus = educationalFocus ? ` The story should subtly incorporate the theme of ${educationalFocus}.` : "";
    const addInstructions = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";

    // MODIFIED: Construct base prompt
    let prompt = `Write a children's story suitable for the age range ${ageRange}.
The story should have a theme of ${theme}.${characterDesc}
The story should be engaging and age-appropriate, ${lengthGuidance} long.${eduFocus}${addInstructions}
Ensure the narrative is positive and concludes nicely. Structure the output in Markdown format, using paragraphs. Do not include a title in the main story body unless specifically asked.`;

    // MODIFIED: Conditionally add title generation instruction
    if (!storyTitle || storyTitle.trim() === "") {
      prompt += `\n\nAfter generating the story, suggest a suitable and creative title for this children's story. Output the title on a single, separate line at the very end, preceded by the exact marker "${TITLE_MARKER}".`;
       console.log("Added title generation instruction to prompt.");
    } else {
       console.log("User provided title, skipping generation instruction.");
    }


    console.log("Constructed prompt (first 100 chars):", prompt.substring(0, 100));
    console.log(`Calling Anthropic model: claude-3-5-haiku-20241022 with max_tokens: ${maxOutputTokens}`);

    const msg = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
    });

    console.log("Anthropic API call successful.");

    const rawContent = msg.content[0]?.type === 'text' ? msg.content[0].text : null;

    if (!rawContent) {
        console.error("Anthropic response content was empty or not text.");
        throw new Error('Failed to generate story content from Anthropic.');
    }

    // MODIFIED: Parse response for story and potential title
    let finalStoryContent = rawContent;
    let finalTitle = storyTitle || ""; // Default to user title or empty string

    const titleMarkerIndex = rawContent.lastIndexOf(`\n${TITLE_MARKER}`);

    if (titleMarkerIndex !== -1 && (!storyTitle || storyTitle.trim() === "")) {
        // Found the marker and user didn't provide a title, extract AI title
        finalStoryContent = rawContent.substring(0, titleMarkerIndex).trim();
        finalTitle = rawContent.substring(titleMarkerIndex + TITLE_MARKER.length + 1).trim(); // +1 for the newline
        console.log(`Generated title found: "${finalTitle}"`);
    } else if (!finalTitle || finalTitle.trim() === "") {
        // Fallback if user provided no title AND AI failed to generate one (or marker wasn't found)
        console.log("No title provided and no generated title marker found. Creating fallback title.");
        finalTitle = `A ${theme} story for ages ${ageRange}`; // Simple fallback
    }

    console.log("Successfully processed story content and title.");

    // MODIFIED: Return both story and title
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

console.log("Anthropic Generate Story function handler registered.");