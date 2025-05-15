
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
import { ArrowLeft, Clapperboard, Loader2, PlusCircle, UploadCloud, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { addMovieToFirestore } from '@/lib/firebase/firestoreService';
import { uploadVideoToFirebaseStorage, uploadImageToFirebaseStorage } from '@/lib/firebase/storageService';
import GlobalLoader from '@/components/layout/GlobalLoader';
import type { Movie } from '@/types/movie';

const MAX_VIDEO_SIZE_MB = 100;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ['video/mp4'];

const MAX_POSTER_SIZE_MB = 5;
const MAX_POSTER_SIZE_BYTES = MAX_POSTER_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const movieSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title must be 100 characters or less." }),
  description: z.string().min(1, { message: "Description is required." }).max(1000, { message: "Description must be 1000 characters or less." }),
  posterFile: z
    .custom<FileList>((val) => val === undefined || val instanceof FileList, "Poster file input is invalid.")
    .optional()
    .refine((files) => !files || files.length <= 1, "Please upload only one poster image.")
    .refine((files) => !files || files?.[0]?.size <= MAX_POSTER_SIZE_BYTES, `Max poster size is ${MAX_POSTER_SIZE_MB}MB.`)
    .refine(
      (files) => !files || (files?.[0] && ACCEPTED_IMAGE_TYPES.includes(files[0].type)),
      `Only ${ACCEPTED_IMAGE_TYPES.join(', ')} formats are supported for posters.`
    ),
  videoFile: z
    .custom<FileList>((val) => val instanceof FileList, "Video file input is required.")
    .refine((files) => files && files.length > 0, "A video file is required.")
    .refine((files) => files && files.length === 1, "Please upload only one video file.")
    .refine((files) => files?.[0]?.size <= MAX_VIDEO_SIZE_BYTES, `Max video file size is ${MAX_VIDEO_SIZE_MB}MB.`)
    .refine(
      (files) => files?.[0] && ACCEPTED_VIDEO_TYPES.includes(files[0].type),
      "Only .mp4 video format is supported."
    ),
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
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [posterUploadProgress, setPosterUploadProgress] = useState<number | null>(null);


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
        posterFile: undefined,
        videoFile: undefined,
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
    setVideoUploadProgress(null);
    setPosterUploadProgress(null);

    try {
      let uploadedPosterUrl = `https://placehold.co/300x450.png`; // Default placeholder
      const posterToUpload = data.posterFile?.[0];

      if (posterToUpload) {
        toast({ title: 'Uploading Poster...', description: 'Please wait while the poster is being uploaded.' });
        setPosterUploadProgress(0);
        uploadedPosterUrl = await uploadImageToFirebaseStorage(posterToUpload, 'posters');
        setPosterUploadProgress(100);
      }
      
      const videoToUpload = data.videoFile[0];
      let uploadedVideoUrl = '';

      if (!videoToUpload) {
         toast({ title: 'Error', description: 'Video file is missing or invalid.', variant: 'destructive' });
         setIsSubmitting(false);
         return;
      }
      
      toast({ title: 'Uploading Video...', description: 'Please wait while the video is being uploaded.' });
      setVideoUploadProgress(0); 
      uploadedVideoUrl = await uploadVideoToFirebaseStorage(videoToUpload, 'videos');
      setVideoUploadProgress(100);

      const movieData: Omit<Movie, 'id'> = {
        title: data.title,
        description: data.description,
        posterUrl: uploadedPosterUrl,
        videoUrl: uploadedVideoUrl,
        genre: data.genre,
        duration: data.duration,
        rating: data.rating,
        year: data.year,
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
      setVideoUploadProgress(null);
      setPosterUploadProgress(null);
    }
  };

  if (authLoading || loadingProfile || (!user && !authLoading) || (user && !user.emailVerified && !authLoading) || (user && user.emailVerified && !userProfileData && !loadingProfile) ) {
    return <GlobalLoader />;
  }

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

  const fileInputClasses = `
    file:mr-4 file:py-2 file:px-4
    file:rounded-full file:border-0
    file:text-sm file:font-semibold
    file:bg-primary/10 file:text-primary
    hover:file:bg-primary/20
  `;

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
                  <Label htmlFor="posterFile">Poster Image (Optional, Max {MAX_POSTER_SIZE_MB}MB)</Label>
                  <div className="flex items-center space-x-2">
                    <ImageIcon className={`h-5 w-5 ${errors.posterFile ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <Input 
                      id="posterFile" 
                      type="file" 
                      accept={ACCEPTED_IMAGE_TYPES.join(',')} 
                      {...register('posterFile')} 
                      disabled={isSubmitting} 
                      className={`${errors.posterFile ? 'border-destructive' : ''} ${fileInputClasses}`}
                    />
                  </div>
                  {errors.posterFile && <p className="text-sm text-destructive mt-1">{errors.posterFile.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">If left blank, a placeholder image will be used.</p>
                </div>
                <div>
                  <Label htmlFor="videoFile">Video File (MP4, Max {MAX_VIDEO_SIZE_MB}MB)</Label>
                  <div className="flex items-center space-x-2">
                    <UploadCloud className={`h-5 w-5 ${errors.videoFile ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <Input 
                      id="videoFile" 
                      type="file" 
                      accept="video/mp4" 
                      {...register('videoFile')} 
                      disabled={isSubmitting} 
                      className={`${errors.videoFile ? 'border-destructive' : ''} ${fileInputClasses}`}
                    />
                  </div>
                  {errors.videoFile && <p className="text-sm text-destructive mt-1">{errors.videoFile.message}</p>}
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
              
              {isSubmitting && (posterUploadProgress !== null || videoUploadProgress !== null) && (
                <div className="space-y-2">
                  {posterUploadProgress !== null && (
                    <div>
                      <Label className="text-xs">Poster Upload:</Label>
                      <div className="w-full bg-muted rounded-full h-2.5 dark:bg-gray-700 my-1">
                        <div 
                          className="bg-primary/70 h-2.5 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${posterUploadProgress}%` }}
                          role="progressbar"
                          aria-valuenow={posterUploadProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        {posterUploadProgress < 100 ? `Uploading poster... ${posterUploadProgress}%` : 'Poster uploaded!'}
                      </p>
                    </div>
                  )}
                  {videoUploadProgress !== null && (
                     <div>
                      <Label className="text-xs">Video Upload:</Label>
                      <div className="w-full bg-muted rounded-full h-2.5 dark:bg-gray-700 my-1">
                        <div 
                          className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${videoUploadProgress}%` }}
                          role="progressbar"
                          aria-valuenow={videoUploadProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                       <p className="text-xs text-center text-muted-foreground">
                        {videoUploadProgress < 100 ? `Uploading video... ${videoUploadProgress}%` : 'Video uploaded! Processing movie...'}
                      </p>
                    </div>
                  )}
                </div>
              )}


              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {isSubmitting ? 
                  (posterUploadProgress !== null && posterUploadProgress < 100 ? 'Uploading Poster...' : 
                  (videoUploadProgress !== null && videoUploadProgress < 100 ? 'Uploading Video...' : 'Adding Movie...')) 
                  : 'Add Movie'}
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
