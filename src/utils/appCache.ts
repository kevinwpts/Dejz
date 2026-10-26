import { BankConnection, BankAccount } from '../services/bankService';
import { IncomeItem, FixedExpenseItem, TransactionItem } from '../components/HomeTab';
import { WeekendHandlingMode } from './periodEngine';

const APP_CACHE_KEY = 'dejz_app_state_cache_v2';

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
    (cached.transactions && cached.transactions.length > 0)
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

// --- Permanent Ignored / Blacklisted Merchants for Fixed Items ---
const DISMISSED_FIXED_KEY = 'dejz_dismissed_fixed_merchants_v1';
const DISMISSED_INCOME_KEY = 'dejz_dismissed_income_merchants_v1';
const MANUAL_FIXED_OVERRIDES_KEY = 'dejz_manual_fixed_overrides_v1';
const MANUAL_INCOME_OVERRIDES_KEY = 'dejz_manual_income_overrides_v1';

function normalizeMerchantKey(name: string): string {
  return (name || '').toLowerCase().trim();
}

export function getDismissedFixedMerchants(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_FIXED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(normalizeMerchantKey) : []);
  } catch {
    return new Set();
  }
}

export function dismissFixedMerchant(name: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedFixedMerchants();
    set.add(normalizeMerchantKey(name));
    localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function unDismissFixedMerchant(name: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedFixedMerchants();
    set.delete(normalizeMerchantKey(name));
    localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function getDismissedIncomeMerchants(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_INCOME_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(normalizeMerchantKey) : []);
  } catch {
    return new Set();
  }
}

export function dismissIncomeMerchant(name: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedIncomeMerchants();
    set.add(normalizeMerchantKey(name));
    localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function unDismissIncomeMerchant(name: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedIncomeMerchants();
    set.delete(normalizeMerchantKey(name));
    localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function getManualFixedOverrides(): Record<string, { amount?: number; dueDay?: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MANUAL_FIXED_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualFixedOverride(name: string, override: { amount?: number; dueDay?: number }): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const map = getManualFixedOverrides();
    const key = normalizeMerchantKey(name);
    map[key] = { ...(map[key] || {}), ...override };
    localStorage.setItem(MANUAL_FIXED_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getManualIncomeOverrides(): Record<string, { amount?: number; payday?: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MANUAL_INCOME_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualIncomeOverride(name: string, override: { amount?: number; payday?: number }): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const map = getManualIncomeOverrides();
    const key = normalizeMerchantKey(name);
    map[key] = { ...(map[key] || {}), ...override };
    localStorage.setItem(MANUAL_INCOME_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// --- Exclude Internal Transfers & Manual Transaction Exclusions ---
const EXCLUDE_INTERNAL_TRANSFERS_KEY = 'dejz_exclude_internal_transfers_v1';
const EXCLUDED_TX_IDS_KEY = 'dejz_excluded_transaction_ids_v1';

export function getExcludeInternalTransfers(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(EXCLUDE_INTERNAL_TRANSFERS_KEY);
    if (stored === null) return true; // Standard: aktiverat (döljer interna överföringar)
    return stored === 'true';
  } catch {
    return true;
  }
}

export function setExcludeInternalTransfers(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXCLUDE_INTERNAL_TRANSFERS_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function getExcludedTransactionIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(EXCLUDED_TX_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function setTransactionExcludedState(id: string, isExcluded: boolean): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getExcludedTransactionIds();
    if (isExcluded) {
      set.add(id);
    } else {
      set.delete(id);
    }
    localStorage.setItem(EXCLUDED_TX_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function isTransactionManuallyExcluded(id: string): boolean {
  if (!id) return false;
  return getExcludedTransactionIds().has(id);
}

// --- Custom Categories Persistence ---
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';
import { Category } from '../types';

const CUSTOM_EXPENSE_CATEGORIES_KEY = 'dejz_custom_expense_categories_v1';
const CUSTOM_INCOME_CATEGORIES_KEY = 'dejz_custom_income_categories_v1';

export function getStoredExpenseCategories(): Category[] {
  if (typeof window === 'undefined') return DEFAULT_EXPENSE_CATEGORIES;
  try {
    const raw = localStorage.getItem(CUSTOM_EXPENSE_CATEGORIES_KEY);
    if (!raw) return DEFAULT_EXPENSE_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EXPENSE_CATEGORIES;
  } catch {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
}

export function saveStoredExpenseCategories(cats: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_EXPENSE_CATEGORIES_KEY, JSON.stringify(cats));
  } catch {
    // ignore
  }
}

export function getStoredIncomeCategories(): Category[] {
  if (typeof window === 'undefined') return DEFAULT_INCOME_CATEGORIES;
  try {
    const raw = localStorage.getItem(CUSTOM_INCOME_CATEGORIES_KEY);
    if (!raw) return DEFAULT_INCOME_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INCOME_CATEGORIES;
  } catch {
    return DEFAULT_INCOME_CATEGORIES;
  }
}

export function saveStoredIncomeCategories(cats: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_INCOME_CATEGORIES_KEY, JSON.stringify(cats));
  } catch {
    // ignore
  }
}

const MERCHANT_ALIASES_KEY = 'dejz_merchant_aliases_v1';

export function getMerchantAliases(): Record<string, { name: string; category: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MERCHANT_ALIASES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMerchantAlias(rawName: string, targetName: string, category: string): void {
  if (typeof window === 'undefined' || !rawName) return;
  try {
    const map = getMerchantAliases();
    map[normalizeMerchantKey(rawName)] = { name: targetName, category };
    localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

