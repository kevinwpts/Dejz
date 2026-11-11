import React from 'react';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import type { TransactionItem } from '../../app/models';

export interface HomeSinceLastSheetProps {
  isSinceLastOpen: boolean;
  sinceLastVisitTxs: TransactionItem[];
  dismissSinceLastVisit: () => void;
  formatKr: (amount: number) => string;
  onSelectTransaction: (tx: TransactionItem) => void;
}

export const HomeSinceLastSheet: React.FC<HomeSinceLastSheetProps> = ({
  isSinceLastOpen,
  sinceLastVisitTxs,
  dismissSinceLastVisit,
  formatKr,
  onSelectTransaction,
}) => (
    <>
      {/* ============================================================== */}
      {/* SEDAN SIST-ÖVERBLICK (NYA KÖP SEDAN FÖRRA BESÖKET)             */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={isSinceLastOpen && sinceLastVisitTxs.length > 0}
        onClose={dismissSinceLastVisit}
        title="Sedan sist"
      >
        <div className="space-y-4">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {sinceLastVisitTxs.length} {sinceLastVisitTxs.length === 1 ? 'köp' : 'köp'}
            </span>
            <span className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
              −{formatKr(sinceLastVisitTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0))}
            </span>
          </div>

          <div className="ui-sheet-group">
            {sinceLastVisitTxs.map((tx) => (
              <button
                key={`since-last-${tx.id}`}
                type="button"
                onClick={() => {
                  dismissSinceLastVisit();
                  onSelectTransaction(tx);
                }}
                className="ui-tx-row px-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ItemLogo
                    name={tx.title}
                    category={tx.category}
                    logoUrl={tx.logo}
                    size="md"
                    isRecurring={false}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="ui-row-title truncate block">{tx.title}</span>
                    <span className="ui-row-subtitle flex items-center gap-1">
                      <CategoryIcon category={tx.category} size={11} className="shrink-0" />
                      <span className="truncate">{tx.category}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="ui-row-amount">−{formatKr(tx.amount)}</span>
                  <span className="ui-row-meta">{formatSwedishDateHeading(tx.date)}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={dismissSinceLastVisit}
            className="w-full ui-btn-primary"
          >
            <span>OK</span>
          </button>
        </div>
      </BottomSheet>
    </>
);
