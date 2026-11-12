// Transaktionslistan grupperad per dag (datumrubrik + dagssumma + svepbara rader), eller tomt läge.
import React from 'react';
import { Receipt, Package, Heart, Paperclip } from '@phosphor-icons/react';
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../../app/models';
import { getTransactionTime } from '../../app/models';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { SwipeableTxRow } from '../ui/SwipeableTxRow';
import { getItemReceipts } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring';
import { TransactionDateGroup, formatKr } from './transactionFilters';

interface TransactionsGroupedListProps {
  groupedByDate: TransactionDateGroup[];
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  onSelectTransaction: (tx: TransactionItem) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
}

export const TransactionsGroupedList: React.FC<TransactionsGroupedListProps> = ({
  groupedByDate,
  fixedExpenses,
  incomes,
  onSelectTransaction,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
}) => {
  if (groupedByDate.length === 0) {
    return (
      <section className="ui-empty-state-page animate-fade-in">
        <Receipt size={48} weight="light" className="ui-empty-icon" />
        <p className="ui-empty-title">
          Inga transaktioner hittades
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {groupedByDate.map((group) => (
        <div key={group.dateKey}>
          {/* Datumrubrik och dagssummering utanför listkortet */}
          <div className="ui-date-header">
            <span className="font-semibold text-[var(--text-primary)]">
              {group.label}
            </span>
            <span
              className={`font-display font-medium tabular-nums ${
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
              const hasReceipts = getItemReceipts(tx).length > 0;
              const isPending = tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
              const statusSub = isPending ? 'Reserverat' : getTransactionTime(tx);

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
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ItemLogo
                        name={tx.title}
                        category={tx.category}
                        logoUrl={tx.logo}
                        size="md"
                        isRecurring={recurringStatus.isRecurring}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title">
                          {tx.title}
                        </span>
                        <span className="ui-row-subtitle">
                          <CategoryIcon
                            category={tx.category}
                            size={11}
                            className="shrink-0"
                          />
                          <span className="truncate">{tx.category}</span>
                          {tx.isHearted && (
                            <Heart
                              size={11}
                              weight="fill"
                              className="text-negative-solid shrink-0 ml-0.5"
                            />
                          )}
                          {tx.isWaitingForPackage && (
                            <Package
                              size={11}
                              weight="fill"
                              className="text-caution-solid shrink-0 ml-0.5"
                            />
                          )}
                          {hasReceipts && (
                            <Paperclip
                              size={11}
                              weight="bold"
                              className="text-[var(--text-secondary)] shrink-0 ml-0.5"
                            />
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={isIncome ? 'ui-row-amount-income' : 'ui-row-amount'}
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
                </SwipeableTxRow>
              );
            })}
          </section>
        </div>
      ))}
    </div>
  );
};
