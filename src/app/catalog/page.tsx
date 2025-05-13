
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMovies } from '@/lib/firebase/firestoreService';
import type { Movie } from '@/types/movie';
import MovieGrid from '@/components/catalog/MovieGrid';
import Header from '@/components/layout/Header';
import FeaturedMoviesSection from '@/components/catalog/FeaturedMoviesSection';
import { Loader2 } from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 12;
const FEATURED_MOVIES_COUNT = 5;

export default function CatalogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial page load (main grid)
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false); // For "Load More" button activity

  const initialLoadDone = useRef(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchMainMovies = useCallback(async (currentLastDoc: DocumentSnapshot | null, isInitialCall = false) => {
    if (isFetchingMore && !isInitialCall) { 
        return;
    }
    if (!isInitialCall && !hasMore) { 
        return;
    }

    if (isInitialCall) {
      setIsLoading(true); 
    }
    setIsFetchingMore(true); 

    try {
      const { movies: newMovies, lastVisible } = await getMovies(PAGE_SIZE, currentLastDoc);
      if (isMounted.current) {
        setMovies(prevMovies => {
          if (isInitialCall) return newMovies; 
          const existingMovieIds = new Set(prevMovies.map(m => m.id));
          const uniqueNewMovies = newMovies.filter(nm => !existingMovieIds.has(nm.id));
          return [...prevMovies, ...uniqueNewMovies];
        });
        setLastVisibleDoc(lastVisible);
        setHasMore(newMovies.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Failed to fetch more movies:", error);
      if (isMounted.current) setHasMore(false); 
    } finally {
      if (isMounted.current) {
        setIsFetchingMore(false);
        if (isInitialCall) {
          setIsLoading(false); 
        }
      }
    }
  }, [isFetchingMore, hasMore, setIsLoading, setIsFetchingMore, setMovies, setLastVisibleDoc, setHasMore]);

  const fetchFeaturedMovies = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoadingFeatured(true);
    try {
      const { movies: newFeaturedMovies } = await getMovies(FEATURED_MOVIES_COUNT, null);
      if (isMounted.current) {
        setFeaturedMovies(newFeaturedMovies);
      }
    } catch (error) {
      console.error("Failed to fetch featured movies:", error);
      if (isMounted.current) setFeaturedMovies([]); // Set to empty on error
    } finally {
      if (isMounted.current) {
        setIsLoadingFeatured(false);
      }
    }
  }, []);


  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      initialLoadDone.current = false; 
      if (isMounted.current) {
        setMovies([]);
        setFeaturedMovies([]);
        setLastVisibleDoc(null);
        setHasMore(true);
        setIsLoading(true); 
        setIsLoadingFeatured(true);
      }
      return;
    }

    if (user && !authLoading) {
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
         if (isMounted.current && !isLoadingFeatured && (featuredMovies.length > 0 || featuredMovies.length === 0)) {
           // If featured movies load attempt is done, ensure its loading state is false
         }
      }
    }
  }, [user, authLoading, router, fetchMainMovies, fetchFeaturedMovies]);


  if (authLoading || (isLoading && movies.length === 0 && hasMore && isLoadingFeatured && featuredMovies.length === 0)) { 
    return (
      <>
        <Header />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <FeaturedMoviesSection movies={featuredMovies} isLoading={isLoadingFeatured} />
        
        <h1 className="text-3xl font-bold mb-8 text-foreground">Movie Catalog</h1>
        {isLoading && movies.length === 0 && ( // Show grid loading only if it's the initial load for the grid
           <div className="flex justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && <MovieGrid movies={movies} />}
        
        {isFetchingMore && !isLoading && ( 
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
