
import { render, screen } from '@testing-library/react';
import MovieGrid from './MovieGrid';
import type { Movie } from '@/types/movie';

// Mock MovieCard to simplify testing MovieGrid
vi.mock('./MovieCard', () => ({
  default: ({ movie }: { movie: Movie }) => (
    <div data-testid={`movie-card-${movie.id}`}>
      <h3>{movie.title}</h3>
    </div>
  ),
}));

const mockMovies: Movie[] = [
  { id: '1', title: 'Movie 1', description: 'Desc 1', posterUrl: '', videoUrl: '', genre: 'Action', duration: '2h', rating: 5, year: 2022 },
  { id: '2', title: 'Movie 2', description: 'Desc 2', posterUrl: '', videoUrl: '', genre: 'Comedy', duration: '1h 30m', rating: 4, year: 2023 },
];

describe('MovieGrid', () => {
  it('renders "No movies found" message when movies array is empty', () => {
    render(<MovieGrid movies={[]} />);
    expect(screen.getByText('No movies found.')).toBeInTheDocument();
    expect(screen.getByText(/Please make sure your Firestore database has a 'movies' collection/i)).toBeInTheDocument();
  });

  it('renders a list of MovieCard components when movies array is provided', () => {
    render(<MovieGrid movies={mockMovies} />);
    
    expect(screen.queryByText('No movies found.')).not.toBeInTheDocument();

    mockMovies.forEach(movie => {
      expect(screen.getByTestId(`movie-card-${movie.id}`)).toBeInTheDocument();
      expect(screen.getByText(movie.title)).toBeInTheDocument();
    });
  });

  it('renders the correct number of MovieCard components', () => {
    render(<MovieGrid movies={mockMovies} />);
    const movieCards = screen.getAllByText(/Movie \d/); // Simple check based on title
    expect(movieCards).toHaveLength(mockMovies.length);
  });
});
