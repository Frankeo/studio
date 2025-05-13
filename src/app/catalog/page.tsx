
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMovies } from '@/lib/firebase/firestoreService';
import type { Movie } from '@/types/movie';
import MovieGrid from '@/components/catalog/MovieGrid';
import Header from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial page load
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

  const fetchMoreMovies = useCallback(async (currentLastDoc: DocumentSnapshot | null, isInitialCall = false) => {
    if (isFetchingMore && !isInitialCall) { // Prevent multiple simultaneous fetches for "Load More"
        return;
    }
    if (!isInitialCall && !hasMore) { // Don't fetch if not initial and no more movies
        return;
    }

    if (isInitialCall) {
      setIsLoading(true); // Main page loader for the very first fetch
    }
    setIsFetchingMore(true); // Indicate an active fetch operation (for button or initial)

    try {
      const { movies: newMovies, lastVisible } = await getMovies(PAGE_SIZE, currentLastDoc);
      if (isMounted.current) {
        setMovies(prevMovies => {
          if (isInitialCall) return newMovies; // Initial load, replace movies
          // Subsequent loads, append new unique movies
          const existingMovieIds = new Set(prevMovies.map(m => m.id));
          const uniqueNewMovies = newMovies.filter(nm => !existingMovieIds.has(nm.id));
          return [...prevMovies, ...uniqueNewMovies];
        });
        setLastVisibleDoc(lastVisible);
        setHasMore(newMovies.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Failed to fetch more movies:", error);
      if (isMounted.current) setHasMore(false); // Stop trying if error
    } finally {
      if (isMounted.current) {
        setIsFetchingMore(false);
        if (isInitialCall) {
          setIsLoading(false); // Turn off main page loader after initial fetch
        }
      }
    }
  }, [isFetchingMore, hasMore, setIsLoading, setIsFetchingMore, setMovies, setLastVisibleDoc, setHasMore]);


  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      initialLoadDone.current = false; // Reset for next login
      if (isMounted.current) {
        setMovies([]);
        setLastVisibleDoc(null);
        setHasMore(true);
        setIsLoading(true); // Show loader while redirecting
      }
      return;
    }

    if (user && !authLoading) {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        // Prepare for initial load
        if (isMounted.current) {
          setMovies([]); // Clear any existing movies
          setLastVisibleDoc(null);
          setHasMore(true); // Assume there's data
        }
        fetchMoreMovies(null, true); // true signifies initial call
      } else {
        // Initial load already attempted for this user session.
        // Ensure isLoading is false if we are not fetching and movies are present, or if catalog is empty.
        if (isMounted.current && !isFetchingMore && (movies.length > 0 || !hasMore)) {
          setIsLoading(false);
        }
      }
    }
  }, [user, authLoading, router, fetchMoreMovies]);


  if (authLoading || (isLoading && movies.length === 0 && hasMore) ) { // Show loader if auth loading, or initial content is loading
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
        <h1 className="text-3xl font-bold mb-8 text-foreground">Movie Catalog</h1>
        <MovieGrid movies={movies} />
        {isFetchingMore && !isLoading && ( // Show this loader only for "Load More" clicks, not during initial full page load
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isFetchingMore && hasMore && movies.length > 0 && (
          <div className="text-center mt-8">
            <Button onClick={() => fetchMoreMovies(lastVisibleDoc, false)} variant="outline" disabled={isFetchingMore}>
              {isFetchingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
        {!hasMore && movies.length > 0 && (
           <p className="text-center text-muted-foreground mt-8">You&apos;ve reached the end of the catalog.</p>
        )}
         {/* Case for empty catalog after initial load */}
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

