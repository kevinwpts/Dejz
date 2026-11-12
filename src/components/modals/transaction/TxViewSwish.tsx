import { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { TransactionItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { saveTransactionMeta } from '../../../utils/cache/itemMeta';
import { SwishLogo } from '../../SwishLogo';
import { SheetHeader } from '../../ui/SheetHeader';

export interface TxViewSwishProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  activeTx: TransactionItem | null;
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  onClose: () => void;
  swishSplitMode: "equal" | "custom";
  swishCustomShare: string;
  formatKr: (val: number) => string;
  setSwishSplitMode: (value: SetStateAction<"equal" | "custom">) => void;
  setSwishCustomShare: (value: SetStateAction<string>) => void;
  onUpdate?: (tx: TransactionItem, applyToSimilarIds?: string[], options?: { renameScope?: "single" | "same-merchant" | "chain"; renameTargetIds?: string[]; categoryTargetIds?: string[]; }) => void;
}

export const TxViewSwish: React.FC<TxViewSwishProps> = ({
  subView,
  activeTx,
  slideAnimClass,
  navigateSubView,
  onClose,
  swishSplitMode,
  swishCustomShare,
  formatKr,
  setSwishSplitMode,
  setSwishCustomShare,
  onUpdate,
}) => (
  <>
    {subView === 'swish' && activeTx && (
      <div className={`${slideAnimClass} space-y-4`}>
        <SheetHeader title="Dela utlägg" onBack={() => navigateSubView('details', 'back')} onClose={onClose} flush />

        {(() => {
          const baseFullAmt = Math.round(
            Math.abs(Number(activeTx.originalAmount || activeTx.amount) || 0)
          );
          const halfAmt = Math.max(1, Math.round(baseFullAmt / 2));
          const friendShare =
            swishSplitMode === 'equal'
              ? halfAmt
              : Math.min(
                  baseFullAmt - 1,
                  Math.max(1, Math.round(Number(swishCustomShare) || halfAmt))
                );
          const myRemainingShare = Math.max(0, baseFullAmt - friendShare);
          const isAlreadySplit = Boolean(
            activeTx.isWaitingForSwish ||
              (activeTx.originalAmount && activeTx.originalAmount > activeTx.amount)
          );

          return (
            <div className="space-y-4">
              {/* Uppdelningskort */}
              <div className="ui-field-card space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemLogo
                      name={activeTx.title}
                      category={activeTx.category}
                      logoUrl={activeTx.logo}
                      size="md"
                    />
                    <div className="min-w-0">
                      <span className="ui-row-title block truncate">{activeTx.title}</span>
                      <span className="ui-row-subtitle tabular-nums">
                        Totalt {formatKr(baseFullAmt)}
                      </span>
                    </div>
                  </div>
                  <SwishLogo size={22} />
                </div>

                {/* Välj uppdelning */}
                <div className="ui-segmented grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSwishSplitMode('equal');
                      setSwishCustomShare(String(halfAmt));
                    }}
                    className={`ui-segmented-tab ${
                      swishSplitMode === 'equal' ? 'ui-segmented-tab-active' : ''
                    }`}
                  >
                    Hälften var
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSwishSplitMode('custom');
                      if (!swishCustomShare) setSwishCustomShare(String(halfAmt));
                    }}
                    className={`ui-segmented-tab ${
                      swishSplitMode === 'custom' ? 'ui-segmented-tab-active' : ''
                    }`}
                  >
                    Eget belopp
                  </button>
                </div>

                {swishSplitMode === 'custom' && (
                  <div className="pt-1">
                    <span className="ui-field-label block mb-1.5">
                      Belopp att få tillbaka (kr)
                    </span>
                    <input
                      aria-label="Belopp att få tillbaka (kr)"
                      type="text"
                      inputMode="numeric"
                      value={swishCustomShare}
                      onChange={(e) =>
                        setSwishCustomShare(e.target.value.replace(/[^\d]/g, ''))
                      }
                      placeholder={String(halfAmt)}
                      className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-color)] border-0 font-display font-semibold text-base text-[var(--text-primary)] tabular-nums focus:outline-none focus:shadow-[0_0_0_2px_var(--accent-soft)]"
                    />
                  </div>
                )}

                {/* Tydlig fördelning */}
                <div className="pt-3 border-t border-[var(--separator)] space-y-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-callout text-[var(--text-secondary)]">Din del i budgeten</span>
                    <span className="ui-row-amount">{formatKr(myRemainingShare)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-callout text-[var(--text-secondary)]">Att få tillbaka</span>
                    <span className="ui-row-amount-income">+{formatKr(friendShare)}</span>
                  </div>
                </div>
              </div>

              {/* Rena, tydliga åtgärder */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    saveTransactionMeta(activeTx.id, {
                      isWaitingForSwish: true,
                      pendingSwishAmount: friendShare,
                      originalAmount: baseFullAmt,
                      customAmount: myRemainingShare,
                    });
                    if (onUpdate) {
                      onUpdate({
                        ...activeTx,
                        originalAmount: baseFullAmt,
                        amount: myRemainingShare,
                        isWaitingForSwish: true,
                        pendingSwishAmount: friendShare,
                      });
                    }
                    navigateSubView('details', 'back');
                  }}
                  className="ui-btn-primary"
                >
                  <span>Räkna bara min del</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const noteText = encodeURIComponent(activeTx.title || 'Utlägg');
                    const swishAppUrl = `swish://payment?amount=${friendShare}&message=${noteText}`;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(
                        `Hej! Kan du swisha mig ${friendShare} kr för ${activeTx.title}? Tack!`
                      );
                    }
                    window.location.href = swishAppUrl;
                  }}
                  className="ui-btn-secondary"
                >
                  <SwishLogo size={15} />
                  <span>Begär {formatKr(friendShare)} med Swish</span>
                </button>

                {isAlreadySplit && (
                  <button
                    type="button"
                    onClick={() => {
                      saveTransactionMeta(activeTx.id, {
                        isWaitingForSwish: false,
                        pendingSwishAmount: undefined,
                        pendingSwishRecipient: undefined,
                        originalAmount: undefined,
                        customAmount: baseFullAmt,
                      });
                      if (onUpdate) {
                        onUpdate({
                          ...activeTx,
                          amount: baseFullAmt,
                          originalAmount: undefined,
                          isWaitingForSwish: false,
                          pendingSwishAmount: undefined,
                          pendingSwishRecipient: undefined,
                        });
                      }
                      navigateSubView('details', 'back');
                    }}
                    className="ui-btn-danger"
                  >
                    <span>Återställ hela beloppet</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    )}
  </>
);
