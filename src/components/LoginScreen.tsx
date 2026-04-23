'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';

interface LoginScreenProps {
  onGoogleLogin: () => Promise<void>;
  onGuestLogin: () => void;
  onEmailSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onEmailSignUp: (email: string, password: string) => Promise<{ error: string | null }>;
}

export function LoginScreen({
  onGoogleLogin,
  onGuestLogin,
  onEmailSignIn,
  onEmailSignUp,
}: LoginScreenProps) {
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError('Preencha e-mail e senha.');
      return;
    }
    if (password.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    const res =
      emailMode === 'signin'
        ? await onEmailSignIn(email, password)
        : await onEmailSignUp(email, password);
    setSubmitting(false);
    if (res.error) setFormError(res.error);
  }

  const inputClass =
    'w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors focus:border-[#f5d800]';
  const inputStyle: CSSProperties = {
    background: '#141414',
    borderColor: '#2a2a2a',
    color: '#f0f0f0',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-sm animate-slide-up flex flex-col gap-8">
        {/* Logo / Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{ background: 'rgba(245, 216, 0, 0.1)', border: '2px solid rgba(245, 216, 0, 0.2)' }}
          >
            🚗
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#f0f0f0' }}>
              CNH Quiz
            </h1>
            <div className="w-16 h-0.5 mx-auto mt-2 rounded" style={{ background: '#f5d800' }} />
          </div>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#888' }}>
            Domine a prova teórica da CNH com repetição espaçada inteligente.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🧠', label: 'Algoritmo Anki' },
            { icon: '📊', label: 'Progresso' },
            { icon: '🔥', label: 'Sequências' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border text-center"
              style={{ background: '#141414', borderColor: '#2a2a2a' }}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs" style={{ color: '#888' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Login Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm transition-all duration-200"
            style={{ background: '#f5d800', color: '#000' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#e6ca00')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#f5d800')}
          >
            <GoogleIcon />
            Entrar com Google
          </button>

          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: '#555' }}>
              ou
            </span>
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
          </div>

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#141414' }}>
              <button
                type="button"
                onClick={() => {
                  setEmailMode('signin');
                  setFormError(null);
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={
                  emailMode === 'signin'
                    ? { background: '#2a2a2a', color: '#f0f0f0' }
                    : { background: 'transparent', color: '#666' }
                }
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode('signup');
                  setFormError(null);
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={
                  emailMode === 'signup'
                    ? { background: '#2a2a2a', color: '#f0f0f0' }
                    : { background: 'transparent', color: '#666' }
                }
              >
                Criar conta
              </button>
            </div>
            <label className="sr-only" htmlFor="login-email">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className={inputClass}
              style={inputStyle}
            />
            <label className="sr-only" htmlFor="login-password">
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete={emailMode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha (mín. 6 caracteres)"
              minLength={6}
              className={inputClass}
              style={inputStyle}
            />
            {formError ? (
              <p className="text-xs px-1" style={{ color: '#f87171' }} role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50"
              style={{ background: '#1a1a1a', color: '#f5d800', border: '1px solid #3a3a1a' }}
            >
              {submitting
                ? 'Aguarde…'
                : emailMode === 'signin'
                  ? 'Entrar com e-mail'
                  : 'Cadastrar e entrar'}
            </button>
          </form>

          <button
            type="button"
            onClick={onGuestLogin}
            className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 border"
            style={{ background: 'transparent', color: '#888', borderColor: '#2a2a2a' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#141414';
              (e.currentTarget as HTMLButtonElement).style.color = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#888';
            }}
          >
            Continuar sem login
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: '#444' }}>
          O login salva seu progresso na nuvem.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
