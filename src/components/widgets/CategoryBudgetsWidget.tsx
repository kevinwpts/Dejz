import React from 'react';
import { PieChart, ChevronRight } from 'lucide-react';
import { Config, Transaction } from '../../types';
import { formatAmount } from '../../utils/format';
import { ICON_MAP, isEmojiString } from '../../utils/icons';

interface CategoryBudgetsWidgetProps {
  config: Config;
  allTransactions?: Transaction[];
  stats: any;
  onNavigate: (tab: string, section?: string) => void;
  onRemove?: () => void;
  isCustomizing?: boolean;
}

export function CategoryBudgetsWidget({
  config,
  allTransactions = [],
  stats,
  onNavigate,
  onRemove,
  isCustomizing,
}: CategoryBudgetsWidgetProps) {
  const isEn = config?.language === 'en';
  const currency = config?.currency || 'kr';

  const categoryBudgets = (config?.categories || [])
    .filter((c) => c.budget && c.budget > 0)
    .slice(0, 3)
    .map((cat) => {
      // Calculate spent for this category in current period
      const spent = allTransactions
        .filter((t) => {
          if (!t.timestamp || t.type === 'income') return false;
          if (stats?.periodStart && stats?.periodEnd) {
            const tDate = new Date(t.timestamp);
            if (tDate < stats.periodStart || tDate > stats.periodEnd) return false;
          }
          return t.category?.toLowerCase() === cat.name.toLowerCase();
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const budget = Number(cat.budget) || 1;
      const progress = Math.min(100, Math.round((spent / budget) * 100));

      return {
        ...cat,
        spent,
        budget,
        progress,
        isOver: spent > budget,
      };
    });

  return (
    <div className="bg-white/[0.035] backdrop-blur-xl border border-white/[0.08] rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.15)] relative group transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 flex items-center justify-center shrink-0">
            <PieChart size={14} strokeWidth={1.75} />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
            {isEn ? 'Category budgets' : 'Kategoribudgetar'}
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
              onClick={() => onNavigate('budget', 'category-budgets')}
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'Manage' : 'Hantera'}</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {categoryBudgets.length > 0 ? (
        <div className="space-y-3">
          {categoryBudgets.map((cat) => {
            const Icon = cat.icon ? ICON_MAP[cat.icon] : null;
            return (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat.color ? `${cat.color}20` : 'var(--surface-muted)' }}
                    >
                      {cat.icon && isEmojiString(cat.icon) ? (
                        <span className="text-[11px] leading-none">{cat.icon}</span>
                      ) : Icon ? (
                        <Icon size={12} style={{ color: cat.color || 'var(--text-primary)' }} />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || 'var(--accent-color)' }} />
                      )}
                    </div>
                    <span className="font-semibold text-[var(--text-primary)] truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-amount tabular-nums">
                    <span className={cat.isOver ? 'text-rose-500 font-bold' : 'text-[var(--text-primary)] font-semibold'}>
                      {formatAmount(cat.spent, config.language)}
                    </span>
                    <span className="text-[var(--text-secondary)]/70 text-[11px]">/ {formatAmount(cat.budget, config.language)} {currency}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[var(--border-color)]/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cat.isOver ? 'bg-rose-500' : (cat.color || 'bg-amber-500')
                    }`}
                    style={{
                      width: `${cat.progress}%`,
                      backgroundColor: !cat.isOver && cat.color ? cat.color : undefined,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate('budget', 'category-budgets')}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)]/50 bg-[var(--surface-muted)]/30 hover:bg-[var(--surface-muted)]/60 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <span>{isEn ? 'Set category limits' : 'Sätt gränser för dina kategorier'}</span>
        </button>
      )}
    </div>
  );
}
