'use client';

import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    try {
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    } catch {
      // Firebase not configured — use unauthenticated mode
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  async function signInWithGoogle() {
    try {
      const auth = getFirebaseAuth();
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  }

  async function signOutUser() {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  return { user, loading, signInWithGoogle, signOutUser };
}
