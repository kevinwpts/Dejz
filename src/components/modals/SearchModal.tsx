import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  CaretLeft,
  MagnifyingGlass,
  Heart,
  Package,
  Paperclip,
} from '@phosphor-icons/react';
import { TransactionItem, FixedExpenseItem, IncomeItem, getTransactionTime, compareTransactionsChronologically } from '../../app/models';
import { ItemLogo } from '../ItemLogo';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring/checkRecurring';
import { findMatchingFixedExpense, findMatchingIncome } from '../../utils/recurring/matching';
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
  onClose,
  transactions,
  fixedExpenses,
  incomes,
  period,
  onSelectTransaction,
  onSelectFixed,
  onSelectIncome,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const formatKr = (amount: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';

  const hasBankConnected = useMemo(
    () =>
      transactions.some(
        (tx) => tx.id?.startsWith('bank-') || Boolean(tx.bankAccountName)
      ),
    [transactions]
  );

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const qDigits = q.replace(/\s+/g, '');

    if (!q) {
      return { transactions: [], fixed: [], incomes: [] };
    }

    const matchesAmount = (val: number) => {
      const rounded = Math.round(Number(val) || 0);
      const amtStr = String(rounded);
      const formatted = new Intl.NumberFormat('sv-SE').format(rounded).toLowerCase();
      return (qDigits.length > 0 && amtStr.includes(qDigits)) || formatted.includes(q);
    };

    const dedupedTx = deduplicateTransactions(transactions)
      .filter((tx) => {
        return (
          (tx.title || '').toLowerCase().includes(q) ||
          (tx.category || '').toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q) ||
          matchesAmount(tx.amount)
        );
      })
      .sort(compareTransactionsChronologically);

    const filteredFixed = fixedExpenses.filter((f) => {
      return (
        (f.name || '').toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q) ||
        matchesAmount(f.amount)
      );
    });

    const filteredIncomes = incomes.filter((i) => {
      return (
        (i.name || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q) ||
        matchesAmount(i.amount)
      );
    });

    return {
      transactions: dedupedTx.slice(0, 35),
      fixed: filteredFixed.slice(0, 20),
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
      const matchedInPeriod = periodIncomeTxs.some((tx) =>
        Boolean(findMatchingIncome(tx, [inc]))
      );
      const dueDatePassed = period ? isDueDayPaidInPeriod(inc.payday, period) : false;
      const isPaidInPeriod = period
        ? hasBankConnected
          ? matchedInPeriod
          : matchedInPeriod || dueDatePassed
        : false;
      const isAwaitingBank = Boolean(
        period && hasBankConnected && !matchedInPeriod && dueDatePassed
      );
      return {
        ...inc,
        isPaid: isPaidInPeriod,
        isAwaitingBank,
      };
    });
  }, [results.incomes, transactions, period, hasBankConnected]);

  const enrichedFixed = useMemo(() => {
    const allExpenseTxs = (transactions || []).filter(
      (tx) => tx.type !== 'income' && !tx.isExcluded
    );
    const periodExpenseTxs = period
      ? allExpenseTxs.filter((tx) => isDateInPeriod(tx.date, period))
      : allExpenseTxs;

    return results.fixed.map((exp) => {
      const matchedInPeriod = periodExpenseTxs.some((tx) =>
        Boolean(findMatchingFixedExpense(tx, [exp]))
      );
      const dueDatePassed = period ? isDueDayPaidInPeriod(exp.dueDay, period) : false;
      const isPaidInPeriod = period
        ? hasBankConnected
          ? matchedInPeriod
          : matchedInPeriod || dueDatePassed
        : false;
      const isAwaitingBank = Boolean(
        period && hasBankConnected && !matchedInPeriod && dueDatePassed
      );
      return {
        ...exp,
        isPaid: isPaidInPeriod,
        isAwaitingBank,
      };
    });
  }, [results.fixed, transactions, period, hasBankConnected]);

  const isSearchingOrFiltered = Boolean(query.trim());
  const hasResults =
    results.transactions.length > 0 ||
    results.fixed.length > 0 ||
    results.incomes.length > 0;

  const totalMatchedIncomes = enrichedIncomes.reduce((s, i) => s + i.amount, 0);
  const totalMatchedFixed = enrichedFixed.reduce((s, e) => s + e.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col animate-fade-in">
      {/* Sticky Full-Screen Header */}
      <header className="bg-[var(--bg-color)]/85 backdrop-blur-xl border-b border-[var(--border-subtle)] pt-[calc(var(--safe-top,env(safe-area-inset-top,0px))+0.5rem)] pb-3 shrink-0">
        <div className="max-w-lg mx-auto px-4 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Tillbaka"
              title="Tillbaka"
              className="p-2 -ml-2 text-[var(--text-primary)] hover:opacity-70 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <CaretLeft size={20} />
            </button>

            {/* Search input */}
            <div className="ui-search-box flex-1">
              <MagnifyingGlass size={18} className="text-[var(--text-muted)] shrink-0" />
              <input
                aria-label="Sök"
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök"
                className="ui-search-input"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Rensa sökning"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Results Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] space-y-4">
          {!isSearchingOrFiltered ? (
            <section className="ui-empty-state pt-24">
              <span className="ui-empty-badge" aria-hidden="true">
                <MagnifyingGlass size={28} />
              </span>
              <p className="ui-empty-title">Sök bland allt</p>
              <p className="ui-empty-sub">Butik, kategori, belopp eller anteckning.</p>
            </section>
          ) : hasResults ? (
            <div className="space-y-4">
              {/* Incomes */}
              {enrichedIncomes.length > 0 && (
                <section className="ui-section">
                  <div className="ui-section-header">
                    <h2 className="ui-section-title">
                      Inkomster
                    </h2>
                    <span className="ui-row-amount-income w-auto">
                      +{formatKr(totalMatchedIncomes)}
                    </span>
                  </div>

                  <div className="ui-list-card">
                    {enrichedIncomes.map((inc) => (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectIncome(inc);
                        }}
                        className="ui-tx-row"
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
                            <span className="ui-row-title">
                              {inc.name}
                            </span>
                            <span className="ui-row-subtitle flex items-center gap-1">
                              <span className="truncate">{inc.category || 'Lön'}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="ui-row-amount-income">
                            +{formatKr(inc.amount)}
                          </span>
                          <span className="ui-row-meta">
                            Den {inc.payday}:e
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Fixed Expenses */}
              {enrichedFixed.length > 0 && (
                <section className="ui-section">
                  <div className="ui-section-header">
                    <h2 className="ui-section-title">
                      Fasta utgifter
                    </h2>
                    <span className="ui-row-amount w-auto">
                      −{formatKr(totalMatchedFixed)}
                    </span>
                  </div>

                  <div className="ui-list-card">
                    {enrichedFixed.map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectFixed(exp);
                        }}
                        className="ui-tx-row"
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
                            <span className="ui-row-title">
                              {exp.name}
                            </span>
                            <span className="ui-row-subtitle flex items-center gap-1">
                              <span className="truncate">{exp.category || 'Räkningar'}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="ui-row-amount">
                            −{formatKr(exp.amount)}
                          </span>
                          <span className="ui-row-meta">
                            Den {exp.dueDay}:e
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Transactions - Grupperade per datum */}
              {groupedTransactionsByDate.length > 0 && (
                <div className="space-y-4">
                  {groupedTransactionsByDate.map((group) => (
                    <div key={group.dateKey}>
                      {/* Datumrubrik utanför kortet – samma som i Historik */}
                      <div className="ui-date-header">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {group.label}
                        </span>
                        <span
                          className={`font-display font-normal tabular-nums ${
                            group.net > 0
                              ? 'text-positive'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {group.net > 0
                            ? `+${formatKr(group.net)}`
                            : group.net < 0
                            ? `−${formatKr(Math.abs(group.net))}`
                            : formatKr(0)}
                        </span>
                      </div>

                      <section className="ui-list-card">
                      {group.items.map((tx) => {
                        const isIncome = tx.type === 'income';
                        const recurringStatus = checkIsRecurringTransaction(
                          tx,
                          fixedExpenses,
                          incomes
                        );
                        const statusSub =
                          tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                            ? 'Reserverat'
                            : getTransactionTime(tx);

                        return (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectTransaction(tx);
                            }}
                            className="ui-tx-row"
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
                                <span className="ui-row-title flex items-center gap-1.5">
                                  <span className="truncate">{tx.title}</span>
                                  {tx.isHearted && (
                                    <Heart
                                      size={13}
                                      weight="fill"
                                      className="text-negative-solid shrink-0"
                                    />
                                  )}
                                  {tx.isWaitingForPackage && (
                                    <Package
                                      size={13}
                                      weight="fill"
                                      className="text-caution-solid shrink-0"
                                    />
                                  )}
                                  {tx.receiptUrl && (
                                    <Paperclip
                                      size={13}
                                      className="text-[var(--text-secondary)] shrink-0"
                                    />
                                  )}
                                </span>
                                <span className="ui-row-subtitle flex items-center gap-1">
                                  <span className="truncate">{tx.category}</span>
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={
                                  isIncome ? 'ui-row-amount-income' : 'ui-row-amount'
                                }
                              >
                                {isIncome ? `+${formatKr(tx.amount)}` : `−${formatKr(tx.amount)}`}
                              </span>
                              {statusSub ? (
                                <span className="ui-row-meta">
                                  {statusSub}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                      </section>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <section className="ui-empty-state pt-24">
              <span className="ui-empty-badge" aria-hidden="true">
                <MagnifyingGlass size={28} />
              </span>
              <p className="ui-empty-title">Inga träffar för ”{query.trim()}”</p>
              <p className="ui-empty-sub">Kolla stavningen eller prova ett annat ord.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};


