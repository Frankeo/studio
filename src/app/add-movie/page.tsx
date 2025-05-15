
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clapperboard, Loader2, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { addMovieToFirestore } from '@/lib/firebase/firestoreService';
import GlobalLoader from '@/components/layout/GlobalLoader';
import type { Movie } from '@/types/movie';

const movieSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title must be 100 characters or less." }),
  description: z.string().min(1, { message: "Description is required." }).max(1000, { message: "Description must be 1000 characters or less." }),
  posterUrl: z.string().url({ message: "Please enter a valid URL for the poster." }).optional().or(z.literal('')),
  videoUrl: z.string().url({ message: "Please enter a valid URL for the video." }),
  genre: z.string().min(1, { message: "Genre is required." }).max(50, { message: "Genre must be 50 characters or less." }),
  duration: z.string().min(1, { message: "Duration is required." }).regex(/^\d+h(\s\d+m)?$/, { message: "Duration must be in format like '2h' or '1h 30m'." }),
  rating: z.coerce.number().min(0).max(5, { message: "Rating must be between 0 and 5." }),
  year: z.coerce.number().min(1800, { message: "Year must be 1800 or later." }).max(new Date().getFullYear() + 5, { message: `Year cannot be too far in the future.` }),
});

type MovieFormInputs = z.infer<typeof movieSchema>;

export default function AddMoviePage() {
  const { user, loading: authLoading, userProfileData, loadingProfile, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MovieFormInputs>({
    resolver: zodResolver(movieSchema),
    defaultValues: { 
        title: '',
        description: '',
        posterUrl: '',
        videoUrl: '',
        genre: '',
        duration: '',
        rating: 0,
        year: new Date().getFullYear(),
    }
  });

  useEffect(() => {
    if (!authLoading && !loadingProfile) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user && !user.emailVerified) {
        toast({
          title: "Email Verification Required",
          description: "Please verify your email to access this page.",
          variant: "destructive",
        });
        signOut();
        router.replace('/login');
        return;
      }
      if (!userProfileData?.isAdmin) {
        toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive" });
        router.replace('/catalog');
      }
    }
  }, [user, authLoading, userProfileData, loadingProfile, router, toast, signOut]);

  const onSubmit: SubmitHandler<MovieFormInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      const movieData: Omit<Movie, 'id'> = {
        ...data,
        posterUrl: data.posterUrl || `https://placehold.co/300x450.png`, 
      };
      const newMovieId = await addMovieToFirestore(movieData);
      toast({ title: 'Movie Added', description: `"${data.title}" has been successfully added with ID: ${newMovieId}.` });
      reset(); 
    } catch (error) {
      console.error("Error adding movie:", error);
      toast({
        title: 'Failed to Add Movie',
        description: (error as Error).message || 'Could not add the movie to the database.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loadingProfile || (!user && !authLoading) || (user && !user.emailVerified && !authLoading) || (user && user.emailVerified && !userProfileData && !loadingProfile) ) {
    return <GlobalLoader />;
  }

  // Fallback if effects haven't caught redirection yet or if admin check fails after loading
  if (!user || !user.emailVerified || !userProfileData?.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 text-center">
          <Clapperboard className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
          <p>Loading or checking permissions...</p>
        </main>
         <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
          © {new Date().getFullYear()} StreamVerse. All rights reserved.
        </footer>
      </div>
    );
  }

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
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center">
              <PlusCircle className="mr-3 h-8 w-8 text-primary" /> Add New Movie
            </CardTitle>
            <CardDescription>Fill in the details below to add a new movie to the catalog.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register('title')} disabled={isSubmitting} className={errors.title ? 'border-destructive' : ''} />
                {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} disabled={isSubmitting} rows={4} className={errors.description ? 'border-destructive' : ''} />
                {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="posterUrl">Poster URL (Optional)</Label>
                  <Input id="posterUrl" type="url" {...register('posterUrl')} placeholder="https://example.com/poster.jpg" disabled={isSubmitting} className={errors.posterUrl ? 'border-destructive' : ''} />
                  {errors.posterUrl && <p className="text-sm text-destructive mt-1">{errors.posterUrl.message}</p>}
                </div>
                <div>
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <Input id="videoUrl" type="url" {...register('videoUrl')} placeholder="https://example.com/video.mp4" disabled={isSubmitting} className={errors.videoUrl ? 'border-destructive' : ''} />
                  {errors.videoUrl && <p className="text-sm text-destructive mt-1">{errors.videoUrl.message}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input id="genre" {...register('genre')} disabled={isSubmitting} className={errors.genre ? 'border-destructive' : ''} />
                  {errors.genre && <p className="text-sm text-destructive mt-1">{errors.genre.message}</p>}
                </div>
                <div>
                  <Label htmlFor="duration">Duration (e.g., 2h or 1h 30m)</Label>
                  <Input id="duration" {...register('duration')} placeholder="2h 15m" disabled={isSubmitting} className={errors.duration ? 'border-destructive' : ''} />
                  {errors.duration && <p className="text-sm text-destructive mt-1">{errors.duration.message}</p>}
                </div>
              </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="rating">Rating (0-5)</Label>
                  <Input id="rating" type="number" step="0.1" {...register('rating')} disabled={isSubmitting} className={errors.rating ? 'border-destructive' : ''} />
                  {errors.rating && <p className="text-sm text-destructive mt-1">{errors.rating.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" type="number" {...register('year')} disabled={isSubmitting} className={errors.year ? 'border-destructive' : ''} />
                  {errors.year && <p className="text-sm text-destructive mt-1">{errors.year.message}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add Movie
              </Button>
            </form>
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
