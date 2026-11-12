import type { CancelGuideData, ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { Trash, ArrowSquareOut, Sparkle, Info } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { SheetHeader } from '../../ui/SheetHeader';

export interface FixedViewCancelGuideProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  displayName: string;
  onClose: () => void;
  category: string;
  activeExpense: FixedExpenseItem | null;
  formatKr: (val: number) => string;
  amount: string | number;
  paymentMethod: string;
  isLoadingCancelGuide: boolean;
  cancelGuide: CancelGuideData | null;
  onDelete?: (id: string) => void;
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
        <SheetHeader title={<>Säg upp {displayName}</>} onBack={() => navigateSubView('details', 'back')} onClose={onClose} flush />

        {/* Sammanfattningskort med årlig besparing */}
        <div className="px-4 py-3 rounded-card-nested bg-[var(--fill-grouped)] flex items-center justify-between gap-3">
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
            <span className="ui-row-amount-income">
              +{formatKr((Number(amount) || 0) * 12)}
            </span>
            <span className="text-footnote text-[var(--text-secondary)] block mt-0.5">
              sparat per år
            </span>
          </div>
        </div>

        {isLoadingCancelGuide ? (
          <div className="rounded-card-nested bg-[var(--fill-grouped)] p-5 space-y-3.5 animate-pulse">
            <div className="flex items-center gap-2 text-footnote text-[var(--text-secondary)]">
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
                {/* Steg-för-steg instruktioner + uppsägningstid i ett kort */}
                <div className="ui-field-card space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display font-semibold text-subhead text-[var(--text-primary)]">
                      Så säger du upp
                    </span>
                    <span className="text-footnote text-[var(--text-secondary)] flex items-center gap-1 shrink-0">
                      <Sparkle size={12} weight="fill" />
                      <span>AI-guide</span>
                    </span>
                  </div>

                  <ol className="space-y-3">
                    {guide.steps.map((step, idx) => (
                      <li
                        key={step}
                        className="flex items-start gap-3 text-subhead leading-snug text-[var(--text-primary)]"
                      >
                        <span className="w-6 h-6 rounded-full bg-[var(--surface-color)] text-footnote font-display font-semibold text-[var(--text-primary)] flex items-center justify-center shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="flex-1 pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="pt-3 border-t border-[var(--separator)] text-footnote leading-snug">
                    <span className="text-[var(--text-secondary)]">Uppsägningstid: </span>
                    <span className="text-[var(--text-primary)]">{guide.noticePeriod}</span>
                  </div>
                </div>

                {/* Tips */}
                {guide.tip && (
                  <div className="px-1 flex items-start gap-2.5 text-footnote leading-snug text-[var(--text-secondary)]">
                    <Info size={16} className="shrink-0 mt-px" />
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
