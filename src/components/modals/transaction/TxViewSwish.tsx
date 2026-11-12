import { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { X, Trash, CaretLeft, Check } from '@phosphor-icons/react';
import { TransactionItem } from '../../HomeTab';
import { ItemLogo } from '../../ItemLogo';
import { saveTransactionMeta } from '../../../utils/appCache';
import { SwishLogo } from '../../SwishLogo';

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
          <span className="ui-sheet-title">Dela utlägg</span>
          <button type="button" onClick={onClose} className="ui-icon-btn">
            <X size={16} />
          </button>
        </div>

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
                        Totalt belopp: {formatKr(baseFullAmt)}
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
                    Dela lika (50/50)
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
                    Anpassat belopp
                  </button>
                </div>

                {swishSplitMode === 'custom' && (
                  <div className="pt-1">
                    <span className="text-caption font-medium text-[var(--text-secondary)] block mb-1">
                      Belopp att få tillbaka (kr)
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={swishCustomShare}
                      onChange={(e) =>
                        setSwishCustomShare(e.target.value.replace(/[^\d]/g, ''))
                      }
                      placeholder={String(halfAmt)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] font-display font-semibold text-base text-[var(--text-primary)] tabular-nums focus:outline-none"
                    />
                  </div>
                )}

                {/* Tydlig fördelning */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="p-3 rounded-xl bg-[var(--surface-color)]">
                    <span className="text-caption text-[var(--text-secondary)] block">
                      Din del i budget
                    </span>
                    <span className="font-display font-bold text-base text-[var(--text-primary)] tabular-nums mt-0.5 block">
                      {formatKr(myRemainingShare)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-positive-solid/10 text-right">
                    <span className="text-caption text-positive block font-medium">
                      Att få tillbaka
                    </span>
                    <span className="font-display font-bold text-base text-positive tabular-nums mt-0.5 block">
                      +{formatKr(friendShare)}
                    </span>
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
                  <Check size={14} weight="bold" />
                  <span>Räkna bara min del ({formatKr(myRemainingShare)}) i budget</span>
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
                  <span>Öppna Swish för att begära {formatKr(friendShare)}</span>
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
                    <Trash size={13} />
                    <span>Återställ till hela beloppet ({formatKr(baseFullAmt)})</span>
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
