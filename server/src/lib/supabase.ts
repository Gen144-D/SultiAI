import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

let supabaseAdmin: SupabaseClient | null = null;
let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase admin client (service role - bypasses RLS)
 * Use this for admin operations
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

/**
 * Get Supabase client (publishable key - respects RLS)
 * Use this for user-facing operations
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY));
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseAdmin();
    const { error } = await client.from('users').select('count', { count: 'exact', head: true });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Close Supabase connections
 */
export function closeSupabase(): void {
  supabaseAdmin = null;
  supabaseClient = null;
}
