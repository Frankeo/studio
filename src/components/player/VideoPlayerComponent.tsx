"use client";

import type { Movie } from '@/types/movie';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  movie: Movie;
}

export default function VideoPlayerComponent({ movie }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(true); // Assume paused initially until playback starts
  const [showPlayerUI, setShowPlayerUI] = useState(true); // Controls visibility of custom overlays and native controls
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearUiTimeout = useCallback(() => {
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current);
      uiTimeoutRef.current = null;
    }
  }, []);

  const startUiHideTimer = useCallback(() => {
    clearUiTimeout();
    // Only start timer if video is actually playing
    if (videoRef.current && !videoRef.current.paused) {
      uiTimeoutRef.current = setTimeout(() => {
        setShowPlayerUI(false);
      }, 3000); // Hide after 3 seconds of inactivity
    }
  }, [clearUiTimeout]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPaused(false);
      setShowPlayerUI(true); // Show UI when play starts
      startUiHideTimer();    // And start timer to hide it
    };

    const handlePause = () => {
      setIsPaused(true);
      setShowPlayerUI(true); // UI always visible when paused
      clearUiTimeout();      // No auto-hide when paused
    };
    
    const handleEnded = () => {
      setIsPaused(true);
      setShowPlayerUI(true); // UI visible when ended
      clearUiTimeout();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlay); // `playing` is often more reliable for UI updates
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Attempt to play, then set initial state based on actual playback
    video.play().then(() => {
      // Autoplay started, 'play' or 'playing' event will handle state
    }).catch(() => {
      // Autoplay failed or was prevented
      setIsPaused(true); // Ensure isPaused is true if play() fails
      setShowPlayerUI(true); // And UI is visible
    });
    // Sync isPaused with the actual video state after attempting to play
    setIsPaused(video.paused);


    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      clearUiTimeout();
    };
  }, [movie.id, startUiHideTimer, clearUiTimeout]);

  // Manage native controls visibility based on showPlayerUI state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.controls = showPlayerUI;
    }
  }, [showPlayerUI]);

  const handleMouseMoveOnPlayer = useCallback(() => {
    setShowPlayerUI(true); // Always show UI on mouse move
    if (videoRef.current && !videoRef.current.paused) {
      startUiHideTimer(); // Restart hide timer if playing
    }
  }, [startUiHideTimer]);
  
  const handleMouseLeavePlayer = useCallback(() => {
    // When mouse leaves, if video is playing, the existing timer will eventually hide the UI.
    // No immediate action needed here unless specific behavior is desired on leave.
    // This setup ensures UI hides due to inactivity, not just leaving the player area.
  }, []);


  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };
  
  const handleResumePlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling to video element's toggle
    videoRef.current?.play();
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
      ref={playerContainerRef}
      className="relative aspect-video w-full bg-black rounded-lg overflow-hidden shadow-2xl"
      onMouseMove={handleMouseMoveOnPlayer}
      onMouseLeave={handleMouseLeavePlayer} // Keep for potential future use, current logic relies on timeout
      onClick={togglePlayPause} // Click on container (excluding overlays) toggles play/pause
    >
      <video
        ref={videoRef}
        src={movie.videoUrl}
        // controls attribute is managed by useEffect based on showPlayerUI
        className="w-full h-full"
        poster={movie.posterUrl || `https://picsum.photos/seed/${movie.id}-poster/1280/720`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
        // onClick is handled by the parent div to avoid conflicts with overlay clicks
      >
        Your browser does not support the video tag.
      </video>

      {/* Pause Overlay */}
      {isPaused && showPlayerUI && (
        <div 
            className="absolute inset-0 bg-black/80 z-20"
            onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to video toggle
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
                onClick={handleResumePlay} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground p-6 md:p-8 rounded-full shadow-xl transform transition-all hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50"
                aria-label={`Resume playing ${movie.title}`}
            >
              <Play className="h-16 w-16 md:h-20 md:w-20" fill="currentColor" />
            </Button>
          </div>
        </div>
      )}

      {/* Hover Info Overlay (Top-Left) - Shown when playing and UI is active */}
      {!isPaused && showPlayerUI && (
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
