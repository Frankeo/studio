import type { Movie } from '@/types/movie';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, CalendarDays, Clock } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/player/${movie.id}`} passHref legacyBehavior>
      <a className="block group" aria-label={`Play ${movie.title}`}>
        <Card className="overflow-hidden h-full flex flex-col bg-card hover:shadow-2xl hover:border-primary transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="p-0 relative aspect-[2/3]">
            <Image
              src={movie.posterUrl || "https://picsum.photos/300/450?grayscale"}
              alt={`Poster for ${movie.title}`}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
              data-ai-hint="movie poster"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </CardHeader>
          <CardContent className="p-4 flex-grow">
            <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors duration-300">
              {movie.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{movie.description}</p>
          </CardContent>
          <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex flex-col space-y-1 items-start">
            <div className="flex items-center space-x-2">
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-3 h-3" />
              <span>{movie.year || 'N/A'}</span>
            </div>
             <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>{movie.duration || 'N/A'}</span>
            </div>
            <p className="text-xs capitalize">{movie.genre || 'Uncategorized'}</p>
          </CardFooter>
        </Card>
      </a>
    </Link>
  );
}
