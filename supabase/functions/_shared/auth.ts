// Vem anropar? Läser inloggningen (Bearer-token) och frågar Supabase Auth om den är giltig.
// Används av AI-funktionerna så att bara inloggade användare kan driva upp Gemini-kostnaden.
// Appens publika nyckel (anon) räknas inte som inloggning – Supabase svarar då med fel.
// Utan Deno- och URL-importer så att den kan testas med Vitest.

import type { Env } from './deps.ts';

/** Ger användarens id, eller null om anropet inte kommer från en inloggad användare. */
export type GetUserId = (req: Request) => Promise<string | null>;

export function supabaseUserVerifier(env: Env, fetchImpl: typeof fetch = fetch): GetUserId {
  return async (req) => {
    const header = req.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const url = env('SUPABASE_URL');
    const apiKey = env('SUPABASE_ANON_KEY');
    if (!token || !url || !apiKey) return null;
    try {
      const res = await fetchImpl(`${url}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
      });
      if (!res.ok) return null;
      const user: unknown = await res.json();
      const id = user && typeof user === 'object' ? (user as { id?: unknown }).id : undefined;
      return typeof id === 'string' && id ? id : null;
    } catch {
      return null;
    }
  };
}

/** Svaret när någon som inte är inloggad anropar en AI-funktion. */
export function unauthorizedResponse(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'Logga in för att använda den här funktionen' }), {
    status: 401,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
