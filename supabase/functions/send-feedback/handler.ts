// Logiken för send-feedback (se index.ts). Utan Deno- och URL-importer så att den kan testas med Vitest
// (tests/supabase/send-feedback.test.ts). Deno.env och createClient kommer in som parametrar.

import type { CreateClient, Env } from '../_shared/deps.ts';
import { buildFeedbackEmail } from './email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export function createHandler({ env, createClient }: { env: Env; createClient: CreateClient }) {
  return async (req: Request) => {
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
        env('SUPABASE_URL')!,
        env('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
      );

      // Vem skickade? (om inloggad – annars anonymt)
      let userId: string | null = null;
      let userEmail: string | null = null;
      let userName: string | null = null;
      let userCreatedAt: string | null = null;
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (token) {
        const { data } = await admin.auth.getUser(token).catch(() => ({ data: null }));
        if (data?.user) {
          userId = data.user.id;
          userEmail = data.user.email ?? null;
          const meta = data.user.user_metadata || {};
          userName = (meta.full_name || meta.name || meta.first_name || null) as string | null;
          userCreatedAt = data.user.created_at ?? null;
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

      const resendKey = env('RESEND_API_KEY');
      if (resendKey && !tooMany) {
        const { subject, html } = buildFeedbackEmail({ type, message, context, userEmail, userName, userCreatedAt });
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: env('WAITLIST_FROM') || 'Dejz <hej@dejz.se>',
            to: [env('FEEDBACK_TO') || 'hej@dejz.se'],
            reply_to: userEmail || undefined,
            subject,
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
  };
}
