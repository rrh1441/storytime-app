// src/pages/SignupPage.tsx
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
import { Loader2, UserPlus } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(1, {message: "Name is required."}),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage: React.FC = () => {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    try {
      await signup({
        email: data.email,
        password: data.password,
        options: { data: { name: data.name } }
      });
      toast({ title: "Signup Successful!", description: "Welcome to StoryTime!" });
      
      // Redirect logic after successful signup
      const state = location.state as any;
      if (state && state.from) {
        if (state.returnToTab) {
          // Return to the specific tab in StoryCreator
          navigate(state.from.pathname, { 
            state: { returnToTab: state.returnToTab },
            replace: true 
          });
        } else {
          // Just return to the previous location
          navigate(state.from, { replace: true });
        }
      } else {
        // Default redirect to dashboard if no specific return location
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error("Signup failed:", error);
      toast({ title: "Signup Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
    // Apply Ghibli-esque background and centering
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] py-12 bg-[#F2FCE2] px-4">
      {/* Use a styled container instead of Card */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
        <div className="text-center">
          <UserPlus className="mx-auto h-10 w-10 text-[#06D6A0]" />
          <h1 className="text-3xl font-display font-bold mt-4 text-[#06D6A0]">Create Your Account</h1>
          <p className="text-[#6b7280] mt-2">Join StoryTime and start creating magical tales!</p> {/* Adjusted text color */}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#6b7280]">Name</FormLabel> {/* Adjusted text color */}
                  <FormControl>
                    <Input className="rounded-lg border-gray-300 focus:border-[#06D6A0] focus:ring-[#06D6A0]" placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#6b7280]">Email</FormLabel> {/* Adjusted text color */}
                  <FormControl>
                    <Input className="rounded-lg border-gray-300 focus:border-[#06D6A0] focus:ring-[#06D6A0]" placeholder="you@example.com" {...field} type="email" />
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
                    <Input className="rounded-lg border-gray-300 focus:border-[#06D6A0] focus:ring-[#06D6A0]" type="password" placeholder="6+ characters" {...field} />
                  </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-[#06D6A0] hover:bg-[#06D6A0]/90 text-white rounded-full shadow-md h-11" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm text-[#6b7280]"> {/* Adjusted text color */}
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#FF9F51] hover:text-[#FF9F51]/80 underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;