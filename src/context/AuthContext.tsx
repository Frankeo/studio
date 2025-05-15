
"use client";

import type { User, UserProfile } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  signInWithPopup as firebaseSignInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { fbUpdateUserProfile, fbSignUpWithEmailAndPassword } from '@/lib/firebase/authService'; 
import { getUserProfileFromFirestore } from '@/lib/firebase/firestoreService';
import GlobalLoader from '@/components/layout/GlobalLoader';
import type { AuthContextType } from './interfaces';


const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signInWithEmail: async () => { throw new Error("Auth context not fully initialized."); },
  signInWithGoogle: async () => { throw new Error("Auth context not fully initialized."); },
  signOut: async () => { throw new Error("Auth context not fully initialized."); },
  updateUserProfile: async () => { throw new Error("Auth context not fully initialized."); },
  signUpWithEmailAndPassword: async () => { throw new Error("Auth context not fully initialized."); },
  userProfileData: null,
  loadingProfile: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfileData, setUserProfileData] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchUserProfile = useCallback(async (uid: string) => {
    setLoadingProfile(true);
    if (!db) {
      console.warn("Firestore (db) is not initialized. Cannot fetch user profile.");
      setUserProfileData(null);
      setLoadingProfile(false);
      return;
    }
    try {
      const profile = await getUserProfileFromFirestore(uid);
      setUserProfileData(profile);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      setUserProfileData(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await fetchUserProfile(currentUser.uid);
        } else {
          setUserProfileData(null);
          setLoadingProfile(false);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Firebase Auth is not initialized (likely bad config or not configured)
      setUser(null);
      setUserProfileData(null);
      setLoading(false);
      setLoadingProfile(false);
    }
  }, [fetchUserProfile]);

  const localSignInWithEmail = async (email: string, pass: string) => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Cannot sign in.');
    }
    setLoading(true);
    setLoadingProfile(true);
    try {
      const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, pass);
      if (userCredential.user && !userCredential.user.emailVerified) {
        await firebaseSignOut(auth); 
        throw new Error('Email not verified. Please check your email inbox for the verification link.');
      }
      // onAuthStateChanged will update user, fetch profile, and manage loading states
    } catch (error) {
      setUser(null); 
      setUserProfileData(null);
      setLoadingProfile(false);
      setLoading(false);
      throw error; 
    }
  };

  const localSignInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Cannot sign in with Google.');
    }
    setLoading(true);
    setLoadingProfile(true);
    try {
      const provider = new GoogleAuthProvider();
      await firebaseSignInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      setUser(null); 
      setUserProfileData(null);
      setLoadingProfile(false);
      setLoading(false);
      throw error;
    }
  };
  
  const localSignUpWithEmailAndPassword = async (email: string, pass: string, displayName?: string, photoURL?: string) => {
     if (!auth) {
      throw new Error('Firebase Auth is not initialized. Cannot sign up.');
    }
    setLoading(true);
    setLoadingProfile(true);
    try {
      const userCredential = await fbSignUpWithEmailAndPassword(email, pass); 
      const newUser = userCredential.user;
      if (displayName || photoURL) {
        await fbUpdateUserProfile(newUser, { displayName: displayName || null, photoURL: photoURL || null });
      }
      // User will be set by onAuthStateChanged, but they will be unverified initially.
      setLoading(false); 
      setLoadingProfile(false); 
    } catch (error) {
      setUser(null);
      setUserProfileData(null);
      setLoadingProfile(false);
      setLoading(false);
      throw error;
    }
  };

  const localSignOut = async () => {
    if (!auth) {
      // If auth is not even initialized, simply clear local state.
      setUser(null);
      setUserProfileData(null);
      setLoading(false);
      setLoadingProfile(false);
      return;
    }
    setLoading(true); // These might be set to false quickly by onAuthStateChanged
    setLoadingProfile(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user to null and trigger profile state updates
    } catch (error) {
      // Even if signout fails, reset local state as a fallback
      setUser(null);
      setUserProfileData(null);
      setLoading(false);
      setLoadingProfile(false);
      throw error;
    }
  };

  const localUpdateUserProfile = async (updates: { displayName?: string | null; photoURL?: string | null }) => {
    if (!auth || !auth.currentUser) { // also check auth.currentUser
      throw new Error("No user is signed in or Firebase Auth not initialized.");
    }
    setLoadingProfile(true); 
    try {
      await fbUpdateUserProfile(auth.currentUser, updates);
      // Optimistically update local user state while onAuthStateChanged might also update it
      setUser(prevUser => prevUser ? { ...prevUser, 
        displayName: updates.displayName !== undefined ? updates.displayName : prevUser.displayName,
        photoURL: updates.photoURL !== undefined ? updates.photoURL : prevUser.photoURL,
      } : null);
    } finally {
      // Fetch profile again to ensure consistency, though onAuthStateChanged might handle some of this
      if (auth.currentUser) {
        await fetchUserProfile(auth.currentUser.uid);
      }
      setLoadingProfile(false);
    }
  };

  if (loading && !user) { 
    return <GlobalLoader />;
  }


  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithEmail: localSignInWithEmail, 
      signInWithGoogle: localSignInWithGoogle, 
      signOut: localSignOut,
      updateUserProfile: localUpdateUserProfile,
      signUpWithEmailAndPassword: localSignUpWithEmailAndPassword,
      userProfileData,
      loadingProfile,
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
