// Fliken "Sparade": köp som användaren markerat med ett hjärta, grupperade per dag.
import React from 'react';
import { useApp } from '../../AppContext';
import { getTransactionTime } from '../../../components/HomeTab';
import { ItemLogo } from '../../../components/ItemLogo';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { EmptyClusterArtwork } from '../../../components/ui/VisualArtwork';
import { DateGroupHeader, TxFlagIcons, formatKr, groupTransactionsByDate } from './tabListParts';

export const SavedTab: React.FC = () => {
  const { displayTransactions, setSelectedTransaction, setIsTxModalOpen } = useApp();
  const heartedList = displayTransactions.filter((t) => t.isHearted);

  return (
    <div className="ui-page">
      {heartedList.length === 0 ? (
        <section className="ui-empty-state-page animate-fade-in">
          <EmptyClusterArtwork variant="saved" />
          <p className="ui-empty-title">Inga sparade köp än</p>
          <p className="ui-empty-sub">
            Markera en transaktion med ett hjärta för att enkelt hitta den här.
          </p>
        </section>
      ) : (
        groupTransactionsByDate(heartedList).map(([dateKey, dayItems]) => (
          <section key={`saved-${dateKey}`} className="ui-section">
            <DateGroupHeader dateKey={dateKey} dayItems={dayItems} />

            <div className="ui-list-card">
              {dayItems.map((tx) => {
                const isIncome = tx.type === 'income';
                const formattedAmt = formatKr(tx.amount);
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      setSelectedTransaction(tx ?? null);
                      setIsTxModalOpen(true);
                    }}
                    className="ui-tx-row"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <ItemLogo
                        name={tx.title}
                        category={tx.category}
                        logoUrl={tx.logo}
                        size="md"
                        isRecurring={false}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title">{tx.title}</span>
                        <span className="ui-row-subtitle flex items-center gap-1.5">
                          <CategoryIcon
                            category={tx.category}
                            size={11}
                            className="shrink-0 text-[var(--text-secondary)]"
                          />
                          <span className="truncate">{tx.category}</span>
                          <TxFlagIcons tx={tx} showReceipt />
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`ui-row-amount ${isIncome ? 'ui-row-amount-income' : ''}`}>
                        {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                      </span>
                      <span className="ui-row-meta">
                        {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                          ? 'Reserverat'
                          : getTransactionTime(tx)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
