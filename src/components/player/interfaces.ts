import { Movie } from "@/types/movie";

export interface VideoElementWithFullscreen extends HTMLVideoElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

export interface VideoPlayerProps {
  movie: Movie;
}

export interface ScreenMobile {
  lock?: (orientation: OrientationType) => Promise<void>; 
  unlock?: () => void;
}

export interface MockVideoElement{ 
  _playsInline?: boolean 
}