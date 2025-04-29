// fly-backend/src/services/story.ts
// FINAL VERSION: Includes explicit auth check, correct RPC param name, dynamic length, and combined logic.

import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai'; // Ensure OpenAI is installed (`npm install openai`)

// --- Supabase Client Setup ---
// Using service role key for backend operations like usage updates
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
    storyTitle: string | null;
    theme: string;
    length: number; // In minutes
    language: string;
    mainCharacter: string | null;
    educationalFocus: string | null;
    additionalInstructions: string | null;
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
          console.error(`User profile not found in DB for verified user ${userId}.`);
          return res.status(404).json({ error: 'User profile not found.' });
        }
        userProfile = fetchedProfile;
        console.log(`User profile fetched: Status=${userProfile.subscription_status}, Limit=${userProfile.monthly_minutes_limit}`);
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
    const body = req.body as Partial<Omit<StoryParams, 'storyTitle'>>; // Omit storyTitle as we generate it
    const requestedLength = Number(body.length);

    if (!body.theme || !body.language || Number.isNaN(requestedLength) || requestedLength <= 0) {
      return res.status(400).json({ error: 'Theme, language, and a positive length (minutes) are required.' });
    }

    // 2 & 3 - Limits Check
    let currentUsage = 0;
    let usageLimit = 0;

    if (userId && userProfile) { // User is logged in and profile fetched
       console.log(`Processing limits for logged-in user ${userId}`);
       if (!['active', 'trialing'].includes(userProfile.subscription_status ?? '')) {
         return res.status(403).json({ error: 'Subscription is not active.' });
       }
       usageLimit = Number(userProfile.monthly_minutes_limit) || 0;
       currentUsage = Number(userProfile.minutes_used_this_period) || 0;

       if (usageLimit <= 0) {
         return res.status(403).json({ error: 'No usage allowance for this account.' });
       }
       if (currentUsage + requestedLength > usageLimit) {
         return res.status(402).json({ error: `Monthly usage quota (${usageLimit} mins) exceeded.` });
       }
       console.log(`User ${userId} has sufficient quota (Limit: ${usageLimit}, Used: ${currentUsage}, Requested: ${requestedLength}).`);
    } else { // Anonymous user
       console.log("Processing limits for anonymous user.");
       const anonStoriesGenerated = Number(req.cookies?.anonStories ?? 0);
       if (anonStoriesGenerated >= 1) {
         return res.status(429).json({ error: 'Anonymous free story limit reached.' });
       }
       if (requestedLength > FREE_ANON_MINUTES_LIMIT) {
         // This is the error you saw when logged in but treated as anonymous
         return res.status(400).json({ error: `Free stories are limited to ${FREE_ANON_MINUTES_LIMIT} minutes. Sign up for longer stories.` });
       }
       usageLimit = FREE_ANON_MINUTES_LIMIT;
       console.log(`Anonymous user is within limits (Length: ${requestedLength}, Cookie: ${anonStoriesGenerated}).`);
    }

    // 4 — Generate story
     const storyParams: StoryParams = {
       storyTitle: null, // Force generation
       theme: body.theme!,
       length: requestedLength,
       language: body.language!,
       mainCharacter: body.mainCharacter ?? null,
       educationalFocus: body.educationalFocus ?? null,
       additionalInstructions: body.additionalInstructions ?? null,
     };

     console.log("Calling generateStoryInternal with params:", storyParams);
     const { story, title } = await generateStoryInternal(storyParams);
     if (!story || !title) throw new Error("Story generation failed internally after call.");

    // 5 — Persist usage
    let usageUpdated = false;
    if (userId && userProfile) { // Only update DB for logged-in users
         const newTotalUsage = currentUsage + requestedLength;
         console.log(`Attempting usage update for user ${userId}. New total would be: ${newTotalUsage}`);
         // *** USE CORRECT RPC PARAM NAME 'p_uid' ***
         const { error: rpcErr } = await supabase.rpc('increment_minutes_used', {
           p_uid: userId,
           p_minutes_to_add: requestedLength
         });

         if (rpcErr) {
           console.error(`RPC increment_minutes_used failed for user ${userId}:`, rpcErr);
           console.warn(`Falling back to non-atomic usage update for user: ${userId}. Setting usage to ${newTotalUsage}.`);
           const { error: updErr } = await supabase
             .from('users')
             .update({ minutes_used_this_period: newTotalUsage })
             .eq('id', userId);

           if (updErr) console.error(`Fallback Usage update FAILED for user ${userId}:`, updErr);
           else { console.log(`Fallback usage update successful for user: ${userId}.`); usageUpdated = true; }
         } else {
           console.log(`Successfully updated usage via RPC for user ${userId}.`);
           usageUpdated = true;
         }
         // if (!usageUpdated) { throw new Error("Failed to record usage update after story generation."); } // Optional strict check
    } else {
       // Set cookie for anonymous user
       console.log("Setting anonymous usage cookie.");
       res.cookie('anonStories', '1', {
          httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000, path: '/',
       });
    }

    // 6 — Respond
    console.log(`Responding with generated story. Title: "${title}"`);
    res.status(200).json({ story, title });

  } catch (err) {
     console.error('generateStoryHandler Failure:', err);
     const message = err instanceof Error ? err.message : 'Story generation process failed.';
     let statusCode = 500;
     if (message.includes('quota exceeded')) statusCode = 402;
     if (message.includes('limit reached')) statusCode = 429;
     if (message.includes('required')) statusCode = 400;
     if (message.includes('active')) statusCode = 403;
     if (message.includes('not found')) statusCode = 404;
     if (message.includes('token')) statusCode = 401;
     res.status(statusCode).json({ error: message });
  }
}