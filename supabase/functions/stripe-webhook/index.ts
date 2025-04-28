// supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@^2.40.0';
import Stripe from 'npm:stripe@^15.0.0';

// Define the structure of the user profile/record we'll be updating
interface UserProfileUpdate {
  stripe_customer_id?: string | null;
  subscription_status?: string | null; // e.g., 'active', 'trialing', 'canceled', 'past_due'
  active_plan_price_id?: string | null; // The Stripe Price ID of the active plan
  subscription_current_period_end?: string | null; // ISO string date
  monthly_minutes_limit?: number | null;
  minutes_used_this_period?: number | null; // <--- Ensure this is included
}

// Get secrets from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !stripeWebhookSecret) {
  console.error('Webhook: Missing required environment variables.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10', // Use your desired API version
  httpClient: Stripe.createFetchHttpClient(),
}) : null;

const supabaseAdmin: SupabaseClient | null = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Restrict in production
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Stripe-Signature',
};

// Mapping Price IDs to Monthly Minute Allocations (Ensure these match your Stripe setup)
const PLAN_MINUTE_ALLOCATION: Record<string, number> = {
    'price_1R88J5KSaqiJUYkjbH0R39VO': 15,  // Starter StoryTime ($4.99)
    'price_1R9u5HKSaqiJUYkjnXkKiJkS': 60,  // Super StoryTime ($14.99)
    'price_1RHXrmKSaqiJUYkjfie7WbY1': 300, // Studio StoryTime ($49.99)
    // Add any other relevant Price IDs
};

console.log("stripe-webhook function initialized (with minute limits and usage reset logic).");

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

    // Function to find Supabase user ID from Stripe Customer ID
    const findSupabaseUserId = async (customerId: string): Promise<string | null> => {
        const { data, error } = await supabaseAdmin
            .from('users') // Your table name
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
        if (error) {
            console.error(`Error looking up user by stripe_customer_id ${customerId}:`, error);
            return null;
        }
        if (data) {
             console.log(`Found supabaseUserId ${data.id} for stripe_customer_id ${customerId}`);
             return data.id;
        }
        console.warn(`No user found for stripe_customer_id ${customerId}`);
        return null;
    };


    // --- Handle Different Event Types ---
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = dataObject as Stripe.Checkout.Session;
        console.log(`Handling checkout.session.completed for session: ${session.id}`);
        stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        // Prefer metadata, fallback to client_reference_id if you use it, then lookup
        supabaseUserId = session.metadata?.supabase_user_id ?? session.client_reference_id ?? null;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

        if (!stripeCustomerId) { console.error("Missing customer ID in checkout.session"); break; }

        // If supabaseUserId wasn't in metadata, try looking it up now
        if (!supabaseUserId && stripeCustomerId) {
            supabaseUserId = await findSupabaseUserId(stripeCustomerId);
        }

        if (!subscriptionId) {
            console.warn(`Missing subscription ID in checkout ${session.id}. Updating customer ID only.`);
            updates = { stripe_customer_id: stripeCustomerId };
            break; // Break here as we can't get subscription details
        }

        try {
            relevantSubscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
        } catch (retrieveError) { console.error(`Error retrieving subscription ${subscriptionId}: ${retrieveError.message}`); updates = { stripe_customer_id: stripeCustomerId }; break; }
        if (!relevantSubscription) { console.error(`Could not retrieve subscription ${subscriptionId}`); updates = { stripe_customer_id: stripeCustomerId }; break; }

        relevantPriceId = relevantSubscription.items.data[0]?.price?.id ?? null;
        const minuteLimit = relevantPriceId ? PLAN_MINUTE_ALLOCATION[relevantPriceId] ?? null : null;

        updates = {
          stripe_customer_id: stripeCustomerId,
          subscription_status: relevantSubscription.status,
          active_plan_price_id: relevantPriceId,
          subscription_current_period_end: relevantSubscription.current_period_end ? new Date(relevantSubscription.current_period_end * 1000).toISOString() : null,
          monthly_minutes_limit: minuteLimit,
          minutes_used_this_period: 0, // <<<--- Reset usage on initial checkout success
        };
        console.log(`Checkout completed. Minute limit set to ${minuteLimit}, usage reset. Updates prepared:`, JSON.stringify(updates));
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = dataObject as Stripe.Invoice;
        console.log(`Handling invoice.payment_succeeded for invoice: ${invoice.id}, reason: ${invoice.billing_reason}`);
        stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;

        if (!stripeCustomerId || !subscriptionId) { console.error("Missing customer or subscription ID in invoice.payment_succeeded"); break; }

        // --- Find supabaseUserId ---
        supabaseUserId = await findSupabaseUserId(stripeCustomerId);
        if (!supabaseUserId) { console.warn(`Could not find user for stripe_customer_id ${stripeCustomerId} on invoice payment.`); break; } // Stop if user not found
        // ---

        // Update status, period end, and RESET USAGE on renewals/creations
        if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_create') {
             try { relevantSubscription = await stripe.subscriptions.retrieve(subscriptionId); }
             catch (retrieveError) { console.error(`Error retrieving subscription ${subscriptionId}: ${retrieveError.message}`); break; }
             if (!relevantSubscription) { console.error(`Could not retrieve subscription ${subscriptionId}`); break; }

            // Optionally reaffirm price/limit
            // relevantPriceId = relevantSubscription.items.data[0]?.price?.id ?? null;
            // const currentMinuteLimit = relevantPriceId ? PLAN_MINUTE_ALLOCATION[relevantPriceId] ?? null : null;

            updates = {
                subscription_status: relevantSubscription.status,
                subscription_current_period_end: relevantSubscription.current_period_end ? new Date(relevantSubscription.current_period_end * 1000).toISOString() : null,
                minutes_used_this_period: 0, // <<<--- MODIFICATION: Reset usage here
                // Optionally reaffirm:
                // active_plan_price_id: relevantPriceId,
                // monthly_minutes_limit: currentMinuteLimit,
            };
            console.log(`Subscription payment succeeded (${invoice.billing_reason}). Usage reset. Updates prepared:`, JSON.stringify(updates));
        } else {
            console.log(`Skipping usage reset/profile update for invoice reason: ${invoice.billing_reason}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
         const subscription = dataObject as Stripe.Subscription;
         console.log(`Handling customer.subscription.updated for subscription: ${subscription.id}, status: ${subscription.status}`);
         stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
         relevantPriceId = subscription.items?.data[0]?.price?.id ?? null;
         const newMinuteLimit = relevantPriceId ? PLAN_MINUTE_ALLOCATION[relevantPriceId] ?? null : null;

         if (!stripeCustomerId) { console.error("Missing customer ID in customer.subscription.updated"); break; }

         // --- Find supabaseUserId ---
         supabaseUserId = await findSupabaseUserId(stripeCustomerId);
         if (!supabaseUserId) { console.warn(`Could not find user for stripe_customer_id ${stripeCustomerId} on subscription update.`); break; }
         // ---

         updates = {
           subscription_status: subscription.status,
           active_plan_price_id: relevantPriceId,
           subscription_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
           monthly_minutes_limit: newMinuteLimit,
           // Usage is NOT reset on update, only on successful renewal payment
         };

         if (subscription.cancel_at_period_end) {
             console.log(`Subscription ${subscription.id} scheduled for cancellation at period end (${updates.subscription_current_period_end}). Limit remains ${newMinuteLimit} until then.`);
         }
         console.log(`Subscription updated. Minute limit set to ${newMinuteLimit}. Updates prepared:`, JSON.stringify(updates));
         break;
      }

      case 'customer.subscription.deleted': {
        const subscription = dataObject as Stripe.Subscription;
        console.log(`Handling customer.subscription.deleted for subscription: ${subscription.id}, status: ${subscription.status}`);
        stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;

        if (!stripeCustomerId) { console.error("Missing customer ID in customer.subscription.deleted"); break; }

         // --- Find supabaseUserId ---
         supabaseUserId = await findSupabaseUserId(stripeCustomerId);
         if (!supabaseUserId) { console.warn(`Could not find user for stripe_customer_id ${stripeCustomerId} on subscription deletion.`); break; }
         // ---

        updates = {
          subscription_status: 'canceled',
          active_plan_price_id: null,
          subscription_current_period_end: null,
          monthly_minutes_limit: null,
          minutes_used_this_period: null, // Reset usage on cancel
        };
        console.log("Subscription deleted/canceled. Minute limit and usage reset. Updates prepared:", JSON.stringify(updates));
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return new Response(JSON.stringify({ received: true, message: `Unhandled event type: ${event.type}` }), { status: 200, headers: corsHeaders });
    }

    // --- Update Supabase Database ---
    if (Object.keys(updates).length > 0 && supabaseUserId) { // Require supabaseUserId to update
        const targetTable = 'users'; // Ensure this is your correct table name
        console.log(`Attempting to update '${targetTable}' for Supabase User ID: ${supabaseUserId} with updates:`, JSON.stringify(updates));
        const { data: updateData, error: updateError } = await supabaseAdmin
            .from(targetTable)
            .update(updates)
            .eq('id', supabaseUserId) // Target user by Supabase ID
            .select() // Select to confirm the update
            .maybeSingle();


        if (updateError) {
            console.error(`Webhook Error: Failed to update user profile in '${targetTable}' for user ${supabaseUserId}:`, updateError);
             throw new Error(`Database update failed: ${updateError.message} (Code: ${updateError.code})`);
         }

        if (updateData) { console.log(`Webhook: User profile in '${targetTable}' updated successfully for user ${supabaseUserId}, event: ${event.type}`); }
        else { console.log(`Webhook: Update query ran but no matching user found or no change required in '${targetTable}' for user ${supabaseUserId}, event: ${event.type}.`); }

    } else if (Object.keys(updates).length > 0) {
         console.warn(`Webhook Warning: Updates prepared, but no supabaseUserId could be determined for event ${event.type}. Stripe Customer: ${stripeCustomerId}. Updates skipped:`, JSON.stringify(updates));
    } else {
         console.log(`Webhook: No database updates required for handled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error(`Webhook Error processing event ${event.id} (Type: ${event.type}): ${error.message}`, error.stack);
    return new Response(JSON.stringify({ error: `Webhook handler failed: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});