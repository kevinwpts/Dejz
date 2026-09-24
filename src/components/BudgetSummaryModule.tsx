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
  if (!stats) return null;
  const filteredExpenses = useMemo(() => {
    if (!transactions) return [];
    return transactions
      .filter(e => {
        return e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime() + 86399999;
      });
  }, [transactions, stats.periodStart, stats.periodEnd]);

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
        const isPaid = fe.paidInPeriods?.[stats.periodId];
        if (isPaid || (!isPaid && fe.deductionDay < new Date().getDate())) {
          fixedSum += fe.amount;
        }
      });
    }

    return { totalFixed: fixedSum, totalSpentInPeriod: spentSum };
  }, [filteredExpenses, fixedExpenses, stats.periodId]);

  const totalSpent = totalSpentInPeriod + totalFixed;

  const daysElapsed = useMemo(() => {
    const now = new Date();
    const realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMidnight = new Date(stats.periodStart.getFullYear(), stats.periodStart.getMonth(), stats.periodStart.getDate()).getTime();
    const endMidnight = new Date(stats.periodEnd.getFullYear(), stats.periodEnd.getMonth(), stats.periodEnd.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (realToday.getTime() > endMidnight) return Math.round((endMidnight - startMidnight) / oneDay) + 1;
    if (realToday.getTime() < startMidnight) return 0;
    return Math.round((realToday.getTime() - startMidnight) / oneDay);
  }, [stats.periodStart, stats.periodEnd]);

  const disposablePot = stats.disposablePot;

  if (stats.isPastPeriod) {
    const result = Math.round(stats.remainingPeriodCents);
    const isPositive = result >= 0;

    return (
      <div className="space-y-4">
        {/* Period Closing Hero */}
        <div className="p-7 sm:p-8 rounded-[28px] overflow-hidden border border-[var(--border-color)] shadow-sm flex flex-col items-center text-center bg-[var(--surface-color)] relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold font-exo text-[var(--text-secondary)] opacity-80 uppercase tracking-wider">
              {t('periodClosing' as any) || 'Periodavslut'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight ${
              isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {isPositive ? (t('surplus' as any) || 'Överskott') : (t('deficit' as any) || 'Underskott')}
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1.5 mb-1">
            <span className={`text-4xl sm:text-5xl leading-none font-bold font-amount tabular-nums tracking-tight ${
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {isPositive ? '+' : ''}{result.toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
            </span>
            <span className="text-xl sm:text-2xl font-light opacity-60 text-[var(--text-secondary)]">
              {config.currency}
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] opacity-60">
            {t('result' as any) || 'Resultat'}
          </span>
        </div>

        {/* 3-column Grid for Past Period */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)]">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">
              {t('totalSpent' as any) || 'Spenderat'}
            </span>
            <span className="text-[14px] sm:text-[16px] font-bold font-amount tabular-nums text-center truncate w-full text-[var(--text-primary)]">
              -{formatAmount(Math.round(totalSpent), config.language)} <span className="font-sans text-[11px] sm:text-xs font-medium opacity-85">{config.currency || 'kr'}</span>
            </span>
          </div>

          <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)]">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">
              {t('income' as any) || 'Inkomst'}
            </span>
            <span className="text-[14px] sm:text-[16px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">
              +{formatAmount(Math.round(stats.totalIncome || 0), config.language)} <span className="font-sans text-[11px] sm:text-xs font-medium opacity-85">{config.currency || 'kr'}</span>
            </span>
          </div>

          <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)]">
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">
              {t('fixed' as any) || 'Fasta kostnader'}
            </span>
            <span className="text-[14px] sm:text-[16px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">
              -{formatAmount(Math.round(totalFixed || stats.totalFixedExpenses || 0), config.language)} <span className="font-sans text-[11px] sm:text-xs font-medium opacity-85">{config.currency || 'kr'}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Hero Metric: Total Remaining */}
      <div className="p-6 sm:p-7 rounded-[28px] overflow-hidden border border-[var(--border-color)] shadow-sm flex flex-col items-center text-center bg-[var(--surface-color)] relative group">
        <span className="text-xs font-semibold font-exo text-[var(--text-secondary)] opacity-85 mb-2.5 block">
          {t('totalRemaining' as any)}
        </span>
        <div className="flex items-baseline justify-center gap-1.5">
          <span className={`text-3xl sm:text-4xl md:text-5xl leading-none font-bold font-amount tabular-nums tracking-tight ${stats.remainingPeriodCents < 0 ? 'text-danger' : 'text-[var(--text-primary)]'}`}>
            {Math.round(Math.abs(stats.remainingPeriodCents)).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
          </span>
          <span className="text-lg sm:text-xl font-light opacity-60 text-[var(--text-secondary)]">
            {config.currency}
          </span>
        </div>
      </div>

      {/* Secondary Metrics: 3-column Grid (Compact, Color-themed & Coherent) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)]">
          <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">
            {t('spent')}
          </span>
          <span className="text-[14px] sm:text-[16px] font-bold font-amount tabular-nums text-center truncate w-full text-[var(--text-primary)]">
            -{formatAmount(Math.round(totalSpent), config.language)} <span className="font-sans text-[11px] sm:text-xs font-medium opacity-85">{config.currency || 'kr'}</span>
          </span>
        </div>
        
        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)]">
          <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">
            {t('averagePerDay')}
          </span>
          <span className="text-[14px] sm:text-[16px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">
            -{daysElapsed > 0 ? formatAmount(Math.round(totalSpent / daysElapsed), config.language) : 0} <span className="font-sans text-[11px] sm:text-xs font-medium opacity-85">{config.currency || 'kr'}</span>
          </span>
        </div>

        <div className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)]">
          <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">
            {t('baseDailyBudget')}
          </span>
          <span className="text-[14px] sm:text-[16px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">
            +{formatAmount(Math.round(stats.baseDailyBudgetCents || 0), config.language)} <span className="font-sans text-[11px] sm:text-xs font-medium opacity-85">{config.currency || 'kr'}</span>
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 rounded-[16px] border border-[var(--border-color)] bg-[var(--surface-color)] relative overflow-hidden shadow-xs">
        <div className="flex justify-between items-end mb-3.5 relative z-10">
          <p className="text-xs font-semibold text-[var(--text-secondary)] opacity-60">{t('budgetLeft')}</p>
          <p className={`text-xl font-bold tracking-tight leading-none ${(stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) < 0.1 ? 'text-danger' : 'text-[var(--text-primary)]'}`}>
            {Math.max(0, Math.min(100, Math.round((stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) * 100)))}% 
          </p>
        </div>
        <div className="w-full h-2.5 bg-[var(--surface-muted)] rounded-full overflow-hidden mb-1 relative z-10">
           <div 
             className={`h-full rounded-full transition-all duration-1000 ease-out ${(stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) < 0.1 ? 'bg-danger' : 'bg-[var(--accent-color)]'}`} 
             style={{ width: `${Math.max(0, Math.min(100, (stats.remainingPeriodCents / Math.max(1, disposablePot + (stats.totalExtraIncomeUpToToday || 0))) * 100))}%` }}
           />
        </div>
      </div>
    </div>
  );
}
