// Bygger feedbackmejlet till Kevin: lättläst, med det viktigaste först.
// Ren funktion utan Deno-importer så att den går att testa lokalt.

export type FeedbackEmailInput = {
  type: string;
  message: string;
  context: Record<string, string>;
  userEmail: string | null;
  userName?: string | null;
  userCreatedAt?: string | null;
  now?: Date;
};

const TYPE_LABELS: Record<string, string> = {
  idea: '💡 Idé',
  bug: '🐛 Något är fel',
  praise: '💜 Beröm',
  crash: '🚨 Krasch',
};

// Fält vi visar i klartext själva – resten hamnar under "Tekniskt"
const KNOWN_KEYS = new Set(['sida', 'enhet', 'skärm', 'läge', 'hemskärmsapp', 'tid']);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 …) … Version/27.2 Mobile … Safari" → { device: "iPhone", os: "iOS 27.2", browser: "Safari" } */
function describeUserAgent(ua: string) {
  const s = ua || '';
  let device = 'Okänd enhet';
  let os = '';
  if (/iPad/.test(s)) device = 'iPad';
  else if (/iPhone|iPod/.test(s)) device = 'iPhone';
  else if (/Android/.test(s)) device = /Mobile/.test(s) ? 'Android-mobil' : 'Android-surfplatta';
  else if (/Macintosh|Mac OS X/.test(s)) device = 'Mac';
  else if (/Windows/.test(s)) device = 'Windows-dator';
  else if (/Linux/.test(s)) device = 'Linux-dator';

  if (device === 'iPhone' || device === 'iPad') {
    // Safari har frusit OS-numret; "Version/x.y" visar den riktiga versionen
    const v = s.match(/Version\/(\d+(?:\.\d+)?)/) || s.match(/OS (\d+)_(\d+)/);
    if (v) os = `iOS ${v[2] ? `${v[1]}.${v[2]}` : v[1]}`;
  } else if (device.startsWith('Android')) {
    const v = s.match(/Android (\d+(?:\.\d+)?)/);
    if (v) os = `Android ${v[1]}`;
  }

  let browser = '';
  if (/Instagram/.test(s)) browser = 'Instagram';
  else if (/FBAN|FBAV|FB_IAB/.test(s)) browser = 'Facebook';
  else if (/musical_ly|TikTok|Bytedance/i.test(s)) browser = 'TikTok';
  else if (/SamsungBrowser/.test(s)) browser = 'Samsung Internet';
  else if (/EdgiOS|EdgA|Edg\//.test(s)) browser = 'Edge';
  else if (/CriOS|Chrome\//.test(s)) browser = 'Chrome';
  else if (/FxiOS|Firefox\//.test(s)) browser = 'Firefox';
  else if (/Safari\//.test(s)) browser = 'Safari';

  return { device, os, browser };
}

const isYes = (v?: string) => /^(true|ja|1)$/i.test(String(v || '').trim());

function formatWhen(d: Date) {
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(d)
      .replace(/\s(\d{2}:\d{2})$/, ' kl. $1');
  } catch {
    return d.toISOString();
  }
}

function formatAccountAge(createdAt: string, now: Date) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';
  const mins = Math.max(0, Math.round((now.getTime() - created.getTime()) / 60000));
  if (mins < 60) return `Ny – kontot skapades för ${mins} min sedan`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Ny – kontot skapades för ${hours} tim sedan`;
  const days = Math.round(hours / 24);
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short' }).format(created);
  return `Användare sedan ${date} (${days} ${days === 1 ? 'dag' : 'dagar'})`;
}

export function buildFeedbackEmail(input: FeedbackEmailInput) {
  const now = input.now ?? new Date();
  const ctx = input.context || {};
  const label = TYPE_LABELS[input.type] || input.type;
  const page = ctx['sida'] || '';
  const isDemo = /[?&]demo\b/.test(page);

  const { device, os, browser } = describeUserAgent(ctx['enhet'] || '');
  // "Android-mobil, Android 14" är dubbelt – visa bara "Android 14"
  const deviceText = device.startsWith('Android') && os ? os : [device, os].filter(Boolean).join(', ');
  const via = isYes(ctx['hemskärmsapp'])
    ? `Hemskärmsappen på ${deviceText}`
    : `${browser ? `${browser} på ` : 'Webbläsare på '}${deviceText}`;

  const rows: Array<[string, string]> = [];
  if (input.userEmail) {
    rows.push(['Från', input.userName ? `${input.userName} (${input.userEmail})` : input.userEmail]);
    if (input.userCreatedAt) {
      const age = formatAccountAge(input.userCreatedAt, now);
      if (age) rows.push(['Konto', age]);
    }
  } else {
    rows.push(['Från', 'Inte inloggad – går inte att svara']);
  }
  rows.push(['Via', via]);
  rows.push(['Tid', formatWhen(now)]);

  // Små tekniska detaljer, på en rad
  const tech: string[] = [];
  if (page && page !== '/') tech.push(`sida ${page}`);
  if (ctx['skärm']) tech.push(`skärm ${ctx['skärm']}`);
  if (ctx['läge']) tech.push(`${ctx['läge']} läge`);

  // Övrigt (t.ex. kraschdetaljer) – visas i monospace längst ned
  const extras = Object.entries(ctx).filter(([k, v]) => !KNOWN_KEYS.has(k) && String(v || '').trim());

  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#8F8DA3;font-size:14px;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:#16141F">${esc(v)}</td></tr>`
    )
    .join('');

  const extrasHtml = extras
    .map(
      ([k, v]) =>
        `<p style="margin:16px 0 4px;font-size:12px;color:#8F8DA3">${esc(k)}</p><pre style="margin:0;padding:10px 12px;background:#F5F4FA;border-radius:8px;font-size:11px;line-height:1.45;color:#16141F;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,Consolas,monospace">${esc(String(v).slice(0, 1500))}</pre>`
    )
    .join('');

  const replyHint = input.userEmail
    ? '<p style="margin:20px 0 0;font-size:13px;color:#56546B">↩︎ Svara på mejlet så hamnar svaret direkt hos personen.</p>'
    : '';

  const demoBanner = isDemo
    ? '<p style="margin:0 0 12px;padding:8px 12px;background:#FFF4D6;border-radius:8px;font-size:13px;color:#7A5300">🧪 Skickat från demoläget – troligen ett test.</p>'
    : '';

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.5;color:#16141F;max-width:560px">
  ${demoBanner}
  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#5B3DF5">${esc(label)}</p>
  <p style="margin:0 0 20px;font-size:18px;line-height:1.45;white-space:pre-wrap">${esc(input.message)}</p>
  <table style="border-collapse:collapse;border-top:1px solid #E6E4EF;width:100%">${rowHtml}</table>
  ${replyHint}
  ${tech.length ? `<p style="margin:16px 0 0;font-size:12px;color:#8F8DA3">${esc(tech.join(' · '))}</p>` : ''}
  ${extrasHtml}
</div>`;

  const who = input.userEmail ? input.userEmail.split('@')[0] : 'okänd';
  const short = input.message.replace(/\s+/g, ' ').slice(0, 50);
  const subject = `${isDemo ? '[TEST] ' : ''}${label} från ${who}: ${short}${input.message.length > 50 ? '…' : ''}`;

  return { subject, html };
}
