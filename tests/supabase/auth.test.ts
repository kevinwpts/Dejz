// supabase/functions/_shared/auth.ts – vem anropar AI-funktionerna?
import { describe, expect, it, vi } from 'vitest';
import { supabaseUserVerifier } from '../../supabase/functions/_shared/auth';
import { envFrom, jsonResponse } from '../helpers';

const env = envFrom({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon-key' });
const req = (authorization?: string) =>
  new Request('https://x.supabase.co/functions/v1/fn', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
  });

describe('supabaseUserVerifier', () => {
  it('giltig inloggning ger användarens id och frågar Supabase Auth med token + apikey', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: 'user-1' }));
    expect(await supabaseUserVerifier(env, fetchImpl)(req('Bearer user-token'))).toBe('user-1');
    expect(fetchImpl).toHaveBeenCalledWith('https://x.supabase.co/auth/v1/user', {
      headers: { Authorization: 'Bearer user-token', apikey: 'anon-key' },
    });
  });

  it('utan token: null och inget anrop', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: 'user-1' }));
    expect(await supabaseUserVerifier(env, fetchImpl)(req())).toBeNull();
    expect(await supabaseUserVerifier(env, fetchImpl)(req('Basic abc'))).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ogiltig token (t.ex. appens publika anon-nyckel) ger null', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ msg: 'invalid claim: missing sub claim' }, 403));
    expect(await supabaseUserVerifier(env, fetchImpl)(req('Bearer anon-key'))).toBeNull();
  });

  it('svar utan id, nätverksfel eller saknad konfiguration ger null', async () => {
    expect(await supabaseUserVerifier(env, vi.fn(async () => jsonResponse({})))(req('Bearer t'))).toBeNull();
    const down = vi.fn(async () => {
      throw new TypeError('network down');
    });
    expect(await supabaseUserVerifier(env, down)(req('Bearer t'))).toBeNull();
    const ok = vi.fn(async () => jsonResponse({ id: 'user-1' }));
    expect(await supabaseUserVerifier(envFrom({}), ok)(req('Bearer t'))).toBeNull();
    expect(ok).not.toHaveBeenCalled();
  });
});
