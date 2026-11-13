// supabase/functions/waitlist-welcome – tackmejlet till den som skrivit upp sig på väntelistan.
// Mejl får bara gå till adresser som redan står i väntelistan, högst en gång per adress.
// (Själva uppskrivningen, spamskyddet och utm_source sköts i SQL-funktionen join_waitlist –
//  se supabase/migrations/20261106_waitlist_protection.sql. Den går inte att köra i Vitest.)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateClient } from '../../supabase/functions/_shared/deps';
import { createHandler } from '../../supabase/functions/waitlist-welcome/handler';
import { type DbCall, envFrom, fakeSupabase, hasStep, jsonResponse, mockFetch, post, resetFetch } from '../helpers';

const URL = 'https://x.supabase.co/functions/v1/waitlist-welcome';
const RESEND_KEY = 're_secret_key';
const baseEnv = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  RESEND_API_KEY: RESEND_KEY,
};

/** Låtsad väntelista: adress → { created_at, welcome_sent_at } */
let rows: Map<string, { created_at: number; welcome_sent_at: string | null }>;
let db: ReturnType<typeof fakeSupabase>;

function answer(call: DbCall) {
  if (call.table !== 'waitlist') return {};
  const email = call.chain.find((s) => s[0] === 'eq' && s[1] === 'email')?.[2] as string;
  const update = call.chain.find((s) => s[0] === 'update')?.[1] as { welcome_sent_at: string | null };
  const row = rows.get(email);
  if (hasStep(call, 'is', 'welcome_sent_at', null)) {
    // Låset: bara om mejlet inte skickats och raden är ny
    const since = Date.parse(call.chain.find((s) => s[0] === 'gte')?.[2] as string);
    if (!row || row.welcome_sent_at !== null || row.created_at < since) return { data: null };
    row.welcome_sent_at = update.welcome_sent_at;
    return { data: { email } };
  }
  if (row && update) row.welcome_sent_at = update.welcome_sent_at;
  return {};
}

function setup(env: Record<string, string | undefined> = baseEnv) {
  db = fakeSupabase(answer);
  const createClient = vi.fn(() => db) as unknown as CreateClient;
  return { handler: createHandler({ env: envFrom(env), createClient }), createClient };
}

const resendSends = () =>
  vi.mocked(fetch).mock.calls.filter(([url]) => String(url) === 'https://api.resend.com/emails');

beforeEach(() => {
  rows = new Map([['anna@example.com', { created_at: Date.now() - 60_000, welcome_sent_at: null }]]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  resetFetch();
  vi.restoreAllMocks();
});

describe('waitlist-welcome: metod och CORS', () => {
  it('svarar på OPTIONS med CORS-huvuden', async () => {
    const res = await setup().handler(new Request(URL, { method: 'OPTIONS' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
  });

  it('svarar 405 på GET', async () => {
    const res = await setup().handler(new Request(URL));
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: 'method_not_allowed' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('waitlist-welcome: indata', () => {
  it.each([{}, { email: '' }, { email: '   ' }, { email: `${'a'.repeat(250)}@x.se` }])(
    'skickar inget för ogiltig adress %j',
    async (body) => {
      const { handler, createClient } = setup();
      const res = await handler(post(URL, body));
      expect(await res.json()).toEqual({ sent: false });
      expect(createClient).not.toHaveBeenCalled();
    },
  );

  it('klarar trasig JSON', async () => {
    const res = await setup().handler(post(URL, '{oops'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: false });
  });

  it('skickar inget och säger not_configured när RESEND_API_KEY saknas', async () => {
    const { handler, createClient } = setup({ ...baseEnv, RESEND_API_KEY: undefined });
    const res = await handler(post(URL, { email: 'anna@example.com' }));
    expect(await res.json()).toEqual({ sent: false, reason: 'not_configured' });
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('waitlist-welcome: skickar mejlet', () => {
  it('skickar tackmejlet en gång till en ny adress i väntelistan', async () => {
    mockFetch(() => jsonResponse({ id: 'mail_1' }));
    const { handler } = setup();
    const res = await handler(post(URL, { email: '  Anna@Example.COM ' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });

    const sends = resendSends();
    expect(sends).toHaveLength(1);
    const init = sends[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${RESEND_KEY}`);
    const mail = JSON.parse(String(init.body));
    expect(mail).toMatchObject({
      from: 'Dejz <hej@dejz.se>',
      to: ['anna@example.com'],
      reply_to: 'hej@dejz.se',
      subject: 'Du är med på Dejz väntelista 💜',
    });
    expect(mail.text).toContain('https://dejz.se/?ref=mejl');
    expect(mail.html).toContain('https://dejz.se/integritet');
    expect(rows.get('anna@example.com')?.welcome_sent_at).not.toBeNull();
  });

  it('låser raden innan mejlet skickas (bara om welcome_sent_at är tom och raden är ny)', async () => {
    mockFetch(() => jsonResponse({}));
    const { handler } = setup();
    await handler(post(URL, { email: 'anna@example.com' }));
    const claim = db.calls[0];
    expect(claim.table).toBe('waitlist');
    expect(hasStep(claim, 'eq', 'email', 'anna@example.com')).toBe(true);
    expect(hasStep(claim, 'is', 'welcome_sent_at', null)).toBe(true);
    const since = Date.parse(claim.chain.find((s) => s[0] === 'gte')?.[2] as string);
    expect(Date.now() - since).toBeGreaterThanOrEqual(30 * 60 * 1000 - 1000);
    expect(Date.now() - since).toBeLessThanOrEqual(30 * 60 * 1000 + 1000);
  });

  it('använder WAITLIST_FROM som avsändare när den finns', async () => {
    mockFetch(() => jsonResponse({}));
    const { handler } = setup({ ...baseEnv, WAITLIST_FROM: 'Kevin <kevin@dejz.se>' });
    await handler(post(URL, { email: 'anna@example.com' }));
    expect(JSON.parse(String((resendSends()[0][1] as RequestInit).body)).from).toBe('Kevin <kevin@dejz.se>');
  });

  it('skickar bara ett mejl även om funktionen anropas två gånger (dubblett)', async () => {
    mockFetch(() => jsonResponse({}));
    const { handler } = setup();
    expect(await (await handler(post(URL, { email: 'anna@example.com' }))).json()).toEqual({ sent: true });
    expect(await (await handler(post(URL, { email: 'anna@example.com' }))).json()).toEqual({ sent: false });
    expect(resendSends()).toHaveLength(1);
  });

  it('skickar inget till adresser som inte står i väntelistan (kan inte användas för spam)', async () => {
    mockFetch(() => jsonResponse({}));
    const res = await setup().handler(post(URL, { email: 'stranger@example.com' }));
    expect(await res.json()).toEqual({ sent: false });
    expect(resendSends()).toHaveLength(0);
  });

  it('skickar inget till adresser som skrevs upp för mer än 30 minuter sedan', async () => {
    mockFetch(() => jsonResponse({}));
    rows.set('old@example.com', { created_at: Date.now() - 31 * 60 * 1000, welcome_sent_at: null });
    const res = await setup().handler(post(URL, { email: 'old@example.com' }));
    expect(await res.json()).toEqual({ sent: false });
    expect(resendSends()).toHaveLength(0);
  });
});

describe('waitlist-welcome: fel', () => {
  it('svarar 502 och släpper låset när Resend svarar fel – utan att visa nyckeln', async () => {
    mockFetch(() => new Response('rate limited', { status: 429 }));
    const { handler } = setup();
    const res = await handler(post(URL, { email: 'anna@example.com' }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ sent: false, reason: 'send_failed' });
    expect(text).not.toContain(RESEND_KEY);
    // Låset släpps så att ett nytt försök kan göras
    expect(rows.get('anna@example.com')?.welcome_sent_at).toBeNull();
    const release = db.calls[1];
    expect(release.chain[0]).toEqual(['update', { welcome_sent_at: null }]);
    expect(hasStep(release, 'eq', 'email', 'anna@example.com')).toBe(true);
  });

  it('nytt försök efter misslyckat utskick fungerar', async () => {
    mockFetch(() => new Response('down', { status: 500 }));
    const { handler } = setup();
    await handler(post(URL, { email: 'anna@example.com' }));
    mockFetch(() => jsonResponse({}));
    expect(await (await handler(post(URL, { email: 'anna@example.com' }))).json()).toEqual({ sent: true });
  });

  it('svarar 500 (utan detaljer) när Resend inte går att nå', async () => {
    mockFetch(() => {
      throw new TypeError('error sending request for url (https://api.resend.com/emails)');
    });
    const res = await setup().handler(post(URL, { email: 'anna@example.com' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ sent: false, reason: 'error' });
  });

  it('svarar 500 (utan detaljer) vid databasfel och skickar inget', async () => {
    mockFetch(() => jsonResponse({}));
    db = fakeSupabase(() => ({ error: { message: 'permission denied for table waitlist' } }));
    const handler = createHandler({ env: envFrom(baseEnv), createClient: (() => db) as unknown as CreateClient });
    const res = await handler(post(URL, { email: 'anna@example.com' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ sent: false, reason: 'error' });
    expect(resendSends()).toHaveLength(0);
  });
});
