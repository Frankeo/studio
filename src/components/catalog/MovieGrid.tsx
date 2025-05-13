import type { Movie } from '@/types/movie';
import MovieCard from './MovieCard';

interface MovieGridProps {
  movies: Movie[];
}

export default function MovieGrid({ movies }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No movies found.</p>
        <p className="text-sm text-muted-foreground mt-2" data-ai-hint="Firestore setup instructions">
          Please make sure your Firestore database has a &apos;movies&apos; collection and it contains movie documents.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 p-4 md:p-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
