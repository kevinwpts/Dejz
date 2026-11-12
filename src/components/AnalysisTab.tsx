import React, { useState, useMemo } from 'react';
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
import { getFixedExpenseAmountInPeriod } from '../utils/budgetEngine';
import {
  findInternalTransferIds,
  isInternalTransferTransaction,
} from '../utils/transferDetection';
import type { BankAccount } from '../services/bankService';
import { formatSwedishDateHeading } from '../utils/swedishDate';
import { buildCategoryBreakdown } from '../utils/categoryBreakdown';

// Läsvy över en rad i kategorilistan (köp, fast utgift eller inkomst)
type SubItemView = Partial<TransactionItem> & Partial<FixedExpenseItem> & Partial<IncomeItem>;

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
  bankAccounts?: BankAccount[];
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

    const mappedFixedIncomes = incomes.map((inc) => {
      const matchedTx = periodRecurringMatches.matchedIncomeTxByIncId.get(inc.id);
      return {
        ...inc,
        type: 'income' as const,
        amount: matchedTx ? Math.round(Math.abs(Number(matchedTx.amount) || 0)) : inc.amount,
      };
    });

    const extraIncomeTxs = periodTransactions
      .filter(
        (t) =>
          t.type === 'income' &&
          !(typeof t.id === 'string' && t.id.startsWith('inc-')) &&
          !periodRecurringMatches.claimedIncomeTxIds.has(t.id) &&
          t.category !== 'Återbetalning' &&
          t.category !== 'Swish' &&
          !/swish/i.test(t.title || '')
      )
      .map((tx) => ({
        id: tx.id,
        name: tx.title,
        originalName: tx.rawDescription,
        amount: Math.round(Math.abs(Number(tx.amount) || 0)),
        payday: parseInt((tx.date || '').slice(8, 10), 10) || targetPayday,
        category: tx.category || 'Övrig inkomst',
        logo: tx.logo,
        type: 'income' as const,
      }));

    return [...mappedFixedIncomes, ...extraIncomeTxs];
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
      // Samma uträkning som hemkortet (räknemotorn)
      const effectiveAmt = getFixedExpenseAmountInPeriod(exp, matchedTx, computedPeriod);
      return {
        ...exp,
        type: 'expense' as const,
        amount: effectiveAmt,
      };
    });
  }, [fixedExpenses, incomes, periodOffset, periodTransactions, periodRecurringMatches, computedPeriod]);

  // Rörliga utgifter under perioden (exkl. 1-till-1-matchade fasta utgifter, 100 % konsekvent med Hemfliken)
  const variableTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (t.type === 'income') return false;
      if (periodRecurringMatches.claimedFixedTxIds.has(t.id)) {
        return false;
      }
      return true;
    });
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

  const unlinkedManualSplitReductions = useMemo(() => {
    return variableTransactions.reduce((sum, t) => {
      if (
        !t.linkedSwishTxId &&
        typeof t.originalAmount === 'number' &&
        t.originalAmount > (Number(t.amount) || 0)
      ) {
        return sum + Math.max(0, t.originalAmount - (Number(t.amount) || 0));
      }
      return sum;
    }, 0);
  }, [variableTransactions]);

  const periodIncomeTotal = useMemo(() => {
    return periodIncomesList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [periodIncomesList]);

  const periodFixedTotal = useMemo(() => {
    return periodFixedList.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [periodFixedList]);

  const periodVariableTotal = useMemo(() => {
    const rawSpent = variableTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    let storeRefunds = 0;
    let unlinkedSwish = 0;
    for (const t of reimbursementTransactions) {
      const amt = Math.abs(Number(t.amount) || 0);
      if (t.category === 'Återbetalning') {
        storeRefunds += amt;
      } else {
        unlinkedSwish += amt;
      }
    }
    const effectiveSwishDeduction = Math.max(0, unlinkedSwish - unlinkedManualSplitReductions);
    return Math.max(0, rawSpent - storeRefunds - effectiveSwishDeduction);
  }, [variableTransactions, reimbursementTransactions, unlinkedManualSplitReductions]);

  const totalSpent = periodFixedTotal + periodVariableTotal;
  const netSavings = periodIncomeTotal - totalSpent;

  // Kategorilistan: utgifter och inkomster hålls isär (se utils/categoryBreakdown.ts)
  const categoryBreakdown = useMemo(
    () =>
      buildCategoryBreakdown({
        variableTransactions,
        periodFixedList,
        reimbursementTransactions,
        unlinkedManualSplitReductions,
        periodIncomesList,
      }),
    [
      variableTransactions,
      periodFixedList,
      reimbursementTransactions,
      unlinkedManualSplitReductions,
      periodIncomesList,
    ]
  );

  const [selectedSliceCategory, setSelectedSliceCategory] = useState<string | null>(null);

  // Utgiftskategorier med procentandel för cirkeldiagrammet
  const expenseChartSlices = useMemo(() => {
    const expenseCats = categoryBreakdown.filter(
      (c) => !c.isIncomeCategory && c.amount > 0
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

  // Nollställ vald tårtbit om den inte finns i den valda perioden (justeras direkt under render)
  if (
    selectedSliceCategory &&
    !expenseChartSlices.some((s) => s.category === selectedSliceCategory)
  ) {
    setSelectedSliceCategory(null);
  }

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
            <span className="font-display font-semibold text-xs sm:text-footnote text-[var(--text-primary)] tabular-nums">
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
                className="absolute top-3 right-1 px-2.5 py-1 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
                    <div className="w-7 h-7 flex items-center justify-center mb-1 transition-transform">
                      <CategoryIcon
                        category={activeSlice.category}
                        size={22}
                      />
                    </div>
                    <span className="text-meta font-medium text-[var(--text-secondary)] truncate max-w-[120px]">
                      {activeSlice.category}
                    </span>
                    <span className="font-display font-semibold text-xl sm:text-[22px] tracking-[-0.02em] text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                      {formatKr(activeSlice.amount)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-meta font-normal text-[var(--text-secondary)]">
                      Utgifter i perioden
                    </span>
                    <span className="font-display font-[600] text-[24px] sm:text-[26px] tracking-[-0.03em] whitespace-nowrap text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                      {formatKr(totalSpent)}
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

      {/* Sektion 1: Sammanhållen 3-kolumns Översikt (Inkomst · Utgifter · Kvar) */}
      <section className="ui-card-p">
        <div className="ui-stat-grid">
          <div className="pr-3 min-w-0">
            <span className="ui-stat-label">
              Inkomst
            </span>
            <span className="ui-stat-value text-positive">
              +{formatKr(periodIncomeTotal)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label">
              Utgifter
            </span>
            <span className="ui-stat-value text-[var(--text-primary)]">
              −{formatKr(totalSpent)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label">
              Kvar
            </span>
            <span
              className={`ui-stat-value ${
                netSavings >= 0
                  ? 'text-[var(--text-primary)]'
                  : 'text-negative'
              }`}
            >
              {netSavings >= 0 ? formatKr(netSavings) : formatKr(netSavings)}
            </span>
          </div>
        </div>
      </section>

      {/* Sektion 2: Kategorier (Inline Dropdown / Accordion utan nästlade kort) */}
      <section className="ui-list-card px-0">
        {categoryBreakdown.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {categoryBreakdown.map((item) => {
              const isExpanded = inspectedCategory === item.key;

              return (
                <div key={item.key} className="transition-colors">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => {
                      const nextKey = isExpanded ? null : item.key;
                      setInspectedCategory(nextKey);
                      if (!item.isIncomeCategory) {
                        setSelectedSliceCategory(isExpanded ? null : item.category);
                      }
                    }}
                    className={`w-full px-4 sm:px-5 py-3.5 flex flex-col gap-2 text-left hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer group ${
                      isExpanded ? 'bg-[var(--bg-color)]/45' : ''
                    }`}
                  >
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-[var(--icon-tile-bg)] flex items-center justify-center shrink-0">
                          <CategoryIcon category={item.category} size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title">
                            {item.label}
                          </span>
                          <span className="ui-row-subtitle tabular-nums">
                            {item.items.length}{' '}
                            {item.isIncomeCategory
                              ? item.items.length === 1
                                ? 'inbetalning'
                                : 'inbetalningar'
                              : item.items.length === 1
                              ? 'post'
                              : 'poster'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span
                            className={`font-display font-semibold text-subhead sm:text-subhead tabular-nums block ${
                              item.isIncomeCategory
                                ? 'text-positive'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {item.isIncomeCategory
                              ? `+${formatKr(item.amount)}`
                              : item.amount > 0
                              ? `−${formatKr(item.amount)}`
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
                          {item.items.map((entry) => {
                            // Raden är ett köp, en fast utgift eller en inkomst
                            const subItem: SubItemView = entry;
                            const subTx = 'date' in entry ? entry : null;
                            const subIncome = 'payday' in entry ? entry : null;
                            const subFixed = 'dueDay' in entry ? entry : null;
                            const isIncome = subItem.type === 'income';
                            const itemName = subItem.title || subItem.name || '';
                            const isSubRecurring = Boolean(
                              subItem.dueDay ||
                                subItem.payday ||
                                (subItem.date &&
                                  checkIsRecurringTransaction(subItem, fixedExpenses, incomes)
                                    .isRecurring)
                            );
                            const hasSubReceipts = Boolean(
                              (Array.isArray(subItem.receipts) && subItem.receipts.length > 0) ||
                                subItem.receiptUrl
                            );

                            return (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => {
                                  if (subTx?.date && onSelectTransaction) {
                                    onSelectTransaction(subTx);
                                  } else if (subIncome?.payday && onSelectIncome) {
                                    onSelectIncome(subIncome);
                                  } else if (subFixed?.dueDay && onSelectFixed) {
                                    onSelectFixed(subFixed);
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
                                    <span className="ui-row-title text-footnote sm:text-callout">
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
                                          className="text-negative-solid shrink-0"
                                        />
                                      )}
                                      {subItem.isWaitingForPackage && (
                                        <Package
                                          size={11}
                                          weight="fill"
                                          className="text-caution-solid shrink-0"
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
                                          ? 'ui-row-amount-income text-callout'
                                          : 'ui-row-amount text-callout'
                                      }
                                    >
                                      {isIncome
                                        ? `+${formatKr(entry.amount)}`
                                        : `−${formatKr(entry.amount)}`}
                                    </span>
                                    {subTx?.date && (
                                      <span className="ui-row-meta">
                                        {subTx.bookingStatus === 'PDNG' ||
                                        subTx.bookingStatus === 'HOLD'
                                          ? 'Reserverat'
                                          : getTransactionTime({
                                              id: subTx.id,
                                              title: subTx.title,
                                              category: item.category,
                                              date: subTx.date,
                                              time: subTx.time,
                                              note: subTx.note,
                                              amount: subTx.amount,
                                              bookingStatus: subTx.bookingStatus,
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
