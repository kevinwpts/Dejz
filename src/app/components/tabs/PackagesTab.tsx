// Fliken "Paket": onlineköp som väntar på leverans, grupperade per dag, med knapp för "mottaget".
import React from 'react';
import { Package, Check } from '@phosphor-icons/react';
import { useApp } from '../../AppContext';
import { getTransactionTime } from '../../models';
import { ItemLogo } from '../../../components/ItemLogo';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { EmptyState } from '../../../components/ui/EmptyState';
import { DateGroupHeader, formatKr, groupTransactionsByDate } from './tabListParts';

export const PackagesTab: React.FC = () => {
  const { displayTransactions, setSelectedTransaction, setIsTxModalOpen, handleTogglePackage } =
    useApp();
  const packageList = displayTransactions.filter((t) => t.isWaitingForPackage);

  return (
    <div className="ui-page">
      {packageList.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Inga paket på väg"
          description="Beställt något på nätet? Markera köpet med ”Väntar på paket” så ser du här vad som inte har kommit än."
        />
      ) : (
        groupTransactionsByDate(packageList).map(([dateKey, dayItems]) => (
          <section key={`pkg-${dateKey}`} className="ui-section">
            <DateGroupHeader dateKey={dateKey} dayItems={dayItems} />

            <div className="ui-list-card">
              {dayItems.map((tx) => {
                const isIncome = tx.type === 'income';
                const formattedAmt = formatKr(tx.amount);
                return (
                  <div key={tx.id} className="ui-tx-row-static">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTransaction(tx ?? null);
                        setIsTxModalOpen(true);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left active:opacity-60 transition-opacity cursor-pointer"
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
                        <span className="ui-row-subtitle">
                          <CategoryIcon category={tx.category} size={11} className="shrink-0" />
                          <span className="truncate">{tx.category}</span>
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={isIncome ? 'ui-row-amount-income' : 'ui-row-amount'}>
                          {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                        </span>
                        <span className="ui-row-meta">
                          {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                            ? 'Reserverat'
                            : getTransactionTime(tx)}
                        </span>
                      </div>
                    </button>
                    <button
                      aria-label="Markera som mottaget"
                      type="button"
                      onClick={() => handleTogglePackage(tx.id, false)}
                      title="Markera som mottaget"
                      className="ui-icon-btn w-9 h-9"
                    >
                      <Check size={16} weight="bold" />
                    </button>
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
