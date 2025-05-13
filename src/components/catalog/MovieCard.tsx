import type { Movie } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Info } from 'lucide-react'; // Import Play and Info icons
import { Button } from '@/components/ui/button';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/player/${movie.id}`} passHref legacyBehavior>
      <a className="block group" aria-label={`View details for ${movie.title}`}>
        <Card className="overflow-hidden h-full flex flex-col bg-card hover:shadow-2xl hover:border-primary/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="p-0 relative aspect-[2/3] w-full">
            <Image
              src={movie.posterUrl || "https://picsum.photos/300/450?grayscale"}
              alt={`Poster for ${movie.title}`}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
              data-ai-hint="movie poster"
            />
            {/* Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all duration-300 opacity-0 group-hover:opacity-100 rounded-t-lg">
              <Play className="h-14 w-14 md:h-16 md:w-16 text-white opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 ease-in-out" fill="white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-grow space-y-1">
            <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-1">
              {movie.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground line-clamp-1 capitalize">
              {movie.genre || 'Uncategorized'}
            </p>
          </CardContent>
          <CardFooter className="p-3 pt-0">
            {/* This button is part of the larger link, so it also navigates to the player page */}
            <Button variant="outline" size="sm" className="w-full text-xs" tabIndex={-1} aria-hidden="true">
              <Info className="mr-2 h-3.5 w-3.5" />
              More Info
            </Button>
          </CardFooter>
        </Card>
      </a>
    </Link>
  );
}
