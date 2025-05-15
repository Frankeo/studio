
import { db } from './config';
import type { Movie } from '@/types/movie';
import { collection, getDocs, doc, getDoc, query, limit, startAfter, type DocumentSnapshot, type QueryDocumentSnapshot, addDoc, setDoc } from 'firebase/firestore'; // Added setDoc
import type { UserProfile } from 'firebase/auth'; // Changed from 'firebase/auth' to actual UserProfile path if different
import type { PaginatedMoviesResult } from './interfaces';

const MOVIES_COLLECTION = 'movies';
const USERS_COLLECTION = 'users';

// Helper to convert Firestore doc to Movie type
const mapDocToMovie = (docSnap: QueryDocumentSnapshot | DocumentSnapshot): Movie => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data?.title || 'Untitled',
    description: data?.description || '',
    posterUrl: data?.posterUrl || `https://placehold.co/300x450.png`,
    videoUrl: data?.videoUrl || '', // Default to empty string if no mock
    genre: data?.genre || 'Unknown',
    duration: data?.duration || 'N/A',
    rating: data?.rating || 0,
    year: data?.year || 0,
  } as Movie;
};

export const getMovies = async (pageSize: number = 12, lastDoc: DocumentSnapshot | null = null): Promise<PaginatedMoviesResult> => {
  if (!db) {
    console.warn("Firestore (db) is not initialized. Returning empty movie list.");
    return { movies: [], lastVisible: null };
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
    return { movies: [], lastVisible: null }; // Return empty on error
  }
};

export const getMovieById = async (id: string): Promise<Movie | null> => {
  if (!db) {
    console.warn(`Firestore (db) is not initialized. Cannot fetch movie by ID: ${id}.`);
    return null;
  }

  try {
    const docRef = doc(db, MOVIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return mapDocToMovie(docSnap);
    } else {
      console.log(`Movie document not found for ID: ${id}.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching movie by ID ${id}: `, error);
    return null;
  }
};

export const getUserProfileFromFirestore = async (userId: string): Promise<UserProfile | null> => {
  if (!db) {
    console.warn(`Firestore (db) is not initialized. Cannot fetch user profile for UID: ${userId}.`);
    return null; // Return null if db is not available
  }

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        uid: userId, // This is from Firebase Auth, not Firestore doc typically
        // photoURL and displayName are typically from Firebase Auth user object
        // We are primarily interested in custom fields like isAdmin from Firestore
        isAdmin: data?.isAdmin || false,
        // Add other profile fields here if they exist in Firestore
      } as UserProfile; // Cast as UserProfile if the shape matches
    } else {
      console.log(`User profile document not found for UID: ${userId}. Creating default profile.`);
      // If the document doesn't exist, create a default one with isAdmin: false.
      const defaultProfile = { uid: userId, isAdmin: false };
      await setDoc(userDocRef, { isAdmin: false }); // Create the document in Firestore
      return defaultProfile as UserProfile;
    }
  } catch (error) {
    console.error(`Error fetching user profile for UID ${userId}:`, error);
    // On error, you might return a default non-admin profile or null
    // Returning null or a default non-admin profile is safer.
    return { uid: userId, isAdmin: false } as UserProfile; 
  }
};

export const addMovieToFirestore = async (movieData: Omit<Movie, 'id'>): Promise<string> => {
  if (!db) {
    throw new Error("Firestore (db) is not initialized. Cannot add movie.");
  }

  try {
    const moviesRef = collection(db, MOVIES_COLLECTION);
    const docRef = await addDoc(moviesRef, movieData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding movie to Firestore: ", error);
    throw error; 
  }
};
