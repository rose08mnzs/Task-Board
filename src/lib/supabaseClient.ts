//supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Preserve developer visibility if env vars are not set.
  // This is safe in development; in production prefer throwing or failing early.
  // eslint-disable-next-line no-console
  console.warn('Supabase environment variables are not set. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or equivalent).');
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});

/**
 * Sign in a user with email and password.
 */
export async function signInWithEmail(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Register a new user using email and password.
 */
export async function signUpWithEmail(email: string, password: string) {
  return await supabase.auth.signUp({ email, password });
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  return await supabase.auth.signOut();
}
