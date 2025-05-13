
"use client";

import type { Movie } from '@/types/movie';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Maximize, Minimize } from 'lucide-react';

interface VideoPlayerProps {
  movie: Movie;
}

export default function VideoPlayerComponent({ movie }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [showPlayerUI, setShowPlayerUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearUiTimeout = useCallback(() => {
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current);
      uiTimeoutRef.current = null;
    }
  }, []);

  const startUiHideTimer = useCallback(() => {
    clearUiTimeout();
    if (videoRef.current && !videoRef.current.paused) {
      uiTimeoutRef.current = setTimeout(() => {
        setShowPlayerUI(false);
      }, 3000);
    }
  }, [clearUiTimeout]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Always hide native controls, rely on custom UI
    video.controls = false;

    const handlePlay = () => {
      setIsPaused(false);
      setShowPlayerUI(true);
      startUiHideTimer();
    };

    const handlePause = () => {
      setIsPaused(true);
      setShowPlayerUI(true);
      clearUiTimeout();
    };
    
    const handleEnded = () => {
      setIsPaused(true);
      setShowPlayerUI(true);
      clearUiTimeout();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    video.play().then(() => {
      // Autoplay started
    }).catch(() => {
      setIsPaused(true); 
      setShowPlayerUI(true);
    });
    setIsPaused(video.paused);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      clearUiTimeout();
    };
  }, [movie.id, startUiHideTimer, clearUiTimeout]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);


  const handleMouseMoveOnPlayer = useCallback(() => {
    setShowPlayerUI(true);
    if (videoRef.current && !videoRef.current.paused) {
      startUiHideTimer();
    }
  }, [startUiHideTimer]);
  
  const togglePlayPause = (e?: React.MouseEvent) => {
    // If the click is on an interactive element within the player (like a button), don't toggle play/pause.
    // This check is basic; more robust might involve checking classNames or data-attributes if needed.
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }

    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };
  
  const handleResumePlay = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    videoRef.current?.play();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerContainerRef.current) return;

    const el = playerContainerRef.current as any; // Use any for vendor prefixes

    if (!isFullscreen) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) { /* Safari */
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) { /* IE11 */
        el.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) { /* Safari */
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) { /* IE11 */
        (document as any).msExitFullscreen();
      }
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
      ref={playerContainerRef}
      className="relative aspect-video w-full bg-black rounded-lg overflow-hidden shadow-2xl"
      onMouseMove={handleMouseMoveOnPlayer}
      onClick={togglePlayPause}
    >
      <video
        ref={videoRef}
        src={movie.videoUrl}
        className="w-full h-full"
        poster={movie.posterUrl || `https://picsum.photos/seed/${movie.id}-poster/1280/720`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
      >
        Your browser does not support the video tag.
      </video>

      {/* Pause Overlay */}
      {isPaused && showPlayerUI && (
        <div 
            className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20" // Added flex for centering resume button easily
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
          <Button 
              onClick={handleResumePlay} 
              className="bg-primary/80 hover:bg-primary text-primary-foreground p-0 w-20 h-20 md:w-28 md:h-28 rounded-full shadow-xl transform transition-all hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50"
              aria-label={`Resume playing ${movie.title}`}
          >
            <Play className="h-10 w-10 md:h-14 md:w-14" fill="currentColor" />
          </Button>
        </div>
      )}

      {/* Hover Info Overlay (Top-Left) - Shown when playing and UI is active */}
      {!isPaused && showPlayerUI && (
        <div
          className="absolute top-0 left-0 h-full w-full max-w-xs sm:max-w-sm md:max-w-md bg-gradient-to-r from-black/70 via-black/50 to-transparent p-4 md:p-6 flex flex-col justify-start text-white transition-opacity duration-300 ease-in-out pointer-events-none z-10"
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

      {/* Fullscreen Toggle Button - Bottom Right, shown with UI */}
      {showPlayerUI && (
        <Button
          onClick={toggleFullscreen}
          variant="ghost"
          size="icon"
          className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-30 text-white hover:text-white bg-black/30 hover:bg-black/60 p-2 rounded-full"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5 md:h-6 md:w-6" /> : <Maximize className="h-5 w-5 md:h-6 md:w-6" />}
        </Button>
      )}
    </div>
  );
}

    