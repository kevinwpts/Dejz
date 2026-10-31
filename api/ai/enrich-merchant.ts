import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, type, categories } = body || {};
    const query = String(name || '').trim();
    if (!query || query.length < 2 || query.length > 200) {
      return res.status(200).json({ domain: '', category: '' });
    }

    const validCats: string[] =
      Array.isArray(categories) && categories.length > 0
        ? categories
        : type === 'income'
        ? ['Lön', 'Bidrag', 'Pension', 'CSN', 'Swish', 'Återbetalning', 'Övrigt']
        : [
            'Mat & dryck',
            'Uteliv',
            'Shopping',
            'Boende',
            'Transport',
            'Nöje',
            'Hälsa',
            'Abonnemang',
            'Försäkring',
            'Räkningar',
            'Swish',
            'Övrigt',
          ];

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ domain: '', category: '' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Du är en expert på svenska företag, restauranger, butiker, kedjor, bostadsbolag, gym, appar och myndigheter i Sverige.
Användaren har skrivit eller importerat företaget/transaktionen: "${query}" (typ: ${type === 'income' ? 'inkomst' : 'utgift'}).

Returnera JSON med:
1. "domain": Företagets officiella webbdomän utan https:// eller www. (t.ex. "holygreens.se" för "Holy Greens", "joeandthejuice.com" för "Joe & The Juice", "misteryork.se" för "Mister York", "brodernas.nu" för "Brödernas", "varbergsenergi.se" för "Varbergs Energi"). Om det inte är ett känt företag eller saknar egen webbdomän, returnera "".
2. "category": Den mest träffsäkra kategorin ur denna lista: ${JSON.stringify(validCats)}.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            domain: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ['domain', 'category'],
        },
      },
    });

    const responseText = result.text?.trim() || '{}';
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    const cleanDomain =
      typeof parsed.domain === 'string'
        ? parsed.domain
            .toLowerCase()
            .trim()
            .replace(/^(?:https?:\/\/)?(?:www\.)?/, '')
            .split('/')[0]
        : '';

    return res.status(200).json({
      domain: cleanDomain && cleanDomain.includes('.') ? cleanDomain : '',
      category: typeof parsed.category === 'string' ? parsed.category.trim() : '',
    });
  } catch (error) {
    console.error('[Gemini] enrich-merchant error:', error);
    return res.status(200).json({ domain: '', category: '' });
  }
}
