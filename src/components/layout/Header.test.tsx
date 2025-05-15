import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Header from './Header';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/context/AuthContext';
import { User } from 'firebase/auth';
import { AuthContextType } from '@/context/interfaces';
import { useRouter } from 'next/navigation';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useToast } from '@/hooks/use-toast';

vi.mock('@/context/AuthContext')
vi.mock('next/navigation')
vi.mock('@/hooks/use-toast')

// Mock getUserInitials and cn from utils
vi.mock('@/lib/utils', () => ({
  getUserInitials: vi.fn((user) => user?.email?.charAt(0).toUpperCase() || ''),
  cn: vi.fn((...inputs) => inputs.join(' ')), // Mock cn to simply join class names
}));

describe('Header', () => {
  const mockedAuth = {
    user: { uid: 'test-uid', email: 'test@example.com', displayName: 'Test User' } as User,
    loading: false,
    signOut: vi.fn(),
  } as unknown as AuthContextType;

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('does not render "Add Movie" when user is logged in and is not admin', async () => {
    vi.mocked(useToast).mockReturnValue({
      toast: vi.fn(),
      dismiss: undefined as unknown as () => void,
      toasts: []
    });

    vi.mocked(useAuth).mockReturnValue({    
      ...mockedAuth,
      userProfileData: { isAdmin: false },
    } as unknown as AuthContextType);

    render(<Header />);

    const userAvatar = await screen.findByTestId("user-button");
    await userEvent.click(userAvatar);

    expect(screen.queryByTestId("add-movie-link")).not.toBeInTheDocument();
  });

  it('calls signOut and navigates to login when Log out is clicked', async () => {
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      dismiss: undefined as unknown as () => void,
      toasts: []
    });

    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush
    } as unknown as AppRouterInstance);

    const mockSignOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({    
      ...mockedAuth,
      signOut: mockSignOut
    } as unknown as AuthContextType);

    render(<Header />);

    const userAvatar = await screen.findByTestId("user-button");
    await userEvent.click(userAvatar);

    const signOutMenuItem = await screen.findByRole('menuitem', { name: /log out/i });
    await userEvent.click(signOutMenuItem);

    // Wait for signOut and push to be called
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
  });

  it('TO DELETE', async () => {
    vi.mocked(useToast).mockReturnValue({
      toast: vi.fn(),
      dismiss: undefined as unknown as () => void,
      toasts: []
    });

    vi.mocked(useAuth).mockReturnValue({    
      user: null,
      loading: false,
      signOut: vi.fn()
    } as unknown as AuthContextType);

    render(<Header />);

    const loginLink = screen.getByRole('link', { name: /login/i });

    expect(loginLink).toHaveAttribute('href', '/login');
    expect(screen.queryByTestId("user-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("profile-button")).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /log out/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("add-movie-link")).not.toBeInTheDocument();
  });

  it('the Profile menu has a profile link', async () => {
    vi.mocked(useToast).mockReturnValue({
      toast: vi.fn(),
      dismiss: undefined as unknown as () => void,
      toasts: []
    });
    vi.mocked(useAuth).mockReturnValue({
      ...mockedAuth,
      userProfileData: { isAdmin: false },
    } as unknown as AuthContextType)

    render(<Header />);

    const userAvatar = await screen.findByTestId("user-button");
    await userEvent.click(userAvatar);

    const profileMenuItem = await screen.findByTestId("profile-button");

    expect(profileMenuItem).toHaveAttribute('href', '/profile');
  });

  it('the Add Movie menu has a add-movie link (if admin)', async () => {
    vi.mocked(useToast).mockReturnValue({
      toast: vi.fn(),
      dismiss: undefined as unknown as () => void,
      toasts: []
    });
    vi.mocked(useAuth).mockReturnValue({
      ...mockedAuth,
      userProfileData: { isAdmin: true }
    } as unknown as AuthContextType)

    render(<Header />);
    const userAvatar = await screen.findByTestId("user-button");
    await userEvent.click(userAvatar);

    const movieItem = await screen.findByTestId("add-movie-link");
    expect(movieItem).toHaveAttribute('href', '/add-movie');
  });

  it('the app logo has a home link', async () => {
    vi.mocked(useToast).mockReturnValue({
      toast: vi.fn(),
      dismiss: undefined as unknown as () => void,
      toasts: []
    });
    vi.mocked(useAuth).mockReturnValue(mockedAuth)
    render(<Header />);

    const appLogoLink = await screen.findByTestId("home-link");

    expect(appLogoLink).toHaveAttribute('href', '/');;
  });
});