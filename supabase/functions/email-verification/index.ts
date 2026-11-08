// Egen e-postverifiering (Supabase "Confirm email" är avstängt så att folk kommer in direkt).
//   { action: 'send' }            – inloggad användare: skickar ett verifieringsmejl via Resend
//   { action: 'confirm', token }  – länken i mejlet: markerar e-posten som verifierad
//
// Hemligheter: RESEND_API_KEY (samma som tackmejlet), valfritt WAITLIST_FROM.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function emailHtml(link: string) {
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#F5F4FA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F4FA"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;">
<tr><td style="padding:0 0 24px 4px;"><img src="https://dejz.se/email/dejz-logo.png" width="48" height="48" alt="Dejz" style="display:block;border:0;border-radius:12px;"></td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:24px;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:700;color:#16141F;">Verifiera din e-post</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:1.5;color:#56546B;">Tryck på knappen så vet vi att adressen är din. Då kan du alltid återställa lösenordet om du glömmer det.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#5B3DF5" style="background:#5B3DF5;border-radius:14px;">
<a href="${link}" style="display:block;padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff !important;text-decoration:none;border-radius:14px;"><span style="color:#ffffff !important;">Verifiera e-post</span></a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 4px 0;font-family:-apple-system,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8F8DA3;">Har du inte skapat ett konto på Dejz? Då kan du strunta i det här mejlet.</td></tr>
</table></td></tr></table></body></html>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));

    // --- Länken i mejlet ---
    if (body?.action === 'confirm') {
      const token = String(body?.token || '');
      if (token.length < 20) return json({ status: 'invalid' });
      const tokenHash = await sha256(token);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: row } = await admin
        .from('email_verification')
        .update({ verified_at: new Date().toISOString(), token_hash: null })
        .eq('token_hash', tokenHash)
        .gte('sent_at', since)
        .select('user_id')
        .maybeSingle();
      return json({ status: row ? 'verified' : 'invalid' });
    }

    // --- Skicka verifieringsmejl (kräver inloggning) ---
    if (body?.action === 'send') {
      const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: userData } = await admin.auth.getUser(jwt).catch(() => ({ data: null as any }));
      const user = userData?.user;
      if (!user?.email) return json({ status: 'not_logged_in' }, 401);

      const { data: existing } = await admin
        .from('email_verification')
        .select('verified_at, sent_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing?.verified_at) return json({ status: 'verified' });
      if (existing?.sent_at && Date.now() - new Date(existing.sent_at).getTime() < 60_000) {
        return json({ status: 'wait' });
      }

      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      await admin.from('email_verification').upsert({
        user_id: user.id,
        email: user.email,
        token_hash: await sha256(token),
        sent_at: new Date().toISOString(),
      });

      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) return json({ status: 'not_configured' }, 500);
      const link = `https://dejz.se/verifiera?token=${token}`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: Deno.env.get('WAITLIST_FROM') || 'Dejz <hej@dejz.se>',
          to: [user.email],
          reply_to: 'hej@dejz.se',
          subject: 'Verifiera din e-post för Dejz',
          html: emailHtml(link),
          text: `Verifiera din e-post för Dejz: ${link}`,
        }),
      });
      if (!res.ok) {
        console.error('[email-verification] resend', res.status, await res.text());
        return json({ status: 'send_failed' }, 502);
      }
      return json({ status: 'sent' });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (err) {
    console.error('[email-verification]', err);
    return json({ status: 'error' }, 500);
  }
});
