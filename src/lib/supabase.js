import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export function normalizeUser(supabaseUser) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    fullname: meta.full_name || meta.fullname || '',
    name: meta.full_name || meta.fullname || '',
    native_language: meta.native_language || 'English',
    target_language: meta.target_language || 'Bisaya',
    country: meta.country || '',
    avatar: meta.avatar_url || meta.avatar || '',
    role: meta.role || 'user',
    permissions: meta.permissions || [],
  };
}
