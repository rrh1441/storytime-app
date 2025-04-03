// supabase/functions/create-checkout-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@^2.40.0';
import Stripe from 'npm:stripe@^15.0.0'; // Use npm specifier

// Get secrets from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); // Public Anon key is okay here for user-specific client
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const siteUrl = Deno.env.get('SITE_URL');

if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey || !siteUrl) {
  console.error('Missing required environment variables.');
  // In a real scenario, you might prevent the function from starting
}

const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2024-04-10', // Use the API version you are developing against
  httpClient: Stripe.createFetchHttpClient(), // Required for Deno environment
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Restrict in production!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("create-checkout-session function initialized.");

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
     console.log(`Unsupported method: ${req.method}`);
     return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    console.log("Handling POST request for checkout session");

    // --- Create Supabase client with user's auth context ---
    // The user's JWT is automatically passed in the Authorization header
    const supabaseClient = createClient(
      supabaseUrl!,
      supabaseAnonKey!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // --- Get User Data ---
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log("User authenticated:", user.id, user.email);

    // --- Get Price ID from request body ---
    let priceId: string | null = null;
    try {
      const body = await req.json();
      priceId = body.priceId;
      if (!priceId || typeof priceId !== 'string') {
        throw new Error("Missing or invalid 'priceId' in request body.");
      }
      console.log("Received priceId:", priceId);
    } catch (parseError) {
       console.error("Failed to parse request body:", parseError);
       return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // --- Get/Create Stripe Customer ID ---
    const { data: profileData, error: profileError } = await supabaseClient
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 'Not Found' which is ok if creating
      console.error("Error fetching user profile:", profileError);
      throw new Error(`Database error fetching profile: ${profileError.message}`);
    }

    let stripeCustomerId = profileData?.stripe_customer_id;
    console.log("Current Stripe Customer ID from DB:", stripeCustomerId);

    if (!stripeCustomerId) {
      console.log("No Stripe Customer ID found, creating new customer...");
      const customer = await stripe.customers.create({
        email: user.email,
        // Add Supabase User ID to metadata for easier linking in webhooks
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
      console.log("New Stripe Customer created:", stripeCustomerId);

      // Update Supabase user profile with the new Stripe Customer ID
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating user profile with Stripe ID:", updateError);
        // Non-fatal, checkout can proceed, but log this potential inconsistency
        // Consider more robust error handling/retry logic if this update is critical before checkout
      } else {
        console.log("User profile updated successfully with Stripe Customer ID.");
      }
    }

    // --- Create Stripe Checkout Session ---
    console.log(`Creating Checkout Session for customer ${stripeCustomerId} and price ${priceId}`);
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${siteUrl}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`, // Redirect to dashboard on success
      cancel_url: `${siteUrl}/pricing?checkout_canceled=true`, // Redirect back to pricing on cancel
      // Add metadata linking back to Supabase user ID - crucial for webhook!
      subscription_data: {
        metadata: {
           supabase_user_id: user.id,
        }
      },
       // Add customer update metadata to allow email changes in Checkout portal to sync
       customer_update: {
        address: "auto", // Collect address if needed
        name: "auto", // Allow name updates
        // email: "auto" // Requires custom domain + branding settings in Stripe
      },
      allow_promotion_codes: true, // Allow discount codes if you use them
    });

    console.log("Stripe Checkout Session created:", session.id);

    // --- Return Session ID ---
    return new Response(
      JSON.stringify({ sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error creating checkout session:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    // Determine status code based on error type if possible
    let status = 500;
    if (message.includes("Unauthorized") || message.includes("authenticated")) status = 401;
    if (message.includes("Invalid request") || message.includes("Missing")) status = 400;

    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    );
  }
});