import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) return null;
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: geminiApiKey,
      });
    } catch {
      return null;
    }
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items, expenseCategories, incomeCategories } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const validExpenseCats: string[] =
    Array.isArray(expenseCategories) && expenseCategories.length > 0
      ? expenseCategories
      : [
          "Mat & dryck",
          "Uteliv",
          "Shopping",
          "Boende",
          "Transport",
          "Nöje",
          "Hälsa",
          "Abonnemang",
          "Försäkring",
          "Räkningar",
          "Swish",
          "Övrigt",
        ];

  const validIncomeCats: string[] =
    Array.isArray(incomeCategories) && incomeCategories.length > 0
      ? incomeCategories
      : ["Lön", "Bidrag", "Swish", "Övrigt"];

  const batch = items
    .slice(0, 40)
    .map((it: any) => ({
      key: String(it?.key || "").trim(),
      rawText: String(it?.rawText || "").trim(),
      amount: Number(it?.amount) || 0,
      time: String(it?.time || "").trim(),
      type: it?.type === "income" ? "income" : "expense",
    }))
    .filter((it: any) => it.key && it.rawText);

  if (batch.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const fallbackCleanItem = (it: {
    key: string;
    rawText: string;
    amount: number;
    time?: string;
    type: string;
  }) => {
    const raw = it.rawText.trim();
    const upper = raw.toUpperCase();

    if (/^KLARNA\s*[*#_-]?\s*\d*$/i.test(raw) || upper.startsWith("KLARNA*")) {
      const after = raw.replace(/^KLARNA\s*[*#_-]\s*/i, "").trim();
      const hasMerchantName = after && !/^\d+$/.test(after) && after.length >= 3;
      return {
        key: it.key,
        cleanName: hasMerchantName ? `Klarna · ${after}` : "Klarna",
        category:
          validExpenseCats.find((c) => c.toLowerCase().includes("shopping")) ||
          "Shopping",
        domain: "klarna.com",
      };
    }

    if (upper.startsWith("NYX*") || upper.includes("NYX*SVENSKA")) {
      return {
        key: it.key,
        cleanName: "Varuautomat (Nyx)",
        category:
          validExpenseCats.find((c) => c.toLowerCase().includes("mat")) ||
          "Mat & dryck",
        domain: "",
      };
    }

    let stripped = raw
      .replace(
        /^(ZETTLE|IZETTLE|IZ|SUMUP|PAYPAL|STRIPE|SQ|SP|WL|BAMBORA|NETS|ADYEN|TRUSTLY|QCK|BILLO)\s*[*#_-]+\s*/i,
        ""
      )
      .replace(/[*#_]+/g, " ")
      .replace(/\bGBG\b/gi, "Göteborg")
      .replace(/\bSTHLM\b/gi, "Stockholm")
      .replace(/\bKAF\b/gi, "Kafé")
      .replace(/\bKAFE\b/gi, "Kafé")
      .replace(/\bCOND\b/gi, "Konditori")
      .replace(/\bKOND\b/gi, "Konditori")
      .replace(/\bREST\b/gi, "Restaurang")
      .replace(/\s+\d{3,}\b.*$/, "")
      .replace(/\s+(SE|SWE|SWEDEN)$/i, "")
      .replace(/\s+(AB|AKTIEBOLAG|HB|KB)$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!stripped || /^\d+$/.test(stripped)) {
      stripped = raw.replace(/[*#_]+\d+/g, "").trim() || "Kortköp";
    }

    const titleCased = stripped
      .split(" ")
      .map((w) =>
        w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w
      )
      .join(" ");

    const lower = titleCased.toLowerCase();
    let category =
      it.type === "income" ? validIncomeCats[0] || "Övrigt" : "Övrigt";
    if (it.type !== "income") {
      if (
        /(kafé|kafe|cafe|coffee|bageri|konditori|restaurang|pizza|sushi|burger|krog|bar|pub|lunch|sallad)/.test(
          lower
        )
      ) {
        category =
          validExpenseCats.find((c) => c.toLowerCase().includes("uteliv")) ||
          validExpenseCats.find((c) => c.toLowerCase().includes("mat")) ||
          "Mat & dryck";
      } else if (/(mat|livs|kiosk|automat|hemköp|ica|coop|willys|lidl)/.test(lower)) {
        category =
          validExpenseCats.find((c) => c.toLowerCase().includes("mat")) ||
          "Mat & dryck";
      } else if (
        /(parkering|park|taxi|cab|trafik|bil|däck|verkstad|bensin|ladd)/.test(
          lower
        )
      ) {
        category =
          validExpenseCats.find((c) => c.toLowerCase().includes("transport")) ||
          "Transport";
      } else if (
        /(frisör|salong|barber|apotek|klinik|tand|optik|gym|hälsa|massage)/.test(
          lower
        )
      ) {
        category =
          validExpenseCats.find((c) => c.toLowerCase().includes("hälsa")) ||
          "Hälsa";
      } else if (
        /(bio|teater|konsert|museum|bowling|padel|golf|event|biljett|spel)/.test(
          lower
        )
      ) {
        category =
          validExpenseCats.find((c) => c.toLowerCase().includes("nöje")) ||
          "Nöje";
      } else if (
        /(butik|shop|store|design|mode|kläder|skor|blommor|optik|glas|bok|leksak)/.test(
          lower
        )
      ) {
        category =
          validExpenseCats.find((c) => c.toLowerCase().includes("shopping")) ||
          "Shopping";
      }
    }

    return {
      key: it.key,
      cleanName: titleCased,
      category,
      domain: "",
    };
  };

  const ai = getGenAI();
  if (!ai) {
    return res.status(200).json({ results: batch.map(fallbackCleanItem) });
  }

  try {
    const prompt = `Du är en expert på svenska företag, butiker, restauranger, tjänster och banktransaktioner (SEB, Swedbank, Nordea, Handelsbanken).
För varje post i JSON-listan nedan:
1. Identifiera vilken svensk eller internationell aktör köpet/händelsen gäller och ange deras officiella webbdomän i "domain" (utan https:// eller www., t.ex. "holygreens.se", "ica.se", "espressohouse.com", "parkster.com", "varbergsenergi.se"). Om det är en privatperson eller saknar webbplats, ange "".
2. Ange ett rent visningsnamn i "cleanName" (utan terminalprefix som ZETTLE*, SUMUP*, NYX*, KORTKÖP eller bolagsändelser som AB/SE).
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

    const responseText = result.text?.trim() || "[]";
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    if (!Array.isArray(parsed)) {
      return res.status(200).json({ results: batch.map(fallbackCleanItem) });
    }

    const byKey = new Map<
      string,
      { key: string; cleanName: string; category: string; domain?: string }
    >();
    for (const row of parsed) {
      if (
        row &&
        typeof row.key === "string" &&
        typeof row.cleanName === "string" &&
        row.cleanName.trim()
      ) {
        const cleanDom =
          typeof row.domain === "string"
            ? row.domain
                .toLowerCase()
                .trim()
                .replace(/^(?:https?:\/\/)?(?:www\.)?/, "")
                .split("/")[0]
            : "";
        byKey.set(row.key, {
          key: row.key,
          cleanName: row.cleanName.trim(),
          category:
            typeof row.category === "string" && row.category.trim()
              ? row.category.trim()
              : "Övrigt",
          domain: cleanDom && cleanDom.includes(".") ? cleanDom : "",
        });
      }
    }

    const finalResults = batch.map(
      (it: any) => byKey.get(it.key) || fallbackCleanItem(it)
    );
    return res.status(200).json({ results: finalResults });
  } catch {
    return res.status(200).json({ results: batch.map(fallbackCleanItem) });
  }
}
