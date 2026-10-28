import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CalendarBlank,
  CaretRight,
  CaretLeft,
  CaretDown,
  Check,
  Heart,
  Package,
  Paperclip,
  SlidersHorizontal,
  X,
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
} from './HomeTab';
import { CategoryIcon } from './CategoryIcon';
import { ItemLogo } from './ItemLogo';
import { BottomSheet } from './ui/BottomSheet';
import { getCategoryColor } from '../utils/categoryColors';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  isTransactionManuallyExcluded,
  getCategoryBudgets,
  saveCategoryBudget,
} from '../utils/appCache';
import { checkIsRecurringTransaction } from '../utils/recurring';
import {
  findInternalTransferIds,
  isInternalTransferTransaction,
} from '../utils/transferDetection';
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
  const [catSheetNavDir, setCatSheetNavDir] = useState<'forward' | 'back'>('forward');

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

  const periodIncomesList = useMemo(() => {
    // För historiska perioder med faktiska banktransaktioner: använd de inkomster som faktiskt kom in då
    if (periodOffset < 0 && periodTransactions.length > 0) {
      const txIncomes = periodTransactions.filter((t) => t.type === 'income');
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

    return incomes.map((inc) => ({
      ...inc,
      type: 'income' as const,
      amount: inc.amount,
    }));
  }, [incomes, fixedExpenses, periodOffset, periodTransactions, targetPayday]);

  const periodFixedList = useMemo(() => {
    // För historiska perioder med faktiska transaktioner: använd periodens faktiska fasta utgifter
    if (periodOffset < 0 && periodTransactions.length > 0) {
      const recurringExpenseTxs = periodTransactions.filter((t) => {
        if (t.type === 'income') return false;
        const recurring = checkIsRecurringTransaction(t, fixedExpenses, incomes);
        return recurring.isRecurring && recurring.type === 'expense';
      });

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

    return fixedExpenses.map((exp) => ({
      ...exp,
      type: 'expense' as const,
      amount: exp.amount,
    }));
  }, [fixedExpenses, incomes, periodOffset, periodTransactions]);

  const variableTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (t.type === 'income') return false;
      const recurring = checkIsRecurringTransaction(t, fixedExpenses, incomes);
      if (recurring.isRecurring && recurring.type === 'expense') {
        return false;
      }
      return true;
    });
  }, [periodTransactions, fixedExpenses, incomes]);

  const periodIncomeTotal = useMemo(() => {
    const txIncomes = periodTransactions.filter((t) => t.type === 'income');
    const baseIncomes = periodIncomesList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const txIncSum = txIncomes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return Math.max(baseIncomes, txIncSum);
  }, [periodTransactions, periodIncomesList]);

  const periodFixedTotal = useMemo(() => {
    return periodFixedList.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [periodFixedList]);

  const periodVariableTotal = useMemo(() => {
    return variableTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [variableTransactions]);

  const totalSpent = periodFixedTotal + periodVariableTotal;
  const netSavings = periodIncomeTotal - totalSpent;
  const spentPercentage =
    periodIncomeTotal > 0 ? Math.min(100, Math.round((totalSpent / periodIncomeTotal) * 100)) : 0;

  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() =>
    getCategoryBudgets()
  );
  const [isEditingBudgetCap, setIsEditingBudgetCap] = useState(false);
  const [budgetCapInput, setBudgetCapInput] = useState('');

  // Previous period for Spend Pace & month-over-month comparison
  const prevComputedPeriod = useMemo(() => {
    const refDate = new Date();
    refDate.setMonth(refDate.getMonth() + periodOffset - 1);
    return calculateCurrentPeriod(refDate, targetPayday, weekendHandling);
  }, [periodOffset, targetPayday, weekendHandling]);

  const prevPeriodVariableTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.filter((t) => {
      if (t.isExcluded || t.type === 'income') return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        return false;
      }
      if (!isDateInPeriod(t.date, prevComputedPeriod)) return false;
      const recurring = checkIsRecurringTransaction(t, fixedExpenses, incomes);
      if (recurring.isRecurring && recurring.type === 'expense') return false;
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
      const elapsedDays = Math.max(1, computedPeriod.daysPassed);
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
        elapsedDays: computedPeriod.totalDays,
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

  // Category breakdown
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
  }, [variableTransactions, periodFixedList, periodIncomesList]);

  const [selectedSliceCategory, setSelectedSliceCategory] = useState<string | null>(null);

  // Harmonisk färgpalett för kategoricirkeln
  const CATEGORY_COLORS = [
    '#3b82f6', // Blå
    '#10b981', // Smaragdgrön
    '#f59e0b', // Bärnsten
    '#8b5cf6', // Violett
    '#ec4899', // Rosa
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#14b8a6', // Kricka
    '#eab308', // Gul
  ];

  // Utgiftskategorier med procentandel för cirkeldiagrammet
  const expenseChartSlices = useMemo(() => {
    const expenseCats = categoryBreakdown.filter(
      (c) => !c.isIncomeCategory && c.amount > 0
    );
    const sum = expenseCats.reduce((acc, c) => acc + c.amount, 0);
    if (sum <= 0) return [];

    let cumulativeFraction = 0;
    return expenseCats.map((cat, idx) => {
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
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
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

  const donutRadius = 68;
  const donutCircumference = 2 * Math.PI * donutRadius;

  return (
    <div className="ui-page">
      {/* Sektion 0: Kompakt Periodväljare */}
      <div className="ui-card p-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPeriodOffset((prev) => Math.max(-5, prev - 1))}
          disabled={periodOffset <= -5}
          className="ui-icon-btn w-9 h-9 rounded-2xl disabled:opacity-30 shrink-0"
          title="Föregående period"
        >
          <CaretLeft size={15} weight="bold" />
        </button>

        <button
          type="button"
          onClick={() => setIsPeriodMenuOpen(true)}
          className="flex-1 py-1.5 px-3 rounded-2xl hover:bg-[var(--bg-color)] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CalendarBlank size={14} weight="duotone" className="text-[var(--text-secondary)] shrink-0" />
          <span className="font-display font-bold text-xs sm:text-sm text-[var(--text-primary)] tabular-nums">
            {computedPeriod.startLabel} – {computedPeriod.endLabel}
          </span>
          <CaretDown
            size={12}
            weight="bold"
            className="text-[var(--text-muted)] shrink-0"
          />
        </button>

        <button
          type="button"
          onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
          disabled={periodOffset >= 0}
          className="ui-icon-btn w-9 h-9 rounded-2xl disabled:opacity-30 shrink-0"
          title="Nästa period"
        >
          <CaretRight size={15} weight="bold" />
        </button>
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

      {/* Sektion 1: Översikt (Ren 3-kolumns Bento utan överflödig text) */}
      <section className="ui-card-p">
        <div className="flex items-center justify-between mb-3">
          <h2 className="ui-section-title">
            Översikt
          </h2>
          <span className="ui-section-meta">
            {spentPercentage}% nyttjat
          </span>
        </div>

        {/* Visuell balans-indikator */}
        <div className="w-full h-2 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] overflow-hidden mb-4">
          <div
            className="h-full bg-[var(--text-primary)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${spentPercentage}%` }}
          />
        </div>

        <div className="ui-stat-grid">
          <div className="pr-3 min-w-0">
            <span className="ui-stat-label">
              Inkomst
            </span>
            <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
              +{formatKr(periodIncomeTotal)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label">
              Utgifter
            </span>
            <span className="ui-stat-value">
              -{formatKr(totalSpent)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label">
              Netto
            </span>
            <span
              className={`ui-stat-value ${
                netSavings >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {netSavings >= 0 ? `+${formatKr(netSavings)}` : formatKr(netSavings)}
            </span>
          </div>
        </div>
      </section>

      {/* Sektion 1.5: Kategorifördelning i cirkel (% per kategori) */}
      <section className="ui-card-p">
        <div className="flex items-center justify-between mb-3">
          <h2 className="ui-section-title">
            Fördelning
          </h2>
          {activeSlice && (
            <button
              type="button"
              onClick={() => setSelectedSliceCategory(null)}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Visa alla
            </button>
          )}
        </div>

        {expenseChartSlices.length > 0 ? (
          <div className="flex items-center justify-center py-1">
            {/* Interaktiv Cirkel / Donut */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg
                viewBox="0 0 180 180"
                className="w-full h-full -rotate-90 overflow-visible"
              >
                {/* Bakgrundsring */}
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="transparent"
                  stroke="var(--border-subtle)"
                  strokeWidth="20"
                />

                {expenseChartSlices.map((slice) => {
                  const isSelected = selectedSliceCategory === slice.category;
                  const isDimmed =
                    selectedSliceCategory !== null && !isSelected;
                  const gap = expenseChartSlices.length > 1 ? 2.5 : 0;
                  const sliceLength = Math.max(
                    0,
                    slice.fraction * donutCircumference - gap
                  );
                  const dashOffset = -slice.startFraction * donutCircumference;

                  return (
                    <circle
                      key={slice.category}
                      cx="90"
                      cy="90"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isSelected ? 24 : 20}
                      strokeDasharray={`${sliceLength} ${donutCircumference}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="butt"
                      onClick={() =>
                        setSelectedSliceCategory((prev) =>
                          prev === slice.category ? null : slice.category
                        )
                      }
                      className={`cursor-pointer transition-all duration-300 ${
                        isDimmed ? 'opacity-30' : 'opacity-100'
                      }`}
                    />
                  );
                })}
              </svg>

              {/* Center-info i cirkeln */}
              <button
                type="button"
                onClick={() => setSelectedSliceCategory(null)}
                className="absolute inset-6 rounded-full flex flex-col items-center justify-center text-center px-2 cursor-pointer"
              >
                {activeSlice ? (
                  <>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] truncate max-w-[110px]">
                      {activeSlice.category}
                    </span>
                    <span className="font-display font-extrabold text-base text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                      {activeSlice.percentage}%
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums mt-0.5">
                      {formatKr(activeSlice.amount)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      Utgifter
                    </span>
                    <span className="font-display font-extrabold text-sm text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                      {formatKr(totalSpent)}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="ui-empty-sub">
              Inga utgifter att visa i perioden
            </p>
          </div>
        )}
      </section>

      {/* Sektion 2: Kategorier (Ren navigeringslista som öppnar dedikerad vy) */}
      <section className="ui-card overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="ui-section-title">
            Kategorier
          </h2>
        </div>

        {categoryBreakdown.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {categoryBreakdown.map((item) => {
              const sliceInfo = expenseChartSlices.find((s) => s.category === item.category);
              const catColor = sliceInfo?.color || getCategoryColor(item.category);
              const budgetCap = !item.isIncomeCategory ? categoryBudgets[item.category] || 0 : 0;
              const budgetPct =
                budgetCap > 0 ? Math.min(100, Math.round((item.amount / budgetCap) * 100)) : 0;
              const isOverBudget = budgetCap > 0 && item.amount > budgetCap;

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => {
                    setInspectedCategory(item.category);
                    setIsEditingBudgetCap(false);
                    setBudgetCapInput(
                      categoryBudgets[item.category]
                        ? String(categoryBudgets[item.category])
                        : ''
                    );
                  }}
                  className="w-full px-4 sm:px-5 py-3.5 flex flex-col gap-2 text-left hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer group"
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
                        <span className="ui-row-title text-[13px] sm:text-sm">
                          {item.category}
                        </span>
                        {budgetCap > 0 && (
                          <span className="ui-row-subtitle tabular-nums">
                            Tak {formatKr(budgetCap)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-display font-bold text-[13px] sm:text-sm tabular-nums block ${
                            item.isIncomeCategory
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isOverBudget
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {item.isIncomeCategory
                            ? `+${formatKr(item.amount)}`
                            : item.amount > 0
                            ? `-${formatKr(item.amount)}`
                            : formatKr(0)}
                        </span>
                        {sliceInfo && (
                          <span className="ui-row-meta">
                            {sliceInfo.percentage}%
                          </span>
                        )}
                      </div>
                      <CaretRight
                        size={14}
                        weight="bold"
                        className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                      />
                    </div>
                  </div>

                  {budgetCap > 0 && (
                    <div className="w-full pl-[52px]">
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverBudget
                              ? 'bg-rose-500'
                              : budgetPct >= 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center border-t border-[var(--border-subtle)]">
            <p className="ui-empty-sub">
              Inga poster i perioden
            </p>
          </div>
        )}
      </section>

      {/* Dedikerad Bottom-Sheet för Kategoridetaljer med äkta 1:1 drag-fysik */}
      <BottomSheet
        isOpen={Boolean(inspectedCategory)}
        onClose={() => {
          setInspectedCategory(null);
          setIsEditingBudgetCap(false);
        }}
      >
        {(() => {
          const categoryData = categoryBreakdown.find((c) => c.category === inspectedCategory);
          if (!categoryData) return null;
          const sliceInfo = expenseChartSlices.find((s) => s.category === categoryData.category);
          const avgPerItem =
            categoryData.items.length > 0
              ? categoryData.amount / categoryData.items.length
              : 0;
          const currentBudgetCap = !categoryData.isIncomeCategory
            ? categoryBudgets[categoryData.category] || 0
            : 0;
          const isOverCap = currentBudgetCap > 0 && categoryData.amount > currentBudgetCap;
          const capPct =
            currentBudgetCap > 0
              ? Math.min(100, Math.round((categoryData.amount / currentBudgetCap) * 100))
              : 0;

          const detailCatColor = sliceInfo?.color || getCategoryColor(categoryData.category);

          if (isEditingBudgetCap) {
            return (
              <div
                key="budget-cap-subview"
                className="animate-page-forward space-y-5"
              >
                <div className="ui-sheet-sub-header">
                  <button
                    type="button"
                    onClick={() => {
                      setCatSheetNavDir('back');
                      setIsEditingBudgetCap(false);
                    }}
                    title="Tillbaka"
                    aria-label="Tillbaka"
                    className="ui-icon-btn"
                  >
                    <CaretLeft size={15} weight="bold" />
                  </button>
                  <span className="ui-sheet-title">
                    Budgettak · {categoryData.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectedCategory(null);
                      setIsEditingBudgetCap(false);
                    }}
                    className="ui-icon-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Stort rent typografiskt beloppsfält */}
                <div className="py-5 text-center space-y-2">
                  <span className="text-xs font-medium text-[var(--text-muted)] block">
                    Ange maxbelopp per period (kr)
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      placeholder="0"
                      value={budgetCapInput}
                      onChange={(e) =>
                        setBudgetCapInput(e.target.value.replace(/[^\d]/g, ''))
                      }
                      className="w-40 bg-transparent border-0 p-0 font-display font-extrabold text-4xl text-center text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 tabular-nums focus:outline-none"
                    />
                    <span className="font-display font-bold text-xl text-[var(--text-muted)]">
                      kr
                    </span>
                  </div>
                </div>

                {/* Snabbval-chips */}
                <div className="grid grid-cols-4 gap-2">
                  {[1500, 3000, 5000, 8000].map((preset) => {
                    const isSel = Number(budgetCapInput) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBudgetCapInput(String(preset))}
                        className={`py-2.5 rounded-2xl text-xs font-display font-bold tabular-nums transition-all cursor-pointer border ${
                          isSel
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                            : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        {new Intl.NumberFormat('sv-SE').format(preset)} kr
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = Math.max(0, Math.round(Number(budgetCapInput) || 0));
                      saveCategoryBudget(
                        categoryData.category,
                        parsed > 0 ? parsed : null
                      );
                      setCategoryBudgets(getCategoryBudgets());
                      setCatSheetNavDir('back');
                      setIsEditingBudgetCap(false);
                    }}
                    className="w-full ui-btn-primary"
                  >
                    <Check size={14} weight="bold" />
                    <span>Spara budgettak</span>
                  </button>

                  {currentBudgetCap > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        saveCategoryBudget(categoryData.category, null);
                        setCategoryBudgets(getCategoryBudgets());
                        setBudgetCapInput('');
                        setCatSheetNavDir('back');
                        setIsEditingBudgetCap(false);
                      }}
                      className="w-full ui-btn-danger"
                    >
                      Ta bort budgettak
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key="category-details-main"
              className={`space-y-5 ${
                catSheetNavDir === 'back' ? 'animate-page-back' : ''
              }`}
            >
              {/* Header */}
              <div className="ui-sheet-header">
                <span className="ui-sheet-title">
                  {categoryData.category}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectedCategory(null)}
                  className="ui-icon-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Hero Summary */}
              <div className="flex flex-col items-center text-center pb-4 border-b border-[var(--border-subtle)]">
                <div
                  className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-3.5"
                  style={{
                    backgroundColor: `${detailCatColor}18`,
                    color: detailCatColor,
                  }}
                >
                  <CategoryIcon category={categoryData.category} size={28} color={detailCatColor} />
                </div>
                <div
                  className={`font-display font-extrabold text-2xl sm:text-3xl tabular-nums tracking-tight ${
                    categoryData.isIncomeCategory
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isOverCap
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {categoryData.isIncomeCategory
                    ? `+${formatKr(categoryData.amount)}`
                    : `-${formatKr(categoryData.amount)}`}
                </div>
                <span className="text-xs text-[var(--text-muted)] tabular-nums mt-1.5">
                  {categoryData.items.length} {categoryData.items.length === 1 ? 'köp' : 'köp'}
                  {sliceInfo ? ` · ${sliceInfo.percentage}% av utgifter` : ''}
                  {categoryData.items.length > 1 ? ` · Snitt ${formatKr(avgPerItem)}` : ''}
                </span>
              </div>

              {/* Kategoribudget / Månadstak som ren navigeringsrad */}
              {!categoryData.isIncomeCategory && (
                <div className="ui-sheet-group">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetCapInput(
                        currentBudgetCap > 0 ? String(currentBudgetCap) : ''
                      );
                      setCatSheetNavDir('forward');
                      setIsEditingBudgetCap(true);
                    }}
                    className="w-full px-4 py-3.5 text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Budgettak per period</span>
                      <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                        <SlidersHorizontal size={12} className="text-[var(--text-secondary)]" />
                        <span>
                          {currentBudgetCap > 0
                            ? formatKr(currentBudgetCap)
                            : 'Sätt budgettak'}
                        </span>
                        <CaretRight size={12} className="text-[var(--text-muted)]" />
                      </span>
                    </div>

                    {currentBudgetCap > 0 && (
                      <div className="space-y-1">
                        <div className="w-full h-1.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverCap
                                ? 'bg-rose-500'
                                : capPct >= 85
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${capPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
                          <span>{capPct}% av taket</span>
                          <span>
                            {isOverCap
                              ? `${formatKr(categoryData.amount - currentBudgetCap)} över taket`
                              : `${formatKr(currentBudgetCap - categoryData.amount)} kvar`}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* Items List */}
              <div className="ui-sheet-group">
                {categoryData.items.map((subItem: any, idx: number) => {
                  const isIncome = subItem.type === 'income';
                  const itemName = subItem.title || subItem.name;

                  return (
                    <button
                      key={subItem.id || `${categoryData.category}-${idx}`}
                      type="button"
                      onClick={() => {
                        setInspectedCategory(null);
                        if (subItem.date && onSelectTransaction) {
                          onSelectTransaction(subItem);
                        } else if (subItem.payday && onSelectIncome) {
                          onSelectIncome(subItem);
                        } else if (subItem.dueDay && onSelectFixed) {
                          onSelectFixed(subItem);
                        }
                      }}
                      className="ui-row-btn group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <ItemLogo
                          name={itemName}
                          category={subItem.category || categoryData.category}
                          logoUrl={subItem.logo}
                          size="md"
                          isRecurring={false}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title flex items-center gap-1.5">
                            <span className="truncate">{itemName}</span>
                            {subItem.isHearted && (
                              <Heart
                                size={13}
                                weight="fill"
                                className="text-rose-500 shrink-0"
                              />
                            )}
                            {subItem.isWaitingForPackage && (
                              <Package
                                size={13}
                                weight="fill"
                                className="text-amber-500 shrink-0"
                              />
                            )}
                            {subItem.receiptUrl && (
                              <Paperclip
                                size={13}
                                weight="bold"
                                className="text-[var(--text-secondary)] shrink-0"
                              />
                            )}
                          </span>
                          <span className="ui-row-subtitle">
                            {subItem.date
                              ? formatSwedishDateHeading(subItem.date)
                              : subItem.payday
                              ? `Den ${subItem.payday}:e`
                              : subItem.dueDay
                              ? `Den ${subItem.dueDay}:e`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={isIncome ? 'ui-row-amount-income' : 'ui-row-amount'}
                        >
                          {isIncome
                            ? `+${formatKr(subItem.amount)}`
                            : `-${formatKr(subItem.amount)}`}
                        </span>
                        <CaretRight
                          size={13}
                          weight="bold"
                          className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
};
