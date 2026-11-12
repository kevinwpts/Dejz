import type { ModalSubView } from './shared';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import React from 'react';
import { CaretRight, Plus } from '@phosphor-icons/react';
import { FixedExpenseItem, TransactionItem, getTransactionTime } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { formatSwedishDateHeading } from '../../../utils/swedishDate';
import { findAllMatchingFixedExpensesByMerchant, isFixedExpenseAmountMatch } from '../../../utils/recurring/matching';
import { SheetHeader } from '../../ui/SheetHeader';

export interface FixedViewSimilarProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  onClose: () => void;
  similarInfo: SimilarTransactionsSummary;
  formatKr: (val: number) => string;
  fixedExpenses: FixedExpenseItem[];
  activeExpense: FixedExpenseItem | null;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: "expense" | "income") => void;
  displayName: string;
}

export const FixedViewSimilar: React.FC<FixedViewSimilarProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  onClose,
  similarInfo,
  formatKr,
  fixedExpenses,
  activeExpense,
  onSelectTransaction,
  onMarkAsFixed,
  displayName,
}) => (
  <>
    {subView === 'similar' && (
      <div className={`${slideAnimClass} space-y-5`}>
        <SheetHeader title="Tidigare dragningar" onBack={() => navigateSubView('details', 'back')} onClose={onClose} flush />

        <div className="ui-date-header px-1">
          <span className="font-normal text-[var(--text-secondary)]">
            {similarInfo.transactions.length}{' '}
            {similarInfo.transactions.length === 1 ? 'dragning' : 'dragningar'}
          </span>
          <span className="font-display font-normal text-[var(--text-primary)] tabular-nums">
            Totalt {formatKr(similarInfo.totalAmount)}
          </span>
        </div>

        {similarInfo.transactions.length > 0 ? (
          <div className="ui-sheet-group">
            {similarInfo.transactions.map((tx) => {
              const allSameMerchantFixed = findAllMatchingFixedExpensesByMerchant(
                tx,
                fixedExpenses.length > 0
                  ? fixedExpenses
                  : activeExpense
                  ? [activeExpense]
                  : []
              );
              const hasAmountMatch = allSameMerchantFixed.some((exp) =>
                isFixedExpenseAmountMatch(exp, tx.amount)
              );

              return (
                <div
                  key={tx.id}
                  className="px-4 py-3 sm:py-3.5 flex items-center justify-between gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectTransaction) {
                        onSelectTransaction(tx);
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title block truncate">
                        {tx.title}
                      </span>
                      <span className="ui-row-subtitle tabular-nums">
                        {formatSwedishDateHeading(tx.date)}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {!hasAmountMatch && onMarkAsFixed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsFixed(tx, 'expense');
                        }}
                        title="Lägg till detta belopp som egen fast utgift"
                        className="ui-btn-sm"
                      >
                        <Plus size={12} />
                        <span>Fast</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectTransaction) {
                          onSelectTransaction(tx);
                        }
                      }}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <div className="text-right">
                        <span className="ui-row-amount">
                          −{formatKr(tx.amount)}
                        </span>
                        <span className="ui-row-meta">
                          {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                            ? 'Reserverat'
                            : getTransactionTime(tx)}
                        </span>
                      </div>
                      <CaretRight size={12} className="text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ui-sheet-box text-center text-callout text-[var(--text-secondary)] py-8">
            Inga registrerade banktransaktioner matchar {displayName} ännu.
          </div>
        )}
      </div>
    )}
  </>
);
