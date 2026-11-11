import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {} as any;
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {} as any;

export const supabaseUrl = metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || procEnv.SUPABASE_URL || undefined;
export const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || procEnv.SUPABASE_ANON_KEY || undefined;

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidKey = (key: string | undefined): boolean => {
  if (!key) return false;
  // Be more lenient: just check if it's a non-empty string of reasonable length
  return key.length > 20;
};

export const isSupabaseUrlValid = isValidUrl(supabaseUrl);
export const isSupabaseKeyValid = isValidKey(supabaseAnonKey);
export const isSupabaseConfigured = isSupabaseUrlValid && isSupabaseKeyValid;

// Lokalt demoläge (npm run dev + ?demo): använd en egen, tom inloggningslagring så att en
// riktig inloggning i samma webbläsare aldrig syns för – eller skrivs över av – demodatan.
export const isLocalDemoMode =
  typeof window !== 'undefined' &&
  Boolean(metaEnv.DEV) &&
  new URLSearchParams(window.location.search).has('demo');

export const supabase = isSupabaseConfigured
  ? createClient<Database>(
      supabaseUrl!,
      supabaseAnonKey!,
      isLocalDemoMode ? { auth: { storageKey: 'dejz-demo-isolated-auth', persistSession: false } } : undefined
    )
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: new Error('Supabase not configured') }),
        updateUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Supabase not configured') }), order: () => ({ data: [], error: new Error('Supabase not configured') }) }) }),
        insert: () => ({ select: async () => ({ data: [], error: new Error('Supabase not configured') }) }),
        update: () => ({ eq: () => ({ select: async () => ({ data: [], error: new Error('Supabase not configured') }) }) }),
        delete: () => ({ eq: async () => ({ error: new Error('Supabase not configured') }) }),
      }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: new Error('Supabase not configured') }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
      functions: {
        invoke: async () => ({ data: null, error: new Error('Supabase not configured') }),
      },
    } as unknown as SupabaseClient<Database>;
