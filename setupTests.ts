
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react'; // Import React

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    const { priority, ...rest } = props; // Destructure and ignore priority
    return React.createElement('img', rest); // Use React.createElement
  },
}));

// Mock next/navigation
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    }),
    useParams: () => ({}),
    usePathname: () => '/',
    useSearchParams: () => ({
      get: vi.fn(),
    }),
  };
});

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  get() {
    return () => {
      return Promise.resolve();
    };
  },
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(global, 'ResizeObserver', {
  value: ResizeObserver,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});


// If you have other global mocks or setup, add them here
// Mock the Pointer Capture API
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.hasPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();