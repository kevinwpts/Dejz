// Skickar ett tackmejl till den som just skrivit upp sig på väntelistan.
//
// Säkerhet: funktionen skickar bara till adresser som redan finns i väntelistan,
// som skrevs upp de senaste 30 minuterna och som inte redan fått mejlet.
// Varje adress kan alltså få högst ett mejl, och ingen kan använda funktionen
// för att skicka mejl till vem som helst.
//
// Hemligheter som behövs (Supabase -> Edge Functions -> Secrets):
//   RESEND_API_KEY   – API-nyckel från resend.com
//   WAITLIST_FROM    – valfri, t.ex. "Dejz <hej@dejz.se>" (domänen måste vara verifierad i Resend)
// SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY finns automatiskt.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SITE_URL = 'https://dejz.se';

function buildEmail() {
  const shareUrl = `${SITE_URL}/?ref=mejl`;

  const subject = 'Du är med på Dejz väntelista 💜';

  const text = `Hej!

Tack för att du skrev upp dig på Dejz väntelista.

Äntligen vet du vad du har kvar.

Dejz visar hur mycket du har kvar att spendera fram till nästa lön – räkningar och sparande dras av automatiskt, så att du ser vad som faktiskt är ditt.

Vi hör av oss så fort du kan börja använda appen. Känner du någon som också lever från lön till lön? Tipsa gärna: ${shareUrl}

Vill du inte stå kvar på listan? Svara bara på det här mejlet så tar vi bort dig.

/ Dejz
`;

  const html = `<!doctype html>
<html lang="sv">
<body style="margin:0;padding:0;background:#F5F4FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16141F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4FA;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding:0 4px 20px;"><span style="font-size:22px;font-weight:800;letter-spacing:-0.04em;color:#5B3DF5;">dejz</span><span style="font-size:13px;color:#8F8DA3;padding-left:10px;">Äntligen vet du vad du har kvar.</span></td></tr>
        <tr><td style="background:linear-gradient(150deg,#7356FF 0%,#5B3DF5 48%,#3F22C9 100%);background-color:#5B3DF5;border-radius:24px;padding:28px 24px;color:#FFFFFF;">
          <div style="font-size:14px;opacity:0.8;">Väntelistan</div>
          <div style="font-size:26px;font-weight:700;letter-spacing:-0.02em;margin-top:6px;line-height:1.2;">Du är med! 🎉</div>
          <div style="font-size:15px;margin-top:10px;opacity:0.92;">Tack för att du skrev upp dig.</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:24px;padding:24px;margin-top:12px;font-size:15px;line-height:1.6;color:#56546B;">
          <p style="margin:0 0 12px;color:#16141F;">Hej!</p>
          <p style="margin:0 0 12px;">Dejz visar hur mycket du kan spendera fram till nästa lön – inte till månadsskiftet. Räkningar och sparande dras av automatiskt, så att du ser vad som faktiskt är ditt.</p>
          <p style="margin:0 0 20px;">Vi hör av oss så fort du kan börja använda appen.</p>
          <a href="${shareUrl}" style="display:inline-block;background:#5B3DF5;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:14px;">Tipsa en vän om Dejz</a>
        </td></tr>
        <tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.5;color:#8F8DA3;">
          Du får det här mejlet för att du skrev upp dig på dejz.se. Vill du inte stå kvar på listan? Svara bara på mejlet så tar vi bort dig.
          <a href="${SITE_URL}/integritet" style="color:#8F8DA3;">Integritetspolicy</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const { email } = await req.json().catch(() => ({ email: null }));
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || cleanEmail.length > 254) return json({ sent: false });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('[waitlist-welcome] RESEND_API_KEY saknas – inget mejl skickat');
      return json({ sent: false, reason: 'not_configured' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Lås raden: sätt welcome_sent_at bara om den är tom, så att två anrop samtidigt inte ger två mejl
    const { data: claimed, error: claimError } = await admin
      .from('waitlist')
      .update({ welcome_sent_at: new Date().toISOString() })
      .eq('email', cleanEmail)
      .is('welcome_sent_at', null)
      .gte('created_at', since)
      .select('email')
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) return json({ sent: false });

    const { subject, text, html } = buildEmail();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('WAITLIST_FROM') || 'Dejz <hej@dejz.se>',
        to: [cleanEmail],
        reply_to: 'hej@dejz.se',
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[waitlist-welcome] Resend svarade', res.status, detail);
      // Släpp låset så att ett nytt försök kan göras
      await admin.from('waitlist').update({ welcome_sent_at: null }).eq('email', cleanEmail);
      return json({ sent: false, reason: 'send_failed' }, 502);
    }

    return json({ sent: true });
  } catch (err) {
    console.error('[waitlist-welcome]', err);
    return json({ sent: false, reason: 'error' }, 500);
  }
});
