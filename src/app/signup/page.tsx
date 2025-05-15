
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clapperboard, Loader2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const signUpSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  displayName: z.string().max(50, { message: "Display name must be 50 characters or less." }).optional().or(z.literal('')),
  photoURL: z.string().url({ message: "Please enter a valid URL for the photo." }).optional().or(z.literal('')),
});

type SignUpFormInputs = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { signUpWithEmailAndPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormInputs>({
    resolver: zodResolver(signUpSchema),
     defaultValues: {
      email: '',
      password: '',
      displayName: '',
      photoURL: '',
    }
  });

  const onSubmit: SubmitHandler<SignUpFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      await signUpWithEmailAndPassword(data.email, data.password, data.displayName || undefined, data.photoURL || undefined);
      toast({ title: 'Sign Up Successful', description: 'Welcome! You are now logged in.' });
      router.push('/catalog');
    } catch (error) {
      toast({
        title: 'Sign Up Failed',
        description: (error as Error).message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center mb-4">
            <UserPlus className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
          <CardDescription>Join StreamVerse today!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
                aria-invalid={errors.email ? "true" : "false"}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
                aria-invalid={errors.password ? "true" : "false"}
                disabled={isLoading}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your Name"
                {...register('displayName')}
                className={errors.displayName ? 'border-destructive' : ''}
                aria-invalid={errors.displayName ? "true" : "false"}
                disabled={isLoading}
              />
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoURL">Photo URL (Optional)</Label>
              <Input
                id="photoURL"
                type="url"
                placeholder="https://example.com/avatar.png"
                {...register('photoURL')}
                className={errors.photoURL ? 'border-destructive' : ''}
                aria-invalid={errors.photoURL ? "true" : "false"}
                disabled={isLoading}
              />
              {errors.photoURL && <p className="text-sm text-destructive">{errors.photoURL.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          Already have an account? <Link href="/login" className="ml-1 underline text-primary hover:text-primary/80">Sign In</Link>
        </CardFooter>
      </Card>
       <footer className="py-6 mt-8 text-center text-sm text-muted-foreground border-t border-border w-full max-w-md">
        © {new Date().getFullYear()} StreamVerse. All rights reserved.
         <div className="flex justify-center items-center mt-2">
            <Clapperboard className="h-6 w-6 text-primary" />
          </div>
      </footer>
    </div>
  );
}
