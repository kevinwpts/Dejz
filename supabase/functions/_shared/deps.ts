// Det som Edge Functions får utifrån (Deno.env och supabase-klienten), som vanliga parametrar.
// Då kan logiken ligga i en vanlig .ts-fil utan Deno- eller URL-importer och testas med Vitest
// (tests/supabase). index.ts i varje funktion kopplar in de riktiga: Deno.env.get och createClient.

export type Env = (name: string) => string | undefined;

interface DbError {
  message: string;
}

interface DbResult<T> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}

/** Den del av supabase-js frågebyggare som funktionerna använder. */
interface DbQuery extends PromiseLike<DbResult<unknown>> {
  select(columns?: string, options?: { count?: 'exact'; head?: boolean }): DbQuery;
  insert(values: object): DbQuery;
  update(values: object): DbQuery;
  upsert(values: object): DbQuery;
  delete(): DbQuery;
  eq(column: string, value: unknown): DbQuery;
  is(column: string, value: null): DbQuery;
  gte(column: string, value: string): DbQuery;
  maybeSingle<T = Record<string, unknown>>(): PromiseLike<DbResult<T>>;
}

interface AuthUser {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
}

interface SupabaseLike {
  from(table: string): DbQuery;
  auth: {
    getUser(jwt?: string): Promise<{ data: { user: AuthUser | null } | null; error?: DbError | null }>;
  };
}

export type CreateClient = (url: string, key: string, options?: object) => SupabaseLike;

/** Tar bort hemliga nycklar ur ett felmeddelande innan det skickas till appen.
 *  (Deno skriver hela adressen i nätverksfel, och Gemini-adressen innehåller ?key=…) */
export function redactSecrets(message: string, secrets: Array<string | undefined>): string {
  let out = message;
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join('[dold]');
  }
  return out;
}
