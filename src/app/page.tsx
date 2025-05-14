
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
      if (user) {
        router.replace('/catalog');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return <GlobalLoader />;
}
