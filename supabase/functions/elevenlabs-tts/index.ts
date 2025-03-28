import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// Use the confirmed latest version
import { ElevenLabsClient } from 'npm:elevenlabs@1.55.0';
// NOTE: Check npm for Supabase JS V2+ version, 2.40.0 is likely fine but verify if needed
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@^2.40.0';

// --- Get API Key from secrets ---
const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
if (!elevenlabsApiKey) {
  console.error("ELEVENLABS_API_KEY environment variable not set.");
  // Throw or handle appropriately in a real app
}
const elevenlabs = new ElevenLabsClient({ apiKey: elevenlabsApiKey });

// --- Get Supabase details from secrets for saving to Storage ---
// IMPORTANT: You NEED the Service Role Key for backend operations like this
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable not set.");
    // Throw or handle appropriately
}
// Initialize Supabase client WITH SERVICE ROLE KEY for backend access
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl!, supabaseServiceKey!);

// --- Define CORS headers ---
// IMPORTANT: In production, replace '*' with your actual frontend URL
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("ElevenLabs TTS function initializing...");

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
    console.log("Handling POST request for TTS");
    const { text, voiceId } = await req.json();

    if (!text || !voiceId) {
      throw new Error("Missing required parameters: text and voiceId");
    }
     console.log(`Generating TTS for voiceId: ${voiceId}, text (start): ${text.substring(0, 50)}...`);

    // --- Generate Audio Stream ---
    const audioStream = await elevenlabs.generate({
      voice: voiceId, // Can be professional ID or cloned voice ID
      text,
      model_id: "eleven_multilingual_v2", // Or your preferred model
      // output_format: "mp3_44100_128" // Example output format, check SDK docs if needed
    });

    if (!audioStream) {
        throw new Error("Failed to generate audio stream from ElevenLabs.");
    }

    // --- Save to Supabase Storage ---
    console.log("Converting stream to buffer...");
    const audioBuffer = await readableStreamToBuffer(audioStream);
    console.log(`Buffer size: ${audioBuffer.byteLength}`);

    if (audioBuffer.byteLength === 0) {
        throw new Error("Generated audio buffer is empty.");
    }

    // Create a unique file path
    const filePath = `audio/${crypto.randomUUID()}.mp3`;
    console.log(`Uploading to Supabase Storage at path: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('story_assets') // Your bucket name from SQL setup
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false, // Don't overwrite
      });

    if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        throw uploadError; // Rethrow the Supabase error
    }
    console.log("Upload successful:", uploadData);

    // --- Get Public URL ---
    // Assumes your 'story_assets' bucket is public as per the SQL setup
    const { data: urlData } = supabaseAdmin.storage
      .from('story_assets')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
        console.error("Failed to get public URL for path:", filePath);
        // Attempt to clean up the uploaded file if URL retrieval fails? Optional.
        // await supabaseAdmin.storage.from('story_assets').remove([filePath]);
        throw new Error("Failed to get public URL for generated audio.");
    }
    const publicUrl = urlData.publicUrl;
    console.log(`Public URL obtained: ${publicUrl}`);

    // --- Return URL Response ---
    return new Response(
      JSON.stringify({ audioUrl: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    // --- Handle errors ---
    console.error("Error in ElevenLabs TTS Edge Function:", error);
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

/**
 * Converts a ReadableStream<Uint8Array> to an ArrayBuffer.
 * Useful for uploading stream data to storage services.
 */
async function readableStreamToBuffer(readable: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
    const reader = readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break; // Exit loop when stream is finished
        }
        if (value) {
            chunks.push(value); // Store the chunk
        }
    }

    // Calculate total length first
    let totalLength = 0;
    chunks.forEach(chunk => {
        totalLength += chunk.length;
    });

    // Allocate the final buffer
    const result = new Uint8Array(totalLength);
    let offset = 0;
    // Copy chunks into the final buffer
    chunks.forEach(chunk => {
        result.set(chunk, offset);
        offset += chunk.length;
    });

    return result.buffer;
}

console.log("ElevenLabs TTS function handler registered.");