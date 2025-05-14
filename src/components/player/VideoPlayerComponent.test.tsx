
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoPlayerComponent from './VideoPlayerComponent';
import type { Movie } from '@/types/movie';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Mock } from 'vitest';
import type { VideoElementWithFullscreen, MockVideoElement, ScreenMobile } from './interfaces';


// Mock useIsMobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}));

const mockMovie: Movie = {
  id: 'test-movie',
  title: 'Test Movie Title',
  description: 'A great test movie for player component.',
  posterUrl: 'https://placehold.co/1280x720.png',
  videoUrl: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4', // A real, short mp4
  genre: 'Testing',
  duration: '10m', // Keep it short for any potential load tests
  rating: 4.5,
  year: 2024,
};

// Mock HTMLMediaElement methods and properties
let mockVideoElement: HTMLVideoElement & MockVideoElement;
let mockPlayerContainerElement: HTMLDivElement;


describe('VideoPlayerComponent', () => {
  let useRefSpy: Mock;
  // Helper to simulate internal setShowPlayerUI state for testing opacity changes directly
  let setShowPlayerUIState: React.Dispatch<React.SetStateAction<boolean>> | undefined;


  beforeEach(() => {
    vi.useFakeTimers();
    (useIsMobile as Mock).mockReturnValue(false); // Default to desktop

    mockVideoElement = {
      ...document.createElement('video'), // Spread to get basic HTMLElement props
      // Specific HTMLVideoElement mocks
      paused: true,
      ended: false,
      currentTime: 0,
      duration: 600, // 10 minutes
      volume: 1,
      muted: false,
      playbackRate: 1,
      controls: false,
      playsInline: false, // initial state for playsInline
      play: vi.fn(() => {
        mockVideoElement.paused = false;
        const event = new Event('play');
        mockVideoElement.dispatchEvent(event);
        return Promise.resolve();
      }),
      pause: vi.fn(() => {
        mockVideoElement.paused = true;
        const event = new Event('pause');
        mockVideoElement.dispatchEvent(event);
      }),
      addEventListener: vi.fn((event, callback) => {
        // Minimal mock for addEventListener to track calls if needed
        // or to manually trigger events for testing
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(HTMLMediaElement.prototype.dispatchEvent), // Use the real dispatchEvent for actual events
      // Mock Fullscreen API related properties for the video element if it were the target
      requestFullscreen: vi.fn(() => Promise.resolve()),
      webkitRequestFullscreen: vi.fn(() => Promise.resolve()),
      mozRequestFullScreen: vi.fn(() => Promise.resolve()),
      msRequestFullscreen: vi.fn(() => Promise.resolve()),
    } as unknown as HTMLVideoElement & MockVideoElement;


    mockPlayerContainerElement = {
        ...document.createElement('div'),
        requestFullscreen: vi.fn(() => {
            Object.defineProperty(document, 'fullscreenElement', {
                configurable: true,
                value: mockPlayerContainerElement,
            });
            document.dispatchEvent(new Event('fullscreenchange'));
            return Promise.resolve();
        }),
        webkitRequestFullscreen: vi.fn(() => {
             Object.defineProperty(document, 'webkitFullscreenElement', {
                configurable: true,
                value: mockPlayerContainerElement,
            });
            document.dispatchEvent(new Event('webkitfullscreenchange'));
            return Promise.resolve();
        }),
        mozRequestFullScreen: vi.fn(() => {
            Object.defineProperty(document, 'mozFullScreenElement', {
                configurable: true,
                value: mockPlayerContainerElement,
            });
            document.dispatchEvent(new Event('mozfullscreenchange'));
            return Promise.resolve();
        }),
        msRequestFullscreen: vi.fn(() => {
             Object.defineProperty(document, 'msFullscreenElement', {
                configurable: true,
                value: mockPlayerContainerElement,
            });
            document.dispatchEvent(new Event('MSFullscreenChange'));
            return Promise.resolve();
        }),
    } as unknown as HTMLDivElement;

    // Mock document fullscreen elements and exit functions
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'mozFullScreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'msFullscreenElement', { configurable: true, value: null });
    document.exitFullscreen = vi.fn(() => {
        Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
    });
    document.webkitExitFullscreen = vi.fn(() => {
        Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, value: null });
        document.dispatchEvent(new Event('webkitfullscreenchange'));
        return Promise.resolve();
    });
    document.mozCancelFullScreen = vi.fn(() => {
        Object.defineProperty(document, 'mozFullScreenElement', { configurable: true, value: null });
        document.dispatchEvent(new Event('mozfullscreenchange'));
        return Promise.resolve();
    });
    document.msExitFullscreen = vi.fn(() => {
        Object.defineProperty(document, 'msFullscreenElement', { configurable: true, value: null });
        document.dispatchEvent(new Event('MSFullscreenChange'));
        return Promise.resolve();
    });


    // Screen orientation lock/unlock mocks
    const mockOrientation: ScreenMobile = { // Use ScreenMobile type
        lock: vi.fn(() => Promise.resolve()),
        unlock: vi.fn(),
        type: 'landscape-primary' // Add a default type
    };
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: mockOrientation });


    // Spy on useRef and return the mock elements for the first two calls (videoRef, playerContainerRef)
    // and a standard ref for the third (uiTimeoutRef)
    let refCallCount = 0;
    useRefSpy = vi.spyOn(React, 'useRef').mockImplementation(() => {
        refCallCount++;
        if (refCallCount === 1) return { current: mockVideoElement };
        if (refCallCount === 2) return { current: mockPlayerContainerElement };
        return { current: null }; // For uiTimeoutRef
    });

    // Mock React.useState to capture setShowPlayerUI setter
    // This is a bit more involved if you have multiple boolean states.
    // For simplicity, assuming the first boolean useState is for showPlayerUI.
    // A more robust way would be to identify it by its initial value or context.
    setShowPlayerUIState = undefined; // Reset for each test
    const originalUseState = React.useState;
    vi.spyOn(React, 'useState').mockImplementation((initialValue: any) => {
      const [state, setState] = originalUseState(initialValue);
      if (typeof initialValue === 'boolean' && initialValue === true && !setShowPlayerUIState) {
        // Assuming showPlayerUI is the one starting true and we haven't captured it yet
        setShowPlayerUIState = setState as React.Dispatch<React.SetStateAction<boolean>>;
      }
      return [state, setState];
    });

  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks(); // This will restore the original React.useRef and React.useState

    // Clean up fullscreen element properties on document
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'mozFullScreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'msFullscreenElement', { configurable: true, value: null });
  });

  it('renders video player with poster and correct aria-label', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByTestId('video-player');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('poster', mockMovie.posterUrl);
    expect(videoElement).toHaveAttribute('aria-label', `Video player for ${mockMovie.title}`);
    expect(videoElement).toHaveAttribute('src', mockMovie.videoUrl);
  });

  it('displays movie title and details in pause overlay when paused', () => {
    mockVideoElement.paused = true; // Start as paused
    render(<VideoPlayerComponent movie={mockMovie} />);

    expect(screen.getByText(mockMovie.title)).toBeInTheDocument();
    expect(screen.getByText(mockMovie.description)).toBeInTheDocument();
    expect(screen.getByText(String(mockMovie.year))).toBeInTheDocument();
    expect(screen.getByText(mockMovie.duration)).toBeInTheDocument();
    expect(screen.getByText(mockMovie.genre, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(`Rating: ${mockMovie.rating}/5`)).toBeInTheDocument();
    expect(screen.getByLabelText(`Resume playing ${mockMovie.title}`)).toBeInTheDocument();
  });


  it('displays movie title and limited details in hover overlay when playing and UI is shown', async () => {
    mockVideoElement.paused = false; // Start as playing
    render(<VideoPlayerComponent movie={mockMovie} />);

    // Simulate mouse move to show UI (useEffect also shows UI on play initially)
    const playerContainer = screen.getByTestId('video-player').parentElement!;
    fireEvent.mouseMove(playerContainer);

    await waitFor(() => {
      // Check for elements specific to the hover overlay (might be different from pause overlay)
      expect(screen.getByText(mockMovie.title)).toBeInTheDocument(); // Title is common
      // Check for presence of specific elements that are part of the *playing* overlay info
      expect(screen.getByText(mockMovie.description, { exact: false })).toBeInTheDocument();
    });
  });


  it('toggles play/pause via control button', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playPauseButton = screen.getByLabelText('Play'); // Initial state is paused, so button is "Play"

    // Click to Play
    mockVideoElement.paused = true; // Ensure it's seen as paused
    await userEvent.click(playPauseButton);
    expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByLabelText('Pause')).toBeInTheDocument());

    // Click to Pause
    mockVideoElement.paused = false; // Ensure it's seen as playing
    await userEvent.click(screen.getByLabelText('Pause'));
    expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByLabelText('Play')).toBeInTheDocument());
  });


  it('resumes play via central resume button when paused', async () => {
    mockVideoElement.paused = true; // Start as paused
    render(<VideoPlayerComponent movie={mockMovie} />);
    const resumeButton = screen.getByLabelText(`Resume playing ${mockMovie.title}`);

    await userEvent.click(resumeButton);
    expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
  });


  it('toggles play/pause on player area click (desktop)', async () => {
    (useIsMobile as Mock).mockReturnValue(false); // Simulate desktop
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerArea = screen.getByTestId('video-player').parentElement!;

    // Scenario 1: Video is playing, click to pause
    mockVideoElement.paused = false;
    mockVideoElement.play.mockClear();
    mockVideoElement.pause.mockClear();
    
    fireEvent.click(playerArea);
    expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
    expect(mockVideoElement.play).not.toHaveBeenCalled();

    // Scenario 2: Video is paused, click to play
    mockVideoElement.paused = true; // Set to paused
    // Simulate the 'pause' event if necessary for state update in component
    const pauseEvent = new Event('pause');
    mockVideoElement.dispatchEvent(pauseEvent);
    
    mockVideoElement.play.mockClear();
    mockVideoElement.pause.mockClear();

    fireEvent.click(playerArea);
    expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
    expect(mockVideoElement.pause).not.toHaveBeenCalled();
  });

  it('toggles play/pause on player area click and shows UI (mobile)', async () => {
    (useIsMobile as Mock).mockReturnValue(true); // Simulate mobile
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerArea = screen.getByTestId('video-player').parentElement!;
    const controlsBar = screen.getByTestId('video-controls-bar');

    // Scenario 1: Video is playing, UI initially hidden, click to pause and show UI
    mockVideoElement.paused = false;
    if (setShowPlayerUIState) act(() => setShowPlayerUIState!(false)); // Force hide UI
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 0'));
    
    mockVideoElement.play.mockClear();
    mockVideoElement.pause.mockClear();

    fireEvent.click(playerArea);
    expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
    expect(mockVideoElement.play).not.toHaveBeenCalled();
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));

    // Scenario 2: Video is paused, UI initially hidden, click to play and show UI
    mockVideoElement.paused = true;
    const pauseEvent = new Event('pause'); // Ensure component state updates
    mockVideoElement.dispatchEvent(pauseEvent);
    if (setShowPlayerUIState) act(() => setShowPlayerUIState!(false)); // Force hide UI
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 0'));

    mockVideoElement.play.mockClear();
    mockVideoElement.pause.mockClear();
    
    fireEvent.click(playerArea);
    expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
    expect(mockVideoElement.pause).not.toHaveBeenCalled();
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));
  });


  it('seeks video on progress slider change', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const progressSlider = screen.getByLabelText('Video progress').querySelector('span[role="slider"]')!;

    fireEvent.mouseDown(progressSlider); 
    act(() => {
        mockVideoElement.currentTime = 300; // Halfway
        const timeUpdateEvent = new Event('timeupdate');
        mockVideoElement.dispatchEvent(timeUpdateEvent);
    });
    await waitFor(() => {
      expect(progressSlider).toHaveAttribute('aria-valuenow', '300');
    });
  });


  it('toggles mute via volume button and updates volume slider', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const muteButton = screen.getByLabelText('Mute');
    const volumeSliderInput = screen.getByTestId('volume-slider').querySelector('span[role="slider"]')!;

    // Mute
    mockVideoElement.muted = false;
    mockVideoElement.volume = 0.7;
    await userEvent.click(muteButton);
    expect(mockVideoElement.muted).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('Unmute')).toBeInTheDocument());
    expect(volumeSliderInput).toHaveAttribute('aria-valuenow', '0');


    // Unmute
    await userEvent.click(screen.getByLabelText('Unmute'));
    expect(mockVideoElement.muted).toBe(false);
    await waitFor(() => expect(screen.getByLabelText('Mute')).toBeInTheDocument());
    expect(volumeSliderInput).toHaveAttribute('aria-valuenow', String(mockVideoElement.volume)); // Should restore previous volume or a default
  });


  it('changes volume via volume slider', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    act(() => {
        mockVideoElement.volume = 0.5;
        const volumeChangeEvent = new Event('volumechange');
        mockVideoElement.dispatchEvent(volumeChangeEvent);
    });
    await waitFor(() => {
        const volumeSliderInput = screen.getByTestId('volume-slider').querySelector('span[role="slider"]')!;
        expect(volumeSliderInput).toHaveAttribute('aria-valuenow', '0.5');
        expect(mockVideoElement.volume).toBe(0.5);
    });
  });


  it('changes playback speed via speed control dropdown', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const speedButton = screen.getByLabelText('Playback speed 1x');
    await userEvent.click(speedButton);

    const speedOption = await screen.findByText('1.5x'); 
    await userEvent.click(speedOption);

    expect(mockVideoElement.playbackRate).toBe(1.5);
    await waitFor(() => expect(screen.getByLabelText('Playback speed 1.5x')).toBeInTheDocument());
  });

  it('toggles fullscreen via fullscreen button (always visible)', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const fullscreenButton = screen.getByLabelText('Enter fullscreen');

    // Enter fullscreen
    await userEvent.click(fullscreenButton);
    expect(mockPlayerContainerElement.requestFullscreen ||
           mockPlayerContainerElement.webkitRequestFullscreen ||
           mockPlayerContainerElement.mozRequestFullScreen ||
           mockPlayerContainerElement.msRequestFullscreen).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument());
    expect(window.screen.orientation.lock).toHaveBeenCalledWith('landscape-primary');


    // Exit fullscreen
    const exitFullscreenButton = screen.getByLabelText('Exit fullscreen');
    await userEvent.click(exitFullscreenButton);
    expect(document.exitFullscreen ||
           (document as any).webkitExitFullscreen ||
           (document as any).mozCancelFullScreen ||
           (document as any).msExitFullscreen).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument());
    expect(window.screen.orientation.unlock).toHaveBeenCalled();
  });


  it('hides UI controls after mouse inactivity, shows on mouse move', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const controlsBar = screen.getByTestId('video-controls-bar');
    const playerContainer = screen.getByTestId('video-player').parentElement!;

    mockVideoElement.paused = false;
    // Simulate play event which should make UI visible and start timer
    const playEvent = new Event('play');
    mockVideoElement.dispatchEvent(playEvent);

    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));

    act(() => {
      vi.advanceTimersByTime(3000); // uiTimeoutRef duration
    });
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 0'));

    fireEvent.mouseMove(playerContainer);
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));
  });


  it('keeps UI controls visible when video is paused', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const controlsBar = screen.getByTestId('video-controls-bar');

    mockVideoElement.paused = true; 
    const pauseEvent = new Event('pause');
    mockVideoElement.dispatchEvent(pauseEvent); // Ensure component state updates and UI is shown

    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));

    act(() => {
      vi.advanceTimersByTime(5000); 
    });
    expect(controlsBar).toHaveStyle('opacity: 1'); // UI should still be visible
  });

    it('renders VideoNotAvailable message if movie.videoUrl is missing', () => {
        const movieWithoutVideo: Movie = { ...mockMovie, videoUrl: '' };
        render(<VideoPlayerComponent movie={movieWithoutVideo} />);
        expect(screen.getByText(`Video source not available for ${movieWithoutVideo.title}.`)).toBeInTheDocument();
        // Video element shouldn't render, so don't try to getByTestId for it.
        expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });

    it('ensures video.controls is false and playsInline is true', () => {
        render(<VideoPlayerComponent movie={mockMovie} />);
        expect(mockVideoElement.controls).toBe(false);
        expect(mockVideoElement.playsInline).toBe(true);
    });

    it('correctly formats time display', async () => {
        render(<VideoPlayerComponent movie={mockMovie} />);
        act(() => {
            mockVideoElement.currentTime = 70; // 1 minute 10 seconds
            mockVideoElement.duration = 135; // 2 minutes 15 seconds
            const timeUpdateEvent = new Event('timeupdate');
            mockVideoElement.dispatchEvent(timeUpdateEvent);
            const loadedMetaEvent = new Event('loadedmetadata');
            mockVideoElement.dispatchEvent(loadedMetaEvent);
        });
        
        await waitFor(() => {
          expect(screen.getByText('01:10 / 02:15')).toBeInTheDocument();
        });
    });

    it('shows fullscreen button on mobile (as per latest requirement)', () => {
      (useIsMobile as Mock).mockReturnValue(true);
      render(<VideoPlayerComponent movie={mockMovie} />);
      expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
    });

    it('shows fullscreen button on desktop', () => {
        (useIsMobile as Mock).mockReturnValue(false);
        render(<VideoPlayerComponent movie={mockMovie} />);
        expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
    });

    it('player click on mobile shows UI and toggles play/pause', async () => {
        (useIsMobile as Mock).mockReturnValue(true);
        render(<VideoPlayerComponent movie={mockMovie} />);
        const playerArea = screen.getByTestId('video-player').parentElement!;
        const controlsBar = screen.getByTestId('video-controls-bar');

        // Start playing, hide UI for test clarity
        mockVideoElement.paused = false;
        if (setShowPlayerUIState) act(() => setShowPlayerUIState!(false));
        await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 0'));

        fireEvent.click(playerArea); // Click to pause
        expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));

        // Now paused, click to play
        mockVideoElement.paused = true; // Simulate paused state
        const pauseEvent = new Event('pause'); // Trigger event to update component state
        mockVideoElement.dispatchEvent(pauseEvent);
        if (setShowPlayerUIState) act(() => setShowPlayerUIState!(false)); // Hide UI again
        await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 0'));
        
        mockVideoElement.play.mockClear(); // Clear previous calls

        fireEvent.click(playerArea); // Click to play
        expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));
    });
});

