import React, { useMemo, useState } from 'react';
import { Receipt, MagnifyingGlass, X, Package, Heart, Paperclip } from '@phosphor-icons/react';
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
  period?: any;
  targetPayday?: number;
  weekendHandling?: any;
}

type TxFilterMode = 'all' | 'expense' | 'income';

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  fixedExpenses = [],
  incomes = [],
  onSelectTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<TxFilterMode>('all');

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

  // Sök- och typfiltrering
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      if (filterMode === 'expense' && tx.type === 'income') return false;
      if (filterMode === 'income' && tx.type !== 'income') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (tx.title || '').toLowerCase().includes(q);
      const catMatch = (tx.category || '').toLowerCase().includes(q);
      const noteMatch = (tx.note || '').toLowerCase().includes(q);
      return titleMatch || catMatch || noteMatch;
    });
  }, [sortedTransactions, searchQuery, filterMode]);

  // Gruppera strikt per datum så varje dag enbart visar dagens händelser
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

    const sortedDateKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    for (const dateKey of sortedDateKeys) {
      const items = map.get(dateKey)!;
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

  const filterTabs: { id: TxFilterMode; label: string }[] = [
    { id: 'all', label: 'Alla' },
    { id: 'expense', label: 'Utgifter' },
    { id: 'income', label: 'Inkomster' },
  ];

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* Sökfält & Snabbfilter i toppen */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-3.5 space-y-2.5">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            <MagnifyingGlass size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök köp eller kategori..."
            className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Segmented Filter Control */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
          {filterTabs.map((tab) => {
            const isActive = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`py-1.5 px-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate ${
                  isActive
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TRANSAKTIONSLISTA (GRUPPERAD PER DATUM)                        */}
      {/* ============================================================== */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <section key={group.dateKey} className="space-y-1.5">
              {/* Datumgrupps-rubrik utanför modulen direkt på bakgrunden */}
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

              {/* Rader i datumgruppen */}
              <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl px-4 py-1 sm:px-5 sm:py-1.5 divide-y divide-[var(--border-subtle)]">
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
                      className="w-full py-3 flex items-center justify-between gap-3 text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
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
                                size={13}
                                weight="fill"
                                className="text-rose-500 shrink-0"
                              />
                            )}
                            {tx.isWaitingForPackage && (
                              <Package
                                size={13}
                                weight="fill"
                                className="text-amber-500 shrink-0"
                              />
                            )}
                            {tx.receiptUrl && (
                              <Paperclip
                                size={13}
                                weight="bold"
                                className="text-[var(--text-secondary)] shrink-0"
                              />
                            )}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                            <CategoryIcon category={tx.category} size={12} />
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
                        <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
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
      ) : (
        <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center animate-fade-in">
          <div className="w-10 h-10 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-2.5">
            <Receipt size={20} weight="duotone" />
          </div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            Inga transaktioner hittades
          </p>
        </section>
      )}
    </div>
  );
};
