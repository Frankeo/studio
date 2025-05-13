"use client";

import type { Movie } from '@/types/movie';
import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  movie: Movie;
}

export default function VideoPlayerComponent({ movie }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // You might want to add custom controls or event listeners here
    // For example,plyr.io or video.js could be integrated for a richer player experience
    if (videoRef.current) {
      videoRef.current.focus();
    }
  }, []);

  if (!movie.videoUrl) {
    return (
      <div className="aspect-video w-full bg-black flex items-center justify-center text-foreground">
        <p>Video source not available for {movie.title}.</p>
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
        poster={movie.posterUrl}
        aria-label={`Video player for ${movie.title}`}
        data-ai-hint="movie video"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
