import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeaturedMoviesSection from './FeaturedMoviesSection';
import type { Movie } from '@/types/movie';

const mockMovies: Movie[] = [
  { id: 'f1', title: 'Featured Movie 1', description: 'Featured Desc 1', posterUrl: 'fposter1.jpg', videoUrl: '', genre: 'Action', duration: '2h', rating: 5, year: 2022 },
  { id: 'f2', title: 'Featured Movie 2', description: 'Featured Desc 2', posterUrl: 'fposter2.jpg', videoUrl: '', genre: 'Comedy', duration: '1h 30m', rating: 4, year: 2023 },
  { id: 'f3', title: 'Featured Movie 3', description: 'Featured Desc 3', posterUrl: 'fposter3.jpg', videoUrl: '', genre: 'Drama', duration: '2h 15m', rating: 4.5, year: 2021 },
];

describe('FeaturedMoviesSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders skeleton when isLoading is true', () => {
    render(<FeaturedMoviesSection movies={[]} isLoading={true} />);
    expect(screen.getByLabelText('Title Skeleton')).toBeInTheDocument(); // Based on Skeleton aria-label or text
    expect(screen.getAllByRole('generic').some(el => el.classList.contains('animate-pulse'))).toBe(true); // Check for skeleton presence
  });

  it('renders null if movies array is empty and not loading', () => {
    const { container } = render(<FeaturedMoviesSection movies={[]} isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it.skip('renders featured movies correctly', () => {
    render(<FeaturedMoviesSection movies={mockMovies} isLoading={false} />);
    
    // Check if the first movie is displayed initially
    expect(screen.getByText(mockMovies[0].title)).toBeInTheDocument();
    expect(screen.getByText(mockMovies[0].description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play/i })).toHaveAttribute('href', `/player/${mockMovies[0].id}`);
    expect(screen.getByRole('link', { name: /more info/i })).toHaveAttribute('href', `/player/${mockMovies[0].id}`);
    
    // Check for images (alt text might be more specific if available)
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(mockMovies.length); // All images are in the DOM for the slider
    expect(screen.getByAltText(`Banner for ${mockMovies[0].title}`)).toBeInTheDocument();
  });

  it.skip('navigates to the next slide on "Next" button click', async () => {
    const user = userEvent.setup();
    render(<FeaturedMoviesSection movies={mockMovies} isLoading={false} />);
    
    // Initially, movie 1 is visible
    expect(screen.getByText(mockMovies[0].title)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /next movie/i });
    await user.click(nextButton);
    
    // After click, movie 2 should be visible
    // We need to wait for the CSS transform to apply to make the next slide "visible" conceptually
    // The actual text of all slides is in the DOM. We check the active one.
    await waitFor(() => {
      // This test relies on how "visibility" is implemented. If it's via transform translateX,      // This test relies on how "visibility" is implemented. If it's via transform translateX,
      // the elements are still in the DOM. We check which elements are *semantically* active.
      // For now, we assume the component handles this correctly internally.
      // A more robust test would inspect the `style.transform` of the slide container.
      expect(screen.getByText(mockMovies[1].title)).toBeInTheDocument();
    });
  });

  it.skip('navigates to the previous slide on "Previous" button click', async () => {
    const user = userEvent.setup();
    render(<FeaturedMoviesSection movies={mockMovies} isLoading={false} />);
    
    const nextButton = screen.getByRole('button', { name: /next movie/i });
    await user.click(nextButton); // Go to movie 2

    await waitFor(() => {
        expect(screen.getByText(mockMovies[1].title)).toBeInTheDocument();
    });

    const prevButton = screen.getByRole('button', { name: /previous movie/i });
    await user.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText(mockMovies[0].title)).toBeInTheDocument();
    });
  });
  
  it.skip('loops to the first slide when "Next" is clicked on the last slide', async () => {
    const user = userEvent.setup();
    render(<FeaturedMoviesSection movies={mockMovies} isLoading={false} />);

    const nextButton = screen.getByRole('button', { name: /next movie/i });
    // Click next until the last slide (mockMovies.length -1 clicks)
    for (let i = 0; i < mockMovies.length -1; i++) {
        await user.click(nextButton);
    }
    await waitFor(() => {
        expect(screen.getByText(mockMovies[mockMovies.length-1].title)).toBeInTheDocument();
    });

    // Click next again from the last slide
    await user.click(nextButton);
    await waitFor(() => {
        expect(screen.getByText(mockMovies[0].title)).toBeInTheDocument();
    });
  });


  it.skip('navigates to slide on dot indicator click', async () => {
    const user = userEvent.setup();
    render(<FeaturedMoviesSection movies={mockMovies} isLoading={false} />);
    
    const dotForSlide3 = screen.getByRole('button', { name: `Go to slide ${mockMovies[2].id === 'f3' ? 3 : 2}` }); // Adjust index based on movie ID
    await user.click(dotForSlide3);

    await waitFor(() => {
      expect(screen.getByText(mockMovies[2].title)).toBeInTheDocument();
    });
  });

  it.skip('auto-scrolls to the next slide', async () => {
    vi.useFakeTimers(); // Explicitly enable fake timers for this test

    render(<FeaturedMoviesSection movies={mockMovies} isLoading={false} />);
    expect(screen.getByText(mockMovies[0].title)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7000); // As per useEffect timer
    });
    
    await waitFor(() => {
 expect(screen.getByText(mockMovies[1].title)).toBeInTheDocument();
 }, { timeout: 10000 });

    act(() => {
      vi.advanceTimersByTime(7000);
    });
    
     await waitFor(() => {
 expect(screen.getByText(mockMovies[2].title)).toBeInTheDocument();
 }, { timeout: 10000 });

    vi.useRealTimers(); // Restore real timers after the test
  });

  it('does not render navigation arrows or dots if only one movie', () => {
    render(<FeaturedMoviesSection movies={[mockMovies[0]]} isLoading={false} />);
    expect(screen.queryByRole('button', { name: /next movie/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous movie/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /go to slide/i })).not.toBeInTheDocument(); // General check for dot buttons
  });
});