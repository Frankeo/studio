
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
let mockVideoElement: HTMLVideoElement & MockVideoElement & VideoElementWithFullscreen;
let mockPlayerContainerElement: HTMLDivElement;


describe('VideoPlayerComponent', () => {
  let useRefSpy: Mock;
  // Helper to simulate internal setShowPlayerUI state for testing opacity changes directly
  let setShowPlayerUIState: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  let setIsVideoBufferingState: React.Dispatch<React.SetStateAction<boolean>> | undefined;


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
      playsInline: false, 
      readyState: HTMLMediaElement.HAVE_NOTHING, // Initial readyState
      HAVE_ENOUGH_DATA: HTMLMediaElement.HAVE_ENOUGH_DATA, // Constant for comparison
      play: vi.fn(() => {
        mockVideoElement.paused = false;
        mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA; // Simulate video loaded
        const playEvent = new Event('play');
        mockVideoElement.dispatchEvent(playEvent);
        const playingEvent = new Event('playing'); // Also dispatch 'playing'
        mockVideoElement.dispatchEvent(playingEvent);
        const canPlayEvent = new Event('canplay'); // Simulate canplay
        mockVideoElement.dispatchEvent(canPlayEvent);
        return Promise.resolve();
      }),
      pause: vi.fn(() => {
        mockVideoElement.paused = true;
        const event = new Event('pause');
        mockVideoElement.dispatchEvent(event);
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(HTMLMediaElement.prototype.dispatchEvent), 
      requestFullscreen: vi.fn(() => Promise.resolve()),
      webkitRequestFullscreen: vi.fn(() => Promise.resolve()),
      mozRequestFullScreen: vi.fn(() => Promise.resolve()),
      msRequestFullscreen: vi.fn(() => Promise.resolve()),
      webkitEnterFullscreen: vi.fn(), // For iOS
      webkitExitFullscreen: vi.fn(),  // For iOS
      webkitSupportsFullscreen: true,
      webkitDisplayingFullscreen: false,
    } as unknown as HTMLVideoElement & MockVideoElement & VideoElementWithFullscreen;


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


    const mockOrientation: ScreenMobile = { 
        lock: vi.fn(() => Promise.resolve()),
        unlock: vi.fn(),
        type: 'landscape-primary' 
    };
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: mockOrientation });


    let refCallCount = 0;
    useRefSpy = vi.spyOn(React, 'useRef').mockImplementation(() => {
        refCallCount++;
        if (refCallCount === 1) return { current: mockVideoElement };
        if (refCallCount === 2) return { current: mockPlayerContainerElement };
        return { current: null }; 
    });

    setShowPlayerUIState = undefined; 
    setIsVideoBufferingState = undefined;
    const originalUseState = React.useState;
    let booleanStateCount = 0;
    vi.spyOn(React, 'useState').mockImplementation((initialValue: any) => {
      const [state, setState] = originalUseState(initialValue);
      if (typeof initialValue === 'boolean') {
        booleanStateCount++;
        if (booleanStateCount === 2 && initialValue === true && !setShowPlayerUIState) { // showPlayerUI is 2nd boolean, starts true
          setShowPlayerUIState = setState as React.Dispatch<React.SetStateAction<boolean>>;
        } else if (booleanStateCount === 7 && initialValue === true && !setIsVideoBufferingState) { // isVideoBuffering is 7th boolean, starts true
          setIsVideoBufferingState = setState as React.Dispatch<React.SetStateAction<boolean>>;
        }
      }
      return [state, setState];
    });

  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks(); 

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

  it('displays buffering Clapperboard when isVideoBuffering is true', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    // isVideoBuffering is true by default from useState mock or initial state
    // and mockVideoElement.readyState is HAVE_NOTHING initially

    // Ensure the component processes the initial state
    await act(async () => {
        vi.runAllTimers(); // Process useEffects
    });
    
    expect(screen.getByLabelText(`Video player for ${mockMovie.title}`).parentElement?.querySelector('.lucide-clapperboard.animate-pulse')).toBeInTheDocument();

    // Simulate video can play
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false)); // Manually set for test clarity
    
    // Or trigger event that sets it to false
    act(() => {
      const canPlayEvent = new Event('canplay');
      mockVideoElement.dispatchEvent(canPlayEvent);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(`Video player for ${mockMovie.title}`).parentElement?.querySelector('.lucide-clapperboard.animate-pulse')).not.toBeInTheDocument();
    });
  });


  it('displays movie title and details in pause overlay when paused and not buffering', async () => {
    mockVideoElement.paused = true; 
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA; // Not buffering
    render(<VideoPlayerComponent movie={mockMovie} />);
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false));

    // Simulate pause event to ensure UI updates correctly
    act(() => {
      const pauseEvent = new Event('pause');
      mockVideoElement.dispatchEvent(pauseEvent);
    });


    await waitFor(() => {
      expect(screen.getByText(mockMovie.title)).toBeInTheDocument();
      expect(screen.getByText(mockMovie.description)).toBeInTheDocument();
      expect(screen.getByText(String(mockMovie.year))).toBeInTheDocument();
      expect(screen.getByText(mockMovie.duration)).toBeInTheDocument();
      expect(screen.getByText(mockMovie.genre, { exact: false })).toBeInTheDocument();
      expect(screen.getByText(`Rating: ${mockMovie.rating}/5`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Resume playing ${mockMovie.title}`)).toBeInTheDocument();
    });
  });


  it('displays movie title and limited details in hover overlay when playing, UI is shown, and not buffering', async () => {
    mockVideoElement.paused = false; 
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA; // Not buffering
    render(<VideoPlayerComponent movie={mockMovie} />);
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false));


    const playerContainer = screen.getByTestId('video-player').parentElement!;
    fireEvent.mouseMove(playerContainer);

    await waitFor(() => {
      expect(screen.getByText(mockMovie.title)).toBeInTheDocument(); 
      expect(screen.getByText(mockMovie.description, { exact: false })).toBeInTheDocument();
    });
  });


  it('toggles play/pause via control button', async () => {
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA; // Assume video is ready
    render(<VideoPlayerComponent movie={mockMovie} />);
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false)); // Not buffering

    const playPauseButton = screen.getByLabelText('Play'); 

    mockVideoElement.paused = true; 
    await userEvent.click(playPauseButton);
    expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByLabelText('Pause')).toBeInTheDocument());

    mockVideoElement.paused = false; 
    await userEvent.click(screen.getByLabelText('Pause'));
    expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByLabelText('Play')).toBeInTheDocument());
  });


  it('resumes play via central resume button when paused and not buffering', async () => {
    mockVideoElement.paused = true; 
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
    render(<VideoPlayerComponent movie={mockMovie} />);
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false));
    
    // Simulate pause event for UI update
    act(() => {
      const pauseEvent = new Event('pause');
      mockVideoElement.dispatchEvent(pauseEvent);
    });
    
    const resumeButton = await screen.findByLabelText(`Resume playing ${mockMovie.title}`);
    await userEvent.click(resumeButton);
    expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
  });

  it('toggles play/pause on player area click (desktop, not on controls)', async () => {
    (useIsMobile as Mock).mockReturnValue(false); 
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
    render(<VideoPlayerComponent movie={mockMovie} />);
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false));

    const playerArea = screen.getByTestId('video-player').parentElement!;

    // Play to Pause
    mockVideoElement.paused = false;
    mockVideoElement.play.mockClear(); 
    mockVideoElement.pause.mockClear();
    fireEvent.click(playerArea);
    expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
    expect(mockVideoElement.play).not.toHaveBeenCalled();

    // Pause to Play
    mockVideoElement.paused = true; 
    act(() => { const pauseEvent = new Event('pause'); mockVideoElement.dispatchEvent(pauseEvent); });
    mockVideoElement.play.mockClear();
    mockVideoElement.pause.mockClear();
    fireEvent.click(playerArea);
    expect(mockVideoElement.play).toHaveBeenCalledTimes(1);
    expect(mockVideoElement.pause).not.toHaveBeenCalled();
  });

  it('toggles play/pause on player area click (mobile, not on controls)', async () => {
    (useIsMobile as Mock).mockReturnValue(true);
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
    render(<VideoPlayerComponent movie={mockMovie} />);
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false));

    const playerArea = screen.getByTestId('video-player').parentElement!;
    const controlsBar = screen.getByTestId('video-controls-bar');

    // Play to Pause
    mockVideoElement.paused = false;
    if (setShowPlayerUIState) act(() => setShowPlayerUIState!(false)); 
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 0'));
    mockVideoElement.play.mockClear(); 
    mockVideoElement.pause.mockClear();
    fireEvent.click(playerArea);
    expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
    expect(mockVideoElement.play).not.toHaveBeenCalled();
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));

    // Pause to Play
    mockVideoElement.paused = true; 
    act(() => { const pauseEvent = new Event('pause'); mockVideoElement.dispatchEvent(pauseEvent); });
    if (setShowPlayerUIState) act(() => setShowPlayerUIState!(false)); 
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
        mockVideoElement.currentTime = 300; 
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

    mockVideoElement.muted = false;
    mockVideoElement.volume = 0.7;
    await userEvent.click(muteButton);
    expect(mockVideoElement.muted).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('Unmute')).toBeInTheDocument());
    expect(volumeSliderInput).toHaveAttribute('aria-valuenow', '0');


    await userEvent.click(screen.getByLabelText('Unmute'));
    expect(mockVideoElement.muted).toBe(false);
    await waitFor(() => expect(screen.getByLabelText('Mute')).toBeInTheDocument());
    // Volume should restore. Assuming it restores to 0.5 if previously 0.
    // Or check if it restores to the volume before mute IF that volume was not 0
    expect(volumeSliderInput).toHaveAttribute('aria-valuenow', String(mockVideoElement.volume === 0 ? 0.5 : mockVideoElement.volume)); 
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

    // Enter fullscreen (iOS path)
    mockVideoElement.webkitEnterFullscreen = vi.fn(); // Ensure iOS path is taken
    await userEvent.click(fullscreenButton);
    expect(mockVideoElement.webkitEnterFullscreen).toHaveBeenCalled();
    
    // Simulate fullscreen change event for iOS
    Object.defineProperty(mockVideoElement, 'webkitDisplayingFullscreen', { configurable: true, value: true });
    act(() => {
      const event = new Event('webkitbeginfullscreen');
      mockVideoElement.dispatchEvent(event);
    });
    await waitFor(() => expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument());
    expect(window.screen.orientation.lock).toHaveBeenCalledWith('landscape-primary');

    // Exit fullscreen (iOS path)
    mockVideoElement.webkitExitFullscreen = vi.fn();
    const exitFullscreenButton = screen.getByLabelText('Exit fullscreen');
    await userEvent.click(exitFullscreenButton);
    expect(mockVideoElement.webkitExitFullscreen).toHaveBeenCalled();

    // Simulate fullscreen change event for iOS exit
    Object.defineProperty(mockVideoElement, 'webkitDisplayingFullscreen', { configurable: true, value: false });
     act(() => {
      const event = new Event('webkitendfullscreen');
      mockVideoElement.dispatchEvent(event);
    });
    await waitFor(() => expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument());
    expect(window.screen.orientation.unlock).toHaveBeenCalled();
  });


  it('hides UI controls after mouse inactivity, shows on mouse move', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const controlsBar = screen.getByTestId('video-controls-bar');
    const playerContainer = screen.getByTestId('video-player').parentElement!;

    mockVideoElement.paused = false;
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false));
    
    act(() => {
      const playEvent = new Event('play');
      mockVideoElement.dispatchEvent(playEvent);
    });

    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));

    act(() => {
      vi.advanceTimersByTime(3000); 
    });
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 0'));

    fireEvent.mouseMove(playerContainer);
    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));
  });


  it('keeps UI controls visible when video is paused', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const controlsBar = screen.getByTestId('video-controls-bar');

    mockVideoElement.paused = true; 
    mockVideoElement.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
    if(setIsVideoBufferingState) act(() => setIsVideoBufferingState!(false));

    act(() => {
      const pauseEvent = new Event('pause');
      mockVideoElement.dispatchEvent(pauseEvent); 
    });


    await waitFor(() => expect(controlsBar).toHaveStyle('opacity: 1'));

    act(() => {
      vi.advanceTimersByTime(5000); 
    });
    expect(controlsBar).toHaveStyle('opacity: 1'); 
  });

    it('renders VideoNotAvailable message if movie.videoUrl is missing', () => {
        const movieWithoutVideo: Movie = { ...mockMovie, videoUrl: '' };
        render(<VideoPlayerComponent movie={movieWithoutVideo} />);
        expect(screen.getByText(`Video source not available for ${movieWithoutVideo.title}.`)).toBeInTheDocument();
        expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });

    it('ensures video.controls is false and playsInline attributes are true', () => {
        render(<VideoPlayerComponent movie={mockMovie} />);
        expect(mockVideoElement.controls).toBe(false);
        expect(mockVideoElement.playsInline).toBe(true); // From JS
        expect(screen.getByTestId('video-player')).toHaveAttribute('playsinline'); // From JSX
        expect(screen.getByTestId('video-player')).toHaveAttribute('webkit-playsinline', 'true'); // From JSX
    });

    it('correctly formats time display', async () => {
        render(<VideoPlayerComponent movie={mockMovie} />);
        act(() => {
            mockVideoElement.currentTime = 70; 
            mockVideoElement.duration = 135; 
            const timeUpdateEvent = new Event('timeupdate');
            mockVideoElement.dispatchEvent(timeUpdateEvent);
            const loadedMetaEvent = new Event('loadedmetadata');
            mockVideoElement.dispatchEvent(loadedMetaEvent);
        });
        
        await waitFor(() => {
          expect(screen.getByText('01:10 / 02:15')).toBeInTheDocument();
        });
    });

    it('shows fullscreen button on mobile', () => {
      (useIsMobile as Mock).mockReturnValue(true);
      render(<VideoPlayerComponent movie={mockMovie} />);
      expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
    });

    it('shows fullscreen button on desktop', () => {
        (useIsMobile as Mock).mockReturnValue(false);
        render(<VideoPlayerComponent movie={mockMovie} />);
        expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
    });
});
