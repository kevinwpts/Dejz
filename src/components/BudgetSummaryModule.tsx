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

  const daysRemaining = useMemo(() => {
    if (!stats) return 1;
    const now = new Date();
    const realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endMidnight = new Date(stats.periodEnd.getFullYear(), stats.periodEnd.getMonth(), stats.periodEnd.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const diff = Math.ceil((endMidnight - realToday.getTime()) / oneDay) + 1;
    return Math.max(1, diff);
  }, [stats?.periodEnd]);

  const dailyAvg = daysElapsed > 0 ? Math.round(totalSpent / daysElapsed) : 0;
  const remainingPerDay = Math.round(stats.remainingPeriodCents / daysRemaining);

  if (!stats) return null;

  const disposablePot = stats.disposablePot;

  if (stats.isPastPeriod) {
    const result = Math.round(stats.remainingPeriodCents);
    const isPositive = result >= 0;

    return (
      <div className="space-y-4 font-sans">
        {/* Period Closing Hero */}
        <div className="py-2 text-left relative">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] select-none">
              {t('periodClosing' as any) || 'Periodavslut'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium tracking-tight ${
              isPositive 
                ? 'bg-emerald-500/[0.14] text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/[0.14] text-rose-400 border border-rose-500/20'
            }`}>
              {isPositive ? (t('surplus' as any) || 'Överskott') : (t('deficit' as any) || 'Underskott')}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-4xl sm:text-5xl leading-none font-semibold font-amount tabular-nums tracking-tight ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isPositive ? '+' : ''}{result.toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
            </span>
            <span className="text-lg sm:text-xl font-normal text-[#9CA6BC]">
              {config.currency}
            </span>
          </div>
        </div>

        {/* 3-column Airy Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.035] backdrop-blur-[18px] rounded-[20px] border border-white/[0.025]">
          <div className="text-center">
            <span className="text-[11px] font-medium text-[#9CA6BC] block mb-0.5">
              {t('fixed' as any) || 'Fasta'}
            </span>
            <span className="text-xs sm:text-sm font-semibold font-amount tabular-nums text-white">
              −{formatAmount(Math.round(stats.totalFixedExpenses || stats.totalFixed || 0), config.language)} {config.currency || 'kr'}
            </span>
          </div>

          <div className="text-center border-x border-white/[0.04]">
            <span className="text-[11px] font-medium text-[#9CA6BC] block mb-0.5">
              {t('income' as any) || 'Inkomster'}
            </span>
            <span className="text-xs sm:text-sm font-semibold font-amount tabular-nums text-emerald-400">
              +{formatAmount(Math.round(stats.totalIncome || 0), config.language)} {config.currency || 'kr'}
            </span>
          </div>

          <div className="text-center">
            <span className="text-[11px] font-medium text-[#9CA6BC] block mb-0.5">
              {t('monthlySavings' as any) || 'Sparande'}
            </span>
            <span className="text-xs sm:text-sm font-semibold font-amount tabular-nums text-white">
              −{formatAmount(Math.round(totalSavings), config.language)} {config.currency || 'kr'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const budgetLeftPct = Math.max(0, Math.min(100, Math.round((stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) * 100)));

  return (
    <div className="space-y-5 font-sans">
      {/* Primary Hero Metric: Total Kvar i perioden directly on background */}
      <div className="py-2 text-left space-y-1.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] block select-none">
          {t('totalRemaining' as any) || 'Total kvar i perioden'}
        </span>
        <div className="flex items-baseline gap-2">
          <span className={`text-[44px] sm:text-[54px] leading-none font-semibold font-amount tabular-nums tracking-tight ${
            stats.remainingPeriodCents < 0 ? 'text-rose-400' : 'text-white'
          }`}>
            {Math.round(Math.abs(stats.remainingPeriodCents)).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
          </span>
          <span className="text-[19px] sm:text-[21px] font-normal text-[#9CA6BC]">
            {config.currency}
          </span>
        </div>
      </div>

      {/* Secondary Airy Summary Row */}
      <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-white/[0.035] backdrop-blur-[18px] rounded-[20px] border border-white/[0.025]">
        <div className="text-left">
          <span className="text-[10.5px] sm:text-[11px] font-normal text-[#9CA6BC] block mb-0.5 truncate">
            {t('spent') || 'Spenderat'}
          </span>
          <span className="text-xs sm:text-[13.5px] font-semibold font-amount tabular-nums text-white">
            −{formatAmount(Math.round(totalSpent), config.language)} <span className="text-[10px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>

        <div className="text-left border-l border-white/[0.04] pl-2 sm:pl-3">
          <span className="text-[10.5px] sm:text-[11px] font-normal text-[#9CA6BC] block mb-0.5 truncate">
            {t('averagePerDay') || 'Snitt/dag'}
          </span>
          <span className="text-xs sm:text-[13.5px] font-semibold font-amount tabular-nums text-white">
            −{formatAmount(dailyAvg, config.language)} <span className="text-[10px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>

        <div className="text-left border-l border-white/[0.04] pl-2 sm:pl-3">
          <span className="text-[10.5px] sm:text-[11px] font-normal text-[#9CA6BC] block mb-0.5 truncate">
            Kvar per dag
          </span>
          <span className={`text-xs sm:text-[13.5px] font-semibold font-amount tabular-nums ${remainingPerDay < 0 ? 'text-rose-400' : 'text-white'}`}>
            {formatAmount(remainingPerDay, config.language)} <span className="text-[10px] font-normal text-[#9CA6BC]">{config.currency || 'kr'}</span>
          </span>
        </div>
      </div>

      {/* Integrated Clean Progress Bar */}
      <div className="pt-1 pb-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC]">{t('budgetLeft')}</span>
          <span className={`text-xs sm:text-sm font-semibold font-amount tabular-nums ${budgetLeftPct < 10 ? 'text-rose-400' : 'text-white'}`}>
            {budgetLeftPct}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${budgetLeftPct < 10 ? 'bg-rose-500' : 'bg-[#8B9CFF]'}`} 
            style={{ width: `${budgetLeftPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
