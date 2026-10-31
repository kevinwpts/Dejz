import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarBlank,
  CaretRight,
  CaretLeft,
  CaretDown,
  Check,
  Heart,
  Package,
  Paperclip,
} from '@phosphor-icons/react';
import {
  PeriodInfo,
  isDateInPeriod,
  calculateCurrentPeriod,
  WeekendHandlingMode,
} from '../utils/periodEngine';
import {
  TransactionItem,
  FixedExpenseItem,
  IncomeItem,
  getTransactionTime,
} from './HomeTab';
import { CategoryIcon, resolveCategoryColor } from './CategoryIcon';
import { ItemLogo } from './ItemLogo';
import { BottomSheet } from './ui/BottomSheet';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  isTransactionManuallyExcluded,
} from '../utils/appCache';
import {
  checkIsRecurringTransaction,
  reconcilePeriodRecurringMatches,
} from '../utils/recurring';
import {
  findInternalTransferIds,
  isInternalTransferTransaction,
} from '../utils/transferDetection';
import { categorizeBankTransactionForApp } from '../utils/bankHistoryAnalyzer';
import { formatSwedishDateHeading } from '../utils/swedishDate';

interface AnalysisTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
  targetPayday?: number;
  weekendHandling?: WeekendHandlingMode;
  excludeInternalTransfers?: boolean;
  bankAccounts?: any[];
  userEmail?: string | null;
  userName?: string | null;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onSelectIncome?: (inc: IncomeItem) => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  incomes,
  fixedExpenses,
  transactions,
  targetPayday = 25,
  weekendHandling = 'before',
  excludeInternalTransfers = true,
  bankAccounts = [],
  userEmail = null,
  userName = null,
  onSelectTransaction,
  onSelectFixed,
  onSelectIncome,
}) => {
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [inspectedCategory, setInspectedCategory] = useState<string | null>(null);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  // Generate available periods (current + past 5 periods)
  const availablePeriods = useMemo(() => {
    const list: { offset: number; info: PeriodInfo }[] = [];
    for (let i = 0; i >= -5; i--) {
      const refDate = new Date();
      refDate.setMonth(refDate.getMonth() + i);
      list.push({
        offset: i,
        info: calculateCurrentPeriod(refDate, targetPayday, weekendHandling),
      });
    }
    return list;
  }, [targetPayday, weekendHandling]);

  const computedPeriod = useMemo(() => {
    const refDate = new Date();
    refDate.setMonth(refDate.getMonth() + periodOffset);
    return calculateCurrentPeriod(refDate, targetPayday, weekendHandling);
  }, [periodOffset, targetPayday, weekendHandling]);

  const internalTransferIds = useMemo(() => {
    if (!excludeInternalTransfers) return new Set<string>();
    return findInternalTransferIds(transactions, bankAccounts, userEmail, userName);
  }, [transactions, excludeInternalTransfers, bankAccounts, userEmail, userName]);

  // Filter transactions for computedPeriod
  const periodTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.filter((t) => {
      if (t.isExcluded) return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        return false;
      }
      return isDateInPeriod(t.date, computedPeriod);
    });
  }, [
    transactions,
    computedPeriod,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
  ]);

  const periodRecurringMatches = useMemo(() => {
    return reconcilePeriodRecurringMatches(periodTransactions, fixedExpenses, incomes);
  }, [periodTransactions, fixedExpenses, incomes]);

  const alreadyLinkedSwishIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of transactions) {
      if (tx.linkedSwishTxId) ids.add(tx.linkedSwishTxId);
    }
    for (const tx of periodTransactions) {
      if (tx.linkedSwishTxId) ids.add(tx.linkedSwishTxId);
    }
    return ids;
  }, [transactions, periodTransactions]);

  const periodIncomesList = useMemo(() => {
    // För historiska perioder med faktiska banktransaktioner: använd de inkomster som faktiskt kom in då (exkl. butiksreturer/återbetalningar och Swish-utlägg)
    if (periodOffset < 0 && periodTransactions.length > 0) {
      const txIncomes = periodTransactions.filter(
        (t) =>
          t.type === 'income' &&
          t.category !== 'Återbetalning' &&
          !(
            (t.category === 'Swish' || /swish/i.test(t.title || '')) &&
            !periodRecurringMatches.claimedIncomeTxIds.has(t.id)
          )
      );
      if (txIncomes.length > 0) {
        return txIncomes.map((tx) => {
          const recurring = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
          const matchedInc =
            recurring.isRecurring && recurring.type === 'income'
              ? (recurring.matchedItem as IncomeItem | undefined)
              : undefined;
          return {
            id: matchedInc?.id || tx.id,
            name: matchedInc?.name || tx.title,
            originalName: matchedInc?.originalName || tx.rawDescription,
            amount: tx.amount,
            payday: matchedInc?.payday || parseInt((tx.date || '').slice(8, 10), 10) || targetPayday,
            category: matchedInc?.category || tx.category || 'Lön',
            logo: matchedInc?.logo || tx.logo,
            type: 'income' as const,
          };
        });
      }
    }

    return incomes.map((inc) => {
      const matchedTx = periodRecurringMatches.matchedIncomeTxByIncId.get(inc.id);
      return {
        ...inc,
        type: 'income' as const,
        amount: matchedTx ? Math.round(Math.abs(Number(matchedTx.amount) || 0)) : inc.amount,
      };
    });
  }, [
    incomes,
    fixedExpenses,
    periodOffset,
    periodTransactions,
    periodRecurringMatches,
    targetPayday,
  ]);

  const periodFixedList = useMemo(() => {
    // För historiska perioder med faktiska transaktioner: använd periodens faktiska fasta utgifter (1-till-1-matchade)
    if (periodOffset < 0 && periodTransactions.length > 0) {
      const recurringExpenseTxs = periodTransactions.filter((t) =>
        periodRecurringMatches.claimedFixedTxIds.has(t.id)
      );

      if (recurringExpenseTxs.length > 0) {
        return recurringExpenseTxs.map((tx) => {
          const recurring = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
          const matchedExp = recurring.matchedItem as FixedExpenseItem | undefined;
          const shareRatio =
            matchedExp?.isShared &&
            matchedExp.fullAmount &&
            matchedExp.fullAmount > 0 &&
            matchedExp.amount > 0
              ? matchedExp.amount / matchedExp.fullAmount
              : 1;
          const effectiveHistoricalAmt = Math.round(tx.amount * shareRatio);

          return {
            id: matchedExp?.id || tx.id,
            name: matchedExp?.name || tx.title,
            originalName: matchedExp?.originalName || tx.rawDescription,
            amount: effectiveHistoricalAmt,
            fullAmount: matchedExp?.isShared ? tx.amount : undefined,
            isShared: matchedExp?.isShared,
            dueDay: matchedExp?.dueDay || parseInt((tx.date || '').slice(8, 10), 10) || 27,
            category: matchedExp?.category || tx.category || 'Räkningar',
            paymentMethod: matchedExp?.paymentMethod || tx.paymentMethod,
            logo: matchedExp?.logo || tx.logo,
            type: 'expense' as const,
          };
        });
      }
    }

    return fixedExpenses.map((exp) => {
      const matchedTx = periodRecurringMatches.matchedFixedTxByExpId.get(exp.id);
      const shareRatio =
        exp.isShared && exp.fullAmount && exp.fullAmount > 0 && exp.amount > 0
          ? exp.amount / exp.fullAmount
          : 1;
      const effectiveAmt = matchedTx
        ? Math.round(Math.abs(Number(matchedTx.amount) || 0) * shareRatio)
        : exp.amount;
      return {
        ...exp,
        type: 'expense' as const,
        amount: effectiveAmt,
      };
    });
  }, [fixedExpenses, incomes, periodOffset, periodTransactions, periodRecurringMatches]);

  // Rörliga konsumtionsutgifter (exkl. 1-till-1-matchade fasta utgifter samt exkl. aktivt Sparande så att Avanza/Lysa-sparande inte straffas som utgift)
  const variableTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (t.type === 'income') return false;
      if (t.category === 'Sparande') return false;
      if (periodRecurringMatches.claimedFixedTxIds.has(t.id)) {
        return false;
      }
      return true;
    });
  }, [periodTransactions, periodRecurringMatches]);

  // Aktivt sparande under perioden (t.ex. överföringar till Avanza, Nordnet, Lysa)
  const savingsTransactions = useMemo(() => {
    return periodTransactions.filter(
      (t) =>
        t.type !== 'income' &&
        t.category === 'Sparande' &&
        !periodRecurringMatches.claimedFixedTxIds.has(t.id)
    );
  }, [periodTransactions, periodRecurringMatches]);

  // Returer ('Återbetalning') samt mottagna Swish-utläggsersättningar under perioden
  const reimbursementTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (t.type !== 'income') return false;
      if (t.category === 'Återbetalning') return true;
      if (
        (t.category === 'Swish' || /swish/i.test(t.title || '')) &&
        !periodRecurringMatches.claimedIncomeTxIds.has(t.id) &&
        !alreadyLinkedSwishIds.has(t.id)
      ) {
        return true;
      }
      return false;
    });
  }, [periodTransactions, periodRecurringMatches, alreadyLinkedSwishIds]);

  const periodIncomeTotal = useMemo(() => {
    const txIncomes = periodTransactions.filter(
      (t) =>
        t.type === 'income' &&
        t.category !== 'Återbetalning' &&
        !(
          (t.category === 'Swish' || /swish/i.test(t.title || '')) &&
          !periodRecurringMatches.claimedIncomeTxIds.has(t.id)
        )
    );
    const baseIncomes = periodIncomesList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const txIncSum = txIncomes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return Math.max(baseIncomes, txIncSum);
  }, [periodTransactions, periodIncomesList, periodRecurringMatches]);

  const periodFixedTotal = useMemo(() => {
    return periodFixedList.reduce(
      (sum, f) => sum + (f.category === 'Sparande' ? 0 : Number(f.amount) || 0),
      0
    );
  }, [periodFixedList]);

  const periodVariableTotal = useMemo(() => {
    const rawSpent = variableTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const refunds = reimbursementTransactions.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );
    return Math.max(0, rawSpent - refunds);
  }, [variableTransactions, reimbursementTransactions]);

  const totalSpent = periodFixedTotal + periodVariableTotal;
  const netSavings = periodIncomeTotal - totalSpent;
  const spentPercentage =
    periodIncomeTotal > 0 ? Math.min(100, Math.round((totalSpent / periodIncomeTotal) * 100)) : 0;

  // Previous period for Spend Pace & month-over-month comparison
  const prevComputedPeriod = useMemo(() => {
    const refDate = new Date();
    refDate.setMonth(refDate.getMonth() + periodOffset - 1);
    return calculateCurrentPeriod(refDate, targetPayday, weekendHandling);
  }, [periodOffset, targetPayday, weekendHandling]);

  const prevPeriodVariableTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    const prevTxs = deduped.filter((t) => {
      if (t.isExcluded) return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        return false;
      }
      return isDateInPeriod(t.date, prevComputedPeriod);
    });
    const prevRec = reconcilePeriodRecurringMatches(prevTxs, fixedExpenses, incomes);
    return prevTxs.filter((t) => {
      if (t.type === 'income') return false;
      if (t.category === 'Sparande') return false;
      if (prevRec.claimedFixedTxIds.has(t.id)) return false;
      return true;
    });
  }, [
    transactions,
    prevComputedPeriod,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
    fixedExpenses,
    incomes,
  ]);

  const spendPaceComparison = useMemo(() => {
    if (prevPeriodVariableTransactions.length === 0 && variableTransactions.length === 0) {
      return null;
    }

    if (periodOffset === 0) {
      // Compare up to the same number of elapsed days in the period
      const elapsedDays = Math.max(1, computedPeriod.daysElapsed || computedPeriod.daysPassed || 1);
      const prevCutoff = new Date(prevComputedPeriod.startDate);
      prevCutoff.setDate(prevCutoff.getDate() + elapsedDays);
      const prevCutoffStr = `${prevCutoff.getFullYear()}-${String(
        prevCutoff.getMonth() + 1
      ).padStart(2, '0')}-${String(prevCutoff.getDate()).padStart(2, '0')}`;

      const prevSameDaySum = prevPeriodVariableTransactions
        .filter((t) => (t.date || '') <= prevCutoffStr)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      if (prevSameDaySum <= 0) return null;
      const diff = periodVariableTotal - prevSameDaySum;
      return {
        diff,
        prevSum: prevSameDaySum,
        isCurrentPeriod: true,
        elapsedDays,
      };
    } else {
      const prevFullSum = prevPeriodVariableTransactions.reduce(
        (sum, t) => sum + (Number(t.amount) || 0),
        0
      );
      if (prevFullSum <= 0) return null;
      const diff = periodVariableTotal - prevFullSum;
      return {
        diff,
        prevSum: prevFullSum,
        isCurrentPeriod: false,
        elapsedDays: computedPeriod.daysTotal || computedPeriod.totalDays || 30,
      };
    }
  }, [
    prevPeriodVariableTransactions,
    variableTransactions,
    periodOffset,
    computedPeriod,
    prevComputedPeriod,
    periodVariableTotal,
  ]);

  const prevCategoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of prevPeriodVariableTransactions) {
      const cat = tx.category || 'Övrigt';
      map.set(cat, (map.get(cat) || 0) + (Number(tx.amount) || 0));
    }
    for (const exp of periodFixedList) {
      const cat = exp.category || 'Räkningar';
      map.set(cat, (map.get(cat) || 0) + (Number(exp.amount) || 0));
    }
    return map;
  }, [prevPeriodVariableTransactions, periodFixedList]);

  // Category breakdown (med avräkning av butiksreturer/återköp per handlarkategori så cirkeldiagrammet matchar Rörligt netto)
  const categoryBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { amount: number; isIncomeCategory: boolean; items: (TransactionItem | FixedExpenseItem | IncomeItem)[] }
    >();

    for (const tx of variableTransactions) {
      const cat = tx.category || 'Övrigt';
      const amt = Number(tx.amount) || 0;
      const existing = map.get(cat) || { amount: 0, isIncomeCategory: false, items: [] };
      existing.amount += amt;
      existing.items.push(tx);
      map.set(cat, existing);
    }

    for (const exp of periodFixedList) {
      const cat = exp.category || 'Räkningar';
      const amt = Number(exp.amount) || 0;
      const existing = map.get(cat) || { amount: 0, isIncomeCategory: false, items: [] };
      existing.amount += amt;
      existing.items.push(exp);
      map.set(cat, existing);
    }

    // Lägg även till aktivt sparande (Avanza/Nordnet/Lysa) i listan utan att det räknas som konsumtion i cirkeldiagrammet
    for (const savTx of savingsTransactions) {
      const cat = 'Sparande';
      const amt = Number(savTx.amount) || 0;
      const existing = map.get(cat) || { amount: 0, isIncomeCategory: false, items: [] };
      existing.amount += amt;
      existing.items.push(savTx);
      map.set(cat, existing);
    }

    // Dra av returer ('Återbetalning') och Swish-utlägg från motsvarande utgiftskategori i diagrammet
    for (const refTx of reimbursementTransactions) {
      const refAmt = Math.abs(Number(refTx.amount) || 0);
      if (refAmt <= 0) continue;

      let targetCat = '';
      if (refTx.category === 'Återbetalning') {
        const inferred = categorizeBankTransactionForApp({
          description: refTx.rawDescription || refTx.title || '',
          counterparty_name: refTx.counterpartyName || refTx.title || '',
          raw_json: refTx.rawJson,
        } as any);
        if (
          inferred.category &&
          inferred.category !== 'Övrigt' &&
          inferred.category !== 'Återbetalning' &&
          map.has(inferred.category) &&
          !map.get(inferred.category)?.isIncomeCategory
        ) {
          targetCat = inferred.category;
        }
      } else if (refTx.category === 'Swish' && map.has('Swish')) {
        targetCat = 'Swish';
      }

      if (!targetCat) {
        // Fallback: dra av från den största rörliga utgiftskategorin i perioden (exkl. Räkningar/Boende/Sparande)
        let largestCat = '';
        let largestAmt = 0;
        for (const [catName, entry] of map.entries()) {
          if (
            !entry.isIncomeCategory &&
            catName !== 'Räkningar' &&
            catName !== 'Boende' &&
            catName !== 'Sparande' &&
            entry.amount > largestAmt
          ) {
            largestAmt = entry.amount;
            largestCat = catName;
          }
        }
        targetCat = largestCat;
      }

      if (targetCat && map.has(targetCat)) {
        const entry = map.get(targetCat)!;
        entry.amount = Math.max(0, entry.amount - refAmt);
        entry.items.push(refTx);
      }
    }

    for (const inc of periodIncomesList) {
      const cat = inc.category || 'Lön';
      const amt = Number(inc.amount) || 0;
      const existing = map.get(cat) || { amount: 0, isIncomeCategory: true, items: [] };
      existing.amount += amt;
      existing.isIncomeCategory = true;
      existing.items.push(inc);
      map.set(cat, existing);
    }

    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        isIncomeCategory: data.isIncomeCategory,
        items: data.items,
      }))
      .sort((a, b) => {
        if (a.isIncomeCategory !== b.isIncomeCategory) {
          return a.isIncomeCategory ? 1 : -1;
        }
        return b.amount - a.amount;
      });
  }, [
    variableTransactions,
    periodFixedList,
    savingsTransactions,
    reimbursementTransactions,
    periodIncomesList,
  ]);

  const [selectedSliceCategory, setSelectedSliceCategory] = useState<string | null>(null);

  // Utgiftskategorier med procentandel för cirkeldiagrammet (exkl. Sparande som inte är konsumtion)
  const expenseChartSlices = useMemo(() => {
    const expenseCats = categoryBreakdown.filter(
      (c) => !c.isIncomeCategory && c.category !== 'Sparande' && c.amount > 0
    );
    const sum = expenseCats.reduce((acc, c) => acc + c.amount, 0);
    if (sum <= 0) return [];

    let cumulativeFraction = 0;
    return expenseCats.map((cat) => {
      const fraction = cat.amount / sum;
      const startFraction = cumulativeFraction;
      cumulativeFraction += fraction;
      return {
        category: cat.category,
        amount: cat.amount,
        fraction,
        percentage: Math.round(fraction * 100),
        exactPercentage: (fraction * 100).toFixed(1),
        startFraction,
        color: resolveCategoryColor(cat.category),
      };
    });
  }, [categoryBreakdown]);

  // Reset selected slice if it no longer exists in the selected period
  useEffect(() => {
    if (
      selectedSliceCategory &&
      !expenseChartSlices.some((s) => s.category === selectedSliceCategory)
    ) {
      setSelectedSliceCategory(null);
    }
  }, [expenseChartSlices, selectedSliceCategory]);

  const activeSlice = useMemo(() => {
    if (!selectedSliceCategory) return null;
    return expenseChartSlices.find((s) => s.category === selectedSliceCategory) || null;
  }, [expenseChartSlices, selectedSliceCategory]);

  const donutRadius = 78;
  const donutCircumference = 2 * Math.PI * donutRadius;

  return (
    <div className="ui-page">
      {/* Sektion 0: Minimalistisk Periodväljare + Frilagd Hero-Cirkel direkt mot bakgrunden */}
      <div className="pt-0.5 pb-1">
        {/* Svagt svävande periodväljare utan tung kort-box */}
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={() => setPeriodOffset((prev) => Math.max(-5, prev - 1))}
            disabled={periodOffset <= -5}
            className="w-9 h-9 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer shrink-0 active:scale-95"
            title="Föregående period"
          >
            <CaretLeft size={14} weight="bold" />
          </button>

          <button
            type="button"
            onClick={() => setIsPeriodMenuOpen(true)}
            className="py-1.5 px-4 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-2xs"
          >
            <CalendarBlank
              size={14}
              weight="duotone"
              className="text-[var(--text-secondary)] shrink-0"
            />
            <span className="font-display font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] tabular-nums">
              {computedPeriod.startLabel} – {computedPeriod.endLabel}
            </span>
            <CaretDown
              size={11}
              weight="bold"
              className="text-[var(--text-muted)] shrink-0"
            />
          </button>

          <button
            type="button"
            onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
            disabled={periodOffset >= 0}
            className="w-9 h-9 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer shrink-0 active:scale-95"
            title="Nästa period"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>

        {/* Frilagd Interaktiv Hero-Cirkel (Open Canvas utan instängd kort-modul) */}
        {expenseChartSlices.length > 0 ? (
          <div className="relative pt-5 pb-3 flex flex-col items-center justify-center">
            {activeSlice && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSliceCategory(null);
                  setInspectedCategory(null);
                }}
                className="absolute top-3 right-1 px-2.5 py-1 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Visa alla
              </button>
            )}

            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full -rotate-90 overflow-visible"
              >
                {/* Subtil bakgrundsring */}
                <circle
                  cx="100"
                  cy="100"
                  r={donutRadius}
                  fill="transparent"
                  stroke="var(--border-subtle)"
                  strokeWidth="15"
                />

                {expenseChartSlices.map((slice) => {
                  const isSelected = selectedSliceCategory === slice.category;
                  const isDimmed = selectedSliceCategory !== null && !isSelected;
                  const gap = expenseChartSlices.length > 1 ? 3.5 : 0;
                  const sliceLength = Math.max(
                    0,
                    slice.fraction * donutCircumference - gap
                  );
                  const dashOffset = -slice.startFraction * donutCircumference;

                  return (
                    <circle
                      key={slice.category}
                      cx="100"
                      cy="100"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isSelected ? 20 : 15}
                      strokeDasharray={`${sliceLength} ${donutCircumference}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="butt"
                      onClick={() =>
                        setSelectedSliceCategory((prev) =>
                          prev === slice.category ? null : slice.category
                        )
                      }
                      className={`cursor-pointer transition-all duration-300 ${
                        isDimmed ? 'opacity-25' : 'opacity-100'
                      }`}
                    />
                  );
                })}
              </svg>

              {/* Center-info direkt i den öppna cirkeln */}
              <button
                type="button"
                onClick={() => setSelectedSliceCategory(null)}
                className="absolute inset-7 rounded-full flex flex-col items-center justify-center text-center px-3 cursor-pointer focus:outline-none"
              >
                {activeSlice ? (
                  <>
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center mb-1 transition-transform"
                      style={{
                        backgroundColor: `${activeSlice.color}1F`,
                        color: activeSlice.color,
                      }}
                    >
                      <CategoryIcon
                        category={activeSlice.category}
                        size={14}
                        color={activeSlice.color}
                      />
                    </div>
                    <span className="text-[11.5px] font-medium text-[var(--text-secondary)] truncate max-w-[120px]">
                      {activeSlice.category}
                    </span>
                    <span className="font-display font-semibold text-xl sm:text-[22px] tracking-[-0.02em] text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                      {formatKr(activeSlice.amount)}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--text-muted)] tabular-nums mt-0.5">
                      {activeSlice.percentage}% av utgifter
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11.5px] font-normal text-[var(--text-secondary)]">
                      Utgifter i perioden
                    </span>
                    <span className="font-display font-semibold text-xl sm:text-[23px] tracking-[-0.02em] text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                      {formatKr(totalSpent)}
                    </span>
                    <span className="text-[11px] font-normal text-[var(--text-muted)] tabular-nums mt-1">
                      {expenseChartSlices.length}{' '}
                      {expenseChartSlices.length === 1 ? 'kategori' : 'kategorier'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-7 text-center">
            <p className="ui-empty-sub">Inga utgifter att visa i perioden</p>
          </div>
        )}
      </div>

      {/* Riktigt BottomSheet för Periodväljaren */}
      <BottomSheet
        isOpen={isPeriodMenuOpen}
        onClose={() => setIsPeriodMenuOpen(false)}
        title="Välj period"
      >
        <div className="ui-sheet-group">
          {availablePeriods.map((p) => {
            const isSelected = p.offset === periodOffset;
            return (
              <button
                key={p.offset}
                type="button"
                onClick={() => {
                  setPeriodOffset(p.offset);
                  setIsPeriodMenuOpen(false);
                }}
                className="ui-row-btn"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarBlank
                    size={15}
                    weight={isSelected ? 'fill' : 'regular'}
                    className={
                      isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                    }
                  />
                  <span
                    className={`tabular-nums ${
                      isSelected
                        ? 'font-bold text-[var(--text-primary)]'
                        : 'font-medium text-[var(--text-primary)]'
                    }`}
                  >
                    {p.info.startLabel} – {p.info.endLabel}
                  </span>
                </div>
                {isSelected && (
                  <Check size={14} weight="bold" className="text-[var(--text-primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Sektion 1: Sammanhållen 3-kolumns Översikt (Inkomst · Utgifter · Kvar) med färgkodad bar */}
      <section className="ui-card-p">
        <div className="ui-stat-grid">
          <div className="pr-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
              <span>Inkomst</span>
            </span>
            <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
              +{formatKr(periodIncomeTotal)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
              <span>Utgifter</span>
            </span>
            <span className="ui-stat-value text-amber-600 dark:text-amber-400">
              -{formatKr(totalSpent)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  netSavings >= 0
                    ? 'bg-sky-500 dark:bg-sky-400'
                    : 'bg-rose-500 dark:bg-rose-400'
                }`}
              />
              <span>Kvar</span>
            </span>
            <span
              className={`ui-stat-value ${
                netSavings >= 0
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {netSavings >= 0 ? `+${formatKr(netSavings)}` : formatKr(netSavings)}
            </span>
          </div>
        </div>

        {periodIncomeTotal > 0 && (
          <div className="mt-3.5 h-2 w-full rounded-full bg-[var(--bg-color)] overflow-hidden flex gap-1">
            {(() => {
              const spentPct = Math.min(100, Math.max(0, (totalSpent / periodIncomeTotal) * 100));
              const remainingPct = Math.max(0, 100 - spentPct);
              return (
                <>
                  {spentPct > 0 && (
                    <div
                      className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                      style={{ width: `${spentPct}%` }}
                      title={`Utgifter (${Math.round(spentPct)}%)`}
                    />
                  )}
                  {remainingPct > 0 && (
                    <div
                      className="h-full rounded-full bg-sky-500 dark:bg-sky-400 transition-all duration-500"
                      style={{ width: `${remainingPct}%` }}
                      title={`Kvar (${Math.round(remainingPct)}%)`}
                    />
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      {/* Sektion 2: Kategorier (Inline Dropdown / Accordion utan nästlade kort) */}
      <section className="ui-list-card px-0">
        {categoryBreakdown.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {categoryBreakdown.map((item) => {
              const catColor = resolveCategoryColor(item.category);
              const isExpanded = inspectedCategory === item.category;

              return (
                <div key={item.category} className="transition-colors">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => {
                      const nextCat = isExpanded ? null : item.category;
                      setInspectedCategory(nextCat);
                      if (!item.isIncomeCategory) {
                        setSelectedSliceCategory(nextCat);
                      }
                    }}
                    className={`w-full px-4 sm:px-5 py-3.5 flex flex-col gap-2 text-left hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer group ${
                      isExpanded ? 'bg-[var(--bg-color)]/45' : ''
                    }`}
                  >
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${catColor}18`,
                            color: catColor,
                          }}
                        >
                          <CategoryIcon category={item.category} size={18} color={catColor} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span
                            className={`font-display font-semibold text-[14.5px] sm:text-[15px] tabular-nums block ${
                              item.isIncomeCategory
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {item.isIncomeCategory
                              ? `+${formatKr(item.amount)}`
                              : item.amount > 0
                              ? `-${formatKr(item.amount)}`
                              : formatKr(0)}
                          </span>
                        </div>
                        <CaretDown
                          size={14}
                          weight="bold"
                          className={`text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-[var(--text-primary)]' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Smooth Inline Dropdown Panel (Indented child rows with subtle background contrast) */}
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      isExpanded
                        ? 'grid-rows-[1fr] opacity-100 border-t border-[var(--border-subtle)] bg-[var(--bg-color)]/65 dark:bg-[var(--bg-color)]/40'
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      {isExpanded && (
                        <div className="divide-y divide-[var(--border-subtle)]">
                          {item.items.map((subItem: any, idx: number) => {
                            const isIncome = subItem.type === 'income';
                            const itemName = subItem.title || subItem.name;
                            const isSubRecurring = Boolean(
                              subItem.dueDay ||
                                subItem.payday ||
                                (subItem.date &&
                                  checkIsRecurringTransaction(subItem, fixedExpenses, incomes)
                                    .isRecurring)
                            );
                            const isFixedExpItem = Boolean(!isIncome && isSubRecurring);
                            const hasSubReceipts = Boolean(
                              (Array.isArray(subItem.receipts) && subItem.receipts.length > 0) ||
                                subItem.receiptUrl
                            );

                            return (
                              <button
                                key={subItem.id || `${item.category}-${idx}`}
                                type="button"
                                onClick={() => {
                                  if (subItem.date && onSelectTransaction) {
                                    onSelectTransaction(subItem);
                                  } else if (subItem.payday && onSelectIncome) {
                                    onSelectIncome(subItem);
                                  } else if (subItem.dueDay && onSelectFixed) {
                                    onSelectFixed(subItem);
                                  }
                                }}
                                className="w-full pl-7 sm:pl-9 pr-4 sm:pr-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <ItemLogo
                                    name={itemName}
                                    category={subItem.category || item.category}
                                    logoUrl={subItem.logo}
                                    size="sm"
                                    isRecurring={isSubRecurring}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title text-[13px] sm:text-[13.5px]">
                                      {itemName}
                                    </span>
                                    <span className="ui-row-subtitle flex items-center gap-1.5">
                                      <span className="truncate">
                                        {subItem.date
                                          ? formatSwedishDateHeading(subItem.date)
                                          : subItem.payday
                                          ? `Den ${subItem.payday}:e`
                                          : subItem.dueDay
                                          ? `Den ${subItem.dueDay}:e`
                                          : ''}
                                      </span>
                                      {subItem.isHearted && (
                                        <Heart
                                          size={11}
                                          weight="fill"
                                          className="text-rose-500 shrink-0"
                                        />
                                      )}
                                      {subItem.isWaitingForPackage && (
                                        <Package
                                          size={11}
                                          weight="fill"
                                          className="text-amber-500 shrink-0"
                                        />
                                      )}
                                      {hasSubReceipts && (
                                        <Paperclip
                                          size={11}
                                          weight="bold"
                                          className="text-[var(--text-secondary)] shrink-0"
                                        />
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <span
                                      className={
                                        isIncome
                                          ? 'ui-row-amount-income text-[13.5px]'
                                          : 'ui-row-amount text-[13.5px]'
                                      }
                                    >
                                      {isIncome
                                        ? `+${formatKr(subItem.amount)}`
                                        : `-${formatKr(subItem.amount)}`}
                                    </span>
                                    {subItem.date && (
                                      <span className="ui-row-meta">
                                        {subItem.bookingStatus === 'PDNG' ||
                                        subItem.bookingStatus === 'HOLD'
                                          ? 'Reserverat'
                                          : getTransactionTime({
                                              id: subItem.id,
                                              title: subItem.title,
                                              category: item.category,
                                              date: subItem.date,
                                              time: subItem.time,
                                              note: subItem.note,
                                              amount: subItem.amount,
                                              bookingStatus: subItem.bookingStatus,
                                            })}
                                      </span>
                                    )}
                                  </div>
                                  <CaretRight
                                    size={12}
                                    weight="bold"
                                    className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center border-t border-[var(--border-subtle)]">
            <p className="ui-empty-sub">
              Inga poster i perioden
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
