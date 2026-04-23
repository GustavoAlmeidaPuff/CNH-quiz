'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '../components/LoginScreen';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signInWithEmailPassword, signUpWithEmailPassword } =
    useAuth();
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    const isGuest = sessionStorage.getItem('cnh-guest-mode');
    if (isGuest === '1') setGuestMode(true);
  }, []);

  useEffect(() => {
    if (!loading && (user || guestMode)) {
      router.replace('/dashboard');
    }
  }, [user, loading, guestMode, router]);

  const handleGuestLogin = () => {
    sessionStorage.setItem('cnh-guest-mode', '1');
    setGuestMode(true);
    router.replace('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#f5d800', borderTopColor: 'transparent' }}
          />
          <span className="text-sm" style={{ color: '#555' }}>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <LoginScreen
      onGoogleLogin={signInWithGoogle}
      onGuestLogin={handleGuestLogin}
      onEmailSignIn={signInWithEmailPassword}
      onEmailSignUp={signUpWithEmailPassword}
    />
  );
}
