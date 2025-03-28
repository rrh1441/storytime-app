// src/pages/LoginPage.tsx
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
import { Loader2 } from 'lucide-react'; // For loading spinner

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    try {
      await login({ email: data.email, password: data.password });
      toast({ title: "Login Successful!", description: "Welcome back!" });
      navigate('/dashboard'); // Redirect after successful login
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({ title: "Login Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
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
                Sign In
              </Button>
               <div className="mt-4 text-center text-sm">
                 Don't have an account?{' '}
                 <Link to="/signup" className="underline">Sign up</Link>
               </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;