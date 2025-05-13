
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoPlayerComponent from './VideoPlayerComponent';
import type { Movie } from '@/types/movie';
import { MOCK_VIDEO_URL } from '@/lib/mockData';


const mockMovie: Movie = {
  id: 'vid1',
  title: 'Test Video Movie',
  description: 'A movie for testing the player.',
  posterUrl: 'https://picsum.photos/seed/vid1-poster/1280/720',
  videoUrl: MOCK_VIDEO_URL, 
  genre: 'Test',
  duration: '10m',
  rating: 5,
  year: 2024,
};

// Mock HTMLVideoElement methods
let mockPlay = vi.fn(() => Promise.resolve());
let mockPause = vi.fn();
let mockFocus = vi.fn();

describe('VideoPlayerComponent', () => {
  beforeEach(() => {
    mockPlay = vi.fn(() => Promise.resolve()); // Reset to resolve successfully
    mockPause = vi.fn();
    mockFocus = vi.fn();

    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: mockPlay,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: mockPause,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'focus', {
        configurable: true,
        value: mockFocus,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders video element with correct src and poster when videoUrl is provided', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` });
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockMovie.videoUrl);
    expect(videoElement).toHaveAttribute('poster', mockMovie.posterUrl);
    expect(videoElement).toHaveAttribute('controls');
    expect(videoElement).toHaveAttribute('autoPlay'); 
  });

  it('renders video element with default poster if movie.posterUrl is not provided', () => {
    const movieWithoutPoster = { ...mockMovie, posterUrl: '' };
    render(<VideoPlayerComponent movie={movieWithoutPoster} />);
    
    const videoElement = screen.getByRole('region', { name: `Video player for ${movieWithoutPoster.title}` });
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('poster', `https://picsum.photos/seed/${movieWithoutPoster.id}-poster/1280/720`);
  });

  it('renders fallback message when movie.videoUrl is not provided', () => {
    const movieWithoutVideoUrl = { ...mockMovie, videoUrl: '' };
    render(<VideoPlayerComponent movie={movieWithoutVideoUrl} />);
    
    expect(screen.getByText(`Video source not available for ${movieWithoutVideoUrl.title}.`)).toBeInTheDocument();
    expect(screen.getByText(/This might be due to missing configuration or data./i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: `Video player for ${movieWithoutVideoUrl.title}`})).not.toBeInTheDocument();
  });

  it('video element has accessible name', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    expect(screen.getByRole('region', { name: `Video player for ${mockMovie.title}` })).toBeInTheDocument();
  });

  it('video element contains fallback text for browsers not supporting the video tag', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` });
    expect(videoElement.textContent).toBe('Your browser does not support the video tag.');
  });

  it('attempts to focus the video element on mount and calls play', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    await waitFor(() => {
        expect(mockFocus).toHaveBeenCalled();
        expect(mockPlay).toHaveBeenCalled();
    });
  });

  it('shows overlay with movie details when video is paused', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Simulate successful autoplay initially
    await act(async () => {
      fireEvent.play(videoElement); // Should hide overlay
    });
     await waitFor(() => {
       expect(screen.queryByText(mockMovie.title, { selector: 'h1' })).not.toBeInTheDocument();
    });
    

    // Simulate pausing the video
    act(() => {
      fireEvent.pause(videoElement);
    });

    await waitFor(() => {
      expect(screen.getByText(mockMovie.title, { selector: 'h1' })).toBeInTheDocument();
      expect(screen.getByText(mockMovie.description)).toBeInTheDocument();
      expect(screen.getByText(mockMovie.year.toString())).toBeInTheDocument();
      expect(screen.getByText(mockMovie.duration)).toBeInTheDocument();
      expect(screen.getByText(mockMovie.genre, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(`Rating: ${mockMovie.rating}/5`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
    });
  });

  it('hides overlay and resumes play when "Resume Play" button on overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Simulate autoplay failed / video starts paused
    mockPlay = vi.fn(() => Promise.reject(new Error("Autoplay prevented")));
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { configurable: true, value: mockPlay });
    
    // Re-render or ensure initial state is paused due to autoplay prevention
    // For this test, let's directly simulate pause to show overlay
     act(() => {
      fireEvent.pause(videoElement);
    });

    const resumeButton = await screen.findByRole('button', { name: `Resume playing ${mockMovie.title}` });
    expect(resumeButton).toBeInTheDocument();

    // Reset play mock to succeed for this interaction
    mockPlay = vi.fn(() => Promise.resolve());
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { configurable: true, value: mockPlay });

    await user.click(resumeButton);
    
    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1); // Called by the button click
      // Overlay should be hidden
      expect(screen.queryByText(mockMovie.title, { selector: 'h1' })).not.toBeInTheDocument();
    });
  });

  it('shows overlay if autoplay is prevented', async () => {
    mockPlay = vi.fn(() => Promise.reject(new Error("Autoplay prevented by browser")));
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
        configurable: true,
        value: mockPlay,
    });
    
    render(<VideoPlayerComponent movie={mockMovie} />);

    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled(); // Attempted to play
        // Overlay should be visible because play was rejected
        expect(screen.getByText(mockMovie.title, { selector: 'h1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
    });
  });
});
