import React, { useState, useMemo } from 'react';
import { X, MagnifyingGlass, CaretRight } from '@phosphor-icons/react';
import { TransactionItem, FixedExpenseItem, IncomeItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { formatSwedishDateHeading } from '../../utils/swedishDate';

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
  onClose,
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
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in pt-16 sm:pt-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg my-auto bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl p-6 border border-[var(--border-subtle)] shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-4">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            Sök i Dejz
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-5">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            <MagnifyingGlass size={16} />
          </div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök på butik, kategori, transaktion..."
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results */}
        {!query.trim() ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-2.5">
              <MagnifyingGlass size={20} weight="duotone" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Skriv för att söka bland transaktioner, fasta utgifter och inkomster.
            </p>
          </div>
        ) : hasResults ? (
          <div className="space-y-5">
            {/* Transactions */}
            {results.transactions.length > 0 && (
              <div>
                <h4 className="font-display font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                  Transaktioner ({results.transactions.length})
                </h4>
                <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                  {results.transactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectTransaction(tx);
                        }}
                        className="w-full py-3 px-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <ItemLogo
                            name={tx.title}
                            category={tx.category}
                            logoUrl={tx.logo}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-[var(--text-primary)] block truncate">
                              {tx.title}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                              <span>{formatSwedishDateHeading(tx.date)}</span>
                              <span>·</span>
                              <span>{tx.category}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-display font-bold text-xs tabular-nums ${
                              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                          </span>
                          <CaretRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fixed Expenses */}
            {results.fixed.length > 0 && (
              <div>
                <h4 className="font-display font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                  Fasta utgifter ({results.fixed.length})
                </h4>
                <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                  {results.fixed.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectFixed(exp);
                      }}
                      className="w-full py-3 px-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <ItemLogo
                          name={exp.name}
                          category={exp.category}
                          logoUrl={exp.logo}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-[var(--text-primary)] block truncate">
                            {exp.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                            <span>Dragningsdag den {exp.dueDay}:e</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display font-bold text-xs text-[var(--text-primary)] tabular-nums">
                          -{formatKr(exp.amount)}
                        </span>
                        <CaretRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Incomes */}
            {results.incomes.length > 0 && (
              <div>
                <h4 className="font-display font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                  Inkomster ({results.incomes.length})
                </h4>
                <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                  {results.incomes.map((inc) => (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectIncome(inc);
                      }}
                      className="w-full py-3 px-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <ItemLogo
                          name={inc.name}
                          category={inc.category}
                          logoUrl={inc.logo}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-[var(--text-primary)] block truncate">
                            {inc.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                            <span>Utbetalningsdag den {inc.payday}:e</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +{formatKr(inc.amount)}
                        </span>
                        <CaretRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Inga träffar på &quot;{query}&quot;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
