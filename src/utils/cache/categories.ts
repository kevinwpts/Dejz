/** Kategorier, betalsätt, undantagna köp och vad som visas på hemskärmen. */
import { Category } from '../../types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../constants';
import { syncAllUserPreferencesToSupabase } from './preferencesSync';
import { MANUAL_FIXED_OVERRIDES_KEY, MANUAL_INCOME_OVERRIDES_KEY, MERCHANT_ALIASES_KEY, getManualFixedOverrides, getManualIncomeOverrides, getMerchantAliases } from './merchants';
import { TRANSACTION_META_KEY, getTransactionMetaMap } from './itemMeta';
import { SHOW_ACCOUNTS_ON_HOME_KEY } from './appState';

// --- Exclude Internal Transfers & Manual Transaction Exclusions ---
export const EXCLUDE_INTERNAL_TRANSFERS_KEY = 'dejz_exclude_internal_transfers_v1';

export const EXCLUDED_TX_IDS_KEY = 'dejz_excluded_transaction_ids_v1';

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
export const CUSTOM_EXPENSE_CATEGORIES_KEY = 'dejz_custom_expense_categories_v2';

export const CUSTOM_INCOME_CATEGORIES_KEY = 'dejz_custom_income_categories_v2';

export const CATEGORY_REMAP_KEY = 'dejz_category_remap_v1';

export const CUSTOM_PAYMENT_METHODS_KEY = 'dejz_custom_payment_methods_v1';

export interface PaymentMethodItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
  isCustom?: boolean;
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

// --- Show Accounts & Budget Breakdown Toggle Persistence (Hemfliken) ---
const SHOW_BUDGET_BREAKDOWN_ON_HOME_KEY = 'dejz_show_budget_breakdown_on_home';

// Standard: inkomst, fasta och rörligt visas i hemkortet (kan fällas ihop med ett tryck).
export function getShowBudgetBreakdownOnHome(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(SHOW_BUDGET_BREAKDOWN_ON_HOME_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

export function setShowBudgetBreakdownOnHome(show: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHOW_BUDGET_BREAKDOWN_ON_HOME_KEY, String(show));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

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
