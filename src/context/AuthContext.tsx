
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  signInWithPopup as firebaseSignInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/config';
import { mockUser, MOCK_USER_CREDENTIALS, mockUserProfileData } from '@/lib/mockData';
import { fbUpdateUserProfile } from '@/lib/firebase/authService'; 
import { getUserProfileFromFirestore } from '@/lib/firebase/firestoreService';
import GlobalLoader from '@/components/layout/GlobalLoader';
import type { AuthContextType } from './interfaces';
import type { UserProfile } from '@/types/userProfile';

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signInWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateUserProfile: async () => {},
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
    try {
      if (isFirebaseConfigured && db) {
        const profile = await getUserProfileFromFirestore(uid);
        setUserProfileData(profile);
      } else {
        // Mock mode
        if (uid === mockUser.uid) {
          setUserProfileData(mockUserProfileData);
        } else {
          setUserProfileData(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      setUserProfileData(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
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
      // Firebase not configured. User is initially logged out.
      setUser(null); 
      setUserProfileData(null);
      setLoadingProfile(false);
      setLoading(false); 
    }
  }, [fetchUserProfile]);

  const localSignInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setLoadingProfile(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged will update user, fetch profile, and setLoading(false)
      } else {
        // Firebase not configured, use mock authentication
        if (email === MOCK_USER_CREDENTIALS.email && pass === MOCK_USER_CREDENTIALS.password) {
          setUser(mockUser);
          setUserProfileData(mockUserProfileData);
        } else {
          throw new Error('Invalid mock credentials');
        }
        setLoadingProfile(false);
        setLoading(false); 
      }
    } catch (error) {
      setUser(null); 
      setUserProfileData(null);
      setLoadingProfile(false);
      setLoading(false);
      throw error; 
    }
  };

  const localSignInWithGoogle = async () => {
    setLoading(true);
    setLoadingProfile(true);
    try {
      if (isFirebaseConfigured && auth) {
        const provider = new GoogleAuthProvider();
        await firebaseSignInWithPopup(auth, provider);
        // onAuthStateChanged will update user, fetch profile, and setLoading(false)
      } else {
        // Firebase not configured
        setLoadingProfile(false);
        setLoading(false);
        throw new Error('Google Sign-In is not available when Firebase is not configured.');
      }
    } catch (error) {
      setUser(null); 
      setUserProfileData(null);
      setLoadingProfile(false);
      setLoading(false);
      throw error;
    }
  };

  const localSignOut = async () => {
    setLoading(true);
    setLoadingProfile(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth);
        // onAuthStateChanged will set user to null, clear profile, and setLoading(false)
      } else {
        // Firebase not configured, handle mock sign out
        setUser(null);
        setUserProfileData(null);
        setLoadingProfile(false);
        setLoading(false);
      }
    } catch (error) {
      setLoadingProfile(false);
      setLoading(false);
      // For mock scenario, ensure user is cleared if an unexpected error happened.
      if (!isFirebaseConfigured) { 
          setUser(null);
          setUserProfileData(null);
      }
      throw error;
    }
  };

  const localUpdateUserProfile = async (updates: { displayName?: string | null; photoURL?: string | null }) => {
    if (!user) {
      throw new Error("No user is signed in to update.");
    }
    // setLoading(true); // Potentially set loading for the auth user object
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await fbUpdateUserProfile(auth.currentUser, updates);
        // onAuthStateChanged should update the auth user state automatically.
        // The user object in context will reflect changes like displayName and photoURL.
      } else if (!isFirebaseConfigured && user.uid === mockUser.uid) {
        // Handle mock user update
        const updatedMockUser = { ...mockUser };
        if (updates.displayName !== undefined) {
          updatedMockUser.displayName = updates.displayName;
        }
        if (updates.photoURL !== undefined) {
          updatedMockUser.photoURL = updates.photoURL;
        }
        Object.assign(mockUser, updatedMockUser); 
        setUser(updatedMockUser); 
      } else {
        throw new Error("Profile update is not available.");
      }
    } finally {
      // setLoading(false);
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
