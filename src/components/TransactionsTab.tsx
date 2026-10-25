import React, { useMemo } from 'react';
import {
  CaretRight,
  Receipt,
} from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { formatSwedishDateHeading } from '../utils/swedishDate';

interface TransactionsTabProps {
  transactions: TransactionItem[];
  totalVariableSpent: number;
  onSelectTransaction: (tx: TransactionItem) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  onSelectTransaction,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const sortedTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return getTransactionTime(b).localeCompare(getTransactionTime(a));
    });
  }, [transactions]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: {
      dateKey: string;
      label: string;
      net: number;
      items: TransactionItem[];
    }[] = [];
    const map = new Map<string, TransactionItem[]>();

    for (const tx of sortedTransactions) {
      const key = tx.date || 'Okänt';
      const arr = map.get(key) || [];
      arr.push(tx);
      map.set(key, arr);
    }

    for (const [dateKey, items] of map.entries()) {
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
  }, [sortedTransactions]);

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* ============================================================== */}
      {/* TRANSAKTIONSLISTA (GRUPPERAD PER DATUM)                        */}
      {/* ============================================================== */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-3">
          {groupedByDate.map((group) => (
            <section
              key={group.dateKey}
              className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-5"
            >
              {/* Date Group Header */}
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

              {/* Rows in group */}
              <div className="divide-y divide-[var(--border-subtle)]">
                {group.items.map((tx) => {
                  const isIncome = tx.type === 'income';
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
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--text-primary)] block truncate">
                            {tx.title}
                          </span>
                          <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
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
        <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center">
          <div className="w-11 h-11 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-3">
            <Receipt size={22} weight="duotone" />
          </div>
          <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
            Inga transaktioner registrerade ännu
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            Synka ditt bankkonto för att se alla transaktioner här.
          </p>
        </section>
      )}
    </div>
  );
};
