
"use client";

import type { Movie } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, PlayCircle, Info } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile
import { cn } from '@/lib/utils';

interface FeaturedMoviesSectionProps {
  movies: Movie[];
  isLoading: boolean;
}

const SWIPE_THRESHOLD = 50; // Minimum pixels to move for it to be considered a swipe

export default function FeaturedMoviesSection({ movies, isLoading }: FeaturedMoviesSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMobile = useIsMobile(); // Determine if on mobile
  const touchStartXRef = useRef<number | null>(null); // For touch swipe

  const goToPrevious = useCallback(() => {
    if (movies.length === 0) return;
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? movies.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, movies.length]);

  const goToNext = useCallback(() => {
    if (movies.length === 0) return;
    const isLastSlide = currentIndex === movies.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, movies.length]);

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
  };

  useEffect(() => {
    if (movies.length > 1) { 
      const timer = setTimeout(() => {
        goToNext();
      }, 7000); 
      return () => clearTimeout(timer);
    }
  }, [currentIndex, movies.length, goToNext]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || !isMobile) {
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;

    if (Math.abs(diffX) > SWIPE_THRESHOLD) {
      if (diffX > 0) { // Swiped right
        goToPrevious();
      } else { // Swiped left
        goToNext();
      }
    }
    touchStartXRef.current = null; // Reset for next touch
  };


  if (isLoading) {
    return (
      <section className="mb-12">
        <div className="relative w-full aspect-[16/7] md:aspect-[16/6] lg:aspect-[16/5] overflow-hidden rounded-lg bg-card shadow-2xl">
          <Skeleton className="absolute inset-0 w-full h-full" />
          <div className={cn(
              "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/30 to-transparent",
              isMobile ? "pt-4 px-4 pb-12" : "p-6 md:p-10 lg:p-16" // Adjusted mobile padding
            )}>
            <Skeleton className="h-8 md:h-10 w-3/4 md:w-1/2 mb-3 md:mb-4 rounded" aria-label="Title Skeleton" />
            {!isMobile && (
              <>
                <Skeleton className="h-4 md:h-5 w-full md:w-3/4 mb-1 md:mb-2 rounded" />
                <Skeleton className="h-4 md:h-5 w-2/3 md:w-1/2 mb-4 md:mb-6 rounded" />
              </>
            )}
            <div className={cn("flex", isMobile ? "justify-center" : "space-x-3")}>
              <Skeleton className={cn("rounded-md", isMobile ? "h-10 w-24" : "h-12 w-28")} /> {/* Play Button Skeleton */}
              {!isMobile && <Skeleton className="h-12 w-32 rounded-md" />} {/* More Info Button Skeleton */}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div 
        className="relative w-full aspect-[16/7] md:aspect-[16/6] lg:aspect-[16/5] overflow-hidden rounded-lg shadow-2xl group"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides container */}
        <div
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {movies.map((movie, index) => (
            <div key={movie.id} className="relative w-full flex-shrink-0 h-full">
              <Image
                src={movie.posterUrl || `https://placehold.co/1280x720.png`}
                alt={`Banner for ${movie.title}`}
                layout="fill"
                objectFit="cover"
                className="brightness-75 group-hover:brightness-90 transition-all duration-300"
                data-ai-hint="movie banner"
                priority={index === 0} 
              />
              <div className={cn(
                  "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent",
                  isMobile ? "pt-4 px-4 pb-12" : "p-6 md:p-10 lg:p-16" 
                )}>
                <h3 className={cn(
                    "font-bold text-white line-clamp-2 shadow-text break-words", // Added break-words
                    isMobile ? "text-2xl mb-4" : "text-3xl md:text-4xl lg:text-5xl mb-3 md:mb-4" // Increased mb for mobile
                  )}>
                  {movie.title}
                </h3>
                {!isMobile && (
                  <p className="text-sm md:text-base text-neutral-200 mb-4 md:mb-6 line-clamp-2 md:line-clamp-3 shadow-text max-w-prose">
                    {movie.description}
                  </p>
                )}
                <div className={cn("flex", isMobile ? "justify-center" : "space-x-3")}>
                  <Button 
                    asChild 
                    size={isMobile ? "default" : "lg"} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Link href={`/player/${movie.id}`}>
                      <PlayCircle className={cn("mr-2", isMobile ? "h-5 w-5" : "h-5 w-5 md:h-6 md:w-6")} /> Play
                    </Link>
                  </Button>
                  {!isMobile && (
                    <Button 
                      asChild 
                      variant="secondary" 
                      size="lg" 
                      className="bg-secondary/70 hover:bg-secondary/90 text-secondary-foreground"
                    >
                      <Link href={`/player/${movie.id}`}> 
                        <Info className="mr-2 h-5 w-5 md:h-6 md:w-6" /> More Info
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows - Hidden on mobile */}
        {!isMobile && movies.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 left-2 md:left-4 transform -translate-y-1/2 rounded-full bg-black/20 hover:bg-black/50 text-white hover:text-white h-10 w-10 md:h-12 md:w-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={goToPrevious}
              aria-label="Previous movie"
            >
              <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-2 md:right-4 transform -translate-y-1/2 rounded-full bg-black/20 hover:bg-black/50 text-white hover:text-white h-10 w-10 md:h-12 md:w-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={goToNext}
              aria-label="Next movie"
            >
              <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
            </Button>
          </>
        )}

        {/* Dot Indicators */}
        {movies.length > 1 && (
          <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {movies.map((movie, slideIndex) => ( 
              <button
                key={`dot-${movie.id}-${slideIndex}`} 
                onClick={() => goToSlide(slideIndex)}
                className={`h-2.5 w-2.5 md:h-3 md:w-3 rounded-full transition-all duration-300 ease-in-out ${
                  currentIndex === slideIndex ? 'bg-primary scale-125' : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${slideIndex + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

