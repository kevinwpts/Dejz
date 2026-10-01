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

  // Specific label for budget usage based on filter
  const budgetUsageLabel = filterMode === 'variable'
    ? (isEn ? 'Variable budget used' : 'Rörlig budget använd')
    : filterMode === 'fixed'
    ? (isEn ? 'Fixed costs allocated' : 'Fasta utgifter av budget')
    : (isEn ? 'Period budget used' : 'Av periodbudgeten använt');

  return (
    <div className="space-y-6 font-sans">
      {/* 1. HUVUDBELOPP (SPENDERAT HITTILLS) */}
      <div className="text-center flex flex-col items-center gap-1">
        <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block select-none">
          {isPastPeriod 
            ? (isEn ? 'Totalt spenderat' : 'Totalt spenderat')
            : (isEn ? 'Spenderat hittills' : 'Spenderat hittills')}
        </span>
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-[34px] sm:text-[38px] md:text-[42px] leading-tight font-semibold font-amount tabular-nums text-[#211F1C] dark:text-white tracking-tight">
            {formatAmount(Math.round(totalSpent), config.language)}
          </span>
          <span className="text-sm sm:text-base font-normal text-[#6D6962] dark:text-[#A8A8A8]">
            {config.currency || "kr"}
          </span>
        </div>
      </div>

      {/* 2. GEMENSAMT SAMMANFATTNINGSKORT MED 3 HORISONTELLA INFORMATIONSRADER */}
      <div className="bg-white dark:bg-[#191523] rounded-[22px] p-4 border-none shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {/* Rad 1: Kvar att spendera */}
        <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8]">
              {isPastPeriod ? (
                isOverBudget 
                  ? (isEn ? 'Över budget vid slut' : 'Över budget vid slut')
                  : (isEn ? 'Kvar vid periodens slut' : 'Kvar vid periodens slut')
              ) : (
                isEn ? 'Kvar att spendera' : 'Kvar att spendera'
              )}
            </span>
            <button
              type="button"
              onClick={() => setActiveInfoModal('remaining')}
              className="w-5 h-5 rounded-full text-[#6D6962] dark:text-[#A8A8A8] hover:text-[#211F1C] dark:hover:text-white inline-flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Information om kvar att spendera"
              title="Förklaring"
            >
              <Info size={14} strokeWidth={1.8} />
            </button>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[16px] font-medium font-amount tabular-nums text-[#211F1C] dark:text-white">
              {formatAmount(Math.round(isOverBudget && isPastPeriod ? Math.abs(remainingBudget) : Math.max(0, remainingBudget)), config.language)}
            </span>
            <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] ml-1">
              {config.currency || "kr"}
            </span>
          </div>
        </div>

        {/* Rad 2: Största kategori */}
        <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
          <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] shrink-0">
            {isEn ? 'Största kategori' : 'Största kategori'}
          </span>
          <div className="text-right min-w-0 flex-1 flex items-center justify-end gap-1.5 flex-wrap">
            {largestCategory.name ? (
              <>
                <span className="text-[16px] font-medium text-[#211F1C] dark:text-white break-words text-right">
                  {largestCategory.name}
                </span>
                <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] shrink-0">
                  · {formatAmount(Math.round(largestCategory.amount), config.language)} {config.currency || "kr"}
                </span>
              </>
            ) : (
              <span className="text-[14px] font-normal text-[#777168] dark:text-[#71717A]">—</span>
            )}
          </div>
        </div>

        {/* Rad 3: Budget använd */}
        <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8]">
              {budgetUsageLabel}
            </span>
            <button
              type="button"
              onClick={() => setActiveInfoModal('budgetUsed')}
              className="w-5 h-5 rounded-full text-[#6D6962] dark:text-[#A8A8A8] hover:text-[#211F1C] dark:hover:text-white inline-flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Information om budgetanvändning"
              title="Förklaring"
            >
              <Info size={14} strokeWidth={1.8} />
            </button>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[16px] font-medium font-amount tabular-nums text-[#211F1C] dark:text-white">
              {budgetUsedPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Info Modal för Kvar att spendera */}
      {activeInfoModal === 'remaining' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveInfoModal(null)}
          title={isEn ? 'Kvar att spendera' : 'Kvar att spendera'}
          size="sm"
        >
          <div className="space-y-3 text-[14px] text-[#6D6962] dark:text-[#A8A8A8]">
            <p>
              {isEn 
                ? 'This shows your remaining disposable amount for the selected period after deducting recorded expenses.'
                : 'Detta visar hur mycket du har kvar att spendera under den valda perioden utifrån din tillgängliga pott minus registrerade utgifter.'}
            </p>
            <div className="p-3 bg-[var(--surface-muted)] dark:bg-[#2D2D2D] rounded-[12px] space-y-1.5 text-[13px] text-[#211F1C] dark:text-white">
              <div className="flex justify-between">
                <span>{isEn ? 'Period budget' : 'Periodbudget'}:</span>
                <span className="font-medium">{formatAmount(Math.round(effectiveBudget), config.language)} {config.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{isEn ? 'Spent so far' : 'Spenderat hittills'}:</span>
                <span className="font-medium">−{formatAmount(Math.round(totalSpent), config.language)} {config.currency}</span>
              </div>
              <div className="h-px bg-[#E2DDD4] dark:bg-[#383838] my-1" />
              <div className="flex justify-between font-semibold">
                <span>{isEn ? 'Remaining' : 'Kvar'}:</span>
                <span>{formatAmount(Math.round(remainingBudget), config.language)} {config.currency}</span>
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
          <div className="space-y-3 text-[14px] text-[#6D6962] dark:text-[#A8A8A8]">
            <p>
              {isEn 
                ? `Shows what percentage of your budget (${formatAmount(Math.round(effectiveBudget), config.language)} ${config.currency}) has been consumed so far.`
                : `Visar hur stor andel av din totala budget (${formatAmount(Math.round(effectiveBudget), config.language)} ${config.currency}) som har förbrukats hittills under perioden.`}
            </p>
            <p className="text-[13px]">
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