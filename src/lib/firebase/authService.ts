
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile, // Import updateProfile
  type UserCredential,
  type User // Import User type
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';
import { MOCK_USER_CREDENTIALS, mockUser } from '../mockData';


// Sign in with email and password - primarily for AuthContext to use
export const fbSignInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  if (!isFirebaseConfigured || !auth) {
    if (email === MOCK_USER_CREDENTIALS.email && password === MOCK_USER_CREDENTIALS.password) {
       return Promise.resolve({
        user: mockUser,
        providerId: 'password',
        operationType: 'signIn',
      } as UserCredential);
    }
    return Promise.reject(new Error('Firebase not configured and invalid mock credentials.'));
  }
  return signInWithEmailAndPassword(auth, email, password);
};

// Sign up with email and password
export const fbSignUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
   if (!isFirebaseConfigured || !auth) {
    return Promise.reject(new Error('Sign up is not available in mock mode.'));
  }
  return createUserWithEmailAndPassword(auth, email, password);
};

// Sign in with Google
export const fbSignInWithGoogle = async (): Promise<UserCredential> => {
  if (!isFirebaseConfigured || !auth) {
    return Promise.reject(new Error('Google Sign-In is not available in mock mode.'));
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Sign out
export const fbSignOutUser = async (): Promise<void> => {
  if (!isFirebaseConfigured || !auth) {
    // In mock mode, AuthContext handles clearing the user.
    return Promise.resolve();
  }
  return signOut(auth);
};

// Update User Profile
export const fbUpdateUserProfile = async (
  currentUser: User, 
  updates: { displayName?: string | null; photoURL?: string | null }
): Promise<void> => {
  if (!isFirebaseConfigured || !auth) {
    // Mock update: In a real mock scenario, you might update mockUser or a similar state.
    // For this example, we'll assume the AuthContext will handle visual updates if needed.
    if (updates.displayName !== undefined) mockUser.displayName = updates.displayName;
    if (updates.photoURL !== undefined) mockUser.photoURL = updates.photoURL;
    // Note: This mock update only affects the mockUser object in memory,
    // and doesn't persist or trigger onAuthStateChanged.
    // The AuthContext's setUser directly might be needed for UI refresh in mock mode.
    return Promise.resolve();
  }
  if (!currentUser) {
    throw new Error("No user is currently signed in to update.");
  }
  return updateProfile(currentUser, updates);
};
