
"use client";

import type { Movie } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, PlayCircle, Info } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface FeaturedMoviesSectionProps {
  movies: Movie[];
  isLoading: boolean;
}

export default function FeaturedMoviesSection({ movies, isLoading }: FeaturedMoviesSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    if (movies.length === 0) return;
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? movies.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
 console.log('Current index:', newIndex);
  }, [currentIndex, movies.length]);

  const goToNext = useCallback(() => {
    if (movies.length === 0) return;
    const isLastSlide = currentIndex === movies.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
 console.log('Current index:', newIndex);
  }, [currentIndex, movies.length]);

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
 console.log('Current index:', slideIndex);
  };
 console.log('Current index:', currentIndex);

  useEffect(() => {
    if (movies.length > 1) { // Only auto-scroll if there's more than one movie
      const timer = setTimeout(() => {
        goToNext();
        console.log('Timer fired, calling goToNext');
      }, 7000); // Change slide every 7 seconds
      return () => clearTimeout(timer);
    }
  }, [currentIndex, movies.length, goToNext]);

  if (isLoading) {
    return (
      <section className="mb-12">
        <div className="relative w-full aspect-[16/7] md:aspect-[16/6] lg:aspect-[16/5] overflow-hidden rounded-lg bg-card shadow-2xl">
          <Skeleton className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
            <Skeleton className="h-10 w-3/4 md:w-1/2 mb-4 rounded" /> {/* Title Skeleton */}
            <Skeleton className="h-5 w-full md:w-3/4 mb-2 rounded" /> {/* Description Line 1 Skeleton */}
            <Skeleton className="h-5 w-2/3 md:w-1/2 mb-6 rounded" />   {/* Description Line 2 Skeleton */}
            <div className="flex space-x-3">
              <Skeleton className="h-12 w-28 rounded-md" /> {/* Play Button Skeleton */}
              <Skeleton className="h-12 w-32 rounded-md" /> {/* More Info Button Skeleton */}
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
      <div className="relative w-full aspect-[16/7] md:aspect-[16/6] lg:aspect-[16/5] overflow-hidden rounded-lg shadow-2xl group">
        {/* Slides container */}
        <div
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {movies.map((movie, index) => (
            <div key={movie.id} className="relative w-full flex-shrink-0 h-full">
              <Image
                src={movie.posterUrl || `https://picsum.photos/seed/${movie.id}/1280/720`}
                alt={`Banner for ${movie.title}`}
                layout="fill"
                objectFit="cover"
                className="brightness-75 group-hover:brightness-90 transition-all duration-300"
                data-ai-hint="movie banner"
                priority={index === 0} // Prioritize loading the first image
              />
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 md:mb-4 line-clamp-2 shadow-text">
                  {movie.title}
                </h3>
                <p className="text-sm md:text-base text-neutral-200 mb-4 md:mb-6 line-clamp-2 md:line-clamp-3 shadow-text max-w-prose">
                  {movie.description}
                </p>
                <div className="flex space-x-3">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href={`/player/${movie.id}`}>
                      <PlayCircle className="mr-2 h-5 w-5 md:h-6 md:w-6" /> Play
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg" className="bg-secondary/70 hover:bg-secondary/90 text-secondary-foreground">
                    <Link href={`/player/${movie.id}`}> {/* Or a dedicated info page if exists */}
                      <Info className="mr-2 h-5 w-5 md:h-6 md:w-6" /> More Info
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {movies.length > 1 && (
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
            {movies.map((_, slideIndex) => (
              <button
                key={`dot-${slideIndex}`}
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
