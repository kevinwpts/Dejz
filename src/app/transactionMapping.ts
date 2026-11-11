// Banktransaktioner → appens transaktioner (datum, tid, reservationer, dubbletter).
// Flyttad från App.tsx.
import {
  IncomeItem,
  FixedExpenseItem,
  TransactionItem,
  getTransactionTime,
} from '../components/HomeTab';
import { bankService, BankAccount, BankTransactionItem } from '../services/bankService';
import { getLogoUrl } from '../utils/logo';
import {
  categorizeBankTransactionForApp,
  cleanDisplayMerchantName,
  extractSwishPhoneNumber,
  findRawBankInternalTransferIds,
  formatBankAccountNumber,
  formatSwishPhone,
  formatSwishTitle,
  getBankAccountTitle,
  getNormalizedBankTxAmount,
  isLikelyCreditCardInvoiceBankTx,
  isLikelySwishTransactionText,
  resolveBankTxSekAmount,
} from '../utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  formatIsoTimeStockholm,
  getActualBankPaymentDateAndMeta,
  getSwedishDateStr,
  parseDateFromSwedishText,
} from '../utils/swedishDate';
import { SWISH_SVG_DATA_URI } from '../components/SwishLogo';
import {
  isTransactionManuallyExcluded,
  resolveMerchantAlias,
  isGenericPlaceholderMerchant,
  normalizeCategoryToValid,
  getTransactionMetaMap,
  migratePendingMetaToBooked,
  resolveSwishPhoneToName,
} from '../utils/appCache';
import {
  findMatchingFixedExpense,
  findMatchingIncome,
  isFixedExpenseAmountMatch,
} from '../utils/recurring';

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

export function sanitizeTransactionItem(
  item: TransactionItem,
  fixedList?: FixedExpenseItem[],
  incomeList?: IncomeItem[],
  aliasesOverride?: Record<string, { name: string; category: string }>,
  fallbackMetaId?: string
): TransactionItem {
  if (!item) return item;
  const metaMap = getTransactionMetaMap();
  const fallbackMeta = fallbackMetaId ? metaMap[fallbackMetaId] : undefined;
  const primaryMeta = item.id ? metaMap[item.id] : undefined;
  if (fallbackMetaId && fallbackMeta && item.id && fallbackMetaId !== item.id) {
    migratePendingMetaToBooked(fallbackMetaId, item.id);
  }
  const savedMeta =
    fallbackMeta || primaryMeta
      ? { ...(fallbackMeta || {}), ...(primaryMeta || {}) }
      : undefined;
  const effectiveOriginalAmount =
    item.originalAmount !== undefined ? item.originalAmount : savedMeta?.originalAmount;
  const effectiveAmount =
    item.originalAmount !== undefined
      ? item.amount
      : savedMeta?.customAmount !== undefined
      ? savedMeta.customAmount
      : item.amount;

  const hasExplicitCustomTitle = Boolean(
    savedMeta?.customTitle &&
      savedMeta.customTitle.trim() &&
      savedMeta.customTitle.trim().toLowerCase() !== 'banktransaktion'
  );

  const updated: TransactionItem = {
    ...item,
    originalTitle: item.originalTitle ?? savedMeta?.originalTitle,
    amount: effectiveAmount,
    originalAmount: effectiveOriginalAmount,
    linkedSwishTxId:
      item.linkedSwishTxId !== undefined ? item.linkedSwishTxId : savedMeta?.linkedSwishTxId,
    isHearted: item.isHearted ?? savedMeta?.isHearted,
    isWaitingForPackage: item.isWaitingForPackage ?? savedMeta?.isWaitingForPackage,
    isWaitingForSwish: item.isWaitingForSwish ?? savedMeta?.isWaitingForSwish,
    isSharedExpense: item.isSharedExpense ?? savedMeta?.isSharedExpense,
    pendingSwishAmount: item.pendingSwishAmount ?? savedMeta?.pendingSwishAmount,
    pendingSwishRecipient: item.pendingSwishRecipient ?? savedMeta?.pendingSwishRecipient,
    receiptUrl: item.receiptUrl ?? savedMeta?.receiptUrl,
    receiptName: item.receiptName ?? savedMeta?.receiptName,
    receipts: item.receipts ?? savedMeta?.receipts,
    paymentMethod: item.paymentMethod ?? savedMeta?.paymentMethod,
    note: item.note ?? savedMeta?.note,
    linkedFixedExpenseId:
      item.linkedFixedExpenseId !== undefined
        ? item.linkedFixedExpenseId
        : savedMeta?.linkedFixedExpenseId,
    linkedIncomeId:
      item.linkedIncomeId !== undefined
        ? item.linkedIncomeId
        : savedMeta?.linkedIncomeId,
  };
  const todayStr = getSwedishDateStr();

  const combinedText = [
    updated.title,
    updated.note,
    updated.rawDescription,
    updated.counterpartyName,
  ]
    .filter(Boolean)
    .join(' ');

  const isMarkedInternalTransfer =
    updated.reconciliationStatus === 'internal_transfer' ||
    Boolean(updated.rawJson?.isInternalTransfer) ||
    updated.category === 'Överföring';

  const swishPhone = !isMarkedInternalTransfer
    ? extractSwishPhoneNumber(updated.rawDescription, true) ||
      extractSwishPhoneNumber(updated.counterpartyName, true) ||
      extractSwishPhoneNumber(updated.title, false)
    : null;

  const isSwish =
    !isMarkedInternalTransfer &&
    (Boolean(swishPhone) ||
      isLikelySwishTransactionText(updated.rawDescription, updated.rawJson) ||
      isLikelySwishTransactionText(updated.counterpartyName, updated.rawJson) ||
      /swish/i.test(combinedText) ||
      updated.category === 'Swish');

  // Rensa bort eventuell rå bankbeskrivning som av misstag lagts i "Anteckning" (note)
  if (updated.note) {
    const noteTrim = updated.note.trim().toLowerCase();
    const rawTrim = (updated.rawDescription || '').trim().toLowerCase();
    const cpTrim = (updated.counterpartyName || '').trim().toLowerCase();
    const titleTrim = (updated.title || '').trim().toLowerCase();
    if (
      (rawTrim && noteTrim === rawTrim) ||
      (cpTrim && noteTrim === cpTrim) ||
      (titleTrim && noteTrim === titleTrim)
    ) {
      updated.note = undefined;
    }
  }

  // 1. Fastställ det faktiska köpdatumet (lås alltid ursprungligt köpdatum från reservation om sådant finns)
  const lockedResDate = updated.id ? getSavedReservationPurchaseDates()[updated.id] : undefined;
  const embeddedDate = parseDateFromSwedishText(combinedText, todayStr);
  if (lockedResDate && /^\d{4}-\d{2}-\d{2}$/.test(lockedResDate) && lockedResDate <= todayStr) {
    updated.date = lockedResDate;
  } else if (embeddedDate && embeddedDate <= todayStr) {
    updated.date = embeddedDate;
  } else if (
    updated.valueDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(updated.valueDate) &&
    updated.valueDate <= todayStr &&
    (!updated.date || updated.valueDate < updated.date)
  ) {
    updated.date = updated.valueDate;
  } else if (updated.date && updated.date > todayStr) {
    updated.date = todayStr;
  }

  // Om en banktransaktion har ett cachat påhittat klockslag från äldre version utan faktisk tidsstämpel i bankens data, rensa det
  if (updated.id?.startsWith('bank-') && updated.time && updated.time !== 'Planerad') {
    const verifiedBankTime = extractBankTxTime(
      {
        raw_json: updated.rawJson,
        description: updated.rawDescription || null,
      } as BankTransactionItem,
      new Map(),
      updated.date || '',
      updated.category || '',
      updated.title || ''
    );
    if (!verifiedBankTime) {
      updated.time = '';
    }
  }

  // 2. Swish-titelsanitering eller direkt banknamn i snygg Title Case
  if (isSwish) {
    updated.category = 'Swish';
    updated.logo = SWISH_SVG_DATA_URI;

    if (hasExplicitCustomTitle && savedMeta?.customTitle) {
      updated.title = savedMeta.customTitle;
      return updated;
    }

    const cleanExistingTitle =
      /kristoffer nilsson|zlatan\s*kadic/i.test(updated.title || '') && !savedMeta?.customTitle
        ? ''
        : updated.title;

    const swishTitle = formatSwishTitle(
      updated.rawDescription || updated.note || cleanExistingTitle || 'Swish',
      updated.counterpartyName,
      updated.type === 'income',
      updated.rawJson
    );

    if (swishTitle && swishTitle !== 'Swish') {
      updated.title = swishTitle;
    } else if (swishPhone) {
      const resolvedName = resolveSwishPhoneToName(swishPhone);
      if (resolvedName) {
        updated.title =
          updated.type === 'income'
            ? `Swish från ${resolvedName}`
            : `Swish till ${resolvedName}`;
      } else {
        const formattedPhone = formatSwishPhone(swishPhone);
        updated.title = `Swish (${formattedPhone})`;
      }
    } else {
      updated.title = 'Swish';
    }
  } else if (!isMarkedInternalTransfer) {
    const rawBankSource = updated.counterpartyName || updated.rawDescription;
    if (rawBankSource && !isGenericPlaceholderMerchant(rawBankSource)) {
      const prevTitleLower = (updated.title || '').toLowerCase().trim();
      const recat = categorizeBankTransactionForApp({
        description: updated.rawDescription || '',
        counterparty_name: updated.counterpartyName || '',
        raw_json: updated.rawJson,
      } as any);
      if (recat.merchant && !isGenericPlaceholderMerchant(recat.merchant)) {
        const cleanBankLower = recat.merchant.toLowerCase().trim();
        updated.title = recat.merchant;
        if (
          updated.type !== 'income' &&
          (prevTitleLower !== cleanBankLower || updated.category === 'Övrigt') &&
          recat.category &&
          recat.category !== 'Övrigt'
        ) {
          updated.category = recat.category;
        }
      }
    }
  }

  // 3. Kontrollera först om användaren själv har döpt om eller kategoriserat handlaren (bakåt & framåt i tiden)
  const kind = updated.type === 'income' ? 'income' : 'expense';
  const rawAliasSource =
    updated.counterpartyName || updated.rawDescription || updated.title || '';
  const aliasMatch =
    resolveMerchantAlias(rawAliasSource, aliasesOverride) ||
    (updated.rawDescription ? resolveMerchantAlias(updated.rawDescription, aliasesOverride) : null) ||
    (updated.title ? resolveMerchantAlias(updated.title, aliasesOverride) : null);

  if (aliasMatch && !isGenericPlaceholderMerchant(aliasMatch.name)) {
    updated.title =
      hasExplicitCustomTitle && savedMeta?.customTitle
        ? savedMeta.customTitle
        : aliasMatch.name;
    updated.category = normalizeCategoryToValid(
      savedMeta?.customCategory || aliasMatch.category,
      kind
    );
    updated.logo =
      getLogoUrl(updated.title, updated.category) ||
      getLogoUrl(rawAliasSource, updated.category) ||
      updated.logo;
    return updated;
  }

  // 4. Deterministisk matchning mot fasta utgifter och fasta inkomster (behåll bankens namn om inte användaren själv valt ett annat namn!)
  const hasDirectBankName = Boolean(
    (updated.counterpartyName && !isGenericPlaceholderMerchant(updated.counterpartyName)) ||
      (updated.rawDescription && !isGenericPlaceholderMerchant(updated.rawDescription))
  );

  if (updated.type !== 'income' && fixedList && fixedList.length > 0) {
    const matchedFixed = findMatchingFixedExpense(updated, fixedList);
    if (matchedFixed) {
      const amountMatches = isFixedExpenseAmountMatch(matchedFixed, updated.amount);
      if (hasExplicitCustomTitle && savedMeta?.customTitle) {
        updated.title = savedMeta.customTitle;
      } else if (!hasDirectBankName && amountMatches) {
        updated.title = matchedFixed.name;
      }
      updated.category = normalizeCategoryToValid(
        savedMeta?.customCategory || matchedFixed.category,
        'expense'
      );
      updated.logo =
        matchedFixed.logo ||
        getLogoUrl(matchedFixed.name, updated.category) ||
        getLogoUrl(updated.title, updated.category);
      return updated;
    }
  }

  if (updated.type === 'income' && incomeList && incomeList.length > 0) {
    const matchedInc = findMatchingIncome(updated, incomeList);
    if (matchedInc) {
      if (hasExplicitCustomTitle && savedMeta?.customTitle) {
        updated.title = savedMeta.customTitle;
      } else if (!hasDirectBankName) {
        updated.title = matchedInc.name;
      }
      updated.category = normalizeCategoryToValid(
        savedMeta?.customCategory || matchedInc.category,
        'income'
      );
      updated.logo =
        matchedInc.logo ||
        getLogoUrl(matchedInc.name, updated.category) ||
        getLogoUrl(updated.title, updated.category);
      return updated;
    }
  }

  if (hasExplicitCustomTitle && savedMeta?.customTitle) {
    updated.title = savedMeta.customTitle;
  }
  if (savedMeta?.customCategory) {
    updated.category = normalizeCategoryToValid(savedMeta.customCategory, kind);
  } else {
    updated.category = normalizeCategoryToValid(updated.category, kind);
  }
  updated.logo = getLogoUrl(updated.title, updated.category) || updated.logo;
  return updated;
}

export function extractBankTxTime(
  bt: BankTransactionItem,
  _batchMinuteCounts: Map<string, number>,
  _effectiveDate: string,
  _category: string,
  _merchant: string
): string {
  const raw = bt.raw_json || {};

  // 1. Kontrollera genuina tidsfält för kort- och konto-transaktioner
  const candidateFields = [
    raw.card_transaction?.transaction_date_time,
    raw.card_transaction?.authorized_date,
    raw.card_transaction?.time,
    raw.transaction_date_time,
    raw.execution_date_time,
    raw.acceptance_date_time,
    raw.origination_date_time,
    raw.transaction_time,
    raw.time,
    raw.execution_time,
    raw.timestamp,
    raw.transaction_date,
    bt.transaction_date,
  ];

  for (const val of candidateFields) {
    if (typeof val !== 'string') continue;
    const trimmed = val.trim();
    const directTime = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)/);
    if (directTime) {
      const hhmm = `${directTime[1]}:${directTime[2]}`;
      if (hhmm !== '00:00' && hhmm !== '12:00') {
        return hhmm;
      }
    }
    if (
      trimmed.includes('T') &&
      !trimmed.includes('T00:00') &&
      !trimmed.includes('T12:00') &&
      !trimmed.includes('T10:00:00Z')
    ) {
      const parsedTime = formatIsoTimeStockholm(trimmed);
      if (parsedTime) return parsedTime;
    }
  }

  // 2. Kontrollera om klockslag finns i bankens transaktionsbeskrivning
  if (bt.description) {
    const descMatch = bt.description.match(/\b([01]\d|2[0-3])[:.]([0-5]\d)\b/);
    if (descMatch) {
      const hhmm = `${descMatch[1]}:${descMatch[2]}`;
      if (hhmm !== '00:00' && hhmm !== '12:00') {
        return hhmm;
      }
    }
  }

  // 3. Om banken inte lämnade ut tid: returnera tom sträng (hitta aldrig på klockslag)
  return '';
}

export function mapBankTransactionsToAppItems(
  bankTxs: BankTransactionItem[],
  accs: BankAccount[],
  fixedList: FixedExpenseItem[],
  incomeList: IncomeItem[],
  aliases: Record<string, { name: string; category: string }>
): TransactionItem[] {
  const batchMinuteCounts = new Map<string, number>();
  for (const bt of bankTxs) {
    if (bt.created_at) {
      const key = bt.created_at.slice(0, 16);
      batchMinuteCounts.set(key, (batchMinuteCounts.get(key) || 0) + 1);
    }
  }

  const rawInternalTransferIds = findRawBankInternalTransferIds(bankTxs, accs);

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

  const todayIsoForPendingCheck = getSwedishDateStr();
  const todayMsForPendingCheck = Date.parse(`${todayIsoForPendingCheck}T12:00:00`);

  const mappedBankTxs: TransactionItem[] = bankTxs
    .filter((bt) => {
      if (bt.booking_status === 'CNCL' || bt.booking_status === 'RJCT') return false;
      if (bt.replaced_by_bank_tx_id || settledPendingIds.has(bt.id)) {
        return false;
      }
      // Om en reservation har försvunnit eller ersatts utan att någon bokförd transaktion
      // matchat den (och utan replaced_by_bank_tx_id), dölj den ENDAST om den är äldre än 7 dagar.
      if (isPendingDisappearedFromLatestSync(bt)) {
        const pDate = getActualTransactionDate(bt);
        const pMs = pDate ? Date.parse(`${pDate}T12:00:00`) : NaN;
        const ageDays =
          Number.isFinite(pMs) && Number.isFinite(todayMsForPendingCheck)
            ? (todayMsForPendingCheck - pMs) / (1000 * 60 * 60 * 24)
            : 99;
        if (ageDays > 7) {
          return false;
        }
      }
      if (bt.reconciliation_status === 'excluded') {
        return false;
      }
      const rawAmt = getNormalizedBankTxAmount(bt);
      if (rawAmt === 0) return false;

      return true;
    })
    .map((bt) => {
      const fxInfo = resolveBankTxSekAmount(bt);
      const rawAmt = fxInfo.signedSekAmount;
      const isIncome = rawAmt > 0;
      const normAmt = fxInfo.absSekAmount;
      const isRawInternalTransfer =
        rawInternalTransferIds.has(bt.id) || bt.reconciliation_status === 'internal_transfer';
      let catInfo = isRawInternalTransfer
        ? {
            merchant: 'Överföring mellan egna konton',
            category: 'Överföring',
            logo: getLogoUrl('Överföring', 'Överföring'),
          }
        : categorizeBankTransactionForApp(bt);
      const reservationMeta = bookedToReservationMeta.get(bt.id);
      if (
        !isRawInternalTransfer &&
        reservationMeta?.preservedMerchant &&
        isGenericPlaceholderMerchant(catInfo.merchant)
      ) {
        catInfo = {
          merchant: reservationMeta.preservedMerchant,
          category: reservationMeta.preservedCategory || catInfo.category,
          logo: getLogoUrl(
            reservationMeta.preservedMerchant,
            reservationMeta.preservedCategory || catInfo.category
          ),
        };
      }

      if (isIncome && !isRawInternalTransfer) {
        const combinedDesc = `${bt.description || ''} ${bt.counterparty_name || ''}`.toLowerCase();
        const isCardRefund = Boolean(bt.raw_json?.card_transaction);
        const isMatchedRetailOrExpenseMerchant =
          Boolean(catInfo.category) &&
          ![
            'Övrigt',
            'Inkomst',
            'Lön',
            'Swish',
            'CSN',
            'Försäkringskassan',
            'Pension',
            'Skatteåterbäring',
            'Utdelning',
            'Bidrag',
            'Återbetalning',
            'Överföring',
            'Sparande',
          ].includes(catInfo.category);

        let incomeCat = 'Inkomst';
        if (
          combinedDesc.includes('lön') ||
          combinedDesc.includes('salary') ||
          combinedDesc.includes('löneutbetalning') ||
          combinedDesc.includes('loneutbetalning')
        ) {
          incomeCat = 'Lön';
        } else if (combinedDesc.includes('swish')) {
          incomeCat = 'Swish';
        } else if (combinedDesc.includes('csn')) {
          incomeCat = 'CSN';
        } else if (
          combinedDesc.includes('försäkringskassan') ||
          combinedDesc.includes('forsakringskassan') ||
          combinedDesc.includes('fk ')
        ) {
          incomeCat = 'Försäkringskassan';
        } else if (combinedDesc.includes('pension')) {
          incomeCat = 'Pension';
        } else if (
          combinedDesc.includes('skatteverket') ||
          combinedDesc.includes('skatteåterbäring') ||
          combinedDesc.includes('skatteaterbaring')
        ) {
          incomeCat = 'Skatteåterbäring';
        } else if (
          combinedDesc.includes('återbetalning') ||
          combinedDesc.includes('aterbetalning') ||
          combinedDesc.includes('retur') ||
          combinedDesc.includes('refund') ||
          combinedDesc.includes('återköp') ||
          combinedDesc.includes('aterkop') ||
          isCardRefund ||
          isMatchedRetailOrExpenseMerchant
        ) {
          incomeCat = 'Återbetalning';
        }

        const cleanName =
          incomeCat === 'Swish'
            ? formatSwishTitle(bt.description, bt.counterparty_name)
            : catInfo.merchant && !isGenericPlaceholderMerchant(catInfo.merchant)
            ? catInfo.merchant
            : cleanDisplayMerchantName(
                bt.counterparty_name || bt.description || 'Insättning'
              );
        catInfo = {
          merchant: cleanName,
          category: incomeCat,
          logo: catInfo.logo || getLogoUrl(cleanName, incomeCat),
        };
      }

      const dateMeta = getActualBankPaymentDateAndMeta(
        bt,
        reservationMeta?.purchaseDate,
        reservationMeta?.purchaseTime
      );
      let effectiveDate = dateMeta.paymentDate;
      const todayStr = getSwedishDateStr();
      if (effectiveDate > todayStr) {
        effectiveDate = todayStr;
      }

      const txTime =
        dateMeta.paymentTime ||
        reservationMeta?.purchaseTime ||
        extractBankTxTime(
          bt,
          batchMinuteCounts,
          effectiveDate,
          catInfo.category,
          catInfo.merchant
        );

      const isManuallyExcluded =
        isTransactionManuallyExcluded(bt.id) ||
        isTransactionManuallyExcluded(`bank-${bt.id}`) ||
        (reservationMeta?.replacedPendingId
          ? isTransactionManuallyExcluded(reservationMeta.replacedPendingId) ||
            isTransactionManuallyExcluded(`bank-${reservationMeta.replacedPendingId}`)
          : false);

      const isAutoCreditCardInvoice =
        !isIncome &&
        !bt.reconciliation_status &&
        isLikelyCreditCardInvoiceBankTx(bt);

      const matchedBankAcc = accs.find((a) => a.id === bt.bank_account_id);
      const bankAccountName = matchedBankAcc
        ? (() => {
            const title = getBankAccountTitle(matchedBankAcc, 'SEB');
            const num = formatBankAccountNumber(
              matchedBankAcc.bban || matchedBankAcc.iban || matchedBankAcc.product || ''
            );
            return num ? `${title} · ${num}` : title;
          })()
        : undefined;

      const effectiveRawDesc =
        (!isGenericPlaceholderMerchant(bt.description)
          ? bt.description
          : reservationMeta?.preservedDescription) || bt.description;

      const foreignCurrencyNote =
        fxInfo.isForeignCurrency && fxInfo.originalCurrency !== 'SEK'
          ? `Ursprungligt belopp: ${fxInfo.originalAmount.toLocaleString('sv-SE')} ${fxInfo.originalCurrency}`
          : undefined;

      return sanitizeTransactionItem(
        {
          id: `bank-${bt.id}`,
          title: catInfo.merchant,
          amount: Math.round(normAmt),
          type: isIncome ? ('income' as const) : ('expense' as const),
          category: catInfo.category,
          date: effectiveDate,
          time: txTime,
          bookingDate: dateMeta.bookingDate,
          bookingStatus: dateMeta.bookingStatus,
          reconciliationStatus: rawInternalTransferIds.has(bt.id)
            ? 'internal_transfer'
            : bt.reconciliation_status,
          isExcluded:
            bt.reconciliation_status === 'excluded' ||
            isManuallyExcluded ||
            isAutoCreditCardInvoice,
          note: foreignCurrencyNote,
          logo: catInfo.logo || getLogoUrl(catInfo.merchant, catInfo.category),

          rawDescription: effectiveRawDesc,
          counterpartyName: bt.counterparty_name || undefined,
          currency: fxInfo.isForeignCurrency ? fxInfo.originalCurrency : bt.currency || 'SEK',
          creditDebitIndicator:
            bt.credit_debit_indicator || (isIncome ? 'CRDT' : 'DBIT'),
          transactionId: bt.transaction_id || undefined,
          entryReference: bt.entry_reference || undefined,
          valueDate: reservationMeta?.purchaseDate || bt.value_date || undefined,
          bankAccountId: bt.bank_account_id || undefined,
          bankAccountName,
          createdAt: bt.created_at || undefined,
          rawJson:
            bt.raw_json || rawInternalTransferIds.has(bt.id)
              ? {
                  ...(rawInternalTransferIds.has(bt.id) ? { isInternalTransfer: true } : {}),
                  ...(bt.raw_json?.balance_after_transaction?.amount !== undefined
                    ? {
                        balance_after_transaction: {
                          amount: bt.raw_json.balance_after_transaction.amount,
                        },
                      }
                    : {}),
                  ...(bt.raw_json?.bank_transaction_code
                    ? { bank_transaction_code: bt.raw_json.bank_transaction_code }
                    : {}),
                  ...(bt.raw_json?.proprietary_bank_transaction_code
                    ? {
                        proprietary_bank_transaction_code:
                          bt.raw_json.proprietary_bank_transaction_code,
                      }
                    : {}),
                  ...(bt.raw_json?.merchant_category_code
                    ? { merchant_category_code: bt.raw_json.merchant_category_code }
                    : {}),
                  ...(bt.raw_json?.mcc ? { mcc: bt.raw_json.mcc } : {}),
                  ...(typeof bt.raw_json?.transaction_date_time === 'string'
                    ? { transaction_date_time: bt.raw_json.transaction_date_time }
                    : {}),
                  ...(typeof bt.raw_json?.execution_date_time === 'string'
                    ? { execution_date_time: bt.raw_json.execution_date_time }
                    : {}),
                  ...(bt.raw_json?.card_transaction
                    ? {
                        card_transaction: {
                          ...(typeof bt.raw_json.card_transaction.transaction_date_time === 'string'
                            ? {
                                transaction_date_time:
                                  bt.raw_json.card_transaction.transaction_date_time,
                              }
                            : {}),
                          ...(bt.raw_json.card_transaction.merchant_category_code
                            ? {
                                merchant_category_code:
                                  bt.raw_json.card_transaction.merchant_category_code,
                              }
                            : {}),
                          ...(bt.raw_json.card_transaction.mcc
                            ? { mcc: bt.raw_json.card_transaction.mcc }
                            : {}),
                        },
                      }
                    : {}),
                  exactSignedSekAmount: rawAmt,
                }
              : undefined,
        },
        fixedList,
        incomeList,
        aliases,
        reservationMeta?.replacedPendingId
          ? `bank-${reservationMeta.replacedPendingId}`
          : undefined
      );
    });

  const dedupedBankTxs = deduplicateTransactions(mappedBankTxs);

  // Rekonstruera faktisk intradagsordning per dag (äldst = lägst sortOrder, nyast = högst sortOrder)
  // med hjälp av bankens saldokedja (balance_after_transaction), synkningstidpunkt (created_at) och entry_reference.
  const byDate = new Map<string, TransactionItem[]>();
  for (const tx of dedupedBankTxs) {
    const d = tx.date || '';
    const arr = byDate.get(d) || [];
    arr.push(tx);
    byDate.set(d, arr);
  }

  for (const [, dayItems] of byDate.entries()) {
    if (dayItems.length <= 1) {
      if (dayItems[0]) dayItems[0].sortOrder = 0;
      continue;
    }

    // Steg 1: Grundsortera från äldst till nyast via faktisk tid, synk-batch (10s fönster) och entry_reference
    dayItems.sort((a, b) => {
      const timeA = getTransactionTime(a);
      const timeB = getTransactionTime(b);
      if (timeA && timeB && timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }
      if (a.createdAt && b.createdAt) {
        const msA = Date.parse(a.createdAt);
        const msB = Date.parse(b.createdAt);
        if (Number.isFinite(msA) && Number.isFinite(msB) && Math.abs(msA - msB) > 10_000) {
          return msA - msB;
        }
      }
      if (a.entryReference && b.entryReference && a.entryReference !== b.entryReference) {
        return a.entryReference.localeCompare(b.entryReference);
      }
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return 0;
    });

    // Steg 2: Om banken skickat balance_after_transaction på ett konto under dagen,
    // verifiera och förfina ordningen med den exakta saldokedjan (beforeBalance -> afterBalance).
    const byAcc = new Map<string, TransactionItem[]>();
    for (const tx of dayItems) {
      const accKey = tx.bankAccountId || tx.bankAccountName || '__default__';
      const list = byAcc.get(accKey) || [];
      list.push(tx);
      byAcc.set(accKey, list);
    }

    for (const [, accItems] of byAcc.entries()) {
      const withBal = accItems.filter((t) => {
        const bal = Number(t.rawJson?.balance_after_transaction?.amount);
        return Number.isFinite(bal);
      });
      if (withBal.length >= 2) {
        const meta = withBal.map((t) => {
          const after = Number(t.rawJson.balance_after_transaction.amount);
          const signed =
            typeof t.rawJson?.exactSignedSekAmount === 'number'
              ? t.rawJson.exactSignedSekAmount
              : t.type === 'income'
              ? Number(t.amount) || 0
              : -(Number(t.amount) || 0);
          return {
            tx: t,
            before: Math.round((after - signed) * 100),
            after: Math.round(after * 100),
          };
        });

        // Bygg riktad kedja där tx[i].after === tx[j].before
        const nextOf = new Map<string, string>();
        const prevOf = new Map<string, string>();
        for (let i = 0; i < meta.length; i++) {
          for (let j = 0; j < meta.length; j++) {
            if (i === j) continue;
            if (
              Math.abs(meta[i].after - meta[j].before) <= 5 &&
              !nextOf.has(meta[i].tx.id) &&
              !prevOf.has(meta[j].tx.id)
            ) {
              nextOf.set(meta[i].tx.id, meta[j].tx.id);
              prevOf.set(meta[j].tx.id, meta[i].tx.id);
              break;
            }
          }
        }

        if (nextOf.size > 0) {
          const byId = new Map(withBal.map((t) => [t.id, t]));
          const visited = new Set<string>();
          const orderedChain: TransactionItem[] = [];
          for (const item of withBal) {
            if (!prevOf.has(item.id) && !visited.has(item.id)) {
              let curr: string | undefined = item.id;
              while (curr && !visited.has(curr)) {
                visited.add(curr);
                const found = byId.get(curr);
                if (found) orderedChain.push(found);
                curr = nextOf.get(curr);
              }
            }
          }
          for (const item of withBal) {
            if (!visited.has(item.id)) {
              orderedChain.push(item);
            }
          }
          if (orderedChain.length === withBal.length) {
            let ptr = 0;
            for (let k = 0; k < dayItems.length; k++) {
              if (byId.has(dayItems[k].id)) {
                dayItems[k] = orderedChain[ptr++];
              }
            }
          }
        }
      }
    }

    dayItems.forEach((tx, idx) => {
      tx.sortOrder = idx;
    });
  }

  return dedupedBankTxs;
}
