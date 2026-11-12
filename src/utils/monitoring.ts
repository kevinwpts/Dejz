import { isDemoMode } from './demoUtils';

/**
 * Felövervakning med Sentry. Slås på genom att lägga in VITE_SENTRY_DSN i Vercel.
 * Utan nyckel (och i demoläget eller lokalt) laddas ingenting – appen blir inte större.
 *
 * Integritet: inga namn, e-post, IP-adresser, belopp eller konsolloggar skickas.
 * Bara felmeddelande, var i koden det hände och vilken webbläsare/telefon.
 */
type SentryModule = typeof import('./sentryClient');

let sentry: SentryModule | null = null;
const pending: Array<{ error: unknown; context?: Record<string, string> }> = [];

/** Tar bort sådant som kan avslöja vem du är eller dina pengar (t.ex. ?code= från banken). */
function stripQuery(url?: string): string | undefined {
  if (!url) return url;
  const i = url.search(/[?#]/);
  return i === -1 ? url : url.slice(0, i);
}

export function initMonitoring(): void {
  const dsn = import.meta.env?.VITE_SENTRY_DSN;
  if (!dsn || import.meta.env?.DEV || typeof window === 'undefined') return;
  try {
    if (isDemoMode()) return;
  } catch {
    // localStorage kan vara blockerat – fortsätt
  }
  void import('./sentryClient')
    .then((mod) => {
      mod.init({
        dsn,
        environment: import.meta.env?.MODE,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
        tracesSampleRate: 0,
        // Bara våra egna filer, inte webbläsartillägg
        allowUrls: [/https?:\/\/(www\.)?dejz\.se/, /capacitor:\/\//],
        beforeBreadcrumb: (crumb) => (crumb.category === 'console' ? null : crumb),
        beforeSend: (event) => {
          delete event.user;
          if (event.request) {
            event.request.url = stripQuery(event.request.url);
            delete event.request.query_string;
            delete event.request.cookies;
            delete event.request.headers;
          }
          event.breadcrumbs = event.breadcrumbs?.map((b) => ({
            ...b,
            data: b.data?.url ? { ...b.data, url: stripQuery(String(b.data.url)) } : b.data,
            message: b.category === 'navigation' ? undefined : b.message,
          }));
          return event;
        },
      });
      sentry = mod;
      for (const p of pending.splice(0)) reportError(p.error, p.context);
    })
    .catch(() => {
      // Felövervakningen får aldrig krascha appen
    });
}

/** Skicka ett fel till Sentry (om det är påslaget). */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (!sentry) {
    if (import.meta.env?.VITE_SENTRY_DSN && pending.length < 10) pending.push({ error, context });
    return;
  }
  sentry.captureException(error, context ? { extra: context } : undefined);
}
