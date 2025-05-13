
import { db, isFirebaseConfigured } from './config';
import type { Movie } from '@/types/movie';
import { mockMovies, MOCK_VIDEO_URL } from '../mockData';
import { collection, getDocs, doc, getDoc, query, limit, startAfter, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';

const MOVIES_COLLECTION = 'movies';

// Helper to convert Firestore doc to Movie type
const mapDocToMovie = (docSnap: QueryDocumentSnapshot | DocumentSnapshot): Movie => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data?.title || 'Untitled',
    description: data?.description || '',
    posterUrl: data?.posterUrl || `https://picsum.photos/seed/${docSnap.id}/300/450`,
    videoUrl: data?.videoUrl || MOCK_VIDEO_URL, // Fallback to mock video URL if not present
    genre: data?.genre || 'Unknown',
    duration: data?.duration || 'N/A',
    rating: data?.rating || 0,
    year: data?.year || 0,
  } as Movie;
};

interface PaginatedMoviesResult {
  movies: Movie[];
  lastVisible: DocumentSnapshot | null;
}

export const getMovies = async (pageSize: number = 12, lastDoc: DocumentSnapshot | null = null): Promise<PaginatedMoviesResult> => {
  if (!isFirebaseConfigured || !db) {
    console.warn("Firebase not configured. Returning mock movies.");
    const startIndex = lastDoc ? mockMovies.findIndex(m => m.id === (lastDoc as any).mockId) + 1 : 0;
    if (lastDoc && startIndex === 0) { // lastDoc was provided but not found in mockMovies (or was the last one)
        return { movies: [], lastVisible: null };
    }
    
    const paginatedMockMovies = mockMovies.slice(startIndex, startIndex + pageSize);
    
    let newMockLastVisible: DocumentSnapshot | null = null;
    if (paginatedMockMovies.length > 0 && (startIndex + paginatedMockMovies.length) < mockMovies.length) {
        // Create a mock DocumentSnapshot-like object for pagination
        newMockLastVisible = { 
            id: 'mockLastVisible', // Not a real Firestore ID, just for logic
            mockId: paginatedMockMovies[paginatedMockMovies.length - 1].id, // Store the actual last movie ID for next fetch
            data: () => ({}), 
            exists: () => true,
            get: (fieldPath:string) => undefined,
            ref: {} as any,
        } as unknown as DocumentSnapshot;
    }
    
    return { movies: paginatedMockMovies, lastVisible: newMockLastVisible };
  }

  try {
    const moviesRef = collection(db, MOVIES_COLLECTION);
    let q;

    if (lastDoc) {
      q = query(moviesRef, limit(pageSize), startAfter(lastDoc));
    } else {
      q = query(moviesRef, limit(pageSize));
    }
    
    const querySnapshot = await getDocs(q);
    const movies = querySnapshot.docs.map(mapDocToMovie);
    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    
    return { movies, lastVisible: newLastVisible };
  } catch (error) {
    console.error("Error fetching movies: ", error);
    return { movies: [], lastVisible: null };
  }
};

export const getMovieById = async (id: string): Promise<Movie | null> => {
  if (!isFirebaseConfigured || !db) {
    console.warn(`Firebase not configured. Returning mock movie by ID: ${id}.`);
    const movie = mockMovies.find(m => m.id === id);
    if (movie) return { ...movie, videoUrl: movie.videoUrl || MOCK_VIDEO_URL }; // Ensure MOCK_VIDEO_URL fallback
    return null;
  }

  try {
    const docRef = doc(db, MOVIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return mapDocToMovie(docSnap);
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching movie by ID: ", error);
    return null;
  }
};
