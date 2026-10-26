import React, { useState, useMemo } from 'react';
import { X, MagnifyingGlass, Heart, Package, Paperclip } from '@phosphor-icons/react';
import { TransactionItem, FixedExpenseItem, IncomeItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionItem[];
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  onSelectTransaction: (tx: TransactionItem) => void;
  onSelectFixed: (exp: FixedExpenseItem) => void;
  onSelectIncome: (inc: IncomeItem) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  transactions,
  fixedExpenses,
  incomes,
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

    const dedupedTx = deduplicateTransactions(transactions).filter((tx) => {
      return (
        (tx.title || '').toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.note || '').toLowerCase().includes(q)
      );
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
      transactions: dedupedTx.slice(0, 15),
      fixed: filteredFixed.slice(0, 10),
      incomes: filteredIncomes.slice(0, 10),
    };
  }, [query, transactions, fixedExpenses, incomes]);

  if (!isOpen) return null;

  const hasResults =
    results.transactions.length > 0 ||
    results.fixed.length > 0 ||
    results.incomes.length > 0;

  return (
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
          <MagnifyingGlass size={16} />
        </div>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök köp, utgift eller kategori..."
          className="w-full pl-10 pr-9 py-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
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
          {/* Transactions */}
          {results.transactions.length > 0 && (
            <div>
              <h4 className="font-display font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Köp ({results.transactions.length})
              </h4>
              <div className="rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-4 sm:p-5 divide-y divide-[var(--border-subtle)]">
                {results.transactions.map((tx) => {
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
                      onClick={() => {
                        onSelectTransaction(tx);
                      }}
                      className="w-full py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemLogo
                          name={tx.title}
                          category={tx.category}
                          logoUrl={tx.logo}
                          size="sm"
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
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0">{formatSwedishDateHeading(tx.date)}</span>
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-display font-bold tabular-nums shrink-0 ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fixed Expenses */}
          {results.fixed.length > 0 && (
            <div>
              <h4 className="font-display font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Fasta utgifter ({results.fixed.length})
              </h4>
              <div className="rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-4 sm:p-5 divide-y divide-[var(--border-subtle)]">
                {results.fixed.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => {
                      onSelectFixed(exp);
                    }}
                    className="w-full py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ItemLogo
                        name={exp.name}
                        category={exp.category}
                        logoUrl={exp.logo}
                        size="sm"
                        isRecurring={false}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--text-primary)] block truncate">
                          {exp.name}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                          <CategoryIcon category={exp.category || 'Räkningar'} size={12} />
                          <span className="truncate">{exp.category || 'Räkningar'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">Den {exp.dueDay}:e</span>
                        </span>
                      </div>
                    </div>
                    <span className="font-display font-bold text-[var(--text-primary)] tabular-nums shrink-0">
                      -{formatKr(exp.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Incomes */}
          {results.incomes.length > 0 && (
            <div>
              <h4 className="font-display font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Inkomster ({results.incomes.length})
              </h4>
              <div className="rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-4 sm:p-5 divide-y divide-[var(--border-subtle)]">
                {results.incomes.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => {
                      onSelectIncome(inc);
                    }}
                    className="w-full py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ItemLogo
                        name={inc.name}
                        category={inc.category}
                        logoUrl={inc.logo}
                        size="sm"
                        isRecurring={false}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--text-primary)] block truncate">
                          {inc.name}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                          <CategoryIcon category={inc.category || 'Lön'} size={12} />
                          <span className="truncate">{inc.category || 'Lön'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">Den {inc.payday}:e</span>
                        </span>
                      </div>
                    </div>
                    <span className="font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                      +{formatKr(inc.amount)}
                    </span>
                  </button>
                ))}
              </div>
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
