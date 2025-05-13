
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
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: vi.fn(() => true), 
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

  it('shows pause overlay with top-left info and centered button when video is paused', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); }); 
    
    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); }); 

    await waitFor(() => {
      // Info section content (should be top-left)
      expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument(); // More specific selector
      expect(screen.getByText(mockMovie.description, {selector: 'p.text-sm'})).toBeInTheDocument(); // More specific selector
      expect(screen.getByText(mockMovie.year.toString())).toBeInTheDocument();
      expect(screen.getByText(mockMovie.duration)).toBeInTheDocument();
      expect(screen.getByText(mockMovie.genre, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(`Rating: ${mockMovie.rating}/5`)).toBeInTheDocument();
      
      // Resume button (should be centered)
      const resumeButton = screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` });
      expect(resumeButton).toBeInTheDocument();
      // Check for classes that imply centering (approximate check)
      expect(resumeButton.parentElement).toHaveClass('absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2');
    });
  });

  it('hides pause overlay and resumes play when "Resume Play" button on pause overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); });

    const resumeButton = await screen.findByRole('button', { name: `Resume playing ${mockMovie.title}` });
    expect(resumeButton).toBeInTheDocument();
    
    mockPlay.mockClear(); 
    Object.defineProperty(videoElement, 'paused', { get: () => false });

    await user.click(resumeButton);
    
    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(mockMovie.title, { selector: 'h1.text-2xl' })).not.toBeInTheDocument();
    });
  });

  it('shows pause overlay if autoplay is prevented (video remains paused)', async () => {
    mockPlay.mockImplementationOnce(() => Promise.reject(new Error("Autoplay prevented by browser")));
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: vi.fn(() => true), 
    });
    
    render(<VideoPlayerComponent movie={mockMovie} />);

    await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled(); 
        expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
    });
  });

  it('shows hover overlay (top-left info) on mouse enter if video is playing, hides on mouse leave', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    Object.defineProperty(videoElement, 'paused', { get: () => false });
    act(() => { fireEvent.play(videoElement); }); 

    await waitFor(() => expect(screen.queryByText(mockMovie.title, {selector: 'h1.text-2xl'})).not.toBeInTheDocument());

    fireEvent.mouseEnter(playerContainer);
    await waitFor(() => {
      expect(screen.getByText(mockMovie.title, { selector: 'h2.text-xl' })).toBeInTheDocument(); // Hover title is h2
      expect(screen.getByText(mockMovie.description, {selector: 'p.text-xs'})).toBeInTheDocument();
      expect(screen.getByText(mockMovie.year.toString())).toBeInTheDocument();
      expect(screen.getByText(mockMovie.duration)).toBeInTheDocument();
      expect(screen.getByText(mockMovie.genre, { exact: false })).toBeInTheDocument();
      expect(screen.queryByText(`Rating: ${mockMovie.rating}/5`)).not.toBeInTheDocument(); // Rating not in hover
    });

    fireEvent.mouseLeave(playerContainer);
    await waitFor(() => {
      expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
    });
  });

  it('does NOT show hover overlay if video is paused, even on mouse enter', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    Object.defineProperty(videoElement, 'paused', { get: () => true });
    act(() => { fireEvent.pause(videoElement); });

    await waitFor(() => {
        expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
    });
    
    fireEvent.mouseEnter(playerContainer);
    await act(() => vi.advanceTimersByTime(100)); 

    expect(screen.queryByText(mockMovie.title, { selector: 'h2.text-xl' })).not.toBeInTheDocument();
    expect(screen.getByText(mockMovie.title, { selector: 'h1.text-2xl' })).toBeInTheDocument();
  });

  it('toggles play/pause on video click', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }) as HTMLVideoElement;

    mockPlay.mockClear(); 
    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true }); 

    await user.click(videoElement);
    expect(mockPause).toHaveBeenCalledTimes(1);
    mockPause.mockClear();
    Object.defineProperty(videoElement, 'paused', { get: () => true, configurable: true }); 

    await user.click(videoElement);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    mockPlay.mockClear();
    Object.defineProperty(videoElement, 'paused', { get: () => false, configurable: true }); 
  });

});
