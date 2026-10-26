import React, { useMemo, useState } from 'react';
import { CaretRight, Receipt, MagnifyingGlass, X } from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime, FixedExpenseItem, IncomeItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { formatSwedishDateHeading } from '../utils/swedishDate';
import { checkIsRecurringTransaction } from '../utils/recurring';

interface TransactionsTabProps {
  transactions: TransactionItem[];
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  totalVariableSpent?: number;
  onSelectTransaction: (tx: TransactionItem) => void;
  onDeleteTransaction?: (id: string) => void;
  // Legacy props from App.tsx if any
  period?: any;
  targetPayday?: number;
  weekendHandling?: any;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  fixedExpenses = [],
  incomes = [],
  onSelectTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  // Sortera alla transaktioner strikt efter köpdatum och köptid
  const sortedTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return getTransactionTime(b).localeCompare(getTransactionTime(a));
    });
  }, [transactions]);

  // Eventuell sökfiltrering
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return sortedTransactions;
    const q = searchQuery.toLowerCase().trim();
    return sortedTransactions.filter((tx) => {
      const titleMatch = (tx.title || '').toLowerCase().includes(q);
      const catMatch = (tx.category || '').toLowerCase().includes(q);
      const noteMatch = (tx.note || '').toLowerCase().includes(q);
      return titleMatch || catMatch || noteMatch;
    });
  }, [sortedTransactions, searchQuery]);

  // Gruppera per datum
  const groupedByDate = useMemo(() => {
    const groups: {
      dateKey: string;
      label: string;
      net: number;
      items: TransactionItem[];
    }[] = [];
    const map = new Map<string, TransactionItem[]>();

    for (const tx of filteredTransactions) {
      const key = tx.date || 'Okänt';
      const arr = map.get(key) || [];
      arr.push(tx);
      map.set(key, arr);
    }

    for (const [dateKey, items] of map.entries()) {
      // Sortera alla transaktioner inom samma datum fallande efter köptid
      items.sort((a, b) => getTransactionTime(b).localeCompare(getTransactionTime(a)));
      const net = items.reduce((acc, item) => {
        const amt = Number(item.amount) || 0;
        return item.type === 'income' ? acc + amt : acc - amt;
      }, 0);
      groups.push({
        dateKey,
        label: formatSwedishDateHeading(dateKey),
        net,
        items,
      });
    }

    return groups;
  }, [filteredTransactions]);

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* Sökfält */}
      {sortedTransactions.length > 8 && (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            <MagnifyingGlass size={15} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök transaktioner..."
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TRANSAKTIONSLISTA (GRUPPERAD PER DATUM)                        */}
      {/* ============================================================== */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-3">
          {groupedByDate.map((group) => (
            <section
              key={group.dateKey}
              className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-xs"
            >
              {/* Datumgrupps-rubrik */}
              <div className="flex items-center justify-between pb-3 mb-1 border-b border-[var(--border-subtle)] text-xs">
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

              {/* Rader i datumgruppen */}
              <div className="divide-y divide-[var(--border-subtle)]">
                {group.items.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const recurringStatus = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => onSelectTransaction(tx)}
                      className="w-full py-3.5 first:pt-2.5 last:pb-0 flex items-center justify-between text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <ItemLogo
                          name={tx.title}
                          category={tx.category}
                          logoUrl={tx.logo}
                          size="md"
                          isRecurring={recurringStatus.isRecurring}
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--text-primary)] block truncate">
                            {tx.title}
                          </span>
                          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 truncate mt-0.5">
                            <CategoryIcon category={tx.category} size={11} />
                            <span>{tx.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span
                            className={`font-display font-bold tabular-nums block ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                            {getTransactionTime(tx)}
                          </span>
                        </div>
                        <CaretRight
                          size={15}
                          className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center animate-fade-in shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-3">
            <Receipt size={22} weight="duotone" />
          </div>
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
            Inga transaktioner registrerade
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            {searchQuery
              ? `Ingen transaktion matchade sökningen "${searchQuery}".`
              : 'Dina transaktioner kommer att visas här så fort du synkar ditt konto.'}
          </p>
        </section>
      )}
    </div>
  );
};
