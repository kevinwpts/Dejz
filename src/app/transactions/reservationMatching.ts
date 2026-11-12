// Kopplar reservationer (PDNG/HOLD) till sina bokförda rader så att köpdatum, tid och butik ärvs.
import { bankService } from '../../services/bankService';
import { BankTransactionItem } from '../../services/bank/types';
import { categorizeBankTransactionForApp } from '../../utils/bankAnalysis/merchantRules';
import { getNormalizedBankTxAmount } from '../../utils/bankAnalysis/normalization/amount';
import { isGenericPlaceholderMerchant } from '../../utils/cache/merchants';
import { getActualTransactionDate, saveReservationPurchaseDate } from './reservationDates';
import { extractBankTxTime } from './bankTxTime';

interface ReservationMeta {
  purchaseDate: string;
  purchaseTime: string;
  preservedMerchant?: string;
  preservedCategory?: string;
  preservedDescription?: string;
  replacedPendingId: string;
}

export interface ReservationMatchResult {
  bookedToReservationMeta: Map<string, ReservationMeta>;
  settledPendingIds: Set<string>;
  isPendingDisappearedFromLatestSync: (bt: BankTransactionItem) => boolean;
}

export function matchReservationsToBookedTxs(
  bankTxs: BankTransactionItem[],
  rawInternalTransferIds: Set<string>,
  batchMinuteCounts: Map<string, number>
): ReservationMatchResult {
  const bookedNegativeTxs = bankTxs.filter((bt) => {
    if (bt.booking_status !== 'BOOK') return false;
    if (
      bt.reconciliation_status === 'excluded' ||
      bt.reconciliation_status === 'internal_transfer' ||
      rawInternalTransferIds.has(bt.id)
    ) {
      return false;
    }
    return getNormalizedBankTxAmount(bt) < 0;
  });

  const bookedToReservationMeta = new Map<
    string,
    {
      purchaseDate: string;
      purchaseTime: string;
      preservedMerchant?: string;
      preservedCategory?: string;
      preservedDescription?: string;
      replacedPendingId: string;
    }
  >();
  const consumedBookedIdsForPending = new Set<string>();
  const settledPendingIds = new Set<string>();

  // Beräkna senaste synkningstidpunkt per konto så att vi direkt ser vilka PDNG/HOLD-rader
  // som banken inte längre returnerar (eftersom de har övergått till bokförda BOOK-rader).
  const maxUpdatedAtByAccount = new Map<string, number>();
  for (const bt of bankTxs) {
    const accKey = bt.bank_account_id || '__default__';
    const ts = Date.parse(bt.updated_at || bt.created_at || '');
    if (Number.isFinite(ts)) {
      const prevMax = maxUpdatedAtByAccount.get(accKey) || 0;
      if (ts > prevMax) maxUpdatedAtByAccount.set(accKey, ts);
    }
  }

  const isPendingDisappearedFromLatestSync = (bt: BankTransactionItem): boolean => {
    if (
      bt.reconciliation_status === 'reserved_replaced' ||
      bt.reconciliation_status === 'reserved' ||
      Boolean(bt.replaced_by_bank_tx_id) ||
      Boolean(bt.reservation_disappeared_at)
    ) {
      return true;
    }
    const accKey = bt.bank_account_id || '__default__';
    const maxAccMs = maxUpdatedAtByAccount.get(accKey) || 0;
    const btMs = Date.parse(bt.updated_at || bt.created_at || '');
    if (maxAccMs > 0 && Number.isFinite(btMs) && maxAccMs - btMs > 45_000) {
      return true;
    }
    return false;
  };

  const normalizeBankDescForMatch = (s?: string | null): string =>
    String(s || '')
      .toLowerCase()
      .replace(/[$åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]/g, '');

  const areMerchantsCompatibleForReservation = (
    bt: BankTransactionItem,
    b: BankTransactionItem,
    pendingMerchant: string,
    bMerchant: string,
    pendingIsGeneric: boolean,
    bookedIsGeneric: boolean
  ): boolean => {
    if (
      bMerchant === pendingMerchant ||
      pendingIsGeneric ||
      bookedIsGeneric ||
      (bt.description && bt.description.toLowerCase().includes(bMerchant)) ||
      (b.description && b.description.toLowerCase().includes(pendingMerchant))
    ) {
      return true;
    }
    const normPendingDesc = normalizeBankDescForMatch(bt.description || pendingMerchant);
    const normBookedDesc = normalizeBankDescForMatch(b.description || bMerchant);
    if (normPendingDesc.length >= 6 && normBookedDesc.length >= 6) {
      const prefixLen = Math.min(8, normPendingDesc.length, normBookedDesc.length);
      if (
        normPendingDesc.slice(0, prefixLen) === normBookedDesc.slice(0, prefixLen) ||
        normPendingDesc.includes(normBookedDesc) ||
        normBookedDesc.includes(normPendingDesc)
      ) {
        return true;
      }
    }
    return false;
  };

  // Samla alla reservationer (inklusive de som övergått till bokförd transaktion)
  // så att köpdatum, klockslag, butiksnamn och användarens markeringar alltid ärvs.
  const pendingCandidates = bankTxs.filter((bt) => {
    if (bt.booking_status === 'CNCL' || bt.booking_status === 'RJCT') return false;
    if (bt.reconciliation_status === 'excluded') return false;
    const isPendingOrReplaced =
      bt.booking_status === 'PDNG' ||
      bt.booking_status === 'HOLD' ||
      bt.reconciliation_status === 'reserved_replaced' ||
      bt.reconciliation_status === 'reserved' ||
      Boolean(bt.replaced_by_bank_tx_id) ||
      Boolean(bt.reservation_disappeared_at);
    if (!isPendingOrReplaced) return false;
    return getNormalizedBankTxAmount(bt) < 0;
  });

  const recordReservationMatch = (bt: BankTransactionItem, b: BankTransactionItem) => {
    consumedBookedIdsForPending.add(b.id);
    settledPendingIds.add(bt.id);
    const pendingCatInfo = categorizeBankTransactionForApp(bt);
    const pendingMerchant = pendingCatInfo.merchant.toLowerCase().trim();
    const pendingIsGeneric = isGenericPlaceholderMerchant(pendingMerchant);
    const purchaseDate = getActualTransactionDate(bt);
    const purchaseTime = extractBankTxTime(
      bt,
      batchMinuteCounts,
      purchaseDate,
      pendingMerchant,
      pendingMerchant
    );
    if (purchaseDate) {
      saveReservationPurchaseDate(b.id, purchaseDate);
    }
    if (bt.replaced_by_bank_tx_id !== b.id) {
      void bankService.updateTransactionReconciliation(bt.id, {
        replaced_by_bank_tx_id: b.id,
        reservation_disappeared_at: bt.reservation_disappeared_at || new Date().toISOString(),
      });
    }
    bookedToReservationMeta.set(b.id, {
      purchaseDate,
      purchaseTime,
      preservedMerchant: !pendingIsGeneric ? pendingCatInfo.merchant : undefined,
      preservedCategory:
        !pendingIsGeneric && pendingCatInfo.category !== 'Övrigt'
          ? pendingCatInfo.category
          : undefined,
      preservedDescription: !isGenericPlaceholderMerchant(bt.description)
        ? bt.description || undefined
        : undefined,
      replacedPendingId: bt.id,
    });
  };

  // Pass 1: Koppla ersatta reservationer eller reservationer som har en motsvarande bokförd (BOOK) post.
  // Aktiva reservationer (PDNG/HOLD som fortfarande returneras av banken i senaste synken)
  // matchas ENDAST om det finns en nyare BOOK-rad med exakt samma belopp och samma handlare.
  for (const bt of pendingCandidates) {
    if (bt.replaced_by_bank_tx_id) {
      const explicitBooked = bookedNegativeTxs.find(
        (b) => b.id === bt.replaced_by_bank_tx_id && !consumedBookedIdsForPending.has(b.id)
      );
      if (explicitBooked) {
        recordReservationMatch(bt, explicitBooked);
        continue;
      }
    }

    if (bt.transaction_id || bt.entry_reference) {
      const exactRefBooked = bookedNegativeTxs.find(
        (b) =>
          !consumedBookedIdsForPending.has(b.id) &&
          ((bt.transaction_id && b.transaction_id === bt.transaction_id) ||
            (bt.entry_reference && b.entry_reference === bt.entry_reference))
      );
      if (exactRefBooked) {
        recordReservationMatch(bt, exactRefBooked);
        continue;
      }
    }

    const isDisappeared = isPendingDisappearedFromLatestSync(bt);
    const pendingExactAmt = Math.abs(getNormalizedBankTxAmount(bt));
    const pendingAmt = Math.round(pendingExactAmt);
    const pendingCatInfo = categorizeBankTransactionForApp(bt);
    const pendingMerchant = pendingCatInfo.merchant.toLowerCase().trim();
    const pendingIsGeneric = isGenericPlaceholderMerchant(pendingMerchant);
    const pendingDate = getActualTransactionDate(bt);

    const candidateMatches = bookedNegativeTxs.filter((b) => {
      if (consumedBookedIdsForPending.has(b.id)) return false;
      if (
        bt.bank_account_id &&
        b.bank_account_id &&
        bt.bank_account_id !== b.bank_account_id
      ) {
        return false;
      }
      const bExactAmt = Math.abs(getNormalizedBankTxAmount(b));
      const bAmt = Math.round(bExactAmt);
      const isExactDecimalMatch = Math.abs(bExactAmt - pendingExactAmt) < 0.015;
      if (!isExactDecimalMatch && (!isDisappeared || bAmt !== pendingAmt)) {
        return false;
      }

      const bCatInfo = categorizeBankTransactionForApp(b);
      const bMerchant = bCatInfo.merchant.toLowerCase().trim();
      const bookedIsGeneric = isGenericPlaceholderMerchant(bMerchant);

      const merchantsMatch = areMerchantsCompatibleForReservation(
        bt,
        b,
        pendingMerchant,
        bMerchant,
        pendingIsGeneric,
        bookedIsGeneric
      );
      if (!merchantsMatch) return false;

      const bDate = getActualTransactionDate(b);
      const bBookingDate = b.booking_date || b.value_date || bDate;
      if (pendingDate && bDate) {
        const diffMs = new Date(bDate).getTime() - new Date(pendingDate).getTime();
        const dayDiff = Math.abs(diffMs) / (1000 * 60 * 60 * 24);
        if (dayDiff <= 10 && diffMs >= -86_400_000) {
          if (isDisappeared) return true;
          // Om BOOK-raden har samma eller senare bokföringsdatum än reservationens köpdatum
          if (
            (bBookingDate && bBookingDate >= pendingDate) ||
            (b.created_at && bt.created_at && b.created_at >= bt.created_at)
          ) {
            return true;
          }
        }
      }
      return false;
    });

    if (candidateMatches.length > 0) {
      // Föredra exakt decimalmatchning (t.ex. 775.10 === 775.10) och närmast datum
      candidateMatches.sort((a, b) => {
        const aExact = Math.abs(Math.abs(getNormalizedBankTxAmount(a)) - pendingExactAmt) < 0.015 ? 0 : 1;
        const bExact = Math.abs(Math.abs(getNormalizedBankTxAmount(b)) - pendingExactAmt) < 0.015 ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const aDate = getActualTransactionDate(a);
        const bDate = getActualTransactionDate(b);
        return aDate.localeCompare(bDate);
      });
      recordReservationMatch(bt, candidateMatches[0]);
    }
  }

  // Pass 2: Ändrat slutbelopp för ersatta/försvunna reservationer,
  // t.ex. bensinstation (1 500 kr -> 642 kr), hotell eller matbutik online (ICA/Mathem).
  for (const bt of pendingCandidates) {
    if (settledPendingIds.has(bt.id)) continue;
    if (!isPendingDisappearedFromLatestSync(bt)) {
      continue;
    }

    const pendingCatInfo = categorizeBankTransactionForApp(bt);
    const pendingMerchant = pendingCatInfo.merchant.toLowerCase().trim();
    const pendingIsGeneric = isGenericPlaceholderMerchant(pendingMerchant);
    if (pendingIsGeneric || pendingMerchant.length < 3) continue;

    const pendingDate = getActualTransactionDate(bt);
    if (!pendingDate) continue;

    const matchedChangedAmtBooked = bookedNegativeTxs.find((b) => {
      if (consumedBookedIdsForPending.has(b.id)) return false;
      if (
        bt.bank_account_id &&
        b.bank_account_id &&
        bt.bank_account_id !== b.bank_account_id
      ) {
        return false;
      }

      const bCatInfo = categorizeBankTransactionForApp(b);
      const bMerchant = bCatInfo.merchant.toLowerCase().trim();
      if (isGenericPlaceholderMerchant(bMerchant) || bMerchant.length < 3) {
        return false;
      }

      const sameMerchant = areMerchantsCompatibleForReservation(
        bt,
        b,
        pendingMerchant,
        bMerchant,
        false,
        false
      );
      if (!sameMerchant) return false;

      const bDate = getActualTransactionDate(b);
      if (!bDate) return false;
      const diffMs = new Date(bDate).getTime() - new Date(pendingDate).getTime();
      const dayDiff = Math.abs(diffMs) / (1000 * 60 * 60 * 24);
      return dayDiff <= 10 && diffMs >= -86_400_000;
    });

    if (matchedChangedAmtBooked) {
      recordReservationMatch(bt, matchedChangedAmtBooked);
    }
  }

  return { bookedToReservationMeta, settledPendingIds, isPendingDisappearedFromLatestSync };
}
