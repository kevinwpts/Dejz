// Laddas bara när felövervakningen är påslagen (se monitoring.ts).
// Namngivna importer gör att bara det vi använder följer med (inte t.ex. skärminspelning).
export { init, captureException } from '@sentry/react';
