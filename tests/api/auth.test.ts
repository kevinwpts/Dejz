// api/_auth.ts – bara inloggade användare får använda dejz.se:s AI-funktioner.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '../../api/_auth';
import { jsonResponse } from '../helpers';

const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('requireUser', () => {
  it('giltig inloggning ger användarens id och frågar Supabase Auth med token + apikey', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: 'user-1' }));
    expect(await requireUser(bearer('user-token'), fetchImpl)).toEqual({ ok: true, userId: 'user-1' });
    expect(fetchImpl).toHaveBeenCalledWith('https://x.supabase.co/auth/v1/user', {
      headers: { Authorization: 'Bearer user-token', apikey: 'anon-key' },
    });
  });

  it('utan token: 401 och inget anrop', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: 'user-1' }));
    expect(await requireUser({}, fetchImpl)).toMatchObject({ ok: false, status: 401 });
    expect(await requireUser({ headers: { authorization: 'Basic abc' } }, fetchImpl)).toMatchObject({ status: 401 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ogiltig token (t.ex. appens publika anon-nyckel), svar utan id eller nätverksfel: 401', async () => {
    const denied = vi.fn(async () => jsonResponse({ msg: 'invalid claim: missing sub claim' }, 403));
    expect(await requireUser(bearer('anon-key'), denied)).toMatchObject({ status: 401 });
    expect(await requireUser(bearer('t'), vi.fn(async () => jsonResponse({})))).toMatchObject({ status: 401 });
    const down = vi.fn(async () => {
      throw new TypeError('network down');
    });
    expect(await requireUser(bearer('t'), down)).toMatchObject({ status: 401 });
  });

  it('500 när Supabase-adressen eller nyckeln saknas', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(await requireUser(bearer('t'), vi.fn())).toMatchObject({ ok: false, status: 500 });
  });
});
