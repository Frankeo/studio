export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  videoUrl: string;
  genre: string;
  duration: string;
  rating: number; // Ensure this is number
  year: number;   // Ensure this is number
}
