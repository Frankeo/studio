
"use client";

import type { Movie } from '@/types/movie';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, Maximize, Minimize, VolumeX, Volume1, Volume2, Gauge, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

interface VideoPlayerProps {
  movie: Movie;
}

const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VideoPlayerComponent({ movie }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPaused, setIsPaused] = useState(true);
  const [showPlayerUI, setShowPlayerUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const isMobile = useIsMobile(); // Get mobile state

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

    video.controls = false; // Ensure native controls are always off
    video.playsInline = true; // Crucial for iOS custom controls

    const handlePlay = () => { setIsPaused(false); setShowPlayerUI(true); startUiHideTimer(); };
    const handlePause = () => { setIsPaused(true); setShowPlayerUI(true); clearUiTimeout(); };
    const handleEnded = () => { setIsPaused(true); setShowPlayerUI(true); clearUiTimeout(); setCurrentTime(video.duration); };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleVolumeChange = () => { setVolume(video.volume); setIsMuted(video.muted); };

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);

    // Initial setup attempt
    setDuration(video.duration || 0);
    setCurrentTime(video.currentTime || 0);
    setVolume(video.volume);
    setIsMuted(video.muted);
    setPlaybackRate(video.playbackRate);
    setIsPaused(video.paused);


    video.play().then(() => {
      // Autoplay started
    }).catch(() => {
      setIsPaused(true);
      setShowPlayerUI(true);
    });
    

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
      clearUiTimeout();
    };
  }, [movie.id, startUiHideTimer, clearUiTimeout]);

  useEffect(() => {
    const video = videoRef.current; 

    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
      if (video) {
        video.controls = false; // Re-assert native controls are off
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    if (video) {
        const doc = document as any;
        const isCurrentlyFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
        if (isCurrentlyFullscreen) {
            setIsFullscreen(true);
        }
        video.controls = false; // Ensure native controls are off initially
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []); 

  const handleMouseMoveOnPlayer = useCallback(() => {
    setShowPlayerUI(true);
    if (videoRef.current && !videoRef.current.paused) {
      startUiHideTimer();
    }
  }, [startUiHideTimer]);

  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.controls = false; // Re-assert
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  };
  
  const toggleFullscreen = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!playerContainerRef.current) return;

    const playerElement = playerContainerRef.current as any;
    const video = videoRef.current;
    if (video) video.controls = false; // Re-assert before attempting fullscreen

    try {
      if (!isFullscreen) {
        if (playerElement.requestFullscreen) {
          await playerElement.requestFullscreen();
        } else if (playerElement.webkitRequestFullscreen) { 
          await playerElement.webkitRequestFullscreen();
        } else if (playerElement.mozRequestFullScreen) { 
          await playerElement.mozRequestFullScreen();
        } else if (playerElement.msRequestFullscreen) { 
          await playerElement.msRequestFullscreen();
        }

        if (typeof window !== 'undefined' && window.screen && window.screen.orientation && typeof window.screen.orientation.lock === 'function') {
          try {
            await window.screen.orientation.lock('landscape');
          } catch (err) {
            console.warn("Screen orientation lock failed:", err);
          }
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) { 
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) { 
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) { 
          await doc.msExitFullscreen();
        }

        if (typeof window !== 'undefined' && window.screen && window.screen.orientation && typeof window.screen.orientation.unlock === 'function') {
          try {
            window.screen.orientation.unlock();
          } catch (err) {
            console.warn("Screen orientation unlock failed:", err);
          }
        }
      }
    } catch (error) {
      console.error("Fullscreen API error:", error);
    }
    if (video) video.controls = false; // Re-assert after attempting fullscreen change
  };

  const handlePlayerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [role="slider"], [role="menuitem"]')) {
      return; 
    }
    
    const video = videoRef.current;
    if (video) video.controls = false;

    setShowPlayerUI(true);
    if (video && !video.paused) {
      startUiHideTimer();
    } else {
      clearUiTimeout(); 
    }
    
    if (isMobile) {
      toggleFullscreen(); 
    } else {
      togglePlayPause(); 
    }
  };

  const handleResumePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if(video) {
      video.controls = false;
      video.play();
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleVolumeSliderChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      if (value > 0 && videoRef.current.muted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      } else if (value === 0 && !videoRef.current.muted) {
         videoRef.current.muted = true;
         setIsMuted(true);
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      if (!videoRef.current.muted && videoRef.current.volume === 0) {
        videoRef.current.volume = 0.5; 
        setVolume(0.5);
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackRate(speed);
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
      className="relative aspect-video w-full bg-black rounded-lg overflow-hidden shadow-2xl cursor-pointer"
      onMouseMove={handleMouseMoveOnPlayer}
      onClick={handlePlayerClick}
    >
      <video
        ref={videoRef}
        src={movie.videoUrl}
        className="w-full h-full object-contain"
        poster={movie.posterUrl || `https://picsum.photos/seed/${movie.id}-poster/1280/720`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
        playsInline // Added for iOS custom controls
        onClick={(e) => e.stopPropagation()} 
      >
        Your browser does not support the video tag.
      </video>

      {/* Pause Overlay */}
      {isPaused && showPlayerUI && (
        <div
          className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="absolute top-0 left-0 p-4 md:p-6 max-w-sm text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2 shadow-text">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-300 mb-3">
              <span>{movie.year}</span><span aria-hidden="true">&bull;</span>
              <span>{movie.duration}</span><span aria-hidden="true">&bull;</span>
              <span className="capitalize">{movie.genre}</span><span aria-hidden="true">&bull;</span>
              <span>Rating: {movie.rating}/5</span>
            </div>
            <p className="text-sm text-neutral-200 mb-4 leading-relaxed line-clamp-2 md:line-clamp-3 shadow-text">
              {movie.description}
            </p>
          </div>
          <Button
            onClick={handleResumePlay}
            className="bg-primary/80 hover:bg-primary text-primary-foreground p-0 w-20 h-20 md:w-28 md:h-28 rounded-full shadow-xl transform transition-all hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50"
            aria-label={`Resume playing ${movie.title}`}
          >
            <Play className="h-10 w-10 md:h-14 md:w-14" fill="currentColor" />
          </Button>
        </div>
      )}

      {/* Hover Info Overlay (Top-Left) */}
      {!isPaused && showPlayerUI && (
        <div
          className="absolute top-0 left-0 h-full w-full max-w-xs sm:max-w-sm md:max-w-md bg-gradient-to-r from-black/70 via-black/50 to-transparent p-4 md:p-6 flex flex-col justify-start text-white transition-opacity duration-300 ease-in-out pointer-events-none z-10"
        >
           <div className="space-y-1 md:space-y-2">
            <h2 className="text-xl md:text-2xl font-bold line-clamp-2 shadow-text">{movie.title}</h2>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-300">
              <span>{movie.year}</span><span aria-hidden="true">&bull;</span>
              <span>{movie.duration}</span><span aria-hidden="true">&bull;</span>
              <span className="capitalize">{movie.genre}</span>
            </div>
            <p className="text-xs md:text-sm text-neutral-200 leading-relaxed line-clamp-2 md:line-clamp-3 shadow-text">
              {movie.description}
            </p>
          </div>
        </div>
      )}

      {/* Custom Control Bar */}
      {showPlayerUI && (
        <div
          className="absolute bottom-0 left-0 right-0 px-2 pb-1 pt-1 md:px-4 md:pb-2 md:pt-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-30 transition-opacity duration-300 ease-in-out"
          style={{ opacity: showPlayerUI ? 1 : 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={(value) => handleSeek(value[0])}
            className="w-full h-2 mb-1 md:mb-2 group [&>span:first-child]:h-1 [&>span:first-child>span]:h-1 [&>span:last-child]:h-3 [&>span:last-child]:w-3 [&>span:last-child]:-top-0.5 [&>span:last-child]:border-2 group-hover:[&>span:last-child]:scale-125"
            aria-label="Video progress"
          />
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="icon" onClick={togglePlayPause} aria-label={isPaused ? "Play" : "Pause"}>
                {isPaused ? <Play className="h-5 w-5 md:h-6 md:w-6" fill="currentColor" /> : <Pause className="h-5 w-5 md:h-6 md:w-6" fill="currentColor"/>}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : (volume > 0.5 ? <Volume2 className="h-5 w-5 md:h-6 md:w-6" /> : <Volume1 className="h-5 w-5 md:h-6 md:w-6" />)}
              </Button>
              <div className="w-16 md:w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => handleVolumeSliderChange(value[0])}
                  className="[&>span:first-child]:h-1 [&>span:first-child>span]:h-1 [&>span:last-child]:h-3 [&>span:last-child]:w-3 [&>span:last-child]:-top-0.5 group [&>span:last-child]:border-2 group-hover:[&>span:last-child]:scale-125"
                  aria-label="Volume"
                />
              </div>
              <span className="text-xs md:text-sm font-mono tabular-nums ml-1 md:ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-0.5 md:gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="px-1.5 md:px-2 w-auto min-w-[3rem] md:min-w-[3.5rem]" aria-label={`Playback speed ${playbackRate}x`}>
                    <Gauge className="h-4 w-4 md:h-5 md:w-5 mr-0.5 md:mr-1" />
                    <span className="text-xs md:text-sm">{playbackRate}x</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background/80 backdrop-blur-md border-border/50 text-foreground min-w-[5rem]">
                  {playbackSpeeds.map((speed) => (
                    <DropdownMenuItem key={speed} onClick={() => handleSpeedChange(speed)} className="text-xs md:text-sm justify-between">
                      {speed}x
                      {playbackRate === speed && <Check className="w-3 h-3 md:w-4 md:h-4 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {!isMobile && (
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                  {isFullscreen ? <Minimize className="h-5 w-5 md:h-6 md:w-6" /> : <Maximize className="h-5 w-5 md:h-6 md:w-6" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

