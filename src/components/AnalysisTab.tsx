import React, { useMemo } from 'react';
import { ChartPieSlice, TrendUp, TrendDown, Wallet, Calendar } from '@phosphor-icons/react';
import { PeriodInfo, isDateInPeriod } from '../utils/periodEngine';
import { TransactionItem, FixedExpenseItem, IncomeItem } from './HomeTab';
import { CategoryIcon } from './CategoryIcon';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { isTransactionManuallyExcluded } from '../utils/appCache';

interface AnalysisTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  period,
  transactions,
  totalIncome,
  totalFixedExpenses,
  totalVariableSpent,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const periodTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.filter((t) => {
      if (t.type === 'income') return false;
      if (t.isExcluded) return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      return isDateInPeriod(t.date, period);
    });
  }, [transactions, period]);

  // Category breakdown for variable spending
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of periodTransactions) {
      const cat = tx.category || 'Övrigt';
      const amt = Number(tx.amount) || 0;
      map.set(cat, (map.get(cat) || 0) + amt);
    }
    const list = Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    return list;
  }, [periodTransactions]);

  const totalSpent = totalFixedExpenses + totalVariableSpent;
  const netSavings = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* Sektion 1: Övergripande Sammanfattning */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <ChartPieSlice size={16} weight="duotone" className="text-[var(--text-secondary)]" />
            <span>Periodens Sammanfattning</span>
          </h2>
          <span className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
            <Calendar size={13} />
            <span>{period.daysRemaining} dagar kvar</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">Inkomster</span>
            <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums block">
              +{formatKr(totalIncome)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">Utgifter totalt</span>
            <span className="font-display font-bold text-sm text-[var(--text-primary)] tabular-nums block">
              -{formatKr(totalSpent)}
            </span>
          </div>
        </div>

        {/* Sparandegrad / Netto */}
        <div className="p-4 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[var(--text-primary)] block mb-0.5">
              Sparande / Netto
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {savingsRate >= 0 ? `${savingsRate}% sparande av inkomst` : 'Överskrider inkomst'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-display font-bold text-sm tabular-nums">
            {netSavings >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendUp size={16} weight="bold" />
                +{formatKr(netSavings)}
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <TrendDown size={16} weight="bold" />
                {formatKr(netSavings)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Sektion 2: Utgifter per Kategori */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Wallet size={16} weight="duotone" className="text-[var(--text-secondary)]" />
            <span>Kategorifördelning (Rörligt)</span>
          </h2>
          <span className="text-xs font-display font-bold text-[var(--text-primary)] tabular-nums">
            -{formatKr(totalVariableSpent)}
          </span>
        </div>

        {categoryBreakdown.length > 0 ? (
          <div className="space-y-3">
            {categoryBreakdown.map((item) => {
              const pct = totalVariableSpent > 0 ? Math.round((item.amount / totalVariableSpent) * 100) : 0;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <CategoryIcon category={item.category} size={13} />
                      <span>{item.category}</span>
                    </span>
                    <div className="flex items-center gap-2 font-display font-bold tabular-nums">
                      <span className="text-[var(--text-primary)]">-{formatKr(item.amount)}</span>
                      <span className="text-[var(--text-muted)] font-normal text-[11px]">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--text-primary)] rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-muted)]">
              Inga rörliga utgifter registrerade i denna period ännu.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
