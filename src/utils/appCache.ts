import { BankConnection, BankAccount } from '../services/bankService';
import { IncomeItem, FixedExpenseItem, TransactionItem } from '../components/HomeTab';
import { WeekendHandlingMode } from './periodEngine';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';
import { Category } from '../types';
import { supabase } from '../supabaseClient';

const APP_CACHE_KEY = 'dejz_app_state_cache_v2';
const SHOW_ACCOUNTS_ON_HOME_KEY = 'dejz_show_accounts_on_home';

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

export function deterministicUuid(seed: string): string {
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

  // Also extract content inside or outside parentheses, e.g. "Hyra (Sveafastigheter)" or "Sveafastigheter (Hyra)"
  const parenMatch = norm.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    const outer = parenMatch[1].trim();
    const inner = parenMatch[2].trim();
    if (outer.length >= 3 && outer !== 'hyra' && outer !== 'lön' && outer !== 'boende') {
      variants.add(outer);
    }
    if (inner.length >= 3 && inner !== 'hyra' && inner !== 'lön' && inner !== 'boende') {
      variants.add(inner);
    }
  }

  return Array.from(variants).filter(Boolean);
}

// --- Permanent Ignored / Blacklisted Merchants for Fixed Items ---
const DISMISSED_FIXED_KEY = 'dejz_dismissed_fixed_merchants_v1';
const DISMISSED_INCOME_KEY = 'dejz_dismissed_income_merchants_v1';
const DELETED_FIXED_IDS_KEY = 'dejz_deleted_fixed_ids_v1';
const DELETED_INCOME_IDS_KEY = 'dejz_deleted_income_ids_v1';
const MANUAL_FIXED_OVERRIDES_KEY = 'dejz_manual_fixed_overrides_v1';
const MANUAL_INCOME_OVERRIDES_KEY = 'dejz_manual_income_overrides_v1';
const MERCHANT_ALIASES_KEY = 'dejz_merchant_aliases_v3';

const GENERIC_PLACEHOLDER_MERCHANTS = new Set([
  'banktransaktion',
  'kortköp',
  'kortkop',
  'betalning',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'bg',
  'pg',
  'insättning',
  'insattning',
  'utbetalning',
  'inbetalning',
  'utgift',
  'inkomst',
  'köp',
  'kop',
  'reserverat',
  'reservation',
  'överföring',
  'overforing',
  'okänd',
  'okand',
  'okänd butik',
  'okand butik',
  'övrigt',
  'ovrigt',
]);

export function isGenericPlaceholderMerchant(name: string | null | undefined): boolean {
  if (!name) return true;
  const cleaned = String(name).toLowerCase().trim();
  if (!cleaned) return true;
  if (GENERIC_PLACEHOLDER_MERCHANTS.has(cleaned)) return true;
  const norm = normalizeMerchantKey(cleaned);
  if (!norm || GENERIC_PLACEHOLDER_MERCHANTS.has(norm)) return true;
  return false;
}

export function getMerchantAliases(): Record<string, { name: string; category: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MERCHANT_ALIASES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    let dirty = false;
    const cleanedMap: Record<string, { name: string; category: string }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const val = v as { name?: string; category?: string } | null;
      if (
        !val ||
        typeof val.name !== 'string' ||
        isGenericPlaceholderMerchant(k) ||
        isGenericPlaceholderMerchant(val.name)
      ) {
        dirty = true;
        continue;
      }
      cleanedMap[k] = { name: val.name, category: val.category || 'Övrigt' };
    }

    if (dirty) {
      try {
        localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(cleanedMap));
      } catch {
        // ignore
      }
    }

    return cleanedMap;
  } catch {
    return {};
  }
}

export function saveMerchantAlias(rawName: string, targetName: string, category: string): void {
  if (typeof window === 'undefined' || !rawName || !targetName) return;
  if (isGenericPlaceholderMerchant(rawName) || isGenericPlaceholderMerchant(targetName)) return;
  try {
    const map = getMerchantAliases();
    const sourceVariants = extractMerchantKeyVariants(rawName).filter(
      (v) => !isGenericPlaceholderMerchant(v)
    );
    if (sourceVariants.length === 0) return;

    // Flatten alias chains: any existing alias pointing to rawName now points to targetName
    for (const [k, v] of Object.entries(map)) {
      const existingTargetNorm = normalizeMerchantKey(v.name);
      if (sourceVariants.includes(existingTargetNorm) || v.name.toLowerCase().trim() === rawName.toLowerCase().trim()) {
        map[k] = { name: targetName, category };
      }
    }

    for (const key of sourceVariants) {
      map[key] = { name: targetName, category };
    }

    localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function resolveMerchantAlias(
  rawText: string,
  aliasesOverride?: Record<string, { name: string; category: string }>
): { name: string; category: string } | null {
  if (!rawText || isGenericPlaceholderMerchant(rawText)) return null;
  const aliases = aliasesOverride || getMerchantAliases();
  const variants = extractMerchantKeyVariants(rawText).filter(
    (v) => !isGenericPlaceholderMerchant(v)
  );
  // Endast exakt nyckelmatchning — gör ALDRIG substring-matchning (så att t.ex. "ryde" aldrig matchar "hemköp rydebäck")!
  for (const v of variants) {
    if (aliases[v] && !isGenericPlaceholderMerchant(aliases[v].name)) {
      return aliases[v];
    }
  }

  return null;
}

export function getDismissedFixedMerchants(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_FIXED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    const set = new Set<string>();
    if (Array.isArray(arr)) {
      for (const item of arr) {
        for (const v of extractMerchantKeyVariants(String(item))) {
          set.add(v);
        }
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

export function dismissFixedMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedFixedMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.add(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.add(v);
      }
    }
    // Also dismiss any alias keys that pointed to this merchant
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.add(k);
      }
    }
    localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function unDismissFixedMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedFixedMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.delete(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.delete(v);
      }
    }
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.delete(k);
      }
    }
    localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
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
    const set = new Set<string>();
    if (Array.isArray(arr)) {
      for (const item of arr) {
        for (const v of extractMerchantKeyVariants(String(item))) {
          set.add(v);
        }
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

export function dismissIncomeMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedIncomeMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.add(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.add(v);
      }
    }
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.add(k);
      }
    }
    localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function unDismissIncomeMerchant(name: string, originalName?: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const set = getDismissedIncomeMerchants();
    for (const v of extractMerchantKeyVariants(name)) {
      set.delete(v);
    }
    if (originalName) {
      for (const v of extractMerchantKeyVariants(originalName)) {
        set.delete(v);
      }
    }
    const aliases = getMerchantAliases();
    const targetNorm = normalizeMerchantKey(name);
    for (const [k, info] of Object.entries(aliases)) {
      if (normalizeMerchantKey(info.name) === targetNorm) {
        set.delete(k);
      }
    }
    localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function getDeletedFixedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_FIXED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markFixedIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedFixedIds();
    set.add(id);
    localStorage.setItem(DELETED_FIXED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function unmarkFixedIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedFixedIds();
    if (set.delete(id)) {
      localStorage.setItem(DELETED_FIXED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore
  }
}

export function getDeletedIncomeIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_INCOME_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markIncomeIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedIncomeIds();
    set.add(id);
    localStorage.setItem(DELETED_INCOME_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function unmarkIncomeIdDeleted(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedIncomeIds();
    if (set.delete(id)) {
      localStorage.setItem(DELETED_INCOME_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore
  }
}

export interface ManualFixedOverride {
  amount?: number;
  fullAmount?: number;
  isShared?: boolean;
  dueDay?: number;
  category?: string;
  paymentMethod?: string;
  name?: string;
  receipts?: { url: string; name: string }[];
}

/**
 * Compresses an uploaded image file (receipt photo or avatar) via HTML5 Canvas
 * so Base64 strings stay small (~20-90 KB) and never exceed localStorage quotas.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.74
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Read error'));
      reader.onerror = () => reject(new Error('Read error'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Invalid file data'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function getManualFixedOverrides(): Record<string, ManualFixedOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MANUAL_FIXED_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualFixedOverride(
  name: string,
  override: ManualFixedOverride,
  previousOrOriginalName?: string,
  itemId?: string,
  skipGenericMerchantKey?: boolean
): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const map = getManualFixedOverrides();
    if (itemId) {
      map[`id:${itemId}`] = { ...(map[`id:${itemId}`] || {}), ...override };
    }
    if (!skipGenericMerchantKey) {
      const keys = new Set<string>(extractMerchantKeyVariants(name));
      if (previousOrOriginalName) {
        for (const v of extractMerchantKeyVariants(previousOrOriginalName)) {
          keys.add(v);
        }
      }
      for (const key of keys) {
        map[key] = { ...(map[key] || {}), ...override };
      }
    }
    localStorage.setItem(MANUAL_FIXED_OVERRIDES_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export interface ManualIncomeOverride {
  amount?: number;
  payday?: number;
  category?: string;
  name?: string;
}

export function getManualIncomeOverrides(): Record<string, ManualIncomeOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MANUAL_INCOME_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualIncomeOverride(
  name: string,
  override: ManualIncomeOverride,
  previousOrOriginalName?: string,
  itemId?: string,
  skipGenericMerchantKey?: boolean
): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    const map = getManualIncomeOverrides();
    if (itemId) {
      map[`id:${itemId}`] = { ...(map[`id:${itemId}`] || {}), ...override };
    }
    if (!skipGenericMerchantKey) {
      const keys = new Set<string>(extractMerchantKeyVariants(name));
      if (previousOrOriginalName) {
        for (const v of extractMerchantKeyVariants(previousOrOriginalName)) {
          keys.add(v);
        }
      }
      for (const key of keys) {
        map[key] = { ...(map[key] || {}), ...override };
      }
    }
    localStorage.setItem(MANUAL_INCOME_OVERRIDES_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
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
    syncAllUserPreferencesToSupabase();
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
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function isTransactionManuallyExcluded(id: string): boolean {
  if (!id) return false;
  return getExcludedTransactionIds().has(id);
}

// --- Custom Categories & Payment Methods Persistence ---
const CUSTOM_EXPENSE_CATEGORIES_KEY = 'dejz_custom_expense_categories_v2';
const CUSTOM_INCOME_CATEGORIES_KEY = 'dejz_custom_income_categories_v2';
const CATEGORY_REMAP_KEY = 'dejz_category_remap_v1';
const CUSTOM_PAYMENT_METHODS_KEY = 'dejz_custom_payment_methods_v1';

export interface PaymentMethodItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

const DEFAULT_PAYMENT_METHODS_LIST: PaymentMethodItem[] = [
  { id: 'autogiro', name: 'Autogiro', icon: 'refresh', color: '#6366F1' },
  { id: 'kort', name: 'Kort', icon: 'credit-card', color: '#EC4899' },
  { id: 'efaktura', name: 'E-faktura', icon: 'file-text', color: '#3B82F6' },
  { id: 'faktura', name: 'Faktura', icon: 'receipt', color: '#F59E0B' },
  { id: 'swish', name: 'Swish', icon: 'smartphone', color: '#10B981' },
  { id: 'klarna', name: 'Klarna', icon: 'shopping-bag', color: '#F472B6' },
  { id: 'kivra', name: 'Kivra', icon: 'envelope', color: '#13C5A6' },
  { id: 'apple-pay', name: 'Apple Pay', icon: 'device-mobile', color: '#374151' },
  { id: 'bankgiro', name: 'Bankgiro / Plusgiro', icon: 'bank', color: '#8B5CF6' },
  { id: 'overforing', name: 'Överföring', icon: 'arrows-left-right', color: '#0EA5E9' },
];

const LEGACY_EXPENSE_CATEGORY_SYNONYMS: Record<string, string> = {
  'mat & dagligvaror': 'Mat & dryck',
  'mat & dryck': 'Mat & dryck',
  'mat': 'Mat & dryck',
  'livsmedel': 'Mat & dryck',
  'restaurang & café': 'Mat & dryck',
  'restaurang': 'Mat & dryck',
  'café': 'Mat & dryck',
  'uteliv': 'Mat & dryck',
  'boende & hushåll': 'Boende',
  'hemmet': 'Boende',
  'hushåll': 'Boende',
  'nöje & fritid': 'Nöje',
  'nöjen': 'Nöje',
  'underhållning': 'Nöje',
  'hälsa & träning': 'Hälsa',
  'träning': 'Hälsa',
  'försäkringar': 'Försäkring',
  'streaming': 'Abonnemang',
  'lån': 'Räkningar',
  'bilen': 'Transport',
  'kläder': 'Shopping',
  'elektronik': 'Shopping',
};

const LEGACY_INCOME_CATEGORY_SYNONYMS: Record<string, string> = {
  'lön': 'Lön',
  'inkomst': 'Lön',
  'extra / frilans': 'Lön',
  'bidrag & ersättning': 'Bidrag',
  'csn': 'Bidrag',
  'försäkringskassan': 'Bidrag',
  'barnbidrag': 'Bidrag',
  'swish / överföring': 'Swish',
  'utdelning': 'Övrigt',
  'ränta': 'Övrigt',
};

export function getCategoryRemap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CATEGORY_REMAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCategoryRemapRule(oldName: string, newName: string): void {
  if (typeof window === 'undefined' || !oldName || !newName) return;
  try {
    const map = getCategoryRemap();
    const oldKey = oldName.toLowerCase().trim();
    // Update any existing rule that pointed to oldName so chains flatten
    for (const [k, v] of Object.entries(map)) {
      if (v.toLowerCase().trim() === oldKey) {
        map[k] = newName;
      }
    }
    map[oldKey] = newName;
    localStorage.setItem(CATEGORY_REMAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function clearCategoryRemap(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CATEGORY_REMAP_KEY);
  } catch {
    // ignore
  }
}

export function getStoredExpenseCategories(): Category[] {
  if (typeof window === 'undefined') return DEFAULT_EXPENSE_CATEGORIES;
  try {
    const raw = localStorage.getItem(CUSTOM_EXPENSE_CATEGORIES_KEY);
    if (!raw) return DEFAULT_EXPENSE_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_EXPENSE_CATEGORIES;
    // Ensure 'Övrigt' always exists as a fallback category
    const hasOvrigt = parsed.some((c: Category) => c.name.toLowerCase().trim() === 'övrigt');
    if (!hasOvrigt) {
      parsed.push({ id: 'ovrigt', name: 'Övrigt', icon: 'tag', color: '#7C8392' });
    }
    return parsed;
  } catch {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
}

export function saveStoredExpenseCategories(cats: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_EXPENSE_CATEGORIES_KEY, JSON.stringify(cats));
    syncAllUserPreferencesToSupabase();
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
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_INCOME_CATEGORIES;
    const hasOvrigt = parsed.some((c: Category) => c.name.toLowerCase().trim() === 'övrigt');
    if (!hasOvrigt) {
      parsed.push({ id: 'ovrigt-in', name: 'Övrigt', icon: 'wallet', color: '#7C8392' });
    }
    return parsed;
  } catch {
    return DEFAULT_INCOME_CATEGORIES;
  }
}

export function saveStoredIncomeCategories(cats: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_INCOME_CATEGORIES_KEY, JSON.stringify(cats));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

/**
 * Ensures any category name on a transaction, fixed expense, or income
 * maps to a valid category that actually exists in the user's Settings.
 * If the category was renamed, maps to the new name.
 * If the category was deleted or is unknown, maps to 'Övrigt'.
 */
export function normalizeCategoryToValid(
  rawCategory: string | undefined | null,
  type: 'expense' | 'income' = 'expense',
  expenseCatsOverride?: Category[],
  incomeCatsOverride?: Category[]
): string {
  const validList =
    type === 'income'
      ? incomeCatsOverride || getStoredIncomeCategories()
      : expenseCatsOverride || getStoredExpenseCategories();

  const fallback =
    validList.find((c) => c.name.toLowerCase().trim() === 'övrigt')?.name ||
    validList[validList.length - 1]?.name ||
    'Övrigt';

  if (!rawCategory || !rawCategory.trim()) return fallback;

  const trimmed = rawCategory.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check user-defined rename/delete remap rules first
  const remap = getCategoryRemap();
  const remappedTarget = remap[lower];
  if (remappedTarget) {
    const foundRemapped = validList.find(
      (c) => c.name.toLowerCase().trim() === remappedTarget.toLowerCase().trim()
    );
    if (foundRemapped) return foundRemapped.name;
  }

  // 2. Direct match in user's current category list
  const directMatch = validList.find((c) => c.name.toLowerCase().trim() === lower);
  if (directMatch) return directMatch.name;

  // 3. Synonym / legacy name mapping
  const synonymMap =
    type === 'income' ? LEGACY_INCOME_CATEGORY_SYNONYMS : LEGACY_EXPENSE_CATEGORY_SYNONYMS;
  const canonicalName = synonymMap[lower];
  if (canonicalName) {
    const canonicalLower = canonicalName.toLowerCase();
    // Check if canonical name was itself renamed by the user
    const remappedCanonical = remap[canonicalLower];
    if (remappedCanonical) {
      const foundrc = validList.find(
        (c) => c.name.toLowerCase().trim() === remappedCanonical.toLowerCase().trim()
      );
      if (foundrc) return foundrc.name;
    }
    const foundCanonical = validList.find(
      (c) => c.name.toLowerCase().trim() === canonicalLower
    );
    if (foundCanonical) return foundCanonical.name;
  }

  return fallback;
}

/**
 * Updates all stored manual overrides and merchant aliases when a category is renamed or deleted.
 */
export function propagateCategoryChangeInCache(oldName: string, newName: string): void {
  if (typeof window === 'undefined' || !oldName || !newName) return;
  const oldLower = oldName.toLowerCase().trim();
  saveCategoryRemapRule(oldName, newName);

  try {
    // 1. Merchant aliases
    const aliases = getMerchantAliases();
    let aliasesChanged = false;
    for (const [k, v] of Object.entries(aliases)) {
      if (v.category && v.category.toLowerCase().trim() === oldLower) {
        aliases[k] = { ...v, category: newName };
        aliasesChanged = true;
      }
    }
    if (aliasesChanged) {
      localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(aliases));
    }

    // 2. Manual fixed overrides
    const fixedOverrides = getManualFixedOverrides();
    let fixedChanged = false;
    for (const [k, v] of Object.entries(fixedOverrides)) {
      if (v.category && v.category.toLowerCase().trim() === oldLower) {
        fixedOverrides[k] = { ...v, category: newName };
        fixedChanged = true;
      }
    }
    if (fixedChanged) {
      localStorage.setItem(MANUAL_FIXED_OVERRIDES_KEY, JSON.stringify(fixedOverrides));
    }

    // 3. Manual income overrides
    const incOverrides = getManualIncomeOverrides();
    let incChanged = false;
    for (const [k, v] of Object.entries(incOverrides)) {
      if (v.category && v.category.toLowerCase().trim() === oldLower) {
        incOverrides[k] = { ...v, category: newName };
        incChanged = true;
      }
    }
    if (incChanged) {
      localStorage.setItem(MANUAL_INCOME_OVERRIDES_KEY, JSON.stringify(incOverrides));
    }

    // 4. Per-transaction custom category metadata
    const txMeta = getTransactionMetaMap();
    let metaChanged = false;
    for (const [k, v] of Object.entries(txMeta)) {
      if (v.customCategory && v.customCategory.toLowerCase().trim() === oldLower) {
        txMeta[k] = { ...v, customCategory: newName };
        metaChanged = true;
      }
    }
    if (metaChanged) {
      localStorage.setItem(TRANSACTION_META_KEY, JSON.stringify(txMeta));
    }
  } catch {
    // ignore
  }
}

// --- Payment Methods Persistence ---
export function getStoredPaymentMethods(): PaymentMethodItem[] {
  if (typeof window === 'undefined') return DEFAULT_PAYMENT_METHODS_LIST;
  try {
    const raw = localStorage.getItem(CUSTOM_PAYMENT_METHODS_KEY);
    if (!raw) return DEFAULT_PAYMENT_METHODS_LIST;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PAYMENT_METHODS_LIST;
  } catch {
    return DEFAULT_PAYMENT_METHODS_LIST;
  }
}

export function saveStoredPaymentMethods(methods: PaymentMethodItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_PAYMENT_METHODS_KEY, JSON.stringify(methods));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

// --- Show Accounts Eye Toggle Persistence (Totalt saldo i Hemfliken) ---
export function getShowAccountsOnHome(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(SHOW_ACCOUNTS_ON_HOME_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

export function setShowAccountsOnHome(show: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHOW_ACCOUNTS_ON_HOME_KEY, String(show));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

const TRANSACTION_META_KEY = 'dejz_transaction_meta_v1';
const CATEGORY_BUDGETS_KEY = 'dejz_category_budgets_v1';
const SAVINGS_GOALS_KEY = 'dejz_savings_goals_v1';
const REVIEWED_TX_IDS_KEY = 'dejz_reviewed_tx_ids_v1';
const PRIVACY_BLUR_KEY = 'dejz_privacy_blur_v1';

export interface SavingsGoalActivity {
  id: string;
  text: string;
  date: string;
  amount?: number;
}

export interface SavingsGoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  artworkId?: string;
  customImageUrl?: string;
  createdAt?: string;
  activities?: SavingsGoalActivity[];
}

export function getSavingsGoals(): SavingsGoalItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVINGS_GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavingsGoals(goals: SavingsGoalItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(goals));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export interface TransactionMetaPatch {
  customTitle?: string;
  customCategory?: string;
  isHearted?: boolean;
  isWaitingForPackage?: boolean;
  isWaitingForSwish?: boolean;
  pendingSwishAmount?: number;
  pendingSwishRecipient?: string;
  receiptUrl?: string;
  receiptName?: string;
  receipts?: { url: string; name: string }[];
  paymentMethod?: string;
  note?: string;
  customAmount?: number;
  originalAmount?: number;
  linkedSwishTxId?: string;
}

export function getTransactionMetaMap(): Record<string, TransactionMetaPatch> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TRANSACTION_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTransactionMeta(id: string, patch: TransactionMetaPatch): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const map = getTransactionMetaMap();
    map[id] = { ...(map[id] || {}), ...patch };
    localStorage.setItem(TRANSACTION_META_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

// --- Category Budgets Persistence ---
export function getCategoryBudgets(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CATEGORY_BUDGETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCategoryBudget(category: string, amount: number | null): void {
  if (typeof window === 'undefined' || !category) return;
  try {
    const map = getCategoryBudgets();
    if (amount === null || amount <= 0 || Number.isNaN(amount)) {
      delete map[category];
    } else {
      map[category] = Math.round(amount);
    }
    localStorage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

// --- Reviewed Transactions Inbox Persistence ---
export function getReviewedTransactionIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(REVIEWED_TX_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function hasInitializedReviewedTransactions(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(REVIEWED_TX_IDS_KEY) !== null;
}

export function markTransactionsReviewed(ids: string[]): void {
  if (typeof window === 'undefined' || !ids || ids.length === 0) return;
  try {
    const set = getReviewedTransactionIds();
    for (const id of ids) {
      if (id) set.add(id);
    }
    localStorage.setItem(REVIEWED_TX_IDS_KEY, JSON.stringify(Array.from(set)));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

// --- Privacy Blur Mode ---
export function getPrivacyBlurMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PRIVACY_BLUR_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPrivacyBlurMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRIVACY_BLUR_KEY, String(enabled));
  } catch {
    // ignore
  }
}

// --- Full Supabase Sync & Hydration for All User Choices ---
export function collectAllUserPreferences(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  const safeParse = (key: string, fallback: any) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const cachedApp = loadCachedAppState();
  return {
    showAccountsOnHome: getShowAccountsOnHome(),
    excludeInternalTransfers: getExcludeInternalTransfers(),
    excludedTransactionIds: Array.from(getExcludedTransactionIds()),
    dismissedFixedMerchants: Array.from(getDismissedFixedMerchants()),
    dismissedIncomeMerchants: Array.from(getDismissedIncomeMerchants()),
    deletedFixedIds: Array.from(getDeletedFixedIds()),
    deletedIncomeIds: Array.from(getDeletedIncomeIds()),
    savedFixedExpenses: Array.isArray(cachedApp?.fixedExpenses) ? cachedApp!.fixedExpenses : [],
    savedIncomes: Array.isArray(cachedApp?.incomes) ? cachedApp!.incomes : [],
    manualFixedOverrides: getManualFixedOverrides(),
    manualIncomeOverrides: getManualIncomeOverrides(),
    merchantAliasesV3: getMerchantAliases(),
    categoryRemap: getCategoryRemap(),
    customExpenseCategories: getStoredExpenseCategories(),
    customIncomeCategories: getStoredIncomeCategories(),
    customPaymentMethods: getStoredPaymentMethods(),
    transactionMeta: getTransactionMetaMap(),
    categoryBudgets: getCategoryBudgets(),
    savingsGoals: getSavingsGoals(),
    reviewedTransactionIds: Array.from(getReviewedTransactionIds()),
    mySwishPhone: localStorage.getItem('dejz_my_swish_phone') || '',
    swishContacts: safeParse('dejz_swish_contacts', []),
    weekendHandling: localStorage.getItem('dejz_weekend_handling') || 'before',
    darkMode: localStorage.getItem('dejz_dark_mode') || 'light',
    updatedAt: new Date().toISOString(),
  };
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function cancelPendingPreferenceSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}

export function clearAllLocalAppData(preserveTheme = false): void {
  cancelPendingPreferenceSync();
  if (typeof window === 'undefined') return;
  try {
    if (!preserveTheme) {
      // Vid permanent kontoradering: rensa ALLT i localStorage och sessionStorage så att inte ett enda spår finns kvar
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('dejz_logged_out', 'true');
      return;
    }

    const savedTheme = localStorage.getItem('dejz_dark_mode');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('dejz_') ||
        key.startsWith('user_settings_') ||
        key.startsWith('demo_')
      ) {
        localStorage.removeItem(key);
      }
    }
    if (savedTheme) {
      localStorage.setItem('dejz_dark_mode', savedTheme);
    }
  } catch {
    // ignore storage errors
  }
}

export function syncAllUserPreferencesToSupabase(immediate = false): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem('dejz_logged_out') === 'true') {
      cancelPendingPreferenceSync();
      return;
    }
  } catch {
    // ignore
  }
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  const performSync = async () => {
    try {
      if (localStorage.getItem('dejz_logged_out') === 'true') return;
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id;
      if (!uid) return;
      const prefs = collectAllUserPreferences();
      const payload: Record<string, any> = {
        user_preferences: prefs,
        show_accounts_on_home: prefs.showAccountsOnHome,
        exclude_internal_transfers: prefs.excludeInternalTransfers,
        my_swish_phone: prefs.mySwishPhone,
        swish_contacts: prefs.swishContacts,
        categories: prefs.customExpenseCategories,
        income_categories: prefs.customIncomeCategories,
      };
      // Attempt full update; fallback to user_preferences or base columns if some columns aren't migrated yet
      const { error } = await supabase.from('profiles').update(payload).eq('id', uid);
      if (error) {
        await supabase
          .from('profiles')
          .update({
            user_preferences: prefs,
          })
          .eq('id', uid);
      }
    } catch {
      // ignore offline or schema error
    }
  };

  if (immediate) {
    void performSync();
  } else {
    syncTimeout = setTimeout(() => {
      syncTimeout = null;
      void performSync();
    }, 300);
  }
}

export function extractSavedFixedFromProfile(profile: any): FixedExpenseItem[] {
  if (!profile || typeof profile !== 'object') return [];
  const prefs =
    profile.user_preferences && typeof profile.user_preferences === 'object'
      ? profile.user_preferences
      : {};
  return Array.isArray(prefs.savedFixedExpenses) ? prefs.savedFixedExpenses : [];
}

export function extractSavedIncomesFromProfile(profile: any): IncomeItem[] {
  if (!profile || typeof profile !== 'object') return [];
  const prefs =
    profile.user_preferences && typeof profile.user_preferences === 'object'
      ? profile.user_preferences
      : {};
  return Array.isArray(prefs.savedIncomes) ? prefs.savedIncomes : [];
}

export function hydrateAllUserPreferencesFromProfile(profile: any): void {
  if (typeof window === 'undefined' || !profile || typeof profile !== 'object') return;
  try {
    const prefs =
      profile.user_preferences && typeof profile.user_preferences === 'object'
        ? profile.user_preferences
        : {};

    const showAcc =
      typeof profile.show_accounts_on_home === 'boolean'
        ? profile.show_accounts_on_home
        : typeof prefs.showAccountsOnHome === 'boolean'
        ? prefs.showAccountsOnHome
        : null;
    if (showAcc !== null && localStorage.getItem(SHOW_ACCOUNTS_ON_HOME_KEY) === null) {
      localStorage.setItem(SHOW_ACCOUNTS_ON_HOME_KEY, String(showAcc));
    }

    const exclTransfers =
      typeof profile.exclude_internal_transfers === 'boolean'
        ? profile.exclude_internal_transfers
        : typeof prefs.excludeInternalTransfers === 'boolean'
        ? prefs.excludeInternalTransfers
        : null;
    if (exclTransfers !== null && localStorage.getItem(EXCLUDE_INTERNAL_TRANSFERS_KEY) === null) {
      localStorage.setItem(EXCLUDE_INTERNAL_TRANSFERS_KEY, String(exclTransfers));
    }

    const swishPhone = profile.my_swish_phone || prefs.mySwishPhone;
    if (swishPhone && !localStorage.getItem('dejz_my_swish_phone')) {
      localStorage.setItem('dejz_my_swish_phone', String(swishPhone));
    }

    const swishContacts = Array.isArray(profile.swish_contacts)
      ? profile.swish_contacts
      : Array.isArray(prefs.swishContacts)
      ? prefs.swishContacts
      : null;
    if (swishContacts && swishContacts.length > 0 && !localStorage.getItem('dejz_swish_contacts')) {
      localStorage.setItem('dejz_swish_contacts', JSON.stringify(swishContacts));
    }

    if (Array.isArray(prefs.excludedTransactionIds) && !localStorage.getItem(EXCLUDED_TX_IDS_KEY)) {
      localStorage.setItem(EXCLUDED_TX_IDS_KEY, JSON.stringify(prefs.excludedTransactionIds));
    }
    if (Array.isArray(prefs.dismissedFixedMerchants) && !localStorage.getItem(DISMISSED_FIXED_KEY)) {
      localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(prefs.dismissedFixedMerchants));
    }
    if (Array.isArray(prefs.dismissedIncomeMerchants) && !localStorage.getItem(DISMISSED_INCOME_KEY)) {
      localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(prefs.dismissedIncomeMerchants));
    }
    if (Array.isArray(prefs.deletedFixedIds) && !localStorage.getItem(DELETED_FIXED_IDS_KEY)) {
      localStorage.setItem(DELETED_FIXED_IDS_KEY, JSON.stringify(prefs.deletedFixedIds));
    }
    if (Array.isArray(prefs.deletedIncomeIds) && !localStorage.getItem(DELETED_INCOME_IDS_KEY)) {
      localStorage.setItem(DELETED_INCOME_IDS_KEY, JSON.stringify(prefs.deletedIncomeIds));
    }
    if (prefs.manualFixedOverrides && !localStorage.getItem(MANUAL_FIXED_OVERRIDES_KEY)) {
      localStorage.setItem(MANUAL_FIXED_OVERRIDES_KEY, JSON.stringify(prefs.manualFixedOverrides));
    }
    if (prefs.manualIncomeOverrides && !localStorage.getItem(MANUAL_INCOME_OVERRIDES_KEY)) {
      localStorage.setItem(MANUAL_INCOME_OVERRIDES_KEY, JSON.stringify(prefs.manualIncomeOverrides));
    }
    if (prefs.merchantAliasesV3 && !localStorage.getItem(MERCHANT_ALIASES_KEY)) {
      localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(prefs.merchantAliasesV3));
    }
    if (prefs.categoryRemap && !localStorage.getItem(CATEGORY_REMAP_KEY)) {
      localStorage.setItem(CATEGORY_REMAP_KEY, JSON.stringify(prefs.categoryRemap));
    }
    if (prefs.transactionMeta && !localStorage.getItem(TRANSACTION_META_KEY)) {
      localStorage.setItem(TRANSACTION_META_KEY, JSON.stringify(prefs.transactionMeta));
    }
    if (prefs.categoryBudgets && !localStorage.getItem(CATEGORY_BUDGETS_KEY)) {
      localStorage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(prefs.categoryBudgets));
    }
    if (Array.isArray(prefs.savingsGoals) && !localStorage.getItem(SAVINGS_GOALS_KEY)) {
      localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(prefs.savingsGoals));
    }
    if (Array.isArray(prefs.reviewedTransactionIds) && !localStorage.getItem(REVIEWED_TX_IDS_KEY)) {
      localStorage.setItem(REVIEWED_TX_IDS_KEY, JSON.stringify(prefs.reviewedTransactionIds));
    }
    if (
      Array.isArray(prefs.customExpenseCategories) &&
      prefs.customExpenseCategories.length > 0 &&
      !localStorage.getItem(CUSTOM_EXPENSE_CATEGORIES_KEY)
    ) {
      localStorage.setItem(
        CUSTOM_EXPENSE_CATEGORIES_KEY,
        JSON.stringify(prefs.customExpenseCategories)
      );
    }
    if (
      Array.isArray(prefs.customIncomeCategories) &&
      prefs.customIncomeCategories.length > 0 &&
      !localStorage.getItem(CUSTOM_INCOME_CATEGORIES_KEY)
    ) {
      localStorage.setItem(
        CUSTOM_INCOME_CATEGORIES_KEY,
        JSON.stringify(prefs.customIncomeCategories)
      );
    }
    if (
      Array.isArray(prefs.customPaymentMethods) &&
      prefs.customPaymentMethods.length > 0 &&
      !localStorage.getItem(CUSTOM_PAYMENT_METHODS_KEY)
    ) {
      localStorage.setItem(
        CUSTOM_PAYMENT_METHODS_KEY,
        JSON.stringify(prefs.customPaymentMethods)
      );
    }
  } catch {
    // ignore
  }
}


