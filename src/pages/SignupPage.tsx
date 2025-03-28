// src/pages/SignupPage.tsx
import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Add name to schema
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

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    try {
      // Pass name in options.data for the trigger
      await signup({
        email: data.email,
        password: data.password,
        options: {
            data: { name: data.name } // Pass name here
        }
      });
      toast({ title: "Signup Successful!", description: "Please check your email to verify your account." });
      // Don't navigate immediately, wait for verification or login
      // navigate('/dashboard');
    } catch (error: any) {
      console.error("Signup failed:", error);
      toast({ title: "Signup Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
     <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Enter your information to create an account.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
               <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} type="email" />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
               <div className="mt-4 text-center text-sm">
                 Already have an account?{' '}
                 <Link to="/login" className="underline">Sign in</Link>
               </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SignupPage;