
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieCard from './MovieCard';
import type { Movie } from '@/types/movie';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockMovie: Movie = {
  id: 'test-movie-1',
  title: 'Test Movie Title',
  description: 'A great test movie.',
  posterUrl: 'https://picsum.photos/seed/testmovie1/300/450',
  videoUrl: 'test-video-url.mp4',
  genre: 'Testing',
  duration: '1h 30m',
  rating: 4.5,
  year: 2023,
};

describe('MovieCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders movie information correctly', () => {
    render(<MovieCard movie={mockMovie} />);

    // The image itself
    const posterImage = screen.getByAltText(`Poster for ${mockMovie.title}`);
    expect(posterImage).toBeInTheDocument();
    expect(posterImage).toHaveAttribute('src'); // Check if src attribute is present

    // The link wrapping the card
    const linkElement = screen.getByRole('link', { name: `View details for ${mockMovie.title}` });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', `/player/${mockMovie.id}`);
  });

  it('shows overlay content on hover (simulated by checking for elements that are initially hidden by opacity)', async () => {
    render(<MovieCard movie={mockMovie} />);
    // Note: True hover simulation is hard with JSDOM. We test for elements that become visible.
    // ShadCN uses opacity-0 group-hover:opacity-100. These elements are in the DOM.
    // We can check for their presence.
    
    expect(screen.getByText(mockMovie.title)).toBeInTheDocument();
    expect(screen.getByText(mockMovie.genre, { exact: false })).toBeInTheDocument(); // case-insensitive and partial match due to capitalize
    expect(screen.getByRole('button', { name: `Play ${mockMovie.title}` })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more information/i })).not.toBeInTheDocument(); // More Info button removed
    expect(screen.queryByRole('button', { name: /add to watchlist/i })).not.toBeInTheDocument();
  });


  it('Play button is part of the link and navigates', () => {
    render(<MovieCard movie={mockMovie} />);
    const playButton = screen.getByRole('button', { name: `Play ${mockMovie.title}` });
    // The button itself doesn't navigate; its parent link does.
    // We check if it's within the main link.
    expect(screen.getByRole('link', { name: `View details for ${mockMovie.title}` })).toContainElement(playButton);

  });

   it('uses placeholder image if posterUrl is not provided', () => {
    const movieWithoutPoster = { ...mockMovie, posterUrl: '' };
    render(<MovieCard movie={movieWithoutPoster} />);
    const posterImage = screen.getByAltText(`Poster for ${movieWithoutPoster.title}`);
    expect(posterImage).toHaveAttribute('src', expect.stringContaining('picsum.photos'));
  });
});
