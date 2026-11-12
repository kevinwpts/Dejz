// Avgör om en banktransaktion är pengar IN (lön, Swish in, insättning, bidrag …).
import { includesAny } from '../txFields';

/** Ord som betyder att köpet bara är reserverat (preliminärt), inte bokfört. */
export const RESERVATION_WORDS = ['reserverat', 'reservation', 'preliminär', 'preliminar'];

/** Ord som betyder att pengarna kommer tillbaka från en butik (retur/återköp). */
export const EXPLICIT_REFUND_WORDS = ['återköp', 'aterkop', 'retur', 'refund', 'kreditering'];

/** Kända utgiftsmönster – en sådan rad kan aldrig vara en inkomst. */
const EXPENSE_WORDS = [
  'kortköp',
  'kortkop',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'fakturabetalning',
  'faktura',
  'betalning bg',
  'betalning pg',
  'inbetalning bg',
  'inbetalning pg',
  'swish betalning',
  'swish till',
  'swish skickad',
  'swish handel',
  'överföring till',
  'overforing till',
  'uttag',
  'bankomat',
  'avgift',
  'årsavgift',
  'månadsavgift',
  'räntekostnad',
  'csn återbetalning',
  'csn aterbetalning',
  'premie',
];

/** Verifierade inkomstmönster, grupperade efter typ. */
const INCOME_WORD_GROUPS: readonly string[][] = [
  // Lön & arbetsersättning ("lon" som eget ord kontrolleras separat)
  ['lön', 'salary', 'löneutbetalning', 'loneutbetalning'],
  // Mottagen Swish
  ['swish mottagen', 'swish mottagit', 'swish inbetalning', 'swish inb', 'swish från', 'swish fran'],
  // Insättning & överföring från annat konto
  ['insättning', 'insattning', 'insatt ', 'överföring från', 'overforing fran'],
  // Återbetalning, returer & försäkrings-/företagsutbetalningar
  [
    'återbetalning',
    'aterbetalning',
    'återköp',
    'aterkop',
    'retur',
    'refund',
    'kreditering',
    'skadeersättning',
    'skadeersattning',
    'försäkringsersättning',
    'forsakringsersattning',
    'utbetalning',
    'återbäring',
    'aterbaring',
  ],
  // Samhällsbidrag & pensioner
  [
    'försäkringskassan',
    'forsakringskassan',
    'barnbidrag',
    'pension',
    'pensionsmyndigheten',
    'skatteverket',
    'skatteåterbäring',
    'skatteaterbaring',
    'a-kassa',
    'akassa',
    'studiemedel',
  ],
  // Ränteintäkt eller aktieutdelning
  ['aktieutdelning', 'ränteintäkt', 'ranteintakt', 'utdelning'],
];

/** Sant om bokningsstatus eller text visar att köpet bara är reserverat. */
function isReservedText(statusUpper: string | null, combined: string): boolean {
  return statusUpper === 'PDNG' || statusUpper === 'HOLD' || includesAny(combined, RESERVATION_WORDS);
}

/** Sant om texten matchar ett känt inkomstmönster. */
function hasIncomeWording(combined: string): boolean {
  return INCOME_WORD_GROUPS.some((group) => includesAny(combined, group)) || /\blon\b/i.test(combined);
}

/**
 * Kontrollerar om en transaktion är en bekräftad inkomst (lön, inkommande Swish, insättning, bidrag etc.).
 * Utesluter strikt alla utgående betalningar som kortköp, autogiro, bankgiro, räkningar och utgående Swish.
 */
export function isExplicitInflowTransaction(
  desc: string | null | undefined,
  counterparty: string | null | undefined,
  indicator?: string | null,
  bookingStatus?: string | null
): boolean {
  // Om banken explicit flaggat som DBIT (utgift) kan det ALDRIG vara en inkomst
  if (indicator === 'DBIT') return false;

  const combined = `${desc || ''} ${counterparty || ''}`.toLowerCase().trim();
  const statusUpper = bookingStatus ? String(bookingStatus).toUpperCase().trim() : null;
  const isReserved = isReservedText(statusUpper, combined);

  // Reservationer (t.ex. SEB) är preliminära kortköp – aldrig inkomst om det inte är en retur
  if (isReserved && !includesAny(combined, EXPLICIT_REFUND_WORDS)) return false;
  if (!combined && !indicator) return false;

  // Kända utgiftsmönster har alltid företräde, även "Swish 123…" (köp hos företag)
  if (includesAny(combined, EXPENSE_WORDS)) return false;
  if (/swish\s*123\d{7}/i.test(combined)) return false;

  // CRDT litar vi på – utom för reservationer, där t.ex. SEB sätter CRDT på spärrbelopp
  if (indicator === 'CRDT' && !isReserved) return true;

  return hasIncomeWording(combined);
}
