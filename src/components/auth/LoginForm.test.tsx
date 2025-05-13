
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import type { AuthContextType } from '@/context/AuthContext'; // Import the type

// Mocks
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', async () => {
    const actual = await vi.importActual('next/navigation');
    return {
        ...actual,
        useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
        }),
    };
});


const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockSignInWithEmail = vi.fn();
const mockSignInWithGoogle = vi.fn();

// Define a type for the mock useAuth return value
type MockUseAuth = Partial<AuthContextType>;


const mockUseAuth = (override: MockUseAuth = {}) => ({
  user: null,
  loading: false,
  signInWithEmail: mockSignInWithEmail,
  signInWithGoogle: mockSignInWithGoogle,
  signOut: vi.fn(),
  ...override,
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn().mockImplementation(() => mockUseAuth()),
}));


describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock implementation before each test
    (require('@/context/AuthContext').useAuth as any).mockImplementation(() => mockUseAuth());
  });

  it('renders the login form correctly', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('allows typing in email and password fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');

    await user.type(passwordInput, 'password123');
    expect(passwordInput).toHaveValue('password123');
  });

  it('shows validation errors for empty fields on submit', async () => {
    render(<LoginForm />);
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.getByText('Password cannot be empty')).toBeInTheDocument();
    });
  });

  it('calls signInWithEmail on form submit with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    mockSignInWithEmail.mockResolvedValueOnce(undefined); // Simulate successful login

    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Login Successful' }));
      expect(mockPush).toHaveBeenCalledWith('/catalog');
    });
  });

  it('shows error toast if signInWithEmail fails', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    mockSignInWithEmail.mockRejectedValueOnce(new Error('Invalid credentials'));

    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Login Failed',
        description: 'Invalid credentials',
        variant: 'destructive',
      }));
    });
  });

  it('calls signInWithGoogle when Google button is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    mockSignInWithGoogle.mockResolvedValueOnce(undefined); // Simulate successful Google sign-in

    await user.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Login Successful' }));
      expect(mockPush).toHaveBeenCalledWith('/catalog');
    });
  });

  it('shows error toast if signInWithGoogle fails', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('Google sign-in error'));

    await user.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Google Sign-In Failed',
        description: 'Google sign-in error',
        variant: 'destructive',
      }));
    });
  });

  it('disables buttons when isLoading', async () => {
     (require('@/context/AuthContext').useAuth as any).mockImplementation(() => mockUseAuth());
    const { rerender } = render(<LoginForm />);

    // Simulate loading state for email sign-in
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    mockSignInWithEmail.mockImplementation(() => new Promise(() => {})); // Pending promise

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /google/i })).toBeDisabled(); // Google button should also be disabled
    });

    // Reset mocks and component state for next part of test
    vi.clearAllMocks();
    (require('@/context/AuthContext').useAuth as any).mockImplementation(() => mockUseAuth()); // Reset to non-loading
    rerender(<LoginForm />);


    // Simulate loading state for Google sign-in
    mockSignInWithGoogle.mockImplementation(() => new Promise(() => {})); // Pending promise
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /google/i })).toBeDisabled();
    });
  });
});
