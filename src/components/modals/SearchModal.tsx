import React, { useState, useMemo } from 'react';
import {
  X,
  MagnifyingGlass,
  Heart,
  Package,
  Paperclip,
  CheckCircle,
} from '@phosphor-icons/react';
import {
  TransactionItem,
  FixedExpenseItem,
  IncomeItem,
  getTransactionTime,
} from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import {
  checkIsRecurringTransaction,
  findMatchingFixedExpense,
  findMatchingIncome,
} from '../../utils/recurring';
import {
  PeriodInfo,
  isDateInPeriod,
  isDueDayPaidInPeriod,
} from '../../utils/periodEngine';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionItem[];
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  period?: PeriodInfo;
  onSelectTransaction: (tx: TransactionItem) => void;
  onSelectFixed: (exp: FixedExpenseItem) => void;
  onSelectIncome: (inc: IncomeItem) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  transactions,
  fixedExpenses,
  incomes,
  period,
  onSelectTransaction,
  onSelectFixed,
  onSelectIncome,
}) => {
  const [query, setQuery] = useState('');

  const formatKr = (amount: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';

  const results = useMemo(() => {
    if (!query.trim()) return { transactions: [], fixed: [], incomes: [] };
    const q = query.toLowerCase().trim();

    const dedupedTx = deduplicateTransactions(transactions)
      .filter((tx) => {
        return (
          (tx.title || '').toLowerCase().includes(q) ||
          (tx.category || '').toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dateCmp = (b.date || '').localeCompare(a.date || '');
        if (dateCmp !== 0) return dateCmp;
        return getTransactionTime(b).localeCompare(getTransactionTime(a));
      });

    const filteredFixed = fixedExpenses.filter((f) => {
      return (
        (f.name || '').toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q)
      );
    });

    const filteredIncomes = incomes.filter((i) => {
      return (
        (i.name || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    });

    return {
      transactions: dedupedTx.slice(0, 30),
      fixed: filteredFixed.slice(0, 15),
      incomes: filteredIncomes.slice(0, 15),
    };
  }, [query, transactions, fixedExpenses, incomes]);

  const groupedTransactionsByDate = useMemo(() => {
    const groups: {
      dateKey: string;
      label: string;
      net: number;
      items: TransactionItem[];
    }[] = [];

    for (const tx of results.transactions) {
      const key = tx.date || 'Okänt datum';
      let group = groups.find((g) => g.dateKey === key);
      if (!group) {
        group = {
          dateKey: key,
          label: formatSwedishDateHeading(key),
          net: 0,
          items: [],
        };
        groups.push(group);
      }
      group.items.push(tx);
      group.net += tx.type === 'income' ? tx.amount : -tx.amount;
    }

    return groups;
  }, [results.transactions]);

  const enrichedIncomes = useMemo(() => {
    const allIncomeTxs = (transactions || []).filter((tx) => tx.type === 'income');
    const periodIncomeTxs = period
      ? allIncomeTxs.filter((tx) => isDateInPeriod(tx.date, period))
      : allIncomeTxs;

    return results.incomes.map((inc) => {
      const isPaidInPeriod = period
        ? periodIncomeTxs.some((tx) => Boolean(findMatchingIncome(tx, [inc]))) ||
          isDueDayPaidInPeriod(inc.payday, period)
        : false;
      return {
        ...inc,
        isPaid: isPaidInPeriod,
      };
    });
  }, [results.incomes, transactions, period]);

  const enrichedFixed = useMemo(() => {
    const allExpenseTxs = (transactions || []).filter((tx) => tx.type !== 'income');
    const periodExpenseTxs = period
      ? allExpenseTxs.filter((tx) => isDateInPeriod(tx.date, period))
      : allExpenseTxs;

    return results.fixed.map((exp) => {
      const isPaidInPeriod = period
        ? periodExpenseTxs.some((tx) => Boolean(findMatchingFixedExpense(tx, [exp]))) ||
          isDueDayPaidInPeriod(exp.dueDay, period)
        : false;
      return {
        ...exp,
        isPaid: isPaidInPeriod,
      };
    });
  }, [results.fixed, transactions, period]);

  if (!isOpen) return null;

  const hasResults =
    results.transactions.length > 0 ||
    results.fixed.length > 0 ||
    results.incomes.length > 0;

  const totalMatchedIncomes = enrichedIncomes.reduce((s, i) => s + i.amount, 0);
  const totalMatchedFixed = enrichedFixed.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
          <MagnifyingGlass size={15} />
        </div>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök köp, utgift eller kategori..."
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results when searching */}
      {!query.trim() ? null : hasResults ? (
        <div className="space-y-4">
          {/* Incomes - Identisk design som i Fasta */}
          {enrichedIncomes.length > 0 && (
            <section className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display font-bold text-xs text-[var(--text-primary)]">
                  Inkomster
                </h2>
                <span className="font-display font-bold text-xs sm:text-[13px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatKr(totalMatchedIncomes)}
                </span>
              </div>

              <div className="space-y-1.5">
                {enrichedIncomes.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => onSelectIncome(inc)}
                    className="w-full p-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-2.5 text-xs sm:text-[13px] text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="inline-flex items-center gap-1 truncate">
                            <CategoryIcon category={inc.category || 'Lön'} size={11} />
                            <span className="truncate">{inc.category || 'Lön'}</span>
                          </span>
                          {inc.isPaid && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 shrink-0">
                                <CheckCircle size={11} weight="fill" />
                                <span>Mottagen</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block">
                        +{formatKr(inc.amount)}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                        Den {inc.payday}:e
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Fixed Expenses - Identisk design som i Fasta */}
          {enrichedFixed.length > 0 && (
            <section className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display font-bold text-xs text-[var(--text-primary)]">
                  Fasta utgifter
                </h2>
                <span className="font-display font-bold text-xs sm:text-[13px] text-[var(--text-primary)] tabular-nums">
                  -{formatKr(totalMatchedFixed)}
                </span>
              </div>

              <div className="space-y-1.5">
                {enrichedFixed.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => onSelectFixed(exp)}
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
                          <span className="inline-flex items-center gap-1 truncate">
                            <CategoryIcon category={exp.category || 'Räkningar'} size={11} />
                            <span className="truncate">{exp.category || 'Räkningar'}</span>
                          </span>
                          {exp.isPaid && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 shrink-0">
                                <CheckCircle size={11} weight="fill" />
                                <span>Betald</span>
                              </span>
                            </>
                          )}
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

          {/* Transactions - Identisk design som under Köp (TransactionsTab) */}
          {groupedTransactionsByDate.length > 0 && (
            <div className="space-y-3.5">
              {groupedTransactionsByDate.map((group) => (
                <section key={group.dateKey} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="font-bold text-[var(--text-secondary)]">
                      {group.label}
                    </span>
                    <span
                      className={`font-display font-semibold tabular-nums ${
                        group.net > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {group.net > 0
                        ? `+${formatKr(group.net)}`
                        : group.net < 0
                        ? `-${formatKr(Math.abs(group.net))}`
                        : formatKr(0)}
                    </span>
                  </div>

                  <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl px-3.5 py-0.5 sm:px-4 sm:py-1 divide-y divide-[var(--border-subtle)]">
                    {group.items.map((tx) => {
                      const isIncome = tx.type === 'income';
                      const recurringStatus = checkIsRecurringTransaction(
                        tx,
                        fixedExpenses,
                        incomes
                      );
                      return (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => onSelectTransaction(tx)}
                          className="w-full py-2.5 flex items-center justify-between gap-2.5 text-xs sm:text-[13px] text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <ItemLogo
                              name={tx.title}
                              category={tx.category}
                              logoUrl={tx.logo}
                              size="md"
                              isRecurring={recurringStatus.isRecurring}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                                <span className="truncate">{tx.title}</span>
                                {tx.isHearted && (
                                  <Heart
                                    size={12}
                                    weight="fill"
                                    className="text-rose-500 shrink-0"
                                  />
                                )}
                                {tx.isWaitingForPackage && (
                                  <Package
                                    size={12}
                                    weight="fill"
                                    className="text-amber-500 shrink-0"
                                  />
                                )}
                                {tx.receiptUrl && (
                                  <Paperclip
                                    size={12}
                                    weight="bold"
                                    className="text-[var(--text-secondary)] shrink-0"
                                  />
                                )}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                                <CategoryIcon category={tx.category} size={11} />
                                <span className="truncate">{tx.category}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-display font-bold tabular-nums block ${
                                isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                              {getTransactionTime(tx)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Inga träffar
          </p>
        </section>
      )}
    </div>
  );
};

