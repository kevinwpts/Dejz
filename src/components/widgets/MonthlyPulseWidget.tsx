import React from 'react';
import { Activity, ChevronRight, TrendingUp, PiggyBank, Calendar } from 'lucide-react';
import { Config } from '../../types';
import { formatAmount } from '../../utils/format';

interface MonthlyPulseWidgetProps {
  stats: any;
  config: Config;
  onNavigate: (tab: string, section?: string) => void;
  onRemove?: () => void;
  isCustomizing?: boolean;
}

export function MonthlyPulseWidget({
  stats,
  config,
  onNavigate,
  onRemove,
  isCustomizing,
}: MonthlyPulseWidgetProps) {
  const isEn = config.language === 'en';
  const currency = config.currency || 'kr';

  const totalPot = stats?.periodBudgetCents ? stats.periodBudgetCents / 100 : (stats?.disposablePot || 0);
  const totalSpent = stats?.totalSpentInPeriod ? stats.totalSpentInPeriod / 100 : (stats?.periodSpent || 0);
  const remainingPot = stats?.remainingPeriodCents ? stats.remainingPeriodCents / 100 : (stats?.periodRemaining || 0);
  const daysLeft = stats?.daysLeft ?? stats?.remainingDays ?? 0;
  const savingsPot = Number(config.savingsPot) || 0;

  const spentPercentage = totalPot > 0 ? Math.min(100, Math.round((totalSpent / totalPot) * 100)) : 0;

  return (
    <div className="bg-white/[0.035] backdrop-blur-xl border border-white/[0.08] rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.15)] relative group transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 flex items-center justify-center shrink-0">
            <Activity size={14} strokeWidth={1.75} />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
            {isEn ? 'Monthly Pulse' : 'Månadspuls'}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          {isCustomizing && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition-all cursor-pointer"
            >
              {isEn ? 'Remove' : 'Ta bort'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Analysis' : 'Analys'}</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {/* Days Left */}
        <div className="bg-[var(--surface-muted)]/60 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-secondary)]">
            <Calendar size={11} className="opacity-70" />
            <span className="truncate">{isEn ? 'Days left' : 'Dagar kvar'}</span>
          </div>
          <p className="text-[15px] sm:text-[16px] font-bold text-[var(--text-primary)] font-amount tabular-nums mt-1">
            {daysLeft} <span className="text-[10.5px] font-normal text-[var(--text-secondary)]">{isEn ? 'days' : 'dgr'}</span>
          </p>
        </div>

        {/* Total Remaining */}
        <div className="bg-[var(--surface-muted)]/60 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-secondary)]">
            <TrendingUp size={11} className="opacity-70" />
            <span className="truncate">{isEn ? 'Left' : 'Kvar i pott'}</span>
          </div>
          <p className={`text-[15px] sm:text-[16px] font-bold font-amount tabular-nums mt-1 truncate ${remainingPot >= 0 ? 'text-[var(--text-primary)]' : 'text-rose-500'}`}>
            {formatAmount(remainingPot, config.language)} <span className="text-[10.5px] font-normal text-[var(--text-secondary)]">{currency}</span>
          </p>
        </div>

        {/* Savings Pot */}
        <div className="bg-[var(--surface-muted)]/60 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-secondary)]">
            <PiggyBank size={11} className="opacity-70" />
            <span className="truncate">{isEn ? 'Savings pot' : 'Sparpott'}</span>
          </div>
          <p className="text-[15px] sm:text-[16px] font-bold text-emerald-600 dark:text-emerald-400 font-amount tabular-nums mt-1 truncate">
            {formatAmount(savingsPot, config.language)} <span className="text-[10.5px] font-normal text-[var(--text-secondary)]">{currency}</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-secondary)] mb-1">
          <span>{isEn ? 'Period spent' : 'Förbrukad budget'}</span>
          <span className="font-bold tabular-nums text-[var(--text-primary)]">{spentPercentage}%</span>
        </div>
        <div className="w-full h-1.5 bg-[var(--border-color)]/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              spentPercentage > 90 ? 'bg-rose-500' : spentPercentage > 75 ? 'bg-amber-500' : 'bg-sky-500'
            }`}
            style={{ width: `${spentPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
