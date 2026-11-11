// Kontonamn och visning av bankkonton. Del av bankanalysen (tidigare utils/bankHistoryAnalyzer.ts).
import { BankAccount } from '../../services/bankService';

// ---------------------------------------------------------------------------
// 1. ACCOUNT DISPLAY & SELECTION HELPERS
// ---------------------------------------------------------------------------

export function isLikelySavingsAccount(acc: Pick<BankAccount, 'name' | 'product' | 'custom_name'>): boolean {
  const combined = `${acc.custom_name || ''} ${acc.product || ''} ${acc.name || ''}`.toLowerCase();
  return (
    combined.includes('sparkonto') ||
    combined.includes('enkla sparkontot') ||
    combined.includes('framtidskonto') ||
    combined.includes('placeringskonto') ||
    combined.includes('kapitalkonto') ||
    combined.includes('fasträntekonto') ||
    combined.includes('buffer')
  );
}

export function formatBankAccountNumber(rawNumber: string | null | undefined): string {
  if (!rawNumber) return '';
  const digits = rawNumber.replace(/\s+/g, '');
  // Format 11-digit Swedish SEB/bank account numbers (e.g. 51960050753 -> 5196 00 507 53)
  if (/^\d{11}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 11)}`;
  }
  return rawNumber;
}

export function isLikelyPersonFullName(rawName: string): boolean {
  const trimmed = rawName.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('konto') ||
    lower.includes('spar') ||
    lower.includes('lön') ||
    lower.includes('privat') ||
    lower.includes('kort') ||
    lower.includes('buffert') ||
    lower.includes('gemensamt') ||
    lower.includes('hushåll')
  ) {
    return false;
  }
  // Many Swedish banks (like SEB) put the account holder's full name in `acc.name` in ALL CAPS (e.g. "KEVIN PETERSEN")
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.length <= 4 && trimmed === trimmed.toUpperCase() && /^[A-ZÅÄÖ\s-]+$/.test(trimmed)) {
    return true;
  }
  return false;
}

export function isRawAccountNumberOrIban(str: string): boolean {
  const cleaned = str.replace(/[\s-]/g, '');
  if (/^\d{6,}$/.test(cleaned)) return true;
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{8,}$/i.test(cleaned)) return true;
  return false;
}

export function getBankAccountTitle(
  acc: Pick<BankAccount, 'name' | 'product' | 'bban' | 'iban' | 'custom_name'> & {
    provider_account_uid?: string | null;
    aspsp_name?: string | null;
  },
  aspspName?: string | null
): string {
  const custom = (acc.custom_name || '').trim();
  if (custom && !isRawAccountNumberOrIban(custom)) return custom;

  const product = (acc.product || '').trim();
  const rawName = (acc.name || '').trim();

  if (product && !isLikelyPersonFullName(product) && !isRawAccountNumberOrIban(product)) {
    return product;
  }

  if (rawName && !isLikelyPersonFullName(rawName) && !isRawAccountNumberOrIban(rawName)) {
    return rawName;
  }

  const bankPrefix = (aspspName || acc.aspsp_name || '').trim() || 'SEB';
  const shortBank = bankPrefix.toUpperCase().includes('SEB') ? 'SEB' : bankPrefix;
  return `${shortBank} · Privatkonto`;
}

export function getBankAccountShortLabel(
  acc: Pick<BankAccount, 'name' | 'product' | 'bban' | 'iban' | 'provider_account_uid' | 'custom_name'> & {
    aspsp_name?: string | null;
  },
  aspspName?: string | null
): string {
  const custom = (acc.custom_name || '').trim();
  if (custom && !isRawAccountNumberOrIban(custom)) {
    return custom;
  }

  return getBankAccountTitle(acc, aspspName);
}

export function formatCleanBalanceLabel(rawLabel: string | null | undefined): string {
  if (!rawLabel) return 'Tillgängligt saldo';
  // Remove technical ISO codes like (ITAV), (CLAV), (ITBD), (CLBD), (SEK)
  const cleaned = rawLabel
    .replace(/\s*\((ITAV|CLAV|ITBD|CLBD|XPCD|OPAV|OPBD|PRCD|VALU|INFO|SEK|EUR|DKK|NOK)\)/gi, '')
    .trim();
  return cleaned || 'Tillgängligt saldo';
}
