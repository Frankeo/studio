
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  signInWithPopup as firebaseSignInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/config';
import { mockUser, MOCK_USER_CREDENTIALS } from '@/lib/mockData';
import { fbUpdateUserProfile } from '@/lib/firebase/authService'; // Import fbUpdateUserProfile
import GlobalLoader from '@/components/layout/GlobalLoader';
import type { AuthContextType } from './interfaces';

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signInWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateUserProfile: async () => {}, // Add updateUserProfile
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Firebase not configured. User is initially logged out.
      setUser(null); 
      setLoading(false); 
    }
  }, []);

  const localSignInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged will update user and setLoading(false) for Firebase auth
      } else {
        // Firebase not configured, use mock authentication
        if (email === MOCK_USER_CREDENTIALS.email && pass === MOCK_USER_CREDENTIALS.password) {
          setUser(mockUser);
        } else {
          throw new Error('Invalid mock credentials');
        }
        setLoading(false); // Manually set loading for mock auth
      }
    } catch (error) {
      setUser(null); 
      setLoading(false);
      throw error; 
    }
  };

  const localSignInWithGoogle = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const provider = new GoogleAuthProvider();
        await firebaseSignInWithPopup(auth, provider);
        // onAuthStateChanged will update user and setLoading(false)
      } else {
        // Firebase not configured
        setLoading(false);
        throw new Error('Google Sign-In is not available when Firebase is not configured.');
      }
    } catch (error) {
      setUser(null); 
      setLoading(false);
      throw error;
    }
  };

  const localSignOut = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth);
        // onAuthStateChanged will set user to null and setLoading(false)
      } else {
        // Firebase not configured, handle mock sign out
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      // For mock scenario, ensure user is cleared if an unexpected error happened.
      if (!isFirebaseConfigured) { 
          setUser(null);
      }
      throw error;
    }
  };

  const localUpdateUserProfile = async (updates: { displayName?: string | null; photoURL?: string | null }) => {
    if (!user) {
      throw new Error("No user is signed in to update.");
    }
    if (isFirebaseConfigured && auth && auth.currentUser) {
      await fbUpdateUserProfile(auth.currentUser, updates);
      // onAuthStateChanged should update the user state automatically.
      // If immediate reflection is needed and onAuthStateChanged is slow,
      // you might consider manually updating the local user state here as well,
      // but it's generally better to rely on the single source of truth from Firebase.
      // e.g., setUser(prevUser => prevUser ? ({...prevUser, ...updates}) : null);
      // However, this can lead to inconsistencies if the Firebase update fails silently
      // or if onAuthStateChanged provides a slightly different user object.
      // For now, let's rely on onAuthStateChanged.
    } else if (!isFirebaseConfigured && user.uid === mockUser.uid) {
      // Handle mock user update
      const updatedMockUser = { ...mockUser };
      if (updates.displayName !== undefined) {
        updatedMockUser.displayName = updates.displayName;
      }
      if (updates.photoURL !== undefined) {
        updatedMockUser.photoURL = updates.photoURL;
      }
      // Update the global mockUser object if necessary, or just the local state
      Object.assign(mockUser, updatedMockUser); // Update the shared mockUser
      setUser(updatedMockUser); // Update the context's user state
    } else {
      throw new Error("Profile update is not available.");
    }
  };


  // Show loader if loading is true (initial load or during auth operations)
  // This also covers the brief period where isFirebaseConfigured might be true
  // but onAuthStateChanged hasn't fired yet.
  if (loading && !user) { // Only show global loader if strictly loading and no user yet.
    return <GlobalLoader />;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithEmail: localSignInWithEmail, 
      signInWithGoogle: localSignInWithGoogle, 
      signOut: localSignOut,
      updateUserProfile: localUpdateUserProfile // Provide updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
