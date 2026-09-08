'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { sessionMock } from '@/lib/mock/session';

export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function validate(): string | null {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError('');
    try {
      await sessionMock.signIn(email.trim(), password);
      toast.push('success', 'Signed in as Admin.');
      router.push('/admin');
    } catch (err: any) {
      setError(
        err?.message ||
          'Failed to sign in. Check your credentials and ensure the server is running.'
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-light to-surface px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-sm">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-xl font-bold text-white">
            S
          </span>
          <h1 className="mt-5 text-xl font-bold text-ink">SultiAI Admin</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Sign in to manage the platform.</p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-center text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand"
              placeholder="admin@sultiai.com"
              autoComplete="email"
              disabled={busy}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand"
                placeholder="Min 6 characters"
                autoComplete="current-password"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-brand to-brand-dark py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
          Use your admin account credentials. Contact the platform owner if you need access.
        </p>
      </div>
    </div>
  );
}
