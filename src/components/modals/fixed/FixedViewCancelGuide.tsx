import type { CancelGuideData, ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { X, Trash, CaretLeft, ArrowSquareOut, Sparkle, Info } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../HomeTab';
import { ItemLogo } from '../../ItemLogo';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

export interface FixedViewCancelGuideProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  displayName: string;
  onClose: () => void;
  category: string;
  activeExpense: FixedExpenseItem;
  formatKr: (val: number) => string;
  amount: string | number;
  paymentMethod: string;
  isLoadingCancelGuide: boolean;
  cancelGuide: CancelGuideData;
  onDelete: (id: string) => void;
  setShowDeleteConfirm: (value: SetStateAction<boolean>) => void;
  showDeleteConfirm: boolean;
  handleDelete: () => void;
}

export const FixedViewCancelGuide: React.FC<FixedViewCancelGuideProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  displayName,
  onClose,
  category,
  activeExpense,
  formatKr,
  amount,
  paymentMethod,
  isLoadingCancelGuide,
  cancelGuide,
  onDelete,
  setShowDeleteConfirm,
  showDeleteConfirm,
  handleDelete,
}) => (
  <>
    {subView === 'cancel-guide' && (
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
          <span className="ui-sheet-title truncate max-w-[220px]">
            Säg upp {displayName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sammanfattningskort med årlig besparing */}
        <div className="px-4 py-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ItemLogo
              name={displayName}
              category={category}
              logoUrl={activeExpense?.logo}
              size="md"
              isRecurring={false}
            />
            <div className="min-w-0">
              <span className="ui-row-title">{displayName}</span>
              <span className="ui-row-subtitle">
                −{formatKr(Number(amount) || 0)}/mån · {paymentMethod}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-[var(--text-muted)] block">
              Årlig besparing
            </span>
            <span className="font-display font-semibold text-[14px] text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatKr((Number(amount) || 0) * 12)}/år
            </span>
          </div>
        </div>

        {isLoadingCancelGuide ? (
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-5 space-y-3.5 animate-pulse">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Sparkle size={14} weight="fill" className="text-[var(--text-primary)] animate-spin" />
              <span>Tar fram uppsägningsguide för {displayName}...</span>
            </div>
            <div className="h-3.5 w-3/4 rounded bg-[var(--surface-raised)]" />
            <div className="space-y-2.5 pt-1">
              <div className="h-10 w-full rounded-xl bg-[var(--surface-raised)]" />
              <div className="h-10 w-full rounded-xl bg-[var(--surface-raised)]" />
              <div className="h-10 w-full rounded-xl bg-[var(--surface-raised)]" />
            </div>
          </div>
        ) : (
          (() => {
            const guide: CancelGuideData = cancelGuide || {
              serviceName: displayName,
              noticePeriod: 'Kontrollera uppsägningstid på Mina Sidor',
              steps: [
                `Logga in på Mina Sidor hos ${displayName}.`,
                'Gå till Abonnemang eller Medlemskap och välj Avsluta.',
                'Kontrollera att du får en bekräftelse på uppsägningen via e-post.',
              ],
              cancelUrl: `https://www.google.com/search?q=${encodeURIComponent(
                `${displayName} säga upp abonnemang`
              )}`,
              cancelUrlLabel: `Gå till ${displayName}`,
              tip: 'Låt eventuellt autogiro ligga kvar tills sista fakturan under uppsägningstiden är betald.',
            };

            return (
              <div className="space-y-3.5">
                {/* Uppsägningstid */}
                <div className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-secondary)] shrink-0">
                    Uppsägningstid
                  </span>
                  <span className="font-medium text-[var(--text-primary)] text-right">
                    {guide.noticePeriod}
                  </span>
                </div>

                {/* Steg-för-steg instruktioner */}
                <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Så säger du upp
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                      <Sparkle size={11} weight="fill" />
                      <span>AI-guide</span>
                    </span>
                  </div>

                  <ol className="space-y-2.5">
                    {guide.steps.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--text-primary)]"
                      >
                        <span className="w-5 h-5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[11px] font-display font-semibold text-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Smart tips */}
                {guide.tip && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-[12px] leading-snug text-[var(--text-secondary)]">
                    <Info size={15} className="text-[var(--text-primary)] shrink-0 mt-0.5" />
                    <span>{guide.tip}</span>
                  </div>
                )}

                {/* Direktlänk & Ta bort */}
                <div className="space-y-2 pt-1">
                  <a
                    href={guide.cancelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ui-btn-primary"
                  >
                    <span>{guide.cancelUrlLabel}</span>
                    <ArrowSquareOut size={15} weight="bold" />
                  </a>

                  {onDelete && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="ui-btn-secondary"
                      >
                        <Trash size={14} />
                        <span>Redan uppsagt? Ta bort utgift</span>
                      </button>

                      <ConfirmDialog
                        isOpen={showDeleteConfirm}
                        title="Ta bort fast utgift?"
                        description={`${displayName} tas bort från dina fasta utgifter.`}
                        confirmLabel="Ta bort"
                        onConfirm={handleDelete}
                        onCancel={() => setShowDeleteConfirm(false)}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>
    )}
  </>
);
