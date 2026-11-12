// Inkomstfönstret: lista med banktransaktioner som matchar inkomsten.
import React from 'react';
import { X, CaretRight, CaretLeft } from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime } from '../../HomeTab';
import { ItemLogo } from '../../ItemLogo';
import { formatSwedishDateHeading } from '../../../utils/swedishDate';
import type { SimilarTransactionsSummary } from '../../../utils/recurring';
import type { ModalSubView, NavigateSubView, SlideAnimClass } from './shared';

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
      <div className="ui-sheet-sub-header">
        <button
          type="button"
          onClick={() => navigateSubView('details', 'back')}
          title="Tillbaka"
          aria-label="Tillbaka"
          className="ui-icon-btn"
        >
          <CaretLeft size={15} weight="bold" />
        </button>
        <span className="ui-sheet-title">
          Liknande transaktioner
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn"
        >
          <X size={16} />
        </button>
      </div>

      <div className="ui-date-header px-1">
        <span className="font-medium text-[var(--text-secondary)]">
          {similarInfo.transactions.length}{' '}
          {similarInfo.transactions.length === 1 ? 'händelse' : 'händelser'}
        </span>
        <span className="font-display font-medium text-[var(--text-primary)] tabular-nums">
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
        <div className="ui-sheet-box text-center text-xs text-[var(--text-muted)] py-6">
          Inga registrerade banktransaktioner matchar {displayName} ännu.
        </div>
      )}
    </div>
  );
};
