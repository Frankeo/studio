
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clapperboard, Edit3, UserCircle, Loader2 } from 'lucide-react';
import { getUserInitials } from '@/lib/utils'; 
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const profileSchema = z.object({
  displayName: z.string().max(50, { message: "Display name must be 50 characters or less." }).optional().or(z.literal('')),
  photoURL: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type ProfileFormInputs = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserProfile, userProfileData, loadingProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormInputs>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      photoURL: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
    if (user) {
      reset({
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
      });
    }
  }, [user, authLoading, router, reset]);

  const onSubmit: SubmitHandler<ProfileFormInputs> = async (data) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const updates: { displayName?: string | null; photoURL?: string | null } = {};
      if (data.displayName !== user.displayName) {
        updates.displayName = data.displayName || null; 
      }
      if (data.photoURL !== user.photoURL) {
        updates.photoURL = data.photoURL || null; 
      }

      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates);
        toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });
        setIsEditing(false);
      } else {
        toast({ title: 'No Changes', description: 'No changes were made to your profile.', variant: 'default' });
        setIsEditing(false);
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: (error as Error).message || 'Could not update profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPhotoURL = watch('photoURL');

  if (authLoading || (!user && !authLoading) || (user && loadingProfile && !userProfileData) ) {
    return (
      <>
        <Header />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Clapperboard className="h-16 w-16 text-primary animate-pulse" />
        </div>
        <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
          © {new Date().getFullYear()} StreamVerse. All rights reserved.
        </footer>
      </>
    );
  }
  
  if (!user) {
     return (
       <>
        <Header />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <p>Redirecting to login...</p>
        </div>
         <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
          © {new Date().getFullYear()} StreamVerse. All rights reserved.
        </footer>
      </>
    );
  }

  const getProviderName = (providerId: string) => {
    switch (providerId) {
      case 'password': return 'Email/Password';
      case 'google.com': return 'Google';
      case 'facebook.com': return 'Facebook';
      case 'twitter.com': return 'Twitter';
      case 'github.com': return 'GitHub';
      default: return providerId;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/catalog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Catalog
            </Link>
          </Button>
        </div>

        <Card className="w-full max-w-2xl mx-auto shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Avatar className="h-24 w-24 border-2 border-primary">
                <AvatarImage src={currentPhotoURL || user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                <AvatarFallback className="text-3xl">
                {getUserInitials(user) || <UserCircle className="h-12 w-12" />} 
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-3xl font-bold">User Profile</CardTitle>
            <CardDescription>View and manage your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                  disabled={!isEditing || isSubmitting}
                  className={errors.displayName ? 'border-destructive' : ''}
                />
                {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
              </div>

              <div>
                <Label htmlFor="photoURL">Photo URL</Label>
                <Input
                  id="photoURL"
                  type="url"
                  {...register('photoURL')}
                  disabled={!isEditing || isSubmitting}
                  className={errors.photoURL ? 'border-destructive' : ''}
                  placeholder="https://example.com/image.png"
                />
                {errors.photoURL && <p className="text-sm text-destructive mt-1">{errors.photoURL.message}</p>}
              </div>
              
              {isEditing && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setIsEditing(false); reset({ displayName: user.displayName || '', photoURL: user.photoURL || '' }); }} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              )}
            </form>

            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            )}

            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><strong className="text-muted-foreground">Email:</strong> {user.email || 'N/A'}</div>
                <div><strong className="text-muted-foreground">Provider:</strong> {user.providerData.length > 0 ? getProviderName(user.providerData[0].providerId) : 'N/A'}</div>
                <div><strong className="text-muted-foreground">Account Created:</strong> {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</div>
                <div><strong className="text-muted-foreground">Last Sign-in:</strong> {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}</div>
                <div>
                  <strong className="text-muted-foreground">Admin Status:</strong>{' '}
                  {loadingProfile ? (
                    <Skeleton className="h-4 w-10 inline-block" />
                  ) : userProfileData ? (
                    userProfileData.isAdmin ? 'Yes' : 'No'
                  ) : (
                    'N/A'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
           <CardFooter />
        </Card>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} StreamVerse. All rights reserved.
      </footer>
    </div>
  );
}
