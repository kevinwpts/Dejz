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
  budgetUsedPctOverride,
  remainingBudgetOverride,
  filterMode = 'all'
}: BudgetSummaryModuleProps) {
  const [activeInfoModal, setActiveInfoModal] = useState<'remaining' | 'budgetUsed' | null>(null);

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

  return (
    <div className="space-y-3 font-sans">
      {/* Clean Single Summary Card */}
      <div className="bg-[var(--surface-color)] rounded-[22px] p-5 sm:p-6 border-none shadow-none space-y-5">
        {/* Top Split: Spenderat (Large) vs Kvar att spendera (Slightly smaller) */}
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Spenderat */}
          <div className="space-y-1">
            <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              {isPastPeriod ? (isEn ? 'Total spent' : 'Spenderat') : (isEn ? 'Spent so far' : 'Spenderat')}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] sm:text-[32px] font-bold font-amount tabular-nums text-[var(--text-primary)] tracking-tight">
                {formatAmount(Math.round(totalSpent), config.language)}
              </span>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {config.currency || "kr"}
              </span>
            </div>
          </div>

          {/* Kvar att spendera */}
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
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
            <div className="flex items-baseline justify-end gap-1.5">
              <span className={`text-[22px] sm:text-[27px] font-bold font-amount tabular-nums tracking-tight ${
                isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
              }`}>
                {isOverBudget ? '−' : ''}
                {formatAmount(Math.round(isOverBudget && isPastPeriod ? Math.abs(remainingBudget) : Math.max(0, remainingBudget)), config.language)}
              </span>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {config.currency || "kr"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Label section */}
        <div 
          onClick={() => setActiveInfoModal('budgetUsed')}
          className="space-y-2 pt-2 cursor-pointer group"
        >
          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.max(0, budgetUsedPct))}%`,
                backgroundColor: isOverBudget ? '#E11D48' : 'var(--accent-color)'
              }}
            />
          </div>

          {/* Label under progressbar */}
          <div className="flex items-center justify-between text-[13px] font-medium text-[var(--text-secondary)]">
            <span>
              {budgetUsedPct} {isEn ? '% of budget used' : '% av budgeten använd'}
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-[var(--accent-color)]">
              {isEn ? 'View details' : 'Visa detaljer'}
            </span>
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
                ? 'Remaining budget is calculated as your total period income (or disposable pot) minus your total spent and recorded fixed expenses.'
                : 'Kvar att spendera beräknas som din totala inkomst för perioden (eller rörlig pott) minus det du har spenderat och bokförda fasta utgifter.'}
            </p>
          </div>
        </Modal>
      )}

      {/* Info Modal för Budget Used */}
      {activeInfoModal === 'budgetUsed' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveInfoModal(null)}
          title={isEn ? 'Budget usage' : 'Budgetanvändning'}
          size="sm"
        >
          <div className="space-y-3.5 text-[14px] text-[var(--text-secondary)]">
            <p>
              {isEn
                ? `You have used ${budgetUsedPct}% (${formatAmount(Math.round(totalSpent), config.language)} ${config.currency || 'kr'}) of your total budget of ${formatAmount(Math.round(effectiveBudget), config.language)} ${config.currency || 'kr'}.`
                : `Du har använt ${budgetUsedPct}% (${formatAmount(Math.round(totalSpent), config.language)} ${config.currency || 'kr'}) av din totala budget på ${formatAmount(Math.round(effectiveBudget), config.language)} ${config.currency || 'kr'}.`}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}