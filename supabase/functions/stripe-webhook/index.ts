// supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@^2.40.0';
import Stripe from 'npm:stripe@^15.0.0';

// Define the structure of the user record we'll be updating
// Adjust based on your actual 'users' table columns
interface UserProfileUpdate {
  stripe_customer_id?: string | null;
  subscription_status?: string | null; // e.g., 'active', 'canceled', 'past_due'
  active_plan_price_id?: string | null;
  subscription_current_period_end?: string | null; // ISO string date
  story_credits?: number; // Use 'increment' for atomic updates if possible
}

// Get secrets from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key!
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !stripeWebhookSecret) {
  console.error('Webhook: Missing required environment variables.');
}

const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase Admin Client (uses Service Role Key)
// We need admin privileges to update any user's record based on webhook data
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl!, supabaseServiceKey!);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Not strictly needed for Stripe webhooks but good practice for OPTIONS
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping Price IDs to Credit Amounts
const PLAN_CREDITS: Record<string, number> = {
    'price_1R88J5KSaqiJUYkjbH0R39VO': 10,  // Story Starter
    'price_1R9u5HKSaqiJUYkjnXkKiJkS': 100, // Story Pro
    // Add test price IDs if needed
};

console.log("stripe-webhook function initialized.");

serve(async (req) => {
   // Handle CORS preflight request
   if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request for webhook");
    return new Response('ok', { headers: corsHeaders });
   }
   if (req.method !== 'POST') {
     console.log(`Webhook: Unsupported method: ${req.method}`);
     return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
   }

  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text(); // Read raw body for verification

  if (!signature) {
    console.error("Webhook Error: Missing Stripe-Signature header.");
    return new Response(JSON.stringify({ error: 'Missing Stripe signature.' }), { status: 400 });
  }
  if (!stripeWebhookSecret) {
     console.error("Webhook Error: Missing STRIPE_WEBHOOK_SECRET environment variable.");
     return new Response(JSON.stringify({ error: 'Webhook secret not configured.' }), { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      stripeWebhookSecret
    );
    console.log(`Webhook Received - Event ID: ${event.id}, Type: ${event.type}`);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), { status: 400 });
  }

  const dataObject = event.data.object as any; // Cast for easier access, add specific types if preferred

  try {
    let supabaseUserId: string | null = null;
    let stripeCustomerId: string | null = null;
    let relevantSubscription: Stripe.Subscription | null = null;
    let relevantPriceId: string | null = null;
    let updates: UserProfileUpdate = {};


    // --- Handle Different Event Types ---
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = dataObject as Stripe.Checkout.Session;
        console.log(`Handling checkout.session.completed for session: ${session.id}`);
        stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        supabaseUserId = session.metadata?.supabase_user_id ?? null; // Get from session metadata first
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

        if (!stripeCustomerId || !subscriptionId) {
           console.error("Missing customer or subscription ID in checkout session completed event.");
           break; // Acknowledge event but can't process fully
        }

        // Fetch the subscription to get details like period end and price ID
        relevantSubscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
        if (!relevantSubscription) {
            console.error(`Could not retrieve subscription ${subscriptionId} after checkout.`);
            break;
        }

        relevantPriceId = relevantSubscription.items.data[0]?.price?.id ?? null;
        const creditsToAdd = relevantPriceId ? PLAN_CREDITS[relevantPriceId] ?? 0 : 0;

        updates = {
          stripe_customer_id: stripeCustomerId,
          subscription_status: relevantSubscription.status, // Should be 'active' or 'trialing'
          active_plan_price_id: relevantPriceId,
          subscription_current_period_end: relevantSubscription.current_period_end ? new Date(relevantSubscription.current_period_end * 1000).toISOString() : null,
          // Atomically increment credits if possible, otherwise set directly (less safe with retries)
          // story_credits: supabase.sql`story_credits + ${creditsToAdd}` // Needs SupabaseClient instance
        };

         console.log(`Checkout completed. Granting ${creditsToAdd} credits. Updates prepared:`, updates);
         // Note: Granting credits here might be redundant if invoice.payment_succeeded is also handled

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = dataObject as Stripe.Invoice;
         console.log(`Handling invoice.payment_succeeded for invoice: ${invoice.id}, reason: ${invoice.billing_reason}`);
        stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;

        if (!stripeCustomerId || !subscriptionId) {
            console.error("Missing customer or subscription ID in invoice payment succeeded event.");
            break;
        }
        // Avoid granting credits for one-off invoices etc.
        if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_create') {
            relevantSubscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
            if (!relevantSubscription) {
                 console.error(`Could not retrieve subscription ${subscriptionId} after invoice payment.`);
                 break;
            }
            relevantPriceId = relevantSubscription.items.data[0]?.price?.id ?? null;
            const creditsToAdd = relevantPriceId ? PLAN_CREDITS[relevantPriceId] ?? 0 : 0;

            // We only *really* need to update the credits and period end on successful payment
            updates = {
                 subscription_status: relevantSubscription.status, // Reaffirm status
                 subscription_current_period_end: relevantSubscription.current_period_end ? new Date(relevantSubscription.current_period_end * 1000).toISOString() : null,
                 // story_credits: supabase.sql`story_credits + ${creditsToAdd}` // Atomic increment
            };
            console.log(`Subscription payment succeeded. Granting ${creditsToAdd} credits. Updates prepared:`, updates);

             // *** TEMPORARY WORKAROUND FOR ATOMIC INCREMENT ***
            // Since we can't easily use supabase.sql here, fetch current credits and add
            if (creditsToAdd > 0) {
                const { data: currentProfile, error: fetchErr } = await supabaseAdmin
                    .from('users')
                    .select('story_credits')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (fetchErr && fetchErr.code !== 'PGRST116') {
                    console.error(`Webhook Error: Failed to fetch current credits for customer ${stripeCustomerId}`, fetchErr);
                } else {
                    const currentCredits = currentProfile?.story_credits ?? 0;
                    updates.story_credits = currentCredits + creditsToAdd;
                    console.log(`Workspaceed current credits: ${currentCredits}, New total: ${updates.story_credits}`);
                }
            }
            // *** END TEMPORARY WORKAROUND ***

        } else {
            console.log(`Skipping credit grant for invoice reason: ${invoice.billing_reason}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = dataObject as Stripe.Subscription;
        console.log(`Handling customer.subscription.updated for subscription: ${subscription.id}, status: ${subscription.status}`);
        stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
        relevantPriceId = subscription.items.data[0]?.price?.id ?? null;

        if (!stripeCustomerId) {
             console.error("Missing customer ID in subscription updated event.");
             break;
        }

        updates = {
          subscription_status: subscription.status,
          active_plan_price_id: relevantPriceId,
          subscription_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        };
        // If subscription was canceled but will remain active until period end,
        // the status might still be 'active' but `cancel_at_period_end` will be true.
        if (subscription.cancel_at_period_end) {
            console.log(`Subscription ${subscription.id} scheduled for cancellation at period end.`);
            // You might set a specific status like 'pending_cancellation' if needed
            // updates.subscription_status = 'pending_cancellation';
        }
        console.log("Subscription updated. Updates prepared:", updates);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = dataObject as Stripe.Subscription;
        console.log(`Handling customer.subscription.deleted for subscription: ${subscription.id}`);
        stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;

        if (!stripeCustomerId) {
             console.error("Missing customer ID in subscription deleted event.");
             break;
        }

        updates = {
          subscription_status: 'canceled', // Or 'deleted'
          active_plan_price_id: null,
          subscription_current_period_end: null,
          story_credits: 0, // Reset credits immediately on deletion, or adjust logic
        };
        console.log("Subscription deleted. Updates prepared:", updates);
        break;
      }

      // Add other cases as needed (e.g., invoice.payment_failed)

      default:
        console.log(`Unhandled event type: ${event.type}`);
        // Return 200 for unhandled events to acknowledge receipt
         return new Response(JSON.stringify({ received: true, message: 'Unhandled event type' }), { status: 200 });
    }

    // --- Update Supabase Database ---
    if (Object.keys(updates).length > 0 && (supabaseUserId || stripeCustomerId)) {
        let updateQuery = supabaseAdmin.from('users').update(updates);

        if (supabaseUserId) {
            console.log(`Updating user profile by Supabase User ID: ${supabaseUserId}`);
            updateQuery = updateQuery.eq('id', supabaseUserId);
        } else if (stripeCustomerId) {
            // Fallback to Stripe Customer ID if Supabase ID wasn't available (e.g., from older events)
            console.log(`Updating user profile by Stripe Customer ID: ${stripeCustomerId}`);
            updateQuery = updateQuery.eq('stripe_customer_id', stripeCustomerId);
        } else {
             console.error("Webhook Error: Cannot update profile - No Supabase User ID or Stripe Customer ID available.");
             // Acknowledge the event but log the failure to update
             return new Response(JSON.stringify({ received: true, warning: 'Could not identify user to update.' }), { status: 200 });
        }

        const { data: updateData, error: updateError } = await updateQuery.select().single(); // Select to confirm update

        if (updateError) {
            console.error("Webhook Error: Failed to update user profile:", updateError);
            // Throwing error here might cause Stripe to retry.
            // Decide if retry is desirable or if logging is sufficient.
            throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log("Webhook: User profile updated successfully for event:", event.type, updateData);

    } else if (Object.keys(updates).length > 0) {
         console.warn("Webhook Warning: Updates were prepared, but no user identifier (Supabase ID or Stripe Customer ID) was found for event:", event.type);
    } else {
        console.log("Webhook: No database updates required for this event:", event.type);
    }

    // Return 200 to acknowledge successful handling
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error('Webhook Error processing event:', event.type, error);
    // Return 500 to signal an internal error; Stripe might retry
    return new Response(JSON.stringify({ error: `Webhook handler failed: ${error.message}` }), { status: 500 });
  }
});