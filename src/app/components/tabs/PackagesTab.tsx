// Fliken "Paket": onlineköp som väntar på leverans, grupperade per dag, med knapp för "mottaget".
import React from 'react';
import { Package } from '@phosphor-icons/react';
import { useApp } from '../../AppContext';
import { getTransactionTime } from '../../models';
import { ItemLogo } from '../../../components/ItemLogo';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { EmptyClusterArtwork } from '../../../components/ui/VisualArtwork';
import { DateGroupHeader, TxFlagIcons, formatKr, groupTransactionsByDate } from './tabListParts';

export const PackagesTab: React.FC = () => {
  const { displayTransactions, setSelectedTransaction, setIsTxModalOpen, handleTogglePackage } =
    useApp();
  const packageList = displayTransactions.filter((t) => t.isWaitingForPackage);

  return (
    <div className="ui-page">
      {packageList.length === 0 ? (
        <section className="ui-empty-state-page animate-fade-in">
          <EmptyClusterArtwork variant="packages" />
          <p className="ui-empty-title">Inga paket på väg</p>
          <p className="ui-empty-sub">
            Markera ett onlineköp som &quot;Väntar på paket&quot; för att hålla koll tills det har levererats.
          </p>
        </section>
      ) : (
        groupTransactionsByDate(packageList).map(([dateKey, dayItems]) => (
          <section key={`pkg-${dateKey}`} className="ui-section">
            <DateGroupHeader dateKey={dateKey} dayItems={dayItems} />

            <div className="ui-list-card">
              {dayItems.map((tx) => {
                const isIncome = tx.type === 'income';
                const formattedAmt = formatKr(tx.amount);
                return (
                  <div
                    key={tx.id}
                    className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-footnote sm:text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTransaction(tx ?? null);
                        setIsTxModalOpen(true);
                      }}
                      className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                    >
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
                    </button>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className={`ui-row-amount ${isIncome ? 'ui-row-amount-income' : ''}`}>
                          {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                        </span>
                        <span className="ui-row-meta">
                          {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                            ? 'Reserverat'
                            : getTransactionTime(tx)}
                        </span>
                      </div>
                      <button
                        aria-label="Markera som mottaget"
                        type="button"
                        onClick={() => handleTogglePackage(tx.id, false)}
                        title="Markera som mottaget"
                        className="w-8 h-8 rounded-xl bg-caution-solid/10 border border-caution-solid/20 text-caution-solid hover:bg-caution-solid/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <Package size={14} weight="fill" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
