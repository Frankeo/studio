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
    // Default to paused initially for tests unless play is explicitly called
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: vi.fn(() => true), 
      set: vi.fn(),
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'controls', {
      configurable: true,
      get: vi.fn(() => true), // Initial value doesn't matter much as it's set by component
      set: vi.fn(), // Mock the setter to track calls
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders video element with correct src and poster when videoUrl is provided', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` });
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockMovie.videoUrl);
    expect(videoElement).toHaveAttribute('poster', mockMovie.posterUrl);
    // Controls attribute is now dynamically managed
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

  it('attempts to play the video on mount and shows UI (including native controls)', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
    });
    // UI should be visible initially, and native controls should be set to true
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    // The 'controls' setter on the mock is called by the component's useEffect
    await waitFor(() => expect(videoElement.controls).toBe(true));
  });

  it('shows pause overlay with info and resume button when video is paused and UI is visible (native controls true)', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    
    // Simulate video being paused
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); }); 

    await waitFor(() => {
      // Info section content
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
      // Resume button
      expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
      expect(videoElement.controls).toBe(true);
    });
  });
  
  it('shows hover info overlay when video is playing and UI is visible (mouse is active, native controls true)', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    // Simulate video playing
    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); });
    
    // Simulate mouse move to show UI
    act(() => { fireEvent.mouseMove(playerContainer); });

    await waitFor(() => {
      expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument(); // Hover title is h2
      expect(videoElement.controls).toBe(true);
    });
  });

  it('hides hover info overlay and native controls after timeout when video is playing and mouse is inactive', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); });
    
    act(() => { fireEvent.mouseMove(playerContainer); }); // Make UI visible and start timer

    await waitFor(() => { // UI is visible
      expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument();
      expect(videoElement.controls).toBe(true);
    });
    
    act(() => { vi.advanceTimersByTime(3000); }); // Advance timer

    await waitFor(() => { // UI should be hidden
      expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
      expect(videoElement.controls).toBe(false);
    });
  });
  
  it('keeps pause overlay and native controls visible when paused, regardless of mouse activity/timeout', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); });

    await waitFor(() => { // Pause overlay visible
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
      expect(videoElement.controls).toBe(true);
    });

    act(() => { fireEvent.mouseMove(playerContainer); }); // Move mouse
    act(() => { vi.advanceTimersByTime(4000); }); // Advance time past timeout

    await waitFor(() => { // Pause overlay should still be visible
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
      expect(videoElement.controls).toBe(true);
    });
  });

  it('toggles play/pause on player container click and manages UI visibility', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    // Initial: Play is called on mount, assume it's playing for this test part
    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true });
    act(() => { fireEvent.play(videoElement); }); // Simulate play event
    act(() => { fireEvent.mouseMove(playerContainer); }); // Ensure UI is active
    
    await waitFor(() => expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument());

    // Click to Pause
    Object.defineProperty(videoElement, 'paused', { get: () => true, configurable: true });
    await user.click(playerContainer); 
    
    await waitFor(() => {
        expect(mockPause).toHaveBeenCalledTimes(1);
        expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument(); // Pause overlay
        expect(videoElement.controls).toBe(true);
    });
    mockPause.mockClear();

    // Click to Play
    mockPlay.mockClear(); // Clear mount play call
    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true });
    await user.click(playerContainer);
    
    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalledTimes(1); 
        expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument(); // Hover overlay
        expect(videoElement.controls).toBe(true);
    });
    act(() => { vi.advanceTimersByTime(3000); }); // Let UI hide
     await waitFor(() => {
        expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
        expect(videoElement.controls).toBe(false);
    });
  });

  it('resumes play when "Resume" button on pause overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); }); // Simulate pause

    const resumeButton = await screen.findByRole('button', { name: `Resume playing ${mockMovie.title}` });
    
    mockPlay.mockClear(); // Clear previous play calls (e.g., from mount)
    Object.defineProperty(videoElement, 'paused', { get: () => false }); // Simulate playing after click

    await user.click(resumeButton);
    
    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
      // Hover overlay should appear
      expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument();
    });
  });
  
  it('shows UI and native controls when video ends', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    // Simulate playing then ending
    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); });
    act(() => { vi.advanceTimersByTime(3000); }); // Let UI hide while playing

    await waitFor(() => {
        expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
        expect(videoElement.controls).toBe(false);
    });
    
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.ended(videoElement); }); // Simulate video ended

    await waitFor(() => { // UI (pause overlay) should be visible
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
      expect(videoElement.controls).toBe(true);
    });
  });

});
