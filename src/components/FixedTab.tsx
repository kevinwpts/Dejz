import React, { useMemo } from 'react';
import {
  CaretRight,
  Coins,
  Receipt,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod, isDateInPeriod } from '../utils/periodEngine';

interface FixedTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  transactions?: TransactionItem[];
  onSelectIncome: (inc: IncomeItem) => void;
  onSelectFixed: (exp: FixedExpenseItem) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteFixed: (id: string) => void;
}

export const FixedTab: React.FC<FixedTabProps> = ({
  period,
  incomes,
  fixedExpenses,
  totalIncome,
  totalFixedExpenses,
  transactions = [],
  onSelectIncome,
  onSelectFixed,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const enrichedIncomes = useMemo(() => {
    const periodIncomeTxs = (transactions || []).filter(
      (tx) => tx.type === 'income' && isDateInPeriod(tx.date, period)
    );

    return incomes
      .map((inc) => {
        const paydayDateInPeriod = getDueDateInPeriod(inc.payday, period);
        const incNameLower = inc.name.toLowerCase().trim();

        const matchedTx = periodIncomeTxs.find((tx) => {
          const txTitleLower = (tx.title || '').toLowerCase().trim();
          const rawDescLower = (tx.rawDescription || '').toLowerCase();
          return (
            txTitleLower === incNameLower ||
            txTitleLower.includes(incNameLower) ||
            incNameLower.includes(txTitleLower) ||
            (rawDescLower && rawDescLower.includes(incNameLower))
          );
        });

        const isNominallyPaid = isDueDayPaidInPeriod(inc.payday, period);
        const isPaid = Boolean(matchedTx) || isNominallyPaid;
        const displayAmount = matchedTx ? matchedTx.amount : inc.amount;

        return {
          ...inc,
          paydayDateInPeriod,
          isPaid,
          displayAmount,
          matchedTxDate: matchedTx?.date,
        };
      })
      .sort((a, b) => a.paydayDateInPeriod.getTime() - b.paydayDateInPeriod.getTime());
  }, [incomes, transactions, period]);

  const enrichedExpenses = useMemo(() => {
    const periodExpenseTxs = (transactions || []).filter(
      (tx) => tx.type === 'expense' && isDateInPeriod(tx.date, period)
    );

    return fixedExpenses
      .map((exp) => {
        const dueDateInPeriod = getDueDateInPeriod(exp.dueDay, period);
        const expNameLower = exp.name.toLowerCase().trim();

        // Check if an actual transaction exists for this fixed expense in the current period
        const matchedTx = periodExpenseTxs.find((tx) => {
          const txTitleLower = (tx.title || '').toLowerCase().trim();
          const rawDescLower = (tx.rawDescription || '').toLowerCase();
          return (
            txTitleLower === expNameLower ||
            txTitleLower.includes(expNameLower) ||
            expNameLower.includes(txTitleLower) ||
            (rawDescLower && rawDescLower.includes(expNameLower))
          );
        });

        const isNominallyPaid = isDueDayPaidInPeriod(exp.dueDay, period);
        const isPaid = Boolean(matchedTx) || isNominallyPaid;
        const displayAmount = matchedTx ? matchedTx.amount : exp.amount;

        return {
          ...exp,
          dueDateInPeriod,
          isPaid,
          displayAmount,
          matchedTxDate: matchedTx?.date,
        };
      })
      .sort((a, b) => a.dueDateInPeriod.getTime() - b.dueDateInPeriod.getTime());
  }, [fixedExpenses, transactions, period]);

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* ============================================================== */}
      {/* SEKTION 1: FASTA INKOMSTER                                     */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
            Fasta inkomster
          </h2>
          <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatKr(totalIncome)}
          </span>
        </div>

        {enrichedIncomes.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {enrichedIncomes.map((inc) => (
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
                    isRecurring={false}
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {inc.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate mt-0.5">
                      <CategoryIcon category={inc.category} size={11} />
                      <span>{inc.category}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatKr(inc.displayAmount)}
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
      {/* SEKTION 2: FASTA UTGIFTER                                      */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
            Fasta utgifter
          </h2>
          <span className="font-display font-bold text-sm text-[var(--text-primary)] tabular-nums">
            -{formatKr(totalFixedExpenses)}
          </span>
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
                    isRecurring={false}
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {exp.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate mt-0.5">
                      <CategoryIcon category={exp.category} size={11} />
                      <span>{exp.category}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-display font-bold text-[var(--text-primary)] tabular-nums">
                    -{formatKr(exp.displayAmount)}
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
