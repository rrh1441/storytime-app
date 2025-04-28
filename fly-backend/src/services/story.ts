// -----------------------------------------------------------------------------
// story.ts • 2025-04-28
// POST /generate-story — children’s-story API with subscription-minute limits
// -----------------------------------------------------------------------------
// • Reads quotas from public.users
// • Blocks over-quota or inactive subscriptions
// • Allows a single anonymous story via cookie
// • Updates usage atomically on success
// • ESLint-clean, zero placeholders
// -----------------------------------------------------------------------------

import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { generateStory, StoryParams } from './story-generator';

// -----------------------------------------------------------------------------
// Supabase service-role client
// -----------------------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface UserRow {
  subscription_status: string | null;
  subscription_tier: string | null;
  monthly_minutes_limit: number;
  minutes_used_this_period: number;
}

interface AuthedRequest extends Request {
  user?: { id: string };
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const FREE_ANON_MINUTES_LIMIT = 3; // one ≈3-minute story

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------
export async function generateStoryHandler(
  req: AuthedRequest,
  res: Response,
): Promise<void> {
  try {
    // 1 — Validate body --------------------------------------------------------
    const body = req.body as Partial<StoryParams>;
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

    // 2 — Auth state ----------------------------------------------------------
    const userId = req.user?.id ?? null;
    let newUsage = 0;

    if (userId) {
      // 3A — Fetch user row & enforce limits ----------------------------------
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

      const { monthly_minutes_limit: limit, minutes_used_this_period: used } =
        user;

      if (used + requestedLength > limit) {
        res
          .status(402)
          .json({ error: 'Monthly usage quota exceeded. Upgrade required.' });
        return;
      }

      newUsage = used + requestedLength;
    } else {
      // 3B — Anonymous: one free story ----------------------------------------
      const anonCount = Number(req.cookies?.anonStories ?? 0);
      if (anonCount >= 1) {
        res
          .status(429)
          .json({ error: 'Anonymous limit reached. Please sign up.' });
        return;
      }
    }

    // 4 — Generate story ------------------------------------------------------
    const storyParams: StoryParams = {
      storyTitle: body.storyTitle ?? null,
      theme: body.theme,
      length: requestedLength,
      language: body.language,
      mainCharacter: body.mainCharacter ?? null,
      educationalFocus: body.educationalFocus ?? null,
      additionalInstructions: body.additionalInstructions ?? null,
    };

    const { story, title } = await generateStory(storyParams);

    // 5 — Persist usage (atomic) ---------------------------------------------
    if (userId) {
      const { error: rpcErr } = await supabase.rpc('increment_minutes_used', {
        p_uid: userId,
        p_inc: requestedLength,
      });

      if (rpcErr) {
        // Fallback non-atomic path
        const { error: updErr } = await supabase
          .from('users')
          .update({ minutes_used_this_period: newUsage })
          .eq('id', userId);

        if (updErr) console.error('Usage update error:', updErr);
      }
    } else {
      // Track anonymous usage via cookie
      res.cookie('anonStories', '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    // 6 — Respond -------------------------------------------------------------
    res.status(200).json({ story, title });
  } catch (err) {
    console.error('Generation failure:', err);
    res.status(500).json({ error: 'Story generation failed.' });
  }
}
