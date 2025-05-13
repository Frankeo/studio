
import { render, screen } from '@testing-library/react';
import VideoPlayerComponent from './VideoPlayerComponent';
import type { Movie } from '@/types/movie';
import { MOCK_VIDEO_URL } from '@/lib/mockData';


const mockMovie: Movie = {
  id: 'vid1',
  title: 'Test Video Movie',
  description: 'A movie for testing the player.',
  posterUrl: 'https://picsum.photos/seed/vid1-poster/1280/720',
  videoUrl: MOCK_VIDEO_URL, // Use the actual mock video URL
  genre: 'Test',
  duration: '10m',
  rating: 5,
  year: 2024,
};

// Mock HTMLVideoElement methods if needed, e.g., play, pause, focus
// For basic rendering, this might not be necessary.
// If tests interact with playback, these mocks would be essential.
// For now, we'll assume JSDOM handles the <video> tag sufficiently for rendering.
// HTMLMediaElement.prototype.load = () => { /* do nothing */ };
// HTMLMediaElement.prototype.play = () => { /* do nothing */ return Promise.resolve(); };
// HTMLMediaElement.prototype.pause = () => { /* do nothing */ };


describe('VideoPlayerComponent', () => {
  it('renders video element with correct src and poster when videoUrl is provided', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` });
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockMovie.videoUrl);
    expect(videoElement).toHaveAttribute('poster', mockMovie.posterUrl);
    expect(videoElement).toHaveAttribute('controls'); // Check for controls attribute
    // autoPlay is harder to test effectively in JSDOM without deeper media mocking.
    // We can check if the attribute is present.
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
    const movieWithoutVideoUrl = { ...mockMovie, videoUrl: '' }; // Empty or undefined
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

  // Test for focus - JSDOM focus behavior might be limited
  it('attempts to focus the video element on mount', () => {
    const mockFocus = vi.fn();
    HTMLVideoElement.prototype.focus = mockFocus; // Mock focus on the prototype

    render(<VideoPlayerComponent movie={mockMovie} />);
    expect(mockFocus).toHaveBeenCalled();

    // Cleanup the mock
    // @ts-ignore
    delete HTMLVideoElement.prototype.focus;
  });
});
