import React, { useMemo, useState } from 'react';
import { Receipt, MagnifyingGlass, X, Package, Heart, Paperclip, Users, Plus } from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime, FixedExpenseItem, IncomeItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { SwipeableTxRow } from './ui/SwipeableTxRow';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { formatSwedishDateHeading } from '../utils/swedishDate';
import { checkIsRecurringTransaction } from '../utils/recurring';

interface TransactionsTabProps {
  transactions: TransactionItem[];
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  totalVariableSpent?: number;
  onSelectTransaction: (tx: TransactionItem) => void;
  onAddTransaction?: () => void;
  onDeleteTransaction?: (id: string) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
  period?: any;
  targetPayday?: number;
  weekendHandling?: any;
}

type TxFilterMode = 'all' | 'expense' | 'income' | 'saved' | 'packages' | 'receipts';

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  fixedExpenses = [],
  incomes = [],
  onSelectTransaction,
  onAddTransaction,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
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

  // Sök- och typfiltrering (inklusive belopp)
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      if (filterMode === 'expense' && tx.type === 'income') return false;
      if (filterMode === 'income' && tx.type !== 'income') return false;
      if (filterMode === 'saved' && !tx.isHearted) return false;
      if (filterMode === 'packages' && !tx.isWaitingForPackage) return false;
      if (filterMode === 'receipts' && !tx.receiptUrl) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const qDigits = q.replace(/\s+/g, '');
      const amtStr = String(Math.round(Number(tx.amount) || 0));
      const formattedAmt = new Intl.NumberFormat('sv-SE')
        .format(Math.round(Number(tx.amount) || 0))
        .toLowerCase();
      const titleMatch = (tx.title || '').toLowerCase().includes(q);
      const catMatch = (tx.category || '').toLowerCase().includes(q);
      const noteMatch = (tx.note || '').toLowerCase().includes(q);
      const amountMatch =
        (qDigits.length > 0 && amtStr.includes(qDigits)) || formattedAmt.includes(q);
      return titleMatch || catMatch || noteMatch || amountMatch;
    });
  }, [sortedTransactions, searchQuery, filterMode]);

  const savedCount = useMemo(
    () => sortedTransactions.filter((tx) => tx.isHearted).length,
    [sortedTransactions]
  );
  const packagesCount = useMemo(
    () => sortedTransactions.filter((tx) => tx.isWaitingForPackage).length,
    [sortedTransactions]
  );
  const receiptsCount = useMemo(
    () => sortedTransactions.filter((tx) => Boolean(tx.receiptUrl)).length,
    [sortedTransactions]
  );

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
    <div className="ui-page">
      {/* Sökfält, Nytt köp & Snabbfilter i toppen */}
      <div className="ui-card p-3.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="ui-search-box flex-1 min-w-0">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              <MagnifyingGlass size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök köp, belopp eller kategori..."
              className="ui-search-input"
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

          {onAddTransaction && (
            <button
              type="button"
              onClick={onAddTransaction}
              title="Lägg till manuellt köp eller inkomst"
              className="h-[38px] px-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus size={14} weight="bold" />
              <span>Nytt</span>
            </button>
          )}
        </div>

        {/* Segmented Filter Control */}
        <div className="ui-segmented grid-cols-3">
          {filterTabs.map((tab) => {
            const isActive = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`ui-segmented-tab ${isActive ? 'ui-segmented-tab-active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Snabbfilter för Sparade, Paket & Kvitton direkt i samma vy */}
        {(savedCount > 0 || packagesCount > 0 || receiptsCount > 0 || filterMode === 'saved' || filterMode === 'packages' || filterMode === 'receipts') && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {(savedCount > 0 || filterMode === 'saved') && (
              <button
                type="button"
                onClick={() => setFilterMode(filterMode === 'saved' ? 'all' : 'saved')}
                className={`ui-chip ${filterMode === 'saved' ? 'ui-chip-active' : ''}`}
              >
                <Heart size={13} weight={filterMode === 'saved' ? 'fill' : 'bold'} className={filterMode === 'saved' ? 'text-rose-400' : 'text-rose-500'} />
                <span>Sparade</span>
              </button>
            )}

            {(packagesCount > 0 || filterMode === 'packages') && (
              <button
                type="button"
                onClick={() => setFilterMode(filterMode === 'packages' ? 'all' : 'packages')}
                className={`ui-chip ${filterMode === 'packages' ? 'ui-chip-active' : ''}`}
              >
                <Package size={13} weight={filterMode === 'packages' ? 'fill' : 'bold'} className={filterMode === 'packages' ? 'text-amber-400' : 'text-amber-500'} />
                <span>Paket</span>
              </button>
            )}

            {(receiptsCount > 0 || filterMode === 'receipts') && (
              <button
                type="button"
                onClick={() => setFilterMode(filterMode === 'receipts' ? 'all' : 'receipts')}
                className={`ui-chip ${filterMode === 'receipts' ? 'ui-chip-active' : ''}`}
              >
                <Paperclip size={13} weight="bold" />
                <span>Kvitton</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TRANSAKTIONSLISTA (GRUPPERAD PER DATUM)                        */}
      {/* ============================================================== */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-3.5">
          {groupedByDate.map((group) => (
            <section key={group.dateKey} className="ui-section">
              {/* Datumgrupps-rubrik utanför modulen direkt på bakgrunden */}
              <div className="ui-section-header">
                <span className="ui-section-title">
                  {group.label}
                </span>
                <span
                  className={`ui-section-meta ${
                    group.net > 0
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : ''
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
              <div className="ui-list-card">
                {group.items.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const recurringStatus = checkIsRecurringTransaction(
                    tx,
                    fixedExpenses,
                    incomes
                  );
                  const isSplit =
                    tx.originalAmount !== undefined && tx.originalAmount > tx.amount;

                  return (
                    <SwipeableTxRow
                      key={tx.id}
                      isHearted={tx.isHearted}
                      isWaitingForPackage={tx.isWaitingForPackage}
                      isExcluded={tx.isExcluded}
                      onToggleHeart={
                        onToggleHeart ? () => onToggleHeart(tx.id, !tx.isHearted) : undefined
                      }
                      onTogglePackage={
                        onTogglePackage
                          ? () => onTogglePackage(tx.id, !tx.isWaitingForPackage)
                          : undefined
                      }
                      onToggleExclude={
                        onExcludeTransaction
                          ? () => onExcludeTransaction(tx.id, !tx.isExcluded)
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTransaction(tx)}
                        className="ui-tx-row bg-[var(--surface-color)]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                              {isSplit && (
                                <Users
                                  size={13}
                                  weight="fill"
                                  className="text-emerald-500 shrink-0"
                                  title="Delad utgift"
                                />
                              )}
                            </span>
                            <span className="ui-row-subtitle flex items-center gap-1">
                              <span className="truncate">{tx.category}</span>
                              {isSplit && tx.originalAmount && (
                                <span className="text-[11px] opacity-75 shrink-0">
                                  · av {formatKr(tx.originalAmount)}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={isIncome ? 'ui-row-amount-income' : 'ui-row-amount'}
                          >
                            {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                          </span>
                          {(() => {
                            const realTime = getTransactionTime(tx);
                            const isPending =
                              tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                            const statusSub =
                              realTime && isPending
                                ? `${realTime} · Reserverat`
                                : realTime || (isPending ? 'Reserverat' : '');
                            return statusSub ? (
                              <span className="ui-row-meta">
                                {statusSub}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </button>
                    </SwipeableTxRow>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="ui-empty-state-page animate-fade-in">
          <Receipt size={48} weight="light" className="ui-empty-icon" />
          <p className="ui-empty-title">
            Inga transaktioner hittades
          </p>
        </section>
      )}
    </div>
  );
};

