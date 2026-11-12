// Gemensamma typer och hjälpfunktioner för fönstret "Anslut bank".
import type { BankAccount } from '../../../services/bankService';

/** Stegen i flödet: banklista → inloggning hos banken → välj konton */
export type BankStep = 'list' | 'authorizing' | 'select-accounts';

/** Läsbart kontonamn utan kontonummer (t.ex. "Lönekonto") */
export function getCleanAccountTypeLabel(acc: BankAccount, index: number): string {
  const raw = (acc.product || acc.name || '').trim();
  const stripped = raw
    .replace(/\b\d[\d\s-]{3,}\d\b/g, '')
    .replace(/[·•\-–—]\s*\d{2,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (stripped && !/^\d+$/.test(stripped)) {
    return stripped;
  }
  return index === 0 ? 'Lönekonto' : 'Sparkonto';
}

/** Kontonamn att visa för varje konto (eget namn, annars rensat banknamn) */
export function buildAccountNameMap(accs: BankAccount[]): Record<string, string> {
  const nameMap: Record<string, string> = {};
  accs.forEach((a, idx) => {
    nameMap[a.id] = a.custom_name || getCleanAccountTypeLabel(a, idx);
  });
  return nameMap;
}

export function formatBankKr(amount: number | null | undefined, currency = 'SEK'): string {
  if (amount === null || amount === undefined) return '–';
  return `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} ${
    currency === 'SEK' ? 'kr' : currency
  }`;
}
