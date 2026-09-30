import React, { useMemo } from 'react';
import { Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';

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
}

export function BudgetSummaryModule({ 
  stats, 
  config, 
  transactions, 
  fixedExpenses, 
  totalSpentOverride,
  largestCategoryOverride,
  budgetUsedPctOverride,
  remainingBudgetOverride
}: BudgetSummaryModuleProps) {
  const filteredExpenses = useMemo(() => {
    if (!stats || !transactions) return [];
    return transactions
      .filter(e => {
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
    if (stats.totalIncome > 0) return Math.max(0, stats.totalIncome - (stats.totalSavings || 0));
    return (stats.disposablePot || 0) + (stats.totalFixed || 0);
  }, [stats]);

  const remainingBudget = remainingBudgetOverride !== undefined 
    ? remainingBudgetOverride 
    : (effectiveBudget - totalSpent);

  const budgetUsedPct = budgetUsedPctOverride !== undefined 
    ? budgetUsedPctOverride 
    : (effectiveBudget > 0 ? Math.round((totalSpent / effectiveBudget) * 100) : 0);

  if (!stats) return null;

  const isOverBudget = remainingBudget < 0;

  return (
    <div className="space-y-6 font-sans">
      {/* HUVUDBELOPP */}
      <div className="py-2 text-center space-y-1 flex flex-col items-center">
        <span className="text-[13px] sm:text-[14px] font-bold uppercase tracking-[0.08em] text-[#6E6961] dark:text-[#A8A8A8] block select-none font-display flex items-center justify-center gap-2">
          {isPastPeriod 
            ? (config.language === 'en' ? 'TOTAL SPENT' : 'TOTALT SPENDERAT')
            : (config.language === 'en' ? 'SPENT SO FAR' : 'SPENDERAT HITTILLS')}
          {isPastPeriod && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-muted)] dark:bg-[#2D2D2D] text-[#6E6961] dark:text-[#A8A8A8] font-semibold uppercase tracking-wider">
              {config.language === 'en' ? 'Completed' : 'Avslutad'}
            </span>
          )}
        </span>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-[44px] sm:text-[54px] leading-none font-bold font-amount tabular-nums text-[#1C1917] dark:text-white tracking-normal">
            {formatAmount(Math.round(totalSpent), config.language)}
          </span>
          <span className="text-[19px] sm:text-[21px] font-semibold text-[#8C867C] dark:text-[#A8A8A8]">
            {config.currency || "kr"}
          </span>
        </div>
      </div>

      {/* Grid med 3 KPI-kort */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
        {/* Kort 1: Kvar att spendera / Kvar vid periodens slut / Över budget vid slut */}
        <div className="bg-white dark:bg-[#242424] p-3 sm:p-3.5 rounded-[18px] border-none shadow-none flex flex-col justify-between text-left min-w-0 min-h-[82px]">
          <div className="text-base sm:text-[17px] font-bold font-amount tabular-nums text-[#1C1917] dark:text-white leading-tight">
            {formatAmount(Math.round(isOverBudget && isPastPeriod ? Math.abs(remainingBudget) : Math.max(0, remainingBudget)), config.language)}{' '}
            <span className="text-xs font-normal text-[#6E6961] dark:text-[#A8A8A8]">
              {config.currency || "kr"}
            </span>
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#6E6961] dark:text-[#A8A8A8] mt-1.5 select-none line-clamp-2 leading-snug">
            {isPastPeriod ? (
              isOverBudget 
                ? (config.language === 'en' ? 'OVER BUDGET AT END' : 'ÖVER BUDGET VID SLUT')
                : (config.language === 'en' ? 'LEFT AT PERIOD END' : 'KVAR VID PERIODENS SLUT')
            ) : (
              config.language === 'en' ? 'LEFT TO SPEND' : 'KVAR ATT SPENDERA'
            )}
          </span>
        </div>

        {/* Kort 2: Största kategori */}
        <div className="bg-white dark:bg-[#242424] p-3 sm:p-3.5 rounded-[18px] border-none shadow-none flex flex-col justify-between text-left min-w-0 min-h-[82px]">
          <div className="min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-[#1C1917] dark:text-white truncate leading-tight capitalize">
              {largestCategory.name ? largestCategory.name : <span className="text-[#8C867C] dark:text-[#A8A8A8] font-normal">—</span>}
            </div>
            <div className="text-[11px] sm:text-xs font-medium font-amount tabular-nums text-[#6E6961] dark:text-[#A8A8A8] mt-0.5 truncate">
              {largestCategory.name && largestCategory.amount > 0 
                ? `${formatAmount(Math.round(largestCategory.amount), config.language)} ${config.currency || "kr"}`
                : <span className="opacity-0">0 kr</span>}
            </div>
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#6E6961] dark:text-[#A8A8A8] mt-1.5 select-none line-clamp-2 leading-snug">
            {config.language === 'en' ? 'TOP CATEGORY' : 'STÖRSTA KATEGORI'}
          </span>
        </div>

        {/* Kort 3: Av budgeten använd */}
        <div className="bg-white dark:bg-[#242424] p-3 sm:p-3.5 rounded-[18px] border-none shadow-none flex flex-col justify-between text-left min-w-0 min-h-[82px]">
          <div className="text-base sm:text-[17px] font-bold font-amount tabular-nums text-[#1C1917] dark:text-white leading-tight">
            {budgetUsedPct}%
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-[#6E6961] dark:text-[#A8A8A8] mt-1.5 select-none line-clamp-2 leading-snug">
            {config.language === 'en' ? 'OF BUDGET USED' : 'AV BUDGETEN ANVÄND'}
          </span>
        </div>
      </div>
    </div>
  );
}