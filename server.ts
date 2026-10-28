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
        model: "gemini-3.8-flash",
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
      };
    };

    const ai = getGenAI();
    if (!ai) {
      return res.json({ results: batch.map(fallbackCleanItem) });
    }

    try {
      const prompt = `Du är en expert på svenska banktransaktioner och kortterminaler (SEB, Swedbank, Nordea, Handelsbanken).
Banker skickar ofta obegripliga eller förkortade transaktionsrader såsom:
- "ZETTLE*GBG KAF" -> cleanName: "Göteborgs Kafé", category: "Mat & dryck"
- "NYX*SVENSKA" -> cleanName: "Varuautomat (Nyx)", category: "Mat & dryck"
- "KLARNA*84920" -> cleanName: "Klarna", category: "Shopping"
- "SUMUP *SÖDER BAGERI" -> cleanName: "Söder Bageri", category: "Mat & dryck"
- "WL * PARKSTER AB" -> cleanName: "Parkster", category: "Transport"

Uppgift:
För varje post i JSON-listan nedan:
1. Tvätta "rawText" till ett snyggt, naturligt och läsbart svenskt butiks-/företagsnamn ("cleanName").
   - Ta bort betalväxelprefix som ZETTLE*, IZ*, SUMUP*, NYX*, PAYPAL*, STRIPE*, WL*, SP*, SQ*, NETS*, ADYEN* (om inte själva betalväxeln är mottagaren som i "KLARNA*84920" -> "Klarna" eller "NYX*SVENSKA" -> "Varuautomat (Nyx)").
   - Ta bort ordernummer, butiksnummer, referenskoder och landskoder (t.ex. "*84920", "1421 SE").
   - Veckla ut vanliga svenska förkortningar naturligt (t.ex. "GBG" -> "Göteborg", "STHLM" -> "Stockholm", "KAF"/"KAFE" -> "Kafé", "REST" -> "Restaurang", "KOND" -> "Konditori").
2. Sätt rätt kategori ("category") genom att använda BÅDE butiksnamnet, beloppet ("amount") och klockslaget ("time") för att avgöra köpets karaktär (t.ex. ~115-165 kr runt kl 11:30-13:30 på en okänd kortterminal är nästan alltid lunch -> "Mat & dryck"; småbelopp 15-45 kr på automat/terminal är ofta kaffe/snacks -> "Mat & dryck"). Välj EXAKT ETT av följande giltiga kategorinamn:
   - Om type === "expense", välj bland: ${JSON.stringify(validExpenseCats)}
   - Om type === "income", välj bland: ${JSON.stringify(validIncomeCats)}
3. Behåll "key" exakt oförändrad så att svaret kan matchas tillbaka.

Transaktioner att tvätta:
${JSON.stringify(batch)}`;

      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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

      const byKey = new Map<string, { key: string; cleanName: string; category: string }>();
      for (const row of parsed) {
        if (row && typeof row.key === 'string' && typeof row.cleanName === 'string' && row.cleanName.trim()) {
          byKey.set(row.key, {
            key: row.key,
            cleanName: row.cleanName.trim(),
            category: typeof row.category === 'string' && row.category.trim() ? row.category.trim() : 'Övrigt',
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
      const modelsToTry = ["gemini-3.5-transcribe", "gemini-3.8-flash", "gemini-flash-latest"];
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

  // Delete Account (Full deletion including auth user)
  app.post('/api/auth/delete-account', async (req, res) => {
    const { userId } = req.body;
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin || !userId) {
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ error: 'Saknar autentisering för att radera kontot' });
    }

    try {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !authData?.user || authData.user.id !== userId) {
        return res.status(403).json({ error: 'Du har endast behörighet att radera ditt eget konto' });
      }

      console.log(`Starting full account deletion for user: ${userId}`);

      // 1. Delete all user data from public tables
      // We do this first to avoid foreign key issues if any exist
      const tables = [
        'bank_transactions',
        'bank_accounts',
        'bank_provider_sessions',
        'bank_connections',
        'bank_auth_states',
        'transactions',
        'fixed_expenses',
        'income_sources',
        'savings_goals',
        'accounts',
        'feedback',
        'profiles',
      ];
      
      for (const table of tables) {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(table === 'profiles' ? 'id' : 'user_id', userId);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          // We continue anyway to try to delete as much as possible
        }
      }

      // 2. Delete the auth user
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError);
        return res.status(500).json({ error: 'Kunde inte radera användarkontot helt: ' + deleteAuthError.message });
      }

      console.log(`Successfully deleted account for user: ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete account error:', error);
      res.status(500).json({ error: error.message });
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
