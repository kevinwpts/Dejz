/** Snabbstart: senaste appläget sparas lokalt så att appen visar dina siffror direkt. Plus id-hjälpare. */
import { BankConnection, BankAccount } from '../../services/bank/types';
import { IncomeItem, FixedExpenseItem, TransactionItem } from '../../app/models';
import { WeekendHandlingMode } from '../periodEngine';
import { GENERIC_PLACEHOLDER_MERCHANTS } from './merchants';

const APP_CACHE_KEY = 'dejz_app_state_cache_v2';

export const SHOW_ACCOUNTS_ON_HOME_KEY = 'dejz_show_accounts_on_home';

export interface CachedAppState {
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  targetPayday: number;
  weekendHandling: WeekendHandlingMode;
  userId: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  lastUpdated: number;
}

export function loadCachedAppState(): CachedAppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(APP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as CachedAppState;
  } catch {
    return null;
  }
}

export function hasCachedBankData(): boolean {
  const cached = loadCachedAppState();
  if (!cached) return false;
  return Boolean(
    (cached.bankAccounts && cached.bankAccounts.length > 0) ||
    (cached.connections && cached.connections.length > 0) ||
    (cached.transactions && cached.transactions.length > 0) ||
    (cached.fixedExpenses && cached.fixedExpenses.length > 0)
  );
}

export function saveCachedAppState(patch: Partial<CachedAppState>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadCachedAppState() || {
      connections: [],
      bankAccounts: [],
      incomes: [],
      fixedExpenses: [],
      transactions: [],
      targetPayday: 25,
      weekendHandling: 'before',
      userId: null,
      userEmail: null,
      userAvatar: null,
      lastUpdated: Date.now(),
    };

    const next: CachedAppState = {
      ...current,
      ...patch,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(APP_CACHE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota exceeded or privacy block
  }
}

export function clearCachedAppState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(APP_CACHE_KEY);
  } catch {
    // ignore
  }
}

// --- Deterministic UUID Generation for Entities ---
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  return Boolean(id && UUID_REGEX.test(id));
}

function deterministicUuid(seed: string): string {
  const input = String(seed || 'default').toLowerCase().trim();
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  let h3 = 0x9e3779b9 ^ input.length;
  let h4 = 0x85ebca6b ^ input.length;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hex4 = (h4 >>> 0).toString(16).padStart(8, '0');

  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-8${hex3.slice(1, 4)}-${hex3.slice(4, 8)}${hex4}`;
}

export function ensureValidUuid(id?: string | null, fallbackSeed?: string): string {
  if (id && isValidUuid(id)) return id;
  if (fallbackSeed) return deterministicUuid(fallbackSeed);
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return deterministicUuid(`random-${Date.now()}-${Math.random()}`);
}

// --- Canonical Merchant Normalization ---
export function normalizeMerchantKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/24\s*[/\-_]\s*7/g, '24seven')
    .replace(/24\s+seven/g, '24seven')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractMerchantKeyVariants(name: string): string[] {
  const raw = (name || '').toLowerCase().trim();
  if (!raw) return [];
  const norm = normalizeMerchantKey(raw);
  const variants = new Set<string>([raw, norm]);

  // If this string contains a Swedish mobile / Swish number, add the exact normalized phone keys
  // (never the generic word "swish")
  const digitsOnly = raw.replace(/\D/g, '');
  if (/^(?:467\d{8}|00467\d{8}|07\d{8}|123\d{7})$/.test(digitsOnly)) {
    const normPhone = digitsOnly.startsWith('00467')
      ? '07' + digitsOnly.slice(5)
      : digitsOnly.startsWith('467')
      ? '07' + digitsOnly.slice(3)
      : digitsOnly;
    variants.add(normPhone);
    if (normPhone.startsWith('07')) {
      variants.add('46' + normPhone.slice(1));
    }
  }

  // Also extract content inside or outside parentheses, e.g. "Hyra (Sveafastigheter)" or "Sveafastigheter (Hyra)"
  const parenMatch = norm.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    const outer = parenMatch[1].trim();
    const inner = parenMatch[2].trim();
    const isOuterSwishOrGeneric =
      outer === 'hyra' ||
      outer === 'lön' ||
      outer === 'boende' ||
      outer === 'klarna' ||
      outer === 'autogiro' ||
      outer.startsWith('swish');
    if (outer.length >= 3 && !isOuterSwishOrGeneric) {
      variants.add(outer);
    }
    if (
      inner.length >= 3 &&
      inner !== 'hyra' &&
      inner !== 'lön' &&
      inner !== 'boende' &&
      !inner.startsWith('swish')
    ) {
      variants.add(inner);
      const innerDigits = inner.replace(/\D/g, '');
      if (/^(?:467\d{8}|00467\d{8}|07\d{8}|123\d{7})$/.test(innerDigits)) {
        const normInnerPhone = innerDigits.startsWith('00467')
          ? '07' + innerDigits.slice(5)
          : innerDigits.startsWith('467')
          ? '07' + innerDigits.slice(3)
          : innerDigits;
        variants.add(normInnerPhone);
        if (normInnerPhone.startsWith('07')) {
          variants.add('46' + normInnerPhone.slice(1));
        }
      }
    }
  }

  return Array.from(variants).filter((v) => Boolean(v) && !GENERIC_PLACEHOLDER_MERCHANTS.has(v));
}
