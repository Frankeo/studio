
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
let mockFocus = vi.fn(); // Focus is not explicitly called anymore, but keep if other interactions depend on it

describe('VideoPlayerComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPlay = vi.fn(() => Promise.resolve());
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
     // Mock paused property
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: vi.fn(() => true), // Default to paused initially for some tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders video element with correct src and poster when videoUrl is provided', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` });
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockMovie.videoUrl);
    expect(videoElement).toHaveAttribute('poster', mockMovie.posterUrl);
    expect(videoElement).toHaveAttribute('controls');
    // autoPlay is managed by useEffect now
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

  it('attempts to play the video on mount', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
    });
  });

  it('shows pause overlay with movie details when video is paused', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Simulate video is playing then paused
    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); }); // Sets isPaused = false
    
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); }); // Sets isPaused = true

    await waitFor(() => {
      // Pause overlay content
      expect(screen.getByText(mockMovie.title, { selector: 'h1' })).toBeInTheDocument();
      expect(screen.getByText(mockMovie.description, {selector: 'p.text-neutral-200'})).toBeInTheDocument();
      expect(screen.getByText(mockMovie.year.toString())).toBeInTheDocument();
      expect(screen.getByText(mockMovie.duration)).toBeInTheDocument();
      expect(screen.getByText(mockMovie.genre, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(`Rating: ${mockMovie.rating}/5`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
    });
  });

  it('hides pause overlay and resumes play when "Resume Play" button on pause overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Simulate video is paused
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); });

    const resumeButton = await screen.findByRole('button', { name: `Resume playing ${mockMovie.title}` });
    expect(resumeButton).toBeInTheDocument();
    
    // Reset play mock for this interaction and simulate it playing
    mockPlay.mockClear(); 
    Object.defineProperty(videoElement, 'paused', { get: () => false });


    await user.click(resumeButton);
    
    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
      // Pause overlay should be hidden
      expect(screen.queryByText(mockMovie.title, { selector: 'h1' })).not.toBeInTheDocument();
    });
  });

  it('shows pause overlay if autoplay is prevented (video remains paused)', async () => {
    // Mock play to reject (simulating autoplay prevention)
    mockPlay.mockImplementationOnce(() => Promise.reject(new Error("Autoplay prevented by browser")));
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: vi.fn(() => true), // Video is paused
    });
    
    render(<VideoPlayerComponent movie={mockMovie} />);

    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled(); 
        // Pause overlay should be visible
        expect(screen.getByText(mockMovie.title, { selector: 'h1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
    });
  });

  it('shows hover overlay on mouse enter if video is playing, hides on mouse leave', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Simulate video is playing
    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); }); // isPaused should be false

    await waitFor(() => expect(screen.queryByText(mockMovie.title, {selector: 'h1'})).not.toBeInTheDocument()); // Pause overlay not visible

    // Mouse Enter
    fireEvent.mouseEnter(playerContainer);
    await waitFor(() => {
      // Hover overlay content (uses h2 for title)
      expect(screen.getByText(mockMovie.title, { selector: 'h2' })).toBeInTheDocument();
      expect(screen.getByText(mockMovie.description, {selector: 'p.text-xs'})).toBeInTheDocument(); // more specific selector for hover desc
    });

    // Mouse Leave
    fireEvent.mouseLeave(playerContainer);
    await waitFor(() => {
      expect(screen.queryByText(mockMovie.title, { selector: 'h2' })).not.toBeInTheDocument();
    });
  });

  it('does NOT show hover overlay if video is paused, even on mouse enter', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Simulate video is paused
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); }); // isPaused should be true

    await waitFor(() => {
        // Pause overlay should be visible
        expect(screen.getByText(mockMovie.title, { selector: 'h1' })).toBeInTheDocument();
    });
    
    // Mouse Enter
    fireEvent.mouseEnter(playerContainer);
    
    // Wait a bit to ensure no hover overlay appears
    await act(() => vi.advanceTimersByTime(100)); 

    // Hover overlay (h2 title) should NOT be there
    expect(screen.queryByText(mockMovie.title, { selector: 'h2' })).not.toBeInTheDocument();
    // Pause overlay (h1 title) should still be there
    expect(screen.getByText(mockMovie.title, { selector: 'h1' })).toBeInTheDocument();
  });

  it('toggles play/pause on video click', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Initial state: playing (mockPlay was called on mount)
    mockPlay.mockClear(); // Clear initial play call
    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true }); // Simulate playing

    // Click to pause
    await user.click(videoElement);
    expect(mockPause).toHaveBeenCalledTimes(1);
    mockPause.mockClear();
    Object.defineProperty(videoElement, 'paused', { get: () => true, configurable: true }); // Simulate paused

    // Click to play
    await user.click(videoElement);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    mockPlay.mockClear();
    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true }); // Simulate playing
  });

});
