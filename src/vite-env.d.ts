/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Sentry-nyckel för felövervakning. Utan den är felövervakningen avstängd. */
  readonly VITE_SENTRY_DSN?: string;
}
