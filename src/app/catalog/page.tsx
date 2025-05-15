
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMovies } from '@/lib/firebase/firestoreService';
import type { Movie } from '@/types/movie';
import MovieGrid from '@/components/catalog/MovieGrid';
import Header from '@/components/layout/Header';
import FeaturedMoviesSection from '@/components/catalog/FeaturedMoviesSection';
import { Clapperboard } from 'lucide-react'; 
import type { DocumentSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 12;
const FEATURED_MOVIES_COUNT = 5;

export default function CatalogPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const initialLoadDone = useRef(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user && !user.emailVerified) {
        toast({
          title: "Email Verification Required",
          description: "Please verify your email address to access the platform. Check your inbox.",
          variant: "destructive",
        });
        signOut(); // Sign out from context and firebase
        router.replace('/login');
        return;
      }
      // User is authenticated and verified
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        if (isMounted.current) {
          setMovies([]);
          setFeaturedMovies([]);
          setLastVisibleDoc(null);
          setHasMore(true);
        }
        fetchFeaturedMovies();
        fetchMainMovies(null, true);
      } else {
         if (isMounted.current && !isFetchingMore && (movies.length > 0 || !hasMore)) {
          setIsLoading(false);
        }
      }
    }
  }, [user, authLoading, router, toast, signOut, fetchMainMovies, fetchFeaturedMovies, movies.length, hasMore, isFetchingMore]);


  const fetchMainMovies = useCallback(async (currentLastDoc: DocumentSnapshot | null, isInitialCall = false) => {
    if (isFetchingMore && !isInitialCall) return;
    if (!isInitialCall && !hasMore) return;

    if (isInitialCall) setIsLoading(true);
    setIsFetchingMore(true);

    try {
      const { movies: newMovies, lastVisible } = await getMovies(PAGE_SIZE, currentLastDoc);
      if (isMounted.current) {
        setMovies(prevMovies => isInitialCall ? newMovies : [...prevMovies, ...newMovies.filter(nm => !prevMovies.find(pm => pm.id === nm.id))]);
        setLastVisibleDoc(lastVisible);
        setHasMore(newMovies.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Failed to fetch more movies:", error);
      if (isMounted.current) setHasMore(false);
    } finally {
      if (isMounted.current) {
        setIsFetchingMore(false);
        if (isInitialCall) setIsLoading(false);
      }
    }
  }, [isFetchingMore, hasMore]); // Removed dependencies that are stable or managed by other effects

  const fetchFeaturedMovies = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoadingFeatured(true);
    try {
      const { movies: newFeaturedMovies } = await getMovies(FEATURED_MOVIES_COUNT, null);
      if (isMounted.current) setFeaturedMovies(newFeaturedMovies);
    } catch (error) {
      console.error("Failed to fetch featured movies:", error);
      if (isMounted.current) setFeaturedMovies([]);
    } finally {
      if (isMounted.current) setIsLoadingFeatured(false);
    }
  }, []);


  if (authLoading || (!user && !authLoading) || (user && !user.emailVerified && !authLoading)) { 
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
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <FeaturedMoviesSection movies={featuredMovies} isLoading={isLoadingFeatured} />
        
        <h1 className="text-3xl font-bold mb-8 text-foreground">Movie Catalog</h1>
        {isLoading && movies.length === 0 && ( 
           <div className="flex justify-center py-10">
            <Clapperboard className="h-12 w-12 text-primary animate-pulse" />
          </div>
        )}
        {!isLoading && <MovieGrid movies={movies} />}
        
        {isFetchingMore && !isLoading && ( 
          <div className="flex justify-center py-4">
            <Clapperboard className="h-10 w-10 text-primary animate-pulse" />
          </div>
        )}
        {!isFetchingMore && hasMore && movies.length > 0 && !isLoading && (
          <div className="text-center mt-8">
            <Button onClick={() => fetchMainMovies(lastVisibleDoc, false)} variant="outline" disabled={isFetchingMore}>
              {isFetchingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
        {!hasMore && movies.length > 0 && !isLoading && (
           <p className="text-center text-muted-foreground mt-8">You&apos;ve reached the end of the catalog.</p>
        )}
        {!isLoading && !isFetchingMore && movies.length === 0 && !hasMore && (
             <p className="text-center text-muted-foreground mt-8">The catalog is currently empty.</p>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} StreamVerse. All rights reserved.
      </footer>
    </div>
  );
}
