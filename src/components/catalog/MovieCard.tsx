
import type { Movie } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Play, Info, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const { toast } = useToast();

  const handleAddToWatchlist = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    // In a real app, you would call an API or update context/state here
    console.log(`Adding ${movie.title} to watchlist...`);
    toast({
      title: "Watchlist Updated",
      description: `${movie.title} has been added to your watchlist.`,
    });
  };

  return (
    <Link href={`/player/${movie.id}`} passHref legacyBehavior>
      <a className="block group" aria-label={`View details for ${movie.title}`}>
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
          <div className="absolute inset-0 flex flex-col justify-between p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Top section of overlay: Add to Watchlist icon */}
            <div className="self-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 hover:text-white h-8 w-8 rounded-full"
                onClick={handleAddToWatchlist}
                aria-label="Add to watchlist"
                title="Add to watchlist"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>

            {/* Bottom section of overlay: Title, Genre, Play/Info buttons */}
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
                  className="flex-grow bg-primary/90 hover:bg-primary text-primary-foreground"
                  aria-label={`Play ${movie.title}`}
                  // Parent Link handles navigation, this button is primarily for visual cue and can trigger play directly if needed.
                >
                  <Play className="h-4 w-4 mr-1.5" fill="currentColor" />
                  Play
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-neutral-400/70 text-neutral-200 hover:bg-white/20 hover:text-white h-9 w-9"
                  aria-label="More information"
                  title="More information"
                  // This button can also trigger a modal or navigate if e.preventDefault() is used.
                  // For now, it is part of the card link area.
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </a>
    </Link>
  );
}
