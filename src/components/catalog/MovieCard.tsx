
import type { Movie } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';


interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {

  return (
    <Link
      href={`/player/${movie.id}`}
      className="block group"
      aria-label={`View details for ${movie.title}`}
    >
      <Card className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-card shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-[1.02]">
        {/* Background Image */}
        <Image
          src={movie.posterUrl || `https://picsum.photos/seed/${movie.id}/300/450`}
          alt={`Poster for ${movie.title}`}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 group-hover:scale-105"
          data-ai-hint="movie poster"
        />

        {/* Overlay Content: Initially hidden, appears on hover */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Top section of overlay: Removed Add to Watchlist icon */}

          {/* Bottom section of overlay: Title, Genre, Play button */}
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-out delay-50">
            <h3 className="text-sm sm:text-base font-bold text-white mb-1 line-clamp-2 shadow-text">
              {movie.title}
            </h3>
            <p className="text-xs text-neutral-300 mb-3 line-clamp-1 capitalize shadow-text">
              {movie.genre || 'Uncategorized'}
            </p>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                className="flex-grow bg-primary/90 hover:bg-primary text-primary-foreground animate-pulse group-hover:animate-none"
                aria-label={`Play ${movie.title}`}
                // Parent Link handles navigation.
              >
                <Play className="h-4 w-4 mr-1.5" fill="currentColor" />
                Play
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
