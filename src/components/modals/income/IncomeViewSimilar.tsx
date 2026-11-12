// Inkomstfönstret: lista med banktransaktioner som matchar inkomsten.
import React from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { formatSwedishDateHeading } from '../../../utils/swedishDate';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import type { ModalSubView, NavigateSubView, SlideAnimClass } from './shared';
import { SheetHeader } from '../../ui/SheetHeader';

export interface IncomeViewSimilarProps {
  subView: ModalSubView;
  slideAnimClass: SlideAnimClass;
  navigateSubView: NavigateSubView;
  onClose: () => void;
  similarInfo: SimilarTransactionsSummary;
  formatKr: (val: number) => string;
  onSelectTransaction?: (tx: TransactionItem) => void;
  displayName: string;
}

export const IncomeViewSimilar: React.FC<IncomeViewSimilarProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  onClose,
  similarInfo,
  formatKr,
  onSelectTransaction,
  displayName,
}) => {
  if (subView !== 'similar') return null;
  return (
    <div className={`${slideAnimClass} space-y-5`}>
      <SheetHeader title="Tidigare utbetalningar" onBack={() => navigateSubView('details', 'back')} onClose={onClose} flush />

      <div className="ui-date-header px-1">
        <span className="font-normal text-[var(--text-secondary)]">
          {similarInfo.transactions.length}{' '}
          {similarInfo.transactions.length === 1 ? 'utbetalning' : 'utbetalningar'}
        </span>
        <span className="font-display font-normal text-[var(--text-primary)] tabular-nums">
          Totalt {formatKr(similarInfo.totalAmount)}
        </span>
      </div>

      {similarInfo.transactions.length > 0 ? (
        <div className="ui-sheet-group">
          {similarInfo.transactions.map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => {
                if (onSelectTransaction) {
                  onSelectTransaction(tx);
                }
              }}
              className="ui-row-btn"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ItemLogo
                  name={tx.title}
                  category={tx.category}
                  logoUrl={tx.logo}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <span className="ui-row-title">
                    {tx.title}
                  </span>
                  <span className="ui-row-subtitle tabular-nums">
                    {formatSwedishDateHeading(tx.date)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="ui-row-amount-income">
                    +{formatKr(tx.amount)}
                  </span>
                  <span className="ui-row-meta">
                    {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                      ? 'Reserverat'
                      : getTransactionTime(tx)}
                  </span>
                </div>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="ui-sheet-box text-center text-callout text-[var(--text-secondary)] py-8">
          Inga registrerade banktransaktioner matchar {displayName} ännu.
        </div>
      )}
    </div>
  );
};
