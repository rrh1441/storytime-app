// supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@^2.40.0';
import Stripe from 'npm:stripe@^15.0.0';

// Define the structure of the user profile/record we'll be updating
// Ensure these columns exist in your Supabase table (e.g., 'profiles' or 'users')
interface UserProfileUpdate {
  stripe_customer_id?: string | null;
  subscription_status?: string | null; // e.g., 'active', 'trialing', 'canceled', 'past_due'
  active_plan_price_id?: string | null; // The Stripe Price ID of the active plan
  subscription_current_period_end?: string | null; // ISO string date
  monthly_minutes_limit?: number | null; // Added: Stores the minute limit based on plan
}

// Get secrets from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key!
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !stripeWebhookSecret) {
  console.error('Webhook: Missing required environment variables.');
}

// Initialize Stripe client
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
}) : null;

// Initialize Supabase Admin Client
const supabaseAdmin: SupabaseClient | null = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Stripe-Signature',
};

// Mapping Price IDs to Monthly Minute Allocations
// MAKE SURE THESE PRICE IDs MATCH YOUR STRIPE SETUP EXACTLY
const PLAN_MINUTE_ALLOCATION: Record<string, number> = {
    'price_1R88J5KSaqiJUYkjbH0R39VO': 15,  // Starter StoryTime ($4.99)
    'price_1R9u5HKSaqiJUYkjnXkKiJkS': 60, // Super StoryTime ($14.99)
    'price_1RHXrmKSaqiJUYkjfie7WbY1': 300, // Studio StoryTime ($49.99)
    // Add any other relevant Price IDs (e.g., test environment prices)
};

console.log("stripe-webhook function initialized (with minute limits).");

serve(async (req) => {
   if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
   }
   if (!stripe || !supabaseAdmin) {
     console.error("Webhook Error: Stripe or Supabase Admin client not initialized.");
     return new Response(JSON.stringify({ error: 'Webhook service configuration error.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
   }
   if (req.method !== 'POST') {
     console.log(`Webhook: Unsupported method: ${req.method}`);
     return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
   }

  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  if (!signature) {
    console.error("Webhook Error: Missing Stripe-Signature header.");
    return new Response(JSON.stringify({ error: 'Missing Stripe signature.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!stripeWebhookSecret) {
     console.error("Webhook Error: Missing STRIPE_WEBHOOK_SECRET environment variable.");
     return new Response(JSON.stringify({ error: 'Webhook secret not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    console.log(`Webhook Received - Event ID: ${event.id}, Type: ${event.type}`);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const dataObject = event.data.object as any;

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
        supabaseUserId = session.metadata?.supabase_user_id ?? null;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

        if (!stripeCustomerId) { console.error("Missing customer ID"); break; }
        if (!subscriptionId) { console.warn(`Missing subscription ID in checkout ${session.id}`); updates = { stripe_customer_id: stripeCustomerId }; break; }
        if (!supabaseUserId) { console.warn(`Missing supabase_user_id in metadata for checkout ${session.id}.`); }

        try {
            relevantSubscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
        } catch (retrieveError) { console.error(`Error retrieving subscription ${subscriptionId}: ${retrieveError.message}`); updates = { stripe_customer_id: stripeCustomerId }; break; }
        if (!relevantSubscription) { console.error(`Could not retrieve subscription ${subscriptionId}`); updates = { stripe_customer_id: stripeCustomerId }; break; }

        relevantPriceId = relevantSubscription.items.data[0]?.price?.id ?? null;
        const minuteLimit = relevantPriceId ? PLAN_MINUTE_ALLOCATION[relevantPriceId] ?? null : null; // Get limit from map

        updates = {
          stripe_customer_id: stripeCustomerId,
          subscription_status: relevantSubscription.status,
          active_plan_price_id: relevantPriceId,
          subscription_current_period_end: relevantSubscription.current_period_end ? new Date(relevantSubscription.current_period_end * 1000).toISOString() : null,
          monthly_minutes_limit: minuteLimit, // Set the minute limit
        };
        console.log(`Checkout completed. Minute limit set to ${minuteLimit}. Updates prepared:`, JSON.stringify(updates));
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = dataObject as Stripe.Invoice;
         console.log(`Handling invoice.payment_succeeded for invoice: ${invoice.id}, reason: ${invoice.billing_reason}`);
        stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;

        if (!stripeCustomerId || !subscriptionId) { console.error("Missing customer or subscription ID"); break; }

        // Update status and period end on renewals
        if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_create') {
             try { relevantSubscription = await stripe.subscriptions.retrieve(subscriptionId); }
             catch (retrieveError) { console.error(`Error retrieving subscription ${subscriptionId}: ${retrieveError.message}`); break; }
             if (!relevantSubscription) { console.error(`Could not retrieve subscription ${subscriptionId}`); break; }

             // We could also re-fetch the price ID and reaffirm the minute limit, but it shouldn't change on a simple renewal
             // const currentPriceId = relevantSubscription.items.data[0]?.price?.id ?? null;
             // const currentMinuteLimit = currentPriceId ? PLAN_MINUTE_ALLOCATION[currentPriceId] ?? null : null;

            updates = {
                 subscription_status: relevantSubscription.status,
                 subscription_current_period_end: relevantSubscription.current_period_end ? new Date(relevantSubscription.current_period_end * 1000).toISOString() : null,
                 // monthly_minutes_limit: currentMinuteLimit // Optional: reaffirm limit
            };
            console.log(`Subscription payment succeeded. Updates prepared:`, JSON.stringify(updates));
        } else {
            console.log(`Skipping profile update for invoice reason: ${invoice.billing_reason}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        // Handles upgrades, downgrades, cancellations set for period end, etc.
        const subscription = dataObject as Stripe.Subscription;
        console.log(`Handling customer.subscription.updated for subscription: ${subscription.id}, status: ${subscription.status}`);
        stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
        relevantPriceId = subscription.items?.data[0]?.price?.id ?? null; // Get current price ID
        const newMinuteLimit = relevantPriceId ? PLAN_MINUTE_ALLOCATION[relevantPriceId] ?? null : null; // Determine new limit

        if (!stripeCustomerId) { console.error("Missing customer ID"); break; }

        updates = {
          subscription_status: subscription.status,
          active_plan_price_id: relevantPriceId, // Store the new price ID
          subscription_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          monthly_minutes_limit: newMinuteLimit, // Update the minute limit
        };

        if (subscription.cancel_at_period_end) {
            console.log(`Subscription ${subscription.id} scheduled for cancellation at period end (${updates.subscription_current_period_end}). Limit remains ${newMinuteLimit} until then.`);
        }
        console.log(`Subscription updated. Minute limit set to ${newMinuteLimit}. Updates prepared:`, JSON.stringify(updates));
        break;
      }

      case 'customer.subscription.deleted': {
        // Handles immediate cancellations or cancellations after period end has passed.
        const subscription = dataObject as Stripe.Subscription;
        console.log(`Handling customer.subscription.deleted for subscription: ${subscription.id}, status: ${subscription.status}`);
        stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;

        if (!stripeCustomerId) { console.error("Missing customer ID"); break; }

        updates = {
          subscription_status: 'canceled', // Ensure definitive canceled status
          active_plan_price_id: null, // Clear active plan
          subscription_current_period_end: null, // Clear end date
          monthly_minutes_limit: null, // Reset minute limit (or to 0 if preferred)
        };
        console.log("Subscription deleted/canceled. Minute limit reset. Updates prepared:", JSON.stringify(updates));
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return new Response(JSON.stringify({ received: true, message: `Unhandled event type: ${event.type}` }), { status: 200, headers: corsHeaders });
    }

    // --- Update Supabase Database ---
    if (Object.keys(updates).length > 0 && (supabaseUserId || stripeCustomerId)) {
        // IMPORTANT: Change 'users' to your actual table name if different (e.g., 'profiles')
        const targetTable = 'users';
        let updateQuery = supabaseAdmin.from(targetTable).update(updates);

        if (supabaseUserId) {
            console.log(`Attempting to update '${targetTable}' for Supabase User ID: ${supabaseUserId}`);
            updateQuery = updateQuery.eq('id', supabaseUserId); // Assumes 'id' column matches Auth user ID
        } else if (stripeCustomerId) {
            console.log(`Attempting to update '${targetTable}' using Stripe Customer ID: ${stripeCustomerId}`);
            updateQuery = updateQuery.eq('stripe_customer_id', stripeCustomerId); // Assumes 'stripe_customer_id' column exists
        }

        const { data: updateData, error: updateError } = await updateQuery.select().maybeSingle();

        if (updateError) {
             if (updateError.code === 'PGRST116' && !supabaseUserId && stripeCustomerId) {
                 console.warn(`Webhook Warning: Could not find user profile in '${targetTable}' matching Stripe Customer ID ${stripeCustomerId}.`);
                  return new Response(JSON.stringify({ received: true, warning: 'User profile not found for Stripe Customer ID.' }), { status: 200, headers: corsHeaders });
             } else {
                console.error(`Webhook Error: Failed to update user profile in '${targetTable}':`, updateError);
                throw new Error(`Database update failed: ${updateError.message} (Code: ${updateError.code})`);
            }
        }

        if (updateData) { console.log(`Webhook: User profile in '${targetTable}' updated successfully for event: ${event.type}`); }
        else if (!updateError) { console.log(`Webhook: Update query ran but no matching user found in '${targetTable}' for event: ${event.type}. Identifier: ${supabaseUserId ?? stripeCustomerId}`); }

    } else if (Object.keys(updates).length > 0) {
         console.warn(`Webhook Warning: Updates prepared, but no user identifier found for event: ${event.type}. Updates:`, JSON.stringify(updates));
    } else {
        console.log(`Webhook: No database updates required for handled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error(`Webhook Error processing event ${event.id} (Type: ${event.type}): ${error.message}`, error.stack);
    return new Response(JSON.stringify({ error: `Webhook handler failed: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});