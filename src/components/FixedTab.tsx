import React, { useMemo } from 'react';
import {
  Coins,
  Receipt,
  CheckCircle,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem, AccountItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod, isDateInPeriod } from '../utils/periodEngine';
import { findMatchingFixedExpense, findMatchingIncome } from '../utils/recurring';

interface FixedTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  transactions?: TransactionItem[];
  accounts?: AccountItem[];
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
  accounts = [],
  onSelectIncome,
  onSelectFixed,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const primaryAccountLabel = useMemo(() => {
    if (!accounts || accounts.length === 0) return undefined;
    const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
    return `${checking.bankName} · ${checking.name}`;
  }, [accounts]);

  const enrichedIncomes = useMemo(() => {
    const allIncomeTxs = (transactions || []).filter((tx) => tx.type === 'income');
    const periodIncomeTxs = allIncomeTxs.filter((tx) => isDateInPeriod(tx.date, period));

    return incomes
      .map((inc) => {
        const paydayDateInPeriod = getDueDateInPeriod(inc.payday, period);

        const matchedTx =
          periodIncomeTxs.find((tx) => Boolean(findMatchingIncome(tx, [inc]))) ||
          allIncomeTxs.find((tx) => Boolean(findMatchingIncome(tx, [inc])));

        const isPaidInPeriod =
          periodIncomeTxs.some((tx) => Boolean(findMatchingIncome(tx, [inc]))) ||
          isDueDayPaidInPeriod(inc.payday, period);

        const resolvedAccount =
          inc.bankAccountName || matchedTx?.bankAccountName || primaryAccountLabel;

        return {
          ...inc,
          bankAccountName: resolvedAccount,
          paydayDateInPeriod,
          isPaid: isPaidInPeriod,
          displayAmount: inc.amount,
          matchedTxDate: matchedTx?.date,
        };
      })
      .sort((a, b) => a.paydayDateInPeriod.getTime() - b.paydayDateInPeriod.getTime());
  }, [incomes, transactions, period, primaryAccountLabel]);

  const enrichedExpenses = useMemo(() => {
    const allExpenseTxs = (transactions || []).filter((tx) => tx.type !== 'income');
    const periodExpenseTxs = allExpenseTxs.filter((tx) => isDateInPeriod(tx.date, period));

    return fixedExpenses
      .map((exp) => {
        const dueDateInPeriod = getDueDateInPeriod(exp.dueDay, period);

        const matchedTx =
          periodExpenseTxs.find((tx) => Boolean(findMatchingFixedExpense(tx, [exp]))) ||
          allExpenseTxs.find((tx) => Boolean(findMatchingFixedExpense(tx, [exp])));

        const isPaidInPeriod =
          periodExpenseTxs.some((tx) => Boolean(findMatchingFixedExpense(tx, [exp]))) ||
          isDueDayPaidInPeriod(exp.dueDay, period);

        const resolvedAccount =
          exp.bankAccountName || matchedTx?.bankAccountName || primaryAccountLabel;

        return {
          ...exp,
          bankAccountName: resolvedAccount,
          dueDateInPeriod,
          isPaid: isPaidInPeriod,
          displayAmount: exp.amount,
          matchedTxDate: matchedTx?.date,
        };
      })
      .sort((a, b) => a.dueDateInPeriod.getTime() - b.dueDateInPeriod.getTime());
  }, [fixedExpenses, transactions, period, primaryAccountLabel]);

  const paidExpensesCount = enrichedExpenses.filter((e) => e.isPaid).length;

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* ============================================================== */}
      {/* SEKTION 1: INKOMSTER                                           */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
            Inkomster
          </h2>
          <span className="font-display font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
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
                className="w-full py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3 text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ItemLogo
                    name={inc.name}
                    category={inc.category}
                    logoUrl={inc.logo}
                    size="md"
                    isRecurring={false}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {inc.name}
                    </span>
                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="inline-flex items-center gap-1 truncate">
                        <CategoryIcon category={inc.category || 'Lön'} size={12} />
                        <span className="truncate">{inc.category || 'Lön'}</span>
                      </span>
                      {inc.isPaid && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 shrink-0">
                            <CheckCircle size={12} weight="fill" />
                            <span>Mottagen</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block">
                    +{formatKr(inc.displayAmount)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                    Den {inc.payday}:e
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center border-t border-[var(--border-subtle)]">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-2">
              <Coins size={18} weight="duotone" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Inga inkomster
            </p>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* SEKTION 2: FASTA UTGIFTER                                      */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
            Fasta utgifter
          </h2>
          <span className="font-display font-bold text-sm sm:text-base text-[var(--text-primary)] tabular-nums">
            -{formatKr(totalFixedExpenses)}
          </span>
        </div>

        {enrichedExpenses.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {enrichedExpenses.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => onSelectFixed(exp)}
                className="w-full py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3 text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ItemLogo
                    name={exp.name}
                    category={exp.category}
                    logoUrl={exp.logo}
                    size="md"
                    isRecurring={false}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {exp.name}
                    </span>
                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="inline-flex items-center gap-1 truncate">
                        <CategoryIcon category={exp.category || 'Räkningar'} size={12} />
                        <span className="truncate">{exp.category || 'Räkningar'}</span>
                      </span>
                      {exp.isPaid && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 shrink-0">
                            <CheckCircle size={12} weight="fill" />
                            <span>Betald</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-[var(--text-primary)] tabular-nums block">
                    -{formatKr(exp.displayAmount)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                    Den {exp.dueDay}:e
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center border-t border-[var(--border-subtle)]">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-2">
              <Receipt size={18} weight="duotone" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Inga fasta utgifter
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
