
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
import { Loader2 } from 'lucide-react';
import type { AuthContextType } from './interfaces';

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signInWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
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

  // Show loader if loading is true (initial load or during auth operations)
  // This also covers the brief period where isFirebaseConfigured might be true
  // but onAuthStateChanged hasn't fired yet.
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="sr-only">Loading application...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail: localSignInWithEmail, signInWithGoogle: localSignInWithGoogle, signOut: localSignOut }}>
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
