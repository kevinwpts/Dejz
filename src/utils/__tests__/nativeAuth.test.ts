import { test } from 'vitest';
import assert from 'node:assert/strict';

// supabaseClient behöver inte startas för att testa tolkningen av länken
const { parseAuthCallback } = await import('../nativeAuth');

test('kod från Google/Apple (PKCE) läses ur länken', () => {
  assert.deepEqual(parseAuthCallback('se.dejz.app://auth-callback?code=abc123'), {
    code: 'abc123',
    accessToken: undefined,
    refreshToken: undefined,
    error: undefined,
  });
});

test('tokens i #-delen läses ur länken', () => {
  const r = parseAuthCallback('se.dejz.app://auth-callback#access_token=AT&refresh_token=RT&expires_in=3600');
  assert.equal(r.accessToken, 'AT');
  assert.equal(r.refreshToken, 'RT');
});

test('fel från leverantören läses ur länken', () => {
  const r = parseAuthCallback('se.dejz.app://auth-callback?error=access_denied&error_description=Avbr%C3%B6t');
  assert.equal(r.error, 'Avbröt');
  assert.equal(r.code, undefined);
});
