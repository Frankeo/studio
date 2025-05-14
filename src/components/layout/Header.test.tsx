
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import type { User } from 'firebase/auth';
import { AuthContextType } from '@/context/interfaces';


// Mocks
const mockPush = vi.fn();
vi.mock('next/navigation', async () => {
    const actual = await vi.importActual('next/navigation');
    return {
        ...actual,
        useRouter: () => ({
        push: mockPush,
        }),
    };
});

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockSignOut = vi.fn();

const mockUser: User = {
  uid: 'test-uid',
  providerId: 'test-uid',
  phoneNumber: null,
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://picsum.photos/seed/test/40/40',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: 'test-token',
  tenantId: null,
  delete: vi.fn(),
  getIdToken: vi.fn(),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: () => ({}),
};

const mockUseAuth = (user: User | null = null, loading: boolean = false): Partial<AuthContextType> => ({
  user,
  loading,
  signOut: mockSignOut,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
});

const useAuthMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: useAuthMock,
}));


describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logo and title', () => {
    useAuthMock.mockReturnValue(mockUseAuth());
    render(<Header />);
    expect(screen.getByText('StreamVerse')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /streamverse/i })).toHaveAttribute('href', '/');
  });

  describe('User Not Logged In', () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue(mockUseAuth(null));
    });

    it('renders Login button', () => {
      render(<Header />);
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');
    });

    it('does not render Catalog link or user avatar', () => {
      render(<Header />);
      expect(screen.queryByText(/catalog/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /user avatar/i })).not.toBeInTheDocument(); // Adjust name if accessible name is different
    });
  });

  describe('User Logged In', () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue(mockUseAuth(mockUser));
    });

    it('renders Catalog link', () => {
      render(<Header />);
      expect(screen.getByRole('link', { name: /catalog/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /catalog/i })).toHaveAttribute('href', '/catalog');
    });

    it('renders user avatar and dropdown', async () => {
      const user = userEvent.setup();
      render(<Header />);
      
      const avatarButton = screen.getByRole('button'); // Avatar is usually a button for dropdown
      expect(avatarButton).toBeInTheDocument();
      
      // Check for avatar image (might need more specific selector if image is nested)
      const avatarImage = screen.getByRole('img', { name: mockUser.displayName || mockUser.email || 'User' });
      expect(avatarImage).toBeInTheDocument();
      if (mockUser.photoURL) {
        expect(avatarImage).toHaveAttribute('src', mockUser.photoURL);
      }


      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText(mockUser.displayName!)).toBeInTheDocument();
        expect(screen.getByText(mockUser.email!)).toBeInTheDocument();
        expect(screen.getByText(/log out/i)).toBeInTheDocument();
      });
    });
    
    it('handles logout successfully', async () => {
      const user = userEvent.setup();
      render(<Header />);
      
      mockSignOut.mockResolvedValueOnce(undefined);

      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      const logoutButton = await screen.findByText(/log out/i);
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/login');
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Logged Out' }));
      });
    });

    it('handles logout failure', async () => {
      const user = userEvent.setup();
      render(<Header />);
      
      mockSignOut.mockRejectedValueOnce(new Error('Logout failed'));

      const avatarButton = screen.getByRole('button');
      await user.click(avatarButton);
      
      const logoutButton = await screen.findByText(/log out/i);
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Logout Failed',
          description: 'Logout failed',
          variant: 'destructive',
        }));
      });
    });
  });
});
