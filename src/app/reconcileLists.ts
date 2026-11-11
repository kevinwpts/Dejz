// Slår ihop fasta utgifter och inkomster från databas, telefon och bankanalys till en lista.
// Flyttad från App.tsx.
import { IncomeItem, FixedExpenseItem } from '../components/HomeTab';
import { getLogoUrl } from '../utils/logo';
import {
  DetectedFixedExpenseWithEvidence,
  DetectedIncomeWithEvidence,
} from '../utils/bankHistoryAnalyzer';
import {
  getDismissedFixedMerchants,
  getDismissedIncomeMerchants,
  getDeletedFixedIds,
  getDeletedIncomeIds,
  getManualFixedOverrides,
  getManualIncomeOverrides,
  normalizeMerchantKey,
  ensureValidUuid,
  isValidUuid,
  normalizeCategoryToValid,
} from '../utils/appCache';

/**
 * Reconciles Fixed Expenses from DB, local state/cache, and bank detection
 * into a single deterministic, deduplicated list with valid UUIDs.
 */
/**
 * Reconciles Fixed Expenses from DB, local state/cache, and (only on empty initial setup) bank detection
 * into a single deterministic, static list where user-added items never disappear or get dynamically overwritten.
 */
export function reconcileFixedExpensesList(params: {
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
      if (!f) continue;
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
      const finalIsCancelled =
        idOverride?.isCancelled !== undefined ? idOverride.isCancelled : f.isCancelled;
      const finalHasNoMorePayments =
        idOverride?.hasNoMorePayments !== undefined
          ? idOverride.hasNoMorePayments
          : f.hasNoMorePayments;
      const finalLastPaymentDate =
        idOverride && 'lastPaymentDate' in idOverride
          ? idOverride.lastPaymentDate
          : f.lastPaymentDate;

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
        receipts: idOverride?.receipts || f.receipts,
        linkedAliases: idOverride?.linkedAliases || f.linkedAliases,
        linkedGoalId: idOverride?.linkedGoalId ?? f.linkedGoalId,
        isCancelled: finalIsCancelled,
        hasNoMorePayments: finalHasNoMorePayments,
        lastPaymentDate: finalLastPaymentDate,
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
    const finalIsCancelled =
      curr.isCancelled !== undefined ? curr.isCancelled : idOverride?.isCancelled;
    const finalHasNoMorePayments =
      curr.hasNoMorePayments !== undefined
        ? curr.hasNoMorePayments
        : idOverride?.hasNoMorePayments;
    const finalLastPaymentDate =
      curr.lastPaymentDate !== undefined
        ? curr.lastPaymentDate
        : idOverride?.lastPaymentDate;

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
      receipts: curr.receipts || idOverride?.receipts,
      linkedAliases: curr.linkedAliases || idOverride?.linkedAliases,
      linkedGoalId: curr.linkedGoalId ?? idOverride?.linkedGoalId,
      isCancelled: finalIsCancelled,
      hasNoMorePayments: finalHasNoMorePayments,
      lastPaymentDate: finalLastPaymentDate,
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
        receipts: candidate.receipts || existing.receipts,
        linkedAliases: candidate.linkedAliases || existing.linkedAliases,
        linkedGoalId: candidate.linkedGoalId ?? existing.linkedGoalId,
        isCancelled: candidate.isCancelled ?? existing.isCancelled,
        hasNoMorePayments: candidate.hasNoMorePayments ?? existing.hasNoMorePayments,
        lastPaymentDate:
          candidate.isCancelled === false
            ? undefined
            : candidate.lastPaymentDate ?? existing.lastPaymentDate,
      };
      unified[existingIdx] = merged;
      if (
        uid &&
        (!dbIds.has(merged.id) ||
          existing.name !== merged.name ||
          existing.amount !== merged.amount ||
          existing.dueDay !== merged.dueDay ||
          existing.category !== merged.category ||
          existing.isCancelled !== merged.isCancelled ||
          existing.lastPaymentDate !== merged.lastPaymentDate ||
          existing.hasNoMorePayments !== merged.hasNoMorePayments)
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
export function reconcileIncomesList(params: {
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

      const idOverride = overrides[`id:${validId}`];
      const finalName = (i.name || idOverride?.name || origName).trim();
      const finalCat = normalizeCategoryToValid(i.category || idOverride?.category || 'Lön', 'income');
      const finalPayday = i.deductionDay || i.payday || idOverride?.payday || targetPayday || 25;

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
        linkedAliases: idOverride?.linkedAliases || i.linkedAliases,
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

    const idOverride = overrides[`id:${validId}`];
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
      linkedAliases: curr.linkedAliases || idOverride?.linkedAliases,
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
        linkedAliases: candidate.linkedAliases || existing.linkedAliases,
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
