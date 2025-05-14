
import type { User } from "firebase/auth";

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateUserProfile: (updates: { displayName?: string | null; photoURL?: string | null }) => Promise<void>;
  }
