/**
 * En enda plats för loggning. Fel skickas till felövervakningen (Sentry, om den är påslagen)
 * och skrivs i konsolen under utveckling. Använd den här i stället för console.* i appen.
 */
import { reportError } from './monitoring';

const isDev = Boolean(import.meta.env?.DEV);

/** Något gick fel som vi vill veta om (skickas till Sentry). */
export function logError(context: string, error: unknown, extra?: Record<string, string>): void {
  if (isDev) console.error(`[${context}]`, error);
  reportError(error instanceof Error ? error : new Error(`${context}: ${String(error)}`), { context, ...extra });
}

/** Väntat problem som appen klarar själv (t.ex. reserv till lokal lagring). Bara i utveckling. */
export function logWarn(context: string, detail?: unknown): void {
  if (isDev) console.warn(`[${context}]`, detail ?? '');
}
