import React from 'react';
import { SunMedium, Sparkles } from 'lucide-react';
import { Config } from '../../types';
import { formatAmount } from '../../utils/format';

interface DailySummaryWidgetProps {
  stats: any;
  config: Config;
  selectedDate: Date;
  onRemove?: () => void;
  isCustomizing?: boolean;
}

export function DailySummaryWidget({
  stats,
  config,
  selectedDate,
  onRemove,
  isCustomizing,
}: DailySummaryWidgetProps) {
  const isEn = config.language === 'en';
  const currency = config.currency || 'kr';

  const isToday = new Date(selectedDate).toDateString() === new Date().toDateString();
  const dailyAvailable = stats?.availableTodayCents ? stats.availableTodayCents / 100 : (stats?.dailyBudget || 0);
  const dailySpend = stats?.spentTodayCents ? stats.spentTodayCents / 100 : 0;

  return (
    <div className="bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-[20px] p-4 shadow-2xs relative group transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <SunMedium size={14} strokeWidth={2.2} />
          </div>
          <h4 className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? (isToday ? "Today's summary" : "Day summary") : (isToday ? "Dagens sammanfattning" : "Dagens status")}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          {isCustomizing && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="px-2 py-0.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition-all cursor-pointer"
            >
              {isEn ? 'Remove' : 'Ta bort'}
            </button>
          ) : (
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
              {isToday ? (isEn ? 'Today' : 'Idag') : selectedDate.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[var(--surface-muted)]/60 rounded-xl p-3">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
            {isEn ? 'Recommended left' : 'Kvar att handla för'}
          </span>
          <p className="text-[17px] sm:text-[18px] font-bold text-[var(--text-primary)] font-amount tabular-nums">
            {formatAmount(dailyAvailable, config.language)} <span className="text-xs font-normal text-[var(--text-secondary)]">{currency}</span>
          </p>
        </div>

        <div className="bg-[var(--surface-muted)]/60 rounded-xl p-3">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
            {isEn ? 'Spent today' : 'Spenderat idag'}
          </span>
          <p className="text-[17px] sm:text-[18px] font-bold text-rose-500 dark:text-rose-400 font-amount tabular-nums">
            {formatAmount(dailySpend, config.language)} <span className="text-xs font-normal text-[var(--text-secondary)]">{currency}</span>
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] px-1">
        <Sparkles size={12} className="text-purple-500 shrink-0" />
        <span>
          {dailyAvailable > 0
            ? (isEn ? 'You are within your daily pace!' : 'Du håller en sund dagsbudget!')
            : (isEn ? 'Keep an eye on upcoming days.' : 'Tänk på att fördela kostnaderna jämnt.')}
        </span>
      </div>
    </div>
  );
}
