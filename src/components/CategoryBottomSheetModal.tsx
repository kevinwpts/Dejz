import React, { useMemo } from 'react';
import { Transaction, Config, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { TransactionItem } from './TransactionItem';
import { BudgetItem } from './BudgetItem';
import { BottomSheet, EmptyState } from './ui';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryIconName } from '../utils/icons';
import { getCategoryColor } from '../utils/categoryColors';
import { getActiveFixedExpenses } from '../utils/cancellation';
import { isFixedItemDueInPeriod } from '../utils/date';

interface CategoryBottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string | null;
  categoryData: {
    name: string;
    iconName?: string;
    spent: number;
    budget: number;
    variableSpent?: number;
    fixedSpent?: number;
    remaining: number;
    hasBudget: boolean;
    isOverBudget: boolean;
    color?: string;
  } | null;
  selectedDate: Date;
  allTransactions: Transaction[];
  fixedExpenses?: FixedExpense[];
  onViewFixedExpense?: (expense: FixedExpense) => void;
  stats?: any;
  config: Config;
  language?: string;
  onViewTransaction: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onToggleStar?: (transaction: Transaction) => void;
  onAddTransaction?: (type?: string, prefill?: any) => void;
  onNavigate?: (tab: string, section?: string) => void;
  onUpdateConfig?: (config: Config) => void;
  t?: (key: TranslationKey) => string;
}

export function CategoryBottomSheetModal({
  isOpen,
  onClose,
  categoryName,
  categoryData,
  selectedDate: _selectedDate,
  allTransactions = [],
  fixedExpenses = [],
  onViewFixedExpense,
  stats,
  config,
  language = 'sv',
  onViewTransaction,
  onDeleteTransaction,
  onToggleStar,
  onUpdateConfig,
  t,
}: CategoryBottomSheetModalProps) {
  const isEn = language === 'en';
  const curr = config?.currency || 'kr';

  const targetCategoryName = categoryName || categoryData?.name;

  const matchedCategory = useMemo(() => {
    if (!targetCategoryName || !config?.categories) return null;
    const norm = targetCategoryName.trim().toLowerCase();
    return config.categories.find((c) => (c.name || '').trim().toLowerCase() === norm);
  }, [targetCategoryName, config?.categories]);

  const categoryColor = categoryData?.color || matchedCategory?.color || getCategoryColor(targetCategoryName || '', config?.categories);
  const iconKey = categoryData?.iconName || matchedCategory?.icon || getCategoryIconName(targetCategoryName || '');

  // Filter transactions for this category strictly within the current period, respecting split amounts
  const periodTransactions = useMemo(() => {
    if (!targetCategoryName) return [];

    const normCat = targetCategoryName.trim().toLowerCase();
    const periodStartMs = stats?.periodStart ? new Date(stats.periodStart).getTime() : null;
    const periodEndMs = stats?.periodEnd ? new Date(stats.periodEnd).getTime() + 86399999 : null;

    const matched: Transaction[] = [];

    allTransactions.forEach((tx) => {
      if (!tx) return;
      if ((tx as any).isExcludedFromBudget || (tx as any).isInternalTransfer || (tx as any).isTransfer) return;
      if (tx.type === 'income') return;

      // Period filter: strictly within current period
      if (periodStartMs !== null && periodEndMs !== null) {
        const txTime = tx.timestamp || ((tx as any).date ? new Date((tx as any).date).getTime() : 0);
        if (txTime < periodStartMs || txTime > periodEndMs) {
          return;
        }
      }

      const splits = (tx as any).splits;
      if (splits && Array.isArray(splits) && splits.length > 0) {
        const matchingSplitSum = splits
          .filter((s: any) => (s.category || '').trim().toLowerCase() === normCat)
          .reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        if (matchingSplitSum > 0) {
          matched.push({
            ...tx,
            amount: matchingSplitSum,
            category: targetCategoryName,
          });
        }
        return;
      }

      const txCat = (tx.category || '').trim().toLowerCase();
      if (txCat === normCat) {
        matched.push(tx);
      }
    });

    // Sort descending by timestamp / date
    return matched.sort((a, b) => {
      const timeA = a.timestamp || ((a as any).date ? new Date((a as any).date).getTime() : 0);
      const timeB = b.timestamp || ((b as any).date ? new Date((b as any).date).getTime() : 0);
      return timeB - timeA;
    });
  }, [targetCategoryName, allTransactions, stats?.periodStart, stats?.periodEnd]);

  const displayTransactions = periodTransactions;

  // Filter active fixed expenses for this category due in the current period
  const matchingFixedExpenses = useMemo(() => {
    if (!targetCategoryName || !fixedExpenses || fixedExpenses.length === 0) return [];
    const normCat = targetCategoryName.trim().toLowerCase();
    const activeList = getActiveFixedExpenses(fixedExpenses, new Date(), stats?.periodStart, stats?.periodEnd);
    return (activeList || []).filter((fe) => {
      if (!fe) return false;
      if (stats?.periodStart && stats?.periodEnd && !isFixedItemDueInPeriod(fe, stats.periodStart, stats.periodEnd)) {
        return false;
      }
      const feCat = (fe.category || '').trim().toLowerCase();
      return feCat === normCat;
    });
  }, [targetCategoryName, fixedExpenses, stats?.periodStart, stats?.periodEnd]);

  const totalFixedAmount = useMemo(() => {
    return Math.round(
      matchingFixedExpenses.reduce((sum, fe) => {
        const rawAmount =
          fe.isVariable && stats?.periodId && fe.periodOverrides && fe.periodOverrides[stats.periodId] !== undefined
            ? fe.periodOverrides[stats.periodId]
            : Number(fe.amount) || 0;
        return sum + rawAmount;
      }, 0)
    );
  }, [matchingFixedExpenses, stats?.periodId]);

  const actualFixedSpent = categoryData?.fixedSpent !== undefined 
    ? Math.round(categoryData.fixedSpent) 
    : totalFixedAmount;

  const actualVariableSpent = categoryData?.variableSpent !== undefined
    ? Math.round(categoryData.variableSpent)
    : Math.round(displayTransactions.reduce((s, tx) => s + (Number(tx.amount) || 0), 0));

  const actualTotalSpent = categoryData?.spent !== undefined
    ? Math.round(categoryData.spent)
    : Math.round(actualFixedSpent + actualVariableSpent);

  const storedBudgetVal = matchedCategory?.budget !== undefined && matchedCategory?.budget !== null
    ? Number(String(matchedCategory.budget).replace(/[^0-9.]/g, ''))
    : (categoryData?.budget || 0);

  const budget = Math.max(Math.round(storedBudgetVal || 0), actualFixedSpent);

  const hasBudget = budget > 0;
  const remaining = budget - actualTotalSpent;

  const usedPercentage = hasBudget
    ? Math.round((actualTotalSpent / budget) * 100)
    : 0;

  if (!targetCategoryName || typeof document === 'undefined' || !document.body) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      headerLeading={
        <CategoryIcon 
          icon={iconKey} 
          color={categoryColor} 
          size="md" 
          variant="primary" 
          categoryName={targetCategoryName}
        />
      }
      title={targetCategoryName}
      bodyClassName="px-5 sm:px-6 pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-3.5 no-scrollbar flex flex-col min-h-0"
    >
      {/* Category Budget Status Card (Read-only overview with structured breakdown) */}
      <div className="p-4 sm:p-5 rounded-card bg-[var(--surface-color)] shrink-0 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-label font-medium text-[var(--text-secondary)]">
              {hasBudget
                ? remaining < 0
                  ? (isEn ? 'Exceeded by' : 'Överskridet med')
                  : (isEn ? 'Remaining in budget' : 'Kvar i budget')
                : (isEn ? 'Spent this period' : 'Spenderat i perioden')}
            </span>
            <span
              className={`text-large-amount font-bold font-amount tabular-nums tracking-tight mt-0.5 ${
                hasBudget && remaining < 0
                  ? 'text-[var(--danger-color)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {hasBudget
                ? `${formatAmount(Math.abs(remaining), language)} ${curr}`
                : `${formatAmount(actualTotalSpent, language)} ${curr}`}
            </span>
          </div>

          {hasBudget && (
            <span
              className={`px-2.5 py-1 rounded-full text-label font-semibold font-amount tabular-nums shrink-0 ${
                remaining < 0
                  ? 'bg-[var(--danger-container)] text-[var(--danger-color)]'
                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
              }`}
            >
              {Math.min(999, Math.max(0, usedPercentage))} % {isEn ? 'used' : 'använt'}
            </span>
          )}
        </div>

        {/* Progress Bar (only when hasBudget) */}
        {hasBudget && (
          <div
            className={`w-full h-1.5 rounded-full overflow-hidden transition-colors ${
              remaining < 0
                ? 'bg-[var(--danger-container)]'
                : 'bg-[var(--surface-muted)]'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                remaining < 0
                  ? 'bg-[var(--danger-color)]'
                  : remaining === 0
                  ? 'bg-[var(--text-tertiary)]'
                  : 'bg-[var(--success-color)]'
              }`}
              style={{
                width: `${remaining < 0 ? 100 : Math.min(100, Math.max(0, usedPercentage))}%`,
              }}
            />
          </div>
        )}

        {/* Structured Breakdown Footer (replaces loose "Budget: X kr · varav Y kr fast" text) */}
        {hasBudget ? (
          <div
            className={`pt-3 border-t border-[var(--border-divider)] grid ${
              actualFixedSpent > 0 ? 'grid-cols-3' : 'grid-cols-2'
            } divide-x divide-[var(--border-divider)] text-left w-full`}
          >
            <div className="flex flex-col min-w-0 pr-2.5">
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Total budget' : 'Total budget'}
              </span>
              <span className="text-card-title font-bold font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                {formatAmount(budget, language)} {curr}
              </span>
            </div>

            <div className={`flex flex-col min-w-0 ${actualFixedSpent > 0 ? 'px-2.5' : 'pl-2.5'}`}>
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {actualFixedSpent > 0
                  ? (isEn ? 'Variable spent' : 'Rörligt')
                  : (isEn ? 'Spent' : 'Spenderat')}
              </span>
              <span className="text-card-title font-bold font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                {formatAmount(actualFixedSpent > 0 ? actualVariableSpent : actualTotalSpent, language)} {curr}
              </span>
            </div>

            {actualFixedSpent > 0 && (
              <div className="flex flex-col min-w-0 pl-2.5">
                <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                  {isEn ? 'Fixed expenses' : 'Fast kostnad'}
                </span>
                <span className="text-card-title font-bold font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                  {formatAmount(actualFixedSpent, language)} {curr}
                </span>
              </div>
            )}
          </div>
        ) : actualFixedSpent > 0 ? (
          <div className="pt-3 border-t border-[var(--border-divider)] grid grid-cols-2 divide-x divide-[var(--border-divider)] text-left w-full">
            <div className="flex flex-col min-w-0 pr-2.5">
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Variable spent' : 'Rörligt spenderat'}
              </span>
              <span className="text-card-title font-bold font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                {formatAmount(actualVariableSpent, language)} {curr}
              </span>
            </div>
            <div className="flex flex-col min-w-0 pl-2.5">
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Fixed expenses' : 'Fast kostnad'}
              </span>
              <span className="text-card-title font-bold font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                {formatAmount(actualFixedSpent, language)} {curr}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Expenses List: Fixed Expenses and Variable Transactions */}
      <div className="space-y-3.5 flex-1 flex flex-col min-h-0 pt-0.5">
        {/* 1. Fasta utgifter (om det finns för denna kategori) */}
        {matchingFixedExpenses.length > 0 && (
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-section-title">
                {isEn ? 'Fixed expenses' : 'Fasta utgifter'}
                <span className="text-secondary text-[var(--text-secondary)] font-normal ml-1">
                  ({matchingFixedExpenses.length})
                </span>
              </h4>
              <span className="text-secondary font-medium text-[var(--text-secondary)] font-amount tabular-nums">
                {formatAmount(totalFixedAmount, language)} <span className="text-unit">{curr}{isEn ? '/mo' : '/mån'}</span>
              </span>
            </div>

            <div className="bg-[var(--surface-color)] rounded-card border border-subtle shadow-none overflow-hidden divide-subtle">
              {matchingFixedExpenses.map((fe) => (
                <BudgetItem
                  key={fe.id}
                  item={fe}
                  onClick={() => {
                    if (typeof feedback.light === 'function') feedback.light();
                    if (onViewFixedExpense) onViewFixedExpense(fe);
                  }}
                  currency={curr}
                  type="expense"
                  language={language as any}
                  t={t || ((k: any) => k)}
                  config={config}
                  currentPeriodId={stats?.periodId}
                  isGrouped={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* 2. Rörliga transaktioner */}
        {displayTransactions.length > 0 ? (
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-1 pt-1">
              <h4 className="text-section-title">
                {isEn ? 'Variable expenses' : 'Rörliga utgifter'}
                <span className="text-secondary text-[var(--text-secondary)] font-normal ml-1">
                  ({displayTransactions.length})
                </span>
              </h4>
              <span className="text-secondary font-medium text-[var(--text-secondary)] font-amount tabular-nums">
                {formatAmount(
                  displayTransactions.reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
                  language
                )}{' '}
                <span className="text-unit">{curr}</span>
              </span>
            </div>

            <div className="overflow-y-auto no-scrollbar pr-0.5 flex-1">
              <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-none divide-subtle overflow-hidden">
                {displayTransactions.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    isGrouped={true}
                    config={config}
                    onView={onViewTransaction}
                    onDelete={onDeleteTransaction}
                    onToggleStar={onToggleStar}
                    showDate={true}
                    hideCategoryBadge={true}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : matchingFixedExpenses.length === 0 ? (
          <EmptyState
            title={isEn ? 'No expenses in this category' : 'Inga utgifter i denna kategori'}
            description={isEn ? 'No expenses recorded in this category during the selected period.' : 'Inga utgifter registrerade i denna kategori under den valda perioden.'}
          />
        ) : null}
      </div>
    </BottomSheet>
  );
}


