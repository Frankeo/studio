
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
      // Focus for keyboard controls, typically handled by browser on controls/autoplay
      // videoElement.focus(); 

      const handlePlay = () => setIsPaused(false);
      const handlePause = () => setIsPaused(true);
      
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('playing', handlePlay);
      videoElement.addEventListener('pause', handlePause);

      // Attempt to play, then set initial state based on whether it played
      videoElement.play().then(() => {
        setIsPaused(false);
      }).catch((error) => {
        // Autoplay was prevented (common browser policy) or another error occurred
        console.warn("Autoplay prevented or failed:", error);
        setIsPaused(true); // Ensure it's marked as paused
      });

      return () => {
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('playing', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
      };
    }
  }, [movie.id]); // Re-run if movie changes

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
        // autoPlay // Attempt autoplay, managed in useEffect now
        className="w-full h-full"
        poster={movie.posterUrl || `https://picsum.photos/seed/${movie.id}-poster/1280/720`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
        onClick={() => { // Allow clicking video to toggle play/pause if controls are hidden or for convenience
            if (videoRef.current) {
                if (videoRef.current.paused) videoRef.current.play();
                else videoRef.current.pause();
            }
        }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Pause Overlay (Centered) */}
      {isPaused && (
        <div 
            className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 md:p-8 text-white transition-opacity duration-300 ease-in-out z-20"
            // onClick={handleResumePlay} // Keep click on button for explicit action
        >
          <div className="text-center max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 line-clamp-2 shadow-text">{movie.title}</h1>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-neutral-300 mb-4">
              <span>{movie.year}</span>
              <span aria-hidden="true">&bull;</span>
              <span>{movie.duration}</span>
              <span aria-hidden="true">&bull;</span>
              <span className="capitalize">{movie.genre}</span>
              <span aria-hidden="true">&bull;</span>
              <span>Rating: {movie.rating}/5</span>
            </div>
            <p className="text-neutral-200 mb-6 leading-relaxed line-clamp-3 md:line-clamp-4 shadow-text">
              {movie.description}
            </p>
            <Button 
                onClick={(e) => { e.stopPropagation(); handleResumePlay(); }} 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                aria-label={`Resume playing ${movie.title}`}
            >
              <Play className="mr-2 h-5 w-5" fill="currentColor" /> Resume Play
            </Button>
          </div>
        </div>
      )}

      {/* Hover Info Overlay (Left-aligned) */}
      {isHovering && !isPaused && (
        <div
          className="absolute top-0 left-0 h-full w-full max-w-xs sm:max-w-sm md:max-w-md bg-gradient-to-r from-black/80 via-black/60 to-transparent p-4 md:p-6 flex flex-col justify-end text-white transition-opacity duration-300 ease-in-out pointer-events-none z-10"
        >
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold line-clamp-2 shadow-text">{movie.title}</h2>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-300">
              <span>{movie.year}</span>
              <span aria-hidden="true">&bull;</span>
              <span>{movie.duration}</span>
              <span aria-hidden="true">&bull;</span>
              <span className="capitalize">{movie.genre}</span>
              {/* Rating could be too much for hover, keeping it concise */}
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
