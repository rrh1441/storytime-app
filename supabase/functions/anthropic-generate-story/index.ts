import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0'; // Ensure this version is appropriate or update if needed

// --- Get API Key from secrets ---
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
if (!anthropicApiKey) {
  console.error("ANTHROPIC_API_KEY is not set in Supabase secrets.");
  // Consider throwing an error or handling this more robustly in production
}

// Initialize Anthropic client (only if key exists)
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

// --- Define CORS headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: Restrict in production to your frontend URL
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Marker for parsing the generated title from the response
const TITLE_MARKER = "Generated Title: ";

console.log("Anthropic Generate Story function initializing...");

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request for story generation");
    return new Response('ok', { headers: corsHeaders });
  }

  // Handle POST request
  if (req.method !== 'POST') {
    console.log(`Unsupported method: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Ensure Anthropic client is initialized (API key was found)
  if (!anthropic) {
      console.error("Anthropic client not initialized. Check ANTHROPIC_API_KEY secret.");
       return new Response(JSON.stringify({ error: 'Server configuration error: AI service unavailable.' }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
  }

  try {
    console.log("Handling POST request for story generation");
    // Destructure request body, allowing storyTitle to be null/empty
    const {
      storyTitle, // Can be empty or null
      ageRange = "4-8",
      theme = "adventure",
      mainCharacter,
      length = "medium",
      educationalFocus,
      additionalInstructions
    } = await req.json();

    // Basic validation for required fields
    if (!ageRange || !theme) {
        throw new Error("Missing required parameters: ageRange and theme");
    }

    console.log("Received parameters:", { storyTitle, ageRange, theme, length, mainCharacter, educationalFocus });

    // --- Construct the prompt dynamically ---
    const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
    let lengthGuidance = 'around 600-900 words';
    let maxOutputTokens = 1200; // Adjust based on testing and model limits
    if (length === 'short') {
        lengthGuidance = 'around 300-500 words';
        maxOutputTokens = 700;
    } else if (length === 'long') {
        lengthGuidance = 'around 1000-1500 words';
        maxOutputTokens = 2000;
    }
    const eduFocus = educationalFocus ? ` The story should subtly incorporate the theme of ${educationalFocus}.` : "";
    const addInstructions = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";

    // Base prompt
    let prompt = `Write a children's story suitable for the age range ${ageRange}.
The story should have a theme of ${theme}.${characterDesc}
The story should be engaging and age-appropriate, ${lengthGuidance} long.${eduFocus}${addInstructions}
Ensure the narrative is positive and concludes nicely. Structure the output in Markdown format, using paragraphs.
Do not include any conversational introduction or conclusion like 'Here is the story...' or 'I hope you enjoyed this story!'. Start the response directly with the story content.`; // Negative constraint added

    // Conditionally add title generation instruction if user didn't provide one
    const userProvidedTitle = storyTitle && storyTitle.trim() !== "";
    if (!userProvidedTitle) {
      prompt += `\n\nAfter generating the story, suggest a suitable and creative title for this children's story. Output the title on a single, separate line at the very end, preceded by the exact marker "${TITLE_MARKER}".`;
       console.log("Added title generation instruction to prompt.");
    } else {
       console.log("User provided title, skipping generation instruction.");
    }

    console.log("Constructed prompt (first 100 chars):", prompt.substring(0, 100));
    console.log(`Calling Anthropic model with max_tokens: ${maxOutputTokens}`);

    // --- Call Anthropic API ---
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620", // Using Sonnet as Haiku might be too limited sometimes
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
      // system: "You are a creative and engaging children's story writer." // Optional system prompt
    });

    console.log("Anthropic API call successful.");

    // Extract text content safely
    const rawContent = msg.content[0]?.type === 'text' ? msg.content[0].text : null;

    if (!rawContent) {
        console.error("Anthropic response content was empty or not text.");
        throw new Error('Failed to generate story content from Anthropic.');
    }

    // --- Parse response for story and potential title ---
    let finalStoryContent = rawContent.trim(); // Trim whitespace from raw content
    let finalTitle = userProvidedTitle ? storyTitle.trim() : ""; // Use user title if provided

    // If no user title, look for the AI generated one
    if (!userProvidedTitle) {
        const titleMarkerIndex = finalStoryContent.lastIndexOf(`\n${TITLE_MARKER}`);
        if (titleMarkerIndex !== -1) {
            // Found the marker, extract title and update story content
            const extractedTitle = finalStoryContent.substring(titleMarkerIndex + TITLE_MARKER.length + 1).trim(); // +1 for the newline
            // Only use extracted title if it's not empty
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

    // Fallback title if still empty
    if (!finalTitle || finalTitle.trim() === "") {
        console.log("No valid title found (user-provided or AI-generated). Creating fallback title.");
        finalTitle = `A ${theme} story for ages ${ageRange}`; // Simple fallback
    }

    console.log("Successfully processed story content and title.");

    // --- Return success response with both story and title ---
    return new Response(
      JSON.stringify({ story: finalStoryContent, title: finalTitle }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    // --- Handle errors ---
    console.error("Error in Anthropic Edge Function:", error);
    const message = error instanceof Error ? error.message : 'An internal error occurred';
    // Return 500 for server-side errors
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