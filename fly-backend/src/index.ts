// fly-backend/src/index.ts
// Updated: Integrates Supabase upload for the /tts route.
import express from "express";
import cors from "cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js"; // Import Supabase client
import { v4 as uuidv4 } from "uuid"; // Import UUID generator

import { generateStory } from "./services/story.js";
// Import the updated generateSpeech and types/constants
import { generateSpeech, VOICES, VoiceId, SpeechGenerationResult } from "./services/tts.js";

// --- Environment Variable Checks ---
const {
    PORT = "8080", // Default port if not set
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    OPENAI_API_KEY // Needed by generateSpeech
} = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL environment variable is required.");
if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY environment variable is required.");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY environment variable is required.");

// --- Supabase Client Initialization ---
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Express App Setup ---
const app = express();

// CORS Configuration
app.use(
  cors({
    origin: [
      "https://storytime-app.fly.dev", // Your Fly frontend app URL
      "https://yourstorytime.vercel.app", // Your Vercel frontend app URL
      "http://localhost:5173", // Local Vite dev server
      "http://localhost:3000", // Common local dev port
      // Add any other origins if necessary
    ],
    methods: ["GET", "POST", "OPTIONS"], // OPTIONS is needed for preflight requests
    allowedHeaders: ["Content-Type", "Authorization"], // Headers your frontend sends
    credentials: true, // If you need to handle cookies/sessions
  })
);

// Middleware
app.use(express.json({ limit: '10mb' })); // Allow reasonable JSON payload size
app.use((req, _res, next) => {
  // Simple request logger
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- Routes ---

// Health Check Route
app.get("/health", (_req, res) => res.status(200).send("OK"));

// Story Generation Route
app.post("/generate-story", async (req, res) => {
  try {
    // Assuming generateStory handles its own logging if needed
    // Consider adding input validation here (e.g., using Zod)
    const { story, title } = await generateStory(req.body);
    res.status(200).json({ story, title });
  } catch (error: any) {
    console.error("Error in /generate-story route:", error);
    res.status(500).json({ error: error.message || "Failed to generate story" });
  }
});

// Text-to-Speech Route (with Supabase Upload)
app.post("/tts", async (req, res) => {
  try {
    const { text, voice, language = "English" } = req.body;

    // Input Validation
    if (!text || !voice) {
      return res.status(400).json({ error: "Text and voice parameters are required" });
    }
    if (typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: "Text must be a non-empty string" });
    }
    if (!VOICES.includes(voice as VoiceId)) {
      // Ensure VOICES list in tts.ts is accurate for your model
      return res.status(400).json({ error: `Invalid voice specified: ${voice}` });
    }
    // Add length limits if needed
    // if (text.length > 5000) { // Example limit
    //     return res.status(400).json({ error: "Text exceeds maximum length" });
    // }

    // 1. Generate Speech Buffer using the updated service
    console.log(`[API /tts] Calling generateSpeech service...`);
    const { mp3Buffer, contentType }: SpeechGenerationResult = await generateSpeech(text, voice as VoiceId, language);
    console.log(`[API /tts] Received MP3 buffer (${mp3Buffer.length} bytes) from service.`);

    // 2. Prepare for Upload
    const bucketName = 'story_assets'; // Your public Supabase bucket
    const fileExtension = 'mp3';
    const fileName = `${uuidv4()}.${fileExtension}`;
    // Store files in a logical folder structure within the bucket
    const filePath = `audio/${fileName}`; // e.g., audio/uuid.mp3

    // 3. Upload Buffer to Supabase Storage
    console.log(`[API /tts] Uploading to Supabase bucket '${bucketName}' as '${filePath}'...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, mp3Buffer, {
        contentType: contentType,
        upsert: false, // Don't overwrite if somehow a UUID collision occurs
      });

    if (uploadError) {
      console.error("[API /tts] Supabase Upload Error:", uploadError);
      // Do not expose detailed Supabase errors to the client
      throw new Error("Failed to store generated audio."); // Generic error message
    }
    console.log("[API /tts] Supabase Upload Successful:", uploadData);


    // 4. Get Public URL from Supabase
    console.log(`[API /tts] Retrieving public URL for '${filePath}'...`);
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      console.error("[API /tts] Supabase Get Public URL Error: URL data is missing or null.", urlData);
      // Optional: Consider deleting the orphaned file if URL retrieval fails
      // await supabase.storage.from(bucketName).remove([filePath]);
      throw new Error("Failed to get URL for generated audio."); // Generic error
    }

    const publicUrl = urlData.publicUrl;
    console.log(`[API /tts] Returning Public URL: ${publicUrl}`);

    // 5. Send Public URL back to Frontend
    res.status(200).json({ audioUrl: publicUrl });

  } catch (error: any) {
    console.error("[API /tts] Error processing TTS request:", error);
    // Send a generic error message to the client
    res.status(500).json({ error: error.message || "Failed to generate audio narration." });
  }
});

// --- Error Handling Middleware (Optional but Recommended) ---
// app.use((err, req, res, next) => {
//   console.error("Unhandled error:", err);
//   res.status(500).json({ error: "An unexpected server error occurred." });
// });

// --- Start Server ---
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✅ Backend server listening on http://0.0.0.0:${PORT}`);
  console.log(`🔑 Supabase URL configured: ${SUPABASE_URL.substring(0, 20)}...`); // Avoid logging full URL/keys
  console.log(`🔑 OpenAI Key: ${OPENAI_API_KEY ? 'Loaded' : 'MISSING!'}`);
});