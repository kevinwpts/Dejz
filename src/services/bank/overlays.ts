// Lokala tillägg (i localStorage) för bankkonton och avstämning av banktransaktioner.
import type { BankAccount, BankTransactionItem } from './types';
import { compactBankTxRawJson } from './rawJson';

const LOCAL_ACCOUNT_OVERLAY_KEY = 'dejz_bank_accounts_overlay_v1';
const LOCAL_TX_RECONCILIATION_OVERLAY_KEY = 'dejz_bank_tx_reconciliation_overlay_v1';

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export function getAccountOverlayMap(): Record<string, Partial<BankAccount>> {
  return readJsonStorage<Record<string, Partial<BankAccount>>>(LOCAL_ACCOUNT_OVERLAY_KEY, {});
}

export function saveAccountOverlay(accountId: string, patch: Partial<BankAccount>): void {
  const map = getAccountOverlayMap();
  map[accountId] = { ...(map[accountId] || {}), ...patch };
  writeJsonStorage(LOCAL_ACCOUNT_OVERLAY_KEY, map);
}

export function mergeAccountWithOverlay(acc: BankAccount): BankAccount {
  const overlay = getAccountOverlayMap()[acc.id];
  const merged = overlay ? { ...acc, ...overlay } : { ...acc };
  if (merged.include_in_budget === undefined) {
    merged.include_in_budget = Boolean(merged.is_selected);
  }
  if (merged.has_incomplete_history === undefined) {
    merged.has_incomplete_history = Boolean(merged.continuation_key);
  }
  return merged;
}

export function getTxReconciliationOverlayMap(): Record<string, Partial<BankTransactionItem>> {
  return readJsonStorage<Record<string, Partial<BankTransactionItem>>>(
    LOCAL_TX_RECONCILIATION_OVERLAY_KEY,
    {}
  );
}

export function saveTxReconciliationOverlay(
  bankTxId: string,
  patch: Partial<BankTransactionItem>
): void {
  const map = getTxReconciliationOverlayMap();
  map[bankTxId] = { ...(map[bankTxId] || {}), ...patch };
  writeJsonStorage(LOCAL_TX_RECONCILIATION_OVERLAY_KEY, map);
}

export function mergeTxWithReconciliationOverlay(tx: BankTransactionItem): BankTransactionItem {
  const compactedTx = tx.raw_json ? { ...tx, raw_json: compactBankTxRawJson(tx.raw_json) } : tx;
  const overlay = getTxReconciliationOverlayMap()[compactedTx.id];
  if (!overlay) return compactedTx;
  // Prefer DB reconciliation_status if it's already non-unprocessed and newer, otherwise merge overlay
  if (
    compactedTx.reconciliation_status &&
    compactedTx.reconciliation_status !== 'unprocessed' &&
    compactedTx.user_decision_at &&
    overlay.user_decision_at &&
    compactedTx.user_decision_at >= overlay.user_decision_at
  ) {
    return compactedTx;
  }
  return { ...compactedTx, ...overlay };
}
