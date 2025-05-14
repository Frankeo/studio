
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoPlayerComponent from './VideoPlayerComponent';
import type { Movie } from '@/types/movie';
import { MOCK_VIDEO_URL } from '@/lib/mockData';
import { useIsMobile } from '@/hooks/use-mobile';
import React from 'react'; // Import React for useRef mocking
import { Mock } from 'vitest';
import { ScreenMobile } from './interfaces';

let mockVideoElement: Partial<HTMLVideoElement> & {
  _listeners: Record<string, Function[]>;
  _paused: boolean;
  _currentTime: number;
  _duration: number;
  _volume: number;
  _muted: boolean;
  _playbackRate: number;
  _controls: boolean;
  playsInline: boolean;
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

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}));

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

// Mock the useRef hook to return our mock elements
const actualUseRef = React.useRef; // Store original React.useRef
let refCallCount = 0;
let playMock: Mock;

vi.spyOn(React, 'useRef').mockImplementation((initialValue) => {
    const currentCall = ++refCallCount;
    if (initialValue === null) {
        if (currentCall === 1) { // videoRef
            return { current: mockVideoElement as unknown as HTMLVideoElement };
        } else if (currentCall === 2) { // playerContainerRef
            return { current: mockPlayerContainerElement as unknown as HTMLDivElement };
        } else if (currentCall === 3) { // uiTimeoutRef
            // For uiTimeoutRef, we want a real mutable ref behavior
            return actualUseRef(null);
        }
    }
    // Fallback for any other refs or if initialValue is not null
    return actualUseRef(initialValue);
});

describe('VideoPlayerComponent', () => {



  beforeEach(() => {
    vi.useFakeTimers();
    (useIsMobile as Mock).mockReturnValue(false); // Default to desktop

    // Initialize mockVideoElement
    mockVideoElement = {
      _listeners: {},
      _paused: true,
      _currentTime: 0,
      _duration: 600, 
    _volume: 1, // Start with volume 1
      _muted: false,
      _playbackRate: 1,
      _controls: false,
      playsInline: false,

      // Define playMock here
      play: playMock = vi.fn(() => Promise.resolve().then(() => {
 act(() => mockVideoElement.dispatchEvent(new Event('play')));
        act(() => mockVideoElement.dispatchEvent(new Event('playing')));
      })),      pause: vi.fn(() => {
        mockVideoElement._paused = true;
        act(() => mockVideoElement.dispatchEvent(new Event('pause')));
      }),
      addEventListener: vi.fn((type, listener) => {
        if (!mockVideoElement._listeners[type]) {
          mockVideoElement._listeners[type] = [];
        }
        mockVideoElement._listeners[type].push(listener as Function);
      }),
      removeEventListener: vi.fn((type, listener) => {
        if (mockVideoElement._listeners[type]) {
          mockVideoElement._listeners[type] = mockVideoElement._listeners[type].filter(
            (l) => l !== listener
          );
        }
      }),
      dispatchEvent: vi.fn((event: Event) => {
        if (mockVideoElement._listeners && mockVideoElement._listeners[event.type]) {
          mockVideoElement._listeners[event.type].forEach((l) => l(event));
        }
        return true;
      }),
    };
    
    // Setup getters and setters for mockVideoElement properties
    Object.defineProperty(mockVideoElement, 'paused', { get: () => mockVideoElement._paused, configurable: true });
    Object.defineProperty(mockVideoElement, 'currentTime', { 
      get: () => mockVideoElement._currentTime, 
      set: (val) => { mockVideoElement._currentTime = val; act(() => mockVideoElement.dispatchEvent(new Event('timeupdate'))); },
      configurable: true 
    });
    Object.defineProperty(mockVideoElement, 'duration', { get: () => mockVideoElement._duration, configurable: true });
    Object.defineProperty(mockVideoElement, 'volume', { 
      get: () => mockVideoElement._volume, 
      set: (val) => { mockVideoElement._volume = val; act(() => mockVideoElement.dispatchEvent(new Event('volumechange')));},
      configurable: true 
    });
    Object.defineProperty(mockVideoElement, 'muted', { 
      get: () => mockVideoElement._muted, 
      set: (val) => { mockVideoElement._muted = val; act(() => mockVideoElement.dispatchEvent(new Event('volumechange')));},
      configurable: true 
    });
    Object.defineProperty(mockVideoElement, 'playbackRate', { 
      get: () => mockVideoElement._playbackRate, 
      set: (val) => { mockVideoElement._playbackRate = val; /* dispatch 'ratechange' if needed */ },
      configurable: true 
    });
    Object.defineProperty(mockVideoElement, 'controls', { 
      get: () => mockVideoElement._controls, 
      set: (val) => { mockVideoElement._controls = val; },
      configurable: true 
    });
     Object.defineProperty(mockVideoElement, 'playsInline', { 
      get: () => (mockVideoElement as any)._playsInline, // Use a backing field to avoid recursion
      set: (val) => { (mockVideoElement as any)._playsInline = val; },
      configurable: true 
    });
    (mockVideoElement as any)._playsInline = false; // Initialize backing field


    // Initialize mockPlayerContainerElement
    mockPlayerContainerElement = {
        requestFullscreen: vi.fn(() => Promise.resolve()),
        webkitRequestFullscreen: vi.fn(() => Promise.resolve()),
        mozRequestFullScreen: vi.fn(() => Promise.resolve()),
        msRequestFullscreen: vi.fn(() => Promise.resolve()),
    };

    // Mock document fullscreen properties and methods
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: vi.fn(() => null) });
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
    vi.restoreAllMocks(); // This will restore React.useRef
  });

  it('renders video element with correct src, poster, ensures native controls are off, and has playsInline', () => {
    render(<VideoPlayerComponent movie={mockMovie} />);
    const videoElement = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` });
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockMovie.videoUrl);
    expect(videoElement).toHaveAttribute('poster', mockMovie.posterUrl);
    expect(mockVideoElement.controls).toBe(false); 
    expect(mockVideoElement.playsInline).toBe(true); 
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
      expect(screen.getByLabelText('Play')).toBeInTheDocument(); 
    });

    it('toggles play/pause via control bar button', async () => {
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      
      const playButton = screen.getByLabelText('Play'); 
      await user.click(playButton);
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(2); // Initial auto-play + 1 click
        expect(screen.getByLabelText('Pause')).toBeInTheDocument(); 
      });

      const pauseButton = screen.getByLabelText('Pause');
      await user.click(pauseButton);
      await waitFor(() => {
        expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
        expect(screen.getByLabelText('Play')).toBeInTheDocument(); 
      });
    });

    it('updates progress bar and time display on timeupdate', async () => {
      render(<VideoPlayerComponent movie={mockMovie} />);
      
      act(() => {
        mockVideoElement._currentTime = 30; 
        mockVideoElement._duration = 600; 
        mockVideoElement.dispatchEvent(new Event('loadedmetadata')); // Ensure duration is set
        mockVideoElement.dispatchEvent(new Event('timeupdate'));
      });

      await waitFor(() => {
        expect(screen.getByText('00:30 / 10:00')).toBeInTheDocument();
        const progressBar = screen.getByLabelText('Video progress') as HTMLInputElement;
        expect(progressBar).toHaveAttribute('aria-valuenow', '30'); 
      });
    });

    it('seeks video when progress bar is changed', async () => {
       render(<VideoPlayerComponent movie={mockMovie} />);
       act(() => { // Ensure duration is set for the slider to be functional
         mockVideoElement._duration = 600;
         mockVideoElement.dispatchEvent(new Event('loadedmetadata'));
       });
       const progressBar = screen.getByLabelText('Video progress');
       fireEvent.change(progressBar, { target: { value: '120' } }); 
       
      await waitFor(() => {
        expect(mockVideoElement.currentTime).toBe(120);
      });
    });


    it('toggles mute via volume button', async () => {
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      const muteButton = screen.getByLabelText('Mute'); 
      
      await user.click(muteButton);
      await waitFor(() => {
        expect(mockVideoElement.muted).toBe(true);
        expect(screen.getByLabelText('Unmute')).toBeInTheDocument(); 
      });

      await user.click(screen.getByLabelText('Unmute'));
      await waitFor(() => {
        expect(mockVideoElement.muted).toBe(false);
        expect(screen.getByLabelText('Mute')).toBeInTheDocument();
      });
    });

    it('changes volume via volume slider', async () => {
      render(<VideoPlayerComponent movie={mockMovie} />);
      const volumeSlider = screen.getByLabelText('Volume');
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });
      // A volume change should unmute if it was muted
      mockVideoElement.muted = false; // Simulate the component setting muted to false on volume change
      await waitFor(() => {
        expect(mockVideoElement.volume).toBe(0.5);
        expect(mockVideoElement.muted).toBe(false); 
      });
    });

    it('changes playback speed via dropdown', async () => {
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      
      const speedButton = screen.getByLabelText('Playback speed 1x');
      await user.click(speedButton); 

      const speedOption = await screen.findByText('1.5x'); 
      await user.click(speedOption);

      await waitFor(() => {
        expect(mockVideoElement.playbackRate).toBe(1.5);
        expect(screen.getByLabelText('Playback speed 1.5x')).toBeInTheDocument(); 
      });
    });

    it('toggles fullscreen via fullscreen button (on desktop) and ensures native controls remain off', async () => {
      (useIsMobile as Mock).mockReturnValue(false); // Desktop
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      expect(mockVideoElement.controls).toBe(false); 
      
      const enterFullscreenButton = screen.getByLabelText('Enter fullscreen');
      expect(enterFullscreenButton).toBeInTheDocument();
      await user.click(enterFullscreenButton);

      await waitFor(() => {
        const requestFullscreenMock = mockPlayerContainerElement.requestFullscreen ||
                                    mockPlayerContainerElement.webkitRequestFullscreen ||
                                    mockPlayerContainerElement.mozRequestFullScreen ||
                                    mockPlayerContainerElement.msRequestFullscreen;
        expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
        if ((window.screen?.orientation as ScreenMobile)?.lock) {
            expect((window.screen?.orientation as ScreenMobile).lock).toHaveBeenCalledWith('landscape-primary');
        }
        expect(mockVideoElement.controls).toBe(false); 
      });

      Object.defineProperty(document, 'fullscreenElement', { get: () => mockPlayerContainerElement as HTMLElement, configurable: true });
      act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
      expect(mockVideoElement.controls).toBe(false); 
      
      const exitFullscreenButton = await screen.findByLabelText('Exit fullscreen');
      expect(exitFullscreenButton).toBeInTheDocument();
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
        expect(mockVideoElement.controls).toBe(false); 
      });
       Object.defineProperty(document, 'fullscreenElement', { get: () => null, configurable: true });
       act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
       expect(mockVideoElement.controls).toBe(false); 
       expect(await screen.findByLabelText('Enter fullscreen')).toBeInTheDocument();
    });

    it('shows fullscreen button in control bar on mobile', () => {
      (useIsMobile as Mock).mockReturnValue(true); // Mobile
      render(<VideoPlayerComponent movie={mockMovie} />);
      expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
    });


    it('hides control bar on mouse inactivity when playing, shows on activity', async () => {
        render(<VideoPlayerComponent movie={mockMovie} />);
        const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;

        mockVideoElement._paused = false;
        act(() => mockVideoElement.dispatchEvent(new Event('play')));
        
        fireEvent.mouseMove(playerContainer);
        await waitFor(() => {
            expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
        });
        
        act(() => { vi.advanceTimersByTime(3000); }); // Default timeout is 3s
        await waitFor(() => {
            expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 0');
        });

        fireEvent.mouseMove(playerContainer);
        await waitFor(() => {
           expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
        });
    });

     it('keeps control bar visible when paused, regardless of mouse inactivity', async () => {
      render(<VideoPlayerComponent movie={mockMovie} />);
      const playerContainer = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;

      mockVideoElement._paused = true;
      act(() => mockVideoElement.dispatchEvent(new Event('pause')));
      
      fireEvent.mouseMove(playerContainer); 
      await waitFor(() => {
         expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
      });

      act(() => { vi.advanceTimersByTime(4000); }); 
      
      await waitFor(() => { 
         expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
      });
    });
  });


  // --- Overlay Tests ---
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

  // --- Player Click Behavior Tests ---
  describe('Player Click Behavior', () => {
    it('on desktop, clicking player area toggles play/pause and shows UI', async () => {
      (useIsMobile as Mock).mockReturnValue(false); // Desktop
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      const playerArea = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;

      mockVideoElement._paused = false; 
      act(() => mockVideoElement.dispatchEvent(new Event('play')));
      await waitFor(() => expect(mockVideoElement._paused).toBe(false));
      
      // Simulate UI hide
      act(() => { vi.advanceTimersByTime(3000); }); // Match player's timeout
      await waitFor(() => {
          expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 0');
      });

      await user.click(playerArea);
      await waitFor(() => {
        expect(mockVideoElement.pause).toHaveBeenCalledTimes(1);
        expect(mockVideoElement._paused).toBe(true);
        expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
      });

      await user.click(playerArea);
      await waitFor(() => {
        expect(mockVideoElement.play).toHaveBeenCalledTimes(2); // Initial auto-play + 1 click
        expect(mockVideoElement._paused).toBe(false);
        expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
      });
    });

    it('on mobile, clicking player area toggles fullscreen, shows UI, and ensures native controls remain off', async () => {
      (useIsMobile as Mock).mockReturnValue(true); // Mobile
      const user = userEvent.setup();
      render(<VideoPlayerComponent movie={mockMovie} />);
      const playerArea = screen.getByRole('region', { name: `Video player for ${mockMovie.title}` }).parentElement!;
      const requestFullscreenMock = mockPlayerContainerElement.requestFullscreen ||
                                  mockPlayerContainerElement.webkitRequestFullscreen ||
                                  mockPlayerContainerElement.mozRequestFullScreen ||
                                  mockPlayerContainerElement.msRequestFullscreen;
      const exitFullscreenMock = document.exitFullscreen ||
                                 (document as any).webkitExitFullscreen ||
                                 (document as any).mozCancelFullScreen ||
                                 (document as any).msExitFullscreen;
      expect(mockVideoElement.controls).toBe(false); 
      
      // --- First click: Enter Fullscreen ---
      await user.click(playerArea);
      await waitFor(() => {
        expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
        if ((window.screen?.orientation as ScreenMobile)?.lock) {
            expect((window.screen?.orientation as ScreenMobile).lock).toHaveBeenCalledWith('landscape');
        }
        expect(mockVideoElement.play).toHaveBeenCalledTimes(1); // Only initial auto-play
        expect(mockVideoElement.pause).not.toHaveBeenCalled();
        expect(mockVideoElement.controls).toBe(false);
        expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
      });

      // --- Simulate being in fullscreen ---
      Object.defineProperty(document, 'fullscreenElement', { get: () => mockPlayerContainerElement as HTMLElement, configurable: true });
      act(() => { document.dispatchEvent(new Event('fullscreenchange')); }); 
      expect(mockVideoElement.controls).toBe(false); 

      // --- Second click: Exit Fullscreen ---
      await user.click(playerArea);
      await waitFor(() => {
        expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
        if (window.screen?.orientation?.unlock) {
            expect(window.screen.orientation.unlock).toHaveBeenCalled();
        }
        expect(mockVideoElement.controls).toBe(false);
        expect(screen.getByLabelText('Video progress').closest('div[data-testid="video-controls-bar"]')).toHaveStyle('opacity: 1');
      });

      Object.defineProperty(document, 'fullscreenElement', { get: () => null, configurable: true });
      act(() => { document.dispatchEvent(new Event('fullscreenchange')); }); 
      expect(mockVideoElement.controls).toBe(false); 
    });
  });

  it('clicking a button in control bar does not trigger player area click action', async () => {
    (useIsMobile as Mock).mockReturnValue(false); 
    const user = userEvent.setup();
    render(<VideoPlayerComponent movie={mockMovie} />);
    
    // Ensure video is initially considered paused for this test logic
    mockVideoElement._paused = true; 
    act(() => mockVideoElement.dispatchEvent(new Event('pause'))); // Dispatch pause to set internal state

    const playButtonInControls = screen.getByLabelText('Play');

    // Click the play button in the controls
    await user.click(playButtonInControls);
    await waitFor(() => {
      // play() in controls should be called.
      // mockVideoElement.play was called once on mount, then once by clicking the control button.
      expect(mockVideoElement.play).toHaveBeenCalledTimes(2); 
      // pause() should not have been called by clicking the play button in controls
      expect(mockVideoElement.pause).not.toHaveBeenCalled(); 
    });

    // Test for mobile
    vi.clearAllMocks(); // Clear mocks for the next part
    (useIsMobile as Mock).mockReturnValue(true);
    
    // Re-initialize mockVideoElement for the mobile part of the test
    mockVideoElement._paused = true; // Reset paused state
    mockVideoElement.play = vi.fn(() => { /* as before */ return Promise.resolve(); }); // Reset play mock
    mockVideoElement.pause = vi.fn(); // Reset pause mock

    const { rerender } = render(<VideoPlayerComponent movie={mockMovie} />);
    rerender(<VideoPlayerComponent movie={mockMovie} />); // Force re-render with mobile state
    act(() => mockVideoElement.dispatchEvent(new Event('pause'))); // Dispatch pause


    const requestFullscreenMock = mockPlayerContainerElement.requestFullscreen ||
                                  mockPlayerContainerElement.webkitRequestFullscreen ||
                                  mockPlayerContainerElement.mozRequestFullScreen ||
                                  mockPlayerContainerElement.msRequestFullscreen;
    
    const playButtonInControlsMobile = screen.getByLabelText('Play'); 
    await user.click(playButtonInControlsMobile); 
     await waitFor(() => {
      // Clicking play button in controls should not trigger fullscreen
      expect(requestFullscreenMock).not.toHaveBeenCalled();
      // It should call play on the video element
      expect(mockVideoElement.play).toHaveBeenCalledTimes(1); // Only from control click in this mobile segment
    });
  });
});

    