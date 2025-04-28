// fly-backend/src/services/story.ts

import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
// Assuming generateStory is correctly imported and handles title generation when storyTitle is null/undefined
import { generateStory, StoryParams } from './story-generator';

// ... Supabase client setup remains the same ...
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);


// ... Interface definitions remain the same ...
interface UserRow {
  subscription_status: string | null;
  subscription_tier: string | null;
  monthly_minutes_limit: number;
  minutes_used_this_period: number;
}

interface AuthedRequest extends Request {
  user?: { id: string };
}

// ... Constants remain the same ...
const FREE_ANON_MINUTES_LIMIT = 3;

export async function generateStoryHandler(
  req: AuthedRequest,
  res: Response,
): Promise<void> {
  try {
    // 1 — Validate body --------------------------------------------------------
    // REMOVED: storyTitle from validation/destructuring if it was ever used here directly
    const body = req.body as Partial<Omit<StoryParams, 'storyTitle'>>; // Use Omit if storyTitle was part of StoryParams for input
    const requestedLength = Number(body.length);

    if (
      !body.theme ||
      !body.language ||
      Number.isNaN(requestedLength) ||
      requestedLength <= 0
    ) {
      res
        .status(400)
        .json({ error: 'theme, language, and positive length are required.' });
      return;
    }

    // 2 — Auth state & 3 - Limits Check ---------------------------------------
    // ... (This logic remains the same) ...
     const userId = req.user?.id ?? null;
     let newUsage = 0;

     if (userId) {
       // 3A — Fetch user row & enforce limits
       const { data: user, error: fetchErr } = await supabase
         .from<UserRow>('users')
         .select(
           'subscription_status, subscription_tier, monthly_minutes_limit, minutes_used_this_period',
         )
         .eq('id', userId)
         .single();

       if (fetchErr || !user) {
         console.error('User fetch error:', fetchErr);
         res.status(500).json({ error: 'Internal server error.' });
         return;
       }

       if (!['active', 'trialing'].includes(user.subscription_status ?? '')) {
         res.status(403).json({ error: 'Inactive subscription.' });
         return;
       }

       const { monthly_minutes_limit: limit, minutes_used_this_period: used } = user;

        // Ensure the types match for comparison, casting if needed (though TS should help)
       const currentUsage = Number(used) || 0;
       const requested = Number(requestedLength) || 0;

       if (currentUsage + requested > limit) {
         res
           .status(402)
           .json({ error: 'Monthly usage quota exceeded. Upgrade required.' });
         return;
       }

       newUsage = currentUsage + requested; // Update newUsage based on potentially casted numbers
     } else {
       // 3B — Anonymous: one free story
       const anonCount = Number(req.cookies?.anonStories ?? 0);
       if (anonCount >= 1) {
         res
           .status(429)
           .json({ error: 'Anonymous limit reached. Please sign up.' });
         return;
       }
       // Note: Length limit for anon users might need separate check if different from logged-in
       if(requestedLength > FREE_ANON_MINUTES_LIMIT) {
           res.status(400).json({ error: `Free stories are limited to ${FREE_ANON_MINUTES_LIMIT} minutes.`});
           return;
       }
     }


    // 4 — Generate story ------------------------------------------------------
    // MODIFIED: Explicitly set storyTitle to null or omit it
    const storyParams: StoryParams = {
      storyTitle: null, // Force null/omit to ensure title is generated
      theme: body.theme,
      length: requestedLength,
      language: body.language,
      mainCharacter: body.mainCharacter ?? null,
      educationalFocus: body.educationalFocus ?? null,
      additionalInstructions: body.additionalInstructions ?? null,
    };

    // Assuming the imported generateStory handles title generation when storyTitle is null/undefined
    console.log("Calling generateStory with params:", storyParams);
    const { story, title } = await generateStory(storyParams); // Expect 'title' back
    console.log("generateStory returned:", { storyLength: story?.length, title });


    // 5 — Persist usage (atomic) ---------------------------------------------
    // ... (This logic remains the same) ...
     if (userId) {
       // Check if increment_minutes_used RPC function exists and handles potential errors
       const { error: rpcErr } = await supabase.rpc('increment_minutes_used', {
         p_user_id: userId, // Ensure parameter name matches your RPC function definition
         p_minutes_to_add: requestedLength, // Ensure parameter name matches
       });

       if (rpcErr) {
           console.error('RPC increment_minutes_used error:', rpcErr);
           // Fallback non-atomic path (consider logging this failure rate)
           console.warn('Falling back to non-atomic usage update for user:', userId);
           const { error: updErr } = await supabase
               .from('users')
               .update({ minutes_used_this_period: newUsage })
               .eq('id', userId);

           if (updErr) {
               console.error('Fallback Usage update error:', updErr);
               // If even fallback fails, the generation succeeded but usage wasn't recorded! Critical issue.
               // Maybe return an error to the user or log specifically for manual correction?
               // For now, just log the error.
           } else {
               console.log('Fallback usage update successful for user:', userId);
           }
       } else {
            console.log(`Successfully updated usage via RPC for user ${userId}, added ${requestedLength} minutes.`);
       }
     } else {
       // Track anonymous usage via cookie
       res.cookie('anonStories', '1', {
         httpOnly: true,
         sameSite: 'lax',
         secure: process.env.NODE_ENV === 'production',
         maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
       });
        console.log("Set anonymous usage cookie.");
     }


    // 6 — Respond -------------------------------------------------------------
    // Ensure title is not null/empty before sending back
    if (!title || title.trim() === "") {
        console.warn("Generated title was empty, providing fallback.");
        // Consider a more specific fallback if possible
        const fallbackTitle = `A Story about ${body.theme}`;
        res.status(200).json({ story, title: fallbackTitle });
    } else {
        res.status(200).json({ story, title });
    }

  } catch (err) {
    console.error('generateStoryHandler Failure:', err);
    const message = err instanceof Error ? err.message : 'Story generation failed.';
    res.status(500).json({ error: message });
  }
}

// NOTE: You might need to adjust the imported `generateStory` function in
// `./story-generator` to ensure it reliably generates a title when
// `storyParams.storyTitle` is null or undefined.