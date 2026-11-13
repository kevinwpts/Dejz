// supabase/functions/email-verification – skickar verifieringsmejl och bekräftar länken.
import { createHash } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateClient } from '../../supabase/functions/_shared/deps';
import { createHandler } from '../../supabase/functions/email-verification/handler';
import { type DbCall, envFrom, fakeSupabase, hasStep, jsonResponse, mockFetch, post, resetFetch } from '../helpers';

const URL = 'https://x.supabase.co/functions/v1/email-verification';
const RESEND_KEY = 're_secret_key';
const baseEnv = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role', RESEND_API_KEY: RESEND_KEY };
const USER = { id: 'user-1', email: 'anna@example.com' };
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

let db: ReturnType<typeof fakeSupabase>;
let existing: { verified_at: string | null; sent_at: string | null } | null;
let confirmRow: object | null;

function answer(call: DbCall) {
  if (hasStep(call, 'select', 'verified_at, sent_at')) return { data: existing };
  if (call.chain.some((s) => s[0] === 'update')) return { data: confirmRow };
  return {};
}

function setup(env: Record<string, string | undefined> = baseEnv) {
  db = fakeSupabase(answer);
  db.auth.getUser.mockImplementation(async (jwt?: string) =>
    jwt === 'good-jwt' ? { data: { user: USER }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } },
  );
  return createHandler({ env: envFrom(env), createClient: (() => db) as unknown as CreateClient });
}

const send = (handler: ReturnType<typeof setup>, jwt = 'good-jwt') =>
  handler(post(URL, { action: 'send' }, jwt ? { Authorization: `Bearer ${jwt}` } : {}));

const sentMail = () => {
  const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === 'https://api.resend.com/emails');
  return call ? { init: call[1] as RequestInit, body: JSON.parse(String((call[1] as RequestInit).body)) } : null;
};

beforeEach(() => {
  existing = null;
  confirmRow = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  resetFetch();
  vi.restoreAllMocks();
});

describe('email-verification: metod och åtgärd', () => {
  it('OPTIONS ger CORS, GET ger 405', async () => {
    const handler = setup();
    const opt = await handler(new Request(URL, { method: 'OPTIONS' }));
    expect(opt.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const get = await handler(new Request(URL));
    expect(get.status).toBe(405);
  });

  it('okänd eller saknad åtgärd ger 400', async () => {
    const handler = setup();
    expect((await handler(post(URL, { action: 'hack' }))).status).toBe(400);
    expect((await handler(post(URL, 'not json'))).status).toBe(400);
  });
});

describe('email-verification: confirm (länken i mejlet)', () => {
  it('för kort token är ogiltig utan att fråga databasen', async () => {
    const handler = setup();
    const res = await handler(post(URL, { action: 'confirm', token: 'short' }));
    expect(await res.json()).toEqual({ status: 'invalid' });
    expect(db.from).not.toHaveBeenCalled();
  });

  it('letar upp tokens hash (inte token i klartext), max 7 dagar gammal, och rensar den', async () => {
    confirmRow = { user_id: 'user-1' };
    const token = 'a'.repeat(48);
    const handler = setup();
    const res = await handler(post(URL, { action: 'confirm', token }));
    expect(await res.json()).toEqual({ status: 'verified' });

    const call = db.calls[0];
    expect(call.table).toBe('email_verification');
    expect(hasStep(call, 'eq', 'token_hash', sha256(token))).toBe(true);
    const update = call.chain.find((s) => s[0] === 'update')?.[1] as Record<string, unknown>;
    expect(update.token_hash).toBeNull();
    expect(typeof update.verified_at).toBe('string');
    const since = Date.parse(call.chain.find((s) => s[0] === 'gte')?.[2] as string);
    expect(Math.round((Date.now() - since) / 86_400_000)).toBe(7);
  });

  it('okänd eller gammal token ger invalid', async () => {
    const res = await setup()(post(URL, { action: 'confirm', token: 'b'.repeat(48) }));
    expect(await res.json()).toEqual({ status: 'invalid' });
  });
});

describe('email-verification: send (kräver inloggning)', () => {
  it('401 utan token eller med ogiltig token, och inget mejl', async () => {
    expect((await send(setup(), '')).status).toBe(401);
    const bad = await send(setup(), 'forged');
    expect(bad.status).toBe(401);
    expect(await bad.json()).toEqual({ status: 'not_logged_in' });
    expect(db.from).not.toHaveBeenCalled();
  });

  it('401 när auth-anropet kastar fel', async () => {
    const handler = setup();
    db.auth.getUser.mockRejectedValue(new Error('auth down'));
    expect((await send(handler)).status).toBe(401);
  });

  it('redan verifierad: inget nytt mejl', async () => {
    existing = { verified_at: '2026-11-01T00:00:00Z', sent_at: null };
    const res = await send(setup());
    expect(await res.json()).toEqual({ status: 'verified' });
    expect(sentMail()).toBeNull();
  });

  it('högst ett mejl per minut', async () => {
    existing = { verified_at: null, sent_at: new Date(Date.now() - 30_000).toISOString() };
    const res = await send(setup());
    expect(await res.json()).toEqual({ status: 'wait' });
    expect(sentMail()).toBeNull();
  });

  it('skickar mejl med en länk vars token bara sparas som hash', async () => {
    existing = { verified_at: null, sent_at: new Date(Date.now() - 120_000).toISOString() };
    mockFetch(() => jsonResponse({ id: 'm1' }));
    const res = await send(setup());
    expect(await res.json()).toEqual({ status: 'sent' });

    const mail = sentMail();
    expect(mail?.body).toMatchObject({ to: ['anna@example.com'], subject: 'Verifiera din e-post för Dejz' });
    expect((mail?.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${RESEND_KEY}`);
    const token = /verifiera\?token=([0-9a-f]+)/.exec(mail?.body.text)?.[1] ?? '';
    expect(token).toHaveLength(48);
    expect(mail?.body.html).toContain(`https://dejz.se/verifiera?token=${token}`);

    const upsert = db.calls.find((c) => c.chain[0][0] === 'upsert');
    expect(upsert?.chain[0][1]).toMatchObject({ user_id: 'user-1', email: 'anna@example.com', token_hash: sha256(token) });
    expect(JSON.stringify(upsert?.chain)).not.toContain(token);
  });

  it('500 not_configured utan RESEND_API_KEY', async () => {
    const res = await send(setup({ ...baseEnv, RESEND_API_KEY: undefined }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ status: 'not_configured' });
  });

  it('502 när Resend svarar fel, utan att visa nyckeln', async () => {
    mockFetch(() => new Response('bad', { status: 401 }));
    const res = await send(setup());
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: 'send_failed' });
    expect(text).not.toContain(RESEND_KEY);
  });

  it('500 error när Resend inte går att nå', async () => {
    mockFetch(() => {
      throw new TypeError('network');
    });
    const res = await send(setup());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ status: 'error' });
  });
});
