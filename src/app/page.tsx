
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import GlobalLoader from '@/components/layout/GlobalLoader';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && user.emailVerified) {
        router.replace('/catalog');
      } else if (user && !user.emailVerified) {
        // User is authenticated but email not verified, send to login.
        // A toast can be shown on the login page or by protected routes if accessed directly.
        router.replace('/login');
      }
       else {
        // No user, send to login
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show loader while auth state is being determined or if user is not yet available.
  if (loading || !user) {
    return <GlobalLoader />;
  }
  
  // This case should ideally not be reached if redirection logic is correct,
  // but acts as a fallback.
  return <GlobalLoader />;
}
