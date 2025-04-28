// src/pages/PricingPage.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Check, LogIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// --- Stripe Publishable Key ---
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51PwnjIKSaqiJUYkj1zcRvi3ii0AhBT4Soev4NXLjYeaZHmzGmS4cA3oKBUwRk3TKbMJ1LERXOIj5Fb9PzumLyHAI00gBPDWiK8';

// --- Initialize Stripe.js ---
let stripePromise: Promise<ReturnType<typeof loadStripe>> | null = null;
if (STRIPE_PUBLISHABLE_KEY) {
  stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
} else {
  console.error("Stripe Publishable Key is missing. Stripe functionality will be disabled.");
}

// --- Plan Details ---
const plans = [
  {
    id: 'starter',
    name: 'StoryTime Starter',
    priceId: 'price_1R88J5KSaqiJUYkjbH0R39VO', // Ensure this matches your Stripe Price ID
    priceMonthly: 5,
    credits: 15,
    features: [
      '15 minutes of custom stories per Month',
      'Save Stories to Library',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Super StoryTime',
    priceId: 'price_1R9u5HKSaqiJUYkjnXkKiJkS', // Ensure this matches your Stripe Price ID
    priceMonthly: 15,
    credits: 60,
    features: [
      '60 minutes of custom stories per Month',
      'Priority Support',
    ],
    cta: 'Get ',
    popular: true,
  },
];

const PricingPage: React.FC = () => {
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState<Record<string, boolean>>({});

  // Add useEffect to check for missing Stripe key on component mount
  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      toast({
        title: "Configuration Error",
        description: "Stripe payments are currently unavailable.",
        variant: "destructive",
        duration: Infinity, // Keep message visible
      });
    }
  }, []);


  const handleSubscribe = async (priceId: string) => {
    setIsRedirecting((prev) => ({ ...prev, [priceId]: true }));

    if (!stripePromise) {
      toast({ title: "Error", description: "Stripe is not configured correctly.", variant: "destructive" });
      setIsRedirecting((prev) => ({ ...prev, [priceId]: false }));
      return;
    }

    // 1. Check Authentication
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in or sign up to subscribe.",
        variant: "destructive",
      });
      navigate('/login', {
        state: { from: location, priceIdToSubscribe: priceId },
        replace: true,
      });
      // No need to set redirecting state false here, as we are navigating away
      return; // Stop execution here
    }

    // 2. Call Supabase Edge Function
    try {
      console.log(`Calling create-checkout-session for priceId: ${priceId}`);
      const { data, error: functionError } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: priceId },
      });

      console.log("Edge function response:", { data, functionError });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);
      if (!data?.sessionId) throw new Error('Checkout session ID not received from the function.');

      const sessionId = data.sessionId;
      console.log(`Received sessionId: ${sessionId}`);

      // 3. Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js failed to load.");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        console.error("Stripe redirect error:", stripeError);
        toast({ title: "Checkout Error", description: stripeError.message || "Could not redirect to Stripe.", variant: "destructive" });
        // Reset loading state if redirect fails
        setIsRedirecting((prev) => ({ ...prev, [priceId]: false }));
      }
      // If successful, the user is redirected, no need to reset state here.

    } catch (error: any) {
      console.error("Subscription initiation failed:", error);
      toast({ title: "Subscription Error", description: error.message || "Could not initiate checkout. Please try again.", variant: "destructive" });
      // Reset loading state on error
      setIsRedirecting((prev) => ({ ...prev, [priceId]: false }));
    }
    // Removed finally block as state is reset within error/failure paths or navigation occurs
  };

  // Display skeleton while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-storytime-background py-12 flex items-center justify-center">
        <div className="container mx-auto px-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-storytime-purple mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-storytime-background py-12">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold font-display mb-3 text-storytime-purple">Choose Your Plan</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Unlock more stories and features with our subscription plans.</p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isCurrentUserPlan = profile?.active_plan_price_id === plan.priceId && profile?.subscription_status === 'active';
            const isSubscribed = profile?.subscription_status === 'active'; // User has any active subscription

            return (
              <Card key={plan.id} className={`flex flex-col ${plan.popular ? 'border-storytime-purple border-2 shadow-lg' : 'border-gray-200'}`}>
                {plan.popular && (
                  <div className="bg-storytime-purple text-white text-xs font-bold uppercase tracking-wider text-center py-1 rounded-t-lg -mt-px mx-[-1px]"> {/* Adjusted for border */}
                    Most Popular
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-semibold text-gray-800">{plan.name}</CardTitle>
                  <CardDescription className="flex items-baseline gap-1 pt-1">
                    <span className="text-4xl font-bold text-gray-900">${plan.priceMonthly}</span>
                    <span className="text-lg text-gray-500">/ month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-center text-gray-600 mb-6 font-medium">
                    <span className="text-storytime-blue font-bold">{plan.credits}</span> story credits per month
                  </p>
                  <ul className="space-y-3 text-gray-600 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-storytime-green flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentUserPlan ? (
                    <Button variant="outline" disabled className="w-full h-11 cursor-default">
                      <Check className="mr-2 h-4 w-4" /> Current Plan
                    </Button>
                  ) : isSubscribed ? (
                    // If subscribed but not to *this* plan, show option to switch
                    // NOTE: This button should ideally trigger a portal session or update subscription logic
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement logic to switch plans, likely via customer portal
                        toast({ title: "Coming Soon", description: "Plan switching will be available soon via the customer portal." });
                        // handleSubscribe(plan.priceId); // This would create a *new* checkout, might not be desired
                      }}
                      disabled={isRedirecting[plan.priceId]}
                      className="w-full h-11"
                    >
                      {isRedirecting[plan.priceId] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Switch to {plan.name}
                    </Button>
                  ) : (
                    // If not subscribed at all, show the subscribe button
                    <Button
                      onClick={() => handleSubscribe(plan.priceId)}
                      disabled={isRedirecting[plan.priceId] || !STRIPE_PUBLISHABLE_KEY} // Also disable if Stripe key missing
                      className={`w-full h-11 ${plan.popular ? 'bg-storytime-purple hover:bg-storytime-purple/90' : 'bg-storytime-blue hover:bg-storytime-blue/90'} text-white`}
                    >
                      {isRedirecting[plan.priceId] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="mr-2 h-4 w-4" />
                      )}
                      {plan.cta}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-10 text-sm text-gray-500">
          <p>Subscriptions automatically renew monthly. You can manage your subscription from your dashboard.</p>
          {/* Example Links: Replace # with actual links if you have them */}
          <p className="mt-2">
             By subscribing, you agree to our <Link to="#" className="underline hover:text-storytime-blue">Terms of Service</Link> and <Link to="#" className="underline hover:text-storytime-blue">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;