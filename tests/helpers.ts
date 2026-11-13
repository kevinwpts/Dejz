// Hjälpmedel för servertesterna: låtsad Vercel-res, låtsad Supabase-klient och styrd fetch.
// Inget här pratar med nätet – fetch är avstängd i src/test/setup.ts och styrs per test med mockFetch.
import { vi } from 'vitest';
import type { ApiResponse } from '../api/_http';

/** Svaret från en Vercel-funktion (api/), med det som skickades tillbaka. */
export function mockRes() {
  const out = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    ended: false,
  };
  const res: ApiResponse = {
    status(code) {
      out.statusCode = code;
      return res;
    },
    json(body) {
      out.body = body;
      return res;
    },
    setHeader(name, value) {
      out.headers[name] = value;
      return res;
    },
    end() {
      out.ended = true;
      return res;
    },
  };
  return { res, out };
}

export interface DbCall {
  table: string;
  /** Kedjan av anrop, t.ex. [['delete'], ['eq', 'user_id', 'u1']] */
  chain: Array<[string, ...unknown[]]>;
}

type DbAnswer = { data?: unknown; error?: { message: string } | null; count?: number | null };

/**
 * Låtsad supabase-klient. Varje `from(tabell)…`-kedja sparas i `calls`, och `answer` bestämmer
 * vad den ger tillbaka (standard: { data: null, error: null }).
 */
export function fakeSupabase(answer: (call: DbCall) => DbAnswer | Promise<DbAnswer> = () => ({})) {
  const calls: DbCall[] = [];
  const settle = async (call: DbCall) => {
    const a = await answer(call);
    return { data: a.data ?? null, error: a.error ?? null, count: a.count ?? null };
  };
  const builder = (call: DbCall): object =>
    new Proxy(
      {},
      {
        get(_t, prop: string | symbol) {
          if (typeof prop === 'symbol') return undefined;
          if (prop === 'then') {
            const p = settle(call);
            return p.then.bind(p);
          }
          return (...args: unknown[]) => {
            call.chain.push([prop, ...args]);
            return builder(call);
          };
        },
      },
    );
  const client = {
    calls,
    from: vi.fn((table: string) => {
      const call: DbCall = { table, chain: [] };
      calls.push(call);
      return builder(call);
    }),
    auth: {
      getUser: vi.fn(async (_jwt?: string): Promise<{ data: { user: object | null } | null; error: unknown }> => ({
        data: { user: null },
        error: { message: 'invalid JWT' },
      })),
      admin: {
        deleteUser: vi.fn(async (_id: string): Promise<{ error: { message: string } | null }> => ({ error: null })),
      },
    },
  };
  return client;
}

/** Är anropet en viss metod (t.ex. 'delete') och har det ett visst filter? */
export const hasStep = (call: DbCall, ...step: unknown[]) =>
  call.chain.some((s) => s.length === step.length && s.every((v, i) => v === step[i]));

/** Styr fetch (avstängd i setup.ts) i ett test. Återställs med resetFetch(). */
export function mockFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const f = vi.mocked(globalThis.fetch);
  f.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => impl(String(input), init));
  return f;
}

/** Tillbaka till "nätet avstängt" (originalet från setup.ts). */
export function resetFetch() {
  vi.mocked(globalThis.fetch).mockReset();
}

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

/** env()-funktion för Edge Functions från ett vanligt objekt. */
export const envFrom = (vars: Record<string, string | undefined>) => (name: string) => vars[name];
