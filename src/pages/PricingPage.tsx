// src/pages/PricingPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Check, LogIn } from 'lucide-react';

// --- Stripe Publishable Key ---
// Ensure this is correctly set in your .env file
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_TEST_KEY'; // Use your actual key

// --- Initialize Stripe.js ---
let stripePromise: Promise<ReturnType<typeof loadStripe>> | null = null;
if (STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
  stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
} else {
  console.error("Stripe Publishable Key is missing or invalid. Stripe functionality will be disabled.");
  // Optionally set stripePromise to a rejected promise or handle differently
}

// --- Updated Plan Details with Correct Prices/IDs ---
const plans = [
  {
    id: 'starter',
    name: 'Starter StoryTime',
    // Ensure this Price ID is correct for your $4.99/15min plan in Stripe
    priceId: 'price_1R88J5KSaqiJUYkjbH0R39VO',
    priceMonthly: 4.99,
    features: [
      '15 minutes of custom stories per Month',
    ],
    cta: 'Get Starter',
    popular: false,
  },
  {
    id: 'super',
    name: 'Super StoryTime',
     // Ensure this Price ID is correct for your $14.99/60min plan in Stripe
    priceId: 'price_1R9u5HKSaqiJUYkjnXkKiJkS',
    priceMonthly: 14.99,
    features: [
      '60 minutes of custom stories per Month',
      'Priority Support',
    ],
    cta: 'Get Super',
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio StoryTime',
    // Updated with provided Price ID
    priceId: 'price_1RHXrmKSaqiJUYkjfie7WbY1',
    // Updated with provided price
    priceMonthly: 49.99,
    features: [
      '300 minutes of custom stories per Month',
      'Highest Priority Support',
    ],
    cta: 'Get Studio',
    popular: false,
  },
];

const PricingPage: React.FC = () => {
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
      toast({
        title: "Configuration Error",
        description: "Stripe payments are currently unavailable due to a missing or invalid key.",
        variant: "destructive",
        duration: Infinity,
      });
    }
  }, []);


  const handleSubscribe = async (priceId: string) => {
     // Basic check, though specific placeholder logic is removed later
     if (!priceId) {
       toast({ title: "Error", description: "Plan information is missing.", variant: "destructive" });
       return;
     }

    setIsRedirecting((prev) => ({ ...prev, [priceId]: true }));

    if (!stripePromise) {
      toast({ title: "Error", description: "Stripe is not configured correctly.", variant: "destructive" });
      setIsRedirecting((prev) => ({ ...prev, [priceId]: false }));
      return;
    }

    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in or sign up to subscribe.",
        action: (
           <Button variant="outline" size="sm" onClick={() => navigate('/login', { state: { from: location, priceIdToSubscribe: priceId }, replace: true })}>
              Log In
           </Button>
         ),
      });
       setIsRedirecting((prev) => ({ ...prev, [priceId]: false }));
      return;
    }

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

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js failed to load.");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        console.error("Stripe redirect error:", stripeError);
        toast({ title: "Checkout Error", description: stripeError.message || "Could not redirect to Stripe.", variant: "destructive" });
        setIsRedirecting((prev) => ({ ...prev, [priceId]: false }));
      }

    } catch (error: any) {
      console.error("Subscription initiation failed:", error);
      toast({ title: "Subscription Error", description: error.message || "Could not initiate checkout. Please try again.", variant: "destructive" });
      setIsRedirecting((prev) => ({ ...prev, [priceId]: false }));
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentUserPlan = profile?.active_plan_price_id === plan.priceId && profile?.subscription_status === 'active';
            const isSubscribed = profile?.subscription_status === 'active';
             // Disable button if redirecting or Stripe key missing/invalid
            const isButtonDisabled = isRedirecting[plan.priceId] || !STRIPE_PUBLISHABLE_KEY || !STRIPE_PUBLISHABLE_KEY.startsWith('pk_');


            return (
              <Card key={plan.id} className={`flex flex-col ${plan.popular ? 'border-storytime-purple border-2 shadow-lg' : 'border-gray-200'}`}>
                {plan.popular && (
                  <div className="bg-storytime-purple text-white text-xs font-bold uppercase tracking-wider text-center py-1 rounded-t-lg -mt-px mx-[-1px]">
                    Most Popular
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-semibold text-gray-800">{plan.name}</CardTitle>
                  <CardDescription className="flex items-baseline gap-1 pt-1">
                     {/* Format price nicely */}
                    <span className="text-4xl font-bold text-gray-900">${plan.priceMonthly.toFixed(2)}</span>
                    <span className="text-lg text-gray-500">/ month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3 text-gray-600 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 mr-2 text-storytime-green flex-shrink-0 mt-0.5" />
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
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Link to dashboard/billing or Stripe portal
                        toast({ title: "Manage Subscription", description: "You can manage your plan from the dashboard." });
                         // navigate('/dashboard/billing'); // Example navigation
                      }}
                      className="w-full h-11"
                    >
                      Manage Plan
                    </Button>
                  ) : (
                    // Subscribe button for non-subscribed users
                    <Button
                      onClick={() => handleSubscribe(plan.priceId)}
                      disabled={isButtonDisabled} // Use consolidated disabled state
                      className={`w-full h-11 ${plan.popular ? 'bg-storytime-purple hover:bg-storytime-purple/90' : 'bg-storytime-blue hover:bg-storytime-blue/90'} text-white`}
                      aria-label={`Subscribe to ${plan.name}`}
                    >
                      {isRedirecting[plan.priceId] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="mr-2 h-4 w-4" /> // Show login icon for all available plans
                      )}
                      {plan.cta} {/* Display the plan's call to action text */}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-10 text-sm text-gray-500">
          <p>Subscriptions automatically renew monthly. You can manage or cancel your subscription anytime from your dashboard.</p>
          <p className="mt-2">
             By subscribing, you agree to our <Link to="#" className="underline hover:text-storytime-blue">Terms of Service</Link> and <Link to="#" className="underline hover:text-storytime-blue">Privacy Policy</Link>.
             {/* TODO: Update links to actual policy pages */}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;