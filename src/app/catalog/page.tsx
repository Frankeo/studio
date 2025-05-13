"use client";

import { useEffect, useState, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchMoreMovies = useCallback(async (currentLastDoc: DocumentSnapshot | null) => {
    if (!hasMore || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const { movies: newMovies, lastVisible } = await getMovies(PAGE_SIZE, currentLastDoc);
      setMovies(prevMovies => [...prevMovies, ...newMovies]);
      setLastVisibleDoc(lastVisible);
      setHasMore(newMovies.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch more movies:", error);
      // Potentially show a toast message here
    } finally {
      setIsFetchingMore(false);
      setIsLoading(false); // Also set main loading to false after initial fetch
    }
  }, [hasMore, isFetchingMore]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (user) {
      setIsLoading(true); // Set loading true for initial fetch
      setMovies([]); // Reset movies for initial fetch
      setLastVisibleDoc(null); // Reset last visible doc
      setHasMore(true); // Reset hasMore
      fetchMoreMovies(null); // Initial fetch
    }
  }, [user, authLoading, router, fetchMoreMovies]);


  if (authLoading || (isLoading && movies.length === 0)) {
    return (
      <>
        <Header />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
       <>
        <Header />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <p>Redirecting to login...</p>
        </div>
      </>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Movie Catalog</h1>
        <MovieGrid movies={movies} />
        {isFetchingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isFetchingMore && hasMore && movies.length > 0 && (
          <div className="text-center mt-8">
            <Button onClick={() => fetchMoreMovies(lastVisibleDoc)} variant="outline" disabled={isFetchingMore}>
              {isFetchingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
        {!hasMore && movies.length > 0 && (
           <p className="text-center text-muted-foreground mt-8">You&apos;ve reached the end of the catalog.</p>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} StreamVerse. All rights reserved.
      </footer>
    </div>
  );
}
