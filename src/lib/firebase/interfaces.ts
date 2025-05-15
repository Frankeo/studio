import type { DocumentSnapshot } from 'firebase/firestore';
import type { Movie } from '@/types/movie';

export interface PaginatedMoviesResult {
  movies: Movie[];
  lastVisible: DocumentSnapshot | null;
}