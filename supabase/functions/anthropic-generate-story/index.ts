import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// Use the confirmed latest version
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

// Get the API key from Supabase secrets
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
if (!anthropicApiKey) {
  console.error("ANTHROPIC_API_KEY is not set in Supabase secrets.");
  // Consider throwing an error in a real application
}

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
});

// --- Define CORS headers ---
// IMPORTANT: In production, replace '*' with your actual frontend URL
// e.g., 'https://your-storytime-app-domain.com'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Anthropic Generate Story function initializing...");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    console.log(`Unsupported method: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log("Handling POST request for story generation");
    // --- Get parameters from the request body ---
    const {
      ageRange = "4-8", // Provide sensible defaults
      theme = "adventure",
      mainCharacter,
      length = "medium", // 'short', 'medium', 'long'
      educationalFocus,
      additionalInstructions
    } = await req.json();

    // Basic validation
    if (!ageRange || !theme) {
        throw new Error("Missing required parameters: ageRange and theme");
    }

    console.log("Received parameters:", { ageRange, theme, length, mainCharacter, educationalFocus });

    // --- Construct the prompt dynamically ---
    const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
    let lengthGuidance = 'around 600-900 words'; // Default to medium
    let maxOutputTokens = 1200; // Default token limit for medium
    if (length === 'short') {
        lengthGuidance = 'around 300-500 words';
        maxOutputTokens = 700; // Adjust based on testing for short
    } else if (length === 'long') {
        lengthGuidance = 'around 1000-1500 words';
        maxOutputTokens = 2000; // Adjust based on testing for long
    }
    const eduFocus = educationalFocus ? ` The story should subtly incorporate the theme of ${educationalFocus}.` : "";
    const addInstructions = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";

    const prompt = `Write a children's story suitable for the age range ${ageRange}.
The story should have a theme of ${theme}.${characterDesc}
The story should be engaging and age-appropriate, ${lengthGuidance} long.${eduFocus}${addInstructions}
Ensure the narrative is positive and concludes nicely. Structure the output in Markdown format, using paragraphs. Do not include a title unless specifically asked.`;

    console.log("Constructed prompt (first 100 chars):", prompt.substring(0, 100));

    // --- Call Anthropic API ---
    console.log(`Calling Anthropic model: claude-3-5-haiku-20241022 with max_tokens: ${maxOutputTokens}`);
    const msg = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022", // Use the specific model ID
      max_tokens: maxOutputTokens,       // Use the calculated max tokens
      messages: [{ role: "user", content: prompt }],
      // system: "You are a creative and engaging children's story writer." // Optional: Add a system prompt
    });

    console.log("Anthropic API call successful.");

    // --- Extract response ---
    // Check if content is potentially null or not the expected structure
    const storyContent = msg.content[0]?.type === 'text' ? msg.content[0].text : null;

    if (!storyContent) {
        console.error("Anthropic response content was empty or not text.");
        throw new Error('Failed to generate story content from Anthropic.');
    }

    console.log("Successfully extracted story content.");

    // --- Return success response ---
    return new Response(
      JSON.stringify({ story: storyContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    // --- Handle errors ---
    console.error("Error in Anthropic Edge Function:", error);
    // Try to get a meaningful message, default otherwise
    const message = error instanceof Error ? error.message : 'An internal error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Use 500 for server-side errors
      }
    );
  }
});

console.log("Anthropic Generate Story function handler registered.");