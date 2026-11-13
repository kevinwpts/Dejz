// Logiken för parse-expense (se index.ts). Utan Deno- och URL-importer så att den kan testas med Vitest
// (tests/supabase/parse-expense.test.ts). Deno.env kommer in som parametrar.

import { redactSecrets, type Env } from '../_shared/deps.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  prompt: string;
  categories?: string[];
  history?: Array<{ merchant: string; category: string }>;
}

export function createHandler({ env }: { env: Env }) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const { 
        prompt, 
        categories = ['Mat & Dryck', 'Shopping', 'Boende', 'Transport', 'Nöje & Fritid', 'Hälsa', 'Abonnemang', 'Övrigt'],
        history = []
      }: RequestPayload = await req.json();

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return new Response(
          JSON.stringify({ error: 'Prompt is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiKey = env('GOOGLE_AI_API_KEY') || env('GEMINI_API_KEY');

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Missing GOOGLE_AI_API_KEY secret in Supabase' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const historyContext = history.length > 0
        ? `\nAnvändarens tidigare kategoriseringar:\n` +
          history.slice(0, 15).map(h => `- "${h.merchant}" -> ${h.category}`).join('\n')
        : '';

      const systemInstruction = `Du är en svensk privatekonomisk AI-assistent i appen Dejz.
  Tolka användarens fritext om en snabbutgift (t.ex. "300kr coop", "coop 300 kr", "kaffe 45", "lunch 125 på max", "sl 42", "bensin 850 circle k") och extrahera strukturerad data i ren JSON.

  Tillgängliga kategorier: ${categories.join(', ')}.${historyContext}

  Regler:
  1. "amount": Det numeriska beloppet i kronor (heltal eller decimal). T.ex. 300 från "300kr coop" eller 45.5 från "45.50 kaffe".
  2. "merchant": Snyggt formaterat och kapitaliserat namn på butiken/företaget/stället (t.ex. "Coop", "ICA", "Pressbyrån", "Max Burgers", "SL", "Spotify", "Circle K", "Espresso House"). Om bara en generell sak nämns (t.ex. "Kaffe", "Lunch", "Bio") sätt det som merchant.
  3. "category": Den bäst matchande kategorin från listan av tillgängliga kategorier. (T.ex. ICA/Coop/Mat -> "Mat & Dryck", SL/Bensin/Taxi -> "Transport", H&M/Zara -> "Shopping").
  4. "icon": Lämpligt namn på Lucide-ikon (t.ex. "ShoppingCart", "Utensils", "Coffee", "Car", "Fuel", "Bus", "Train", "Tv", "Smartphone", "HeartPulse", "Shirt", "Package").

  Returnera ENDAST giltig JSON i detta format:
  {
    "amount": number,
    "merchant": string,
    "category": string,
    "icon": string
  }`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${err}`);
      }

      const result = await response.json();
      const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('Ingen respons från Google AI');
      }

      const cleanedText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsedData = JSON.parse(cleanedText);

      return new Response(
        JSON.stringify(parsedData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: unknown) {
      return new Response(
        JSON.stringify({ error: redactSecrets(error instanceof Error ? error.message : '', ['GOOGLE_AI_API_KEY', 'GEMINI_API_KEY'].map((k) => env(k))) || 'Kunde inte tolka utgiften' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };
}
