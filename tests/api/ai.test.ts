// api/ai/clean-merchants.ts och api/ai/enrich-merchant.ts – snyggar till banktexter med Gemini.
// Gemini mockas: inga riktiga anrop. Utan nyckel eller vid fel ska det alltid finnas ett svar (reservlogik).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRes } from '../helpers';

const { generateContent, GoogleGenAI } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const GoogleGenAI = vi.fn(function (this: { models: unknown }) {
    this.models = { generateContent };
  });
  return { generateContent, GoogleGenAI };
});
vi.mock('@google/genai', () => ({
  GoogleGenAI,
  Type: { ARRAY: 'ARRAY', OBJECT: 'OBJECT', STRING: 'STRING' },
}));

const { default: cleanMerchants } = await import('../../api/ai/clean-merchants');
const { default: enrichMerchant } = await import('../../api/ai/enrich-merchant');

const call = async (handler: typeof cleanMerchants, req: Parameters<typeof cleanMerchants>[0]) => {
  const { res, out } = mockRes();
  await handler(req, res);
  return out;
};

const aiAnswers = (text: string) => generateContent.mockResolvedValue({ text });
const item = (key: string, rawText: string, type: 'income' | 'expense' = 'expense') => ({
  key,
  rawText,
  amount: -100,
  time: '2026-11-01',
  type,
});

beforeEach(() => {
  generateContent.mockReset();
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.stubEnv('VITE_GEMINI_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('clean-merchants: indata', () => {
  it('svarar 405 på allt utom POST', async () => {
    const out = await call(cleanMerchants, { method: 'GET' });
    expect(out.statusCode).toBe(405);
  });

  it.each([undefined, [], 'text', { a: 1 }])('ger tom lista när items är %j', async (items) => {
    const out = await call(cleanMerchants, { method: 'POST', body: { items } });
    expect(out).toMatchObject({ statusCode: 200, body: { results: [] } });
  });

  it('hoppar över poster utan key eller rawText', async () => {
    const out = await call(cleanMerchants, {
      method: 'POST',
      body: { items: [{ key: 'a' }, { rawText: 'ICA' }, null, 'x'] },
    });
    expect(out.body).toEqual({ results: [] });
  });

  it('behandlar högst 40 poster per anrop', async () => {
    const items = Array.from({ length: 55 }, (_, i) => item(`k${i}`, `ICA NARA ${i}`));
    const out = await call(cleanMerchants, { method: 'POST', body: { items } });
    expect((out.body as { results: unknown[] }).results).toHaveLength(40);
  });
});

describe('clean-merchants: reservlogik utan AI-nyckel', () => {
  const clean = async (rawText: string, type: 'income' | 'expense' = 'expense', extra: object = {}) => {
    const out = await call(cleanMerchants, { method: 'POST', body: { items: [item('k', rawText, type)], ...extra } });
    return (out.body as { results: Array<Record<string, string>> }).results[0];
  };

  it('anropar aldrig Gemini utan nyckel', async () => {
    await clean('ICA NARA 1234');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('Klarna med och utan butiksnamn', async () => {
    expect(await clean('KLARNA*1234')).toEqual({ key: 'k', cleanName: 'Klarna', category: 'Shopping', domain: 'klarna.com' });
    expect(await clean('KLARNA*Zalando')).toMatchObject({ cleanName: 'Klarna · Zalando', domain: 'klarna.com' });
  });

  it('Nyx-automater blir "Varuautomat (Nyx)"', async () => {
    expect(await clean('NYX*SVENSKA AUTOMAT')).toMatchObject({ cleanName: 'Varuautomat (Nyx)', category: 'Mat & dryck' });
  });

  it('tar bort kortterminalens prefix, förkortningar och nummer', async () => {
    expect(await clean('ZETTLE*GBG KAFE 123456')).toEqual({
      key: 'k',
      cleanName: 'Göteborg Kafé',
      category: 'Uteliv',
      domain: '',
    });
  });

  it('gissar kategori från namnet', async () => {
    expect(await clean('ICA NARA 1234 SE')).toMatchObject({ cleanName: 'Ica Nara', category: 'Mat & dryck' });
    expect(await clean('TAXI STHLM')).toMatchObject({ cleanName: 'Taxi Stockholm', category: 'Transport' });
    expect(await clean('APOTEK HJARTAT')).toMatchObject({ category: 'Hälsa' });
    expect(await clean('FILMSTADEN BIO')).toMatchObject({ category: 'Nöje' });
    expect(await clean('SKOR OCH MODE AB')).toMatchObject({ cleanName: 'Skor Och Mode', category: 'Shopping' });
    expect(await clean('OKAND FIRMA')).toMatchObject({ category: 'Övrigt' });
  });

  it('inkomster får första inkomstkategorin', async () => {
    expect(await clean('ARBETSGIVAREN AB', 'income')).toMatchObject({ category: 'Lön' });
    expect(await clean('ARBETSGIVAREN AB', 'income', { incomeCategories: ['Jobb'] })).toMatchObject({ category: 'Jobb' });
  });

  it('använder användarens egna kategorier', async () => {
    expect(await clean('ICA NARA', 'expense', { expenseCategories: ['Matvaror', 'Annat'] })).toMatchObject({
      category: 'Matvaror',
    });
  });

  it('bara siffror blir ändå ett namn', async () => {
    expect(await clean('SUMUP*123456')).toMatchObject({ cleanName: 'Sumup' });
  });
});

describe('clean-merchants: med Gemini', () => {
  beforeEach(() => vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key'));

  it('använder AI-svaret, städar domänen och fyller luckor med reservlogiken', async () => {
    aiAnswers(
      '```json\n' +
        JSON.stringify([
          { key: 'a', cleanName: ' Holy Greens ', category: 'Mat & dryck', domain: 'https://www.HolyGreens.se/meny' },
          { key: 'b', cleanName: 'Kompis', category: '', domain: 'ingen-punkt' },
          { key: 'okänd', cleanName: 'Ska inte med', category: 'X' },
          { key: 'c', cleanName: '   ', category: 'X' },
        ]) +
        '\n```',
    );
    const out = await call(cleanMerchants, {
      method: 'POST',
      body: { items: [item('a', 'ZETTLE*HOLY GREENS'), item('b', 'SWISH KOMPIS'), item('c', 'ICA NARA')] },
    });
    expect(out.statusCode).toBe(200);
    expect(out.body).toEqual({
      results: [
        { key: 'a', cleanName: 'Holy Greens', category: 'Mat & dryck', domain: 'holygreens.se' },
        { key: 'b', cleanName: 'Kompis', category: 'Övrigt', domain: '' },
        { key: 'c', cleanName: 'Ica Nara', category: 'Mat & dryck', domain: '' },
      ],
    });
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'gemini-test-key' });
  });

  it('skickar med de giltiga kategorierna i prompten', async () => {
    aiAnswers('[]');
    await call(cleanMerchants, {
      method: 'POST',
      body: { items: [item('a', 'ICA')], expenseCategories: ['Egen kategori'] },
    });
    expect(generateContent.mock.calls[0][0].contents).toContain('["Egen kategori"]');
  });

  it('faller tillbaka när AI-svaret inte är en lista', async () => {
    aiAnswers('{"key":"a"}');
    const out = await call(cleanMerchants, { method: 'POST', body: { items: [item('a', 'ICA NARA')] } });
    expect(out.body).toEqual({ results: [{ key: 'a', cleanName: 'Ica Nara', category: 'Mat & dryck', domain: '' }] });
  });

  it('faller tillbaka (200) när Gemini är nere eller svarar skräp', async () => {
    generateContent.mockRejectedValueOnce(new Error('503 Service Unavailable'));
    const down = await call(cleanMerchants, { method: 'POST', body: { items: [item('a', 'ICA NARA')] } });
    expect(down.statusCode).toBe(200);
    expect(down.body).toEqual({ results: [{ key: 'a', cleanName: 'Ica Nara', category: 'Mat & dryck', domain: '' }] });

    aiAnswers('inte json');
    const junk = await call(cleanMerchants, { method: 'POST', body: { items: [item('a', 'ICA NARA')] } });
    expect(junk.statusCode).toBe(200);
    expect((junk.body as { results: unknown[] }).results).toHaveLength(1);
  });

  it('tomt AI-svar ger reservlogiken', async () => {
    generateContent.mockResolvedValue({ text: undefined });
    const out = await call(cleanMerchants, { method: 'POST', body: { items: [item('a', 'ICA NARA')] } });
    expect((out.body as { results: Array<{ cleanName: string }> }).results[0].cleanName).toBe('Ica Nara');
  });
});

describe('enrich-merchant', () => {
  it('sätter CORS-huvuden och svarar på OPTIONS', async () => {
    const out = await call(enrichMerchant, { method: 'OPTIONS' });
    expect(out.statusCode).toBe(200);
    expect(out.ended).toBe(true);
    expect(out.headers).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
  });

  it('svarar 405 på GET', async () => {
    const out = await call(enrichMerchant, { method: 'GET' });
    expect(out.statusCode).toBe(405);
  });

  it.each(['', 'a', 'x'.repeat(201)])('ger tomt svar för orimligt namn (%j)', async (name) => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key');
    const out = await call(enrichMerchant, { method: 'POST', body: { name } });
    expect(out.body).toEqual({ domain: '', category: '' });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('ger tomt svar utan nyckel', async () => {
    const out = await call(enrichMerchant, { method: 'POST', body: { name: 'Holy Greens' } });
    expect(out.body).toEqual({ domain: '', category: '' });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('städar domänen och kategorin från AI-svaret', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key');
    aiAnswers('```json\n{"domain":"HTTPS://www.Espressohouse.com/sv","category":" Uteliv "}\n```');
    const out = await call(enrichMerchant, { method: 'POST', body: { name: 'ESPRESSO HOUSE' } });
    expect(out).toMatchObject({ statusCode: 200, body: { domain: 'espressohouse.com', category: 'Uteliv' } });
  });

  it('domän utan punkt och icke-text blir tomt', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key');
    aiAnswers('{"domain":"localhost","category":5}');
    const out = await call(enrichMerchant, { method: 'POST', body: { name: 'Kompis' } });
    expect(out.body).toEqual({ domain: '', category: '' });
  });

  it('använder inkomstkategorier för inkomster och egna kategorier när de skickas', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key');
    aiAnswers('{}');
    await call(enrichMerchant, { method: 'POST', body: { name: 'Försäkringskassan', type: 'income' } });
    expect(generateContent.mock.calls[0][0].contents).toContain('"CSN"');
    expect(generateContent.mock.calls[0][0].contents).toContain('typ: inkomst');

    await call(enrichMerchant, { method: 'POST', body: { name: 'ICA', categories: ['Egen'] } });
    expect(generateContent.mock.calls[1][0].contents).toContain('["Egen"]');
  });

  it('svarar 200 med tomt svar när Gemini är nere', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    generateContent.mockRejectedValue(new Error('network down'));
    const out = await call(enrichMerchant, { method: 'POST', body: { name: 'ICA Maxi' } });
    expect(out).toMatchObject({ statusCode: 200, body: { domain: '', category: '' } });
    expect(errors).toHaveBeenCalled();
  });
});
