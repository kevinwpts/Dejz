import React from 'react';
import { PiggyBank, ChevronRight, Plus } from 'lucide-react';
import { Config } from '../../types';
import { formatAmount } from '../../utils/format';

interface SavingsGoalsWidgetProps {
  config: Config;
  onNavigate: (tab: string, section?: string) => void;
  onRemove?: () => void;
  isCustomizing?: boolean;
}

export function SavingsGoalsWidget({
  config,
  onNavigate,
  onRemove,
  isCustomizing,
}: SavingsGoalsWidgetProps) {
  const isEn = config?.language === 'en';
  const currency = config?.currency || 'kr';
  const goals = (config?.savingsGoals || []).filter((g) => !g.isCompleted).slice(0, 2);

  return (
    <div className="bg-white/[0.025] backdrop-blur-lg border border-white/[0.05] rounded-[24px] p-5 shadow-none relative group transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 flex items-center justify-center shrink-0">
            <PiggyBank size={14} strokeWidth={1.75} />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
            {isEn ? 'Savings Goals' : 'Sparmål'}
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
              onClick={() => onNavigate('budget', 'savings-goals')}
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'View all' : 'Visa alla'}</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Goals List or Empty state */}
      {goals.length > 0 ? (
        <div className="space-y-2.5">
          {goals.map((goal) => {
            const current = Number(goal.currentAmount) || 0;
            const target = Number(goal.targetAmount) || 1;
            const progress = Math.min(100, Math.round((current / target) * 100));

            return (
              <div
                key={goal.id}
                onClick={() => onNavigate('budget', 'savings-goals')}
                className="bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)]/80 p-3 rounded-xl border border-[var(--border-color)]/60 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px]">{goal.icon || '🎯'}</span>
                    <span className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                      {goal.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                    {progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[var(--border-color)]/40 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>{formatAmount(current, config.language)} {currency}</span>
                  <span>{isEn ? 'of' : 'av'} {formatAmount(target, config.language)} {currency}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate('budget', 'savings-goals')}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)]/50 bg-[var(--surface-muted)]/30 hover:bg-[var(--surface-muted)]/60 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <Plus size={14} className="text-emerald-500" />
          <span>{isEn ? 'Create your first savings goal' : 'Skapa ditt första sparmål'}</span>
        </button>
      )}
    </div>
  );
}
