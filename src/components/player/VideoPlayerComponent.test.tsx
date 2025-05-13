
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
  duration: '10m0s', // Assuming this format, or should be number of seconds
  rating: 5,
  year: 2024,
};

// Mock HTMLVideoElement methods and properties
let mockVideoElement: Partial<HTMLVideoElement> & {
  _listeners: Record<string, Function[]>;
  _paused: boolean;
  _currentTime: number;
  _duration: number;
  _volume: number;
  _muted: boolean;
  _playbackRate: number;
  _controls: boolean;
  dispatchEvent: (event: Event) => boolean;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

let mockPlayerContainerElement: Partial<HTMLElement> & {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};


describe('VideoPlayerComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    mockVideoElement = {
      _listeners: {},
      _paused: true,
      _currentTime: 0,
      _duration: 600, // 10 minutes
      _volume: 1,
      _muted: false,
      _playbackRate: 1,
      _controls: false,

      play: vi.fn(() => {
        mockVideoElement._paused = false;
        act(() => mockVideoElement.dispatchEvent(new Event('play')));
        act(() => mockVideoElement.dispatchEvent(new Event('playing')));
        return Promise.resolve();
      }),
      pause: vi.fn(() => {
        mockVideoElement._paused = true;
        act(() => mockVideoElement.dispatchEvent(new Event('pause')));
      }),
      addEventListener: (type, listener) => {
        if (!mockVideoElement._listeners[type]) {
          mockVideoElement._listeners[type] = [];
        }
        mockVideoElement._listeners[type].push(listener as Function);
      },
      removeEventListener: (type, listener) => {
        if (mockVideoElement._listeners[type]) {
          mockVideoElement._listeners[type] = mockVideoElement._listeners[type].filter(
            (l) => l !== listener
          );
        }
      },
      dispatchEvent: (event: Event) => {
        if (mockVideoElement._listeners[event.type]) {
          mockVideoElement._listeners[event.type].forEach((l) => l(event));
        }
        return true;
      },
      // Getter/setter for properties
      get paused() { return mockVideoElement._paused; },
      get currentTime() { return mockVideoElement._currentTime; },
      set currentTime(val) { mockVideoElement._currentTime = val; act(() => mockVideoElement.dispatchEvent(new Event('timeupdate'))); },
      get duration() { return mockVideoElement._duration; },
      get volume() { return mockVideoElement._volume; },
      set volume(val) { mockVideoElement._volume = val; act(() => mockVideoElement.dispatchEvent(new Event('volumechange')));},
      get muted() { return mockVideoElement._muted; },
      set muted(val) { mockVideoElement._muted = val; act(() => mockVideoElement.dispatchEvent(new Event('volumechange')));},
      get playbackRate() { return mockVideoElement._playbackRate; },
      set playbackRate(val) { mockVideoElement._playbackRate = val; /* dispatch 'ratechange' if needed */ },
      get controls() { return mockVideoElement._controls; },
      set controls(val) { mockVideoElement._controls = val; },

    };
    
    mockPlayerContainerElement = {
        requestFullscreen: vi.fn(() => Promise.resolve()),
        webkitRequestFullscreen: vi.fn(() => Promise.resolve()),
        mozRequestFullScreen: vi.fn(() => Promise.resolve()),
        msRequestFullscreen: vi.fn(() => Promise.resolve()),
    };

    vi.spyOn(document, 'getElementById').mockImplementation(() => null); // Default mock
    vi.spyOn(React, 'useRef').mockImplementation((initialValue) => {
        if (initialValue === null && !initialValue?.tagName?.toLowerCase().includes('video')) { // Simple check for player container
             return { current: mockPlayerContainerElement as HTMLDivElement };
        }
        return { current: initialValue === null ? mockVideoElement as HTMLVideoElement : initialValue };
    });


    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: vi.fn(() => null),
      set: vi.fn(),
    });
    Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, get: vi.fn(() => null) });
    Object.defineProperty(document, 'mozFullScreenElement', { configurable: true, get: vi.fn(() => null) });
    Object.defineProperty(document, 'msFullscreenElement', { configurable: true, get: vi.fn(() => null) });


    document.exitFullscreen = vi.fn(() => Promise.resolve());
    (document as any).webkitExitFullscreen = vi.fn(() => Promise.resolve());
    (document as any).mozCancelFullScreen = vi.fn(() => Promise.resolve());
    (document as any).msExitFullscreen = vi.fn(() => Promise.resolve());

    // Mock window.screen.orientation
    Object.defineProperty(window, 'screen', {
      configurable: true,
      value: {
        ...window.screen,
        orientation: {
          lock: vi.fn(() => Promise.resolve()),
          unlock: vi.fn(() => Promise.resolve()),
          type: 'landscape-primary',
        },
      },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders video element with correct src and poster', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` });
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockMovie.videoUrl);
    expect(videoElement).toHaveAttribute('poster', mockMovie.posterUrl);
    expect(mockVideoElement.controls).toBe(false);
  });
  
  it('attempts to play video on mount', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalled();
    });
  });

  // --- Control Bar Tests ---
  describe('Control Bar Functionality', () => {
    it('shows control bar on mount (UI is initially visible)', () => {
      render(<VideoPlayerComponent movie={mockMovie} />);
      expect(screen.getByLabelText('Video progress')).toBeInTheDocument();
      expect(screen.getByLabelText('Play')).toBeInTheDocument(); // Initial state is paused, so "Play"
    });

    it('toggles play/pause via control bar button', async () => {
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      
      const playButton = screen.getByLabelText('Play'); // Initially Play
      await user.click(playButton);
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(1); // Initial call + 1 click
        expect(screen.getByLabelText('Pause')).toBeInTheDocument(); // Should change to Pause
      });

      const pauseButton = screen.getByLabelText('Pause');
      await user.click(pauseButton);
      await waitFor(() => {
        expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
        expect(screen.getByLabelText('Play')).toBeInTheDocument(); // Should change back to Play
      });
    });

    it('updates progress bar and time display on timeupdate', async () => {
      render(<VideoPlayerComponent movie={mockMovie} />);
      
      act(() => {
        mockVideoElement._currentTime = 30; // 30 seconds
        mockVideoElement._duration = 600; // 10 minutes
        mockVideoElement.dispatchEvent(new Event('loadedmetadata'));
        mockVideoElement.dispatchEvent(new Event('timeupdate'));
      });

      await waitFor(() => {
        expect(screen.getByText('00:30 / 10:00')).toBeInTheDocument();
        const progressBar = screen.getByLabelText('Video progress') as HTMLInputElement;
        // Slider value is currentTime
        expect(progressBar).toHaveAttribute('aria-valuenow', '30'); 
        // Shadcn slider visually represents this through internal spans, direct value check is complex.
        // We trust the component handles aria-valuenow correctly.
      });
    });

    it('seeks video when progress bar is changed', async () => {
       render(<VideoPlayerComponent movie={mockMovie} />);
       const user = userEvent.setup();
       const progressBar = screen.getByLabelText('Video progress');

       // Simulate user interaction with the slider (e.g., clicking at 50%)
       // This is tricky to test precisely for a Shadcn Slider.
       // We'll simulate the onValueChange behavior.
       // For a real slider, you'd fire mousedown, mousemove, mouseup.
       // Here, we'll assume the component's onValueChange is wired correctly.
       
       // Manually trigger what onValueChange would do if it were a simple input range
       fireEvent.change(progressBar, { target: { value: '120' } }); // Seek to 2 minutes (120s)
       
       // The component's `handleSeek` should be called.
       // We check the effect: `videoRef.current.currentTime` should be set.
       // Our mock for currentTime setter dispatches 'timeupdate'.

      await waitFor(() => {
        expect(mockVideoElement._currentTime).toBe(120);
      });
    });


    it('toggles mute via volume button', async () => {
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      const muteButton = screen.getByLabelText('Mute'); // Initially Unmuted, so label is "Mute"
      
      await user.click(muteButton);
      await waitFor(() => {
        expect(mockVideoElement._muted).toBe(true);
        expect(screen.getByLabelText('Unmute')).toBeInTheDocument(); // Label changes
      });

      await user.click(screen.getByLabelText('Unmute'));
      await waitFor(() => {
        expect(mockVideoElement._muted).toBe(false);
        expect(screen.getByLabelText('Mute')).toBeInTheDocument();
      });
    });

    it('changes volume via volume slider', async () => {
      render(<VideoPlayerComponent movie={mockMovie} />);
      const volumeSlider = screen.getByLabelText('Volume');

      // Simulate slider change to 50%
      // Similar to progress bar, direct simulation of Shadcn slider is complex.
      // Assuming onValueChange works as expected.
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });

      await waitFor(() => {
        expect(mockVideoElement._volume).toBe(0.5);
        expect(mockVideoElement._muted).toBe(false); // Changing volume un-mutes
      });
    });

    it('changes playback speed via dropdown', async () => {
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      
      const speedButton = screen.getByLabelText('Playback speed 1x');
      await user.click(speedButton); // Open dropdown

      const speedOption = await screen.findByText('1.5x'); // Assuming DropdownMenuItem text
      await user.click(speedOption);

      await waitFor(() => {
        expect(mockVideoElement._playbackRate).toBe(1.5);
        expect(screen.getByLabelText('Playback speed 1.5x')).toBeInTheDocument(); // Button text updates
      });
    });

    it('toggles fullscreen via fullscreen button and attempts orientation lock/unlock', async () => {
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      
      const enterFullscreenButton = screen.getByLabelText('Enter fullscreen');
      await user.click(enterFullscreenButton);
      await waitFor(() => {
        const requestFullscreenMock = mockPlayerContainerElement.requestFullscreen ||
                                    mockPlayerContainerElement.webkitRequestFullscreen ||
                                    mockPlayerContainerElement.mozRequestFullScreen ||
                                    mockPlayerContainerElement.msRequestFullscreen;
        expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
        if (window.screen?.orientation?.lock) {
            expect(window.screen.orientation.lock).toHaveBeenCalledWith('landscape');
        }
      });

      // Simulate fullscreen change
      Object.defineProperty(document, 'fullscreenElement', { get: () => mockPlayerContainerElement as HTMLElement, configurable: true });
      act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
      
      const exitFullscreenButton = await screen.findByLabelText('Exit fullscreen');
      await user.click(exitFullscreenButton);
      await waitFor(() => {
        const exitFullscreenMock = document.exitFullscreen ||
                                   (document as any).webkitExitFullscreen ||
                                   (document as any).mozCancelFullScreen ||
                                   (document as any).msExitFullscreen;
        expect(exitFullscreenMock).toHaveBeenCalledTimes(1);

        if (window.screen?.orientation?.unlock) {
            expect(window.screen.orientation.unlock).toHaveBeenCalled();
        }
      });
       Object.defineProperty(document, 'fullscreenElement', { get: () => null, configurable: true });
       act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
       expect(await screen.findByLabelText('Enter fullscreen')).toBeInTheDocument();
    });

    it('hides control bar on mouse inactivity when playing, shows on activity', async () => {
        render(<VideoPlayerComponent movie={mockMovie} />);
        const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;

        // Start playing
        mockVideoElement._paused = false;
        act(() => mockVideoElement.dispatchEvent(new Event('play')));
        
        // Mouse moves, UI should be visible
        fireEvent.mouseMove(playerContainer);
        await waitFor(() => {
            expect(screen.getByLabelText('Video progress')).toBeVisible();
        });

        // Advance timer
        act(() => { vi.advanceTimersByTime(3000); });
        await waitFor(() => {
            // Check for a specific element that would be hidden (e.g., progress bar not visible)
            // Direct visibility check is tricky due to opacity style.
            // Check if a control button is not in document or not visible
             expect(screen.getByLabelText('Video progress').closest('div[style*="opacity: 0"]')).toBeTruthy();
        });

        // Mouse moves again
        fireEvent.mouseMove(playerContainer);
        await waitFor(() => {
           expect(screen.getByLabelText('Video progress').closest('div[style*="opacity: 1"]')).toBeTruthy();
        });
    });

     it('keeps control bar visible when paused, regardless of mouse inactivity', async () => {
      render(<VideoPlayerComponent movie={mockMovie} />);
      const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;

      // Ensure paused state
      mockVideoElement._paused = true;
      act(() => mockVideoElement.dispatchEvent(new Event('pause')));
      
      fireEvent.mouseMove(playerContainer); // Show UI
      await waitFor(() => {
         expect(screen.getByLabelText('Video progress').closest('div[style*="opacity: 1"]')).toBeTruthy();
      });

      act(() => { vi.advanceTimersByTime(4000); }); // Advance past timeout
      
      await waitFor(() => { // Should still be visible
         expect(screen.getByLabelText('Video progress').closest('div[style*="opacity: 1"]')).toBeTruthy();
      });
    });
  });


  // --- Overlay Tests (adapt existing ones) ---
  it('shows pause overlay with info and resume button when video is paused and UI is visible', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    
    mockVideoElement._paused = true;
    act(() => mockVideoElement.dispatchEvent(new Event('pause')));

    await waitFor(() => {
      expect(screen.getByText(mockMovie.title, { selector: 'h1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Resume playing ${mockMovie.title}` })).toBeInTheDocument();
    });
  });
  
  it('shows hover info overlay when video is playing and UI is visible (mouse is active)', async () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;

    mockVideoElement._paused = false;
    act(() => mockVideoElement.dispatchEvent(new Event('play')));
    act(() => { fireEvent.mouseMove(playerContainer); });

    await waitFor(() => {
      expect(screen.getByText(mockMovie.title, { selector: 'h2' })).toBeInTheDocument();
    });
  });

  it('clicking player area toggles play/pause if not clicking on controls', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    const playerArea = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!; // The main clickable div

    // Start playing
    mockVideoElement._paused = false;
    act(() => mockVideoElement.dispatchEvent(new Event('play')));
    await waitFor(() => expect(mockVideoElement._paused).toBe(false));


    // Click on player area (not on a control)
    await user.click(playerArea);
    await waitFor(() => {
      expect(mockVideoElement.pause).toHaveBeenCalledTimes(1); // Should pause
      expect(mockVideoElement._paused).toBe(true);
    });

    // Click again
    await user.click(playerArea);
    await waitFor(() => {
      expect(mockVideoElement.play).toHaveBeenCalledTimes(2); // Initial call + 1 click
      expect(mockVideoElement._paused).toBe(false);
    });
  });

  it('clicking a button in control bar does not toggle play/pause via player area click', async () => {
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    
    mockVideoElement._paused = true; // Start paused
    act(() => mockVideoElement.dispatchEvent(new Event('pause')));

    const playButtonInControls = screen.getByLabelText('Play');

    // Click the play button in controls
    await user.click(playButtonInControls);
    await waitFor(() => {
      expect(mockVideoElement.play).toHaveBeenCalledTimes(2); // Initial + 1
      // Pause should NOT have been called by the general player click logic
      expect(mockVideoElement.pause).not.toHaveBeenCalled(); 
    });
  });
});

