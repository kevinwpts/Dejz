import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Partial<ImportMetaEnv>);
const procEnv = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);

const supabaseUrl = metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || procEnv.SUPABASE_URL || undefined;
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || procEnv.SUPABASE_ANON_KEY || undefined;

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

const isSupabaseUrlValid = isValidUrl(supabaseUrl);
const isSupabaseKeyValid = isValidKey(supabaseAnonKey);
export const isSupabaseConfigured = isSupabaseUrlValid && isSupabaseKeyValid;

// Lokalt demoläge (npm run dev + ?demo): använd en egen, tom inloggningslagring så att en
// riktig inloggning i samma webbläsare aldrig syns för – eller skrivs över av – demodatan.
export const isLocalDemoMode =
  typeof window !== 'undefined' &&
  Boolean(metaEnv.DEV) &&
  new URLSearchParams(window.location.search).has('demo');

// Saknas nycklarna (t.ex. i tester) används en adress som inte finns: alla anrop misslyckas
// lugnt med ett nätverksfel i stället för att appen kraschar.
const NOT_CONFIGURED_URL = 'https://not-configured.invalid';
const NOT_CONFIGURED_KEY = 'not-configured-public-anon-key';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  isSupabaseConfigured && supabaseUrl ? supabaseUrl : NOT_CONFIGURED_URL,
  isSupabaseConfigured && supabaseAnonKey ? supabaseAnonKey : NOT_CONFIGURED_KEY,
  isLocalDemoMode ? { auth: { storageKey: 'dejz-demo-isolated-auth', persistSession: false } } : undefined
);
