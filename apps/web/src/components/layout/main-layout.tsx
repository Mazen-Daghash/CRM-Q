'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth-store';
import { Sidebar } from './sidebar';
import { NotificationCenter } from '../notifications/notification-center';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, loadProfile } = useAuthStore();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        router.push('/login');
        return;
      }

      // If we have a token but no user data, load profile
      if (!user && !isLoading) {
        try {
          await loadProfile();
        } catch (error) {
          console.error('Auth check failed:', error);
          router.push('/login');
        }
      }
      
      setHasCheckedAuth(true);
    };

    if (!hasCheckedAuth) {
      checkAuth();
    }
  }, [user, isLoading, router, loadProfile, hasCheckedAuth]);

  // Show loading while checking auth or loading profile
  if (!hasCheckedAuth || isLoading || (isAuthenticated && !user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-gray-200 bg-white px-6">
          <NotificationCenter />
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}


