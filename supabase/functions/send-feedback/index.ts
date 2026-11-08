// Tar emot feedback och kraschrapporter från appen.
// 1) Sparar i tabellen public.feedback  2) Mejlar en kopia till FEEDBACK_TO (standard hej@dejz.se)
//
// Hemligheter (Supabase -> Edge Functions -> Secrets):
//   RESEND_API_KEY  – samma nyckel som tackmejlet (om den saknas sparas feedbacken ändå)
//   FEEDBACK_TO     – valfri, vart mejlet ska (standard hej@dejz.se)
//   WAITLIST_FROM   – valfri avsändare, t.ex. "Dejz <hej@dejz.se>"

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

const TYPE_LABELS: Record<string, string> = {
  idea: '💡 Idé',
  bug: '🐛 Något är fel',
  praise: '💜 Beröm',
  crash: '🚨 Krasch',
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const type = ['idea', 'bug', 'praise', 'crash'].includes(body?.type) ? body.type : 'idea';
    const message = String(body?.message || '').trim().slice(0, 4000);
    if (!message) return json({ error: 'empty' }, 400);

    // Sammanhang (sida, enhet, felmeddelande) – begränsat i storlek
    const rawContext = body?.context && typeof body.context === 'object' ? body.context : {};
    const context: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawContext).slice(0, 15)) {
      context[String(k).slice(0, 40)] = String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 2000);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Vem skickade? (om inloggad – annars anonymt)
    let userId: string | null = null;
    let userEmail: string | null = null;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (token) {
      const { data } = await admin.auth.getUser(token).catch(() => ({ data: null as any }));
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    }

    const { error: insertError } = await admin.from('feedback').insert({
      user_id: userId,
      user_email: userEmail,
      type,
      message,
      context,
    });
    if (insertError) console.error('[send-feedback] insert', insertError);

    // Skydd mot spam: vid väldigt många rapporter på kort tid sparas de, men inga fler mejl skickas
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await admin
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);
    const tooMany = (recentCount ?? 0) > 30;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && !tooMany) {
      const label = TYPE_LABELS[type] || type;
      const lines = Object.entries(context as Record<string, unknown>)
        .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#8F8DA3;vertical-align:top">${escapeHtml(k)}</td><td style="padding:2px 0;color:#16141F;word-break:break-all">${escapeHtml(String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 1500))}</td></tr>`)
        .join('');
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.5;color:#16141F">
        <p style="margin:0 0 4px;font-size:13px;color:#5B3DF5;font-weight:700">${label}</p>
        <p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(message)}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#56546B">Från: ${escapeHtml(userEmail || 'ej inloggad')}</p>
        <table style="font-size:12px;border-collapse:collapse">${lines}</table>
      </div>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: Deno.env.get('WAITLIST_FROM') || 'Dejz <hej@dejz.se>',
          to: [Deno.env.get('FEEDBACK_TO') || 'hej@dejz.se'],
          reply_to: userEmail || undefined,
          subject: `${label}: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`,
          html,
        }),
      });
      if (!res.ok) console.error('[send-feedback] resend', res.status, await res.text());
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[send-feedback]', err);
    return json({ ok: false }, 500);
  }
});
