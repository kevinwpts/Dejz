// Körs före varje testfil (se vitest.config.ts).
// Testerna får aldrig prata med nätet eller Supabase: varje fetch stoppas här med ett tydligt fel.
// Behöver ett test svar från en server mockar det modulen (t.ex. supabaseClient) i stället.
import { afterEach, vi } from 'vitest';

export class NetworkBlockedError extends Error {
  constructor(url: string) {
    super(`Nätverket är avstängt i testerna (försökte hämta ${url})`);
    this.name = 'NetworkBlockedError';
  }
}

function describeRequest(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

const blockedFetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
  throw new NetworkBlockedError(describeRequest(input));
});

vi.stubGlobal('fetch', blockedFetch);

if (typeof window !== 'undefined') {
  // Skärmtester (jsdom): städa bort det som renderats och det som sparats i webbläsaren
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}
