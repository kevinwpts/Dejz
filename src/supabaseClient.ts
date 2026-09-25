import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined);

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

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
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
    } as any;
