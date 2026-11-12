import { ModalSubView } from './shared';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import React from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { formatSwedishDateHeading } from '../../../utils/swedishDate';
import { SheetHeader } from '../../ui/SheetHeader';

export interface TxViewSimilarProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  activeTx: TransactionItem | null;
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  onClose: () => void;
  similarInfo: SimilarTransactionsSummary;
  formatKr: (val: number) => string;
  onSelectTransaction?: (tx: TransactionItem) => void;
}

export const TxViewSimilar: React.FC<TxViewSimilarProps> = ({
  subView,
  activeTx,
  slideAnimClass,
  navigateSubView,
  onClose,
  similarInfo,
  formatKr,
  onSelectTransaction,
}) => (
  <>
    {subView === 'similar' && activeTx && (
      <div className={`${slideAnimClass} space-y-3.5`}>
        <SheetHeader title="Tidigare köp" onBack={() => navigateSubView('details', 'back')} onClose={onClose} flush />

        <div className="ui-date-header px-1">
          <span className="font-medium text-[var(--text-secondary)]">
            {similarInfo.transactions.length}{' '}
            köp
          </span>
          <span className="font-display font-medium text-[var(--text-primary)] tabular-nums">
            Totalt {formatKr(similarInfo.totalAmount)}
          </span>
        </div>

        {/* Clean Full List of Similar Transactions */}
        <div className="ui-sheet-group">
          {similarInfo.transactions.map((tx) => {
            const isCurrent = tx.id === activeTx.id;
            const txIsIncome = tx.type === 'income';
            return (
              <button
                key={tx.id}
                type="button"
                onClick={() => {
                  if (!isCurrent && onSelectTransaction) {
                    onSelectTransaction(tx);
                  } else {
                    navigateSubView('details', 'back');
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
                    <span className="ui-row-title">{tx.title}</span>
                    <span className="ui-row-subtitle tabular-nums">
                      {formatSwedishDateHeading(tx.date)}
                      {isCurrent ? ' · Det här köpet' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`ui-row-amount ${
                        txIsIncome ? 'ui-row-amount-income' : ''
                      }`}
                    >
                      {txIsIncome ? '+' : '−'}
                      {formatKr(tx.amount)}
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
            );
          })}
        </div>
      </div>
    )}
  </>
);
