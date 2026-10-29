import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  calculateCurrentPeriod,
  PeriodInfo,
  WeekendHandlingMode,
  isDateInPeriod,
} from './utils/periodEngine';
import { Navbar } from './components/Navbar';
import { BottomNav, AppTab } from './components/BottomNav';
import {
  HomeTab,
  AccountItem,
  IncomeItem,
  FixedExpenseItem,
  TransactionItem,
  getTransactionTime,
} from './components/HomeTab';
import { FixedTab } from './components/FixedTab';
import { AnalysisTab } from './components/AnalysisTab';
import { TransactionsTab } from './components/TransactionsTab';
import {
  SettingsTab,
  SettingsSubView,
  SETTINGS_SUBVIEW_TITLES,
} from './components/SettingsTab';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { MatpriskollenView } from './components/MatpriskollenView';
import { LandingPage } from './components/LandingPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ItemLogo } from './components/ItemLogo';
import { CategoryIcon } from './components/CategoryIcon';
import { Heart, Package, Paperclip, FileText, Eye } from '@phosphor-icons/react';
import { BankModal } from './components/modals/BankModal';
import { IncomeModal } from './components/modals/IncomeModal';
import { FixedExpenseModal } from './components/modals/FixedExpenseModal';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { SearchModal } from './components/modals/SearchModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { PullToRefresh } from './components/ui/PullToRefresh';
import { BottomSheet } from './components/ui/BottomSheet';
import { supabase } from './supabaseClient';
import {
  bankService,
  BankConnection,
  BankAccount,
  BankTransactionItem,
} from './services/bankService';
import { dataService } from './services/dataService';
import { Frequency } from './types';
import { getLogoUrl } from './utils/logo';
import {
  analyzeBankTransactionsForOnboarding,
  categorizeBankTransactionForApp,
  cleanDisplayMerchantName,
  DetectedFixedExpenseWithEvidence,
  DetectedIncomeWithEvidence,
  findRawBankInternalTransferIds,
  formatBankAccountNumber,
  formatSwishPhone,
  formatSwishTitle,
  getBankAccountTitle,
  getNormalizedBankTxAmount,
  isLikelyCreditCardInvoiceBankTx,
  needsAiMerchantCleaning,
  resolveBankTxSekAmount,
} from './utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from './utils/transactionDedup';
import {
  formatIsoDateStockholm,
  formatIsoTimeStockholm,
  formatSwedishDateHeading,
  getActualBankPaymentDateAndMeta,
  getSwedishDateStr,
  parseDateFromSwedishText,
} from './utils/swedishDate';
import { SWISH_SVG_DATA_URI, SwishLogo } from './components/SwishLogo';
import {
  loadCachedAppState,
  saveCachedAppState,
  hasCachedBankData,
  clearCachedAppState,
  getDismissedFixedMerchants,
  dismissFixedMerchant,
  unDismissFixedMerchant,
  getDismissedIncomeMerchants,
  dismissIncomeMerchant,
  unDismissIncomeMerchant,
  getDeletedFixedIds,
  markFixedIdDeleted,
  unmarkFixedIdDeleted,
  getDeletedIncomeIds,
  markIncomeIdDeleted,
  unmarkIncomeIdDeleted,
  getManualFixedOverrides,
  saveManualFixedOverride,
  getManualIncomeOverrides,
  saveManualIncomeOverride,
  getExcludeInternalTransfers,
  setExcludeInternalTransfers,
  setTransactionExcludedState,
  isTransactionManuallyExcluded,
  getMerchantAliases,
  saveMerchantAlias,
  resolveMerchantAlias,
  isGenericPlaceholderMerchant,
  normalizeMerchantKey,
  ensureValidUuid,
  isValidUuid,
  normalizeCategoryToValid,
  propagateCategoryChangeInCache,
  hydrateAllUserPreferencesFromProfile,
  extractSavedFixedFromProfile,
  extractSavedIncomesFromProfile,
  getTransactionMetaMap,
  saveTransactionMeta,
  syncAllUserPreferencesToSupabase,
  cancelPendingPreferenceSync,
  clearAllLocalAppData,
  getStoredExpenseCategories,
  getStoredIncomeCategories,
} from './utils/appCache';
import {
  findInternalTransferIds,
  isInternalTransferTransaction,
} from './utils/transferDetection';
import {
  checkIsRecurringTransaction,
  findMatchingFixedExpense,
  findMatchingIncome,
  findAllMatchingFixedExpensesByMerchant,
  isFixedExpenseAmountMatch,
} from './utils/recurring';

const AUTO_SYNC_COOLDOWN_MS = 45_000; // Minst 45 sek mellan automatiska bakgrundssynkningar
const AUTO_SYNC_INTERVAL_MS = 120_000; // Synka automatiskt var 2:a minut när användaren är aktiv i appen

function getActualTransactionDate(bt: BankTransactionItem): string {
  return getActualBankPaymentDateAndMeta(bt).paymentDate;
}

function sanitizeTransactionItem(
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

  const updated: TransactionItem = {
    ...item,
    amount: effectiveAmount,
    originalAmount: effectiveOriginalAmount,
    linkedSwishTxId:
      item.linkedSwishTxId !== undefined ? item.linkedSwishTxId : savedMeta?.linkedSwishTxId,
    isHearted: item.isHearted ?? savedMeta?.isHearted,
    isWaitingForPackage: item.isWaitingForPackage ?? savedMeta?.isWaitingForPackage,
    isWaitingForSwish: item.isWaitingForSwish ?? savedMeta?.isWaitingForSwish,
    pendingSwishAmount: item.pendingSwishAmount ?? savedMeta?.pendingSwishAmount,
    pendingSwishRecipient: item.pendingSwishRecipient ?? savedMeta?.pendingSwishRecipient,
    receiptUrl: item.receiptUrl ?? savedMeta?.receiptUrl,
    receiptName: item.receiptName ?? savedMeta?.receiptName,
    paymentMethod: item.paymentMethod ?? savedMeta?.paymentMethod,
    note: item.note ?? savedMeta?.note,
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

  const rawDigits = combinedText.replace(/[\s()-]/g, '');
  const phoneMatch = rawDigits.match(/(467\d{8}|07\d{8}|123\d{7})/);

  const isSwish =
    Boolean(phoneMatch) ||
    /swish/i.test(combinedText) ||
    updated.category === 'Swish';

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

  // 1. Fastställ det faktiska köpdatumet (utan att flytta söndagsköp till lördag eller skriva över bevarat reservationsdatum)
  const embeddedDate = parseDateFromSwedishText(combinedText, todayStr);
  if (embeddedDate && embeddedDate <= todayStr) {
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

  // 2. Swish-titelsanitering eller direkt banknamn i snygg Title Case
  if (isSwish) {
    updated.category = 'Swish';
    updated.logo = SWISH_SVG_DATA_URI;

    const swishTitle = formatSwishTitle(
      updated.rawDescription || updated.note || updated.title || 'Swish',
      updated.counterpartyName
    );

    if (swishTitle && swishTitle !== 'Swish') {
      updated.title = swishTitle;
    } else if (phoneMatch) {
      const formattedPhone = formatSwishPhone(phoneMatch[1]);
      updated.title = `Swish (${formattedPhone})`;
    } else {
      updated.title = 'Swish';
    }
  } else {
    const rawBankSource = updated.counterpartyName || updated.rawDescription;
    if (rawBankSource && !isGenericPlaceholderMerchant(rawBankSource)) {
      const prevTitleLower = (updated.title || '').toLowerCase().trim();
      const recat = categorizeBankTransactionForApp({
        description: updated.rawDescription || '',
        counterparty_name: updated.counterpartyName || '',
      } as any);
      if (recat.merchant && !isGenericPlaceholderMerchant(recat.merchant)) {
        const cleanBankLower = recat.merchant.toLowerCase().trim();
        updated.title = recat.merchant;
        // Om titeln tidigare blivit felaktigt omskriven (t.ex. "Hemköp Rydebäck" -> "Ryde"), återställ även rätt kategori!
        if (
          prevTitleLower !== cleanBankLower &&
          recat.category &&
          recat.category !== 'Övrigt'
        ) {
          updated.category = recat.category;
        }
      }
    } else if (updated.title) {
      updated.title = cleanDisplayMerchantName(updated.title);
    }
  }

  // 3. Deterministisk matchning mot fasta utgifter, fasta inkomster och exakta alias
  const kind = updated.type === 'income' ? 'income' : 'expense';

  if (updated.type !== 'income' && fixedList && fixedList.length > 0) {
    const matchedFixed = findMatchingFixedExpense(updated, fixedList);
    if (matchedFixed) {
      const amountMatches = isFixedExpenseAmountMatch(matchedFixed, updated.amount);
      updated.title =
        savedMeta?.customTitle && !isGenericPlaceholderMerchant(savedMeta.customTitle)
          ? savedMeta.customTitle
          : amountMatches
          ? matchedFixed.name
          : updated.title;
      updated.category = normalizeCategoryToValid(
        savedMeta?.customCategory || matchedFixed.category,
        'expense'
      );
      updated.logo = matchedFixed.logo || getLogoUrl(updated.title, updated.category);
      return updated;
    }
  }

  if (updated.type === 'income' && incomeList && incomeList.length > 0) {
    const matchedInc = findMatchingIncome(updated, incomeList);
    if (matchedInc) {
      updated.title =
        savedMeta?.customTitle && !isGenericPlaceholderMerchant(savedMeta.customTitle)
          ? savedMeta.customTitle
          : matchedInc.name;
      updated.category = normalizeCategoryToValid(
        savedMeta?.customCategory || matchedInc.category,
        'income'
      );
      updated.logo = matchedInc.logo || getLogoUrl(updated.title, updated.category);
      return updated;
    }
  }

  const rawAliasSource =
    updated.rawDescription || updated.counterpartyName || updated.title || '';
  const aliasMatch = resolveMerchantAlias(rawAliasSource, aliasesOverride);
  if (aliasMatch && !isGenericPlaceholderMerchant(aliasMatch.name)) {
    updated.title =
      savedMeta?.customTitle && !isGenericPlaceholderMerchant(savedMeta.customTitle)
        ? savedMeta.customTitle
        : aliasMatch.name;
    updated.category = normalizeCategoryToValid(
      savedMeta?.customCategory || aliasMatch.category,
      kind
    );
    updated.logo = getLogoUrl(updated.title, updated.category);
    return updated;
  }

  if (savedMeta?.customTitle && !isGenericPlaceholderMerchant(savedMeta.customTitle)) {
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

function extractBankTxTime(
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

function getPayDatesForIncome(
  inc: IncomeItem,
  fallbackPayday = 25,
  beforeWeekend = true
): string[] {
  const dates: string[] = [];
  const day = inc.payday || fallbackPayday || 25;
  const todayStockholm = getSwedishDateStr();
  const currentYear = parseInt(todayStockholm.slice(0, 4), 10);
  const currentMonth = parseInt(todayStockholm.slice(5, 7), 10) - 1;

  for (let offset = 0; offset <= 5; offset++) {
    const d = new Date(currentYear, currentMonth - offset, day);
    if (beforeWeekend) {
      const dow = d.getDay();
      if (dow === 6) d.setDate(d.getDate() - 1);
      if (dow === 0) d.setDate(d.getDate() - 2);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayStr}`;

    if (dateStr <= todayStockholm) {
      dates.push(dateStr);
    }
  }
  return dates;
}

/**
 * Reconciles Fixed Expenses from DB, local state/cache, and bank detection
 * into a single deterministic, deduplicated list with valid UUIDs.
 */
/**
 * Reconciles Fixed Expenses from DB, local state/cache, and (only on empty initial setup) bank detection
 * into a single deterministic, static list where user-added items never disappear or get dynamically overwritten.
 */
function reconcileFixedExpensesList(params: {
  currentList: FixedExpenseItem[];
  dbList?: any[] | null;
  detectedList?: DetectedFixedExpenseWithEvidence[] | null;
  uid?: string | null;
}): {
  items: FixedExpenseItem[];
  toPersist: FixedExpenseItem[];
} {
  const { currentList, dbList, detectedList, uid } = params;
  const dismissed = getDismissedFixedMerchants();
  const deletedIds = getDeletedFixedIds();
  const overrides = getManualFixedOverrides();

  const unified: FixedExpenseItem[] = [];
  const toPersist: FixedExpenseItem[] = [];
  const dbIds = new Set<string>();

  const findExactSavedMatchIndex = (candidate: FixedExpenseItem) => {
    if (candidate.id) {
      const byIdIdx = unified.findIndex((u) => u.id === candidate.id);
      if (byIdIdx !== -1) return byIdIdx;
    }
    const candNameNorm = normalizeMerchantKey(candidate.name);
    const candAmt = Math.round(Math.abs(Number(candidate.amount) || 0));
    const candDue = Number(candidate.dueDay) || 27;
    return unified.findIndex(
      (u) =>
        normalizeMerchantKey(u.name) === candNameNorm &&
        Math.round(Math.abs(Number(u.amount) || 0)) === candAmt &&
        (Number(u.dueDay) || 27) === candDue
    );
  };

  // 1. Load items from Supabase fixed_expenses table
  if (Array.isArray(dbList)) {
    for (const f of dbList) {
      if (!f || f.isCancelled) continue;
      if (f.id && deletedIds.has(String(f.id))) continue;

      const rawDbAmt = Math.round(Number(f.amount) || 0);
      const origName = f.originalName || f.name || 'Fast utgift';
      const validId = ensureValidUuid(
        f.id,
        `fixed:${uid || 'local'}:${normalizeMerchantKey(origName)}:${rawDbAmt}:${f.deductionDay || 27}`
      );
      if (deletedIds.has(validId)) continue;

      const idOverride = overrides[`id:${validId}`];
      const finalName = (idOverride?.name || f.name || origName).trim();
      const finalCat = normalizeCategoryToValid(
        idOverride?.category || f.category || 'Räkningar',
        'expense'
      );
      const finalAmt = idOverride?.amount !== undefined ? idOverride.amount : rawDbAmt;
      const finalIsShared =
        idOverride?.isShared !== undefined ? idOverride.isShared : f.isShared;
      const finalFullAmt =
        idOverride?.fullAmount !== undefined ? idOverride.fullAmount : f.fullAmount;
      const finalDue = idOverride?.dueDay || f.deductionDay || f.dueDay || 27;
      const finalMethod = idOverride?.paymentMethod || f.paymentMethod || 'Autogiro';

      if (isValidUuid(f.id)) {
        dbIds.add(f.id);
      }

      const item: FixedExpenseItem = {
        id: validId,
        name: finalName,
        originalName: origName,
        amount: finalAmt,
        isShared: finalIsShared,
        fullAmount: finalFullAmt,
        dueDay: finalDue,
        category: finalCat,
        paymentMethod: finalMethod,
        logo: f.logo || getLogoUrl(finalName, finalCat),
        receiptUrl: f.receiptUrl,
        receiptName: f.receiptName,
      };

      const existingIdx = findExactSavedMatchIndex(item);
      if (existingIdx === -1) {
        unified.push(item);
      }
    }
  }

  // 2. Merge with current/cached/profile items so user-added or edited items are ALWAYS preserved
  for (const curr of currentList) {
    if (!curr || !curr.name) continue;
    if (curr.id && deletedIds.has(String(curr.id))) continue;

    const rawCurrAmt = Math.round(Number(curr.amount) || 0);
    const origName = curr.originalName || curr.name;
    const validId = ensureValidUuid(
      curr.id,
      `fixed:${uid || 'local'}:${normalizeMerchantKey(origName)}:${rawCurrAmt}:${curr.dueDay || 27}`
    );
    if (deletedIds.has(validId)) continue;

    const idOverride = overrides[`id:${validId}`];
    const finalName = (curr.name || idOverride?.name || origName).trim();
    const finalCat = normalizeCategoryToValid(
      curr.category || idOverride?.category || 'Räkningar',
      'expense'
    );
    const finalAmt = rawCurrAmt > 0 ? rawCurrAmt : idOverride?.amount || 0;
    const finalIsShared =
      curr.isShared !== undefined ? curr.isShared : idOverride?.isShared;
    const finalFullAmt =
      curr.fullAmount !== undefined ? curr.fullAmount : idOverride?.fullAmount;
    const finalDue = curr.dueDay || idOverride?.dueDay || 27;
    const finalMethod = curr.paymentMethod || idOverride?.paymentMethod || 'Autogiro';

    const candidate: FixedExpenseItem = {
      id: validId,
      name: finalName,
      originalName: origName,
      amount: finalAmt,
      isShared: finalIsShared,
      fullAmount: finalFullAmt,
      dueDay: finalDue,
      category: finalCat,
      paymentMethod: finalMethod,
      logo: curr.logo || getLogoUrl(finalName, finalCat),
      receiptUrl: curr.receiptUrl,
      receiptName: curr.receiptName,
    };

    const existingIdx = findExactSavedMatchIndex(candidate);
    if (existingIdx === -1) {
      unified.push(candidate);
      if (uid && !dbIds.has(validId)) {
        toPersist.push(candidate);
      }
    } else {
      const existing = unified[existingIdx];
      const merged: FixedExpenseItem = {
        ...existing,
        ...candidate,
        id: existing.id,
        logo: candidate.logo || existing.logo || getLogoUrl(finalName, finalCat),
        receiptUrl: candidate.receiptUrl || existing.receiptUrl,
        receiptName: candidate.receiptName || existing.receiptName,
      };
      unified[existingIdx] = merged;
      if (
        uid &&
        (!dbIds.has(merged.id) ||
          existing.name !== merged.name ||
          existing.amount !== merged.amount ||
          existing.dueDay !== merged.dueDay ||
          existing.category !== merged.category)
      ) {
        if (!toPersist.some((p) => p.id === merged.id)) {
          toPersist.push(merged);
        }
      }
    }
  }

  // 3. Only use automatic bank-detected fixed expenses if the user has NO fixed expenses yet
  // (e.g. initial onboarding). Once the user has fixed expenses, keep their list 100% static!
  const hasPriorHistory =
    unified.length > 0 || deletedIds.size > 0 || dismissed.size > 0;
  if (!hasPriorHistory && Array.isArray(detectedList)) {
    for (const det of detectedList) {
      const normName = normalizeMerchantKey(det.name);
      if (!normName || dismissed.has(normName)) continue;

      const detAmt = Math.round(Number(det.amount) || 0);
      const validId = ensureValidUuid(
        undefined,
        `fixed:${uid || 'local'}:${normName}:${detAmt}`
      );
      if (deletedIds.has(validId)) continue;

      const finalName = det.name.trim();
      const finalCat = normalizeCategoryToValid(det.category || 'Räkningar', 'expense');
      const finalDue = det.deductionDay || 27;
      const finalMethod = det.paymentMethod || 'Autogiro';

      const newItem: FixedExpenseItem = {
        id: validId,
        name: finalName,
        originalName: det.name,
        amount: detAmt,
        dueDay: finalDue,
        category: finalCat,
        paymentMethod: finalMethod,
        logo: det.logo || getLogoUrl(finalName, finalCat),
      };
      if (findExactSavedMatchIndex(newItem) === -1) {
        unified.push(newItem);
        if (uid && !dbIds.has(validId)) {
          toPersist.push(newItem);
        }
      }
    }
  }

  unified.sort((a, b) => a.dueDay - b.dueDay);
  return { items: unified, toPersist };
}

/**
 * Reconciles Incomes from DB, local state/cache, and (only on empty initial setup) bank detection
 * into a single deterministic, static list.
 */
function reconcileIncomesList(params: {
  currentList: IncomeItem[];
  dbList?: any[] | null;
  detectedList?: DetectedIncomeWithEvidence[] | null;
  targetPayday: number;
  uid?: string | null;
}): {
  items: IncomeItem[];
  toPersist: IncomeItem[];
} {
  const { currentList, dbList, detectedList, targetPayday, uid } = params;
  const dismissed = getDismissedIncomeMerchants();
  const deletedIds = getDeletedIncomeIds();
  const overrides = getManualIncomeOverrides();

  const unified: IncomeItem[] = [];
  const toPersist: IncomeItem[] = [];
  const dbIds = new Set<string>();

  const findExactSavedIncomeIndex = (candidate: IncomeItem) => {
    if (candidate.id) {
      const byIdIdx = unified.findIndex((u) => u.id === candidate.id);
      if (byIdIdx !== -1) return byIdIdx;
    }
    const candNameNorm = normalizeMerchantKey(candidate.name);
    const candAmt = Math.round(Math.abs(Number(candidate.amount) || 0));
    return unified.findIndex(
      (u) =>
        normalizeMerchantKey(u.name) === candNameNorm &&
        Math.round(Math.abs(Number(u.amount) || 0)) === candAmt
    );
  };

  if (Array.isArray(dbList)) {
    for (const i of dbList) {
      if (!i) continue;
      if (i.id && deletedIds.has(String(i.id))) continue;

      const rawAmt = Math.round(Number(i.amount) || 0);
      const origName = i.originalName || i.name || 'Inkomst';
      const validId = ensureValidUuid(
        i.id,
        `income:${uid || 'local'}:${normalizeMerchantKey(origName)}:${rawAmt}`
      );
      if (deletedIds.has(validId)) continue;

      const finalName = (i.name || origName).trim();
      const finalCat = normalizeCategoryToValid(i.category || 'Lön', 'income');
      const finalPayday = i.deductionDay || i.payday || targetPayday || 25;

      if (isValidUuid(i.id)) {
        dbIds.add(i.id);
      }

      const item: IncomeItem = {
        id: validId,
        name: finalName,
        originalName: origName,
        amount: rawAmt,
        payday: finalPayday,
        category: finalCat,
        logo: i.logo || getLogoUrl(finalName, finalCat),
      };

      if (findExactSavedIncomeIndex(item) === -1) {
        unified.push(item);
      }
    }
  }

  for (const curr of currentList) {
    if (!curr || !curr.name) continue;
    if (curr.id && deletedIds.has(String(curr.id))) continue;

    const rawAmt = Math.round(Number(curr.amount) || 0);
    const origName = curr.originalName || curr.name;
    const validId = ensureValidUuid(
      curr.id,
      `income:${uid || 'local'}:${normalizeMerchantKey(origName)}:${rawAmt}`
    );
    if (deletedIds.has(validId)) continue;

    const finalName = curr.name.trim();
    const finalCat = normalizeCategoryToValid(curr.category || 'Lön', 'income');
    const finalPayday = curr.payday || targetPayday || 25;

    const candidate: IncomeItem = {
      id: validId,
      name: finalName,
      originalName: origName,
      amount: rawAmt,
      payday: finalPayday,
      category: finalCat,
      logo: curr.logo || getLogoUrl(finalName, finalCat),
    };

    const existingIdx = findExactSavedIncomeIndex(candidate);
    if (existingIdx === -1) {
      unified.push(candidate);
      if (uid && !dbIds.has(validId)) {
        toPersist.push(candidate);
      }
    } else {
      const existing = unified[existingIdx];
      const merged: IncomeItem = {
        ...existing,
        ...candidate,
        id: existing.id,
        logo: candidate.logo || existing.logo || getLogoUrl(finalName, finalCat),
      };
      unified[existingIdx] = merged;
      if (
        uid &&
        (!dbIds.has(merged.id) ||
          existing.name !== merged.name ||
          existing.amount !== merged.amount ||
          existing.payday !== merged.payday ||
          existing.category !== merged.category)
      ) {
        if (!toPersist.some((p) => p.id === merged.id)) {
          toPersist.push(merged);
        }
      }
    }
  }

  const hasPriorIncomeHistory =
    unified.length > 0 || deletedIds.size > 0 || dismissed.size > 0;
  if (!hasPriorIncomeHistory && Array.isArray(detectedList)) {
    for (const det of detectedList) {
      const normName = normalizeMerchantKey(det.name);
      if (!normName || dismissed.has(normName)) continue;

      const manual = overrides[normName];
      const finalName = (manual?.name || det.name).trim();
      const finalCat = normalizeCategoryToValid(
        manual?.category || det.category || 'Lön',
        'income'
      );
      const detAmt = Math.round(Number(det.amount) || 0);
      const finalAmt = manual?.amount !== undefined ? manual.amount : detAmt;
      const finalPayday = manual?.payday || det.deductionDay || targetPayday || 25;

      const validId = ensureValidUuid(
        undefined,
        `income:${uid || 'local'}:${normName}:${finalAmt}`
      );
      if (deletedIds.has(validId)) continue;

      const newItem: IncomeItem = {
        id: validId,
        name: finalName,
        originalName: det.name,
        amount: finalAmt,
        payday: finalPayday,
        category: finalCat,
        logo: det.logo || getLogoUrl(finalName, finalCat),
      };
      if (findExactSavedIncomeIndex(newItem) === -1) {
        unified.push(newItem);
        if (uid && !dbIds.has(validId)) {
          toPersist.push(newItem);
        }
      }
    }
  }

  return { items: unified, toPersist };
}

function mapBankTransactionsToAppItems(
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

  // Samla alla reservationer (inklusive de som servern redan markerat som 'reserved_replaced'
  // när reservationen övergick till bokförd transaktion) så att köpdatum, klockslag,
  // butiksnamn och användarens markeringar (hjärta, paket, kvitto, delad utgift m.m.) alltid ärvs.
  const pendingCandidates = bankTxs.filter((bt) => {
    if (bt.booking_status === 'CNCL' || bt.booking_status === 'RJCT') return false;
    if (bt.reconciliation_status === 'excluded') return false;
    const isPendingOrReplaced =
      bt.booking_status === 'PDNG' ||
      bt.booking_status === 'HOLD' ||
      bt.reconciliation_status === 'reserved_replaced' ||
      Boolean(bt.replaced_by_bank_tx_id);
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

  // Pass 1: Explicit DB-koppling eller exakt beloppsmatchning (0–10 dagar)
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

    const pendingAmt = Math.round(Math.abs(getNormalizedBankTxAmount(bt)));
    const pendingCatInfo = categorizeBankTransactionForApp(bt);
    const pendingMerchant = pendingCatInfo.merchant.toLowerCase().trim();
    const pendingIsGeneric = isGenericPlaceholderMerchant(pendingMerchant);
    const pendingDate = getActualTransactionDate(bt);

    const matchedBooked = bookedNegativeTxs.find((b) => {
      if (consumedBookedIdsForPending.has(b.id)) return false;
      if (
        bt.bank_account_id &&
        b.bank_account_id &&
        bt.bank_account_id !== b.bank_account_id
      ) {
        return false;
      }
      const bAmt = Math.round(Math.abs(getNormalizedBankTxAmount(b)));
      if (bAmt !== pendingAmt) return false;

      const bCatInfo = categorizeBankTransactionForApp(b);
      const bMerchant = bCatInfo.merchant.toLowerCase().trim();
      const bookedIsGeneric = isGenericPlaceholderMerchant(bMerchant);

      const merchantsMatch =
        bMerchant === pendingMerchant ||
        pendingIsGeneric ||
        bookedIsGeneric ||
        (bt.description && bt.description.toLowerCase().includes(bMerchant)) ||
        (b.description && b.description.toLowerCase().includes(pendingMerchant));
      if (!merchantsMatch) return false;

      const bDate = getActualTransactionDate(b);
      if (pendingDate && bDate) {
        const diffMs = new Date(bDate).getTime() - new Date(pendingDate).getTime();
        const dayDiff = Math.abs(diffMs) / (1000 * 60 * 60 * 24);
        if (dayDiff <= 10 && diffMs >= -86_400_000) {
          return true;
        }
      }
      return false;
    });

    if (matchedBooked) {
      recordReservationMatch(bt, matchedBooked);
    }
  }

  // Pass 2: Ändrat slutbelopp för ersatta reservationer ('reserved_replaced'),
  // t.ex. bensinstation (1 500 kr -> 642 kr), hotell eller matbutik online (ICA/Mathem).
  for (const bt of pendingCandidates) {
    if (settledPendingIds.has(bt.id)) continue;
    if (
      bt.reconciliation_status !== 'reserved_replaced' &&
      !bt.replaced_by_bank_tx_id
    ) {
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

      const sameMerchant =
        bMerchant === pendingMerchant ||
        (pendingMerchant.length >= 4 && bMerchant.includes(pendingMerchant)) ||
        (bMerchant.length >= 4 && pendingMerchant.includes(bMerchant));
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

  const mappedBankTxs: TransactionItem[] = bankTxs
    .filter((bt) => {
      if (bt.booking_status === 'CNCL' || bt.booking_status === 'RJCT') return false;
      if (
        bt.reconciliation_status === 'reserved_replaced' ||
        bt.replaced_by_bank_tx_id ||
        settledPendingIds.has(bt.id)
      ) {
        return false;
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
      let catInfo = categorizeBankTransactionForApp(bt);
      const reservationMeta = bookedToReservationMeta.get(bt.id);
      if (
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

      if (isIncome) {
        const combinedDesc = `${bt.description || ''} ${bt.counterparty_name || ''}`.toLowerCase();
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
          combinedDesc.includes('återbetalning') ||
          combinedDesc.includes('aterbetalning') ||
          combinedDesc.includes('retur') ||
          combinedDesc.includes('refund') ||
          combinedDesc.includes('återköp') ||
          combinedDesc.includes('aterkop')
        ) {
          incomeCat = 'Återbetalning';
        }

        const cleanName =
          incomeCat === 'Swish'
            ? formatSwishTitle(bt.description, bt.counterparty_name)
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
          valueDate: bt.value_date || undefined,
          bankAccountId: bt.bank_account_id || undefined,
          bankAccountName,
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
                  ...(bt.raw_json?.creditor_account
                    ? { creditor_account: bt.raw_json.creditor_account }
                    : {}),
                  ...(bt.raw_json?.debtor_account
                    ? { debtor_account: bt.raw_json.debtor_account }
                    : {}),
                  ...(bt.raw_json?.card_transaction
                    ? {
                        card_transaction: {
                          transaction_date_time:
                            bt.raw_json.card_transaction.transaction_date_time || true,
                        },
                      }
                    : {}),
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

  return deduplicateTransactions(mappedBankTxs);
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedHistoryAccountId, setSelectedHistoryAccountId] = useState<string | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>('main');
  const [incomingSwishRequest, setIncomingSwishRequest] = useState<{
    payee: string;
    amount: number;
    msg: string;
    deepLink: string;
  } | null>(null);
  const [undoToast, setUndoToast] = useState<{
    id: string;
    excluded: boolean;
    title: string;
  } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('swish_pay') === '1') {
      const payee = (params.get('payee') || '').replace(/\D/g, '');
      const amount = Math.max(1, Math.round(Number(params.get('amount')) || 0));
      const msg = (params.get('msg') || '').trim();
      if (payee) {
        const payload = {
          version: 1,
          payee: { value: payee, editable: false },
          amount: { value: amount, editable: false },
          message: { value: msg, editable: false },
        };
        const deepLink = `swish://payment?data=${encodeURIComponent(JSON.stringify(payload))}`;
        setIncomingSwishRequest({ payee, amount, msg, deepLink });
        window.location.href = deepLink;
      }
    }
  }, []);

  const initialCache = useMemo(() => loadCachedAppState(), []);

  // Lönedagsinställning (standard 25:e)
  const [targetPayday, setTargetPayday] = useState<number>(
    () => initialCache?.targetPayday || 25
  );

  // Helghantering (standard 'before' = fredagen före helg)
  const [weekendHandling, setWeekendHandling] = useState<WeekendHandlingMode>(
    () => (initialCache?.weekendHandling as WeekendHandlingMode) || 'before'
  );

  // Enable Banking connections & accounts
  const [connections, setConnections] = useState<BankConnection[]>(
    () => initialCache?.connections || []
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(
    () => initialCache?.bankAccounts || []
  );
  const [syncingBank, setSyncingBank] = useState(false);
  const [callbackStatusMsg, setCallbackStatusMsg] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && params.get('state')) {
      return 'Slutför bankkoppling och hämtar dina konton...';
    }
    return null;
  });
  const pendingBankCallbackRef = useRef<{
    code: string;
    state: string;
    promise: Promise<void> | null;
    done: boolean;
  } | null>(
    (() => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (code && state) {
        return { code, state, promise: null, done: false };
      }
      return null;
    })()
  );

  // Inställning för att dölja och exkludera interna överföringar från "Kvar att spendera"
  const [excludeInternalTransfers, setExcludeInternalTransfersState] = useState<boolean>(() =>
    getExcludeInternalTransfers()
  );

  const handleToggleExcludeInternalTransfers = useCallback((val: boolean) => {
    setExcludeInternalTransfersState(val);
    setExcludeInternalTransfers(val);
  }, []);

  // Initial loading guard: only true if there is completely no cached banking data
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(
    () => !hasCachedBankData()
  );

  // Refs för tyst automatisk bakgrundssynk & atomär hydrering
  const syncInFlightRef = useRef(false);
  const lastSyncTimestampRef = useRef<number>(0);
  const hydrationInFlightRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> | null>(null);
  const pendingRefreshRef = useRef(false);

  // Riktiga inkomster
  const [incomes, setIncomes] = useState<IncomeItem[]>(
    () => initialCache?.incomes || []
  );

  // Riktiga fasta utgifter
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseItem[]>(
    () => initialCache?.fixedExpenses || []
  );

  // Riktiga köp (tvättas direkt vid laddning så att ev. gamla felaktiga alias återställs till bankens namn)
  const [transactions, setTransactions] = useState<TransactionItem[]>(() => {
    const rawList = initialCache?.transactions || [];
    const initFixed = initialCache?.fixedExpenses || [];
    const initInc = initialCache?.incomes || [];
    const initAliases = getMerchantAliases();
    return rawList.map((tx) => sanitizeTransactionItem(tx, initFixed, initInc, initAliases));
  });

  // Refs till senaste listorna så att asynkrona synkar aldrig läser utdaterade closures
  const incomesRef = useRef<IncomeItem[]>(incomes);
  useEffect(() => {
    incomesRef.current = incomes;
  }, [incomes]);

  const fixedExpensesRef = useRef<FixedExpenseItem[]>(fixedExpenses);
  useEffect(() => {
    fixedExpensesRef.current = fixedExpenses;
  }, [fixedExpenses]);

  const transactionsRef = useRef<TransactionItem[]>(transactions);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Tyst AI-tvätt i bakgrunden för kryptiska/okända bankrader (t.ex. ZETTLE*GBG KAF, NYX*SVENSKA, KLARNA*84920)
  const aiCleanedKeysRef = useRef<Set<string>>(new Set());
  const aiCleanInFlightRef = useRef<boolean>(false);

  useEffect(() => {
    if (aiCleanInFlightRef.current || transactions.length === 0) return;

    const currentAliases = getMerchantAliases();
    const candidatesByKey = new Map<
      string,
      { key: string; rawText: string; amount: number; time: string; type: 'expense' | 'income' }
    >();

    for (const tx of transactions) {
      if (!tx || tx.isExcluded) continue;
      const rawSource = (
        tx.rawDescription ||
        tx.counterpartyName ||
        tx.note ||
        tx.title ||
        ''
      ).trim();
      if (!rawSource || rawSource.length < 2) continue;

      const normKey = normalizeMerchantKey(rawSource);
      if (!normKey || aiCleanedKeysRef.current.has(normKey)) continue;

      // Hoppa över om användaren eller tidigare AI-körning redan har sparat ett alias
      if (resolveMerchantAlias(rawSource, currentAliases)) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }

      // Hoppa över om den matchar en fast utgift eller fast inkomst
      if (
        tx.type !== 'income' &&
        fixedExpensesRef.current.length > 0 &&
        findMatchingFixedExpense(tx, fixedExpensesRef.current)
      ) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }
      if (
        tx.type === 'income' &&
        incomesRef.current.length > 0 &&
        findMatchingIncome(tx, incomesRef.current)
      ) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }

      if (needsAiMerchantCleaning(rawSource, tx.title, tx.category)) {
        if (!candidatesByKey.has(normKey)) {
          candidatesByKey.set(normKey, {
            key: normKey,
            rawText: rawSource,
            amount: tx.amount,
            time: getTransactionTime(tx),
            type: tx.type === 'income' ? 'income' : 'expense',
          });
        }
      } else {
        aiCleanedKeysRef.current.add(normKey);
      }
    }

    if (candidatesByKey.size === 0) return;

    const batchItems = Array.from(candidatesByKey.values()).slice(0, 35);
    for (const item of batchItems) {
      aiCleanedKeysRef.current.add(item.key);
    }

    aiCleanInFlightRef.current = true;
    const expenseCategories = getStoredExpenseCategories().map((c) => c.name);
    const incomeCategories = getStoredIncomeCategories().map((c) => c.name);

    fetch('/api/ai/clean-merchants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: batchItems,
        expenseCategories,
        incomeCategories,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (
          isDeletingAccountRef.current ||
          !userIdRef.current ||
          !data ||
          !Array.isArray(data.results) ||
          data.results.length === 0
        ) {
          return;
        }

        let anySaved = false;
        for (const resItem of data.results) {
          const orig = candidatesByKey.get(resItem.key);
          if (!orig || !resItem.cleanName) continue;
          const cleanTrimmed = String(resItem.cleanName).trim();
          if (
            !cleanTrimmed ||
            isGenericPlaceholderMerchant(cleanTrimmed) ||
            isGenericPlaceholderMerchant(orig.rawText)
          ) {
            continue;
          }
          const validCat = normalizeCategoryToValid(
            resItem.category,
            orig.type
          );
          saveMerchantAlias(orig.rawText, cleanTrimmed, validCat);
          anySaved = true;
        }

        if (anySaved && !isDeletingAccountRef.current && userIdRef.current) {
          const updatedAliases = getMerchantAliases();
          setTransactions((prev) => {
            const next = deduplicateTransactions(
              prev.map((t) =>
                sanitizeTransactionItem(
                  t,
                  fixedExpensesRef.current,
                  incomesRef.current,
                  updatedAliases
                )
              )
            );
            saveCachedAppState({ transactions: next });
            return next;
          });
        }
      })
      .catch(() => {
        // Ignorera nätverksfel tyst i bakgrunden
      })
      .finally(() => {
        aiCleanInFlightRef.current = false;
      });
  }, [transactions]);

  // Inloggad användare i Supabase
  const [userId, setUserId] = useState<string | null>(
    () => initialCache?.userId || null
  );
  const [userEmail, setUserEmail] = useState<string | null>(
    () => initialCache?.userEmail || null
  );
  const [userName, setUserName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('dejz_user_name') || null;
    } catch {
      return null;
    }
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(
    () => initialCache?.userAvatar || null
  );

  // Landningssida & Onboarding
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('dejz_onboarding_v2_done') === 'true') {
        return false;
      }
      if (localStorage.getItem('dejz_onboarding_in_progress') === 'true') {
        return true;
      }
      if (initialCache?.userId && localStorage.getItem('dejz_onboarding_v2_done') !== 'true') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [showLanding, setShowLanding] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('dejz_logged_out') === 'true') {
        return true;
      }
      if (localStorage.getItem('dejz_onboarding_in_progress') === 'true') {
        return false;
      }
      if (localStorage.getItem('dejz_onboarding_v2_done') === 'true') {
        return false;
      }
      if (initialCache?.userId) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  });

  const userIdRef = useRef<string | null>(userId);
  const isDeletingAccountRef = useRef<boolean>(false);
  const lastHydratedUserIdRef = useRef<string | null>(initialCache?.userId || null);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Modaltillstånd
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [preselectedBankName, setPreselectedBankName] = useState<string | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeItem | null>(null);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState<FixedExpenseItem | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // Borttagna genererade inkomst-ID:n
  const [dismissedTxIds, setDismissedTxIds] = useState<string[]>([]);

  // Ladda Enable Banking status + banktransaktioner och synka atomärt med befintligt state
  const refreshBankStatus = useCallback(async (): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> => {
    if (!userIdRef.current || isDeletingAccountRef.current) {
      return { connections: [], accounts: [] };
    }
    if (refreshInFlightRef.current) {
      pendingRefreshRef.current = true;
      return refreshInFlightRef.current;
    }

    const runRefresh = async (): Promise<{
      connections: BankConnection[];
      accounts: BankAccount[];
    }> => {
      const requestedUid = userIdRef.current;
      if (!requestedUid || isDeletingAccountRef.current) {
        return { connections: [], accounts: [] };
      }
      try {
        const [status, bankTxs] = await Promise.all([
          bankService.getStatus(),
          bankService.listAllTransactionsForReconciliation(5000).catch(() => []),
        ]);
        const activeUid = userIdRef.current;
        if (!activeUid || isDeletingAccountRef.current || activeUid !== requestedUid) {
          return { connections: [], accounts: [] };
        }

        const conns = status.connections || [];
        const accs = status.accounts || [];
        const hasActiveConns = conns.some((c) => c.status !== 'revoked');

        if (hasActiveConns && Array.isArray(bankTxs) && bankTxs.length > 0) {
          const analyzed = analyzeBankTransactionsForOnboarding(
            bankTxs,
            targetPayday,
            weekendHandling === 'before',
            accs
          );

          const reconciledInc = reconcileIncomesList({
            currentList: incomesRef.current,
            detectedList: analyzed.detectedIncomes,
            targetPayday,
            uid: activeUid,
          });

          const reconciledFix = reconcileFixedExpensesList({
            currentList: fixedExpensesRef.current,
            detectedList: analyzed.detectedFixedExpenses,
            uid: activeUid,
          });

          const aliases = getMerchantAliases();
          const prevMap = new Map(transactionsRef.current.map((t) => [t.id, t]));
          const uniqueBankTxs = mapBankTransactionsToAppItems(
            bankTxs,
            accs,
            reconciledFix.items,
            reconciledInc.items,
            aliases
          ).map((tx) => {
            const prev = prevMap.get(tx.id);
            if (!prev) return tx;
            return {
              ...tx,
              isHearted: prev.isHearted ?? tx.isHearted,
              isWaitingForPackage: prev.isWaitingForPackage ?? tx.isWaitingForPackage,
              receiptUrl: prev.receiptUrl ?? tx.receiptUrl,
              receiptName: prev.receiptName ?? tx.receiptName,
              note: prev.note ?? tx.note,
            };
          });

          const nonBankPrev = transactionsRef.current
            .filter((p) => !p.id.startsWith('bank-'))
            .map((t) =>
              sanitizeTransactionItem(t, reconciledFix.items, reconciledInc.items, aliases)
            );

          const combinedTxs = deduplicateTransactions([...uniqueBankTxs, ...nonBankPrev]);
          combinedTxs.sort((a, b) => {
            const dCmp = b.date.localeCompare(a.date);
            if (dCmp !== 0) return dCmp;
            return getTransactionTime(b).localeCompare(getTransactionTime(a));
          });

          if (!userIdRef.current || isDeletingAccountRef.current || userIdRef.current !== activeUid) {
            return { connections: [], accounts: [] };
          }

          // Uppdatera samtliga states i ett enda atomärt steg (inget hoppande eller flimmer)
          incomesRef.current = reconciledInc.items;
          fixedExpensesRef.current = reconciledFix.items;
          transactionsRef.current = combinedTxs;

          setConnections(conns);
          setBankAccounts(accs);
          setIncomes(reconciledInc.items);
          setFixedExpenses(reconciledFix.items);
          setTransactions(combinedTxs);
          setIsInitialLoading(false);

          saveCachedAppState({
            userId: activeUid,
            connections: conns,
            bankAccounts: accs,
            incomes: reconciledInc.items,
            fixedExpenses: reconciledFix.items,
            transactions: combinedTxs,
            targetPayday,
            weekendHandling,
          });

          // Spara eventuella nyupptäckta fasta poster till Supabase i bakgrunden så DB och cache alltid matchar
          if (activeUid && !isDeletingAccountRef.current) {
            for (const item of reconciledFix.toPersist) {
              dataService
                .saveFixedExpense(activeUid, {
                  id: item.id,
                  name: item.name,
                  originalName: item.originalName,
                  amount: item.amount,
                  deductionDay: item.dueDay,
                  category: item.category,
                  paymentMethod: item.paymentMethod || 'Autogiro',
                  frequency: Frequency.MONTHLY,
                  logo: item.logo,
                })
                .catch(() => {});
            }
            for (const inc of reconciledInc.toPersist) {
              dataService
                .saveIncomeSource(activeUid, {
                  id: inc.id,
                  name: inc.name,
                  originalName: inc.originalName,
                  amount: inc.amount,
                  deductionDay: inc.payday,
                  category: inc.category,
                  frequency: Frequency.MONTHLY,
                  logo: inc.logo,
                })
                .catch(() => {});
            }
          }
        } else {
          if (!userIdRef.current || isDeletingAccountRef.current || userIdRef.current !== activeUid) {
            return { connections: [], accounts: [] };
          }
          setConnections(conns);
          setBankAccounts(accs);
          setIsInitialLoading(false);

          if (!hasActiveConns) {
            const nonBankOnly = transactionsRef.current.filter((p) => !p.id.startsWith('bank-'));
            if (nonBankOnly.length !== transactionsRef.current.length) {
              transactionsRef.current = nonBankOnly;
              setTransactions(nonBankOnly);
            }
            saveCachedAppState({
              userId: activeUid,
              connections: conns,
              bankAccounts: accs,
              transactions: nonBankOnly,
            });
          } else {
            saveCachedAppState({
              userId: activeUid,
              connections: conns,
              bankAccounts: accs,
            });
          }
        }

        return { connections: conns, accounts: accs };
      } catch {
        setIsInitialLoading(false);
        return { connections: [], accounts: [] };
      } finally {
        refreshInFlightRef.current = null;
        if (pendingRefreshRef.current && userIdRef.current && !isDeletingAccountRef.current) {
          pendingRefreshRef.current = false;
          void refreshBankStatus();
        } else {
          pendingRefreshRef.current = false;
        }
      }
    };

    const promise = runRefresh();
    refreshInFlightRef.current = promise;
    return promise;
  }, [targetPayday, weekendHandling]);

  // Atomär helhetshydrering av både Supabase-tabeller och Bankdata samtidigt vid appstart
  const loadSupabaseUserData = useCallback(
    async (
      uid: string
    ): Promise<{ connections: BankConnection[]; accounts: BankAccount[] }> => {
      if (!uid || isDeletingAccountRef.current) {
        return { connections: [], accounts: [] };
      }

      const cachedState = loadCachedAppState();
      const isDifferentUser =
        (lastHydratedUserIdRef.current !== null && lastHydratedUserIdRef.current !== uid) ||
        (cachedState?.userId !== undefined && cachedState.userId !== null && cachedState.userId !== uid);

      if (isDifferentUser) {
        incomesRef.current = [];
        fixedExpensesRef.current = [];
        transactionsRef.current = [];
        clearCachedAppState();
      }
      lastHydratedUserIdRef.current = uid;

      try {
        const [
          dbIncomes,
          dbFixed,
          dbTxs,
          dbSettings,
          dbProfile,
          bankStatus,
          bankTxs,
        ] = await Promise.all([
          dataService.getIncomeSources(uid).catch(() => []),
          dataService.getFixedExpenses(uid).catch(() => []),
          dataService.getTransactions(uid).catch(() => []),
          dataService.getSettings(uid).catch(() => null),
          dataService.getProfile(uid).catch(() => null),
          bankService.getStatus().catch(() => ({ connections: [], accounts: [] })),
          bankService.listAllTransactionsForReconciliation(5000).catch(() => []),
        ]);

        if (isDeletingAccountRef.current || userIdRef.current !== uid) {
          return { connections: [], accounts: [] };
        }

        const conns = bankStatus.connections || [];
        const accs = bankStatus.accounts || [];
        const hasActiveConns = conns.some((c) => c.status !== 'revoked');
        const validBankTxs = hasActiveConns && Array.isArray(bankTxs) ? bankTxs : [];

        const resolvedPayday = dbSettings?.payday || targetPayday || 25;
        let resolvedWeekend: WeekendHandlingMode = weekendHandling;
        if (dbSettings?.paydayBeforeWeekend !== undefined) {
          const savedLocal = localStorage.getItem('dejz_weekend_handling');
          if (!savedLocal) {
            resolvedWeekend = dbSettings.paydayBeforeWeekend ? 'before' : 'none';
          }
        }

        if (dbSettings?.payday) {
          setTargetPayday(resolvedPayday);
        }
        if (resolvedWeekend !== weekendHandling) {
          setWeekendHandling(resolvedWeekend);
        }
        if (dbProfile) {
          hydrateAllUserPreferencesFromProfile(dbProfile);
          setExcludeInternalTransfersState(getExcludeInternalTransfers());
        }
        if (dbProfile?.avatar_url) {
          setUserAvatar(dbProfile.avatar_url);
        }

        const analyzed =
          validBankTxs.length > 0
            ? analyzeBankTransactionsForOnboarding(
                validBankTxs,
                resolvedPayday,
                resolvedWeekend === 'before',
                accs
              )
            : null;

        const profileSavedFixed = extractSavedFixedFromProfile(dbProfile);
        const profileSavedIncomes = extractSavedIncomesFromProfile(dbProfile);

        const localIncomesToMerge = !isDifferentUser
          ? [
              ...profileSavedIncomes,
              ...(cachedState?.incomes || []),
              ...incomesRef.current,
            ]
          : [...profileSavedIncomes];

        const localFixedToMerge = !isDifferentUser
          ? [
              ...profileSavedFixed,
              ...(cachedState?.fixedExpenses || []),
              ...fixedExpensesRef.current,
            ]
          : [...profileSavedFixed];

        const reconciledInc = reconcileIncomesList({
          currentList: localIncomesToMerge,
          dbList: dbIncomes,
          detectedList: analyzed?.detectedIncomes || null,
          targetPayday: resolvedPayday,
          uid,
        });

        const reconciledFix = reconcileFixedExpensesList({
          currentList: localFixedToMerge,
          dbList: dbFixed,
          detectedList: analyzed?.detectedFixedExpenses || null,
          uid,
        });

        const aliases = getMerchantAliases();

        const mappedDbTxs: TransactionItem[] = Array.isArray(dbTxs)
          ? dbTxs.map((t) => {
              const isIncome = t.type === 'income';
              const title =
                t.merchant || t.note || t.category || (isIncome ? 'Inkomst' : 'Utgift');
              const cat = t.category || (isIncome ? 'Inkomst' : 'Övrigt');
              const todayStr = getSwedishDateStr();
              let dateStr = formatIsoDateStockholm(t.timestamp);
              if (dateStr > todayStr) {
                dateStr = todayStr;
              }
              const explicitTime = t.timestamp ? formatIsoTimeStockholm(t.timestamp) : null;
              return sanitizeTransactionItem(
                {
                  id: t.id,
                  title,
                  amount: Math.abs(Number(t.amount) || 0),
                  type: isIncome ? ('income' as const) : ('expense' as const),
                  category: cat,
                  date: dateStr,
                  time:
                    explicitTime ||
                    getTransactionTime({
                      id: t.id,
                      title,
                      category: cat,
                      date: dateStr,
                      note: t.note,
                      amount: Math.abs(Number(t.amount) || 0),
                    }),
                  note: t.note,
                  logo: t.logo || getLogoUrl(title, cat),
                },
                reconciledFix.items,
                reconciledInc.items,
                aliases
              );
            })
          : [];

        const prevMap = new Map(transactionsRef.current.map((t) => [t.id, t]));
        const uniqueBankTxs =
          validBankTxs.length > 0
            ? mapBankTransactionsToAppItems(
                validBankTxs,
                accs,
                reconciledFix.items,
                reconciledInc.items,
                aliases
              ).map((tx) => {
                const prev = prevMap.get(tx.id);
                if (!prev) return tx;
                return {
                  ...tx,
                  isHearted: prev.isHearted ?? tx.isHearted,
                  isWaitingForPackage: prev.isWaitingForPackage ?? tx.isWaitingForPackage,
                  receiptUrl: prev.receiptUrl ?? tx.receiptUrl,
                  receiptName: prev.receiptName ?? tx.receiptName,
                  note: prev.note ?? tx.note,
                };
              })
            : [];

        const combinedTxs = deduplicateTransactions([...uniqueBankTxs, ...mappedDbTxs]);
        combinedTxs.sort((a, b) => {
          const dCmp = b.date.localeCompare(a.date);
          if (dCmp !== 0) return dCmp;
          return getTransactionTime(b).localeCompare(getTransactionTime(a));
        });

        if (isDeletingAccountRef.current || userIdRef.current !== uid) {
          return { connections: [], accounts: [] };
        }

        // Tillämpa alla beräknade listor i ett enda atomärt steg
        incomesRef.current = reconciledInc.items;
        fixedExpensesRef.current = reconciledFix.items;
        transactionsRef.current = combinedTxs;

        setConnections(conns);
        setBankAccounts(accs);
        setIncomes(reconciledInc.items);
        setFixedExpenses(reconciledFix.items);
        setTransactions(combinedTxs);
        setIsInitialLoading(false);

        saveCachedAppState({
          userId: uid,
          userAvatar: dbProfile?.avatar_url || userAvatar,
          targetPayday: resolvedPayday,
          weekendHandling: resolvedWeekend,
          connections: conns,
          bankAccounts: accs,
          incomes: reconciledInc.items,
          fixedExpenses: reconciledFix.items,
          transactions: combinedTxs,
        });

        // Synka nyupptäckta fasta poster till Supabase så att databasen aldrig saknar bankupptäckta poster
        if (!isDeletingAccountRef.current && userIdRef.current === uid) {
          for (const item of reconciledFix.toPersist) {
            dataService
              .saveFixedExpense(uid, {
                id: item.id,
                name: item.name,
                originalName: item.originalName,
                amount: item.amount,
                isShared: item.isShared,
                fullAmount: item.fullAmount,
                receiptUrl: item.receiptUrl,
                receiptName: item.receiptName,
                deductionDay: item.dueDay,
                category: item.category,
                paymentMethod: item.paymentMethod || 'Autogiro',
                frequency: Frequency.MONTHLY,
                logo: item.logo,
              })
              .catch(() => {});
          }
          for (const inc of reconciledInc.toPersist) {
            dataService
              .saveIncomeSource(uid, {
                id: inc.id,
                name: inc.name,
                originalName: inc.originalName,
                amount: inc.amount,
                deductionDay: inc.payday,
                category: inc.category,
                frequency: Frequency.MONTHLY,
                logo: inc.logo,
              })
              .catch(() => {});
          }
        }

        return { connections: conns, accounts: accs };
      } catch {
        setIsInitialLoading(false);
        return { connections: [], accounts: [] };
      }
    },
    [targetPayday, weekendHandling, userAvatar]
  );

  // Tyst bakgrundssynk mot Enable Banking via Supabase Edge Function
  const performSilentBankSync = useCallback(
    async (force = false) => {
      if (syncInFlightRef.current) return;
      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < AUTO_SYNC_COOLDOWN_MS) {
        return;
      }

      syncInFlightRef.current = true;
      lastSyncTimestampRef.current = now;

      try {
        await bankService.sync();
        await refreshBankStatus();
      } catch {
        // Tyst felhantering vid automatisk bakgrundssynk
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [refreshBankStatus]
  );

  // Hantera Enable Banking OAuth callback (?code=...&state=...) koordinerat utan race conditions
  const processPendingBankCallback = useCallback(async () => {
    const pending = pendingBankCallbackRef.current;
    if (!pending || pending.done) return;
    if (pending.promise) {
      await pending.promise;
      return;
    }

    const runExchange = async () => {
      try {
        setCallbackStatusMsg('Slutför bankkoppling och hämtar dina konton...');
        window.history.replaceState({}, '', '/');

        const res = await bankService.exchangeCode({
          code: pending.code,
          state: pending.state,
        });

        try {
          localStorage.removeItem('dejz_onboarding_pending_bank_auth');
        } catch {
          // ignore
        }

        const isOnboardingCallback =
          res.originContext === 'onboarding' ||
          localStorage.getItem('dejz_onboarding_in_progress') === 'true';

        if (isOnboardingCallback) {
          try {
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '2');
            localStorage.removeItem('dejz_onboarding_accounts_confirmed');
          } catch {
            // ignore
          }
          setIsOnboardingActive(true);
          setShowLanding(false);
        }

        // Uppdatera anslutning & konton direkt så att onboardingen reagerar omedelbart
        if (res.connection) {
          setConnections((prev) => {
            const filtered = prev.filter((c) => c.id !== res.connection.id);
            return [res.connection, ...filtered];
          });
        }
        if (Array.isArray(res.accounts) && res.accounts.length > 0) {
          setBankAccounts((prev) => {
            const newIds = new Set(res.accounts.map((a) => a.id));
            const kept = prev.filter((a) => !newIds.has(a.id));
            return [...res.accounts, ...kept];
          });
        }

        // Under onboardingen får användaren FÖRST välja vilka konton som ska synkas i steg 2 ("Välj konton")!
        // Endast om banken kopplades inifrån Inställningar (utanför onboardingen) synkas alla direkt.
        const allIds = (res.accounts || []).map((a) => a.id);
        if (!isOnboardingCallback && res.connection && allIds.length > 0) {
          await bankService
            .selectAccounts({
              connectionId: res.connection.id,
              selectedAccountIds: allIds,
            })
            .catch(() => {});
          setCallbackStatusMsg('Synkar transaktioner från din bank...');
          await bankService
            .sync({ connectionId: res.connection.id, fullSync: true })
            .catch(() => {});
          await refreshBankStatus();
        }

        pending.done = true;
        setCallbackStatusMsg(null);
        if (!isOnboardingCallback) {
          setIsBankModalOpen(true);
        }
      } catch (err: any) {
        pending.done = true;
        setCallbackStatusMsg(`Kunde inte slutföra bankkoppling: ${err.message || 'Okänt fel'}`);
        setTimeout(() => setCallbackStatusMsg(null), 6000);
      }
    };

    pending.promise = runExchange();
    await pending.promise;
  }, [refreshBankStatus]);

  useEffect(() => {
    if (userId && pendingBankCallbackRef.current && !pendingBankCallbackRef.current.done) {
      processPendingBankCallback();
    }
  }, [userId, processPendingBankCallback]);

  // Initiera Supabase-session och trigga en enda koordinerad, atomär hydrering vid appstart
  useEffect(() => {
    const runCoordinateHydration = async (sessionUser: any) => {
      if (isDeletingAccountRef.current) return;
      const uid = sessionUser.id;
      setUserId(uid);
      userIdRef.current = uid;
      setUserEmail(sessionUser.email || null);

      try {
        const isOnboardingPending =
          localStorage.getItem('dejz_onboarding_in_progress') === 'true';
        const isOnboardingDone =
          localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
          localStorage.getItem('dejz_onboarding_completed') === 'true';
        const isBrandNewUser =
          !isOnboardingDone &&
          Boolean(sessionUser?.created_at) &&
          Date.now() - new Date(sessionUser.created_at).getTime() < 90_000;

        if (isOnboardingPending || isBrandNewUser) {
          if (!isOnboardingPending) {
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '1');
          }
          setIsOnboardingActive(true);
        }
      } catch {
        // ignore
      }

      setShowLanding(false);
      const metaAvatar =
        sessionUser.user_metadata?.avatar_url ||
        sessionUser.user_metadata?.picture ||
        null;
      if (metaAvatar) setUserAvatar(metaAvatar);

      const metaFullName =
        sessionUser.user_metadata?.full_name ||
        sessionUser.user_metadata?.name ||
        '';
      if (metaFullName && typeof metaFullName === 'string') {
        const firstName = metaFullName.trim().split(/\s+/)[0];
        if (firstName) {
          setUserName((prev) => {
            if (prev) return prev;
            try {
              localStorage.setItem('dejz_user_name', firstName);
            } catch {
              // ignore
            }
            return firstName;
          });
        }
      }

      // Förhindra att getSession och onAuthStateChange kör dubbla parallella hydreringar vid mount
      if (hydrationInFlightRef.current === uid) {
        return;
      }
      hydrationInFlightRef.current = uid;
      try {
        // Om vi precis kom tillbaka från BankID / Enable Banking (?code=...&state=...),
        // slutför bankkopplingen FÖRE loadSupabaseUserData så att tom data aldrig skriver över kopplingen!
        if (pendingBankCallbackRef.current && !pendingBankCallbackRef.current.done) {
          await processPendingBankCallback();
        }
        const status = await loadSupabaseUserData(uid);
        const activeConns = status.connections.filter((c) => c.status === 'active');
        const isWaitingForOnboardingAccountChoice =
          localStorage.getItem('dejz_onboarding_in_progress') === 'true' &&
          localStorage.getItem('dejz_onboarding_accounts_confirmed') !== 'true';

        if (activeConns.length > 0 && !isWaitingForOnboardingAccountChoice) {
          // Kontrollera om banken redan synkades alldeles nyss (inom senaste 3 minuterna)
          // för att undvika dubbel hämtning direkt vid appstart
          const latestSyncMs = activeConns.reduce((maxMs, conn) => {
            const t = conn.last_synced_at ? new Date(conn.last_synced_at).getTime() : 0;
            return Number.isFinite(t) && t > maxMs ? t : maxMs;
          }, 0);
          const syncedRecently = latestSyncMs > 0 && Date.now() - latestSyncMs < 180_000;
          if (syncedRecently) {
            lastSyncTimestampRef.current = latestSyncMs;
          } else {
            performSilentBankSync(false);
          }
        }
      } finally {
        hydrationInFlightRef.current = null;
        setIsInitialLoading(false);
      }
    };

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }: any) => {
        if (session?.user && localStorage.getItem('dejz_logged_out') !== 'true') {
          await runCoordinateHydration(session.user);
        } else {
          setIsInitialLoading(false);
        }
      })
      .catch(() => {
        setIsInitialLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (session?.user && localStorage.getItem('dejz_logged_out') !== 'true') {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || session.user.id !== userIdRef.current) {
          void runCoordinateHydration(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        userIdRef.current = null;
        setUserEmail(null);
        setUserName(null);
        setUserAvatar(null);
        setConnections([]);
        setBankAccounts([]);
        setIncomes([]);
        setFixedExpenses([]);
        setTransactions([]);
        setIsInitialLoading(false);
        setShowLanding(true);
        setIsOnboardingActive(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadSupabaseUserData, performSilentBankSync]);

  // Kontinuerlig automatisk synk i appen
  const hasActiveBankConnection = useMemo(
    () => connections.some((c) => c.status === 'active'),
    [connections]
  );

  useEffect(() => {
    if (!userId || !hasActiveBankConnection) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [userId, hasActiveBankConnection, performSilentBankSync]);

  // Supabase Realtime: Lyssna på databasändringar med debounce för att undvika synk-stormar
  useEffect(() => {
    if (!userId) return;

    let debounceTimer: number | null = null;
    const scheduleDebouncedRefresh = () => {
      // Om performSilentBankSync redan körs anropar den själv refreshBankStatus när den är klar
      if (syncInFlightRef.current) return;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        if (!syncInFlightRef.current) {
          refreshBankStatus();
        }
      }, 800);
    };

    const channel = supabase
      .channel(`dejz-live-bank-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_transactions',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_connections',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .subscribe();

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [userId, refreshBankStatus]);

  // Konvertera Enable Banking-konton till visningskonton för Hem-fliken
  const accounts: AccountItem[] = useMemo(() => {
    const connMap = new Map<string, { name: string; logo?: string | null }>();
    for (const c of connections) {
      connMap.set(c.id, { name: c.aspsp_name, logo: c.aspsp_logo });
    }

    const activeAccs = bankAccounts.filter((a) => a.is_selected !== false);
    const listToUse = activeAccs.length > 0 ? activeAccs : bankAccounts;

    return listToUse.map((ba) => {
      const connInfo = connMap.get(ba.connection_id);
      const bankName = connInfo?.name || 'Bank';
      const displayName = getBankAccountTitle(ba, bankName);
      const formattedNumber = formatBankAccountNumber(ba.bban || ba.iban || ba.product || '');
      return {
        id: ba.id,
        name: displayName,
        accountNumber: formattedNumber,
        bankName,
        balance: Number(ba.balance_amount) || 0,
        type: 'checking' as const,
        logo: connInfo?.logo || getLogoUrl(bankName, 'Bank'),
      };
    });
  }, [connections, bankAccounts]);

  const connectedBank = useMemo(() => {
    const activeConns = connections.filter((c) => c.status === 'active');
    if (activeConns.length > 0) {
      return activeConns.map((c) => c.aspsp_name).join(', ');
    }
    if (connections.length > 0) {
      return connections.map((c) => c.aspsp_name).join(', ');
    }
    return null;
  }, [connections]);

  // Beräkna aktuell period (från lönedag till dagen innan nästa lön) med vald helghantering:
  const period: PeriodInfo = useMemo(() => {
    return calculateCurrentPeriod(new Date(), targetPayday, weekendHandling);
  }, [targetPayday, weekendHandling]);

  // Uppdatera lönedag & spara till Supabase + cache
  const handleUpdatePayday = useCallback(
    (day: number) => {
      setTargetPayday(day);
      saveCachedAppState({ targetPayday: day });
      if (userId) {
        dataService.updateProfile(userId, { payday: day }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera helghantering & spara till Supabase + cache
  const handleUpdateWeekendHandling = useCallback(
    (mode: WeekendHandlingMode) => {
      setWeekendHandling(mode);
      saveCachedAppState({ weekendHandling: mode });
      if (userId) {
        dataService
          .updateProfile(userId, { payday_before_weekend: mode === 'before' })
          .catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera profilbild
  const handleUpdateAvatar = useCallback(
    (avatarDataUrl: string | null) => {
      setUserAvatar(avatarDataUrl);
      saveCachedAppState({ userAvatar: avatarDataUrl });
      if (userId && avatarDataUrl) {
        dataService.updateProfile(userId, { avatar_url: avatarDataUrl }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera e-post
  const handleUpdateEmail = useCallback(
    (email: string) => {
      setUserEmail(email);
      saveCachedAppState({ userEmail: email });
      if (userId && userId !== 'demo-user' && userId !== 'preview-user') {
        supabase.auth.updateUser({ email }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera namn
  const handleUpdateName = useCallback(
    (name: string) => {
      const clean = name.trim();
      setUserName(clean || null);
      try {
        if (clean) {
          localStorage.setItem('dejz_user_name', clean);
        } else {
          localStorage.removeItem('dejz_user_name');
        }
      } catch {
        // ignore
      }
      if (userId && userId !== 'demo-user' && userId !== 'preview-user') {
        supabase.auth.updateUser({ data: { full_name: clean } }).catch(() => {});
      }
    },
    [userId]
  );

  // Totalt saldo
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  // Total inkomst
  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [incomes]);

  // Totala fasta kostnader
  const totalFixedExpenses = useMemo(() => {
    return fixedExpenses.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [fixedExpenses]);

  // Alla interna överföringar (enskilda och parvisa mellan egna konton)
  const internalTransferIds = useMemo(() => {
    if (!excludeInternalTransfers) return new Set<string>();
    return findInternalTransferIds(transactions, bankAccounts, userEmail, userName);
  }, [transactions, excludeInternalTransfers, bankAccounts, userEmail, userName]);

  // Transaktioner som tillhör den aktuella löneperioden (från lönedag till dagen innan nästa lön)
  const periodTransactions = useMemo(() => {
    const aliases = getMerchantAliases();
    const sanitized = transactions
      .filter((t) => {
        if (!isDateInPeriod(t.date, period)) return false;
        if (t.isExcluded) return false;
        if (isTransactionManuallyExcluded(t.id)) return false;
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      })
      .map((t) => sanitizeTransactionItem(t, fixedExpenses, incomes, aliases))
      .filter((t) => {
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      });

    const list = deduplicateTransactions(sanitized);

    list.sort((a, b) => {
      const dCmp = (b.date || '').localeCompare(a.date || '');
      if (dCmp !== 0) return dCmp;
      return getTransactionTime(b).localeCompare(getTransactionTime(a));
    });
    return list;
  }, [
    transactions,
    period,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
    fixedExpenses,
    incomes,
  ]);

  // Enhetlig transaktionslista för både Hem ("Senaste transaktioner"), Historik och Sök:
  // Garanterar att antalet reserverade transaktioner och historikrader alltid är 100% identiskt oavsett flik.
  const displayTransactions = useMemo(() => {
    const aliases = getMerchantAliases();
    const visibleSource = transactions.filter((t) => {
      if (t.isExcluded) return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        return false;
      }
      return true;
    });
    const combined = visibleSource
      .map((t) => sanitizeTransactionItem(t, fixedExpenses, incomes, aliases))
      .filter((t) => {
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      });
    for (const inc of incomes) {
      if (!inc.amount || inc.amount <= 0) continue;
      const payDates = getPayDatesForIncome(inc, targetPayday, weekendHandling === 'before');
      for (const pDate of payDates) {
        const genId = `inc-${inc.id}-${pDate}`;
        if (dismissedTxIds.includes(genId)) continue;

        const isCovered = combined.some((t) => {
          if (t.type !== 'income') return false;
          if (t.id === genId) return true;
          const sameAmount = Math.abs((Number(t.amount) || 0) - inc.amount) <= 5;
          if (!sameAmount) return false;
          const d1 = new Date(t.date).getTime();
          const d2 = new Date(pDate).getTime();
          return !isNaN(d1) && !isNaN(d2) && Math.abs(d1 - d2) <= 3 * 86400 * 1000;
        });

        if (!isCovered) {
          combined.push({
            id: genId,
            title: inc.name,
            amount: inc.amount,
            type: 'income',
            category: inc.category || 'Lön',
            date: pDate,
            time: '08:00',
            logo: inc.logo || getLogoUrl(inc.name, inc.category || 'Lön'),
          });
        }
      }
    }
    const deduped = deduplicateTransactions(combined);
    deduped.sort((a, b) => {
      const dCmp = (b.date || '').localeCompare(a.date || '');
      if (dCmp !== 0) return dCmp;
      return getTransactionTime(b).localeCompare(getTransactionTime(a));
    });
    return deduped;
  }, [
    transactions,
    fixedExpenses,
    incomes,
    targetPayday,
    weekendHandling,
    dismissedTxIds,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
  ]);

  // Totala rörliga köp under aktuell period (exkludera fasta utgifter så de inte räknas dubbelt,
  // och räkna av bekräftade butiksreturer/återköp så att "Kvar att spendera" ökar vid retur)
  const totalVariableSpent = useMemo(() => {
    let grossSpent = 0;
    let storeRefunds = 0;

    for (const t of periodTransactions) {
      if (t.isExcluded) continue;
      if (isTransactionManuallyExcluded(t.id)) continue;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        continue;
      }

      if (t.type === 'income') {
        if (t.category === 'Återbetalning') {
          storeRefunds += Math.abs(Number(t.amount) || 0);
        }
        continue;
      }

      const recurring = checkIsRecurringTransaction(t, fixedExpenses, incomes);
      if (recurring.isRecurring && recurring.type === 'expense') {
        continue;
      }

      grossSpent += Number(t.amount) || 0;
    }

    return Math.max(0, grossSpent - storeRefunds);
  }, [
    periodTransactions,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
    fixedExpenses,
    incomes,
  ]);

  // Kvar att spendera under aktuell period
  const kvarAttSpendera = useMemo(() => {
    return Math.max(0, totalIncome - totalFixedExpenses - totalVariableSpent);
  }, [totalIncome, totalFixedExpenses, totalVariableSpent]);

  // Dagsbudget
  const dagsbudget = useMemo(() => {
    if (period.daysRemaining <= 0 || kvarAttSpendera <= 0) return 0;
    return Math.round(kvarAttSpendera / period.daysRemaining);
  }, [kvarAttSpendera, period.daysRemaining]);

  // Synka med Enable Banking
  const handleSyncBank = async () => {
    setSyncingBank(true);
    lastSyncTimestampRef.current = Date.now();
    try {
      await bankService.sync();
      await refreshBankStatus();
    } catch {
      // ignore error
    } finally {
      setSyncingBank(false);
    }
  };

  // Koppla från Enable Banking
  const handleDisconnectBank = async (connectionId?: string) => {
    const targetId = connectionId || connections[0]?.id;
    if (!targetId) return;
    try {
      await bankService.disconnect(targetId);
      await refreshBankStatus();
    } catch {
      await refreshBankStatus();
    }
  };

  const handleAddIncome = async (data: Omit<IncomeItem, 'id'>) => {
    unDismissIncomeMerchant(data.name, data.originalName);
    const logo = data.logo || getLogoUrl(data.name, data.category);
    const validId = ensureValidUuid(
      undefined,
      `income:${userId || 'local'}:${normalizeMerchantKey(data.name)}:${data.amount}:${Date.now()}`
    );
    unmarkIncomeIdDeleted(validId);
    saveManualIncomeOverride(
      data.name,
      {
        amount: data.amount,
        payday: data.payday,
        category: data.category,
        name: data.name,
      },
      data.originalName || data.name,
      validId,
      true
    );
    const newItem: IncomeItem = {
      ...data,
      originalName: data.originalName || data.name,
      logo,
      id: validId,
    };
    const nextIncomes = [...incomesRef.current, newItem];
    incomesRef.current = nextIncomes;
    setIncomes(nextIncomes);
    saveCachedAppState({ userId: userIdRef.current, incomes: nextIncomes });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService
        .saveIncomeSource(userId, {
          id: newItem.id,
          name: newItem.name,
          originalName: newItem.originalName,
          amount: newItem.amount,
          deductionDay: newItem.payday,
          category: newItem.category,
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleUpdateIncome = async (updated: IncomeItem) => {
    const existing = incomesRef.current.find((i) => i.id === updated.id);
    const rootOriginalName = existing?.originalName || existing?.name || updated.name;

    unDismissIncomeMerchant(updated.name, rootOriginalName);
    const logo = updated.logo || getLogoUrl(updated.name, updated.category);
    const validId = ensureValidUuid(
      updated.id,
      `income:${userId || 'local'}:${normalizeMerchantKey(rootOriginalName)}`
    );
    unmarkIncomeIdDeleted(validId);
    saveManualIncomeOverride(
      updated.name,
      {
        amount: updated.amount,
        payday: updated.payday,
        category: updated.category,
        name: updated.name,
      },
      rootOriginalName,
      validId,
      true
    );

    const itemWithLogo: IncomeItem = {
      ...updated,
      id: validId,
      originalName: rootOriginalName,
      logo,
    };

    const nextIncomes = incomesRef.current.map((i) =>
      i.id === updated.id ? itemWithLogo : i
    );
    incomesRef.current = nextIncomes;
    setIncomes(nextIncomes);

    const aliases = getMerchantAliases();
    const nextTxs = transactionsRef.current.map((tx) =>
      sanitizeTransactionItem(tx, fixedExpensesRef.current, nextIncomes, aliases)
    );
    transactionsRef.current = nextTxs;
    setTransactions(nextTxs);

    saveCachedAppState({ userId: userIdRef.current, incomes: nextIncomes, transactions: nextTxs });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService
        .saveIncomeSource(userId, {
          id: itemWithLogo.id,
          name: itemWithLogo.name,
          originalName: itemWithLogo.originalName,
          amount: itemWithLogo.amount,
          deductionDay: itemWithLogo.payday,
          category: itemWithLogo.category,
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteIncome = async (id: string) => {
    const item = incomesRef.current.find((i) => i.id === id);
    markIncomeIdDeleted(id);
    if (item) {
      const sameMerchantRemaining = incomesRef.current.filter(
        (i) => i.id !== id && normalizeMerchantKey(i.name) === normalizeMerchantKey(item.name)
      );
      if (sameMerchantRemaining.length === 0) {
        dismissIncomeMerchant(item.name, item.originalName);
      }
    }
    const nextIncomes = incomesRef.current.filter((i) => i.id !== id);
    incomesRef.current = nextIncomes;
    setIncomes(nextIncomes);
    saveCachedAppState({ userId: userIdRef.current, incomes: nextIncomes });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService.deleteIncomeSource(id, userId, []).catch(() => {});
    }
  };

  const handleAddFixed = async (
    data: Omit<FixedExpenseItem, 'id'>
  ): Promise<FixedExpenseItem> => {
    unDismissFixedMerchant(data.name, data.originalName);
    const logo = data.logo || getLogoUrl(data.name, data.category);
    const validId = ensureValidUuid(
      undefined,
      `fixed:${userId || 'local'}:${normalizeMerchantKey(data.name)}:${data.amount}:${Date.now()}`
    );
    unmarkFixedIdDeleted(validId);
    saveManualFixedOverride(
      data.name,
      {
        amount: data.amount,
        isShared: data.isShared,
        fullAmount: data.fullAmount,
        dueDay: data.dueDay,
        category: data.category,
        paymentMethod: data.paymentMethod,
        name: data.name,
      },
      data.originalName || data.name,
      validId,
      true
    );
    const newItem: FixedExpenseItem = {
      ...data,
      originalName: data.originalName || data.name,
      logo,
      id: validId,
    };
    const nextFixed = [...fixedExpensesRef.current, newItem].sort(
      (a, b) => a.dueDay - b.dueDay
    );
    fixedExpensesRef.current = nextFixed;
    setFixedExpenses(nextFixed);
    saveCachedAppState({ userId: userIdRef.current, fixedExpenses: nextFixed });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService
        .saveFixedExpense(userId, {
          id: newItem.id,
          name: newItem.name,
          originalName: newItem.originalName,
          amount: newItem.amount,
          deductionDay: newItem.dueDay,
          category: newItem.category,
          paymentMethod: newItem.paymentMethod || 'Autogiro',
          frequency: Frequency.MONTHLY,
          logo,
          isShared: newItem.isShared,
          fullAmount: newItem.fullAmount,
          receiptUrl: newItem.receiptUrl,
          receiptName: newItem.receiptName,
        })
        .catch(() => {});
    }
    return newItem;
  };

  const handleMarkAsFixed = async (tx: TransactionItem, kind: 'expense' | 'income') => {
    const day = parseInt(tx.date.slice(8, 10), 10) || (kind === 'expense' ? 27 : 25);

    // Save any edited transaction metadata (title, category, paymentMethod, note) so the transaction itself keeps the edits
    saveTransactionMeta(tx.id, {
      customTitle: tx.title,
      customCategory: tx.category,
      paymentMethod: tx.paymentMethod,
      note: tx.note,
    });
    setTransactions((prev) => {
      const next = prev.map((item) =>
        item.id === tx.id
          ? {
              ...item,
              title: tx.title,
              category: tx.category,
              paymentMethod: tx.paymentMethod,
              note: tx.note,
            }
          : item
      );
      transactionsRef.current = next;
      saveCachedAppState({ userId: userIdRef.current, transactions: next });
      return next;
    });

    setIsTxModalOpen(false);
    setSelectedTransaction(null);
    setActiveTab('fixed');

    if (kind === 'expense') {
      const created = await handleAddFixed({
        name: tx.title,
        originalName: tx.counterpartyName || tx.rawDescription || tx.title,
        amount: tx.amount,
        dueDay: day,
        category: tx.category || 'Räkningar',
        paymentMethod: tx.paymentMethod || 'Autogiro',
        logo: tx.logo,
      });
      setSelectedFixedExpense(created);
      setIsFixedModalOpen(true);
    } else {
      await handleAddIncome({
        name: tx.title,
        originalName: tx.counterpartyName || tx.rawDescription || tx.title,
        amount: tx.amount,
        payday: day,
        category: tx.category || 'Lön',
        logo: tx.logo,
      });
    }
  };

  const handleToggleHeart = useCallback((id: string, isHearted: boolean) => {
    saveTransactionMeta(id, { isHearted });
    setTransactions((prev) => {
      const next = prev.map((tx) => (tx.id === id ? { ...tx, isHearted } : tx));
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction((prev) =>
      prev && prev.id === id ? { ...prev, isHearted } : prev
    );
  }, []);

  const handleTogglePackage = useCallback((id: string, isWaitingForPackage: boolean) => {
    saveTransactionMeta(id, { isWaitingForPackage });
    setTransactions((prev) => {
      const next = prev.map((tx) => (tx.id === id ? { ...tx, isWaitingForPackage } : tx));
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction((prev) =>
      prev && prev.id === id ? { ...prev, isWaitingForPackage } : prev
    );
  }, []);

  const handleCategoryMutated = useCallback(
    (oldName: string, newName: string, kind: 'expense' | 'income') => {
      propagateCategoryChangeInCache(oldName, newName);
      const oldLower = oldName.trim().toLowerCase();

      if (kind === 'expense') {
        const nextFixed = fixedExpensesRef.current.map((f) =>
          (f.category || '').trim().toLowerCase() === oldLower
            ? { ...f, category: newName }
            : f
        );
        fixedExpensesRef.current = nextFixed;
        setFixedExpenses(nextFixed);
      } else {
        const nextIncomes = incomesRef.current.map((i) =>
          (i.category || '').trim().toLowerCase() === oldLower
            ? { ...i, category: newName }
            : i
        );
        incomesRef.current = nextIncomes;
        setIncomes(nextIncomes);
      }

      const nextTxs = transactionsRef.current.map((tx) => {
        const txKind = tx.type === 'income' ? 'income' : 'expense';
        if (
          txKind === kind &&
          (tx.category || '').trim().toLowerCase() === oldLower
        ) {
          return { ...tx, category: newName };
        }
        return tx;
      });
      transactionsRef.current = nextTxs;
      setTransactions(nextTxs);

      saveCachedAppState({
        incomes: incomesRef.current,
        fixedExpenses: fixedExpensesRef.current,
        transactions: transactionsRef.current,
      });
    },
    []
  );

  const handleUpdateFixed = async (updated: FixedExpenseItem) => {
    const existing = fixedExpensesRef.current.find((f) => f.id === updated.id);
    const rootOriginalName = existing?.originalName || existing?.name || updated.name;

    unDismissFixedMerchant(updated.name, rootOriginalName);

    const logo = updated.logo || getLogoUrl(updated.name, updated.category);
    const validId = ensureValidUuid(
      updated.id,
      `fixed:${userId || userIdRef.current || 'local'}:${normalizeMerchantKey(rootOriginalName)}:${updated.amount}`
    );
    unmarkFixedIdDeleted(validId);

    saveManualFixedOverride(
      updated.name,
      {
        amount: updated.amount,
        isShared: updated.isShared,
        fullAmount: updated.fullAmount,
        dueDay: updated.dueDay,
        category: updated.category,
        paymentMethod: updated.paymentMethod,
        name: updated.name,
      },
      rootOriginalName,
      validId,
      true
    );

    const itemWithLogo: FixedExpenseItem = {
      ...updated,
      id: validId,
      originalName: rootOriginalName,
      logo,
    };

    const nextFixed = fixedExpensesRef.current
      .map((f) => (f.id === updated.id ? itemWithLogo : f))
      .sort((a, b) => a.dueDay - b.dueDay);
    fixedExpensesRef.current = nextFixed;
    setFixedExpenses(nextFixed);
    setSelectedFixedExpense((prev) =>
      prev && prev.id === updated.id ? itemWithLogo : prev
    );

    const aliases = getMerchantAliases();
    const nextTxs = transactionsRef.current.map((tx) =>
      sanitizeTransactionItem(tx, nextFixed, incomesRef.current, aliases)
    );
    transactionsRef.current = nextTxs;
    setTransactions(nextTxs);

    saveCachedAppState({
      ...(userIdRef.current ? { userId: userIdRef.current } : {}),
      fixedExpenses: nextFixed,
      transactions: nextTxs,
    });
    syncAllUserPreferencesToSupabase(true);

    const activeUid = userId || userIdRef.current;
    if (activeUid) {
      void dataService
        .saveFixedExpense(activeUid, {
          id: itemWithLogo.id,
          name: itemWithLogo.name,
          originalName: itemWithLogo.originalName,
          amount: itemWithLogo.amount,
          isShared: itemWithLogo.isShared,
          fullAmount: itemWithLogo.fullAmount,
          receiptUrl: itemWithLogo.receiptUrl,
          receiptName: itemWithLogo.receiptName,
          deductionDay: itemWithLogo.dueDay,
          category: itemWithLogo.category,
          paymentMethod: itemWithLogo.paymentMethod || 'Autogiro',
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteFixed = async (id: string) => {
    const item = fixedExpensesRef.current.find((f) => f.id === id);
    markFixedIdDeleted(id);
    const nextFixed = fixedExpensesRef.current.filter((f) => f.id !== id);
    const hasRemainingSameMerchant = item
      ? findAllMatchingFixedExpensesByMerchant(
          { title: item.originalName || item.name, rawDescription: item.name },
          nextFixed
        ).length > 0
      : false;

    const namesToDelete: string[] = [];
    if (item && !hasRemainingSameMerchant) {
      dismissFixedMerchant(item.name, item.originalName);
      namesToDelete.push(item.name);
      if (item.originalName) namesToDelete.push(item.originalName);
    }
    fixedExpensesRef.current = nextFixed;
    setFixedExpenses(nextFixed);
    saveCachedAppState({
      ...(userIdRef.current ? { userId: userIdRef.current } : {}),
      fixedExpenses: nextFixed,
    });
    syncAllUserPreferencesToSupabase(true);

    const activeUid = userId || userIdRef.current;
    if (activeUid) {
      void dataService.deleteFixedExpense(id, activeUid, namesToDelete).catch(() => {});
    }
  };

  const handleAddTransaction = async (data: Omit<TransactionItem, 'id'>) => {
    const logo = data.logo || getLogoUrl(data.title, data.category);
    const aliases = getMerchantAliases();
    const newItem: TransactionItem = sanitizeTransactionItem(
      { ...data, logo, id: 'tx-' + Date.now() },
      fixedExpensesRef.current,
      incomesRef.current,
      aliases
    );
    const nextTxs = [newItem, ...transactionsRef.current];
    transactionsRef.current = nextTxs;
    setTransactions(nextTxs);
    saveCachedAppState({ transactions: nextTxs });

    if (userId) {
      await dataService
        .addTransaction(userId, {
          amount: newItem.amount,
          category: newItem.category,
          merchant: newItem.title,
          note: newItem.note,
          tags: [],
          timestamp: new Date(newItem.date).getTime() || Date.now(),
          type: 'expense',
          logo: newItem.logo,
        })
        .catch(() => {});
    }
  };

  const handleUpdateTransaction = async (
    updated: TransactionItem,
    applyToSimilarIds?: string[],
    options?: {
      renameScope?: 'single' | 'same-merchant' | 'chain';
      renameTargetIds?: string[];
      categoryTargetIds?: string[];
    }
  ) => {
    const existing = transactionsRef.current.find((t) => t.id === updated.id);
    const titleChanged = Boolean(
      existing && existing.title.toLowerCase().trim() !== updated.title.toLowerCase().trim()
    );
    const categoryChanged = Boolean(existing && existing.category !== updated.category);

    const renameScope = options?.renameScope || 'single';
    const renameSet = new Set<string>(
      titleChanged && renameScope !== 'single' ? options?.renameTargetIds || [] : []
    );
    const categorySet = new Set<string>(
      options?.categoryTargetIds || (!titleChanged && applyToSimilarIds ? applyToSimilarIds : [])
    );

    // 1. Om användaren uttryckligen valt att byta namn på flera poster (exakt samma butik eller hela kedjan)
    if (titleChanged && renameScope === 'same-merchant' && existing) {
      // Spara alias ENDAST för exakt denna butik/plats (t.ex. "Circle K Varberg"), aldrig för andra orter!
      saveMerchantAlias(existing.title, updated.title, updated.category);
      if (existing.counterpartyName) {
        saveMerchantAlias(existing.counterpartyName, updated.title, updated.category);
      }
      if (existing.rawDescription) {
        saveMerchantAlias(existing.rawDescription, updated.title, updated.category);
      }
      for (const tx of transactionsRef.current) {
        if (renameSet.has(tx.id)) {
          saveTransactionMeta(tx.id, {
            customTitle: updated.title,
            ...(categoryChanged ? { customCategory: updated.category } : {}),
          });
        }
      }
    } else if (titleChanged && renameScope === 'chain') {
      // Användaren valde uttryckligen att döpa om ALLA köp i hela kedjan
      for (const tx of transactionsRef.current) {
        if (renameSet.has(tx.id) || tx.id === updated.id) {
          saveMerchantAlias(tx.title, updated.title, updated.category);
          if (tx.counterpartyName) {
            saveMerchantAlias(tx.counterpartyName, updated.title, updated.category);
          }
          if (tx.rawDescription) {
            saveMerchantAlias(tx.rawDescription, updated.title, updated.category);
          }
          saveTransactionMeta(tx.id, {
            customTitle: updated.title,
            ...(categoryChanged ? { customCategory: updated.category } : {}),
          });
        }
      }
    }

    // 2. Om användaren ändrar KATEGORI (med "Uppdatera liknande köp" påslaget), uppdatera ENDAST kategorin och behåll varje transaktions eget butiksnamn!
    if (categoryChanged && categorySet.size > 0) {
      for (const tx of transactionsRef.current) {
        if (categorySet.has(tx.id)) {
          const keepTitle = tx.id === updated.id ? updated.title : tx.title;
          saveTransactionMeta(tx.id, { customCategory: updated.category });
          saveMerchantAlias(tx.title, keepTitle, updated.category);
          if (tx.counterpartyName) {
            saveMerchantAlias(tx.counterpartyName, keepTitle, updated.category);
          }
          if (tx.rawDescription) {
            saveMerchantAlias(tx.rawDescription, keepTitle, updated.category);
          }
        }
      }
    }

    // 3. Spara per-transaktions-metadata för den redigerade transaktionen först så sanitizeTransactionItem respekterar customTitle/customCategory
    const existingMeta = getTransactionMetaMap()[updated.id];
    const nextCustomTitle = titleChanged
      ? updated.title
      : existingMeta?.customTitle;
    const nextCustomCategory = categoryChanged
      ? updated.category
      : existingMeta?.customCategory;

    saveTransactionMeta(updated.id, {
      ...(nextCustomTitle ? { customTitle: nextCustomTitle } : {}),
      ...(nextCustomCategory ? { customCategory: nextCustomCategory } : {}),
      isHearted: updated.isHearted,
      isWaitingForPackage: updated.isWaitingForPackage,
      isWaitingForSwish: updated.isWaitingForSwish,
      pendingSwishAmount: updated.pendingSwishAmount,
      pendingSwishRecipient: updated.pendingSwishRecipient,
      receiptUrl: updated.receiptUrl,
      receiptName: updated.receiptName,
      paymentMethod: updated.paymentMethod,
      note: updated.note,
      customAmount:
        updated.originalAmount !== undefined &&
        updated.originalAmount > updated.amount
          ? updated.amount
          : undefined,
      originalAmount: updated.originalAmount,
      linkedSwishTxId: updated.linkedSwishTxId,
    });

    const logo = updated.logo || getLogoUrl(updated.title, updated.category);
    const aliases = getMerchantAliases();
    const itemWithLogo: TransactionItem = sanitizeTransactionItem(
      { ...updated, logo },
      fixedExpensesRef.current,
      incomesRef.current,
      aliases
    );

    setTransactions((prev) => {
      const exists = prev.some((t) => t.id === itemWithLogo.id);
      const next = exists
        ? prev.map((t) => {
            if (t.id === itemWithLogo.id) return itemWithLogo;
            const shouldRename = renameSet.has(t.id);
            const shouldRecategorize = categorySet.has(t.id);
            if (shouldRename || shouldRecategorize) {
              const nextTitle = shouldRename ? itemWithLogo.title : t.title;
              const nextCat = shouldRecategorize ? itemWithLogo.category : t.category;
              return {
                ...t,
                title: nextTitle,
                category: nextCat,
                logo: getLogoUrl(nextTitle, nextCat) || t.logo,
              };
            }
            return t;
          })
        : [itemWithLogo, ...prev];
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction(itemWithLogo);
    syncAllUserPreferencesToSupabase();
    if (userId && !itemWithLogo.id.startsWith('bank-') && !itemWithLogo.id.startsWith('inc-')) {
      await dataService
        .updateTransaction(itemWithLogo.id, {
          amount: itemWithLogo.amount,
          category: itemWithLogo.category,
          merchant: itemWithLogo.title,
          note: itemWithLogo.note,
          tags: [],
          timestamp: new Date(itemWithLogo.date).getTime() || Date.now(),
          type: itemWithLogo.type || 'expense',
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    if (id.startsWith('inc-')) {
      setDismissedTxIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    if (userId && !id.startsWith('bank-') && !id.startsWith('inc-')) {
      await dataService.deleteTransaction(id).catch(() => {});
    }
  };

  const handleExcludeTransaction = async (
    id: string,
    exclude: boolean,
    skipToast?: boolean
  ) => {
    const targetTx = transactionsRef.current.find((t) => t.id === id);
    if (!skipToast && targetTx) {
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
      }
      setUndoToast({
        id,
        excluded: exclude,
        title: targetTx.title || 'Köpet',
      });
      undoTimerRef.current = window.setTimeout(() => {
        setUndoToast(null);
      }, 4500);
    }

    setTransactionExcludedState(id, exclude);
    if (id.startsWith('bank-')) {
      setTransactionExcludedState(id.replace(/^bank-/, ''), exclude);
    }
    setTransactions((prev) => {
      const next = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              isExcluded: exclude,
              reconciliationStatus: exclude ? 'excluded' : 'unprocessed',
            }
          : t
      );
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            isExcluded: exclude,
            reconciliationStatus: exclude ? 'excluded' : 'unprocessed',
          }
        : prev
    );
    if (id.startsWith('bank-')) {
      const bankTxId = id.replace(/^bank-/, '');
      await bankService
        .updateTransactionReconciliation(bankTxId, {
          reconciliation_status: exclude ? 'excluded' : 'unprocessed',
        })
        .catch(() => {});
      refreshBankStatus();
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.setItem('dejz_logged_out', 'true');
      localStorage.removeItem('dejz_onboarding_in_progress');
      localStorage.removeItem('dejz_onboarding_step');
      localStorage.removeItem('dejz_user_name');
      localStorage.removeItem('dejz_user_email');
    } catch {
      // ignore
    }
    cancelPendingPreferenceSync();
    clearCachedAppState();
    clearAllLocalAppData(false);
    userIdRef.current = null;
    lastHydratedUserIdRef.current = null;
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    setUserAvatar(null);
    setConnections([]);
    setBankAccounts([]);
    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setActiveTab('home');
    setSettingsSubView(null);
    await supabase.auth.signOut().catch(() => {});
    setShowLanding(true);
    setIsOnboardingActive(false);
  };

  const handleDeleteAccount = async () => {
    const uidFromState = userId || userIdRef.current;
    const emailFromState = userEmail;
    const connsToDisconnect = [...connections];

    // 1. Stoppa omedelbart alla pågående bakgrundssynkningar och förhindra återskapande
    isDeletingAccountRef.current = true;
    pendingRefreshRef.current = false;
    cancelPendingPreferenceSync();

    // 2. Töm minnes-refs omedelbart så att inga pågående effekter kan läsa eller återskapa gammal data
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    aiCleanedKeysRef.current.clear();

    const withFastTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T | null> =>
      Promise.race([
        promise.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    try {
      // Hämta session och Bearer-token FÖRST innan localStorage rensas eller signOut körs
      const sessionRes = await withFastTimeout(supabase.auth.getSession(), 1500);
      const session = sessionRes?.data?.session || null;
      const token = session?.access_token || null;
      const sessionUid = session?.user?.id || null;
      const stateUid =
        uidFromState && uidFromState !== 'demo-user' && uidFromState !== 'preview-user'
          ? uidFromState
          : null;
      const primaryUid = sessionUid || stateUid;
      const emailToDelete = session?.user?.email || emailFromState || null;

      // 3. Starta frånkoppling av Enable Banking-sessioner i bakgrunden (utan att blockera raderingen)
      if (connsToDisconnect.length > 0 && primaryUid) {
        connsToDisconnect
          .filter((c) => c.status !== 'revoked')
          .forEach((c) => {
            bankService.disconnect(c.id).catch(() => {});
          });
      }

      // 4. Kör server-side permanent radering (med 4s timeout) – kör klient-fallback endast om servern ej nås
      let serverDeleted = false;
      if (primaryUid || emailToDelete) {
        const res = await withFastTimeout(
          fetch('/api/auth/delete-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userId: primaryUid,
              secondaryUserId: stateUid,
              email: emailToDelete,
            }),
          }),
          4000
        );
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && !data?.localOnly) {
            serverDeleted = true;
          }
        }
      }

      if (!serverDeleted && primaryUid) {
        await withFastTimeout(
          Promise.allSettled([
            dataService.deleteAllUserData(primaryUid, true),
            bankService.deleteAccount(),
          ]),
          3000
        );
      }
    } catch (err) {
      console.error('Error during account deletion:', err);
    } finally {
      // 5. Logga ut lokalt direkt (utan att vänta på nätverksanrop mot redan raderad auth.users-post) och rensa all lokal lagring
      await withFastTimeout(supabase.auth.signOut({ scope: 'local' }), 800);
      clearAllLocalAppData(false);

      userIdRef.current = null;
      lastHydratedUserIdRef.current = null;
      incomesRef.current = [];
      fixedExpensesRef.current = [];
      transactionsRef.current = [];
      aiCleanedKeysRef.current.clear();

      setUserId(null);
      setUserEmail(null);
      setUserName(null);
      setUserAvatar(null);
      setConnections([]);
      setBankAccounts([]);
      setIncomes([]);
      setFixedExpenses([]);
      setTransactions([]);
      setDismissedTxIds([]);
      setTargetPayday(25);
      setWeekendHandling('before');
      setSettingsSubView('main');
      setActiveTab('home');
      setIsOnboardingActive(false);
      setShowLanding(true);
      setTimeout(() => {
        isDeletingAccountRef.current = false;
      }, 1000);
    }
  };

  const handleResetAccount = async () => {
    const activeUid = userId || userIdRef.current;
    const connsToDisconnect = [...connections];

    // 1. Stoppa omedelbart alla pågående bakgrundssynkningar och Realtime-uppdateringar
    // så att fasta utgifter aldrig kan återskapas under eller direkt efter nollställningen
    isDeletingAccountRef.current = true;
    pendingRefreshRef.current = false;
    cancelPendingPreferenceSync();

    // 2. Töm minnes-refs och React-state direkt så att inga gamla poster ligger kvar i minnet
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    aiCleanedKeysRef.current.clear();

    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setDismissedTxIds([]);
    setConnections([]);
    setBankAccounts([]);

    const withFastTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T | null> =>
      Promise.race([
        promise.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    try {
      if (activeUid && activeUid !== 'demo-user' && activeUid !== 'preview-user') {
        const sessionRes = await withFastTimeout(supabase.auth.getSession(), 1500);
        const token = sessionRes?.data?.session?.access_token;

        // Koppla från bank i bakgrunden så det inte låser nollställningen
        if (connsToDisconnect.length > 0) {
          connsToDisconnect
            .filter((c) => c.status !== 'revoked')
            .forEach((c) => {
              bankService.disconnect(c.id).catch(() => {});
            });
        }

        const res = await withFastTimeout(
          fetch('/api/auth/reset-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ userId: activeUid }),
          }),
          3500
        );

        let serverReset = false;
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && !data?.localOnly) {
            serverReset = true;
          }
        }

        if (!serverReset) {
          await withFastTimeout(dataService.deleteAllUserData(activeUid), 3000);
        }
      } else if (activeUid) {
        await withFastTimeout(dataService.deleteAllUserData(activeUid), 2000);
      }
    } catch (err) {
      console.error('Error during account reset:', err);
    } finally {
      clearAllLocalAppData(true); // Behåll tema och inloggningssession

      incomesRef.current = [];
      fixedExpensesRef.current = [];
      transactionsRef.current = [];
      aiCleanedKeysRef.current.clear();

      setIncomes([]);
      setFixedExpenses([]);
      setTransactions([]);
      setDismissedTxIds([]);
      setConnections([]);
      setBankAccounts([]);

      // Skriv över app-cachen med tom data så den inte återuppstår vid refresh
      if (activeUid) {
        saveCachedAppState({
          userId: activeUid,
          incomes: [],
          fixedExpenses: [],
          transactions: [],
          connections: [],
          bankAccounts: [],
        });
      }

      try {
        localStorage.setItem('dejz_onboarding_v2_done', 'true');
        localStorage.removeItem('dejz_onboarding_in_progress');
        localStorage.removeItem('dejz_onboarding_step');
      } catch {
        // ignore
      }

      setSettingsSubView('main');
      setActiveTab('home');
      setCallbackStatusMsg('Kontot har nollställts och du kan börja om på nytt.');
      setTimeout(() => setCallbackStatusMsg(null), 4000);
      setTimeout(() => {
        isDeletingAccountRef.current = false;
      }, 1500);
    }
  };

  if (showLanding || (!userId && !isInitialLoading && !isOnboardingActive)) {
    return (
      <LandingPage
        existingEmail={userEmail}
        onContinueExisting={() => {
          try {
            localStorage.setItem('dejz_onboarding_v2_done', 'true');
            localStorage.setItem('dejz_onboarding_completed', 'true');
          } catch {
            // ignore
          }
          setShowLanding(false);
          setIsOnboardingActive(false);
        }}
        onAuthenticated={(email, mode) => {
          try {
            localStorage.removeItem('dejz_logged_out');
          } catch {
            // ignore
          }
          if (mode === 'register') {
            cancelPendingPreferenceSync();
            clearAllLocalAppData(true);
            try {
              localStorage.setItem('dejz_onboarding_in_progress', 'true');
              localStorage.setItem('dejz_onboarding_step', '1');
              localStorage.removeItem('dejz_onboarding_v2_done');
              localStorage.removeItem('dejz_onboarding_completed');
            } catch {
              // ignore
            }
            incomesRef.current = [];
            fixedExpensesRef.current = [];
            transactionsRef.current = [];
            setIncomes([]);
            setFixedExpenses([]);
            setTransactions([]);
            setConnections([]);
            setBankAccounts([]);
            setDismissedTxIds([]);
          }
          if (mode === 'register') {
            setIsOnboardingActive(true);
            setShowLanding(false);
          } else {
            try {
              localStorage.setItem('dejz_onboarding_v2_done', 'true');
              localStorage.setItem('dejz_onboarding_completed', 'true');
              localStorage.removeItem('dejz_onboarding_in_progress');
              localStorage.removeItem('dejz_onboarding_step');
            } catch {
              // ignore
            }
            setIsOnboardingActive(false);
            setShowLanding(false);
          }
          setUserEmail(email);
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              setUserId(session.user.id);
              userIdRef.current = session.user.id;
              loadSupabaseUserData(session.user.id);
            } else if (!userIdRef.current) {
              setUserId('preview-user');
              userIdRef.current = 'preview-user';
            }
          });
        }}
      />
    );
  }

  const shouldShowOnboarding =
    isOnboardingActive ||
    (() => {
      try {
        return (
          localStorage.getItem('dejz_onboarding_in_progress') === 'true' &&
          localStorage.getItem('dejz_onboarding_v2_done') !== 'true'
        );
      } catch {
        return false;
      }
    })();

  if (shouldShowOnboarding) {
    return (
      <>
        <OnboardingFlow
          initialName={userName || ''}
          targetPayday={targetPayday}
          initialWeekendHandling={weekendHandling}
          onUpdateWeekendHandling={handleUpdateWeekendHandling}
          connections={connections}
          bankAccounts={bankAccounts}
          bankCallbackStatusMsg={callbackStatusMsg}
          onBankStateUpdated={(conns, accs) => {
            setConnections(conns);
            setBankAccounts(accs);
            refreshBankStatus();
          }}
          incomes={incomes}
          fixedExpenses={fixedExpenses}
          onSaveName={handleUpdateName}
          onUpdatePayday={handleUpdatePayday}
          onOpenBankModal={(bankName?: string) => {
            setPreselectedBankName(bankName || null);
            setIsBankModalOpen(true);
          }}
          onAddIncome={handleAddIncome}
          onUpdateIncome={handleUpdateIncome}
          onDeleteIncome={handleDeleteIncome}
          onAddFixed={handleAddFixed}
          onUpdateFixed={handleUpdateFixed}
          onDeleteFixed={handleDeleteFixed}
          onBackToLanding={() => {
            try {
              localStorage.removeItem('dejz_onboarding_in_progress');
              localStorage.removeItem('dejz_onboarding_step');
            } catch {
              // ignore
            }
            setIsOnboardingActive(false);
            setShowLanding(true);
          }}
          onComplete={() => {
            try {
              localStorage.setItem('dejz_onboarding_v2_done', 'true');
              localStorage.setItem('dejz_onboarding_completed', 'true');
              localStorage.removeItem('dejz_onboarding_in_progress');
              localStorage.removeItem('dejz_onboarding_step');
            } catch {
              // ignore
            }
            setIsOnboardingActive(false);
            setShowLanding(false);
            setActiveTab('home');
          }}
        />
        <BankModal
          isOpen={isBankModalOpen}
          userEmail={userEmail}
          connections={connections}
          bankAccounts={bankAccounts}
          preselectedBankName={preselectedBankName}
          onClose={() => {
            setIsBankModalOpen(false);
            setPreselectedBankName(null);
          }}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onBankStateUpdated={(conns, accs) => {
            setConnections(conns);
            setBankAccounts(accs);
            refreshBankStatus();
          }}
        />
      </>
    );
  }

  return (
    <div
      style={{ backgroundImage: 'var(--bg-gradient)' }}
      className="min-h-screen bg-[var(--bg-color)] bg-no-repeat text-[var(--text-primary)] flex flex-col font-sans transition-colors selection:bg-[var(--text-primary)] selection:text-[var(--bg-color)]"
    >
      <div className="app-spatial-shell flex-1 flex flex-col min-h-screen">
      <Navbar
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
        hasUnreadNotifications={displayTransactions.some((t) => Boolean(t.isWaitingForPackage))}
        hideActions={activeTab === 'settings'}
        hideSearch={activeTab === 'transactions'}
        pageTitle={
          activeTab === 'settings'
            ? settingsSubView === 'main'
              ? 'Inställningar'
              : SETTINGS_SUBVIEW_TITLES[settingsSubView]
            : activeTab === 'goals'
            ? 'Sparmål & buffert'
            : activeTab === 'saved'
            ? 'Sparade köp'
            : activeTab === 'packages'
            ? 'Väntar på paket'
            : activeTab === 'receipts'
            ? 'Kvitton'
            : activeTab === 'matpriskollen'
            ? 'Matpriskollen'
            : null
        }
        onBack={() => {
          if (activeTab === 'settings' && settingsSubView !== 'main') {
            setSettingsSubView('main');
          } else {
            setActiveTab('home');
          }
        }}
        onLogoClick={() => {
          setIsSearchModalOpen(false);
          setIsNotificationsModalOpen(false);
          setSettingsSubView('main');
          setActiveTab('home');
        }}
        onProfileClick={() => {
          setIsSearchModalOpen(false);
          setIsNotificationsModalOpen(false);
          setSettingsSubView('main');
          setActiveTab('settings');
        }}
        onSearchClick={() => {
          setIsNotificationsModalOpen(false);
          setIsSearchModalOpen(true);
        }}
        onNotificationsClick={() => {
          setIsSearchModalOpen(false);
          setIsNotificationsModalOpen(true);
        }}
      />

      {callbackStatusMsg && (
        <div className="max-w-md mx-auto w-full px-4 pt-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
            {callbackStatusMsg}
          </div>
        </div>
      )}

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        transactions={displayTransactions}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        period={period}
        onSelectTransaction={(tx) => {
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
        onSelectFixed={(exp) => {
          setSelectedFixedExpense(exp);
          setIsFixedModalOpen(true);
        }}
        onSelectIncome={(inc) => {
          setSelectedIncome(inc);
          setIsIncomeModalOpen(true);
        }}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        period={period}
        kvarAttSpendera={kvarAttSpendera}
        dagsbudget={dagsbudget}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        transactions={displayTransactions}
        onSelectFixed={(exp) => {
          setSelectedFixedExpense(exp);
          setIsFixedModalOpen(true);
        }}
        onSelectTransaction={(tx) => {
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
      />

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
        <PullToRefresh
          onRefresh={async () => {
            await performSilentBankSync(true);
            await refreshBankStatus();
          }}
        >
          <>
            {activeTab === 'home' && (
                <HomeTab
                  period={period}
                  connectedBank={connectedBank}
                  accounts={accounts}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  transactions={displayTransactions}
                  totalBalance={totalBalance}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  totalVariableSpent={totalVariableSpent}
                  kvarAttSpendera={kvarAttSpendera}
                  dagsbudget={dagsbudget}
                  isInitialLoading={isInitialLoading}
                  onOpenBank={() => setIsBankModalOpen(true)}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onSelectFixed={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onNavigateToFixed={() => setActiveTab('fixed')}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                  onSelectAccount={(accountId) => {
                    setSelectedHistoryAccountId(accountId);
                    setActiveTab('transactions');
                  }}
                  onToggleHeart={handleToggleHeart}
                  onTogglePackage={handleTogglePackage}
                  onExcludeTransaction={handleExcludeTransaction}
                  onUpdateTransaction={handleUpdateTransaction}
                />
              )}

              {activeTab === 'fixed' && (
                <FixedTab
                  period={period}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  transactions={displayTransactions}
                  accounts={accounts}
                  onSelectIncome={(inc) => {
                    setSelectedIncome(inc);
                    setIsIncomeModalOpen(true);
                  }}
                  onSelectFixed={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onAddIncome={() => {
                    setSelectedIncome(null);
                    setIsIncomeModalOpen(true);
                  }}
                  onAddFixed={() => {
                    setSelectedFixedExpense(null);
                    setIsFixedModalOpen(true);
                  }}
                  onDeleteIncome={handleDeleteIncome}
                  onDeleteFixed={handleDeleteFixed}
                  onUpdateFixed={handleUpdateFixed}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisTab
                  period={period}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  transactions={displayTransactions}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  totalVariableSpent={totalVariableSpent}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  excludeInternalTransfers={excludeInternalTransfers}
                  bankAccounts={bankAccounts}
                  userEmail={userEmail}
                  userName={userName}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onSelectFixed={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onSelectIncome={(inc) => {
                    setSelectedIncome(inc);
                    setIsIncomeModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsTab
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  totalVariableSpent={totalVariableSpent}
                  period={period}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  accounts={accounts}
                  selectedAccountId={selectedHistoryAccountId}
                  onSelectAccount={setSelectedHistoryAccountId}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onAddTransaction={() => {
                    setSelectedTransaction(null);
                    setIsTxModalOpen(true);
                  }}
                  onDeleteTransaction={handleDeleteTransaction}
                  onToggleHeart={handleToggleHeart}
                  onTogglePackage={handleTogglePackage}
                  onExcludeTransaction={handleExcludeTransaction}
                />
              )}

              {activeTab === 'goals' && <SavingsGoalsView />}

              {activeTab === 'matpriskollen' && <MatpriskollenView />}

              {activeTab === 'saved' && (
                <div className="ui-page">
                  {(() => {
                    const heartedList = displayTransactions.filter((t) => t.isHearted);
                    if (heartedList.length === 0) {
                      return (
                        <section className="ui-empty-state-page animate-fade-in">
                          <Heart size={48} weight="light" className="ui-empty-icon" />
                          <p className="ui-empty-title">
                            Inga sparade köp
                          </p>
                        </section>
                      );
                    }

                    const map = new Map<string, TransactionItem[]>();
                    for (const tx of heartedList) {
                      const key = tx.date || 'Okänt';
                      const arr = map.get(key) || [];
                      arr.push(tx);
                      map.set(key, arr);
                    }
                    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

                    return sortedKeys.map((dateKey) => {
                      const dayItems = map.get(dateKey)!;
                      const net = dayItems.reduce((acc, item) => {
                        const amt = Number(item.amount) || 0;
                        return item.type === 'income' ? acc + amt : acc - amt;
                      }, 0);
                      const netStr =
                        new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(net))) + ' kr';

                      return (
                        <section key={`saved-${dateKey}`} className="ui-section">
                          <div className="ui-date-header">
                            <span className="ui-date-header-title">
                              {formatSwedishDateHeading(dateKey)}
                            </span>
                            <span
                              className={`ui-date-header-sum ${
                                net > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              {net > 0 ? `+${netStr}` : `-${netStr}`}
                            </span>
                          </div>

                          <div className="ui-list-card">
                            {dayItems.map((tx) => {
                              const isIncome = tx.type === 'income';
                              const formattedAmt =
                                new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                              return (
                                <button
                                  key={tx.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setIsTxModalOpen(true);
                                  }}
                                  className="ui-tx-row"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <ItemLogo
                                      name={tx.title}
                                      category={tx.category}
                                      logoUrl={tx.logo}
                                      size="md"
                                      isRecurring={false}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <span className="ui-row-title">
                                        {tx.title}
                                      </span>
                                      <span className="ui-row-subtitle flex items-center gap-1.5">
                                        <CategoryIcon
                                          category={tx.category}
                                          size={11}
                                          className="shrink-0 text-[var(--text-secondary)]"
                                        />
                                        <span className="truncate">{tx.category}</span>
                                        {tx.isHearted && (
                                          <Heart
                                            size={11}
                                            weight="fill"
                                            className="text-rose-500 shrink-0"
                                          />
                                        )}
                                        {tx.isWaitingForPackage && (
                                          <Package
                                            size={11}
                                            weight="fill"
                                            className="text-amber-500 shrink-0"
                                          />
                                        )}
                                        {tx.receiptUrl && (
                                          <Paperclip
                                            size={11}
                                            weight="bold"
                                            className="text-[var(--text-secondary)] shrink-0"
                                          />
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span
                                      className={`ui-row-amount ${
                                        isIncome ? 'ui-row-amount-income' : ''
                                      }`}
                                    >
                                      {isIncome ? `+${formattedAmt}` : `-${formattedAmt}`}
                                    </span>
                                    <span className="ui-row-meta">
                                      {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                        ? 'Reserverat'
                                        : getTransactionTime(tx)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="ui-page">
                  {(() => {
                    const packageList = displayTransactions.filter((t) => t.isWaitingForPackage);
                    if (packageList.length === 0) {
                      return (
                        <section className="ui-empty-state-page animate-fade-in">
                          <Package size={52} weight="light" className="ui-empty-icon" />
                          <p className="ui-empty-title">
                            Inga paket på väg
                          </p>
                        </section>
                      );
                    }

                    const map = new Map<string, TransactionItem[]>();
                    for (const tx of packageList) {
                      const key = tx.date || 'Okänt';
                      const arr = map.get(key) || [];
                      arr.push(tx);
                      map.set(key, arr);
                    }
                    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

                    return sortedKeys.map((dateKey) => {
                      const dayItems = map.get(dateKey)!;
                      const net = dayItems.reduce((acc, item) => {
                        const amt = Number(item.amount) || 0;
                        return item.type === 'income' ? acc + amt : acc - amt;
                      }, 0);
                      const netStr =
                        new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(net))) + ' kr';

                      return (
                        <section key={`pkg-${dateKey}`} className="ui-section">
                          <div className="ui-date-header">
                            <span className="ui-date-header-title">
                              {formatSwedishDateHeading(dateKey)}
                            </span>
                            <span
                              className={`ui-date-header-sum ${
                                net > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              {net > 0 ? `+${netStr}` : `-${netStr}`}
                            </span>
                          </div>

                          <div className="ui-list-card">
                            {dayItems.map((tx) => {
                              const isIncome = tx.type === 'income';
                              const formattedAmt =
                                new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                              return (
                                <div
                                  key={tx.id}
                                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransaction(tx);
                                      setIsTxModalOpen(true);
                                    }}
                                    className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                                  >
                                    <ItemLogo
                                      name={tx.title}
                                      category={tx.category}
                                      logoUrl={tx.logo}
                                      size="md"
                                      isRecurring={false}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <span className="ui-row-title">
                                        {tx.title}
                                      </span>
                                      <span className="ui-row-subtitle flex items-center gap-1.5">
                                        <CategoryIcon
                                          category={tx.category}
                                          size={11}
                                          className="shrink-0 text-[var(--text-secondary)]"
                                        />
                                        <span className="truncate">{tx.category}</span>
                                        {tx.isHearted && (
                                          <Heart
                                            size={11}
                                            weight="fill"
                                            className="text-rose-500 shrink-0"
                                          />
                                        )}
                                        {tx.isWaitingForPackage && (
                                          <Package
                                            size={11}
                                            weight="fill"
                                            className="text-amber-500 shrink-0"
                                          />
                                        )}
                                        {tx.receiptUrl && (
                                          <Paperclip
                                            size={11}
                                            weight="bold"
                                            className="text-[var(--text-secondary)] shrink-0"
                                          />
                                        )}
                                      </span>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <div className="text-right">
                                      <span
                                        className={`ui-row-amount ${
                                          isIncome ? 'ui-row-amount-income' : ''
                                        }`}
                                      >
                                        {isIncome ? `+${formattedAmt}` : `-${formattedAmt}`}
                                      </span>
                                      <span className="ui-row-meta">
                                        {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                          ? 'Reserverat'
                                          : getTransactionTime(tx)}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePackage(tx.id, false)}
                                      title="Markera som mottaget"
                                      className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    >
                                      <Package size={14} weight="fill" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === 'receipts' && (
                <div className="ui-page">
                  {displayTransactions.filter((t) => Boolean(t.receiptUrl)).length > 0 ||
                  fixedExpenses.filter((f) => Boolean(f.receiptUrl)).length > 0 ? (
                    <section className="ui-list-card">
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {fixedExpenses
                          .filter((f) => Boolean(f.receiptUrl))
                          .map((exp) => {
                            const formattedAmt =
                              new Intl.NumberFormat('sv-SE').format(Math.round(exp.amount)) +
                              ' kr';
                            return (
                              <div
                                key={`receipt-fix-${exp.id}`}
                                className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFixedExpense(exp);
                                    setIsFixedModalOpen(true);
                                  }}
                                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                                >
                                  <ItemLogo
                                    name={exp.name}
                                    category={exp.category}
                                    logoUrl={exp.logo}
                                    size="md"
                                    isRecurring={true}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title">
                                      {exp.name}
                                    </span>
                                    <span className="ui-row-subtitle flex items-center gap-1.5">
                                      <CategoryIcon
                                        category={exp.category || 'Räkningar'}
                                        size={11}
                                        className="shrink-0 text-[var(--text-secondary)]"
                                      />
                                      <span className="truncate">{exp.category}</span>
                                      <Paperclip
                                        size={11}
                                        weight="bold"
                                        className="text-[var(--text-secondary)] shrink-0"
                                      />
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <div className="text-right">
                                    <span className="ui-row-amount">
                                      -{formattedAmt}
                                    </span>
                                    <span className="ui-row-meta truncate max-w-[110px]">
                                      {exp.receiptName || 'Kvitto'}
                                    </span>
                                  </div>
                                  {exp.receiptUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewReceipt({
                                          url: exp.receiptUrl!,
                                          name: exp.receiptName || exp.name || 'Kvitto',
                                        });
                                      }}
                                      className="ui-icon-btn"
                                      title="Öppna kvitto"
                                    >
                                      {exp.receiptUrl.startsWith('data:image/') ? (
                                        <Eye size={14} />
                                      ) : (
                                        <FileText size={14} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {displayTransactions
                          .filter((t) => Boolean(t.receiptUrl))
                          .map((tx) => {
                            const isIncome = tx.type === 'income';
                            const formattedAmt =
                              new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                            return (
                              <div
                                key={`receipt-tx-${tx.id}`}
                                className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setIsTxModalOpen(true);
                                  }}
                                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                                >
                                  <ItemLogo
                                    name={tx.title}
                                    category={tx.category}
                                    logoUrl={tx.logo}
                                    size="md"
                                    isRecurring={false}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title">
                                      {tx.title}
                                    </span>
                                    <span className="ui-row-subtitle flex items-center gap-1.5">
                                      <CategoryIcon
                                        category={tx.category}
                                        size={11}
                                        className="shrink-0 text-[var(--text-secondary)]"
                                      />
                                      <span className="truncate">{tx.category}</span>
                                      {tx.isHearted && (
                                        <Heart
                                          size={11}
                                          weight="fill"
                                          className="text-rose-500 shrink-0"
                                        />
                                      )}
                                      {tx.isWaitingForPackage && (
                                        <Package
                                          size={11}
                                          weight="fill"
                                          className="text-amber-500 shrink-0"
                                        />
                                      )}
                                      {tx.receiptUrl && (
                                        <Paperclip
                                          size={11}
                                          weight="bold"
                                          className="text-[var(--text-secondary)] shrink-0"
                                        />
                                      )}
                                      {tx.receiptName && (
                                        <span className="truncate">· {tx.receiptName}</span>
                                      )}
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <div className="text-right">
                                    <span
                                      className={`ui-row-amount ${
                                        isIncome ? 'ui-row-amount-income' : ''
                                      }`}
                                    >
                                      {isIncome ? `+${formattedAmt}` : `-${formattedAmt}`}
                                    </span>
                                    <span className="ui-row-meta">
                                      {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                        ? 'Reserverat'
                                        : getTransactionTime(tx)}
                                    </span>
                                  </div>
                                  {tx.receiptUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewReceipt({
                                          url: tx.receiptUrl!,
                                          name: tx.receiptName || tx.title || 'Kvitto',
                                        });
                                      }}
                                      className="ui-icon-btn"
                                      title="Öppna kvitto"
                                    >
                                      {tx.receiptUrl.startsWith('data:image/') ? (
                                        <Eye size={14} />
                                      ) : (
                                        <FileText size={14} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  ) : (
                    <section className="ui-empty-state-page animate-fade-in">
                      <Paperclip size={48} weight="light" className="ui-empty-icon" />
                      <p className="ui-empty-title">
                        Inga bifogade kvitton
                      </p>
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  period={period}
                  connectedBank={connectedBank}
                  connections={connections}
                  bankAccounts={bankAccounts}
                  accounts={accounts}
                  onRefreshBankStatus={refreshBankStatus}
                  syncingBank={syncingBank}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatar={userAvatar}
                  excludeInternalTransfers={excludeInternalTransfers}
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  onToggleExcludeInternalTransfers={handleToggleExcludeInternalTransfers}
                  onUpdatePayday={handleUpdatePayday}
                  onUpdateWeekendHandling={handleUpdateWeekendHandling}
                  onUpdateAvatar={handleUpdateAvatar}
                  onOpenBank={() => setIsBankModalOpen(true)}
                  onDisconnectBank={handleDisconnectBank}
                  onSyncBank={handleSyncBank}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onSignOut={handleSignOut}
                  onDeleteAccount={handleDeleteAccount}
                  onResetAccount={handleResetAccount}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onAddIncome={handleAddIncome}
                  onAddFixed={handleAddFixed}
                  onUpdateIncome={handleUpdateIncome}
                  onUpdateFixed={handleUpdateFixed}
                  onUpdateEmail={handleUpdateEmail}
                  onUpdateName={handleUpdateName}
                  onStartOnboarding={() => setIsOnboardingActive(true)}
                  onCategoryMutated={handleCategoryMutated}
                  subView={settingsSubView}
                  onSubViewChange={setSettingsSubView}
                />
              )}
          </>
        </PullToRefresh>
      </main>

      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setIsSearchModalOpen(false);
          setIsNotificationsModalOpen(false);
          setSettingsSubView('main');
          setActiveTab(tab);
        }}
        savedCount={displayTransactions.filter((t) => t.isHearted).length}
        packagesCount={displayTransactions.filter((t) => t.isWaitingForPackage).length}
        receiptsCount={
          displayTransactions.filter((t) => Boolean(t.receiptUrl)).length +
          fixedExpenses.filter((f) => Boolean(f.receiptUrl)).length
        }
      />
      </div>

      <BankModal
        isOpen={isBankModalOpen}
        userEmail={userEmail}
        connections={connections}
        bankAccounts={bankAccounts}
        preselectedBankName={preselectedBankName}
        onClose={() => {
          setIsBankModalOpen(false);
          setPreselectedBankName(null);
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onBankStateUpdated={(conns, accs) => {
          setConnections(conns);
          setBankAccounts(accs);
          refreshBankStatus();
        }}
      />

      <IncomeModal
        isOpen={isIncomeModalOpen}
        initialIncome={selectedIncome}
        accounts={accounts}
        transactions={displayTransactions}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setSelectedIncome(null);
        }}
        onSelectTransaction={(tx) => {
          setIsIncomeModalOpen(false);
          setSelectedIncome(null);
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
        onSave={handleAddIncome}
        onUpdate={handleUpdateIncome}
        onDelete={handleDeleteIncome}
      />

      <FixedExpenseModal
        isOpen={isFixedModalOpen}
        initialExpense={selectedFixedExpense}
        fixedExpenses={fixedExpenses}
        accounts={accounts}
        transactions={displayTransactions}
        onClose={() => {
          setIsFixedModalOpen(false);
          setSelectedFixedExpense(null);
        }}
        onSelectTransaction={(tx) => {
          setIsFixedModalOpen(false);
          setSelectedFixedExpense(null);
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
        onMarkAsFixed={handleMarkAsFixed}
        onSave={handleAddFixed}
        onUpdate={handleUpdateFixed}
        onDelete={handleDeleteFixed}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        initialTransaction={selectedTransaction}
        transactions={displayTransactions}
        accounts={accounts}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        onClose={() => {
          setIsTxModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSelectTransaction={(tx) => {
          setSelectedTransaction(tx);
        }}
        onSave={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        onExclude={handleExcludeTransaction}
        onMarkAsFixed={handleMarkAsFixed}
        onToggleHeart={handleToggleHeart}
        onTogglePackage={handleTogglePackage}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(email) => {
          setUserEmail(email);
          refreshBankStatus();
        }}
      />

      <BottomSheet
        isOpen={Boolean(incomingSwishRequest)}
        onClose={() => {
          setIncomingSwishRequest(null);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('swish_pay');
            url.searchParams.delete('payee');
            url.searchParams.delete('amount');
            url.searchParams.delete('msg');
            window.history.replaceState({}, '', url.pathname + url.search);
          }
        }}
        contentClassName="px-6 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-center space-y-4"
        zIndexClass="z-[200]"
      >
        {incomingSwishRequest && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto">
              <SwishLogo size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
                Swish-förfrågan
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Allt är 100 % förifyllt i Swish
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-1.5">
              <div className="text-2xl font-display font-extrabold text-[var(--text-primary)] tabular-nums">
                {incomingSwishRequest.amount} kr
              </div>
              {incomingSwishRequest.msg && (
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  &ldquo;{incomingSwishRequest.msg}&rdquo;
                </div>
              )}
              <div className="text-[11px] font-medium text-[var(--text-muted)] tabular-nums">
                Till: {incomingSwishRequest.payee}
              </div>
            </div>
            <div className="space-y-2">
              <a
                href={incomingSwishRequest.deepLink}
                className="ui-btn-primary"
              >
                <SwishLogo size={16} />
                <span>Öppna Swish ({incomingSwishRequest.amount} kr)</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setIncomingSwishRequest(null);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('swish_pay');
                    url.searchParams.delete('payee');
                    url.searchParams.delete('amount');
                    url.searchParams.delete('msg');
                    window.history.replaceState({}, '', url.pathname + url.search);
                  }
                }}
                className="w-full ui-btn-secondary"
              >
                Stäng
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Floating Undo Toast for Swipe Exclude */}
      {undoToast && (
        <div className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-sm animate-fade-in">
          <div className="px-4 py-3 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xl flex items-center justify-between gap-3 text-xs">
            <span className="font-medium truncate">
              {undoToast.excluded
                ? `${undoToast.title} räknas inte i budget`
                : `${undoToast.title} räknas med i budget`}
            </span>
            <button
              type="button"
              onClick={() => {
                const { id, excluded } = undoToast;
                if (undoTimerRef.current) {
                  window.clearTimeout(undoTimerRef.current);
                }
                setUndoToast(null);
                handleExcludeTransaction(id, !excluded, true);
              }}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)]/15 hover:bg-[var(--bg-color)]/25 font-display font-bold shrink-0 cursor-pointer transition-colors"
            >
              Ångra
            </button>
          </div>
        </div>
      )}

      {/* In-App Receipt Lightbox Sheet */}
      <BottomSheet
        isOpen={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        title={previewReceipt?.name || 'Kvitto'}
        zIndexClass="z-[190]"
      >
        {previewReceipt && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-[60dvh]">
              {previewReceipt.url.startsWith('data:image/') ||
              /\.(png|jpe?g|webp|gif)$/i.test(previewReceipt.url) ? (
                <img
                  src={previewReceipt.url}
                  alt={previewReceipt.name}
                  className="max-h-[56dvh] w-auto object-contain rounded-xl"
                />
              ) : (
                <iframe
                  src={previewReceipt.url}
                  title={previewReceipt.name}
                  className="w-full h-[52dvh] rounded-xl border-0"
                />
              )}
            </div>
            <a
              href={previewReceipt.url}
              download={previewReceipt.name || 'kvitto.jpg'}
              className="ui-btn-primary"
            >
              <FileText size={14} weight="bold" />
              <span>Spara fil</span>
            </a>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};


export default App;
