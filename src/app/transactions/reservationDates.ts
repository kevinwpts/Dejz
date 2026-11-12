// Sparade köpdatum från reservationer (localStorage) och bankradens faktiska betaldatum.
import type { BankTransactionItem } from '../../services/bankService';
import { getActualBankPaymentDateAndMeta } from '../../utils/swedishDate';

export const RESERVATION_PURCHASE_DATES_KEY = 'dejz_reservation_purchase_dates_v1';

export function getSavedReservationPurchaseDates(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RESERVATION_PURCHASE_DATES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveReservationPurchaseDate(txId: string, purchaseDate: string): void {
  if (typeof window === 'undefined' || !txId || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) return;
  try {
    const map = getSavedReservationPurchaseDates();
    const cleanId = txId.startsWith('bank-') ? txId : `bank-${txId}`;
    if (map[cleanId] === purchaseDate) return;
    map[cleanId] = purchaseDate;
    localStorage.setItem(RESERVATION_PURCHASE_DATES_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export function getActualTransactionDate(bt: BankTransactionItem): string {
  return getActualBankPaymentDateAndMeta(bt).paymentDate;
}
