import type { AccountItem } from '../app/models';

/** Hur ett konto visas i detaljvyer: namn plus kontonummer (bara om vi vet det riktiga). */
export interface AccountDisplayInfo {
  label: string;
  /** Hela numret, eller null om det inte är känt */
  fullNumber: string | null;
  /** T.ex. "•••• 4821", eller null om inget nummer är känt */
  maskedNumber: string | null;
}

/**
 * Bygger kontots visningsnamn och nummer från bankens kontotext (`raw`) och det matchade kontot.
 * Hittar aldrig på ett nummer: saknas siffror visas bara namnet.
 */
export function describeAccount(raw: string, account: AccountItem | undefined): AccountDisplayInfo {
  const label =
    (raw || (account ? `${account.bankName} · ${account.name}` : 'Lönekonto'))
      .replace(/\s*·\s*[•*·\d\s-]{4,}$/g, '')
      .replace(/\b\d[\d\s-]{5,}\b/g, '')
      .replace(/\s*·\s*$/, '')
      .trim() || 'Lönekonto';

  const accountNumber = (account?.accountNumber || '').trim();
  const digitsInRaw = (raw.match(/\d[\d\s-]{3,}\d/)?.[0] || '').trim();
  const source = accountNumber || digitsInRaw;
  const digits = source.replace(/\D/g, '');

  if (digits.length < 4) return { label, fullNumber: null, maskedNumber: null };
  const masked = `•••• ${digits.slice(-4)}`;
  // Med bara fyra–sex siffror vet vi inte hela numret – visa samma maskade form.
  const full = digits.length >= 7 ? source.replace(/^[•*\s·-]+/, '').trim() : masked;
  return { label, fullNumber: full, maskedNumber: masked };
}
