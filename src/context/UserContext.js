import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, normalizeUser } from '../lib/supabase';
import { api } from '../services/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [level, setLevel] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!cancelled) {
        setSession(currentSession);
        setUser(normalizeUser(currentSession?.user));
        setLoading(false);
      }
    }).catch((err) => {
      console.warn('[UserContext] getSession error:', err.message);
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!cancelled) {
        setSession(currentSession);
        setUser(normalizeUser(currentSession?.user));

        // Sync user to local DB on sign-in / token refresh / OAuth callback
        if (currentSession?.user) {
          const u = currentSession.user;
          const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
          fetch(`${API_URL}/api/auth/sync-supabase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supabaseId: u.id,
              email: u.email,
              name: u.user_metadata?.full_name || u.user_metadata?.fullname || '',
              native_language: u.user_metadata?.native_language,
              target_language: u.user_metadata?.target_language,
            }),
          })
            .then(res => res.json())
            .then(data => {
              if (data?.success && data?.data?.user) {
                const serverUser = data.data.user;
                setUser(prev => prev ? {
                  ...prev,
                  role: serverUser.role || prev.role || 'user',
                  permissions: serverUser.permissions || prev.permissions || [],
                } : prev);
              }
            })
            .catch(() => {}); // fire-and-forget, don't block UI
        }
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'sultiai://callback',
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const { default: WebBrowser } = await import('expo-web-browser');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'sultiai://callback',
          { showInRecents: true, preferEphemeralSession: false }
        );

        if (result.type === 'success') {
          return { success: true };
        } else if (result.type === 'cancel') {
          return { success: false, error: 'Sign-in was cancelled.' };
        } else {
          return { success: false, error: 'Google sign-in was dismissed or failed.' };
        }
      }

      return { success: true };
    } catch (err) {
      const message = err?.message || 'Google sign-in failed. Please try again.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSession(data.session);
      setUser(normalizeUser(data.user));

      // Sync user to local SQLite DB (in case they only existed in Supabase before)
      if (data.user) {
        try {
          const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
          await fetch(`${API_URL}/api/auth/sync-supabase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supabaseId: data.user.id,
              email: data.user.email || email,
              name: data.user.user_metadata?.full_name || data.user.user_metadata?.fullname || '',
              native_language: data.user.user_metadata?.native_language,
              target_language: data.user.user_metadata?.target_language,
            }),
          });
        } catch (syncErr) {
          console.warn('[UserContext] Failed to sync user on sign-in:', syncErr.message);
        }
      }

      return { success: true };
    } catch (err) {
      const message = err?.message || 'Sign in failed. Please try again.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const signUp = useCallback(async (email, password, name, native_language, target_language) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            native_language: native_language || 'English',
            target_language: target_language || 'Bisaya',
          },
        },
      });

      if (error) {
        // Handle email confirmation errors gracefully
        if (error.message?.includes('confirmation email') || error.message?.includes('email not confirmed')) {
          return {
            success: false,
            error: 'Account created but email confirmation is pending.\n\nPlease disable email confirmation in your Supabase dashboard:\nAuthentication → Providers → Email → Confirm email → OFF\n\nOr set up an email provider (Resend, SendGrid, etc.).',
          };
        }
        throw error;
      }

      // Sync user to local SQLite DB so admin can see/manage them
      if (data.user) {
        try {
          const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
          await fetch(`${API_URL}/api/auth/sync-supabase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supabaseId: data.user.id,
              email: data.user.email || email,
              name: name,
              native_language: native_language,
              target_language: target_language,
            }),
          });
        } catch (syncErr) {
          // Sync endpoint not available — user still works in Supabase, just not in admin
          console.warn('[UserContext] Failed to sync user to local DB:', syncErr.message);
        }
      }

      // User created but needs email confirmation
      if (data.user && !data.session) {
        // Try to auto-confirm the user via server endpoint (for development)
        try {
          const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
          const confirmRes = await fetch(`${API_URL}/api/auth/confirm-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, userId: data.user.id }),
          });
          if (confirmRes.ok) {
            // Re-attempt sign in after auto-confirmation
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (!signInError && signInData?.session) {
              setSession(signInData.session);
              setUser(normalizeUser(signInData.user));
              return { success: true };
            }
          }
        } catch (confirmErr) {
          // Auto-confirm endpoint not available — that's fine
          console.warn('[UserContext] Auto-confirm not available:', confirmErr.message);
        }

        return { success: true, message: 'Please check your email to confirm your account.' };
      }

      setSession(data.session);
      setUser(normalizeUser(data.user));
      return { success: true };
    } catch (err) {
      const message = err?.message || 'Sign up failed. Please try again.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.warn('[UserContext] Sign out error:', err.message);
    } finally {
      setSession(null);
      setUser(null);
      setAuthError(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) setUser(normalizeUser(currentUser));
    } catch (e) {
      console.warn('[UserContext] Failed to refresh profile:', e.message);
    }
  }, []);

  const refreshLevel = useCallback(async () => {
    try {
      const lvl = await api.getTutorLevel();
      setLevel(lvl);
    } catch (e) {
      console.warn('[UserContext] Failed to refresh level:', e.message);
    }
  }, []);

  // Role helper functions
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || isAdmin;
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  }, [user]);

  return (
    <UserContext.Provider value={{
      user, session, loading, authError, level,
      isAdmin, isModerator, hasPermission,
      refreshLevel, signIn, signInWithGoogle, signUp, signOut, refreshProfile,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
