
import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile, 
  sendEmailVerification,
  type UserCredential,
  type User 
} from 'firebase/auth';
import { auth } from './config';

// Sign in with email and password
export const fbSignInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }
  return signInWithEmailAndPassword(auth, email, password);
};

// Sign up with email and password
export const fbSignUpWithEmailAndPassword = async (email: string, password: string): Promise<UserCredential> => {
   if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(userCredential.user);
    console.log("Verification email sent to:", userCredential.user.email);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
  return userCredential;
};

// Sign in with Google
export const fbSignInWithGoogle = async (): Promise<UserCredential> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized.');
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Sign out
export const fbSignOutUser = async (): Promise<void> => {
  if (!auth) {
    // If auth isn't initialized, there's nothing to sign out from Firebase.
    // AuthContext will handle local state clearing.
    console.warn("Firebase Auth is not initialized. Cannot perform Firebase sign out.");
    return Promise.resolve();
  }
  return signOut(auth);
};

// Update User Profile
export const fbUpdateUserProfile = async (
  currentUser: User, 
  updates: { displayName?: string | null; photoURL?: string | null }
): Promise<void> => {
  if (!auth) {
     throw new Error("Firebase Auth is not initialized. Cannot update profile.");
  }
  if (!currentUser) { // This check should ideally be handled by the caller ensuring currentUser exists
    throw new Error("No user provided to update profile for.");
  }
  // updateProfile is called on the user object itself, not the auth instance directly with the user.
  return updateProfile(currentUser, updates);
};
