import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { ElevenLabsClient } from 'npm:elevenlabs@1.55.0'; // Ensure this version is correct or update if needed
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@^2.40.0'; // Ensure this version is correct

// --- Get API Key from secrets ---
const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
if (!elevenlabsApiKey) {
  console.error("ELEVENLABS_API_KEY environment variable not set.");
  // Consider returning an error in a real app if the key is absolutely required at startup
}
const elevenlabs = new ElevenLabsClient({ apiKey: elevenlabsApiKey });

// --- Get Supabase details from secrets ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key!
if (!supabaseUrl || !supabaseServiceKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable not set.");
    // Consider returning an error
}
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl!, supabaseServiceKey!);

// --- CORS headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: Restrict in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("ElevenLabs TTS function initializing...");

/**
 * CORRECTED: Converts an AsyncIterable<Uint8Array> (like the one from ElevenLabs SDK) to an ArrayBuffer.
 */
async function asyncIterableToBuffer(asyncIterable: AsyncIterable<Uint8Array>): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  console.log("Starting to consume async iterable for TTS audio...");
  // Use for await...of to correctly consume the async iterable
  for await (const chunk of asyncIterable) {
    // console.log(`Received TTS chunk of size: ${chunk.length}`); // Optional verbose log
    chunks.push(chunk);
    totalLength += chunk.length;
  }
  console.log(`Finished consuming TTS iterable. Total chunks: ${chunks.length}, Total length: ${totalLength}`);

  if (totalLength === 0) {
      // It's possible the SDK yields nothing if the text is empty or just whitespace
      console.warn("Warning: Consumed async iterable resulted in zero bytes for TTS.");
      throw new Error("Generated audio stream was empty. Check input text.");
  }

  // Concatenate chunks into a single Uint8Array
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  console.log("TTS buffer constructed successfully.");
  return result.buffer;
}
// --- End CORRECTED Function ---


serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request for TTS");
    return new Response('ok', { headers: corsHeaders });
  }

  // Handle POST request
  if (req.method !== 'POST') {
     console.log(`Unsupported method: ${req.method}`);
     return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
   }

  // Ensure API Key is available before proceeding
  if (!elevenlabsApiKey) {
     console.error("ELEVENLABS_API_KEY is not available at request time.");
     return new Response(JSON.stringify({ error: 'Server configuration error: Missing API key.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    console.log("Handling POST request for TTS generation");
    const { text, voiceId } = await req.json();

    if (!text || !voiceId) {
      throw new Error("Missing required parameters: text and voiceId");
    }
    // Avoid logging potentially very long text
    console.log(`Generating TTS for voiceId: ${voiceId}, text length: ${text.length}`);

    // --- Generate Audio Stream/Iterable ---
    const audioIterable = await elevenlabs.generate({ // Renamed variable for clarity
      voice: voiceId,
      text,
      model_id: "eleven_multilingual_v2", // Or your preferred model
    });

    if (!audioIterable) {
        // This case might not happen if generate throws, but good to check
        throw new Error("Failed to get audio stream/iterable from ElevenLabs.");
    }

    // --- Consume Stream/Iterable and Convert to Buffer ---
    console.log("Consuming audio stream/iterable...");
    // MODIFIED: Call the corrected buffer conversion function
    const audioBuffer = await asyncIterableToBuffer(audioIterable);
    console.log(`Generated audio buffer size: ${audioBuffer.byteLength}`);

    if (audioBuffer.byteLength === 0) {
        // This error is now thrown inside asyncIterableToBuffer if totalLength is 0 after iteration
        // If that function was modified not to throw, you might re-enable this check here.
        // throw new Error("Generated audio buffer is empty after processing.");
    }

    // --- Save to Supabase Storage ---
    const filePath = `audio/${crypto.randomUUID()}.mp3`;
    console.log(`Uploading TTS audio to Supabase Storage at path: ${filePath}`);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('story_assets') // Ensure this bucket name matches your Supabase setup
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false, // Don't overwrite existing files (use UUIDs)
      });

    if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        throw uploadError; // Throw the specific Supabase error
    }
    console.log("TTS audio upload successful:", uploadData);

    // --- Get Public URL ---
    const { data: urlData } = supabaseAdmin.storage
      .from('story_assets')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
        console.error("Failed to get public URL for TTS audio path:", filePath);
        // Optionally attempt cleanup on failure
        // await supabaseAdmin.storage.from('story_assets').remove([filePath]);
        throw new Error("Failed to get public URL for generated TTS audio.");
    }
    const publicUrl = urlData.publicUrl;
    console.log(`Public URL for TTS audio obtained: ${publicUrl}`);

    // --- Return URL Response ---
    return new Response(
        JSON.stringify({ audioUrl: publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // --- Handle errors ---
    console.error("Error during ElevenLabs TTS generation/upload:", error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred';
    // Return a 500 status code for server-side errors
    return new Response(
        JSON.stringify({ error: message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

console.log("ElevenLabs TTS function handler registered.");