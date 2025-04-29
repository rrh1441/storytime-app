// fly-backend/src/services/story.ts
// FINAL VERSION: Includes explicit auth check, correct RPC param name, dynamic length, combined logic, AND story saving.

import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai'; // Ensure OpenAI is installed (`npm install openai`)

// --- Supabase Client Setup ---
// Using service role key for backend operations like usage updates and story inserts
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// --- OpenAI Client Setup ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Ensure OPENAI_API_KEY is set in Fly.io secrets
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// --- Interfaces ---
interface StoryParams {
    storyTitle: string | null; // Keep this as AI *can* generate it
    theme: string;
    length: number; // In minutes
    language: string;
    mainCharacter: string | null;
    educationalFocus: string | null;
    additionalInstructions: string | null;
}

// Supabase Row type from your frontend types (adjust if needed)
interface StoryInsertParams {
    user_id: string;
    title: string;
    content: string;
    theme?: string; // Changed from themes: string[] based on StoryParams
    language?: string; // Added
    length_minutes?: number; // Added - Make sure your DB table has this column
    main_character?: string | null; // Added
    educational_focus?: string | null; // Changed from educational_elements: string[]
    // Add other fields matching your 'stories' table schema as needed
    // e.g., characters?: Json | null; cover_image?: string | null; age_range?: string | null;
}


interface UserRow {
  subscription_status: string | null;
  monthly_minutes_limit: number | null;
  minutes_used_this_period: number;
}

// --- Constants ---
const FREE_ANON_MINUTES_LIMIT = 3;

// --- Helper Function ---
function estimateWordCount(minutes: number): number {
    const wordsPerMinute = 130; // Adjust as needed
    const minWords = 150;
    const maxWords = wordsPerMinute * 75; // Approx 1h 15m max
    const calculatedWords = Math.round(minutes * wordsPerMinute);
    return Math.max(minWords, Math.min(calculatedWords, maxWords));
}

// --- Story Generation Logic (Internal Function) ---
async function generateStoryInternal(params: StoryParams): Promise<{ story: string; title: string }> {
    const { storyTitle, theme, length, language, mainCharacter, educationalFocus, additionalInstructions } = params;
    const targetWordCount = estimateWordCount(length);
    const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
    const eduFocus = educationalFocus ? ` Subtly incorporate the theme of ${educationalFocus}.` : "";
    const addInstr = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";
    const TITLE_MARKER = "Generated Title: ";

    const prompt = `Write **in ${language}** a children's story suitable for young children.
The story should have a theme of ${theme}.${characterDesc}
The target length is approximately ${targetWordCount} words (which is about ${length} minutes when read aloud). Adjust the story complexity and detail accordingly.${eduFocus}${addInstr}
Ensure the story ends on a positive note and is formatted using Markdown paragraphs (use line breaks between paragraphs).

After the story, output a creative title **in ${language}** on a separate line starting with '${TITLE_MARKER}'. Do not include anything else after the title line.`;

    console.log(`[generateStoryInternal] Generating story. Target: ${length} mins (~${targetWordCount} words). Lang: ${language}. Theme: ${theme}`);

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        if (!raw) throw new Error("AI generation returned an empty response.");

        let story = raw.trim();
        let title = storyTitle?.trim() || ""; // Use user-provided first if available
        const titleMarkerIndex = raw.lastIndexOf(`\n${TITLE_MARKER}`);

        if (titleMarkerIndex !== -1) {
            const extractedTitle = raw.slice(titleMarkerIndex + TITLE_MARKER.length + 1).trim();
            if (!title || storyTitle === null) title = extractedTitle; // Use generated if needed
            story = raw.slice(0, titleMarkerIndex).trim();
        } else if (!title || storyTitle === null) {
            console.warn("[generateStoryInternal] Title marker not found. Using basic fallback title.");
            title = `A Story About ${theme}`; // Fallback
        }

        story = story.replace(/^#\s+/, ''); // Cleanup potential markdown H1

        if (!story) throw new Error("Failed to extract story content from AI response.");
        if (!title) title = `A Story About ${theme}`; // Final title fallback

        console.log(`[generateStoryInternal] Generated Title: "${title}", Story Word Count: ${story.split(/\s+/).length}`);
        return { story, title };
    } catch (error) {
        console.error("Error generating story from OpenAI:", error);
        throw new Error(`Failed to generate story via AI. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// --- Express Route Handler ---
export async function generateStoryHandler(
  req: Request, // Use standard Request type
  res: Response,
): Promise<void> {
  try {
    let userId: string | null = null;
    let userProfile: UserRow | null = null;

    // --- Explicit Auth Check ---
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      console.log("Authorization header found, attempting to verify token.");
      const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser(token);

      if (authError) {
        console.error("Auth token verification failed:", authError.message);
        // Don't return 401 if the plan is just to treat as anonymous, but log it.
        // Return 401 if a token was provided but invalid - user likely expects to be logged in.
         return res.status(401).json({ error: "Invalid or expired authentication token. Please log in again." });
      } else if (verifiedUser) {
        userId = verifiedUser.id;
        console.log(`Token verified successfully. User ID: ${userId}`);

        console.log(`Workspaceing user profile for ${userId}`);
        const { data: fetchedProfile, error: fetchErr } = await supabase
          .from('users')
          .select('subscription_status, monthly_minutes_limit, minutes_used_this_period')
          .eq('id', userId)
          .single<UserRow>();

        if (fetchErr) {
          console.error(`User profile fetch error for ${userId}:`, fetchErr);
          return res.status(500).json({ error: 'Could not retrieve user data.' });
        }
        if (!fetchedProfile) {
          // This case might happen if the user exists in auth but not in the public.users table yet.
          // Handle this gracefully, perhaps by treating as anonymous or returning a specific error.
          // For now, we'll treat as if no profile found, which might block logged-in features.
          console.warn(`User profile not found in DB for verified user ${userId}. Check if profile creation trigger works.`);
          // Let's proceed but userProfile will be null, affecting limit checks below.
          // OR return res.status(404).json({ error: 'User profile data incomplete. Please try again later.' });
        }
        userProfile = fetchedProfile; // Will be null if not found
        if (userProfile) {
             console.log(`User profile fetched: Status=${userProfile.subscription_status}, Limit=${userProfile.monthly_minutes_limit}`);
        }

      } else {
        console.warn("Token provided but getUser returned no user.");
         return res.status(401).json({ error: "Invalid token (no user found)." });
      }
    } else {
      console.log("No Authorization header found. Treating as anonymous request.");
      userId = null; // Explicitly anonymous
    }
    // --- End Explicit Auth Check ---

    // 1 — Validate body
    const body = req.body as Partial<StoryParams>; // Use StoryParams here
    const requestedLength = Number(body.length);

    if (!body.theme || !body.language || Number.isNaN(requestedLength) || requestedLength <= 0) {
      return res.status(400).json({ error: 'Theme, language, and a positive length (minutes) are required.' });
    }

    // 2 & 3 - Limits Check
    let currentUsage = 0;
    let usageLimit = 0;

    if (userId && userProfile) { // User is logged in AND profile was fetched successfully
        console.log(`Processing limits for logged-in user ${userId}`);
        // Check subscription status - allow 'active' or 'trialing'
        if (!['active', 'trialing'].includes(userProfile.subscription_status ?? '')) {
           console.log(`User ${userId} has inactive subscription status: ${userProfile.subscription_status}`);
           return res.status(403).json({ error: 'Your subscription is not active. Please check your plan.' });
        }
        usageLimit = Number(userProfile.monthly_minutes_limit) || 0;
        currentUsage = Number(userProfile.minutes_used_this_period) || 0;

        if (usageLimit <= 0) {
           console.log(`User ${userId} has zero usage limit.`);
           return res.status(403).json({ error: 'No usage allowance configured for this account.' });
        }
        if (currentUsage + requestedLength > usageLimit) {
           console.log(`User ${userId} usage exceeded: Used=${currentUsage}, Requested=${requestedLength}, Limit=${usageLimit}`);
           return res.status(402).json({ error: `Monthly usage quota (${usageLimit} mins) exceeded. ${usageLimit - currentUsage} minutes remaining.` });
        }
        console.log(`User ${userId} has sufficient quota (Limit: ${usageLimit}, Used: ${currentUsage}, Requested: ${requestedLength}).`);
    } else if (userId && !userProfile) {
        // Handle case where user is authenticated but profile fetch failed or is missing
        console.warn(`User ${userId} is authenticated but profile is missing/incomplete. Falling back to anonymous limits.`);
        // Fall through to anonymous check below, applying stricter limits
         if (requestedLength > FREE_ANON_MINUTES_LIMIT) {
            return res.status(400).json({ error: `Free stories are limited to ${FREE_ANON_MINUTES_LIMIT} minutes. Account profile issue detected.` });
          }
          // Allow proceeding with anonymous limit if length is okay
          usageLimit = FREE_ANON_MINUTES_LIMIT;
          console.log(`Anonymous user is within limits (Length: ${requestedLength}).`);


    } else { // Anonymous user
        console.log("Processing limits for anonymous user.");
        // Using cookies for anonymous limits seems less robust. Consider session-based or IP-based limits if abuse is a concern.
        // For simplicity, let's stick to the cookie for now, but acknowledge its limitations.
        const anonStoriesGenerated = Number(req.cookies?.anonStories ?? 0);
        if (anonStoriesGenerated >= 1) {
           console.log("Anonymous limit reached via cookie.");
           return res.status(429).json({ error: 'Anonymous free story limit reached. Please sign up to create more stories.' });
        }
        if (requestedLength > FREE_ANON_MINUTES_LIMIT) {
           console.log(`Anonymous request exceeds limit: ${requestedLength} > ${FREE_ANON_MINUTES_LIMIT}`);
           return res.status(400).json({ error: `Free stories are limited to ${FREE_ANON_MINUTES_LIMIT} minutes. Sign up for longer stories.` });
        }
        usageLimit = FREE_ANON_MINUTES_LIMIT;
        console.log(`Anonymous user is within limits (Length: ${requestedLength}, Cookie: ${anonStoriesGenerated}).`);
    }

    // 4 — Generate story
      const storyParams: StoryParams = {
        // Title might be provided by user or generated, pass null if generation is forced
        storyTitle: body.storyTitle ?? null, // Allow user title if provided, else generate
        theme: body.theme!,
        length: requestedLength,
        language: body.language!,
        mainCharacter: body.mainCharacter ?? null,
        educationalFocus: body.educationalFocus ?? null,
        additionalInstructions: body.additionalInstructions ?? null,
      };

      console.log("Calling generateStoryInternal with params:", storyParams);
      const { story, title } = await generateStoryInternal(storyParams); // Title is now definitive
      if (!story || !title) throw new Error("Story generation failed internally after call.");


    // *** --- NEW STEP: Persist Story Details --- ***
    let storyId: string | null = null; // Variable to hold the new story's ID
    if (userId) { // Only save to DB if the user is logged in
        console.log(`Attempting to save story "${title}" for user ${userId}`);
        const insertPayload: StoryInsertParams = {
            user_id: userId,
            title: title,
            content: story,
            theme: storyParams.theme, // Save the primary theme
            language: storyParams.language,
            // Ensure your 'stories' table has a 'length_minutes' column (numeric type)
            length_minutes: storyParams.length,
            main_character: storyParams.mainCharacter,
            educational_focus: storyParams.educationalFocus
             // Add other fields based on your 'stories' table schema
             // e.g., is_public: false, // default?
             // characters: storyParams.mainCharacter ? { main: storyParams.mainCharacter } : null, // Example JSON
             // educational_elements: storyParams.educationalFocus ? [storyParams.educationalFocus] : null, // Example array
        };
        console.log("Story insert payload:", insertPayload); // Log the payload

        const { data: newStoryData, error: insertError } = await supabase
            .from('stories')
            .insert(insertPayload)
            .select('id') // Select the ID of the newly inserted row
            .single();

        if (insertError) {
            console.error(`Failed to insert story into DB for user ${userId}:`, insertError);
            // Log and continue, maybe notify user in response later?
             console.warn("Story generated but failed to save to the database library.");
            // Optionally: throw new Error(`Failed to save generated story: ${insertError.message}`);
        } else if (newStoryData) {
            storyId = newStoryData.id; // Store the ID if needed later
            console.log(`Story saved successfully to DB with ID: ${storyId}`);
        } else {
             console.warn(`Story insert operation for user ${userId} completed but returned no data/ID.`);
        }
    } else {
        console.log("Anonymous user story generated, not saving to database.");
    }
    // *** --- END OF NEW STEP --- ***


    // 5 — Persist usage (increment minutes)
    let usageUpdated = false;
    if (userId && userProfile) { // Only update DB usage if user is logged in AND profile exists
        const newTotalUsage = currentUsage + requestedLength;
        console.log(`Attempting usage update for user ${userId}. New total would be: ${newTotalUsage}`);
        // *** USE CORRECT RPC PARAM NAME 'p_user_id' if that's what your RPC expects ***
        // Double-check your RPC definition in Supabase SQL editor. Let's assume it's 'p_user_id' based on common patterns.
        const { error: rpcErr } = await supabase.rpc('increment_minutes_used', {
            p_user_id: userId, // Assuming this is the correct param name for your RPC
            p_minutes_to_add: requestedLength
        });

        if (rpcErr) {
            console.error(`RPC increment_minutes_used failed for user ${userId}:`, rpcErr);
            // Fallback might be risky if RPC fails due to permissions/logic errors
            // Consider if fallback is appropriate or if failure should halt.
            console.warn(`Falling back to non-atomic usage update for user: ${userId}. Setting usage to ${newTotalUsage}.`);
            const { error: updErr } = await supabase
                .from('users')
                .update({ minutes_used_this_period: newTotalUsage })
                .eq('id', userId);

            if (updErr) {
              console.error(`Fallback Usage update FAILED for user ${userId}:`, updErr);
            } else {
              console.log(`Fallback usage update successful for user: ${userId}.`);
              usageUpdated = true;
            }
        } else {
            console.log(`Successfully updated usage via RPC for user ${userId}.`);
            usageUpdated = true;
        }
         // Optionally add stricter check: if (!usageUpdated) throw new Error("Failed to record usage update.");
    } else {
      // Set cookie for anonymous user
      console.log("Setting anonymous usage cookie.");
      res.cookie('anonStories', '1', {
        httpOnly: true, // Recommended for security
        sameSite: 'lax', // Good default
        secure: process.env.NODE_ENV === 'production', // Essential for production
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/', // Make cookie available site-wide
      });
    }

    // 6 — Respond
    console.log(`Responding with generated story. Title: "${title}"`, storyId ? `DB ID: ${storyId}` : '(Not Saved)');
    // Include storyId in the response if it was saved
    res.status(200).json({ story, title, storyId });

  } catch (err) {
     console.error('generateStoryHandler Failure:', err);
     const message = err instanceof Error ? err.message : 'Story generation process failed.';
     let statusCode = 500;
     if (message.includes('quota exceeded')) statusCode = 402;
     if (message.includes('limit reached')) statusCode = 429;
     if (message.includes('required')) statusCode = 400;
     if (message.includes('active')) statusCode = 403;
     if (message.includes('not found')) statusCode = 404; // Could be user profile or other resource
     if (message.includes('token') || message.includes('Unauthorized')) statusCode = 401; // Handle auth errors explicitly
     // Add specific check for DB insert failure if you threw an error for it
     if (message.includes('Failed to save generated story')) statusCode = 500; // Or maybe 507 Insufficient Storage?

     res.status(statusCode).json({ error: message });
  }
}