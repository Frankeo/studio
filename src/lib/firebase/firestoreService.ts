import { db } from './config';
import type { Movie } from '@/types/movie';
import { collection, getDocs, doc, getDoc, query, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';

const MOVIES_COLLECTION = 'movies';

// Helper to convert Firestore doc to Movie type
const mapDocToMovie = (doc: DocumentSnapshot): Movie => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data?.title || 'Untitled',
    description: data?.description || '',
    posterUrl: data?.posterUrl || '',
    videoUrl: data?.videoUrl || '',
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
    // data-ai-hint: Ensure your Firestore has a 'movies' collection with documents.
    // Each document should have fields like title, description, posterUrl, videoUrl, genre, duration, rating, year.
    // Check Firestore security rules to allow reads on this collection.
    return { movies: [], lastVisible: null };
  }
};

export const getMovieById = async (id: string): Promise<Movie | null> => {
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

// Example: Add a movie (for testing or seeding)
// import { addDoc } from 'firebase/firestore';
// export const addMovie = async (movieData: Omit<Movie, 'id'>) => {
//   try {
//     const docRef = await addDoc(collection(db, MOVIES_COLLECTION), movieData);
//     console.log("Document written with ID: ", docRef.id);
//     return docRef.id;
//   } catch (e) {
//     console.error("Error adding document: ", e);
//   }
// };
// Sample movie data for seeding (run this once if needed, e.g., in a script or dev tool):
// addMovie({ title: "Sample Movie", description: "A great sample movie.", posterUrl: "https://picsum.photos/300/450", videoUrl: "YOUR_VIDEO_URL", genre: "Action", duration: "1h 30m", rating: 4.5, year: 2023 });
