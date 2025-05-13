
"use client";

import type { Movie } from '@/types/movie';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  movie: Movie;
}

export default function VideoPlayerComponent({ movie }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(true); // Start as paused to handle autoplay policies
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const handlePlay = () => setIsPaused(false);
      const handlePause = () => setIsPaused(true);
      
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('playing', handlePlay);
      videoElement.addEventListener('pause', handlePause);

      videoElement.play().then(() => {
        setIsPaused(false);
      }).catch((error) => {
        console.warn("Autoplay prevented or failed:", error);
        setIsPaused(true); 
      });

      return () => {
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('playing', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
      };
    }
  }, [movie.id]);

  const handleResumePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  if (!movie.videoUrl) {
    return (
      <div className="aspect-video w-full bg-black flex flex-col items-center justify-center text-foreground p-4 rounded-lg shadow-2xl">
        <p className="text-lg font-semibold">Video source not available for {movie.title}.</p>
        <p className="text-sm text-muted-foreground mt-1" data-ai-hint="video unavailable message">This might be due to missing configuration or data.</p>
      </div>
    );
  }

  return (
    <div 
      className="relative aspect-video w-full bg-black rounded-lg overflow-hidden shadow-2xl"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        src={movie.videoUrl}
        controls
        className="w-full h-full"
        poster={movie.posterUrl || `https://picsum.photos/seed/${movie.id}-poster/1280/720`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
        onClick={() => { 
            if (videoRef.current) {
                if (videoRef.current.paused) videoRef.current.play();
                else videoRef.current.pause();
            }
        }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Pause Overlay */}
      {isPaused && (
        <div 
            className="absolute inset-0 bg-black/80 z-20"
            // Stop propagation so clicking on info part of overlay doesn't trigger video's onClick if it's also listening
            onClick={(e) => e.stopPropagation()} 
        >
          {/* Info Section - Top Left */}
          <div className="absolute top-0 left-0 p-4 md:p-6 max-w-sm text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2 shadow-text">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-300 mb-3">
              <span>{movie.year}</span>
              <span aria-hidden="true">&bull;</span>
              <span>{movie.duration}</span>
              <span aria-hidden="true">&bull;</span>
              <span className="capitalize">{movie.genre}</span>
              <span aria-hidden="true">&bull;</span>
              <span>Rating: {movie.rating}/5</span>
            </div>
            <p className="text-sm text-neutral-200 mb-4 leading-relaxed line-clamp-2 md:line-clamp-3 shadow-text">
              {movie.description}
            </p>
          </div>

          {/* Resume Button - Center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Button 
                onClick={(e) => { e.stopPropagation(); handleResumePlay(); }} 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base md:text-lg px-6 py-3 md:px-8 md:py-4 rounded-full shadow-lg"
                aria-label={`Resume playing ${movie.title}`}
            >
              <Play className="mr-2 h-6 w-6 md:h-7 md:w-7" fill="currentColor" /> Resume Play
            </Button>
          </div>
        </div>
      )}

      {/* Hover Info Overlay (Top-Left) */}
      {isHovering && !isPaused && (
        <div
          className="absolute top-0 left-0 h-full w-full max-w-xs sm:max-w-sm md:max-w-md bg-gradient-to-r from-black/80 via-black/60 to-transparent p-4 md:p-6 flex flex-col justify-start text-white transition-opacity duration-300 ease-in-out pointer-events-none z-10"
        >
          <div className="space-y-1 md:space-y-2">
            <h2 className="text-xl md:text-2xl font-bold line-clamp-2 shadow-text">{movie.title}</h2>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-300">
              <span>{movie.year}</span>
              <span aria-hidden="true">&bull;</span>
              <span>{movie.duration}</span>
              <span aria-hidden="true">&bull;</span>
              <span className="capitalize">{movie.genre}</span>
            </div>
            <p className="text-xs md:text-sm text-neutral-200 leading-relaxed line-clamp-2 md:line-clamp-3 shadow-text">
              {movie.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
