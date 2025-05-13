
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
let mockRequestFullscreen = vi.fn();
let mockExitFullscreen = vi.fn();
let mockWebkitRequestFullscreen = vi.fn();
let mockWebkitExitFullscreen = vi.fn();


describe('VideoPlayerComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPlay = vi.fn(() => Promise.resolve());
    mockPause = vi.fn();
    mockRequestFullscreen = vi.fn();
    mockExitFullscreen = vi.fn();
    mockWebkitRequestFullscreen = vi.fn();
    mockWebkitExitFullscreen = vi.fn();


    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: mockPlay,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: mockPause,
    });
    // Default to paused initially for tests unless play is explicitly called
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: vi.fn(() => true), 
      set: vi.fn(),
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'controls', {
      configurable: true,
      get: vi.fn(() => false), // Mock initial value (component will set it)
      set: vi.fn(), // Mock the setter to track calls
    });

    // Mock fullscreen API on the HTMLElement prototype for playerContainerRef
    Object.defineProperty(window.HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: mockRequestFullscreen,
    });
     Object.defineProperty(window.HTMLElement.prototype, 'webkitRequestFullscreen', {
      configurable: true,
      value: mockWebkitRequestFullscreen,
    });

    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: mockExitFullscreen,
    });
    Object.defineProperty(document, 'webkitExitFullscreen', {
        configurable: true,
        value: mockWebkitExitFullscreen,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: vi.fn(() => null),
      set: vi.fn(),
    });
    Object.defineProperty(document, 'webkitFullscreenElement', {
      configurable: true,
      get: vi.fn(() => null),
      set: vi.fn(),
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
    // Native controls should always be false now
    expect((videoElement as HTMLVideoElement).controls).toBe(false);
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

  it('attempts to play the video on mount and shows UI, native controls are false', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
    });
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    expect(videoElement.controls).toBe(false); // Native controls always false
  });

  it('shows pause overlay with info and resume button when video is paused and UI is visible', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); }); 

    await waitFor(() => {
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
      expect(videoElement.controls).toBe(false);
    });
  });
  
  it('shows hover info overlay when video is playing and UI is visible (mouse is active)', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); });
    act(() => { fireEvent.mouseMove(playerContainer); });

    await waitFor(() => {
      expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument();
      expect(videoElement.controls).toBe(false);
    });
  });

  it('hides hover info overlay after timeout when video is playing and mouse is inactive', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); });
    act(() => { fireEvent.mouseMove(playerContainer); }); 

    await waitFor(() => { 
      expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument();
    });
    
    act(() => { vi.advanceTimersByTime(3000); }); 

    await waitFor(() => { 
      expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
      expect(videoElement.controls).toBe(false);
    });
  });
  
  it('keeps pause overlay visible when paused, regardless of mouse activity/timeout', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); });

    await waitFor(() => { 
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
    });

    act(() => { fireEvent.mouseMove(playerContainer); }); 
    act(() => { vi.advanceTimersByTime(4000); }); 

    await waitFor(() => { 
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
      expect(videoElement.controls).toBe(false);
    });
  });

  it('toggles play/pause on player container click and manages UI visibility', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true });
    act(() => { fireEvent.play(videoElement); }); 
    act(() => { fireEvent.mouseMove(playerContainer); });
    
    await waitFor(() => expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument());

    Object.defineProperty(videoElement, 'paused', { get: () => true, configurable: true });
    await user.click(playerContainer); 
    
    await waitFor(() => {
        expect(mockPause).toHaveBeenCalledTimes(1);
        expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
    });
    mockPause.mockClear();

    mockPlay.mockClear();
    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true });
    await user.click(playerContainer);
    
    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalledTimes(1); 
        expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument();
    });
    act(() => { vi.advanceTimersByTime(3000); });
     await waitFor(() => {
        expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
    });
  });

  it('resumes play when "Resume" button on pause overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); }); 

    const resumeButton = await screen.findByRole('button', { name: `Resume playing ${mockMovie.title}` });
    
    mockPlay.mockClear(); 
    Object.defineProperty(videoElement, 'paused', { get: () => false }); 

    await user.click(resumeButton);
    
    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument();
    });
  });
  
  it('shows UI when video ends', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); });
    act(() => { vi.advanceTimersByTime(3000); }); 

    await waitFor(() => {
        expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
    });
    
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.ended(videoElement); }); 

    await waitFor(() => { 
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
    });
  });

  it('toggles fullscreen when custom fullscreen button is clicked', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;

    // Make UI visible to show the button
    act(() => { fireEvent.mouseMove(playerContainer); });
    const fullscreenButton = await screen.findByRole('button', { name: /enter fullscreen/i });
    
    // Enter fullscreen
    await user.click(fullscreenButton);
    await waitFor(() => {
        expect(mockRequestFullscreen).toHaveBeenCalledTimes(1);
    });

    // Simulate fullscreenchange event and update document.fullscreenElement
    Object.defineProperty(document, 'fullscreenElement', { get: () => playerContainer });
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });

    const exitFullscreenButton = await screen.findByRole('button', { name: /exit fullscreen/i });
    expect(exitFullscreenButton).toBeInTheDocument();
    
    // Exit fullscreen
    await user.click(exitFullscreenButton);
    await waitFor(() => {
        expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
    });
    
    Object.defineProperty(document, 'fullscreenElement', { get: () => null });
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });

    const enterFullscreenButtonAgain = await screen.findByRole('button', { name: /enter fullscreen/i });
    expect(enterFullscreenButtonAgain).toBeInTheDocument();
  });

  it('fullscreen button is part of the UI that hides on inactivity', async () => {
     render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;
    const playerContainer = videoElement.parentElement!;

    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); });
    
    // Show UI
    act(() => { fireEvent.mouseMove(playerContainer); });
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter fullscreen/i})).toBeInTheDocument();
    });

    // Let UI hide
    act(() => { vi.advanceTimersByTime(3000); });
    await waitFor(() => {
        expect(screen.queryByRole('button', { name: /enter fullscreen/i})).not.toBeInTheDocument();
    });
  });

});


    