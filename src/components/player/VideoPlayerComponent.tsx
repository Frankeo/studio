
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, Maximize, Minimize, VolumeX, Volume1, Volume2, Gauge, Check, Clapperboard } from 'lucide-react'; // Added Clapperboard
import type { ScreenMobile, VideoElementWithFullscreen, VideoPlayerProps } from './interfaces';

const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VideoPlayerComponent({ movie }: VideoPlayerProps) {
  const videoRef = useRef<VideoElementWithFullscreen>(null);
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
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);

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

    video.controls = false;
    video.playsInline = true;
    video.webkitPlaysInline = true; 

    const handlePlay = () => { setIsPaused(false); setShowPlayerUI(true); startUiHideTimer(); setIsVideoBuffering(false); };
    const handlePause = () => { setIsPaused(true); setShowPlayerUI(true); clearUiTimeout(); };
    const handleEnded = () => { setIsPaused(true); setShowPlayerUI(true); clearUiTimeout(); if (video) setCurrentTime(video.duration); setIsVideoBuffering(false);};
    const handleTimeUpdate = () => { if (video) setCurrentTime(video.currentTime); };
    const handleLoadedMetadata = () => { if (video) setDuration(video.duration); };
    const handleVolumeChange = () => { if (video) { setVolume(video.volume); setIsMuted(video.muted); }};
    
    const handleCanPlay = () => setIsVideoBuffering(false);
    const handleWaiting = () => setIsVideoBuffering(true);
    const handleError = () => setIsVideoBuffering(false); // Stop loader on error

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlay); // Also sets buffering to false
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);


    setDuration(video.duration || 0);
    setCurrentTime(video.currentTime || 0);
    setVolume(video.volume);
    setIsMuted(video.muted);
    setPlaybackRate(video.playbackRate);
    setIsPaused(video.paused);
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        setIsVideoBuffering(false);
    }


    video.play().catch(() => {
      setIsPaused(true);
      setShowPlayerUI(true);
      // If play fails (e.g. browser policy), it might not be buffering but just paused.
      // Check readyState again.
      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        setIsVideoBuffering(true);
      } else {
        setIsVideoBuffering(false);
      }
    });


    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);
      clearUiTimeout();
    };
  }, [movie.id, startUiHideTimer, clearUiTimeout]);

  useEffect(() => {
    const video = videoRef.current;

    const handleFullscreenChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element; mozFullScreenElement?: Element; msFullscreenElement?: Element; webkitIsFullScreen?: boolean; mozFullScreen?: boolean; };
      const isCurrentlyFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        (video && video.webkitSupportsFullscreen && video.webkitDisplayingFullscreen) 
      );
      setIsFullscreen(isCurrentlyFullscreen);
      if (video) {
        video.controls = false;
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); 
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    if (video) {
        video.addEventListener('webkitbeginfullscreen', () => {setIsFullscreen(true); if(video) video.controls = false;});
        video.addEventListener('webkitendfullscreen', () => {setIsFullscreen(false); if(video) video.controls = false;});
    }


    if (video) {
        const doc = document as Document & { webkitFullscreenElement?: Element; mozFullScreenElement?: Element; msFullscreenElement?: Element; };
        const isCurrentlyFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement || (video.webkitSupportsFullscreen && video.webkitDisplayingFullscreen) );
        if (isCurrentlyFullscreen) {
            setIsFullscreen(true);
        }
        video.controls = false;
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', () => {setIsFullscreen(true); if(video) video.controls = false;});
        video.removeEventListener('webkitendfullscreen', () => {setIsFullscreen(false); if(video) video.controls = false;});
      }
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
    video.controls = false;
    if (video.paused || video.ended) {
      video.play().catch(err => console.error("Play error:", err));
    } else {
      video.pause();
    }
  };

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    const playerElement = playerContainerRef.current as VideoElementWithFullscreen | null; 

    if (!video && !playerElement) return;

    const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void> | void; // Adjusted for iOS
        mozCancelFullScreen?: () => Promise<void>;
        msExitFullscreen?: () => Promise<void>;
        webkitIsFullScreen?: boolean;
        mozFullScreen?: boolean;
    };

    try {
      if (!isFullscreen) {
        if (video && typeof video.webkitEnterFullscreen === 'function') {
          video.webkitEnterFullscreen(); // For iOS Safari
        } else if (playerElement) { 
          if (playerElement.requestFullscreen) {
            await playerElement.requestFullscreen();
          } else if (playerElement.webkitRequestFullscreen) {
            await playerElement.webkitRequestFullscreen();
          } else if (playerElement.mozRequestFullScreen) {
            await playerElement.mozRequestFullScreen();
          } else if (playerElement.msRequestFullscreen) {
            await playerElement.msRequestFullscreen();
          }
        }

        if (typeof window !== 'undefined' && window.screen && window.screen.orientation && typeof (window.screen.orientation as ScreenMobile).lock === 'function') {
          try {
            await (window.screen.orientation as ScreenMobile).lock!('landscape-primary');
          } catch (err) {
            console.warn("Screen orientation lock failed:", err);
          }
        }
      } else {
        if (video && typeof video.webkitExitFullscreen === 'function') {
          video.webkitExitFullscreen(); // For iOS Safari
        } else if (doc.exitFullscreen) { 
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
    if (video) video.controls = false;
  };

 const handlePlayerClick = (e: React.MouseEvent) => {
    const targetElement = e.target as HTMLElement;
    // Do not toggle play/pause if the click is on a button, slider, or any interactive element within the controls.
    if (targetElement.closest('button, [role="slider"], [role="menuitem"], [data-testid="video-controls-bar"], .group')) {
      return;
    }
  
    const video = videoRef.current;
    if (!video) return;
  
    video.controls = false; // Ensure custom controls context
    setShowPlayerUI(true); // Always show UI on tap
  
    if (video.paused || video.ended) {
      video.play().catch(err => console.error("Play error on screen click:", err));
    } else {
      video.pause();
    }
  };


  const handleResumePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if(video) {
      video.controls = false;
      if (video.paused || video.ended) {
        video.play().catch(err => console.error("Resume play error:", err));
      }
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
        videoRef.current.volume = 0.5; // Restore to a sensible volume
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
        data-testid="video-player"
        ref={videoRef}
        src={movie.videoUrl}
        className="w-full h-full object-contain"
        poster={movie.posterUrl || `https://placehold.co/1280x720.png`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
        playsInline 
        webkit-playsinline="true" 
        onClick={(e) => e.stopPropagation()} 
      >
        Your browser does not support the video tag.
      </video>

      {isVideoBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
          <Clapperboard className="h-16 w-16 text-primary animate-pulse" />
        </div>
      )}

      {isPaused && showPlayerUI && !isVideoBuffering && (
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

      {!isPaused && showPlayerUI && !isVideoBuffering && (
        <div
          className="absolute top-0 left-0 h-full w-full max-w-xs sm:max-w-sm md:max-w-md bg-gradient-to-r from-black/70 via-black/50 to-transparent p-4 md:p-6 flex flex-col justify-start text-white transition-opacity duration-300 ease-in-out pointer-events-none z-10"
          style={{ opacity: showPlayerUI ? 1 : 0 }}
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

      <div
        data-testid="video-controls-bar"
        className="absolute bottom-0 left-0 right-0 px-2 pb-1 pt-1 md:px-4 md:pb-2 md:pt-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-30 transition-opacity duration-300 ease-in-out"
        style={{ opacity: showPlayerUI ? 1 : 0 }}
        onClick={(e) => e.stopPropagation()} 
      >
        <Slider
          value={[currentTime]}
          max={duration || 1} 
          step={0.1}
          onValueChange={(value) => handleSeek(value[0])}
          className="w-full mb-1 md:mb-2 group [&>span:first-child]:h-1 [&>span:first-child>span]:h-1"
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
            <div className="w-16 md:w-20" data-testid="volume-slider-container">
              <Slider
                data-testid="volume-slider"
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={(value) => handleVolumeSliderChange(value[0])}
                className="[&>span:first-child]:h-1 [&>span:first-child>span]:h-1"
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
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? <Minimize className="h-5 w-5 md:h-6 md:w-6" /> : <Maximize className="h-5 w-5 md:h-6 md:w-6" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


