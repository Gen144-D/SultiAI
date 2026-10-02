'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CosmicBackground } from '@/components/background/CosmicBackground';
import { useToast } from '@/components/Toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SultiMark } from '@/components/sulti/SultiOrb';
import { inputCls, primaryBtn } from '@/components/ui';
import { adminSession } from '@/lib/session';

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
      await adminSession.signIn(email.trim(), password);
      toast.push('success', 'Signed in as Admin.');
      router.push('/admin');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to sign in. Check your credentials and ensure the server is running.'
      );
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <CosmicBackground variant="focused" />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="anim-enter glass-3 glass-sheen glass-shadow w-full max-w-sm rounded-hero p-7 sm:p-8">
        <div className="text-center">
          <SultiMark className="mx-auto" />
          <h1 className="mt-6 text-lg font-semibold tracking-tight text-ink">SultiAI Admin</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Sign in to manage the platform.</p>
        </div>

        {error && (
          <div
            role="alert"
            className="anim-rise mt-6 rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger ring-1 ring-danger/25 ring-inset"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="mt-7 space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className={inputCls}
              placeholder="admin@sultiai.com"
              autoComplete="email"
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className={`${inputCls} pr-11`}
                placeholder="Min 6 characters"
                autoComplete="current-password"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="press absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    width="17"
                    height="17"
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
                    width="17"
                    height="17"
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

          <button type="submit" disabled={busy} className={`${primaryBtn} mt-2 w-full py-2.5`}>
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
