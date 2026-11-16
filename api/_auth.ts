/**
 * Vem anropar? Läser inloggningen (Bearer-token) och frågar Supabase Auth om den är giltig.
 * Används av AI-funktionerna så att bara inloggade användare kan driva upp Gemini-kostnaden.
 * Appens publika nyckel (anon) räknas inte som inloggning – Supabase svarar då med fel.
 */
import type { ApiRequest } from './_http.js';

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 500; error: string };

export async function requireUser(req: ApiRequest, fetchImpl: typeof fetch = fetch): Promise<AuthResult> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !apiKey) return { ok: false, status: 500, error: 'Missing configuration' };

  const header = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const denied = { ok: false, status: 401, error: 'Logga in för att använda den här funktionen' } as const;
  if (!token) return denied;

  try {
    const res = await fetchImpl(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
    });
    if (!res.ok) return denied;
    const user: unknown = await res.json();
    const id = user && typeof user === 'object' ? (user as { id?: unknown }).id : undefined;
    return typeof id === 'string' && id ? { ok: true, userId: id } : denied;
  } catch {
    return denied;
  }
}
