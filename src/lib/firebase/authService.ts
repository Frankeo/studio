
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile, 
  sendEmailVerification, // Added
  type UserCredential,
  type User 
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
export const fbSignUpWithEmailAndPassword = async (email: string, password: string): Promise<UserCredential> => {
   if (!isFirebaseConfigured || !auth) {
    // For mock mode, we can simulate a user creation.
    // This won't actually create a persistent user but allows the flow to proceed.
    // For a more robust mock, you might want to add this "new user" to an in-memory list.
    console.warn("Firebase not configured. Simulating user sign-up.");
    const newMockUser: User = {
      ...mockUser, // Base it on the existing mock structure
      uid: `mock-user-${Date.now()}`,
      email: email,
      displayName: null, // Will be set by updateUserProfile if provided
      photoURL: null, // Will be set by updateUserProfile if provided
      emailVerified: false, // New users typically aren't verified immediately
      providerData: [{
        providerId: 'password',
        uid: `mock-user-${Date.now()}`, // Ensure this UID is consistent if used elsewhere for this mock user
        displayName: null,
        email: email,
        phoneNumber: null,
        photoURL: null,
      }],
    };
    return Promise.resolve({
      user: newMockUser,
      providerId: 'password',
      operationType: 'signIn', // createUserWithEmailAndPassword also signs the user in
    } as UserCredential);
  }
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // Send verification email
  try {
    await sendEmailVerification(userCredential.user);
    console.log("Verification email sent to:", userCredential.user.email);
  } catch (error) {
    console.error("Error sending verification email:", error);
    // Do not let this error block the sign-up flow, but log it.
  }
  return userCredential;
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
      // Handle mock user update. We need to be careful if currentUser is the shared mockUser.
      // If it's a new "mock" user from sign-up, we update its properties.
      if (currentUser && typeof currentUser.uid === 'string') { // Check if currentUser is a valid-like object
        const userToUpdate = currentUser === mockUser ? { ...mockUser } : { ...currentUser };

        if (updates.displayName !== undefined) {
          userToUpdate.displayName = updates.displayName;
        }
        if (updates.photoURL !== undefined) {
          userToUpdate.photoURL = updates.photoURL;
        }
        
        // If it was the main mockUser, update the global mockUser object
        if (currentUser.uid === mockUser.uid) {
            Object.assign(mockUser, userToUpdate);
        } else {
            // If it was a new mock user (e.g. from mock sign up), this update is more "in-memory" for that instance
            // The AuthContext would need to get this specific instance to reflect the change.
            // For simplicity, our mock sign up provides a User object that AuthContext then uses.
            // Direct updates to 'currentUser' param might not reflect in AuthContext unless it's the exact same object reference.
            // This is a limitation of deep mocking complex state updates.
            // The onAuthStateChanged mechanism in real Firebase handles this seamlessly.
            // For the provided sign-up flow, the new user from `fbSignUpWithEmailAndPassword` will be the one whose profile is updated.
        }
      }
    return Promise.resolve();
  }
  if (!currentUser) {
    throw new Error("No user is currently signed in to update.");
  }
  return updateProfile(currentUser, updates);
};
