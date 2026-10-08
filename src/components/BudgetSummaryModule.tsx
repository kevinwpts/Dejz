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
  effectiveBudgetOverride?: number;
  previousPeriodComparisonText?: string | null;
  filterMode?: 'all' | 'variable' | 'fixed';
}

export function BudgetSummaryModule({ 
  stats, 
  config, 
  transactions, 
  fixedExpenses, 
  totalSpentOverride,
  remainingBudgetOverride,
  effectiveBudgetOverride,
  previousPeriodComparisonText,
  filterMode = 'all'
}: BudgetSummaryModuleProps) {
  const [isRemainingInfoOpen, setIsRemainingInfoOpen] = useState(false);

  const filteredExpenses = useMemo(() => {
    if (!stats || !transactions) return [];
    return transactions.filter(e => {
      return e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime() + 8639999;
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
    if (effectiveBudgetOverride !== undefined) return effectiveBudgetOverride;
    if (!stats) return 0;
    if (filterMode === 'variable') {
      return stats.disposablePot || 0;
    }
    if (filterMode === 'fixed') {
      return stats.totalFixed || 0;
    }
    if (stats.totalIncome > 0) return Math.max(0, stats.totalIncome - (stats.totalSavings || 0));
    return (stats.disposablePot || 0) + (stats.totalFixed || 0);
  }, [stats, filterMode, effectiveBudgetOverride]);

  const remainingBudget = remainingBudgetOverride !== undefined 
    ? remainingBudgetOverride 
    : (effectiveBudget - totalSpent);

  if (!stats) return null;

  const isOverBudget = remainingBudget < 0;
  const isEn = config.language === 'en';

  const spentLabel = useMemo(() => {
    if (filterMode === 'variable') {
      return isEn ? 'Variable expenses' : 'Rörliga utgifter';
    }
    if (filterMode === 'fixed') {
      return isEn ? 'Fixed expenses' : 'Fasta utgifter';
    }
    return isPastPeriod 
      ? (isEn ? 'Total expenses' : 'Totala utgifter') 
      : (isEn ? 'Total expenses' : 'Totala utgifter');
  }, [filterMode, isPastPeriod, isEn]);

  const remainingLabel = useMemo(() => {
    return isPastPeriod
      ? (isEn ? 'Left at period end' : 'Kvar vid periodens slut')
      : (isEn ? 'Remaining to spend' : 'Kvar att spendera');
  }, [isPastPeriod, isEn]);

  return (
    <div className="space-y-3 font-sans">
      {/* Clean Single Summary Card without progress bar */}
      <div className="bg-[var(--surface-color)] rounded-[22px] p-5 sm:p-6 border-none shadow-none">
        {/* Top Split: Spenderat (Large) vs Kvar att spendera (Slightly smaller) */}
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Spenderat */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)] block">
              {spentLabel}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] sm:text-[32px] font-bold font-amount tabular-nums text-[var(--text-primary)] tracking-tight">
                {formatAmount(Math.round(totalSpent), config.language)}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {config.currency || "kr"}
              </span>
            </div>
            {previousPeriodComparisonText && (
              <p className="text-[11px] sm:text-[12px] font-normal text-[var(--text-secondary)] leading-tight tracking-tight pt-0.5">
                {previousPeriodComparisonText}
              </p>
            )}
          </div>

          {/* Kvar att spendera */}
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {remainingLabel}
              </span>
              <button
                type="button"
                onClick={() => setIsRemainingInfoOpen(true)}
                className="w-4 h-4 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center transition-colors cursor-pointer"
                title="Förklaring"
                aria-label="Förklaring"
              >
                <Info size={12} strokeWidth={2} />
              </button>
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className={`text-xl font-bold font-amount tabular-nums tracking-tight ${
                isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
              }`}>
                {isOverBudget ? '−' : ''}
                {formatAmount(Math.round(Math.abs(remainingBudget)), config.language)}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {config.currency || "kr"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal för Kvar att spendera */}
      {isRemainingInfoOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsRemainingInfoOpen(false)}
          title={isPastPeriod 
            ? (isEn ? 'Left at period end' : 'Kvar vid periodens slut')
            : (isEn ? 'Remaining to spend' : 'Kvar att spendera')}
          size="sm"
        >
          <div className="space-y-3.5 text-[14px] text-[var(--text-secondary)]">
            <p>
              {isEn 
                ? (isPastPeriod
                    ? 'Remaining at period end reflects the financial result for the entire period (income minus fixed expenses due in the period, planned savings, and variable expenses). This amount applies to your overall finances for the period, regardless of which expense filter is selected in the analysis.'
                    : 'Remaining to spend reflects how much money is available for your entire finances until next payday (income minus fixed expenses due in the period, planned savings, and variable expenses spent so far). This amount applies to your overall finances for the period, regardless of which expense filter is selected in the analysis.')
                : (isPastPeriod
                    ? 'Kvar vid periodens slut visar det faktiska kvarvarande beloppet för hela periodens ekonomi (inkomster minus fasta utgifter som hör till perioden, planerat sparande och rörliga utgifter). Beloppet gäller hela din ekonomi för perioden, oavsett vilket utgiftsfilter du har valt i analysen.'
                    : 'Kvar att spendera visar hur mycket pengar som finns kvar för hela din ekonomi fram till nästa lön (inkomster minus fasta utgifter som hör till perioden, planerat sparande och rörliga utgifter som redan spenderats). Beloppet gäller hela din ekonomi för perioden, oavsett vilket utgiftsfilter du har valt i analysen.')}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}