// src/pages/LoginPage.tsx
import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// Removed Card imports
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react'; // Use LogIn icon

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Min 1 for presence check
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    try {
      await login({ email: data.email, password: data.password });
      toast({ title: "Login Successful!", description: "Welcome back!" });
      
      // Redirect logic after successful login
      const state = location.state as any;
      console.log("Login redirect state:", state);
      
      if (state && state.from) {
        if (state.returnToTab) {
          // Return to the specific tab in StoryCreator
          console.log(`Redirecting to ${state.from} with tab ${state.returnToTab}`);
          navigate(state.from, { 
            state: { returnToTab: state.returnToTab },
            replace: true 
          });
        } else {
          // Just return to the previous location
          console.log(`Redirecting to ${state.from}`);
          navigate(state.from, { replace: true });
        }
      } else {
        // Default redirect to dashboard if no specific return location
        console.log("No state found, redirecting to dashboard");
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({ title: "Login Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
    // Apply Ghibli-esque background and centering
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] py-12 bg-[#F2FCE2] px-4">
        {/* Use a styled container instead of Card */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
        <div className="text-center">
          <LogIn className="mx-auto h-10 w-10 text-[#4FB8FF]" />
          <h1 className="text-3xl font-display font-bold mt-4 text-[#4FB8FF]">Welcome Back!</h1>
          <p className="text-[#6b7280] mt-2">Log in to continue your storytelling adventure.</p> {/* Adjusted text color */}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#6b7280]">Email</FormLabel> {/* Adjusted text color */}
                  <FormControl>
                    {/* Slightly rounded inputs */}
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
                  <FormLabel className="text-[#6b7280]">Password</FormLabel> {/* Adjusted text color */}
                  <FormControl>
                    <Input className="rounded-lg border-gray-300 focus:border-[#4FB8FF] focus:ring-[#4FB8FF]" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-[#4FB8FF] hover:bg-[#4FB8FF]/90 text-white rounded-full shadow-md h-11" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm text-[#6b7280]"> {/* Adjusted text color */}
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