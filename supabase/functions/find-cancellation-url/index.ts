import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  name: string;
  category?: string;
  language?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, category, language = 'sv' }: RequestPayload = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Företags- eller tjänstenamn krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing GOOGLE_AI_API_KEY / GEMINI_API_KEY secret in Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isEn = language === 'en';

    const systemInstruction = `Du är en expert på svenska konsumenträttigheter, prenumerationer, abonnemang och avtal.
Din uppgift är att hitta den EXAKTA direkta länken och instruktionerna för hur man säger upp eller avslutar ett specifikt abonnemang/avtal/medlemskap.

Tjänst att hitta uppsägning för: "${name}" (Kategori: "${category || 'Abonnemang'}").

Regler:
1. "serviceName": Korrekt, officiellt namn på tjänsten/företaget (t.ex. "Spotify", "Netflix", "SATS", "Tele2", "Trygg-Hansa").
2. "cancelUrl": Den bästa och mest direkta officiella URL:en för att säga upp eller hantera abonnemanget (t.ex. "https://www.spotify.com/account/change-plan/", "https://www.netflix.com/youraccount", "https://sats.se/mina-sidor"). Om ingen direkt sida finns, ge inloggningssidan eller uppsägningsformuläret. URL MÅSTE börja med https:// och vara en legitim officiell domän.
3. "directActionType": En av "link" (webblänk), "phone" (kräver telefonsamtal för uppsägning), "email" (kräver skriftlig uppsägning), eller "app" (hanteras i app).
4. "phoneNumber": Kundtjänstnummer om relevant (eller null).
5. "supportEmail": Kundservice e-post för uppsägning om relevant (eller null).
6. "supportUrl": Länk till hjälpartikel eller supportportal om uppsägning (eller null).
7. "steps": En array med 3-5 korta, konkreta instruktionssteg på ${isEn ? 'engelska' : 'svenska'}.
8. "noticePeriod": Kort info om uppsägningstid eller bindningstid på ${isEn ? 'engelska' : 'svenska'} (t.ex. "1 månads uppsägningstid", "Avslutas vid nästa faktureringsperiod", "Ingen bindningstid").
9. "tips": Eventuella viktiga tips (t.ex. "Om du startat prenumerationen via Apple App Store måste du säga upp via dina Apple ID-inställningar").

Returnera ENDAST giltig JSON i detta format:
{
  "serviceName": string,
  "cancelUrl": string,
  "directActionType": "link" | "phone" | "email" | "app",
  "phoneNumber": string | null,
  "supportEmail": string | null,
  "supportUrl": string | null,
  "steps": string[],
  "noticePeriod": string,
  "tips": string | null
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Hitta uppsägningslänk och instruktioner för att avsluta: ${name}` }] }],
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
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Kunde inte hitta uppsägningsinformation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
