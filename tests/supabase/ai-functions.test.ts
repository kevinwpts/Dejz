// supabase/functions/parse-expense, parse-income och find-cancellation-url – tolkar fritext med Gemini.
// Gemini mockas via fetch. Viktigt: API-nyckeln (som ligger i Gemini-adressen) får aldrig nå appen.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandler as findCancellation } from '../../supabase/functions/find-cancellation-url/handler';
import { createHandler as parseExpense } from '../../supabase/functions/parse-expense/handler';
import { createHandler as parseIncome, parseLocally } from '../../supabase/functions/parse-income/handler';
import { envFrom, jsonResponse, mockFetch, post, resetFetch } from '../helpers';

const KEY = 'AIzaSy-test-secret-key';
const URL = 'https://x.supabase.co/functions/v1/fn';
const withKey = envFrom({ GOOGLE_AI_API_KEY: KEY });
const noKey = envFrom({});

const gemini = (text: string | undefined) =>
  jsonResponse({ candidates: text === undefined ? [] : [{ content: { parts: [{ text }] } }] });

/** Som Deno: nätverksfel har hela adressen (med ?key=) i meddelandet. */
const networkDown = () =>
  mockFetch((url) => {
    throw new TypeError(`error sending request for url (${url}): dns error`);
  });

const geminiRequest = () => {
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  return { url: String(url), body: JSON.parse(String((init as RequestInit).body)) };
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  resetFetch();
  vi.restoreAllMocks();
});

describe.each([
  ['parse-expense', parseExpense, { prompt: 'coop 300' }, 'Prompt is required'],
  ['find-cancellation-url', findCancellation, { name: 'Spotify' }, 'Företags- eller tjänstenamn krävs'],
])('%s: gemensamt', (_name, create, validBody, emptyError) => {
  it('OPTIONS ger CORS', async () => {
    const res = await create({ env: withKey })(new Request(URL, { method: 'OPTIONS' }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('400 för tom indata', async () => {
    const res = await create({ env: withKey })(post(URL, {}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: emptyError });
  });

  it('500 för trasig JSON', async () => {
    const res = await create({ env: withKey })(post(URL, '{oops'));
    expect(res.status).toBe(500);
  });

  it('500 när nyckeln saknas, utan att anropa Gemini', async () => {
    const res = await create({ env: noKey })(post(URL, validBody));
    expect(res.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('nätverksfel: 500 utan API-nyckeln i svaret', async () => {
    networkDown();
    const res = await create({ env: withKey })(post(URL, validBody));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain(KEY);
    expect(JSON.parse(text).error).toContain('error sending request');
  });

  it('nyckeln döljs även när den kommer från GEMINI_API_KEY', async () => {
    networkDown();
    const res = await create({ env: envFrom({ GEMINI_API_KEY: KEY }) })(post(URL, validBody));
    expect(await res.text()).not.toContain(KEY);
  });

  it('500 när Gemini svarar fel eller tomt', async () => {
    mockFetch(() => new Response('quota exceeded', { status: 429 }));
    const bad = await create({ env: withKey })(post(URL, validBody));
    expect(bad.status).toBe(500);
    expect((await bad.json()).error).toBe('Gemini API error: quota exceeded');

    mockFetch(() => gemini(undefined));
    const empty = await create({ env: withKey })(post(URL, validBody));
    expect(await empty.json()).toEqual({ error: 'Ingen respons från Google AI' });
  });
});

describe('parse-expense', () => {
  it('ger Geminis tolkning (utan ```json-ram)', async () => {
    mockFetch(() => gemini('```json\n{"amount":300,"merchant":"Coop","category":"Mat & Dryck","icon":"ShoppingCart"}\n```'));
    const res = await parseExpense({ env: withKey })(post(URL, { prompt: '300kr coop' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ amount: 300, merchant: 'Coop', category: 'Mat & Dryck', icon: 'ShoppingCart' });
  });

  it('skickar kategorier och högst 15 tidigare val till Gemini', async () => {
    mockFetch(() => gemini('{}'));
    const history = Array.from({ length: 20 }, (_, i) => ({ merchant: `Butik ${i}`, category: 'Shopping' }));
    await parseExpense({ env: withKey })(post(URL, { prompt: 'kaffe 45', categories: ['Fika'], history }));
    const { url, body } = geminiRequest();
    expect(url).toContain('gemini-2.5-flash:generateContent');
    const system = body.systemInstruction.parts[0].text as string;
    expect(system).toContain('Tillgängliga kategorier: Fika.');
    expect(system).toContain('"Butik 14"');
    expect(system).not.toContain('"Butik 15"');
    expect(body.contents[0].parts[0].text).toBe('kaffe 45');
  });

  it('500 när Gemini svarar med ogiltig JSON', async () => {
    mockFetch(() => gemini('inte json'));
    const res = await parseExpense({ env: withKey })(post(URL, { prompt: 'kaffe 45' }));
    expect(res.status).toBe(500);
  });
});

describe('find-cancellation-url', () => {
  it('ger Geminis svar och frågar på svenska som standard', async () => {
    mockFetch(() => gemini('{"serviceName":"Spotify","cancelUrl":"https://www.spotify.com/account"}'));
    const res = await findCancellation({ env: withKey })(post(URL, { name: 'Spotify' }));
    expect(await res.json()).toEqual({ serviceName: 'Spotify', cancelUrl: 'https://www.spotify.com/account' });
    const system = geminiRequest().body.systemInstruction.parts[0].text as string;
    expect(system).toContain('"Spotify" (Kategori: "Abonnemang")');
    expect(system).toContain('instruktionssteg på svenska');
  });

  it('engelska när language=en', async () => {
    mockFetch(() => gemini('{}'));
    await findCancellation({ env: withKey })(post(URL, { name: 'Netflix', category: 'Streaming', language: 'en' }));
    const system = geminiRequest().body.systemInstruction.parts[0].text as string;
    expect(system).toContain('instruktionssteg på engelska');
    expect(system).toContain('(Kategori: "Streaming")');
  });
});

describe('parse-income: handler', () => {
  it('400 för tom prompt', async () => {
    const res = await parseIncome({ env: withKey })(post(URL, { prompt: ' ' }));
    expect(res.status).toBe(400);
  });

  it('utan nyckel: regelbaserad tolkning (200) och inget Gemini-anrop', async () => {
    const res = await parseIncome({ env: noKey })(post(URL, { prompt: '25000 från ur & penn den 27' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      amount: 25000,
      name: 'Ur & Penn',
      category: 'Lön',
      deductionDay: 27,
      icon: 'Briefcase',
      note: '',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('läser även GOOGLE_API_KEY', async () => {
    mockFetch(() => gemini('{"amount":1}'));
    await parseIncome({ env: envFrom({ GOOGLE_API_KEY: KEY }) })(post(URL, { prompt: 'lön 1' }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('ger Geminis tolkning', async () => {
    mockFetch(() => gemini('{"amount":32000,"name":"Volvo","category":"Lön","deductionDay":25,"icon":"Briefcase","note":""}'));
    const res = await parseIncome({ env: withKey })(post(URL, { prompt: 'volvo 32k', defaultPayday: 25 }));
    expect(await res.json()).toMatchObject({ amount: 32000, name: 'Volvo' });
    expect(geminiRequest().body.systemInstruction.parts[0].text).toContain('Standard lönedag: 25.');
  });

  it('Gemini svarar fel eller tomt: regelbaserad tolkning i stället (200)', async () => {
    mockFetch(() => new Response('down', { status: 503 }));
    const down = await parseIncome({ env: withKey })(post(URL, { prompt: 'csn 3000' }));
    expect(down.status).toBe(200);
    expect(await down.json()).toMatchObject({ amount: 3000, category: 'CSN' });

    mockFetch(() => gemini(undefined));
    const empty = await parseIncome({ env: withKey })(post(URL, { prompt: 'csn 3000' }));
    expect(await empty.json()).toMatchObject({ amount: 3000, category: 'CSN' });
  });

  it('nätverksfel: 500 utan API-nyckeln i svaret', async () => {
    networkDown();
    const res = await parseIncome({ env: withKey })(post(URL, { prompt: 'lön 25000' }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(KEY);
  });
});

describe('parseLocally (reserv när Gemini inte går att nå)', () => {
  const cats = ['Lön', 'CSN', 'Barnbidrag', 'Pension', 'Sidoinkomst', 'Övrigt'];

  it.each([
    ['25k från volvo', { amount: 25000, name: 'Volvo', category: 'Lön', deductionDay: 25 }],
    ['32 tkr ikea den 27:e', { amount: 32000, name: 'Ikea', category: 'Lön', deductionDay: 27 }],
    ['csn 3000', { amount: 3000, name: 'Csn', category: 'CSN', icon: 'GraduationCap' }],
    ['barnbidrag 1250', { amount: 1250, name: 'Barnbidrag', category: 'Barnbidrag', icon: 'Heart' }],
    ['pension 9000', { amount: 9000, category: 'Pension', icon: 'Wallet' }],
    ['extrajobb 2000', { amount: 2000, category: 'Sidoinkomst' }],
    ['lön', { amount: 0, name: 'Lön', category: 'Lön' }],
  ])('%s', (prompt, expected) => {
    expect(parseLocally(prompt, cats, 25)).toMatchObject(expected);
  });

  it('ett belopp blir inte lönedag (buggfix: "25000" gav lönedag 25, "18000" lönedag 18)', () => {
    expect(parseLocally('18000 från Volvo', cats, 25)).toMatchObject({ amount: 18000, deductionDay: 25 });
    expect(parseLocally('25 000 kr ica', cats, 27)).toMatchObject({ amount: 25000, deductionDay: 27 });
    expect(parseLocally('ica 25000 den 23', cats, 27)).toMatchObject({ amount: 25000, deductionDay: 23 });
    expect(parseLocally('ica 25000 21e', cats, 27)).toMatchObject({ deductionDay: 21 });
  });

  it('orimlig dag ignoreras', () => {
    expect(parseLocally('lön 20000 den 45', cats, 25).deductionDay).toBe(25);
  });

  it('kategorin måste finnas bland användarens – annars den första', () => {
    expect(parseLocally('csn 3000', ['Jobb', 'Annat'], 25).category).toBe('Jobb');
  });
});
