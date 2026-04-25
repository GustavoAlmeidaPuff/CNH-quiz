'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '../components/LoginScreen';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signInWithEmailPassword, signUpWithEmailPassword, signInAnonymouslyUser } =
    useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleGuestLogin = async () => {
    const result = await signInAnonymouslyUser();
    if (!result.error) router.replace('/dashboard');
    return result;
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
