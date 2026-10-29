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

      // Clear nullable foreign-key references first so child/parent deletes never conflict
      try {
        await supabaseAdmin
          .from('transactions')
          .update({
            refund_of_transaction_id: null,
            bank_transaction_id: null,
            bank_account_id: null,
            linked_fixed_expense_id: null,
            account_id: null,
          })
          .eq('user_id', targetUid);
      } catch {
        // ignore if columns differ
      }

      try {
        await supabaseAdmin
          .from('bank_transactions')
          .update({
            linked_transfer_bank_tx_id: null,
            replaced_by_bank_tx_id: null,
          })
          .eq('user_id', targetUid);
      } catch {
        // ignore
      }

      try {
        await supabaseAdmin
          .from('bank_auth_states')
          .update({ connection_id: null })
          .eq('user_id', targetUid);
      } catch {
        // ignore
      }

      // Delete in strict bottom-up dependency order
      const tables = [
        'transactions',
        'bank_transactions',
        'bank_auth_states',
        'bank_provider_sessions',
        'bank_accounts',
        'bank_connections',
        'fixed_expenses',
        'income_sources',
        'savings_goals',
        'accounts',
      ];

      for (const table of tables) {
        try {
          const { error: delErr } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('user_id', targetUid);
          if (delErr) {
            console.warn(`[Reset] Warning deleting from ${table}:`, delErr.message);
          }
        } catch (tableErr) {
          console.warn(`[Reset] Error deleting from ${table}:`, tableErr);
        }
      }

      // Reset user_preferences in profile instead of deleting profile row
      try {
        await supabaseAdmin
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
          .eq('id', targetUid);
      } catch (profErr) {
        console.warn('[Reset] Error updating profile preferences:', profErr);
      }

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

      if (token) {
        const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (!authErr && authData?.user) {
          targetUserIds.add(authData.user.id);
          if (authData.user.email) {
            targetEmails.add(authData.user.email.trim().toLowerCase());
          }
        }
      }

      // Look up any email associated with the targetUserIds from auth.users and profiles
      for (const uid of Array.from(targetUserIds)) {
        try {
          const { data: uData } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (uData?.user?.email) {
            targetEmails.add(uData.user.email.trim().toLowerCase());
          }
        } catch {
          // ignore
        }
        try {
          const { data: profData } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', uid)
            .maybeSingle();
          if (profData?.email) {
            targetEmails.add(String(profData.email).trim().toLowerCase());
          }
        } catch {
          // ignore
        }
      }

      // Also find any auth.users or profiles rows matching targetEmails so no duplicate/recreated user is left behind
      if (targetEmails.size > 0) {
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

        for (const em of Array.from(targetEmails)) {
          try {
            const { data: profRows } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .ilike('email', em);
            for (const row of profRows || []) {
              if (row?.id && uuidRegex.test(String(row.id))) {
                targetUserIds.add(String(row.id));
              }
            }
          } catch {
            // ignore
          }
        }
      }

      console.log(
        `Starting full permanent account deletion for userIds=[${Array.from(targetUserIds).join(', ')}], emails=[${Array.from(targetEmails).join(', ')}]`
      );

      const tables = [
        'transactions',
        'bank_transactions',
        'bank_auth_states',
        'bank_provider_sessions',
        'bank_accounts',
        'bank_connections',
        'fixed_expenses',
        'income_sources',
        'savings_goals',
        'accounts',
        'feedback',
        'profiles',
      ];

      for (const uid of Array.from(targetUserIds)) {
        // 1a. Break nullable self-references & cross-table references first
        try {
          await supabaseAdmin
            .from('transactions')
            .update({
              refund_of_transaction_id: null,
              bank_transaction_id: null,
              bank_account_id: null,
              linked_fixed_expense_id: null,
              account_id: null,
            })
            .eq('user_id', uid);
        } catch {
          // ignore
        }

        try {
          await supabaseAdmin
            .from('bank_transactions')
            .update({
              linked_transfer_bank_tx_id: null,
              replaced_by_bank_tx_id: null,
            })
            .eq('user_id', uid);
        } catch {
          // ignore
        }

        try {
          await supabaseAdmin
            .from('bank_auth_states')
            .update({ connection_id: null })
            .eq('user_id', uid);
        } catch {
          // ignore
        }

        // 1b. Delete from all public tables in bottom-up dependency order
        for (const table of tables) {
          try {
            const col = table === 'profiles' ? 'id' : 'user_id';
            const { error: delErr } = await supabaseAdmin
              .from(table)
              .delete()
              .eq(col, uid);
            if (delErr && table !== 'feedback') {
              console.warn(`[Delete] Warning deleting from ${table} for ${uid}:`, delErr.message);
            }
          } catch (tableErr) {
            console.warn(`[Delete] Error deleting from ${table} for ${uid}:`, tableErr);
          }
        }

        // 1c. Delete any uploaded avatar files in Supabase Storage
        try {
          const { data: rootFiles } = await supabaseAdmin.storage.from('avatars').list('', {
            limit: 100,
            search: uid,
          });
          if (Array.isArray(rootFiles) && rootFiles.length > 0) {
            const pathsToRemove = rootFiles
              .filter((f) => f.name && f.name.includes(uid))
              .map((f) => f.name);
            if (pathsToRemove.length > 0) {
              await supabaseAdmin.storage.from('avatars').remove(pathsToRemove);
            }
          }
          const { data: folderFiles } = await supabaseAdmin.storage.from('avatars').list(uid, {
            limit: 100,
          });
          if (Array.isArray(folderFiles) && folderFiles.length > 0) {
            const folderPaths = folderFiles.map((f) => `${uid}/${f.name}`);
            await supabaseAdmin.storage.from('avatars').remove(folderPaths);
          }
        } catch {
          // ignore storage cleanup errors
        }

        // 1d. Delete the auth user from auth.users
        try {
          const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
          if (deleteUserErr) {
            console.warn(`[Delete] First deleteUser attempt for ${uid} warning:`, deleteUserErr.message);
            // Ensure profile is gone and retry hard delete
            await supabaseAdmin.from('profiles').delete().eq('id', uid);
            await supabaseAdmin.auth.admin.deleteUser(uid, false);
          }
        } catch (deleteAuthError: any) {
          console.warn('Could not delete auth user from auth.users:', deleteAuthError?.message);
        }
      }

      // 2. Also clean up any rows matched by email (e.g. feedback or orphan profiles)
      for (const em of Array.from(targetEmails)) {
        try {
          await supabaseAdmin.from('feedback').delete().ilike('user_email', em);
        } catch {
          // ignore
        }
        try {
          await supabaseAdmin.from('profiles').delete().ilike('email', em);
        } catch {
          // ignore
        }
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

  app.get('/api/matpriskollen/stores/:storeKey/offers', async (req, res) => {
    try {
      const { storeKey } = req.params;
      const lat = Number(req.query.lat) || 56.0465;
      const lon = Number(req.query.lon) || 12.6945;
      const limit = Math.min(120, Math.max(1, Number(req.query.limit) || 80));
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
