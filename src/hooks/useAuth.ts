'use client';

import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '../lib/firebase';

function mapAuthError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  const messages: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente entrar.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Tente de novo em instantes.',
    'auth/operation-not-allowed': 'Login com e-mail e senha não está habilitado no projeto.',
    'auth/admin-restricted-operation': 'Login anônimo não está habilitado no projeto Firebase.',
  };
  if (code && messages[code]) return messages[code];
  if (code?.startsWith('auth/')) return 'Não foi possível concluir. Verifique os dados e tente de novo.';
  return 'Não foi possível concluir. Tente de novo.';
}

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
      queueMicrotask(() => setLoading(false));
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

  async function signInWithEmailPassword(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { error: null };
    } catch (e) {
      return { error: mapAuthError(e) };
    }
  }

  async function signUpWithEmailPassword(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    try {
      const auth = getFirebaseAuth();
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      return { error: null };
    } catch (e) {
      return { error: mapAuthError(e) };
    }
  }

  async function signInAnonymouslyUser(): Promise<{ error: string | null }> {
    try {
      const auth = getFirebaseAuth();
      await signInAnonymously(auth);
      return { error: null };
    } catch (e) {
      return { error: mapAuthError(e) };
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

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signInAnonymouslyUser,
    signOutUser,
  };
}
