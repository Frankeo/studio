
import { db, isFirebaseConfigured } from './config';
import type { Movie } from '@/types/movie';
import type { UserProfile } from '@/types/userProfile';
import { mockMovies, MOCK_VIDEO_URL, mockUserProfileData } from '../mockData';
import { collection, getDocs, doc, getDoc, query, limit, startAfter, type DocumentSnapshot, type QueryDocumentSnapshot, type FieldPath } from 'firebase/firestore';

const MOVIES_COLLECTION = 'movies';
const USERS_COLLECTION = 'users';

// Helper to convert Firestore doc to Movie type
const mapDocToMovie = (docSnap: QueryDocumentSnapshot | DocumentSnapshot): Movie => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data?.title || 'Untitled',
    description: data?.description || '',
    posterUrl: data?.posterUrl || `https://picsum.photos/seed/${docSnap.id}/300/450`,
    videoUrl: data?.videoUrl || MOCK_VIDEO_URL, 
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
        console.warn(`Mock ID "${lastMockId}" from lastDoc not found in mockMovies. Returning empty list.`);
        return { movies: [], lastVisible: null };
      }
    }

    if (startIndex >= mockMovies.length) {
      return { movies: [], lastVisible: null };
    }
    
    const paginatedMockMovies = mockMovies.slice(startIndex, startIndex + pageSize);
    
    let newMockLastVisible: DocumentSnapshot | null = null;
    if (startIndex + paginatedMockMovies.length < mockMovies.length) {
        const lastFetchedMovieInBatch = paginatedMockMovies[paginatedMockMovies.length - 1];
        newMockLastVisible = { 
            id: `mock-last-visible-${lastFetchedMovieInBatch.id}`, 
            mockId: lastFetchedMovieInBatch.id, 
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
    if (movie) return { ...movie, videoUrl: movie.videoUrl || MOCK_VIDEO_URL }; 
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

export const getUserProfileFromFirestore = async (userId: string): Promise<UserProfile | null> => {
  if (!isFirebaseConfigured || !db) {
    console.warn(`Firebase not configured. Returning mock user profile for UID: ${userId}.`);
    if (userId === mockUserProfileData.uid) {
      return mockUserProfileData;
    }
    return null;
  }

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        uid: userId,
        isAdmin: data?.isAdmin || false,
        // Add other profile fields here if they exist in Firestore
      };
    } else {
      console.log(`User profile document not found for UID: ${userId}. Defaulting isAdmin to false.`);
      // If no profile doc, assume not admin. You might want to create one here if needed.
      return { uid: userId, isAdmin: false };
    }
  } catch (error) {
    console.error(`Error fetching user profile for UID ${userId}:`, error);
    return null; // Or return a default profile object
  }
};
