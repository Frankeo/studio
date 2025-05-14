
import type { Movie } from "@/types/movie";

export interface VideoElementWithFullscreen extends HTMLVideoElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  webkitEnterFullscreen?: () => void; // Added for iOS Safari
  webkitExitFullscreen?: () => void;  // Added for iOS Safari
  webkitSupportsFullscreen?: boolean; // For checking support
}

export interface VideoPlayerProps {
  movie: Movie;
}

export interface ScreenMobile {
  lock?: (orientation: OrientationType) => Promise<void>;
  unlock?: () => void;
  type?: OrientationType; // Added type property
}

export interface MockVideoElement{
  _playsInline?: boolean
}
