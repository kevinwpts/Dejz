import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { Modal } from './ui';

interface BudgetSummaryModuleProps {
  stats: any;
  config: Config;
  transactions: any[];
  fixedExpenses: any[];
  t: (key: TranslationKey) => string;
  totalSpentOverride?: number;
  largestCategoryOverride?: { name: string; amount: number };
  budgetUsedPctOverride?: number;
  remainingBudgetOverride?: number;
  filterMode?: 'all' | 'variable' | 'fixed';
}

export function BudgetSummaryModule({ 
  stats, 
  config, 
  transactions, 
  fixedExpenses, 
  totalSpentOverride,
  largestCategoryOverride,
  budgetUsedPctOverride,
  remainingBudgetOverride,
  filterMode = 'all'
}: BudgetSummaryModuleProps) {
  const [activeInfoModal, setActiveInfoModal] = useState<'remaining' | 'budgetUsed' | null>(null);

  const filteredExpenses = useMemo(() => {
    if (!stats || !transactions) return [];
    return transactions.filter(e => {
      return e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime() + 86399999;
    });
  }, [transactions, stats?.periodStart, stats?.periodEnd]);

  const { totalFixed, totalSpentInPeriod } = useMemo(() => {
    let fixedSum = 0;
    let spentSum = 0;

    if (filteredExpenses) {
      filteredExpenses.forEach((e: any) => {
        if (e.type === 'income') return;
        if (e.category === 'savings_pot_increase') return;
        if (e.type === 'expense') {
          spentSum += e.amount;
        }
      });
    }

    if (fixedExpenses) {
      fixedExpenses.forEach((fe: any) => {
        const isPaid = fe.paidInPeriods?.[stats?.periodId];
        if (isPaid || (!isPaid && fe.deductionDay < new Date().getDate())) {
          fixedSum += fe.amount;
        }
      });
    }

    return { totalFixed: fixedSum, totalSpentInPeriod: spentSum };
  }, [filteredExpenses, fixedExpenses, stats?.periodId]);

  const totalSpent = totalSpentOverride !== undefined ? totalSpentOverride : (totalSpentInPeriod + totalFixed);

  const localLargestCategory = useMemo(() => {
    const categoryMap: { [key: string]: number } = {};

    // 1. Add variable expenses
    if (filteredExpenses) {
      filteredExpenses.forEach((e) => {
        if (e.type === 'income') return;
        if (e.category === 'savings_pot_increase') return;
        if (e.type === 'expense') {
          const catName = e.category ? e.category.trim() : "";
          if (catName) {
            categoryMap[catName] = (categoryMap[catName] || 0) + (Number(e.amount) || 0);
          }
        }
      });
    }

    // 2. Add fixed expenses
    if (fixedExpenses && stats?.periodId) {
      fixedExpenses.forEach((fe) => {
        const isPaid = fe.paidInPeriods?.[stats?.periodId];
        if (isPaid || (!isPaid && fe.deductionDay < new Date().getDate())) {
          const catName = fe.category ? fe.category.trim() : "Fasta utgifter";
          categoryMap[catName] = (categoryMap[catName] || 0) + (Number(fe.amount) || 0);
        }
      });
    }

    // Find the largest category
    let maxCat = "";
    let maxVal = 0;
    Object.entries(categoryMap).forEach(([catName, val]) => {
      const valNum = Number(val) || 0;
      if (valNum > maxVal) {
        maxVal = valNum;
        maxCat = catName;
      }
    });

    return { name: maxCat, amount: maxVal };
  }, [filteredExpenses, fixedExpenses, stats?.periodId]);

  const largestCategory = largestCategoryOverride !== undefined ? largestCategoryOverride : localLargestCategory;

  const isPastPeriod = useMemo(() => {
    if (!stats) return false;
    if (stats.isPastPeriod) return true;
    if (stats.periodEnd) {
      const now = new Date();
      const endMidnight = new Date(stats.periodEnd.getFullYear(), stats.periodEnd.getMonth(), stats.periodEnd.getDate(), 23, 59, 59, 999).getTime();
      return now.getTime() > endMidnight;
    }
    return false;
  }, [stats]);

  const effectiveBudget = useMemo(() => {
    if (!stats) return 0;
    if (filterMode === 'variable') {
      return stats.disposablePot || 0;
    }
    if (filterMode === 'fixed') {
      return stats.totalFixed || 0;
    }
    if (stats.totalIncome > 0) return Math.max(0, stats.totalIncome - (stats.totalSavings || 0));
    return (stats.disposablePot || 0) + (stats.totalFixed || 0);
  }, [stats, filterMode]);

  const remainingBudget = remainingBudgetOverride !== undefined 
    ? remainingBudgetOverride 
    : (effectiveBudget - totalSpent);

  const budgetUsedPct = budgetUsedPctOverride !== undefined 
    ? budgetUsedPctOverride 
    : (effectiveBudget > 0 ? Math.round((totalSpent / effectiveBudget) * 100) : 0);

  if (!stats) return null;

  const isOverBudget = remainingBudget < 0;
  const isEn = config.language === 'en';

  const budgetUsageLabel = filterMode === 'variable'
    ? (isEn ? 'Variable budget' : 'Rörlig budget')
    : filterMode === 'fixed'
    ? (isEn ? 'Fixed costs' : 'Fasta utgifter')
    : (isEn ? 'Period budget' : 'Periodbudget');

  return (
    <div className="space-y-3 font-sans">
      {/* Super Compact Side-by-Side Summary Card */}
      <div className="bg-white dark:bg-[#1C1C1C] rounded-[22px] p-4 sm:p-5 border-none shadow-none space-y-3.5">
        {/* Top Split: Spenderat vs Kvar att spendera */}
        <div className="grid grid-cols-2 gap-4 pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06]">
          {/* Spenderat */}
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              {isPastPeriod ? (isEn ? 'Total spent' : 'Spenderat') : (isEn ? 'Spent so far' : 'Spenderat')}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] sm:text-[26px] font-bold font-amount tabular-nums text-[var(--text-primary)] tracking-tight">
                {formatAmount(Math.round(totalSpent), config.language)}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {config.currency || "kr"}
              </span>
            </div>
          </div>

          {/* Kvar att spendera */}
          <div className="space-y-0.5 text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {isPastPeriod ? (isOverBudget ? (isEn ? 'Over budget' : 'Över budget') : (isEn ? 'Left' : 'Kvar')) : (isEn ? 'Remaining' : 'Kvar')}
              </span>
              <button
                type="button"
                onClick={() => setActiveInfoModal('remaining')}
                className="w-4 h-4 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center transition-colors cursor-pointer"
                title="Förklaring"
                aria-label="Förklaring"
              >
                <Info size={12} strokeWidth={2} />
              </button>
            </div>
            <div className="flex items-baseline justify-end gap-1">
              <span className={`text-[22px] sm:text-[26px] font-bold font-amount tabular-nums tracking-tight ${
                isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
              }`}>
                {isOverBudget ? '−' : ''}
                {formatAmount(Math.round(isOverBudget && isPastPeriod ? Math.abs(remainingBudget) : Math.max(0, remainingBudget)), config.language)}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {config.currency || "kr"}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Split: Budget Used % vs Largest Category */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          {/* Budget Used */}
          <div 
            onClick={() => setActiveInfoModal('budgetUsed')}
            className="p-3 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
                {isEn ? 'Budget used' : 'Använt'}
              </span>
              <span className="text-[15px] sm:text-[16px] font-bold font-amount tabular-nums text-[var(--text-primary)]">
                {budgetUsedPct}%
              </span>
            </div>
          </div>

          {/* Largest Category */}
          <div className="p-3 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between min-w-0">
            <div className="min-w-0 pr-1">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block truncate">
                {isEn ? 'Largest category' : 'Största kategori'}
              </span>
              <span className="text-[14px] sm:text-[15px] font-bold text-[var(--text-primary)] truncate block">
                {largestCategory.name || '—'}
              </span>
            </div>
            {largestCategory.amount > 0 && (
              <span className="text-[13px] font-medium font-amount tabular-nums text-[var(--text-secondary)] shrink-0">
                {formatAmount(Math.round(largestCategory.amount), config.language)} {config.currency || 'kr'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Modal för Kvar att spendera */}
      {activeInfoModal === 'remaining' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveInfoModal(null)}
          title={isEn ? 'Remaining to spend' : 'Kvar att spendera'}
          size="sm"
        >
          <div className="space-y-3.5 text-[14px] text-[var(--text-secondary)]">
            <p>
              {isEn 
                ? 'This shows your remaining disposable amount for the selected period after deducting recorded expenses.'
                : 'Detta visar hur mycket du har kvar att spendera under den valda perioden utifrån din tillgängliga pott minus registrerade utgifter.'}
            </p>
            <div className="p-3.5 bg-black/5 dark:bg-[#222222] rounded-[16px] space-y-2 text-[13px] text-[var(--text-primary)] border border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Period budget' : 'Periodbudget'}:</span>
                <span className="font-semibold font-amount tabular-nums">{formatAmount(Math.round(effectiveBudget), config.language)} {config.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Spent so far' : 'Spenderat hittills'}:</span>
                <span className="font-semibold font-amount tabular-nums text-rose-500">−{formatAmount(Math.round(totalSpent), config.language)} {config.currency}</span>
              </div>
              <div className="h-px bg-black/10 dark:bg-white/10 my-1" />
              <div className="flex justify-between font-bold text-[14px]">
                <span>{isEn ? 'Remaining' : 'Kvar'}:</span>
                <span className="font-amount tabular-nums text-[var(--accent-color)]">{formatAmount(Math.round(remainingBudget), config.language)} {config.currency}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Info Modal för Budgetanvändning */}
      {activeInfoModal === 'budgetUsed' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveInfoModal(null)}
          title={budgetUsageLabel}
          size="sm"
        >
          <div className="space-y-3.5 text-[14px] text-[var(--text-secondary)]">
            <p>
              {isEn 
                ? `Shows what percentage of your budget (${formatAmount(Math.round(effectiveBudget), config.language)} ${config.currency}) has been consumed so far.`
                : `Visar hur stor andel av din totala budget (${formatAmount(Math.round(effectiveBudget), config.language)} ${config.currency}) som har förbrukats hittills under perioden.`}
            </p>
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              {budgetUsedPct <= 100 
                ? (isEn ? `You have ${100 - budgetUsedPct}% left of the budget.` : `Du har ${100 - budgetUsedPct}% kvar av budgeten.`)
                : (isEn ? `You have exceeded the budget by ${budgetUsedPct - 100}%.` : `Du har överskridit budgeten med ${budgetUsedPct - 100}%.`)}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}