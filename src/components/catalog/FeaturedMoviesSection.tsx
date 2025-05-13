
import type { Movie } from '@/types/movie';
import MovieCard from './MovieCard';
import { Skeleton } from '@/components/ui/skeleton';

interface FeaturedMoviesSectionProps {
  movies: Movie[];
  isLoading: boolean;
}

const FEATURED_SKELETON_COUNT = 4;

export default function FeaturedMoviesSection({ movies, isLoading }: FeaturedMoviesSectionProps) {
  if (isLoading) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-foreground">Featured Movies</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Array.from({ length: FEATURED_SKELETON_COUNT }).map((_, index) => (
            <div key={`featured-skel-${index}`} className="flex-shrink-0 w-48 md:w-56">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <div className="space-y-2 mt-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!movies || movies.length === 0) {
    return null; // Don't render the section if there are no featured movies and not loading
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-6 text-foreground">Featured Movies</h2>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {movies.map(movie => (
          <div key={movie.id} className="flex-shrink-0 w-48 md:w-56">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
}
