// Fliken "Kvitton": alla fasta utgifter och köp som har ett bifogat kvitto, med snabbknapp för att öppna kvittot.
import React from 'react';
import { Receipt, FileText, Eye } from '@phosphor-icons/react';
import { useApp } from '../../AppContext';
import { ItemLogo } from '../../../components/ItemLogo';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatSwedishDateHeading, getItemReceipts } from '../../../utils/swedishDate';
import type { ReceiptAttachment } from '../../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../../utils/recurring/checkRecurring';
import { formatKr } from './tabListParts';

/** En rad i kvittolistan: logga, namn, kategori · antal kvitton, belopp och en knapp som öppnar kvittot. */
const ReceiptRow: React.FC<{
  name: string;
  category: string;
  logo?: string;
  isRecurring: boolean;
  amountText: string;
  isIncome?: boolean;
  meta: string;
  receipts: ReceiptAttachment[];
  onOpenItem: () => void;
  onPreview: (r: ReceiptAttachment) => void;
}> = ({ name, category, logo, isRecurring, amountText, isIncome, meta, receipts, onOpenItem, onPreview }) => {
  const first = receipts[0];
  return (
    <div className="ui-tx-row-static">
      <button
        type="button"
        onClick={onOpenItem}
        className="flex items-center gap-3 min-w-0 flex-1 text-left active:opacity-60 transition-opacity cursor-pointer"
      >
        <ItemLogo name={name} category={category} logoUrl={logo} size="md" isRecurring={isRecurring} />
        <div className="min-w-0 flex-1">
          <span className="ui-row-title">{name}</span>
          <span className="ui-row-subtitle">
            <CategoryIcon category={category} size={11} className="shrink-0" />
            <span className="truncate">
              {category}
              {receipts.length > 1 ? ` · ${receipts.length} kvitton` : ''}
            </span>
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className={isIncome ? 'ui-row-amount-income' : 'ui-row-amount'}>{amountText}</span>
          <span className="ui-row-meta">{meta}</span>
        </div>
      </button>
      {first && (
        <button
          aria-label="Öppna kvitto"
          type="button"
          onClick={() => onPreview(first)}
          className="ui-icon-btn"
          title="Öppna kvitto"
        >
          {first.url.startsWith('data:image/') ? <Eye size={16} /> : <FileText size={16} />}
        </button>
      )}
    </div>
  );
};

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

  const fixedWithReceipts = fixedExpenses.filter((f) => getItemReceipts(f).length > 0);
  const txWithReceipts = displayTransactions
    .filter((t) => getItemReceipts(t).length > 0)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (fixedWithReceipts.length === 0 && txWithReceipts.length === 0) {
    return (
      <div className="ui-page">
        <EmptyState
          icon={Receipt}
          title="Inga kvitton än"
          description="Fota eller ladda upp ett kvitto när du lägger in ett köp, så samlas alla här."
        />
      </div>
    );
  }

  return (
    <div className="ui-page">
      {fixedWithReceipts.length > 0 && (
        <section>
          <span className="ui-settings-label">Fasta utgifter</span>
          <div className="ui-list-card">
            {fixedWithReceipts.map((exp) => (
              <ReceiptRow
                key={`receipt-fix-${exp.id}`}
                name={exp.name}
                category={exp.category || 'Räkningar'}
                logo={exp.logo}
                isRecurring
                amountText={`−${formatKr(exp.amount)}`}
                meta="Varje månad"
                receipts={getItemReceipts(exp)}
                onOpenItem={() => {
                  setSelectedFixedExpense(exp ?? null);
                  setIsFixedModalOpen(true);
                }}
                onPreview={(r) => setPreviewReceipt({ url: r.url, name: exp.name || r.name || '' })}
              />
            ))}
          </div>
        </section>
      )}

      {txWithReceipts.length > 0 && (
        <section>
          {fixedWithReceipts.length > 0 && <span className="ui-settings-label">Köp</span>}
          <div className="ui-list-card">
            {txWithReceipts.map((tx) => {
              const isIncome = tx.type === 'income';
              const amt = formatKr(tx.amount);
              return (
                <ReceiptRow
                  key={`receipt-tx-${tx.id}`}
                  name={tx.title}
                  category={tx.category}
                  logo={tx.logo}
                  isRecurring={checkIsRecurringTransaction(tx, fixedExpenses, incomes).isRecurring}
                  amountText={isIncome ? `+${amt}` : `−${amt}`}
                  isIncome={isIncome}
                  meta={
                    tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                      ? 'Reserverat'
                      : formatSwedishDateHeading(tx.date)
                  }
                  receipts={getItemReceipts(tx)}
                  onOpenItem={() => {
                    setSelectedTransaction(tx ?? null);
                    setIsTxModalOpen(true);
                  }}
                  onPreview={(r) => setPreviewReceipt({ url: r.url, name: tx.title || r.name || '' })}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
