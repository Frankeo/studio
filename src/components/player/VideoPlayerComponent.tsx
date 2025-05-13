
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
  const [isPaused, setIsPaused] = useState(false); // Initially true to show info if autoplay is delayed or fails
  const [showOverlay, setShowOverlay] = useState(false);


  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.focus(); // Focus for keyboard controls

      const handlePlay = () => {
        setIsPaused(false);
        setShowOverlay(false);
      };
      const handlePause = () => {
        setIsPaused(true);
        setShowOverlay(true);
      };
      
      // Attempt to play, then set initial state based on whether it played
      videoElement.play().then(() => {
        setIsPaused(false);
        setShowOverlay(false);
      }).catch(() => {
        // Autoplay was prevented (common browser policy)
        setIsPaused(true);
        setShowOverlay(true);
      });


      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('playing', handlePlay); // Handles cases where play starts after buffering
      videoElement.addEventListener('pause', handlePause);

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
      <div className="aspect-video w-full bg-black flex items-center justify-center text-foreground">
        <p>Video source not available for {movie.title}.</p>
        <p className="text-sm text-muted-foreground" data-ai-hint="video unavailable message">This might be due to missing configuration or data.</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden shadow-2xl">
      <video
        ref={videoRef}
        src={movie.videoUrl}
        controls
        autoPlay // Attempt autoplay
        className="w-full h-full"
        poster={movie.posterUrl || `https://picsum.photos/seed/${movie.id}-poster/1280/720`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
      >
        Your browser does not support the video tag.
      </video>

      {showOverlay && (
        <div 
            className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-8 text-white transition-opacity duration-300 ease-in-out"
            onClick={handleResumePlay} // Clicking overlay attempts to resume
        >
          <div className="text-center max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{movie.title}</h1>
            <div className="flex items-center justify-center space-x-3 text-sm text-neutral-300 mb-4">
              <span>{movie.year}</span>
              <span>&bull;</span>
              <span>{movie.duration}</span>
              <span>&bull;</span>
              <span className="capitalize">{movie.genre}</span>
              <span>&bull;</span>
              <span>Rating: {movie.rating}/5</span>
            </div>
            <p className="text-neutral-200 mb-6 leading-relaxed line-clamp-4">
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
    </div>
  );
}
