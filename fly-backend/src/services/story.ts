// fly-backend/src/services/story.ts
// Combines handler and generator logic, fixes length issue, maintains usage logic.

import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai'; // Added OpenAI import

// --- Supabase Client Setup ---
// Using service role key for backend operations like usage updates
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// --- OpenAI Client Setup ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Ensure OPENAI_API_KEY is set in Fly.io secrets
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"; // Or your preferred model

// --- Interfaces ---
// Interface for parameters passed *into* generateStory
interface StoryParams {
    storyTitle: string | null; // Allow potential future use, though we force null now
    theme: string;
    length: number; // In minutes
    language: string;
    mainCharacter: string | null;
    educationalFocus: string | null;
    additionalInstructions: string | null;
}

// Interface for the user data fetched from Supabase
interface UserRow {
  subscription_status: string | null;
  // subscription_tier: string | null; // This wasn't selected or used in the original handler
  monthly_minutes_limit: number | null; // Allow null for safety
  minutes_used_this_period: number;
}

// Interface for Express request with potential user info from auth middleware
interface AuthedRequest extends Request {
  user?: { id: string };
  // Include cookies if your auth middleware adds them, otherwise access via req.cookies
  // cookies?: { [key: string]: string };
}

// --- Constants ---
const FREE_ANON_MINUTES_LIMIT = 3; // Max length for anonymous users

// --- Helper Function ---
/**
 * Estimates target word count based on requested minutes.
 * @param minutes - The desired story length in minutes.
 * @returns Estimated word count.
 */
function estimateWordCount(minutes: number): number {
    const wordsPerMinute = 130; // Average reading speed, adjust as needed
    const minWords = 150;       // Minimum length to avoid overly short stories
    const maxWords = wordsPerMinute * 75; // ~ Max length (e.g., 60 mins + buffer)
    const calculatedWords = Math.round(minutes * wordsPerMinute);
    return Math.max(minWords, Math.min(calculatedWords, maxWords));
}


// --- Story Generation Logic (Internal Function) ---
/**
 * Generates the story content and title using OpenAI.
 * @param params - Story parameters including theme, length, language, etc.
 * @returns Promise<{ story: string; title: string }>
 */
async function generateStoryInternal(params: StoryParams): Promise<{ story: string; title: string }> {
    const { storyTitle, theme = "adventure",
    language = "English",
    mainCharacter, educationalFocus, additionalInstructions,
    length // <<< We will now use this!
     } = params;

    // --- Calculate Target Word Count ---
    const targetWordCount = estimateWordCount(length);

    // --- Prompt Construction ---
    const characterDesc = mainCharacter ? ` The main character is named ${mainCharacter}.` : " The story features a child protagonist.";
    const eduFocus = educationalFocus ? ` Subtly incorporate the theme of ${educationalFocus}.` : "";
    const addInstr = additionalInstructions ? ` Additional user requests: ${additionalInstructions}` : "";
    const TITLE_MARKER = "Generated Title: "; // Marker for title extraction

    // *** MODIFIED PROMPT TO USE DYNAMIC LENGTH ***
    const prompt = `Write **in ${language}** a children's story suitable for young children.
The story should have a theme of ${theme}.${characterDesc}
The target length is approximately ${targetWordCount} words (which is about ${length} minutes when read aloud). Adjust the story complexity and detail accordingly.${eduFocus}${addInstr}
Ensure the story ends on a positive note and is formatted using Markdown paragraphs (use line breaks between paragraphs).

After the story, output a creative title **in ${language}** on a separate line starting with '${TITLE_MARKER}'. Do not include anything else after the title line.`;
    // *** END MODIFIED PROMPT ***

    console.log(`[generateStoryInternal] Generating story. Target: ${length} mins (~${targetWordCount} words). Lang: ${language}. Theme: ${theme}`);

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            // max_tokens: Math.round(targetWordCount * 1.8), // Optional: Add buffer based on target
            temperature: 0.7,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        if (!raw) {
            console.error("[generateStoryInternal] OpenAI response was empty.");
            throw new Error("AI generation returned an empty response.");
        }

        // --- Story and Title Extraction ---
         let story = raw.trim();
         let title = storyTitle?.trim() || ""; // Use user-provided title first

         const titleMarkerIndex = raw.lastIndexOf(`\n${TITLE_MARKER}`);

         if (titleMarkerIndex !== -1) {
             const extractedTitle = raw.slice(titleMarkerIndex + TITLE_MARKER.length + 1).trim();
             // Only use generated title if user didn't provide one OR if it was forced null
             if (!title || storyTitle === null) {
                 title = extractedTitle;
             }
             story = raw.slice(0, titleMarkerIndex).trim();
         } else if (!title || storyTitle === null) {
             // Fallback if marker is missing AND no user title/forced null
             console.warn("[generateStoryInternal] Title marker not found. Using basic fallback title.");
             title = language === "English" ? `A Story About ${theme}` : `Story about ${theme}`; // Basic fallback
             // story remains raw in this specific fallback case
         }

         // Optional cleanup
         story = story.replace(/^#\s+/, ''); // Remove leading markdown H1 if present

         if (!story) {
            console.error("[generateStoryInternal] Processed story content is empty.");
            throw new Error("Failed to extract story content from AI response.");
         }
         if (!title) { // Ensure title isn't empty after processing
             console.warn("[generateStoryInternal] Processed title is empty. Using basic fallback.");
             title = `A Story About ${theme}`;
         }

        console.log(`[generateStoryInternal] Generated Title: "${title}", Story Word Count: ${story.split(/\s+/).length}`);
        return { story, title };
    }
    catch (error) {
        console.error("Error generating story from OpenAI:", error);
        throw new Error(`Failed to generate story via AI. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}


// --- Express Route Handler ---
/**
 * Handles the POST /generate-story request.
 */
export async function generateStoryHandler(
  req: AuthedRequest, // Use AuthedRequest which might have user object
  res: Response,
): Promise<void> {
  try {
    // 1 — Validate body --------------------------------------------------------
    // Use StoryParams directly for validation, assuming frontend sends all relevant fields
    const body = req.body as Partial<StoryParams>;
    const requestedLength = Number(body.length); // Expecting minutes

    // Basic validation
    if (
      !body.theme ||
      !body.language ||
      Number.isNaN(requestedLength) ||
      requestedLength <= 0
    ) {
      console.log("Validation failed:", { theme: body.theme, language: body.language, length: body.length });
      res.status(400).json({ error: 'Theme, language, and a positive length (minutes) are required.' });
      return;
    }

    // 2 — Auth state & 3 - Limits Check ---------------------------------------
    // Assume auth middleware (if used) adds user to req.user
    // If not using middleware, you'd need to get JWT from header and verify:
    // const authHeader = req.headers.authorization;
    // const token = authHeader?.split(' ')[1];
    // const { data: { user: verifiedUser }, error: authError } = token ? await supabase.auth.getUser(token) : { data: { user: null }, error: null };
    // const userId = verifiedUser?.id ?? null; // Use verifiedUser if checking manually

    // This assumes some prior middleware sets req.user
    const userId = req.user?.id ?? null;
    let currentUsage = 0;
    let usageLimit = FREE_ANON_MINUTES_LIMIT; // Default limit

    console.log(`Request received. UserID: ${userId ?? 'Anonymous'}. Requested Length: ${requestedLength} mins.`);

    if (userId) {
      // 3A — Fetch user row & enforce limits for logged-in user
      console.log(`Workspaceing user profile for ${userId}`);
      const { data: userProfile, error: fetchErr } = await supabase
        .from('users') // Use the correct table name 'users'
        .select('subscription_status, monthly_minutes_limit, minutes_used_this_period')
        .eq('id', userId)
        .single<UserRow>(); // Type assertion

      if (fetchErr) {
          // If error is "PGRST116" (Not Found), treat as internal error unless specifically handled
          console.error(`User profile fetch error for ${userId}:`, fetchErr);
          res.status(500).json({ error: 'Could not retrieve user data.' });
          return;
      }

      if (!userProfile) {
         console.error(`User profile not found for ${userId}.`);
         res.status(404).json({ error: 'User profile not found.' });
         return;
      }

      console.log(`User profile fetched for ${userId}: Status=${userProfile.subscription_status}, Limit=${userProfile.monthly_minutes_limit}, Used=${userProfile.minutes_used_this_period}`);

      // Check subscription status
      if (!['active', 'trialing'].includes(userProfile.subscription_status ?? '')) {
        console.log(`User ${userId} has inactive subscription status: ${userProfile.subscription_status}`);
        res.status(403).json({ error: 'Subscription is not active.' });
        return;
      }

      // Determine usage limit
      usageLimit = Number(userProfile.monthly_minutes_limit) || 0; // Use DB limit, default to 0 if null/invalid
      currentUsage = Number(userProfile.minutes_used_this_period) || 0;

      console.log(`User ${userId}: Limit=${usageLimit}, CurrentUsage=${currentUsage}, Requested=${requestedLength}`);

      if (usageLimit <= 0) {
          console.log(`User ${userId} has zero or negative usage limit.`);
          // Decide if this is an error or just means no usage allowed
          res.status(403).json({ error: 'No usage allowance configured for this account.' });
          return;
      }

      if (currentUsage + requestedLength > usageLimit) {
        console.log(`User ${userId} exceeded quota. Used: ${currentUsage}, Requested: ${requestedLength}, Limit: ${usageLimit}`);
        res.status(402).json({ error: `Monthly usage quota (${usageLimit} mins) exceeded. Requires upgrade or wait until next cycle.` });
        return;
      }
    } else {
      // 3B — Anonymous user limits
      // Using cookies to track anonymous usage (ensure cookie-parser middleware is used in index.ts if needed)
       const anonStoriesGenerated = Number(req.cookies?.anonStories ?? 0);
       console.log(`Anonymous user check. Stories generated via cookie: ${anonStoriesGenerated}`);

      // Limit anonymous users to ONE story generation attempt tracked via cookie
       if (anonStoriesGenerated >= 1) {
         console.log("Anonymous limit reached.");
         res.status(429).json({ error: 'Anonymous free story limit reached. Please sign up to create more.' });
         return;
       }

       // Enforce max length for anonymous users
       if (requestedLength > FREE_ANON_MINUTES_LIMIT) {
           console.log(`Anonymous request exceeds length limit: ${requestedLength} > ${FREE_ANON_MINUTES_LIMIT}`);
           res.status(400).json({ error: `Free stories are limited to ${FREE_ANON_MINUTES_LIMIT} minutes. Sign up for longer stories.` });
           return;
       }
       // Note: No usage limit check needed here beyond the length limit and 1 story count
       usageLimit = FREE_ANON_MINUTES_LIMIT; // Not strictly needed but sets context
    }

    // 4 — Generate story ------------------------------------------------------
    const storyParams: StoryParams = {
      storyTitle: null, // Force title generation by AI
      theme: body.theme!, // Already validated
      length: requestedLength, // Pass the validated requested length
      language: body.language!, // Already validated
      mainCharacter: body.mainCharacter ?? null,
      educationalFocus: body.educationalFocus ?? null,
      additionalInstructions: body.additionalInstructions ?? null,
    };

    // Call the *internal* generation function
    const { story, title } = await generateStoryInternal(storyParams);

    // Check if story or title generation actually failed inside generateStoryInternal
    if (!story || !title) {
        // Error should have been thrown by generateStoryInternal, but double-check
        console.error("Story generation returned empty story or title unexpectedly.");
        throw new Error("Story generation failed internally.");
    }

    // 5 — Persist usage (atomic if possible) ----------------------------------
    let usageUpdated = false; // Flag to track if update succeeded

    if (userId) {
      console.log(`Attempting to increment usage for user ${userId} by ${requestedLength} minutes.`);
      const newTotalUsage = currentUsage + requestedLength; // Calculate the new total

      // Attempt atomic increment via RPC
      const { error: rpcErr } = await supabase.rpc('increment_minutes_used', {
        p_user_id: userId,           // Verify this param name matches your SQL function
        p_minutes_to_add: requestedLength // Verify this param name
      });

      if (rpcErr) {
        console.error(`RPC increment_minutes_used failed for user ${userId}:`, rpcErr);
        // Fallback to non-atomic update
        console.warn(`Falling back to non-atomic usage update for user: ${userId}. Attempting to set usage to ${newTotalUsage}.`);
        const { error: updErr } = await supabase
          .from('users')
          .update({ minutes_used_this_period: newTotalUsage }) // Update with the calculated total
          .eq('id', userId);

        if (updErr) {
          console.error(`Fallback Usage update FAILED for user ${userId}:`, updErr);
          // Critical error: Story generated, usage not recorded. Log for manual intervention.
          // Maybe return a specific error/warning to the frontend?
        } else {
          console.log(`Fallback usage update successful for user: ${userId}. Usage set to ${newTotalUsage}.`);
          usageUpdated = true;
        }
      } else {
        console.log(`Successfully updated usage via RPC for user ${userId}, added ${requestedLength} minutes.`);
        usageUpdated = true;
      }

      // Optional: Check if usageUpdated is true. If not, maybe don't return success 200?
      // This depends on how critical recording usage is vs. giving the user the story.
      // For now, we proceed even if usage update fails, but log the errors heavily.

    } else {
      // Track anonymous usage via cookie for non-logged-in users
      console.log("Setting anonymous usage cookie.");
      res.cookie('anonStories', '1', { // Set cookie value to '1' indicating one story used
        httpOnly: true,
        sameSite: 'lax', // 'strict' might be too restrictive if redirects happen
        secure: process.env.NODE_ENV === 'production', // Use secure flag in production
        maxAge: 30 * 24 * 60 * 60 * 1000, // Cookie persists for 30 days
        path: '/', // Make cookie available across the site
      });
      // No server-side usage update needed for anonymous
      usageUpdated = true; // Consider cookie setting as successful usage 'tracking'
    }

    // 6 — Respond -------------------------------------------------------------
    console.log(`Responding with generated story. Title: "${title}"`);
    res.status(200).json({ story, title });

  } catch (err) {
    // Catch all errors from validation, limits check, generation, or usage update attempt
    console.error('generateStoryHandler Failure:', err);
    const message = err instanceof Error ? err.message : 'Story generation process failed.';
    // Determine status code based on error message content if possible
    let statusCode = 500;
    if (message.includes('quota exceeded')) statusCode = 402;
    if (message.includes('limit reached')) statusCode = 429;
    if (message.includes('required')) statusCode = 400;
    if (message.includes('not active')) statusCode = 403;
    if (message.includes('not found')) statusCode = 404;

    res.status(statusCode).json({ error: message });
  }
}