// Städar en transaktion: datum, Swish-namn, användarens alias/kategorier och koppling till fasta poster.
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../models';
import type { BankTransactionItem } from '../../services/bank/types';
import { getLogoUrl } from '../../utils/logo';
import { categorizeBankTransactionForApp, extractSwishPhoneNumber, formatSwishPhone, formatSwishTitle, isLikelySwishTransactionText } from '../../utils/bankAnalysis/merchantRules';
import { getSwedishDateStr, parseDateFromSwedishText } from '../../utils/swedishDate';
import { SWISH_SVG_DATA_URI } from '../../components/SwishLogo';
import { resolveMerchantAlias, isGenericPlaceholderMerchant } from '../../utils/cache/merchants';
import { normalizeCategoryToValid } from '../../utils/cache/categories';
import { getTransactionMetaMap, migratePendingMetaToBooked } from '../../utils/cache/itemMeta';
import { resolveSwishPhoneToName } from '../../utils/cache/swishDirectory';
import { findMatchingFixedExpense, findMatchingIncome, isFixedExpenseAmountMatch } from '../../utils/recurring/matching';
import { getSavedReservationPurchaseDates } from './reservationDates';
import { extractBankTxTime } from './bankTxTime';

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
      } as BankTransactionItem);
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
