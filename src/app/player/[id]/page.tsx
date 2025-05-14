
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMovieById } from '@/lib/firebase/firestoreService';
import type { Movie } from '@/types/movie';
import Header from '@/components/layout/Header';
import VideoPlayerComponent from '@/components/player/VideoPlayerComponent';
import { Clapperboard, ArrowLeft } from 'lucide-react'; // Changed from Loader2
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast'; // Corrected import path

export default function PlayerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const movieId = params.id as string;
  const { toast } = useToast(); // useToast hook

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && movieId) {
      setIsLoading(true);
      getMovieById(movieId)
        .then((data) => {
          if (data) {
            setMovie(data);
          } else {
            toast({ title: "Error", description: "Movie not found.", variant: "destructive" });
            router.replace('/catalog');
          }
        })
        .catch(error => {
          console.error("Failed to fetch movie:", error);
          toast({ title: "Error", description: "Failed to load movie details.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    } else if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, movieId, router, authLoading, toast]);


  if (authLoading || isLoading) {
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

  if (!movie) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-semibold">Movie not found</h1>
          <p className="text-muted-foreground">The movie you are looking for does not exist or could not be loaded.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/catalog">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Catalog
            </Link>
          </Button>
        </div>
         <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
          © {new Date().getFullYear()} StreamVerse. All rights reserved.
        </footer>
      </>
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
        
        <VideoPlayerComponent movie={movie} />

      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} StreamVerse. All rights reserved.
      </footer>
    </div>
  );
}
