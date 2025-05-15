
import type { User, UserProfile } from "firebase/auth";


export interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateUserProfile: (updates: { displayName?: string | null; photoURL?: string | null }) => Promise<void>;
    signUpWithEmailAndPassword: (email: string, password: string, displayName?: string, photoURL?: string) => Promise<void>;
    userProfileData: UserProfile | null;
    loadingProfile: boolean;
  }
