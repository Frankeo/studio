
"use client";

import type { Movie } from '@/types/movie';
import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  movie: Movie;
}

export default function VideoPlayerComponent({ movie }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.focus();
    }
  }, []);

  // The videoUrl is now expected to be either a real URL or the MOCK_VIDEO_URL
  // from the data source (firestoreService or mockData).
  if (!movie.videoUrl) {
    // This case should ideally not be hit if data sources are robust.
    // It acts as a final fallback.
    return (
      <div className="aspect-video w-full bg-black flex items-center justify-center text-foreground">
        <p>Video source not available for {movie.title}.</p>
        <p className="text-sm text-muted-foreground" data-ai-hint="video unavailable message">This might be due to missing configuration or data.</p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-2xl">
      <video
        ref={videoRef}
        src={movie.videoUrl}
        controls
        autoPlay
        className="w-full h-full"
        poster={movie.posterUrl || `https://picsum.photos/seed/${movie.id}-poster/1280/720`}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
