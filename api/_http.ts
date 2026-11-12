/**
 * Typer för serverfunktionerna i api/ (Vercel). Filer som börjar med _ blir inte egna adresser.
 * Bara det vi använder – Vercel och lokala `npm run dev` (Express) uppfyller båda detta.
 */
export interface ApiRequest {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
  setHeader(name: string, value: string): unknown;
  end?(): unknown;
}

/** Läser JSON-kroppen oavsett om den redan är tolkad eller kom som text. */
export function readJsonBody<T extends object>(req: ApiRequest): Partial<T> {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Partial<T>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? (raw as Partial<T>) : {};
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
