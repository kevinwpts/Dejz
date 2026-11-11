/** Extra uppgifter per köp och konto, sparmål, kategoribudgetar, granskade köp och sekretessläge. */
import { syncAllUserPreferencesToSupabase } from './preferencesSync';
import { runSwishBulkRenameCleanupOnce } from './merchants';

export const TRANSACTION_META_KEY = 'dejz_transaction_meta_v1';

export const ACCOUNT_META_KEY = 'dejz_account_meta_v1';

export const CATEGORY_BUDGETS_KEY = 'dejz_category_budgets_v1';

export const SAVINGS_GOALS_KEY = 'dejz_savings_goals_v1';

export const REVIEWED_TX_IDS_KEY = 'dejz_reviewed_tx_ids_v1';

const PRIVACY_BLUR_KEY = 'dejz_privacy_blur_v1';

export interface AccountMetaPatch {
  customName?: string;
  excludeFromTotalBalance?: boolean;
}

export function getAccountMetaMap(): Record<string, AccountMetaPatch> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACCOUNT_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAccountMeta(accountId: string, patch: AccountMetaPatch): void {
  if (typeof window === 'undefined' || !accountId) return;
  try {
    const map = getAccountMetaMap();
    const existing = map[accountId] || {};
    const merged: AccountMetaPatch = { ...existing, ...patch };
    if (merged.customName !== undefined && !merged.customName.trim()) {
      delete merged.customName;
    }
    map[accountId] = merged;
    localStorage.setItem(ACCOUNT_META_KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export interface SavingsGoalActivity {
  id: string;
  text: string;
  date: string;
  amount?: number;
  authorInitials?: string;
  authorName?: string;
}

export interface SavingsGoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  isShared?: boolean;
  linkedAccountId?: string;
  linkedAccountName?: string;
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
    window.dispatchEvent(new CustomEvent('dejz:goals-updated'));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export interface TransactionMetaPatch {
  customTitle?: string;
  originalTitle?: string;
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
  linkedFixedExpenseId?: string;
  linkedIncomeId?: string;
  isSharedExpense?: boolean;
}

const RECEIPTS_VAULT_KEY = 'dejz_receipts_vault_v1';

interface ReceiptVaultEntry {
  receiptUrl?: string;
  receiptName?: string;
  receipts?: { url: string; name: string }[];
}

function getReceiptsVaultMap(): Record<string, ReceiptVaultEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RECEIPTS_VAULT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getTransactionMetaMap(): Record<string, TransactionMetaPatch> {
  if (typeof window === 'undefined') return {};
  runSwishBulkRenameCleanupOnce();
  try {
    const raw = localStorage.getItem(TRANSACTION_META_KEY);
    const baseMap: Record<string, TransactionMetaPatch> = raw ? JSON.parse(raw) : {};
    const vaultMap = getReceiptsVaultMap();
    for (const [id, rEntry] of Object.entries(vaultMap)) {
      if (rEntry) {
        baseMap[id] = { ...(baseMap[id] || {}), ...rEntry };
      }
    }
    return baseMap;
  } catch {
    return {};
  }
}

export function getLightweightTransactionMetaMapForSync(): Record<string, TransactionMetaPatch> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TRANSACTION_META_KEY);
    const baseMap: Record<string, TransactionMetaPatch> = raw ? JSON.parse(raw) : {};
    const lightMap: Record<string, TransactionMetaPatch> = {};
    for (const [id, entry] of Object.entries(baseMap)) {
      if (!entry || typeof entry !== 'object') continue;
      const { receiptUrl, receiptName, receipts, ...rest } = entry;
      // Keep non-Base64 external receipt URLs if any, strip bulky inline data:image strings from general pref payload
      const cleanEntry: TransactionMetaPatch = { ...rest };
      if (receiptUrl && !receiptUrl.startsWith('data:')) {
        cleanEntry.receiptUrl = receiptUrl;
        cleanEntry.receiptName = receiptName;
      }
      if (Array.isArray(receipts)) {
        const externalOnly = receipts.filter((r) => r?.url && !r.url.startsWith('data:'));
        if (externalOnly.length > 0) {
          cleanEntry.receipts = externalOnly;
        }
      }
      if (Object.keys(cleanEntry).length > 0) {
        lightMap[id] = cleanEntry;
      }
    }
    return lightMap;
  } catch {
    return {};
  }
}

export function saveTransactionMeta(id: string, patch: TransactionMetaPatch): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const raw = localStorage.getItem(TRANSACTION_META_KEY);
    const baseMap: Record<string, TransactionMetaPatch> = raw ? JSON.parse(raw) : {};
    const merged: TransactionMetaPatch = { ...(baseMap[id] || {}), ...patch };

    // Separate Base64 receipt attachments into RECEIPTS_VAULT_KEY so TRANSACTION_META_KEY stays fast & compact
    if (
      patch.receipts !== undefined ||
      patch.receiptUrl !== undefined ||
      patch.receiptName !== undefined
    ) {
      const vault = getReceiptsVaultMap();
      if (merged.receipts && merged.receipts.length > 0) {
        vault[id] = {
          receiptUrl: merged.receiptUrl || merged.receipts[0]?.url,
          receiptName: merged.receiptName || merged.receipts[0]?.name,
          receipts: merged.receipts,
        };
      } else if (merged.receiptUrl) {
        vault[id] = {
          receiptUrl: merged.receiptUrl,
          receiptName: merged.receiptName,
        };
      } else {
        delete vault[id];
      }
      try {
        localStorage.setItem(RECEIPTS_VAULT_KEY, JSON.stringify(vault));
      } catch {
        // ignore quota errors
      }
    }

    const { receiptUrl: _ru, receiptName: _rn, receipts: _rc, ...lightPatch } = merged;
    if (Object.keys(lightPatch).length > 0) {
      baseMap[id] = lightPatch;
    } else {
      delete baseMap[id];
    }

    localStorage.setItem(TRANSACTION_META_KEY, JSON.stringify(baseMap));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

/**
 * Permanently copies any user metadata (customTitle, customCategory, note, receipts, Swish split, heart, package)
 * from a replaced pending transaction ID (`bank-${pendingId}`) to the settled booked transaction ID (`bank-${bookedId}`).
 */
export function migratePendingMetaToBooked(pendingTxId: string, bookedTxId: string): void {
  if (typeof window === 'undefined' || !pendingTxId || !bookedTxId || pendingTxId === bookedTxId) {
    return;
  }
  try {
    const fullMap = getTransactionMetaMap();
    const pendingMeta = fullMap[pendingTxId];
    if (!pendingMeta || Object.keys(pendingMeta).length === 0) return;

    const existingBookedMeta = fullMap[bookedTxId] || {};
    const needsMigration = Object.keys(pendingMeta).some(
      (k) => existingBookedMeta[k as keyof typeof existingBookedMeta] === undefined
    );
    if (needsMigration) {
      saveTransactionMeta(bookedTxId, {
        ...pendingMeta,
        ...existingBookedMeta,
      });
    }
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
