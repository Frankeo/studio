
import { db, isFirebaseConfigured } from './config';
import type { Movie } from '@/types/movie';
import { mockMovies, MOCK_VIDEO_URL } from '../mockData';
import { collection, getDocs, doc, getDoc, query, limit, startAfter, type DocumentSnapshot, type QueryDocumentSnapshot, type FieldPath } from 'firebase/firestore';

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

    let startIndex = 0;
    if (lastDoc && 'mockId' in lastDoc && typeof lastDoc.mockId === 'string') {
      const lastMockId = lastDoc.mockId;
      const lastIndex = mockMovies.findIndex(m => m.id === lastMockId);      
      
      if (lastIndex !== -1) {
        startIndex = lastIndex + 1;
      } else {
        // If lastMockId from lastDoc is not found in mockMovies,
        // it implies an issue or end of list based on that ID.
        // Return empty to prevent refetching page 1 or errors.
        console.warn(`Mock ID "${lastMockId}" from lastDoc not found in mockMovies. Returning empty list.`);
        return { movies: [], lastVisible: null };
      }
    }

    // If startIndex is already at or beyond the length of mockMovies, no more movies.
    if (startIndex >= mockMovies.length) {
      return { movies: [], lastVisible: null };
    }
    
    const paginatedMockMovies = mockMovies.slice(startIndex, startIndex + pageSize);
    
    let newMockLastVisible: DocumentSnapshot | null = null;
    // Check if there are more movies *after* the current batch    
    if (startIndex + paginatedMockMovies.length < mockMovies.length) {
        // Create a mock DocumentSnapshot-like object for pagination
        const lastFetchedMovieInBatch = paginatedMockMovies[paginatedMockMovies.length - 1];
        newMockLastVisible = { 
            id: `mock-last-visible-${lastFetchedMovieInBatch.id}`, // A somewhat unique ID for the mock snapshot
            mockId: lastFetchedMovieInBatch.id, // This is the important part for mock pagination
            data: () => ({ ...mockMovies.find(m => m.id === lastFetchedMovieInBatch.id) }), 
            exists: () => true,
            get: (fieldPath: string | number | FieldPath) => {
                const itemData = mockMovies.find(m => m.id === lastFetchedMovieInBatch.id);
                if (itemData && typeof fieldPath === 'string') {
                  const prop = fieldPath as keyof typeof itemData;
                  return itemData[prop];
                }
                return undefined;
            },
            ref: { path: `${MOVIES_COLLECTION}/mock-last-visible-${lastFetchedMovieInBatch.id}` },
        } as unknown as DocumentSnapshot; // Cast to MockDocumentSnapshot first
    }
    
    return { movies: paginatedMockMovies, lastVisible: newMockLastVisible };
  }

  // Firestore logic remains the same
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

