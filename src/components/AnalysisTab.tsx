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
import { deduplicateTransactions } from '../utils/transactionDedup';
import { isTransactionManuallyExcluded } from '../utils/appCache';
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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(e.target as Node)) {
        setIsPeriodMenuOpen(false);
      }
    };
    if (isPeriodMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPeriodMenuOpen]);

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
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
    return incomes.map((inc) => ({
      ...inc,
      type: 'income' as const,
      amount: inc.amount,
    }));
  }, [incomes]);

  const periodFixedList = useMemo(() => {
    return fixedExpenses.map((exp) => ({
      ...exp,
      type: 'expense' as const,
      amount: exp.amount,
    }));
  }, [fixedExpenses]);

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
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* Sektion 0: Kompakt Periodväljare */}
      <div
        ref={periodMenuRef}
        className="relative bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-2 flex items-center justify-between gap-2"
      >
        <button
          type="button"
          onClick={() => setPeriodOffset((prev) => Math.max(-5, prev - 1))}
          disabled={periodOffset <= -5}
          className="w-9 h-9 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 shrink-0"
          title="Föregående period"
        >
          <CaretLeft size={15} weight="bold" />
        </button>

        <button
          type="button"
          onClick={() => setIsPeriodMenuOpen((prev) => !prev)}
          className="flex-1 py-1.5 px-3 rounded-2xl hover:bg-[var(--bg-color)] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CalendarBlank size={14} weight="duotone" className="text-[var(--text-secondary)] shrink-0" />
          <span className="font-display font-bold text-xs sm:text-sm text-[var(--text-primary)] tabular-nums">
            {computedPeriod.startLabel} – {computedPeriod.endLabel}
          </span>
          <CaretDown
            size={12}
            weight="bold"
            className={`text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${
              isPeriodMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
          disabled={periodOffset >= 0}
          className="w-9 h-9 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 shrink-0"
          title="Nästa period"
        >
          <CaretRight size={15} weight="bold" />
        </button>

        {/* Custom Period Dropdown Menu */}
        {isPeriodMenuOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-2 shadow-modal animate-fade-in space-y-1">
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
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-color)] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarBlank size={14} weight={isSelected ? 'fill' : 'regular'} />
                    <span className="tabular-nums">
                      {p.info.startLabel} – {p.info.endLabel}
                    </span>
                  </div>
                  {isSelected && <Check size={14} weight="bold" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sektion 1: Översikt (Ren 3-kolumns Bento utan överflödig text) */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-xs text-[var(--text-primary)]">
            Översikt
          </h2>
          <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums">
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

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] min-w-0">
            <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-0.5">
              Inkomst
            </span>
            <span className="font-display font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 tabular-nums block tracking-tight">
              +{formatKr(periodIncomeTotal)}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] min-w-0">
            <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-0.5">
              Utgifter
            </span>
            <span className="font-display font-bold text-xs sm:text-sm text-[var(--text-primary)] tabular-nums block tracking-tight">
              -{formatKr(totalSpent)}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] min-w-0">
            <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-0.5">
              Netto
            </span>
            <span
              className={`font-display font-bold text-xs sm:text-sm tabular-nums block tracking-tight ${
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
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-xs text-[var(--text-primary)]">
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
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] tabular-nums mt-0.5">
                      100%
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Inga utgifter att visa i perioden
            </p>
          </div>
        )}
      </section>

      {/* Sektion 2: Kategorier (Platt lista utan modul-i-modul) */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-xs text-[var(--text-primary)]">
            Kategorier
          </h2>
        </div>

        {categoryBreakdown.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {categoryBreakdown.map((item) => {
              const isExpanded = Boolean(expandedCategories[item.category]);

              return (
                <div
                  key={item.category}
                  className="py-2.5 first:pt-1 last:pb-0"
                >
                  {/* Category Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(item.category)}
                    aria-expanded={isExpanded}
                    className="w-full text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                          <CategoryIcon category={item.category} size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] block truncate">
                            {item.category}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                            {item.items.length} st
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-display font-bold text-xs sm:text-[13px] tabular-nums ${
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
                        <CaretDown
                          size={12}
                          weight="bold"
                          className={`text-[var(--text-muted)] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-[var(--text-primary)]' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Smooth Accordion Dropdown Content */}
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pt-1 border-t border-[var(--border-subtle)]/60 divide-y divide-[var(--border-subtle)]/60">
                        {item.items.map((subItem: any, idx: number) => {
                          const isIncome = subItem.type === 'income';
                          const itemName = subItem.title || subItem.name;
                          const isFixedItem = Boolean(subItem.dueDay || subItem.payday);

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
                              className="w-full py-2 first:pt-1.5 last:pb-0.5 flex items-center justify-between gap-2.5 text-xs sm:text-[13px] text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <ItemLogo
                                  name={itemName}
                                  category={subItem.category || item.category}
                                  logoUrl={subItem.logo}
                                  size="sm"
                                  isRecurring={isFixedItem}
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                                    <span className="truncate">{itemName}</span>
                                    {subItem.isHearted && (
                                      <Heart
                                        size={12}
                                        weight="fill"
                                        className="text-rose-500 shrink-0"
                                      />
                                    )}
                                    {subItem.isWaitingForPackage && (
                                      <Package
                                        size={12}
                                        weight="fill"
                                        className="text-amber-500 shrink-0"
                                      />
                                    )}
                                    {subItem.receiptUrl && (
                                      <Paperclip
                                        size={12}
                                        weight="bold"
                                        className="text-[var(--text-secondary)] shrink-0"
                                      />
                                    )}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
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

                              <span
                                className={`font-display font-bold tabular-nums shrink-0 ${
                                  isIncome
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {isIncome
                                  ? `+${formatKr(subItem.amount)}`
                                  : `-${formatKr(subItem.amount)}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-muted)]">
              Inga poster i perioden
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
