/** Tar bort långa kontonummer ur ett kontonamn, t.ex. "Lönekonto · 8327-9 123 456" → "Lönekonto" */
export function stripRawAccountDigits(value: string): string {
  return value
    .replace(/\b\d[\d\s-]{3,}\d\b/g, '')
    .replace(/[·•\-–—]\s*\d{2,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
