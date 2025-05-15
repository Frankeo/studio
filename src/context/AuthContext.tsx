
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
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/config';
import { mockUser, MOCK_USER_CREDENTIALS, mockUserProfileData } from '@/lib/mockData';
import { fbUpdateUserProfile, fbSignUpWithEmailAndPassword } from '@/lib/firebase/authService'; 
import { getUserProfileFromFirestore } from '@/lib/firebase/firestoreService';
import GlobalLoader from '@/components/layout/GlobalLoader';
import type { AuthContextType } from './interfaces';


const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signInWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateUserProfile: async () => {},
  signUpWithEmailAndPassword: async () => {},
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
           // For new mock users from sign-up, assume they are not admin by default
          setUserProfileData({ uid, isAdmin: false });
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
          // Email verification is not strictly checked here for setting the user object,
          // but rather on page access or during specific login flows.
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
        const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, pass);
        if (userCredential.user && !userCredential.user.emailVerified) {
          await firebaseSignOut(auth); // Sign out the unverified user from Firebase
          throw new Error('Email not verified. Please check your email inbox for the verification link.');
        }
        // onAuthStateChanged will update user, fetch profile, and setLoading(false) for verified users
      } else {
        // Mock authentication
        if (email === MOCK_USER_CREDENTIALS.email && pass === MOCK_USER_CREDENTIALS.password) {
          // In mock mode, assume email is always verified for the mock admin
          setUser(mockUser);
          await fetchUserProfile(mockUser.uid); 
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
        // Google sign-in usually implies email verification is handled by Google
        await firebaseSignInWithPopup(auth, provider);
        // onAuthStateChanged will handle the rest
      } else {
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
  
  const localSignUpWithEmailAndPassword = async (email: string, pass: string, displayName?: string, photoURL?: string) => {
    setLoading(true);
    setLoadingProfile(true);
    try {
      let newUser;
      if (isFirebaseConfigured && auth) {
        const userCredential = await fbSignUpWithEmailAndPassword(email, pass); 
        newUser = userCredential.user;
        if (displayName || photoURL) {
          await fbUpdateUserProfile(newUser, { displayName: displayName || null, photoURL: photoURL || null });
        }
        // User will be set by onAuthStateChanged, but they will be unverified initially.
        // The sign-up page will redirect to login with appropriate message.
        // No need to manually set user here; let onAuthStateChanged handle it.
        setLoading(false); // setLoading false once operation done.
        setLoadingProfile(false); // Profile won't be fetched until verified login
      } else {
        // Mock sign-up
        const userCredential = await fbSignUpWithEmailAndPassword(email, pass); 
        newUser = {...userCredential.user};
        if (displayName || photoURL) {
          await fbUpdateUserProfile(newUser, { displayName: displayName || null, photoURL: photoURL || null });
          if (displayName) newUser.displayName = displayName;
          if (photoURL) newUser.photoURL = photoURL;
        }
        // For mock, we can set user directly and assume verified for simplicity of testing other flows
        // or set emailVerified to false if we want to test the verification flow in mock
        // For now, let's keep it simple: mock sign-up leads to a usable "verified" mock user
        // But for the requested feature, new mock users should be unverified.
        newUser.emailVerified = false; // Explicitly set to false for mock sign-up
        setUser(newUser); 
        await fetchUserProfile(newUser.uid); 
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

  const localSignOut = async () => {
    setLoading(true);
    setLoadingProfile(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth);
        // onAuthStateChanged will set user to null
      } else {
        setUser(null);
        setUserProfileData(null);
        setLoadingProfile(false);
        setLoading(false);
      }
    } catch (error) {
      setLoadingProfile(false);
      setLoading(false);
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
    setLoadingProfile(true); 
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await fbUpdateUserProfile(auth.currentUser, updates);
         setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);

      } else if (!isFirebaseConfigured && user.uid === mockUser.uid) {
        await fbUpdateUserProfile(mockUser, updates); 
        setUser({ ...mockUser }); 
      } else if (!isFirebaseConfigured && user) {
        const updatedUser = {...user};
        if(updates.displayName !== undefined) updatedUser.displayName = updates.displayName;
        if(updates.photoURL !== undefined) updatedUser.photoURL = updates.photoURL;
        setUser(updatedUser);
      }
       else {
        throw new Error("Profile update is not available.");
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loading && !user && isFirebaseConfigured) { // Only show global loader if Firebase is configured and initial check is pending
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
