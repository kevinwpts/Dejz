// Fliken "Kvitton": alla fasta utgifter och köp som har ett bifogat kvitto, med snabbknapp för att öppna kvittot.
import React from 'react';
import { Paperclip, FileText, Eye } from '@phosphor-icons/react';
import { useApp } from '../../AppContext';
import { getTransactionTime } from '../../../components/HomeTab';
import { ItemLogo } from '../../../components/ItemLogo';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { EmptyClusterArtwork } from '../../../components/ui/VisualArtwork';
import { getItemReceipts } from '../../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../../utils/recurring';
import { TxFlagIcons, formatKr } from './tabListParts';

export const ReceiptsTab: React.FC = () => {
  const {
    displayTransactions,
    fixedExpenses,
    incomes,
    setSelectedTransaction,
    setIsTxModalOpen,
    setSelectedFixedExpense,
    setIsFixedModalOpen,
    setPreviewReceipt,
  } = useApp();

  const hasReceipts =
    displayTransactions.some((t) => getItemReceipts(t).length > 0) ||
    fixedExpenses.some((f) => getItemReceipts(f).length > 0);

  return (
    <div className="ui-page">
      {hasReceipts ? (
        <section className="ui-list-card">
          <div className="divide-y divide-[var(--border-subtle)]">
            {fixedExpenses
              .filter((f) => getItemReceipts(f).length > 0)
              .map((exp) => {
                const expReceipts = getItemReceipts(exp);
                const formattedAmt = formatKr(exp.amount);
                return (
                  <div
                    key={`receipt-fix-${exp.id}`}
                    className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-footnote sm:text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFixedExpense(exp ?? null);
                        setIsFixedModalOpen(true);
                      }}
                      className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                    >
                      <ItemLogo
                        name={exp.name}
                        category={exp.category}
                        logoUrl={exp.logo}
                        size="md"
                        isRecurring={true}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title">{exp.name}</span>
                        <span className="ui-row-subtitle flex items-center gap-1.5">
                          <CategoryIcon
                            category={exp.category || 'Räkningar'}
                            size={11}
                            className="shrink-0 text-[var(--text-secondary)]"
                          />
                          <span className="truncate">{exp.category}</span>
                          <Paperclip
                            size={11}
                            weight="bold"
                            className="text-[var(--text-secondary)] shrink-0"
                          />
                          {expReceipts.length > 1 && (
                            <span className="text-micro font-bold text-[var(--text-secondary)]">
                              {expReceipts.length} st
                            </span>
                          )}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="ui-row-amount">−{formattedAmt}</span>
                        <span className="ui-row-meta truncate max-w-[110px]">
                          {expReceipts.length > 1
                            ? `${expReceipts.length} kvitton`
                            : expReceipts[0]?.name || 'Kvitto'}
                        </span>
                      </div>
                      {expReceipts[0] && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewReceipt({
                              url: expReceipts[0].url,
                              name: expReceipts[0].name || exp.name || 'Kvitto',
                            });
                          }}
                          className="ui-icon-btn"
                          title="Öppna kvitto"
                        >
                          {expReceipts[0].url.startsWith('data:image/') ? (
                            <Eye size={14} />
                          ) : (
                            <FileText size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {displayTransactions
              .filter((t) => getItemReceipts(t).length > 0)
              .map((tx) => {
                const txReceipts = getItemReceipts(tx);
                const isIncome = tx.type === 'income';
                const recurring = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
                const formattedAmt = formatKr(tx.amount);
                return (
                  <div
                    key={`receipt-tx-${tx.id}`}
                    className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-footnote sm:text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTransaction(tx ?? null);
                        setIsTxModalOpen(true);
                      }}
                      className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                    >
                      <ItemLogo
                        name={tx.title}
                        category={tx.category}
                        logoUrl={tx.logo}
                        size="md"
                        isRecurring={recurring.isRecurring}
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
                          <TxFlagIcons tx={tx} showReceipt={false} />
                          <Paperclip
                            size={11}
                            weight="bold"
                            className="text-[var(--text-secondary)] shrink-0"
                          />
                          <span className="truncate">
                            ·{' '}
                            {txReceipts.length > 1
                              ? `${txReceipts.length} kvitton`
                              : txReceipts[0]?.name || 'Kvitto'}
                          </span>
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
                      {txReceipts[0] && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewReceipt({
                              url: txReceipts[0].url,
                              name: txReceipts[0].name || tx.title || 'Kvitto',
                            });
                          }}
                          className="ui-icon-btn"
                          title="Öppna kvitto"
                        >
                          {txReceipts[0].url.startsWith('data:image/') ? (
                            <Eye size={14} />
                          ) : (
                            <FileText size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ) : (
        <section className="ui-empty-state-page animate-fade-in">
          <EmptyClusterArtwork variant="receipts" />
          <p className="ui-empty-title">Inga bifogade kvitton än</p>
          <p className="ui-empty-sub">
            Fota eller ladda upp kvitton på dina köp och fasta utgifter så samlas alla här.
          </p>
        </section>
      )}
    </div>
  );
};
