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
}

export function BudgetSummaryModule({ stats, config, transactions, fixedExpenses, t }: BudgetSummaryModuleProps) {
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

  const totalSpent = totalSpentInPeriod + totalFixed;

  const totalSavings = useMemo(() => {
    const itemsSum = config.monthlySavingsItems?.reduce((sum: number, item: any) => {
      const amount = (item.isVariable && stats?.periodId && item.periodOverrides && item.periodOverrides[stats.periodId] !== undefined)
        ? item.periodOverrides[stats.periodId]
        : (Number(item.amount) || 0);
      return sum + amount;
    }, 0) || 0;
    return itemsSum + (Number(config.monthlySavings) || 0);
  }, [config.monthlySavingsItems, config.monthlySavings, stats?.periodId]);

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

  if (!stats) return null;

  const disposablePot = stats.disposablePot;

  if (stats.isPastPeriod) {
    const result = Math.round(stats.remainingPeriodCents);
    const isPositive = result >= 0;

    return (
      <div className="space-y-4 font-sans">
        {/* Period Closing Hero */}
        <div className="py-2 text-center relative flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] select-none">
              {t('periodClosing' as any) || 'Periodavslut'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight ${
              isPositive 
                ? 'bg-emerald-500/[0.14] text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/[0.14] text-rose-400 border border-rose-500/20'
            }`}>
              {isPositive ? (t('surplus' as any) || 'Överskott') : (t('deficit' as any) || 'Underskott')}
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1.5 mb-1">
            <span className={`text-4xl sm:text-5xl leading-none font-semibold font-amount tabular-nums tracking-tight ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isPositive ? '+' : ''}{result.toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
            </span>
            <span className="text-lg sm:text-xl font-normal text-[#9CA6BC]">
              {config.currency}
            </span>
          </div>
          <span className="text-xs text-[#9CA6BC]">
            {t('result' as any) || 'Resultat'}
          </span>
        </div>

        {/* 3-column Grid for Past Period: Fixed, Income, Savings */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
            <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
              {t('fixed' as any) || 'Fasta utgifter'}
            </span>
            <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-center truncate w-full text-white">
              −{formatAmount(Math.round(stats.totalFixedExpenses || stats.totalFixed || 0), config.language)} <span className="font-sans text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
            </span>
          </div>

          <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
            <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
              {t('income' as any) || 'Inkomster'}
            </span>
            <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-emerald-400 text-center truncate w-full">
              +{formatAmount(Math.round(stats.totalIncome || 0), config.language)} <span className="font-sans text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
            </span>
          </div>

          <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
            <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
              {t('monthlySavings' as any) || 'Månadssparande'}
            </span>
            <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-white text-center truncate w-full">
              −{formatAmount(Math.round(totalSavings), config.language)} <span className="font-sans text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Primary Hero Metric: Total Remaining */}
      <div className="py-2 text-center relative flex flex-col items-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] mb-1.5 block select-none">
          {t('totalRemaining' as any)}
        </span>
        <div className="flex items-baseline justify-center gap-1.5">
          <span className={`text-3xl sm:text-4xl md:text-5xl leading-none font-semibold font-amount tabular-nums tracking-tight ${
            stats.remainingPeriodCents < 0 ? 'text-rose-400' : 'text-white'
          }`}>
            {Math.round(Math.abs(stats.remainingPeriodCents)).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
          </span>
          <span className="text-lg sm:text-xl font-normal text-[#9CA6BC]">
            {config.currency}
          </span>
        </div>
      </div>

      {/* Complete Financial Overview: 6 Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {/* 1. Spenderat */}
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
          <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
            {t('spent')}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-center truncate w-full text-white">
            −{formatAmount(Math.round(totalSpent), config.language)} <span className="font-sans text-[10px] sm:text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>
        
        {/* 2. Snitt / dag */}
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
          <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
            {t('averagePerDay')}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-white text-center truncate w-full">
            −{daysElapsed > 0 ? formatAmount(Math.round(totalSpent / daysElapsed), config.language) : 0} <span className="font-sans text-[10px] sm:text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>

        {/* 3. Budget / dag */}
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
          <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
            {t('baseDailyBudget')}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-white text-center truncate w-full">
            +{formatAmount(Math.round(stats.baseDailyBudgetCents || 0), config.language)} <span className="font-sans text-[10px] sm:text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>

        {/* 4. Fasta utgifter */}
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
          <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
            {t('fixed' as any) || 'Fasta utgifter'}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-center truncate w-full text-white">
            −{formatAmount(Math.round(stats.totalFixedExpenses || stats.totalFixed || 0), config.language)} <span className="font-sans text-[10px] sm:text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>

        {/* 5. Inkomster */}
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
          <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
            {t('income' as any) || 'Inkomster'}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-emerald-400 text-center truncate w-full">
            +{formatAmount(Math.round(stats.totalIncome || 0), config.language)} <span className="font-sans text-[10px] sm:text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>

        {/* 6. Månadssparande */}
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[66px] rounded-[18px] flex flex-col items-center justify-center space-y-1 bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.025] shadow-none">
          <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#9CA6BC] tracking-tight text-center truncate w-full">
            {t('monthlySavings' as any) || 'Månadssparande'}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-white text-center truncate w-full">
            −{formatAmount(Math.round(totalSavings), config.language)} <span className="font-sans text-[10px] sm:text-[10.5px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="pt-2 pb-1 relative">
        <div className="flex justify-between items-end mb-2 relative z-10">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC]">{t('budgetLeft')}</span>
          <span className={`text-base sm:text-lg font-semibold font-amount tabular-nums ${(stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) < 0.1 ? 'text-rose-400' : 'text-white'}`}>
            {Math.max(0, Math.min(100, Math.round((stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) * 100)))}% 
          </span>
        </div>
        <div className="w-full h-2 bg-white/[0.07] rounded-full overflow-hidden mb-1 relative z-10">
           <div 
             className={`h-full rounded-full transition-all duration-700 ease-out ${(stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) < 0.1 ? 'bg-rose-500' : 'bg-[#8B9CFF]'}`} 
             style={{ width: `${Math.max(0, Math.min(100, (stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) * 100))}%` }}
           />
        </div>
      </div>
    </div>
  );
}
