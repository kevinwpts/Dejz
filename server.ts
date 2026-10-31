import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";

const __dirname = path.resolve();

// Gemini lazy initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) return null;
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.error('[Gemini] Failed to initialize GoogleGenAI client:', e);
      return null;
    }
  }
  return aiClient;
}

// Lazy initialization helpers
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (error) {
    console.error("Failed to initialize Supabase Admin client:", error);
    return null;
  }
}

// Simple in-memory rate limiter per IP to protect AI and public endpoints
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim()) ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${req.path}:${clientIp}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: "För många anrop på kort tid. Vänta en liten stund och försök igen.",
      });
    }

    bucket.count += 1;
    return next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  // Request Logger
  app.use((req, res, next) => {
    if (req.url !== '/api/ping') {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
  });

  const aiRateLimit = createRateLimiter(30, 60 * 1000); // Max 30 AI calls per minute per IP
  const feedbackRateLimit = createRateLimiter(10, 60 * 1000); // Max 10 feedback submissions per minute

  app.post('/api/parse-transaction', aiRateLimit, async (req, res) => {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.length > 500) {
      return res.status(400).json({ error: 'Missing or invalid text' });
    }

    console.log(`[Gemini] Parsing transaction: "${text}"`);

    // Helper for local regex parsing as fallback
    const localParse = (rawText: string) => {
      const match = rawText.match(/(\d+[.,]?\d*)/);
      const amount = match ? parseFloat(match[1].replace(',', '.')) : 0;
      let name = rawText.replace(/(\d+[.,]?\d*)\s*(kr|sek)?/i, '').trim();
      if (!name) name = "Snabbköp";
      
      const lower = rawText.toLowerCase();
      let category = "Övrigt";
      if (lower.includes("kaffe") || lower.includes("lunch") || lower.includes("mat") || lower.includes("ica") || lower.includes("coop") || lower.includes("restaurang")) {
        category = "Mat";
      } else if (lower.includes("buss") || lower.includes("tåg") || lower.includes("uber") || lower.includes("bensin")) {
        category = "Transport";
      } else if (lower.includes("lön") || lower.includes("swish in") || lower.includes("inkomst")) {
        return { amount, name, type: "income", category: "Inkomst" };
      }
      return { amount, name, type: "expense", category };
    };

    const ai = getGenAI();
    if (!ai) {
      console.log('[Gemini] Using local fallback parser (no key)');
      return res.json(localParse(text));
    }

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analysera följande ekonomiska transaktion och returnera ett JSON-objekt. 
        Inmatning: "${text}"
        
        JSON-objektet SKA ha:
        - amount: number (beloppet som en siffra, t.ex. 150 för "150kr" eller "150,50")
        - name: string (stället eller vad köpet gällde, t.ex. "ICA", "McDonalds", "Kaffe")
        - type: "income" eller "expense"
        - category: string (välj en lämplig kategori som: Mat, Transport, Shopping, Nöje, Hälsa, Bostad, Övrigt)
        
        Exempel: "ICA 150kr" -> { "amount": 150, "name": "ICA", "type": "expense", "category": "Mat" }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["income", "expense"] },
              category: { type: Type.STRING }
            },
            required: ["amount", "name", "type"]
          }
        }
      });

      const responseText = result.text?.trim() || '';
      console.log(`[Gemini] Result: "${responseText}"`);
      
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      if (typeof data.amount !== 'number' || isNaN(data.amount)) {
        if (typeof data.amount === 'string') {
          data.amount = parseFloat(data.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        } else {
          data.amount = 0;
        }
      }

      res.json(data);
    } catch (error) {
      console.error('[Gemini] error, falling back to local parse:', error);
      res.json(localParse(text));
    }
  });

  app.post('/api/ai/clean-merchants', aiRateLimit, async (req, res) => {
    const { items, expenseCategories, incomeCategories } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ results: [] });
    }

    const validExpenseCats: string[] =
      Array.isArray(expenseCategories) && expenseCategories.length > 0
        ? expenseCategories
        : ['Mat & dryck', 'Shopping', 'Boende', 'Transport', 'Nöje', 'Hälsa', 'Abonnemang', 'Försäkring', 'Räkningar', 'Swish', 'Övrigt'];

    const validIncomeCats: string[] =
      Array.isArray(incomeCategories) && incomeCategories.length > 0
        ? incomeCategories
        : ['Lön', 'Bidrag', 'Swish', 'Övrigt'];

    const batch = items.slice(0, 40).map((it: any) => ({
      key: String(it?.key || '').trim(),
      rawText: String(it?.rawText || '').trim(),
      amount: Number(it?.amount) || 0,
      time: String(it?.time || '').trim(),
      type: it?.type === 'income' ? 'income' : 'expense',
    })).filter((it) => it.key && it.rawText);

    if (batch.length === 0) {
      return res.json({ results: [] });
    }

    const fallbackCleanItem = (it: { key: string; rawText: string; amount: number; time?: string; type: string }) => {
      const raw = it.rawText.trim();
      const upper = raw.toUpperCase();

      // Specifika betalterminaler & aggregatorer
      if (/^KLARNA\s*[*#_-]?\s*\d*$/i.test(raw) || upper.startsWith('KLARNA*')) {
        const after = raw.replace(/^KLARNA\s*[*#_-]\s*/i, '').trim();
        const hasMerchantName = after && !/^\d+$/.test(after) && after.length >= 3;
        return {
          key: it.key,
          cleanName: hasMerchantName ? `Klarna (${after})` : 'Klarna',
          category: validExpenseCats.find((c) => c.toLowerCase().includes('shopping')) || 'Shopping',
        };
      }

      if (upper.startsWith('NYX*') || upper.includes('NYX*SVENSKA')) {
        return {
          key: it.key,
          cleanName: 'Varuautomat (Nyx)',
          category: validExpenseCats.find((c) => c.toLowerCase().includes('mat')) || 'Mat & dryck',
        };
      }

      // Rensa bort ZETTLE*, SUMUP*, IZ*, PAYPAL*, STRIPE*, SQ*, SP*, WL*, BAMBORA*, NETS*, ADYEN*
      let stripped = raw
        .replace(/^(ZETTLE|IZETTLE|IZ|SUMUP|PAYPAL|STRIPE|SQ|SP|WL|BAMBORA|NETS|ADYEN|TRUSTLY|QCK|BILLO)\s*[*#_-]+\s*/i, '')
        .replace(/[*#_]+/g, ' ')
        .replace(/\bGBG\b/gi, 'Göteborg')
        .replace(/\bSTHLM\b/gi, 'Stockholm')
        .replace(/\bKAF\b/gi, 'Kafé')
        .replace(/\bKAFE\b/gi, 'Kafé')
        .replace(/\bCOND\b/gi, 'Konditori')
        .replace(/\bKOND\b/gi, 'Konditori')
        .replace(/\bREST\b/gi, 'Restaurang')
        .replace(/\s+\d{3,}\b.*$/, '')
        .replace(/\s+(SE|SWE|SWEDEN)$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!stripped || /^\d+$/.test(stripped)) {
        stripped = raw.replace(/[*#_]+\d+/g, '').trim() || 'Kortköp';
      }

      const titleCased = stripped
        .split(' ')
        .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(' ');

      const lower = titleCased.toLowerCase();
      let category = it.type === 'income' ? (validIncomeCats[0] || 'Övrigt') : 'Övrigt';
      if (it.type !== 'income') {
        if (/(kafé|kafe|cafe|coffee|bageri|konditori|restaurang|pizza|sushi|burger|krog|bar|pub|lunch|mat|livs|kiosk|automat)/.test(lower)) {
          category = validExpenseCats.find((c) => c.toLowerCase().includes('mat')) || 'Mat & dryck';
        } else if (/(parkering|park|taxi|cab|trafik|bil|däck|verkstad|bensin|ladd)/.test(lower)) {
          category = validExpenseCats.find((c) => c.toLowerCase().includes('transport')) || 'Transport';
        } else if (/(frisör|salong|barber|apotek|klinik|tand|optik|gym|hälsa|massage)/.test(lower)) {
          category = validExpenseCats.find((c) => c.toLowerCase().includes('hälsa')) || 'Hälsa';
        } else if (/(bio|teater|konsert|museum|bowling|padel|golf|event|biljett|spel)/.test(lower)) {
          category = validExpenseCats.find((c) => c.toLowerCase().includes('nöje')) || 'Nöje';
        } else if (/(butik|shop|store|design|mode|kläder|skor|blommor|optik|glas|bok|leksak)/.test(lower)) {
          category = validExpenseCats.find((c) => c.toLowerCase().includes('shopping')) || 'Shopping';
        } else {
          category = validExpenseCats.find((c) => c.toLowerCase().includes('övrigt')) || validExpenseCats[validExpenseCats.length - 1] || 'Övrigt';
        }
      }

      return {
        key: it.key,
        cleanName: titleCased,
        category,
        domain: '',
      };
    };

    const ai = getGenAI();
    if (!ai) {
      return res.json({ results: batch.map(fallbackCleanItem) });
    }

    try {
      const prompt = `Du är en expert på svenska företag, butiker, restauranger, tjänster och banktransaktioner (SEB, Swedbank, Nordea, Handelsbanken).
För varje post i JSON-listan nedan:
1. Identifiera vilken svensk eller internationell aktör köpet/händelsen gäller och ange deras officiella webbdomän i "domain" (utan https:// eller www., t.ex. "holygreens.se", "ica.se", "espressohouse.com", "parkster.com", "varbergsenergi.se"). Om det är en privatperson eller saknar webbplats, ange "".
2. Ange ett rent visningsnamn i "cleanName".
3. Sätt exakt rätt kategori ("category") genom att välja ETT av följande giltiga kategorinamn:
   - Om type === "expense", välj bland: ${JSON.stringify(validExpenseCats)}
   - Om type === "income", välj bland: ${JSON.stringify(validIncomeCats)}
4. Behåll "key" exakt oförändrad.

Transaktioner att analysera:
${JSON.stringify(batch)}`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                cleanName: { type: Type.STRING },
                category: { type: Type.STRING },
                domain: { type: Type.STRING },
              },
              required: ["key", "cleanName", "category"],
            },
          },
        },
      });

      const responseText = result.text?.trim() || '[]';
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (!Array.isArray(parsed)) {
        return res.json({ results: batch.map(fallbackCleanItem) });
      }

      const byKey = new Map<string, { key: string; cleanName: string; category: string; domain?: string }>();
      for (const row of parsed) {
        if (row && typeof row.key === 'string' && typeof row.cleanName === 'string' && row.cleanName.trim()) {
          const cleanDom = typeof row.domain === 'string'
            ? row.domain.toLowerCase().trim().replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0]
            : '';
          byKey.set(row.key, {
            key: row.key,
            cleanName: row.cleanName.trim(),
            category: typeof row.category === 'string' && row.category.trim() ? row.category.trim() : 'Övrigt',
            domain: cleanDom && cleanDom.includes('.') ? cleanDom : '',
          });
        }
      }

      const finalResults = batch.map((it) => byKey.get(it.key) || fallbackCleanItem(it));
      return res.json({ results: finalResults });
    } catch (error) {
      console.error('[Gemini] clean-merchants error, using fallback:', error);
      return res.json({ results: batch.map(fallbackCleanItem) });
    }
  });

  // AI Merchant & Company Enricher: Resolves official domain (for logo) and category for any Swedish company
  app.post('/api/ai/enrich-merchant', aiRateLimit, async (req, res) => {
    const { name, type, categories } = req.body || {};
    const query = String(name || '').trim();
    if (!query || query.length < 2 || query.length > 200) {
      return res.json({ domain: '', category: '' });
    }

    const validCats: string[] =
      Array.isArray(categories) && categories.length > 0
        ? categories
        : type === 'income'
        ? ['Lön', 'Bidrag', 'Pension', 'CSN', 'Swish', 'Återbetalning', 'Övrigt']
        : ['Mat & dryck', 'Uteliv', 'Shopping', 'Boende', 'Transport', 'Nöje', 'Hälsa', 'Abonnemang', 'Försäkring', 'Räkningar', 'Swish', 'Övrigt'];

    const ai = getGenAI();
    if (!ai) {
      return res.json({ domain: '', category: '' });
    }

    try {
      const prompt = `Du är en expert på svenska företag, restauranger, butiker, kedjor, bostadsbolag, gym, appar och myndigheter i Sverige.
Användaren har skrivit eller importerat företaget/transaktionen: "${query}" (typ: ${type === 'income' ? 'inkomst' : 'utgift'}).

Returnera JSON med:
1. "domain": Företagets officiella webbdomän utan https:// eller www. (t.ex. "holygreens.se" för "Holy Greens", "joeandthejuice.com" för "Joe & The Juice", "misteryork.se" för "Mister York", "brodernas.nu" för "Brödernas", "varbergsenergi.se" för "Varbergs Energi"). Om det inte är ett känt företag eller saknar egen webbdomän, returnera "".
2. "category": Den mest träffsäkra kategorin ur denna lista: ${JSON.stringify(validCats)}.
   - Restauranger, salladsbarer (t.ex. Holy Greens), caféer, bagerier, snabbmat, barer -> välj "Uteliv" om det finns i listan, annars "Mat & dryck".
   - Livsmedelsbutiker (ICA, Coop, Willys, Hemköp, Lidl, Systembolaget) -> "Mat & dryck".
   - Kläder, inredning, elektronik, e-handel -> "Shopping".
   - Gym, apotek, vård, tandläkare, frisör, padel -> "Hälsa".
   - Hyra, BRF, el, vatten, bredband, bolån -> "Boende".
   - Kollektivtrafik, parkering, bensin, laddning, taxi -> "Transport".
   - Streaming, appar, mobilabonnemang -> "Abonnemang".
   - Försäkringsbolag -> "Försäkring".`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              domain: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ["domain", "category"],
          },
        },
      });

      const responseText = result.text?.trim() || '{}';
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const cleanDomain = typeof parsed.domain === 'string'
        ? parsed.domain.toLowerCase().trim().replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0]
        : '';

      return res.json({
        domain: cleanDomain && cleanDomain.includes('.') ? cleanDomain : '',
        category: typeof parsed.category === 'string' ? parsed.category.trim() : '',
      });
    } catch (error) {
      console.error('[Gemini] enrich-merchant error:', error);
      return res.json({ domain: '', category: '' });
    }
  });

  // AI Onboarding Analyzer: Verifierar och förfinar fasta utgifter (inkl. nystartade abonnemang med 1 dragning),
  // fasta inkomster samt exakta dragnings-/utbetalningsdagar (t.ex. A-kassa den 22:a vs Lön den 25:e).
  app.post('/api/ai/analyze-onboarding', aiRateLimit, async (req, res) => {
    const { expenseCandidates, incomeCandidates } = req.body || {};
    const expList = Array.isArray(expenseCandidates) ? expenseCandidates.slice(0, 45) : [];
    const incList = Array.isArray(incomeCandidates) ? incomeCandidates.slice(0, 20) : [];

    if (expList.length === 0 && incList.length === 0) {
      return res.json({ expenses: [], incomes: [], suggestedPayday: null });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.json({ fallback: true });
    }

    try {
      const prompt = `Du är en senior svensk privatekonomisk analytiker och expert på svenska banktransaktioner (Enable Banking, SEB, Swedbank, Handelsbanken, Nordea).
Användaren genomför onboardingen i budgetappen Dejz och har precis kopplat sin bank.
Din uppgift är att med kirurgisk precision analysera kandidatlistorna för:
1. FASTA UTGIFTER ("expenseCandidates")
2. FASTA INKOMSTER ("incomeCandidates")

RIKTLINJER FÖR FASTA UTGIFTER ("expenses"):
- Vi vill hitta ALLA verkliga fasta månadskostnader, räkningar och abonnemang – ÄVEN om användaren nyligen har startat ett abonnemang eller avtal så att det bara finns 1 dragning ("occurrences": 1) i historiken!
- Inkludera ("include": true):
  • Boende: Hyra, bostadsrättsavgift (BRF), fastighetsbolag, bolån/amortering, el/energi, bredband/fiber, hemförsäkring, hemlarm, samfällighet.
  • Abonnemang & Streaming: Mobilabonnemang (Telia, Tele2, Telenor, Tre, Hallon, Vimla, Fello, Comviq, Halebop), Spotify, Netflix, YouTube Premium, Disney+, Max/HBO, Viaplay, TV4 Play, Storytel, BookBeat, Nextory, PodMe, Apple/iCloud-prenumerationer, Google One, ChatGPT Plus, Claude, Microsoft 365, Adobe, tidningsprenumerationer.
  • Hälsa & Träning: Gymkort och medlemskap (SATS, Nordic Wellness, Fitness24Seven, Friskis & Svettis, STC, lokala gym).
  • Räkningar, Fack, A-kassa & Lån: CSN-återbetalning, fackförbund, A-kasseavgift (Unionen, Akademikernas, Kommunal, SMÅA, Alfa-kassan m.fl.), privatlån/delbetalning (Anyfin, Resurs Bank, Ikano, Marginalen, Avida, Brocc), barnomsorg/förskoleavgift, trängselskatt, billeasing/billån, månadskort i kollektivtrafik.
- Exkludera STRIKT ("include": false):
  • Alla vanliga vardagsköp och engångsköp! Exempelvis matbutiker, restauranger, kaféer, barer, bagerier, apotek, kläder, hemelektronik, engångsköp på Klarna/Qliro, enstaka parkeringsbiljetter (Parkster/EasyPark småbelopp), elsparkcyklar (Voi/Tier/Ryde), taxi/Uber, bensin/laddning, varuautomater och Swish till privatpersoner. Listan får ALDRIG fyllas med vardagsköp!
- Sätt ett rent, naturligt svenskt namn ("name", t.ex. "Spotify", "Hyra (Heimstaden)", "Unionens A-kassa", "SATS") och välj kategori ("category") bland: ["Boende", "Räkningar", "Abonnemang", "Streaming", "Försäkringar", "Hälsa", "Transport", "Nöjen"].

RIKTLINJER FÖR FASTA INKOMSTER ("incomes"):
- Inkludera ("include": true) verkliga återkommande inkomster: Lön, A-kassa / Arbetslöshetsersättning (t.ex. Unionens A-kassa, Akademikernas A-kassa, Alfa-kassan), CSN Studiestöd, Försäkringskassan (föräldrapenning, sjukpenning, bostadsbidrag, aktivitetsstöd), Barnbidrag, Pension.
- Exkludera ("include": false) egna överföringar mellan konton, Swish från privatpersoner och återköp/returer från butiker.
- Välj kategori ("category") bland: ["Lön", "Ersättning", "CSN", "Bidrag", "Pension"]. (A-kassa ska ha kategorin "Ersättning").

KRITISKT VIKTIGT FÖR DATUM / DRAGNINGSDAG ("day": 1–31):
- Titta noga på "datesWithWeekday" (där varje historiskt datum visas med veckodag: Mon, Tue, Wed, Thu, Fri, Sat, Sun) samt "ruleDay".
- TVINGA ALDRIG en inkomst eller utgift till den 25:e om transaktionerna visar en annan återkommande dag!
  • Exempel A-kassa: Om användaren har A-kassa och utbetalningarna i "datesWithWeekday" oftast har kommit den 22:a (t.ex. ["2026-03-22", "2026-02-22", "2026-01-25"] eller ["2026-02-22"]), MÅSTE "day" bli 22 (INTE 25!). Många svenska a-kassor betalar ut runt den 22:a–24:e eller på torsdagar. Utgå alltid från användarens faktiska vanligaste utbetalningsdag i historiken!
  • Helgjustering: Justera ENDAST en observerad dag med 1–2 dagar om betalningen skedde på en fredag (Fri) eller måndag (Mon) ENBART för att den ordinarie dagen inföll på en lördag (Sat) eller söndag (Sun).
    - Exempel 1: Lön eller CSN utbetald "2026-01-23 (Fri)" -> den 25:e var en söndag -> ordinarie dag är 25.
    - Exempel 2: Barnbidrag utbetalt på fredag den 18:e eller 19:e -> den 20:e var helg -> ordinarie dag är 20.
    - Exempel 3: Autogiro draget "2026-03-30 (Mon)" då den 28:e var lördag och andra månader drogs den 28:e -> ordinarie dag är 28.
    - Exempel 4: Kortabonnemang (t.ex. Spotify, Netflix) dras exakt samma datum varje månad oavsett helg (t.ex. den 14:e) -> behåll exakt den 14:e!
- Sätt "suggestedPayday" till "day" (1–31) för användarens huvudsakliga inkomst (t.ex. Lön eller A-kassa). Om användarens främsta inkomst är A-kassa den 22:a ska "suggestedPayday" vara 22.

Kandidater att analysera:
${JSON.stringify({ expenseCandidates: expList, incomeCandidates: incList })}`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              expenses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    include: { type: Type.BOOLEAN },
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    day: { type: Type.INTEGER },
                    paymentMethod: { type: Type.STRING },
                  },
                  required: ["key", "include", "name", "category", "amount", "day"],
                },
              },
              incomes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    include: { type: Type.BOOLEAN },
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    day: { type: Type.INTEGER },
                  },
                  required: ["key", "include", "name", "category", "amount", "day"],
                },
              },
              suggestedPayday: { type: Type.INTEGER },
            },
            required: ["expenses", "incomes"],
          },
        },
      });

      const responseText = result.text?.trim() || '{}';
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.json({
        expenses: Array.isArray(parsed?.expenses) ? parsed.expenses : [],
        incomes: Array.isArray(parsed?.incomes) ? parsed.incomes : [],
        suggestedPayday:
          typeof parsed?.suggestedPayday === 'number' &&
          parsed.suggestedPayday >= 1 &&
          parsed.suggestedPayday <= 31
            ? parsed.suggestedPayday
            : null,
      });
    } catch (error) {
      console.error('[Gemini] analyze-onboarding error, falling back to rule engine:', error);
      return res.json({ fallback: true });
    }
  });

  app.post('/api/parse-audio-expense', aiRateLimit, async (req, res) => {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing audio content' });
    }

    console.log(`[Gemini Audio] Processing audio input (mimeType: ${mimeType || 'audio/webm'})...`);

    const ai = getGenAI();
    if (!ai) {
      console.log('[Gemini Audio] Gemini client not configured');
      return res.status(500).json({ error: 'Gemini AI Client not initialized' });
    }

    try {
      const modelsToTry = ["gemini-3.5-transcribe", "gemini-3-flash-preview", "gemini-flash-latest"];
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Gemini Audio] Trying model ${modelName}...`);
          const result = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: audioBase64
                }
              },
              `Lyssna mycket noga på ljudklippet. En person pratar in ett eller FLERA köp eller utgifter/inkomster (på svenska eller engelska).
              Även om personen mumlar, pratar snabbt, otydligt eller i bakgrundsbuller: förstå alla köp och belopp som nämns.

              VIKTIGT: Om personen nämner FLERA köp i samma inspelning (t.ex. "300kr på coop och 700kr på XXL Sport" eller "fika 45 spänn och bensin 300kr"), ska du skapa ETT EGET objekt i listan 'items' för VARJE enskilt köp!

              Exempel:
              - "300 kronor på coop" -> 
                transcript: "300 kronor på Coop", 
                items: [{ amount: 300, name: "Coop", category: "Mat", type: "expense" }]

              - "300kr på coop och 700kr på XXL Sport" -> 
                transcript: "300kr på coop och 700kr på XXL Sport", 
                items: [
                  { amount: 300, name: "Coop", category: "Mat", type: "expense" },
                  { amount: 700, name: "XXL Sport", category: "Shopping", type: "expense" }
                ]

              - "fika 45kr och lön 20000kr" -> 
                transcript: "fika 45kr och lön 20000kr", 
                items: [
                  { amount: 45, name: "Fika", category: "Mat", type: "expense" },
                  { amount: 20000, name: "Lön", category: "Inkomst", type: "income" }
                ]

              Returnera ETT JSON-objekt med:
              - transcript: string (exakt vad personen sa)
              - items: en lista med ett eller flera objekt. Varje objekt har:
                - amount: number (beloppet i siffror)
                - name: string (butik, ställe eller beskrivning av köpet)
                - category: string (lämplig kategori som: Mat, Transport, Shopping, Nöje, Hälsa, Boende, Övrigt, Inkomst)
                - type: "expense" eller "income"
              `
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  transcript: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        amount: { type: Type.NUMBER },
                        name: { type: Type.STRING },
                        category: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["expense", "income"] }
                      },
                      required: ["amount", "name", "type"]
                    }
                  }
                },
                required: ["transcript", "items"]
              }
            }
          });

          const responseText = result.text?.trim() || '';
          console.log(`[Gemini Audio] Raw AI response: "${responseText}"`);
          
          const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
          const data = JSON.parse(cleanJson);

          // Clean up items
          if (Array.isArray(data.items)) {
            data.items = data.items.map((item: any) => ({
              amount: typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : (parseFloat(String(item.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0),
              name: item.name || 'Köpt',
              category: item.category || 'Övrigt',
              type: item.type === 'income' ? 'income' : 'expense'
            }));
          } else {
            data.items = [];
          }

          // Backwards compatibility if single item requested
          if (data.items.length > 0) {
            data.amount = data.items[0].amount;
            data.name = data.items[0].name;
            data.category = data.items[0].category;
            data.type = data.items[0].type;
          }

          return res.json(data);
        } catch (err: any) {
          console.warn(`[Gemini Audio] Model ${modelName} failed:`, err.message);
          lastError = err;
        }
      }

      throw lastError || new Error('Failed to parse audio with Gemini models');
    } catch (error: any) {
      console.error('[Gemini Audio] Error processing audio:', error);
      res.status(500).json({ error: error.message || 'Kunde inte tolka ljudet' });
    }
  });

  // AI Subscription Cancellation Guide Endpoint
  const cancelGuideCache = new Map<string, { ts: number; data: any }>();

  app.post('/api/ai/cancel-subscription', aiRateLimit, async (req, res) => {
    const { name, category, amount, paymentMethod } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 120) : '';
    if (!cleanName) {
      return res.status(400).json({ error: 'Namn på utgift saknas' });
    }

    const cacheKey = `${cleanName.toLowerCase()}|${(category || '').toLowerCase()}|${(paymentMethod || '').toLowerCase()}`;
    const cached = cancelGuideCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 1000 * 60 * 60 * 12) {
      return res.json(cached.data);
    }

    const buildFallbackGuide = (rawServiceName: string, cat?: string, method?: string) => {
      const lower = rawServiceName.toLowerCase();
      if (lower.includes('apple') || lower.includes('icloud') || lower.includes('itunes') || lower.includes('app store')) {
        return {
          serviceName: 'Apple-prenumeration',
          noticePeriod: 'Avslutas vid slutet av innevarande betalperiod',
          steps: [
            'Öppna Inställningar på din iPhone eller iPad och tryck på ditt namn högst upp.',
            'Tryck på Prenumerationer för att se alla aktiva dragningar kopplade till ditt Apple-ID.',
            'Välj prenumerationen i listan och tryck på Avbryt prenumeration längst ner.',
          ],
          cancelUrl: 'https://apps.apple.com/account/subscriptions',
          cancelUrlLabel: 'Öppna Apple Prenumerationer',
          tip: 'Om dragningen tillhör en familjemedlem via Familjedelning syns den under den personens Apple-ID.',
        };
      }
      if (lower.includes('spotify')) {
        return {
          serviceName: 'Spotify',
          noticePeriod: 'Ingen bindningstid – avslutas vid nästa brytdatum',
          steps: [
            'Logga in på din kontosida hos Spotify i webbläsaren.',
            'Skrolla ner till Din plan eller Hantera din prenumeration.',
            'Klicka på Avbryt prenumeration och bekräfta ditt val.',
          ],
          cancelUrl: 'https://www.spotify.com/se/account/overview/',
          cancelUrlLabel: 'Öppna Spotify Kontosida',
          tip: 'Om du tecknat Spotify via Apple eller din mobiloperatör avslutar du det där istället.',
        };
      }
      if (lower.includes('netflix')) {
        return {
          serviceName: 'Netflix',
          noticePeriod: 'Ingen bindningstid – avslutas vid slutet av faktureringsperioden',
          steps: [
            'Logga in på ditt konto på netflix.com.',
            'Klicka på din profilikon och välj Konto.',
            'Klicka på Avsluta medlemskap under Medlemskap och fakturering.',
          ],
          cancelUrl: 'https://www.netflix.com/youraccount',
          cancelUrlLabel: 'Öppna Netflix Konto',
          tip: 'Du kan fortsätta titta tills den betalda perioden löper ut.',
        };
      }
      if (lower.includes('fitness 24') || lower.includes('fitness24')) {
        return {
          serviceName: 'Fitness24Seven',
          noticePeriod: '2 månaders uppsägningstid',
          steps: [
            'Logga in på Mina Sidor hos Fitness24Seven eller i deras app med BankID.',
            'Gå till Medlemskap och välj Avsluta medlemskap.',
            'Bekräfta uppsägningen och kontrollera att du får en bekräftelse via e-post.',
          ],
          cancelUrl: 'https://se.fitness24seven.com/logga-in/',
          cancelUrlLabel: 'Logga in på Fitness24Seven',
          tip: 'Tänk på att inte ta bort autogirot på banken förrän uppsägningstiden är helt betald.',
        };
      }
      if (lower.includes('sats')) {
        return {
          serviceName: 'SATS',
          noticePeriod: '1 månads uppsägningstid utöver innevarande månad',
          steps: [
            'Logga in på Mina Sidor på sats.se eller i SATS-appen.',
            'Gå till Mitt medlemskap och välj Avsluta eller frys medlemskap.',
            'Följ stegen och spara bekräftelsen som skickas till din mejl.',
          ],
          cancelUrl: 'https://www.sats.se/mina-sidor',
          cancelUrlLabel: 'Öppna SATS Mina Sidor',
          tip: 'Om du har bindningstid kvar visas slutdatumet inne på Mina Sidor.',
        };
      }
      if (lower.includes('telenor')) {
        return {
          serviceName: 'Telenor',
          noticePeriod: '1 månads uppsägningstid (om ingen bindningstid kvarstår)',
          steps: [
            'Logga in på Mitt Telenor med BankID för att kontrollera eventuell bindningstid.',
            'Kontakta Telenors kundservice via chatt eller telefon (020-222 222) för att registrera uppsägningen.',
            'Om du ska behålla ditt telefonnummer hos en annan operatör sköter den nya operatören uppsägningen via nummerflytt.',
          ],
          cancelUrl: 'https://www.telenor.se/kundservice/uppsagning/',
          cancelUrlLabel: 'Öppna Telenor Uppsägning',
          tip: 'Vid byte av mobiloperatör bör du beställa nummerflytt hos nya operatören istället för att säga upp själv.',
        };
      }
      if (lower.includes('bredband2')) {
        return {
          serviceName: 'Bredband2',
          noticePeriod: '1 månads uppsägningstid',
          steps: [
            'Logga in med BankID på Mitt Bredband2.',
            'Gå till dina tjänster eller kontakta kundtjänst via formuläret/chatten inne i inloggat läge.',
            'Ange önskat slutdatum och invänta skriftlig bekräftelse.',
          ],
          cancelUrl: 'https://www.bredband2.com/kundservice/',
          cancelUrlLabel: 'Öppna Bredband2 Kundservice',
          tip: 'Om du flyttar kan abonnemanget ofta flyttas med till nya adressen kostnadsfritt.',
        };
      }

      const encodedQuery = encodeURIComponent(`${rawServiceName} säga upp abonnemang mina sidor`);
      return {
        serviceName: rawServiceName,
        noticePeriod: 'Kontrollera eventuell bindnings- eller uppsägningstid på Mina Sidor',
        steps: [
          `Logga in på Mina Sidor hos ${rawServiceName} (oftast med BankID eller e-post).`,
          'Gå till Abonnemang, Avtal eller Medlemskap och välj Avsluta / Säg upp.',
          method?.toLowerCase().includes('autogiro')
            ? 'Låt autogirot ligga kvar tills sista slutfakturan under uppsägningstiden har dragits.'
            : 'Kontrollera att du får en skriftlig bekräftelse på uppsägningen via mejl eller sms.',
        ],
        cancelUrl: `https://www.google.com/search?q=${encodedQuery}`,
        cancelUrlLabel: `Hitta uppsägningssida för ${rawServiceName}`,
        tip: 'Säg alltid upp avtalet direkt hos leverantören innan du tar bort ett eventuellt autogiro eller kort hos banken.',
      };
    };

    const ai = getGenAI();
    if (!ai) {
      const fallback = buildFallbackGuide(cleanName, category, paymentMethod);
      return res.json(fallback);
    }

    try {
      const prompt = `Du är en svensk privatekonomisk expert som hjälper en användare att säga upp ett abonnemang, medlemskap eller fast avtal i Sverige.
Utgiftens namn: "${cleanName}"
Kategori: "${category || 'Okänd'}"
Belopp: ${Number(amount) || 0} kr/mån
Betalsätt: "${paymentMethod || 'Okänt'}"

Ta fram en kort, träffsäker och konkret guide på svenska för hur man säger upp eller avslutar "${cleanName}".
Regler:
1. "serviceName": Tvättat, naturligt namn på tjänsten/företaget (t.ex. "Apple / App Store", "Fitness24Seven", "Telenor", "Bredband2", "Spotify", "Unionens A-kassa", "Folksam").
2. "noticePeriod": Kort uppgift om vanlig uppsägningstid hos denna aktör i Sverige (t.ex. "Ingen bindningstid – avslutas vid slutet av betalperioden", "2 månaders uppsägningstid", "1 månads uppsägningstid").
3. "steps": Exakt 3 korta, tydliga steg-för-steg-instruktioner på svenska för hur man går tillväga (t.ex. var på Mina Sidor, i appen eller via kundservice man avslutar).
4. "cancelUrl": En riktig, fungerande direktlänk (https://...) till företagets svenska sida för uppsägning, Mina Sidor eller kontohantering (t.ex. https://apps.apple.com/account/subscriptions för Apple, https://www.spotify.com/se/account/overview/ för Spotify, https://www.netflix.com/youraccount för Netflix, eller företagets officiella svenska webbplats/kundservice om du är helt säker på domänen, annars en Google-söklänk https://www.google.com/search?q=...). Hitta aldrig på osäkra undersidor som ger 404 – använd då hellre företagets officiella startsida/mina-sidor eller Google-söklänk.
5. "cancelUrlLabel": Kort knapptext på svenska (max 35 tecken), t.ex. "Öppna Mina Sidor hos Telenor" eller "Hantera prenumeration hos Apple".
6. "tip": Ett kort, smart ekonomiskt tips (1 mening) anpassat till tjänsten eller betalsättet (t.ex. om nummerflytt vid mobilabonnemang, att inte spärra autogiro förrän uppsägningstiden löpt ut, eller hur man ser vilken prenumeration en Apple-dragning gäller).`;

      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              serviceName: { type: Type.STRING },
              noticePeriod: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              cancelUrl: { type: Type.STRING },
              cancelUrlLabel: { type: Type.STRING },
              tip: { type: Type.STRING },
            },
            required: ["serviceName", "noticePeriod", "steps", "cancelUrl", "cancelUrlLabel", "tip"],
          },
        },
      });

      const responseText = result.text?.trim() || '{}';
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const fallback = buildFallbackGuide(cleanName, category, paymentMethod);
      const data = {
        serviceName:
          typeof parsed.serviceName === 'string' && parsed.serviceName.trim()
            ? parsed.serviceName.trim()
            : fallback.serviceName,
        noticePeriod:
          typeof parsed.noticePeriod === 'string' && parsed.noticePeriod.trim()
            ? parsed.noticePeriod.trim()
            : fallback.noticePeriod,
        steps:
          Array.isArray(parsed.steps) && parsed.steps.length > 0
            ? parsed.steps.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 4)
            : fallback.steps,
        cancelUrl:
          typeof parsed.cancelUrl === 'string' && /^https?:\/\//i.test(parsed.cancelUrl.trim())
            ? parsed.cancelUrl.trim()
            : fallback.cancelUrl,
        cancelUrlLabel:
          typeof parsed.cancelUrlLabel === 'string' && parsed.cancelUrlLabel.trim()
            ? parsed.cancelUrlLabel.trim()
            : fallback.cancelUrlLabel,
        tip:
          typeof parsed.tip === 'string' && parsed.tip.trim()
            ? parsed.tip.trim()
            : fallback.tip,
      };

      cancelGuideCache.set(cacheKey, { ts: Date.now(), data });
      return res.json(data);
    } catch (error) {
      console.error('[Gemini] cancel-subscription error, using fallback:', error);
      const fallback = buildFallbackGuide(cleanName, category, paymentMethod);
      return res.json(fallback);
    }
  });



  // User Feedback Endpoint (Persists to Supabase feedback table if available)
  app.post('/api/feedback', feedbackRateLimit, async (req, res) => {
    const { type, message, userEmail, userName } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Meddelande saknas' });
    }

    const cleanMessage = message.trim().slice(0, 2000);
    const cleanType = ['idea', 'bug', 'praise'].includes(type) ? type : 'idea';
    const cleanEmail = typeof userEmail === 'string' ? userEmail.slice(0, 200) : 'anonym';
    const cleanName = typeof userName === 'string' ? userName.slice(0, 120) : null;

    console.log(`[Feedback] (${cleanType}) from ${cleanEmail}: ${cleanMessage}`);

    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('feedback').insert({
          type: cleanType,
          message: cleanMessage,
          user_email: cleanEmail,
          user_name: cleanName,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[Feedback] Could not insert into Supabase feedback table:', err);
      }
    }

    return res.json({ success: true });
  });

  // API Health Check
  app.get("/api/ping", (req, res) => {
    res.json({ 
      status: "pong", 
      supabaseConfigured: !!getSupabaseAdmin(),
      env: process.env.NODE_ENV,
      time: new Date().toISOString()
    });
  });

  // Public Swedish Banks Catalog (Instant & Reliable)
  app.get('/api/bank/banks', (req, res) => {
    try {
      const filePath = path.join(__dirname, 'src', 'data', 'swedishBanks.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return res.setHeader('Content-Type', 'application/json').send(content);
      }
    } catch (err) {
      console.error('Error reading swedishBanks.json:', err);
    }
    return res.json([]);
  });

  // Ensure Authenticated Session (Never auto-creates hardcoded accounts)
  app.post('/api/auth/ensure-session', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin || !token) {
      return res.json({ success: false, session: null, user: null });
    }

    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) {
        return res.json({ success: false, session: null, user: null });
      }
      return res.json({
        success: true,
        session: null,
        user: data.user,
      });
    } catch {
      return res.json({ success: false, session: null, user: null });
    }
  });

  // Reset Account Data (Clear all data but keep auth user)
  app.post('/api/auth/reset-account', async (req, res) => {
    const { userId } = req.body || {};
    const supabaseAdmin = getSupabaseAdmin();

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // If Supabase Admin isn't configured, return success so local reset proceeds
    if (!supabaseAdmin) {
      return res.json({ success: true, localOnly: true });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    try {
      let targetUid = userId;
      if (token) {
        const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (!authErr && authData?.user) {
          if (
            userId &&
            userId !== 'preview-user' &&
            userId !== 'demo-user' &&
            authData.user.id !== userId
          ) {
            return res.status(403).json({ error: 'Du har endast behörighet att nollställa ditt eget konto' });
          }
          targetUid = authData.user.id;
        }
      }

      console.log(`Starting account reset for user: ${targetUid}`);

      // Wave 1: Clear nullable foreign-key references in parallel
      await Promise.allSettled([
        supabaseAdmin
          .from('transactions')
          .update({
            refund_of_transaction_id: null,
            bank_transaction_id: null,
            bank_account_id: null,
            linked_fixed_expense_id: null,
            account_id: null,
          })
          .eq('user_id', targetUid),
        supabaseAdmin
          .from('bank_transactions')
          .update({
            linked_transfer_bank_tx_id: null,
            replaced_by_bank_tx_id: null,
          })
          .eq('user_id', targetUid),
        supabaseAdmin
          .from('bank_auth_states')
          .update({ connection_id: null })
          .eq('user_id', targetUid),
      ]);

      // Wave 2: Delete all leaf tables in parallel
      const leafTables = [
        'transactions',
        'bank_transactions',
        'bank_auth_states',
        'bank_provider_sessions',
        'fixed_expenses',
        'income_sources',
        'savings_goals',
      ];
      await Promise.allSettled(
        leafTables.map((table) => supabaseAdmin.from(table).delete().eq('user_id', targetUid))
      );

      // Wave 3: Delete parent bank/account tables and reset profile in parallel
      await Promise.allSettled([
        supabaseAdmin.from('bank_accounts').delete().eq('user_id', targetUid),
        supabaseAdmin.from('accounts').delete().eq('user_id', targetUid),
        supabaseAdmin
          .from('profiles')
          .update({
            user_preferences: {},
            show_accounts_on_home: false,
            exclude_internal_transfers: true,
            categories: null,
            income_categories: null,
            my_swish_phone: null,
            swish_contacts: null,
          })
          .eq('id', targetUid),
      ]);

      await supabaseAdmin.from('bank_connections').delete().eq('user_id', targetUid);

      console.log(`Successfully reset account data for user: ${targetUid}`);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Reset account error:', error);
      return res.json({ success: true, warning: error.message });
    }
  });

  // Delete Account (Full permanent deletion of all user traces, storage files, public rows & auth.users)
  app.post('/api/auth/delete-account', async (req, res) => {
    const { userId, secondaryUserId, email } = req.body || {};
    const supabaseAdmin = getSupabaseAdmin();

    if (!userId && !secondaryUserId && !email) {
      return res.status(400).json({ error: 'Missing user identifier' });
    }

    if (!supabaseAdmin) {
      return res.json({ success: true, localOnly: true });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    try {
      const targetUserIds = new Set<string>();
      const targetEmails = new Set<string>();

      if (typeof userId === 'string' && uuidRegex.test(userId.trim())) {
        targetUserIds.add(userId.trim());
      }
      if (typeof secondaryUserId === 'string' && uuidRegex.test(secondaryUserId.trim())) {
        targetUserIds.add(secondaryUserId.trim());
      }
      if (typeof email === 'string' && email.trim().includes('@')) {
        targetEmails.add(email.trim().toLowerCase());
      }

      if (token && targetUserIds.size === 0) {
        const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (!authErr && authData?.user) {
          targetUserIds.add(authData.user.id);
          if (authData.user.email) {
            targetEmails.add(authData.user.email.trim().toLowerCase());
          }
        }
      }

      // Look up any profile rows matching targetEmails in parallel
      if (targetEmails.size > 0) {
        await Promise.allSettled(
          Array.from(targetEmails).map(async (em) => {
            const { data: profRows } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .ilike('email', em);
            for (const row of profRows || []) {
              if (row?.id && uuidRegex.test(String(row.id))) {
                targetUserIds.add(String(row.id));
              }
            }
          })
        );
      }

      // Only call listUsers if we still don't have a UUID for the email
      if (targetUserIds.size === 0 && targetEmails.size > 0) {
        try {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          for (const u of listData?.users || []) {
            if (u.email && targetEmails.has(u.email.trim().toLowerCase())) {
              targetUserIds.add(u.id);
            }
          }
        } catch {
          // ignore
        }
      }

      console.log(
        `Starting full permanent account deletion for userIds=[${Array.from(targetUserIds).join(', ')}], emails=[${Array.from(targetEmails).join(', ')}]`
      );

      const leafTables = [
        'transactions',
        'bank_transactions',
        'bank_auth_states',
        'bank_provider_sessions',
        'fixed_expenses',
        'income_sources',
        'savings_goals',
        'feedback',
      ];

      await Promise.allSettled(
        Array.from(targetUserIds).map(async (uid) => {
          // Wave 1: Break nullable self-references & cross-table references + clean storage in parallel
          await Promise.allSettled([
            supabaseAdmin
              .from('transactions')
              .update({
                refund_of_transaction_id: null,
                bank_transaction_id: null,
                bank_account_id: null,
                linked_fixed_expense_id: null,
                account_id: null,
              })
              .eq('user_id', uid),
            supabaseAdmin
              .from('bank_transactions')
              .update({
                linked_transfer_bank_tx_id: null,
                replaced_by_bank_tx_id: null,
              })
              .eq('user_id', uid),
            supabaseAdmin
              .from('bank_auth_states')
              .update({ connection_id: null })
              .eq('user_id', uid),
            (async () => {
              const [{ data: rootFiles }, { data: folderFiles }] = await Promise.all([
                supabaseAdmin.storage.from('avatars').list('', { limit: 100, search: uid }),
                supabaseAdmin.storage.from('avatars').list(uid, { limit: 100 }),
              ]);
              const pathsToRemove: string[] = [];
              if (Array.isArray(rootFiles)) {
                for (const f of rootFiles) {
                  if (f.name && f.name.includes(uid)) pathsToRemove.push(f.name);
                }
              }
              if (Array.isArray(folderFiles)) {
                for (const f of folderFiles) {
                  if (f.name) pathsToRemove.push(`${uid}/${f.name}`);
                }
              }
              if (pathsToRemove.length > 0) {
                await supabaseAdmin.storage.from('avatars').remove(pathsToRemove);
              }
            })(),
          ]);

          // Wave 2: Delete all leaf tables in parallel
          await Promise.allSettled(
            leafTables.map((table) => supabaseAdmin.from(table).delete().eq('user_id', uid))
          );

          // Wave 3: Delete parent account tables in parallel
          await Promise.allSettled([
            supabaseAdmin.from('bank_accounts').delete().eq('user_id', uid),
            supabaseAdmin.from('accounts').delete().eq('user_id', uid),
          ]);

          // Wave 4: Delete bank_connections and profiles in parallel
          await Promise.allSettled([
            supabaseAdmin.from('bank_connections').delete().eq('user_id', uid),
            supabaseAdmin.from('profiles').delete().eq('id', uid),
          ]);

          // Wave 5: Delete the auth user from auth.users
          const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
          if (deleteUserErr) {
            await supabaseAdmin.from('profiles').delete().eq('id', uid);
            await supabaseAdmin.auth.admin.deleteUser(uid, false);
          }
        })
      );

      // Clean up any rows matched by email in parallel
      if (targetEmails.size > 0) {
        await Promise.allSettled(
          Array.from(targetEmails).flatMap((em) => [
            supabaseAdmin.from('feedback').delete().ilike('user_email', em),
            supabaseAdmin.from('profiles').delete().ilike('email', em),
          ])
        );
      }

      console.log(
        `Successfully completed permanent deletion for userIds=[${Array.from(targetUserIds).join(', ')}]`
      );
      return res.json({
        success: true,
        deletedUserIds: Array.from(targetUserIds),
      });
    } catch (error: any) {
      console.error('Delete account error:', error);
      return res.status(500).json({ error: error.message || 'Delete account failed' });
    }
  });

  app.get('/manifest.json', (req, res) => {
    const theme = (req.query.theme as string) || 'accent';
    
    const themeColors: Record<string, string> = {
      accent: '#0B0B0F',
      neutral: '#0B0B0F',
      coral: '#F0485E',
      signature: '#F0485E',
      emerald: '#15804A',
      midnight: '#0B0B0F',
      sunset: '#F0485E',
      ocean: '#2B5CE6',
      gold: '#E5A93B'
    };

    const manifest = {
      "name": "Dejz – Full koll på pengarna från lön till lön",
      "short_name": "Dejz",
      "description": "Samla lön, fasta räkningar och sparande på ett ställe. Se vad du har kvar att röra dig med fram till nästa lön.",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#F2F0F0",
      "theme_color": themeColors[theme] || '#F2F0F0',
      "icons": [
        {
          "src": "/favicon.png",
          "sizes": "512x512",
          "type": "image/png"
        },
        {
          "src": `/api/icon.svg?theme=${theme}`,
          "sizes": "any",
          "type": "image/svg+xml",
          "purpose": "any maskable"
        }
      ]
    };
    res.json(manifest);
  });

  app.get('/api/icon.svg', (req, res) => {
    const theme = (req.query.theme as string) || 'accent';
    const themeColors: Record<string, string> = {
      accent: '#0B0B0F',
      neutral: '#0B0B0F',
      coral: '#F0485E',
      signature: '#F0485E',
      emerald: '#15804A',
      midnight: '#0B0B0F',
      sunset: '#F0485E',
      ocean: '#2B5CE6',
      gold: '#E5A93B'
    };
    const color = themeColors[theme] || '#0B0B0F';
    
    // Use official dejz brand favicon SVG dynamically colored
    let svg: string;
    try {
      const template = fs.readFileSync(path.resolve(process.cwd(), "public", "favicon.svg"), "utf8");
      svg = template.replace(/fill="(#1A2456|#5850EC|#0B0B0F)"/gi, `fill="${color}"`);
    } catch {
      svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="128" fill="${color}"/></svg>`;
    }
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  // Matpriskollen live data proxy endpoints (no API key required)
  const mpkNearbyCache = new Map<string, { ts: number; payload: any }>();

  app.get('/api/matpriskollen/stores', async (req, res) => {
    try {
      const lat = Number(req.query.lat) || 56.0465;
      const lon = Number(req.query.lon) || 12.6945;
      const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 25));
      const upstream = await fetch(
        `https://matpriskollen.se/api/v1/stores?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=${limit}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          },
        }
      );
      if (!upstream.ok) {
        return res.status(upstream.status).json([]);
      }
      const data = await upstream.json();
      res.json(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Matpriskollen] stores error:', e);
      res.json([]);
    }
  });

  app.get('/api/matpriskollen/nearby-offers', async (req, res) => {
    try {
      const lat = Number(req.query.lat) || 56.0465;
      const lon = Number(req.query.lon) || 12.6945;
      const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      const cached = mpkNearbyCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
        return res.json(cached.payload);
      }

      const storesRes = await fetch(
        `https://matpriskollen.se/api/v1/stores?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=25`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          },
        }
      );
      if (!storesRes.ok) {
        return res.json({ offers: [] });
      }
      const rawStores = await storesRes.json();
      const validStores = (Array.isArray(rawStores) ? rawStores : [])
        .filter((s: any) => s && s.key && Number(s.offerCount) > 0)
        .slice(0, 12);

      const perStoreOffers = await Promise.all(
        validStores.map(async (st: any) => {
          try {
            const r = await fetch(
              `https://matpriskollen.se/api/v1/stores/${encodeURIComponent(st.key)}/offers?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=120`,
              {
                headers: {
                  Accept: 'application/json',
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
                },
              }
            );
            if (!r.ok) return [];
            const d = await r.json();
            const arr = Array.isArray(d?.offers) ? d.offers : [];
            return arr.map((o: any) => ({
              ...o,
              storeKey: String(st.key),
              storeName: String(st.name || ''),
              chainName: String(st.chainName || ''),
              storeLogo: st.imageUrl || undefined,
              storeDist: st.dist ? String(st.dist) : undefined,
              storeLat: Number(st.lat),
              storeLon: Number(st.lon),
            }));
          } catch {
            return [];
          }
        })
      );

      const payload = {
        storeCount: validStores.length,
        offers: perStoreOffers.flat(),
      };
      mpkNearbyCache.set(cacheKey, { ts: Date.now(), payload });
      res.json(payload);
    } catch (e) {
      console.error('[Matpriskollen] nearby-offers error:', e);
      res.json({ storeCount: 0, offers: [] });
    }
  });

  const handleStoreOffersRequest = async (storeKey: string, req: express.Request, res: express.Response) => {
    try {
      if (!storeKey) {
        return res.status(400).json({ storeName: '', offers: [] });
      }
      const lat = Number(req.query.lat) || 56.0465;
      const lon = Number(req.query.lon) || 12.6945;
      const limit = Math.min(120, Math.max(1, Number(req.query.limit) || 100));
      const upstream = await fetch(
        `https://matpriskollen.se/api/v1/stores/${encodeURIComponent(storeKey)}/offers?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=${limit}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          },
        }
      );
      if (!upstream.ok) {
        return res.status(upstream.status).json({ storeName: '', offers: [] });
      }
      const data = await upstream.json();
      res.json(data || { storeName: '', offers: [] });
    } catch (e) {
      console.error('[Matpriskollen] offers error:', e);
      res.json({ storeName: '', offers: [] });
    }
  };

  app.get('/api/matpriskollen/offers', async (req, res) => {
    const storeKey = String(req.query.storeKey || req.query.key || '').trim();
    await handleStoreOffersRequest(storeKey, req, res);
  });

  app.get('/api/matpriskollen/stores/:storeKey/offers', async (req, res) => {
    await handleStoreOffersRequest(req.params.storeKey, req, res);
  });

  app.get('/api/matpriskollen/cities', async (req, res) => {
    try {
      const city = String(req.query.city || '').trim();
      if (city.length < 2) return res.json([]);
      const upstream = await fetch(
        `https://matpriskollen.se/api/geo/local?city=${encodeURIComponent(city)}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          },
        }
      );
      if (!upstream.ok) return res.json([]);
      const data = await upstream.json();
      res.json(Array.isArray(data) ? data : []);
    } catch {
      res.json([]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist'), {
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Global error handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('Unhandled API Error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    } else {
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
