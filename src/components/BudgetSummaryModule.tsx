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
  dailyAvgOverride?: number;
  largestCategoryOverride?: { name: string; amount: number };
  budgetUsedPctOverride?: number;
}

export function BudgetSummaryModule({ 
  stats, 
  config, 
  transactions, 
  fixedExpenses, 
  totalSpentOverride,
  dailyAvgOverride,
  largestCategoryOverride,
  budgetUsedPctOverride
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

  const daysElapsed = useMemo(() => {
    if (!stats) return 0;
    const now = new Date();
    const realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMidnight = new Date(stats.periodStart.getFullYear(), stats.periodStart.getMonth(), stats.periodStart.getDate()).getTime();
    const endMidnight = new Date(stats.periodEnd.getFullYear(), stats.periodEnd.getMonth(), stats.periodEnd.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (realToday.getTime() > endMidnight) return Math.round((endMidnight - startMidnight) / oneDay) + 1;
    if (realToday.getTime() < startMidnight) return 0;
    return Math.round((realToday.getTime() - startMidnight) / oneDay);
  }, [stats?.periodStart, stats?.periodEnd]);

  const daysRemaining = useMemo(() => {
    if (!stats) return 1;
    const now = new Date();
    const realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endMidnight = new Date(stats.periodEnd.getFullYear(), stats.periodEnd.getMonth(), stats.periodEnd.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const diff = Math.ceil((endMidnight - realToday.getTime()) / oneDay) + 1;
    return Math.max(1, diff);
  }, [stats?.periodEnd]);

  const dailyAvg = dailyAvgOverride !== undefined ? dailyAvgOverride : (daysElapsed > 0 ? Math.round(totalSpent / daysElapsed) : 0);
  const _remainingPerDay = stats ? Math.round(stats.remainingPeriodCents / daysRemaining) : 0;
  const disposablePot = stats ? stats.disposablePot : 0;

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

  const budgetUsedPct = budgetUsedPctOverride !== undefined ? budgetUsedPctOverride : ((stats && stats.totalIncome > 0) ? Math.round((totalSpent / stats.totalIncome) * 100) : 0);
  const _budgetLeftPct = stats ? Math.max(0, Math.min(100, Math.round((stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) * 100))) : 0;

  if (!stats) return null;

  return (
    <div className="space-y-6 font-sans">
      {/* SPENDERAT DENNA PERIOD */}
      <div className="py-2 text-center space-y-1 flex flex-col items-center">
        <span className="text-[13px] sm:text-[14px] font-bold uppercase tracking-[0.08em] text-[#6E6961] dark:text-[#9CA6BC] block select-none font-display flex items-center justify-center gap-2">
          {stats.isPastPeriod ? 'SPENDERAT FÖR PERIODEN' : 'SPENDERAT DENNA PERIOD'}
          {stats.isPastPeriod && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/5 dark:bg-white/[0.08] text-[#6E6961] dark:text-[#9CA6BC] font-medium uppercase tracking-wider">
              Avslutad
            </span>
          )}
        </span>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-[44px] sm:text-[54px] leading-none font-bold font-amount tabular-nums text-[#1C1917] dark:text-white tracking-normal">
            {formatAmount(Math.round(totalSpent), config.language)}
          </span>
          <span className="text-[19px] sm:text-[21px] font-semibold text-[#8C867C] dark:text-[#9CA6BC]">
            {config.currency || "kr"}
          </span>
        </div>
      </div>

      {/* Grid for other indicators */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {/* Snitt per dag */}
        <div className="bg-[#FFFFFF] dark:bg-[#272727] p-3 sm:p-3.5 rounded-[18px] border-none shadow-none flex flex-col justify-center text-left min-w-0">
          <div className="text-base sm:text-[17px] font-bold font-amount tabular-nums text-[#1C1917] dark:text-white leading-tight">
            {formatAmount(dailyAvg, config.language)} <span className="text-xs font-normal text-[#6E6961] dark:text-[#A8A8A8]">{config.currency || "kr"}</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E6961] dark:text-[#A8A8A8] mt-1 select-none truncate">
            {config.language === 'en' ? 'Daily Average' : 'Snitt per dag'}
          </span>
        </div>

        {/* Största kategori */}
        <div className="bg-[#FFFFFF] dark:bg-[#272727] p-3 sm:p-3.5 rounded-[18px] border-none shadow-none flex flex-col justify-center text-left min-w-0">
          <div className="text-base sm:text-[17px] font-bold text-[#1C1917] dark:text-white truncate leading-tight capitalize">
            {largestCategory.name ? largestCategory.name : <span className="text-[#8C867C] dark:text-[#A8A8A8] font-normal">—</span>}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E6961] dark:text-[#A8A8A8] mt-1 select-none truncate">
            {config.language === 'en' ? 'Top Category' : 'Största kategori'}
          </span>
        </div>

        {/* Budget använd */}
        <div className="bg-[#FFFFFF] dark:bg-[#272727] p-3 sm:p-3.5 rounded-[18px] border-none shadow-none flex flex-col justify-center text-left min-w-0">
          <div className="text-base sm:text-[17px] font-bold font-amount tabular-nums text-[#1C1917] dark:text-white leading-tight">
            {budgetUsedPct}%
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E6961] dark:text-[#A8A8A8] mt-1 select-none truncate">
            {config.language === 'en' ? 'Budget Used' : 'Budget använd'}
          </span>
        </div>
      </div>

      {/* Clean progress bar for budget used */}
      <div className="pt-1">
        <div className="w-full h-1.5 bg-black/5 dark:bg-white/[0.06] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              budgetUsedPct > 90 ? "bg-rose-500" : "bg-neutral-900 dark:text-white dark:bg-neutral-200 dark:text-white"
            }`} 
            style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}