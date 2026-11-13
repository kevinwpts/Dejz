// supabase/functions/send-feedback – sparar feedback och mejlar en kopia till Kevin (index → handler.ts, email.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateClient } from '../../supabase/functions/_shared/deps';
import { buildFeedbackEmail } from '../../supabase/functions/send-feedback/email';
import { createHandler } from '../../supabase/functions/send-feedback/handler';
import { type DbCall, envFrom, fakeSupabase, jsonResponse, mockFetch, post, resetFetch } from '../helpers';

const URL = 'https://x.supabase.co/functions/v1/send-feedback';
const RESEND_KEY = 're_secret_key';
const baseEnv = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-role', RESEND_API_KEY: RESEND_KEY };

let db: ReturnType<typeof fakeSupabase>;
let recentCount: number;
let insertError: { message: string } | null;

function answer(call: DbCall) {
  if (call.chain[0][0] === 'insert') return { error: insertError };
  if (call.chain[0][0] === 'select') return { count: recentCount };
  return {};
}

function setup(env: Record<string, string | undefined> = baseEnv) {
  db = fakeSupabase(answer);
  db.auth.getUser.mockImplementation(async (jwt?: string) =>
    jwt === 'good-jwt'
      ? {
          data: { user: { id: 'u1', email: 'anna@example.com', created_at: '2026-11-01T10:00:00Z', user_metadata: { full_name: 'Anna' } } },
          error: null,
        }
      : { data: { user: null }, error: { message: 'bad' } },
  );
  return createHandler({ env: envFrom(env), createClient: (() => db) as unknown as CreateClient });
}

const inserted = () => db.calls.find((c) => c.chain[0][0] === 'insert')?.chain[0][1] as Record<string, unknown>;
const mails = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url) === 'https://api.resend.com/emails');
const mailBody = (i = 0) => JSON.parse(String((mails()[i][1] as RequestInit).body));

beforeEach(() => {
  recentCount = 0;
  insertError = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  resetFetch();
  vi.restoreAllMocks();
});

describe('send-feedback: indata', () => {
  it('OPTIONS ger CORS, GET ger 405', async () => {
    const handler = setup();
    expect((await handler(new Request(URL, { method: 'OPTIONS' }))).headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await handler(new Request(URL))).status).toBe(405);
  });

  it.each([{}, { message: '   ' }, 'not json'])('400 för tomt meddelande (%j)', async (body) => {
    const res = await setup()(post(URL, body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'empty' });
  });

  it('okänd typ blir "idea", meddelandet trimmas och kortas till 4000 tecken', async () => {
    mockFetch(() => jsonResponse({}));
    await setup()(post(URL, { type: 'drop table', message: `  ${'x'.repeat(5000)}  ` }));
    expect(inserted().type).toBe('idea');
    expect((inserted().message as string).length).toBe(4000);
  });

  it('begränsar sammanhanget: högst 15 fält, korta nycklar, korta värden, allt som text', async () => {
    mockFetch(() => jsonResponse({}));
    const context: Record<string, unknown> = { obj: { a: 1 }, ['k'.repeat(60)]: 'v'.repeat(3000) };
    for (let i = 0; i < 20; i++) context[`f${i}`] = i;
    await setup()(post(URL, { type: 'bug', message: 'Hej', context }));
    const saved = inserted().context as Record<string, string>;
    expect(Object.keys(saved)).toHaveLength(15);
    expect(saved.obj).toBe('{"a":1}');
    expect(saved['k'.repeat(40)]).toHaveLength(2000);
    expect(saved.f0).toBe('0');
  });
});

describe('send-feedback: avsändare', () => {
  it('anonymt utan inloggning (user_id null) – och mejlet har inget reply_to', async () => {
    mockFetch(() => jsonResponse({}));
    const res = await setup()(post(URL, { type: 'praise', message: 'Bra app' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(inserted()).toMatchObject({ user_id: null, user_email: null, type: 'praise', message: 'Bra app' });
    expect(mailBody().reply_to).toBeUndefined();
  });

  it('en falsk token ger anonym feedback, inte någon annans namn', async () => {
    mockFetch(() => jsonResponse({}));
    await setup()(post(URL, { message: 'Hej' }, { Authorization: 'Bearer forged' }));
    expect(inserted()).toMatchObject({ user_id: null, user_email: null });
  });

  it('inloggad: sparar user_id och svarar till personen', async () => {
    mockFetch(() => jsonResponse({}));
    await setup()(post(URL, { type: 'bug', message: 'Knappen funkar inte' }, { Authorization: 'Bearer good-jwt' }));
    expect(inserted()).toMatchObject({ user_id: 'u1', user_email: 'anna@example.com', type: 'bug' });
    expect(mailBody()).toMatchObject({ to: ['hej@dejz.se'], reply_to: 'anna@example.com', from: 'Dejz <hej@dejz.se>' });
    expect(mailBody().subject).toContain('Knappen funkar inte');
    expect(mailBody().html).toContain('Anna (anna@example.com)');
  });

  it('FEEDBACK_TO och WAITLIST_FROM styr mottagare och avsändare', async () => {
    mockFetch(() => jsonResponse({}));
    await setup({ ...baseEnv, FEEDBACK_TO: 'kevin@dejz.se', WAITLIST_FROM: 'Dejz <app@dejz.se>' })(post(URL, { message: 'Hej' }));
    expect(mailBody()).toMatchObject({ to: ['kevin@dejz.se'], from: 'Dejz <app@dejz.se>' });
  });
});

describe('send-feedback: skydd och fel', () => {
  it('sparar men mejlar inte när det kommit fler än 30 rapporter på 10 minuter', async () => {
    recentCount = 31;
    mockFetch(() => jsonResponse({}));
    const res = await setup()(post(URL, { message: 'Spam' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(inserted()).toBeDefined();
    expect(mails()).toHaveLength(0);
  });

  it('exakt 30 rapporter mejlas fortfarande', async () => {
    recentCount = 30;
    mockFetch(() => jsonResponse({}));
    await setup()(post(URL, { message: 'Hej' }));
    expect(mails()).toHaveLength(1);
  });

  it('utan RESEND_API_KEY sparas feedbacken ändå, utan mejl', async () => {
    const res = await setup({ ...baseEnv, RESEND_API_KEY: undefined })(post(URL, { message: 'Hej' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(inserted()).toBeDefined();
    expect(mails()).toHaveLength(0);
  });

  it('databasfel vid sparning loggas, men mejlet skickas och svaret är ok', async () => {
    insertError = { message: 'insert failed' };
    mockFetch(() => jsonResponse({}));
    const res = await setup()(post(URL, { message: 'Hej' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(mails()).toHaveLength(1);
  });

  it('Resend svarar fel: användaren får ändå ok (feedbacken är sparad)', async () => {
    mockFetch(() => new Response('nope', { status: 500 }));
    const res = await setup()(post(URL, { message: 'Hej' }));
    expect(res.status).toBe(200);
  });

  it('Resend går inte att nå: 500 { ok: false } utan detaljer', async () => {
    mockFetch(() => {
      throw new TypeError('network');
    });
    const res = await setup()(post(URL, { message: 'Hej' }));
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('{"ok":false}');
  });
});

describe('buildFeedbackEmail', () => {
  const now = new Date('2026-11-13T17:30:00Z');

  it('ämnesrad med typ, avsändare och början av meddelandet', () => {
    const { subject } = buildFeedbackEmail({ type: 'bug', message: 'x'.repeat(60), context: {}, userEmail: 'anna@example.com', now });
    expect(subject).toBe(`🐛 Något är fel från anna: ${'x'.repeat(50)}…`);
  });

  it('demoläget märks som test', () => {
    const { subject, html } = buildFeedbackEmail({ type: 'idea', message: 'Hej', context: { sida: '/?demo' }, userEmail: null, now });
    expect(subject.startsWith('[TEST] ')).toBe(true);
    expect(html).toContain('demoläget');
    expect(html).toContain('Inte inloggad');
  });

  it('escapar HTML i meddelandet och sammanhanget', () => {
    const { html } = buildFeedbackEmail({
      type: 'crash',
      message: '<script>alert(1)</script>',
      context: { fel: '<img src=x onerror=alert(1)>' },
      userEmail: null,
      now,
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('beskriver enheten och kontots ålder', () => {
    const { html } = buildFeedbackEmail({
      type: 'praise',
      message: 'Hej',
      context: {
        enhet: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/26.1 Mobile/15E148 Safari/604.1',
      },
      userEmail: 'anna@example.com',
      userCreatedAt: '2026-11-13T17:00:00Z',
      now,
    });
    expect(html).toContain('Safari på iPhone, iOS 26.1');
    expect(html).toContain('kontot skapades för 30 min sedan');
  });
});
