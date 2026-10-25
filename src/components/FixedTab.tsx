import React, { useMemo } from 'react';
import {
  CaretRight,
  Coins,
  Receipt,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod } from '../utils/periodEngine';

interface FixedTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  onSelectIncome: (inc: IncomeItem) => void;
  onSelectFixed: (exp: FixedExpenseItem) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteFixed: (id: string) => void;
}

export const FixedTab: React.FC<FixedTabProps> = ({
  period,
  incomes,
  fixedExpenses,
  onSelectIncome,
  onSelectFixed,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const enrichedExpenses = useMemo(() => {
    return fixedExpenses
      .map((exp) => {
        const dueDateInPeriod = getDueDateInPeriod(exp.dueDay, period);
        return {
          ...exp,
          dueDateInPeriod,
          isPaid: isDueDayPaidInPeriod(exp.dueDay, period),
        };
      })
      .sort((a, b) => a.dueDateInPeriod.getTime() - b.dueDateInPeriod.getTime());
  }, [fixedExpenses, period]);

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* ============================================================== */}
      {/* SEKTION 1: INKOMSTER                                           */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
            Inkomster
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Lön, bidrag och fasta insättningar
          </p>
        </div>

        {incomes.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {incomes.map((inc) => (
              <button
                key={inc.id}
                type="button"
                onClick={() => onSelectIncome(inc)}
                className="w-full py-3.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <ItemLogo
                    name={inc.name}
                    category={inc.category}
                    logoUrl={inc.logo}
                    size="md"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {inc.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] block truncate mt-0.5">
                      Den {inc.payday}:e · {inc.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatKr(inc.amount)}
                  </span>
                  <CaretRight
                    size={15}
                    className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                  />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center border-t border-[var(--border-subtle)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-2.5">
              <Coins size={20} weight="duotone" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Inga fasta inkomster registrerade ännu.
            </p>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* SEKTION 2: FASTA UTGIFTER & RÄKNINGAR                          */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
            Fasta utgifter & Räkningar
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Hyra, el, lån, försäkring och abonnemang
          </p>
        </div>

        {/* Fixed Expenses List */}
        {enrichedExpenses.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {enrichedExpenses.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => onSelectFixed(exp)}
                className="w-full py-3.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <ItemLogo
                    name={exp.name}
                    category={exp.category}
                    logoUrl={exp.logo}
                    size="md"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {exp.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] block truncate mt-0.5">
                      {exp.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <span className="font-display font-bold text-[var(--text-primary)] tabular-nums block">
                      -{formatKr(exp.amount)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                      Den {exp.dueDay}:e{exp.paymentMethod ? ` · ${exp.paymentMethod}` : ''}
                    </span>
                  </div>
                  <CaretRight
                    size={15}
                    className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                  />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center border-t border-[var(--border-subtle)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-2.5">
              <Receipt size={20} weight="duotone" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Inga fasta utgifter registrerade ännu.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
