import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// --- Get API Key from secrets ---
const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
if (!elevenlabsApiKey) {
  console.error("ELEVENLABS_API_KEY environment variable not set.");
  // In a real app, you might want to return an error immediately
}

// --- Define CORS headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: Restrict in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Get ElevenLabs Voices function initializing...");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request for voices");
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure API key is available
  if (!elevenlabsApiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing API key.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log("Handling GET request for ElevenLabs voices");

    // --- Parameters (Optional - Add if needed later) ---
    // const url = new URL(req.url);
    // const pageSize = url.searchParams.get('page_size') || '30'; // Example: Get 30 voices
    // const category = url.searchParams.get('category') || 'professional'; // Example: Filter by category

    // --- Call ElevenLabs API ---
    // Using v2 endpoint as per docs
    const elevenLabsUrl = `https://api.elevenlabs.io/v2/voices?page_size=50`; // Fetching up to 50
    console.log(`Workspaceing voices from: ${elevenLabsUrl}`);

    const response = await fetch(elevenLabsUrl, {
      method: 'GET',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Accept': 'application/json',
      },
    });

    console.log(`ElevenLabs API response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`ElevenLabs API Error (${response.status}): ${errorBody}`);
      throw new Error(`Failed to fetch voices from ElevenLabs: ${response.statusText}`);
    }

    const data = await response.json();

    // Basic check if the expected data structure is present
    if (!data || !Array.isArray(data.voices)) {
         console.error("Unexpected response format from ElevenLabs:", data);
         throw new Error("Received invalid data format from voice service.");
    }

    console.log(`Successfully fetched ${data.voices.length} voices.`);

    // --- Return success response ---
    // We only need voice_id and name for the dropdown, but returning the whole object might be useful
    return new Response(
      JSON.stringify({ voices: data.voices }), // Return the array under a 'voices' key
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    // --- Handle errors ---
    console.error("Error in Get ElevenLabs Voices Edge Function:", error);
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

console.log("Get ElevenLabs Voices function handler registered.");