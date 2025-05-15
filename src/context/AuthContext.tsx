
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
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/config';
import { mockUser, MOCK_USER_CREDENTIALS, mockUserProfileData } from '@/lib/mockData';
import { fbUpdateUserProfile, fbSignUpWithEmailAndPassword } from '@/lib/firebase/authService'; 
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
          await fetchUserProfile(mockUser.uid); // Fetch mock profile
        } else {
          throw new Error('Invalid mock credentials');
        }
        setLoadingProfile(false); // setLoadingProfile before setLoading
        setLoading(false); 
      }
    } catch (error) {
      setUser(null); 
      setUserProfileData(null);
      setLoadingProfile(false); // setLoadingProfile before setLoading
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
      let newUser: User;
      if (isFirebaseConfigured && auth) {
        const userCredential = await fbSignUpWithEmailAndPassword(email, pass); // This now handles sending verification email
        newUser = userCredential.user;
        if (displayName || photoURL) {
          await fbUpdateUserProfile(newUser, { displayName: displayName || null, photoURL: photoURL || null });
        }
        // onAuthStateChanged will set the user and trigger profile fetch
      } else {
        // Mock sign-up
        const userCredential = await fbSignUpWithEmailAndPassword(email, pass); // This will return a mock UserCredential
        newUser = userCredential.user;
        if (displayName || photoURL) {
          await fbUpdateUserProfile(newUser, { displayName: displayName || null, photoURL: photoURL || null });
          // Manually update newUser object as fbUpdateUserProfile for mock might not reflect if not same ref
          if (displayName) newUser.displayName = displayName;
          if (photoURL) newUser.photoURL = photoURL;
        }
        setUser(newUser); // Manually set user in mock mode
        await fetchUserProfile(newUser.uid); // Fetch (mock) profile for the new mock user
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
    // setLoading(true); // Potentially set loading for the auth user object
    setLoadingProfile(true); // Indicate profile data might change
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await fbUpdateUserProfile(auth.currentUser, updates);
        // onAuthStateChanged should update the auth user state.
        // We may need to re-fetch profile data if it's also stored/derived in Firestore.
        // For now, assuming onAuthStateChanged handles the Firebase Auth user object updates.
        // If display name/photoURL from Firebase Auth is the sole source, this is fine.
        // If these are also in Firestore `users` collection, that would need separate update logic not part of this function.
        
        // Manually update user state for immediate reflection if needed, though onAuthStateChanged should handle it.
         setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);

      } else if (!isFirebaseConfigured && user.uid === mockUser.uid) {
        await fbUpdateUserProfile(mockUser, updates); // This updates the global mockUser
        setUser({ ...mockUser }); // Update context user state from the updated global mockUser
      } else if (!isFirebaseConfigured && user) {
        // For other mock users (e.g. from mock sign up)
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
