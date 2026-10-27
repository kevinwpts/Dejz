import React, { useMemo } from 'react';
import {
  Bell,
  CalendarBlank,
  Package,
  TrendUp,
  Sparkle,
} from '@phosphor-icons/react';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod, isDateInPeriod } from '../../utils/periodEngine';
import { FixedExpenseItem, IncomeItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { findMatchingFixedExpense } from '../../utils/recurring';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: PeriodInfo;
  kvarAttSpendera?: number;
  dagsbudget?: number;
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  transactions?: TransactionItem[];
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  period,
  kvarAttSpendera = 0,
  dagsbudget = 0,
  fixedExpenses = [],
  transactions = [],
  onSelectFixed,
  onSelectTransaction,
}) => {
  const formatKr = (amount: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';

  const upcomingUnpaidFixed = useMemo(() => {
    if (!period || fixedExpenses.length === 0) return [];
    const allExpenseTxs = transactions.filter((tx) => tx.type !== 'income');
    const periodExpenseTxs = allExpenseTxs.filter((tx) => isDateInPeriod(tx.date, period));

    return fixedExpenses
      .map((exp) => {
        const dueDate = getDueDateInPeriod(exp.dueDay, period);
        const isPaid =
          periodExpenseTxs.some((tx) => Boolean(findMatchingFixedExpense(tx, [exp]))) ||
          isDueDayPaidInPeriod(exp.dueDay, period);
        return { exp, dueDate, isPaid };
      })
      .filter((item) => !item.isPaid)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [fixedExpenses, transactions, period]);

  const priceIncreasedFixed = useMemo(() => {
    if (fixedExpenses.length === 0 || transactions.length === 0) return [];
    const expenseTxs = transactions
      .filter((tx) => tx.type !== 'income' && !tx.isExcluded)
      .sort((a, b) => b.date.localeCompare(a.date));

    const results: { exp: FixedExpenseItem; diff: number; prevAmt: number; latestAmt: number }[] = [];

    for (const exp of fixedExpenses) {
      const matched = expenseTxs.filter((tx) => Boolean(findMatchingFixedExpense(tx, [exp])));
      if (matched.length >= 2) {
        const latestAmt = Math.round(Number(matched[0].amount) || 0);
        const prevAmt = Math.round(Number(matched[1].amount) || 0);
        if (latestAmt - prevAmt >= 5) {
          results.push({
            exp,
            diff: latestAmt - prevAmt,
            prevAmt,
            latestAmt,
          });
        }
      }
    }
    return results;
  }, [fixedExpenses, transactions]);

  const waitingPackages = useMemo(() => {
    return transactions
      .filter((tx) => Boolean(tx.isWaitingForPackage))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  if (!isOpen) return null;

  const hasAnyNotifications =
    upcomingUnpaidFixed.length > 0 ||
    priceIncreasedFixed.length > 0 ||
    waitingPackages.length > 0 ||
    Boolean(period);

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* Period & Dagsbudget Status */}
      {period && (
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-xs text-[var(--text-muted)]">
              Status för löneperioden
            </h2>
            <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
              {period.daysRemaining} {period.daysRemaining === 1 ? 'dag' : 'dagar'} till lön
            </span>
          </div>

          <div className="p-3.5 rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkle size={16} weight="fill" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] block truncate">
                  {formatKr(dagsbudget)} / dag kvar
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
                  Totalt {formatKr(kvarAttSpendera)} kvar att spendera
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Prishöjningsvakt */}
      {priceIncreasedFixed.length > 0 && (
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <TrendUp size={13} className="text-amber-500" />
              <span>Upptäckta prishöjningar ({priceIncreasedFixed.length})</span>
            </h2>
          </div>

          <div className="space-y-1.5">
            {priceIncreasedFixed.map(({ exp, diff, prevAmt, latestAmt }) => (
              <button
                key={`price-inc-${exp.id}`}
                type="button"
                onClick={() => onSelectFixed && onSelectFixed(exp)}
                className="w-full p-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-2.5 text-xs sm:text-[13px] text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block truncate mt-0.5 tabular-nums">
                      Höjd från {formatKr(prevAmt)} till {formatKr(latestAmt)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-amber-600 dark:text-amber-400 tabular-nums block">
                    +{formatKr(diff)}/mån
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                    Den {exp.dueDay}:e
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Kommande obetalda fasta utgifter */}
      {upcomingUnpaidFixed.length > 0 && (
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <CalendarBlank size={13} />
              <span>Kommande fasta utgifter ({upcomingUnpaidFixed.length})</span>
            </h2>
            <span className="font-display font-bold text-xs text-[var(--text-primary)] tabular-nums">
              -{formatKr(upcomingUnpaidFixed.reduce((acc, i) => acc + i.exp.amount, 0))}
            </span>
          </div>

          <div className="space-y-1.5">
            {upcomingUnpaidFixed.map(({ exp }) => (
              <button
                key={`unpaid-${exp.id}`}
                type="button"
                onClick={() => onSelectFixed && onSelectFixed(exp)}
                className="w-full p-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-2.5 text-xs sm:text-[13px] text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
                      <CategoryIcon category={exp.category || 'Räkningar'} size={11} />
                      <span className="truncate">{exp.category || 'Räkningar'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-[var(--text-primary)] tabular-nums block">
                    -{formatKr(exp.amount)}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                    Den {exp.dueDay}:e
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Paket på väg */}
      {waitingPackages.length > 0 && (
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <Package size={13} className="text-amber-500" weight="fill" />
              <span>Väntar på paket ({waitingPackages.length})</span>
            </h2>
          </div>

          <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl px-3.5 py-0.5 sm:px-4 sm:py-1 divide-y divide-[var(--border-subtle)]">
            {waitingPackages.map((tx) => (
              <button
                key={`pkg-${tx.id}`}
                type="button"
                onClick={() => onSelectTransaction && onSelectTransaction(tx)}
                className="w-full py-2.5 flex items-center justify-between gap-2.5 text-xs sm:text-[13px] text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <ItemLogo
                    name={tx.title}
                    category={tx.category}
                    logoUrl={tx.logo}
                    size="md"
                    isRecurring={false}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                      <span className="truncate">{tx.title}</span>
                      <Package size={12} weight="fill" className="text-amber-500 shrink-0" />
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                      <CategoryIcon category={tx.category} size={11} />
                      <span className="truncate">{tx.category}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-[var(--text-primary)] tabular-nums block">
                    -{formatKr(tx.amount)}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                    {getTransactionTime(tx)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!hasAnyNotifications && (
        <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center">
          <Bell size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            Inga nya notiser
          </p>
        </section>
      )}
    </div>
  );
};
