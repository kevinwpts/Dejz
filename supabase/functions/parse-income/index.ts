import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  prompt: string;
  incomeCategories?: string[];
  defaultPayday?: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, incomeCategories = ['Lön', 'CSN', 'Barnbidrag', 'Pension', 'Sidoinkomst', 'Övrigt'], defaultPayday = 25 }: RequestPayload = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');

    if (!apiKey) {
      console.warn('[parse-income] Missing GOOGLE_AI_API_KEY, using rule-based parsing');
      const fallbackResult = parseLocally(prompt, incomeCategories, defaultPayday);
      return new Response(
        JSON.stringify(fallbackResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemInstruction = `Du är en svensk privatekonomisk AI-assistent i appen Dejz.
Tolka användarens fritext om en inkomstkälla och extrahera strukturerad data i ren JSON.
Tillgängliga inkomstkategorier: ${incomeCategories.join(', ')}.
Standard lönedag: ${defaultPayday}.

Regler:
1. "amount": Det numeriska beloppet i kronor (heltal eller decimaltal). T.ex. 25000 för "25000 från ur & penn", "25k" eller "25 000 kr".
2. "name": Det snyggt kapitaliserade namnet på arbetsgivaren/företaget/organisationen/källan. T.ex. "Ur & Penn", "Volvo", "CSN", "Försäkringskassan", "IKEA", "Spotify".
3. "category": Den bäst matchande kategorin bland de tillgängliga kategorierna. Om det är ett företag eller arbetsgivare, välj "Lön". Om det är studiemedel, välj "CSN". Om barnbidrag, välj "Barnbidrag".
4. "deductionDay": Dagen i månaden då inkomsten betalas ut (1-31). Om användaren skrev t.ex. "den 27:e" sätt 27, annars använd standardvärdet ${defaultPayday}.
5. "icon": Lämpligt namn på Lucide-ikon, t.ex. "Briefcase" (för lön/jobb), "GraduationCap" (för CSN), "Heart" (för barnbidrag), "Wallet" (allmänt), "Building2" (företag), "PiggyBank" (sparande/ränta).
6. "note": Eventuell extra anteckning, annars tom sträng.

Returnera ENDAST giltig JSON utan markdown-kodblock:
{
  "amount": number,
  "name": string,
  "category": string,
  "deductionDay": number,
  "icon": string,
  "note": string
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[parse-income] Gemini API error (${response.status}):`, errText);
      const fallbackResult = parseLocally(prompt, incomeCategories, defaultPayday);
      return new Response(
        JSON.stringify(fallbackResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      const fallbackResult = parseLocally(prompt, incomeCategories, defaultPayday);
      return new Response(
        JSON.stringify(fallbackResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean any markdown wrapper if present
    const cleanedText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return new Response(
      JSON.stringify(parsedData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[parse-income] Internal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to parse income' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Robust Swedish rule-based fallback parser
function parseLocally(prompt: string, categories: string[], defaultPayday: number) {
  let cleaned = prompt.trim();

  // Extract day if mentioned (e.g. "den 25:e", "den 27", "25e")
  let deductionDay = defaultPayday;
  const dayMatch = cleaned.match(/(?:den\s+)?(\d{1,2})(?::?e)?(?:\s+varje\s+månad)?/i);
  if (dayMatch) {
    const d = parseInt(dayMatch[1], 10);
    if (d >= 1 && d <= 31 && d !== 2024 && d !== 2025 && d !== 2026) {
      deductionDay = d;
    }
  }

  // Extract amount
  let amount = 0;
  // Match e.g. 25000, 25 000, 25.000, 25k, 25 tkr
  const kMatch = cleaned.match(/(\d+[\d\s.,]*)\s*(?:k|tkr)\b/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(/\s+/g, '').replace(',', '.'));
    amount = Math.round(num * 1000);
    cleaned = cleaned.replace(kMatch[0], '');
  } else {
    const numMatch = cleaned.match(/(\d[\d\s.,]*)/);
    if (numMatch) {
      const raw = numMatch[1].replace(/\s+/g, '').replace(',', '.');
      amount = Math.round(parseFloat(raw)) || 0;
      cleaned = cleaned.replace(numMatch[0], '');
    }
  }

  // Remove common Swedish prepositions and words
  let name = cleaned
    .replace(/\b(?:kr|sek|kronor|från|fran|hos|på|pa|inkomst|lön|lon|månadsvis|månaden|varje\s+månad|den\s+\d{1,2}:?e?)\b/gi, ' ')
    .replace(/[.,\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If name is empty, fallback to intelligent default
  let category = 'Lön';
  let icon = 'Briefcase';

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('csn') || lowerPrompt.includes('studie')) {
    name = name || 'CSN';
    category = 'CSN';
    icon = 'GraduationCap';
  } else if (lowerPrompt.includes('barnbidrag') || lowerPrompt.includes('föräldrapenning')) {
    name = name || 'Försäkringskassan';
    category = 'Barnbidrag';
    icon = 'Heart';
  } else if (lowerPrompt.includes('pension')) {
    name = name || 'Pensionsmyndigheten';
    category = 'Pension';
    icon = 'Wallet';
  } else if (lowerPrompt.includes('sido') || lowerPrompt.includes('extra') || lowerPrompt.includes('gig')) {
    name = name || 'Sidoinkomst';
    category = 'Sidoinkomst';
    icon = 'Wallet';
  } else {
    name = name || 'Lön';
    category = 'Lön';
    icon = 'Briefcase';
  }

  // Capitalize name nicely (e.g. "ur & penn" -> "Ur & Penn")
  name = name.split(' ')
    .map(w => {
      if (w.toLowerCase() === '&' || w.toLowerCase() === 'och') return '&';
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');

  // Match category against available categories
  const matchedCat = categories.find(c => c.toLowerCase() === category.toLowerCase()) || categories[0] || 'Lön';

  return {
    amount,
    name,
    category: matchedCat,
    deductionDay,
    icon,
    note: ''
  };
}
