// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// ---> Import session from useAuth <---
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  // ---> Get session state from useAuth <---
  const { login, loading: authLoading, session } = useAuth(); // Use 'loading' from useAuth for consistency
  const navigate = useNavigate();
  const location = useLocation();
  // ---> State to track if login API call finished successfully <---
  const [loginInitiated, setLoginInitiated] = useState(false);

  // Updated onSubmit: Initiates login, shows initial toast, sets flag
  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setLoginInitiated(false); // Reset flag on new submission
    try {
      await login({ email: data.email, password: data.password });
      // Login call to Supabase succeeded, onAuthStateChange will handle state update
      toast({ title: "Login Initiated", description: "Checking credentials..." }); // More accurate toast
      setLoginInitiated(true); // Set flag indicating login process started successfully
      // --- REMOVE NAVIGATION FROM HERE ---
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({ title: "Login Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      setLoginInitiated(false); // Ensure flag is false on error
    }
  };

  // ---> useEffect to handle navigation AFTER session updates <---
  useEffect(() => {
    // Only run if login was initiated AND the session is now valid (not null)
    if (loginInitiated && session) {
      console.log("[LoginPage useEffect] Login initiated and session found, navigating...");
      // Show final success toast here
      toast({ title: "Login Successful!", description: "Welcome back!" });

      const state = location.state as any;
      console.log("[LoginPage useEffect] Redirect state:", state);

      let redirectTo = '/dashboard'; // Default destination
      let redirectState = {}; // Default empty state

      if (state && state.from) {
        redirectTo = state.from.pathname || '/dashboard'; // Use pathname from location object
        if (state.returnToTab) {
          redirectState = { returnToTab: state.returnToTab };
           console.log(`[LoginPage useEffect] Redirecting to ${redirectTo} with tab ${state.returnToTab}`);
        } else {
           console.log(`[LoginPage useEffect] Redirecting to ${redirectTo}`);
        }
        // Avoid redirecting back to login/signup page if that was the 'from' location
        if (redirectTo === '/login' || redirectTo === '/signup') {
            console.log(`[LoginPage useEffect] Avoiding redirect loop to ${redirectTo}, going to dashboard instead.`);
            redirectTo = '/dashboard';
            redirectState = {};
        }

      } else {
         console.log("[LoginPage useEffect] No 'from' state found, redirecting to dashboard");
      }

      // Navigate using the determined path and state, replacing login page in history
      navigate(redirectTo, { replace: true, state: redirectState });

      // Optional: Reset flag if needed, though replacing history might make it unnecessary
      // setLoginInitiated(false);
    }
  }, [session, loginInitiated, navigate, location.state]); // Dependencies: session, flag, navigate, location state

  return (
    // Ghibli-esque background and centering
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] py-12 bg-[#F2FCE2] px-4">
        {/* Styled container */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
        <div className="text-center">
          <LogIn className="mx-auto h-10 w-10 text-[#4FB8FF]" />
          <h1 className="text-3xl font-display font-bold mt-4 text-[#4FB8FF]">Welcome Back!</h1>
          <p className="text-[#6b7280] mt-2">Log in to continue your storytelling adventure.</p>
        </div>
        <Form {...form}>
          {/* Pass the MODIFIED onSubmit */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#6b7280]">Email</FormLabel>
                  <FormControl>
                    <Input className="rounded-lg border-gray-300 focus:border-[#4FB8FF] focus:ring-[#4FB8FF]" placeholder="you@example.com" {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#6b7280]">Password</FormLabel>
                  <FormControl>
                    <Input className="rounded-lg border-gray-300 focus:border-[#4FB8FF] focus:ring-[#4FB8FF]" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Use authLoading from useAuth */}
            <Button type="submit" className="w-full bg-[#4FB8FF] hover:bg-[#4FB8FF]/90 text-white rounded-full shadow-md h-11" disabled={authLoading}>
              {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm text-[#6b7280]">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-[#06D6A0] hover:text-[#06D6A0]/80 underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;