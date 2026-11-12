import type { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { Check, CaretRight, Sparkle } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../../app/models';
import { getSwedishDateStr } from '../../../utils/swedishDate';
import { SheetHeader } from '../../ui/SheetHeader';

export interface FixedViewCancelPickerProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  displayName: string;
  onClose: () => void;
  activeExpense: FixedExpenseItem | null;
  commitInlineChanges: (overrides?: Partial<FixedExpenseItem>) => void;
  setShowCustomMonthPicker: (value: SetStateAction<boolean>) => void;
  showCustomMonthPicker: boolean;
  handleOpenCancelGuide: () => Promise<void>;
}

export const FixedViewCancelPicker: React.FC<FixedViewCancelPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  displayName,
  onClose,
  activeExpense,
  commitInlineChanges,
  setShowCustomMonthPicker,
  showCustomMonthPicker,
  handleOpenCancelGuide,
}) => (
  <>
    {subView === 'cancel-picker' && (
      <div className={`${slideAnimClass} space-y-4`}>
        <SheetHeader title={<>Säg upp {displayName}</>} onBack={() => navigateSubView('details', 'back')} onClose={onClose} flush />

        {(() => {
          const SHORT_MONTHS = [
            'jan',
            'feb',
            'mar',
            'apr',
            'maj',
            'jun',
            'jul',
            'aug',
            'sep',
            'okt',
            'nov',
            'dec',
          ];
          const nowStr = getSwedishDateStr();
          const baseYear = parseInt(nowStr.slice(0, 4), 10);
          const baseMonth = parseInt(nowStr.slice(5, 7), 10) - 1;

          const getMonthOption = (monthsAhead: number) => {
            const d = new Date(Date.UTC(baseYear, baseMonth + monthsAhead, 1, 12, 0, 0));
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth();
            const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
            const label =
              y !== baseYear ? `${SHORT_MONTHS[m]} ${String(y).slice(-2)}` : SHORT_MONTHS[m];
            return { ym, label };
          };

          const quickScenarios = [
            {
              key: 'none',
              title: 'Inga fler dragningar',
              rightLabel: 'Slutar direkt',
              isSelected: Boolean(activeExpense?.isCancelled && activeExpense?.hasNoMorePayments),
              onPick: () => {
                commitInlineChanges({
                  isCancelled: true,
                  hasNoMorePayments: true,
                  lastPaymentDate: undefined,
                });
                navigateSubView('details', 'back');
              },
            },
            ...[1, 2, 3, 6].map((mCount) => {
              const target = getMonthOption(mCount - 1);
              const isSelected = Boolean(
                activeExpense?.isCancelled &&
                  !activeExpense?.hasNoMorePayments &&
                  activeExpense?.lastPaymentDate === target.ym
              );
              return {
                key: `m-${mCount}`,
                title: mCount === 1 ? '1 månad kvar' : `${mCount} månader kvar`,
                rightLabel: `Sista i ${target.label}`,
                isSelected,
                onPick: () => {
                  commitInlineChanges({
                    isCancelled: true,
                    hasNoMorePayments: false,
                    lastPaymentDate: target.ym,
                  });
                  navigateSubView('details', 'back');
                },
              };
            }),
          ];

          const customMonths = Array.from({ length: 12 }, (_, idx) => getMonthOption(idx));

          return (
            <div className="space-y-4">
              {/* Guiden först – det är oftast det man vill veta */}
              <button
                type="button"
                onClick={handleOpenCancelGuide}
                className="ui-sheet-group ui-row-btn w-full"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-[var(--surface-color)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <Sparkle size={16} weight="fill" />
                  </span>
                  <span className="min-w-0">
                    <span className="ui-list-row-title block">Hur säger jag upp?</span>
                    <span className="text-footnote text-[var(--text-secondary)] block truncate mt-0.5">
                      Steg för steg för {displayName}
                    </span>
                  </span>
                </span>
                <CaretRight size={12} className="text-[var(--text-muted)] shrink-0" />
              </button>

              {activeExpense?.isCancelled && (
                <button
                  type="button"
                  onClick={() => {
                    commitInlineChanges({
                      isCancelled: false,
                      hasNoMorePayments: false,
                      lastPaymentDate: undefined,
                    });
                    navigateSubView('details', 'back');
                  }}
                  className="ui-sheet-group ui-row-btn w-full"
                >
                  <span className="text-[var(--text-primary)]">Ångra uppsägning</span>
                  <span className="text-[var(--accent-color)] font-medium">Gör aktiv igen</span>
                </button>
              )}

              <p className="ui-field-label px-1 -mb-2">När dras pengarna sista gången?</p>
              <div className="ui-sheet-group">
                {quickScenarios.map((sc) => (
                  <button
                    key={sc.key}
                    type="button"
                    onClick={sc.onPick}
                    className="ui-row-btn"
                  >
                    <span
                      className={
                        sc.isSelected
                          ? 'font-semibold text-[var(--text-primary)]'
                          : 'font-normal text-[var(--text-primary)]'
                      }
                    >
                      {sc.title}
                    </span>
                    <span className="flex items-center gap-2 text-callout text-[var(--text-secondary)] tabular-nums">
                      <span>{sc.rightLabel}</span>
                      {sc.isSelected && (
                        <Check size={16} weight="bold" className="text-[var(--accent-color)]" />
                      )}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setShowCustomMonthPicker((prev) => !prev)}
                  className="ui-row-btn"
                >
                  <span className="font-normal text-[var(--text-primary)]">
                    Välj annan månad
                  </span>
                  <CaretRight
                    size={12}
                    className={`text-[var(--text-muted)] transition-transform ${
                      showCustomMonthPicker ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              </div>

              {showCustomMonthPicker && (
                <div className="grid grid-cols-4 gap-2 p-3 rounded-card-nested bg-[var(--fill-grouped)]">
                  {customMonths.map((cm) => {
                    const isSel = Boolean(
                      activeExpense?.isCancelled &&
                        !activeExpense?.hasNoMorePayments &&
                        activeExpense?.lastPaymentDate === cm.ym
                    );
                    return (
                      <button
                        key={cm.ym}
                        type="button"
                        onClick={() => {
                          commitInlineChanges({
                            isCancelled: true,
                            hasNoMorePayments: false,
                            lastPaymentDate: cm.ym,
                          });
                          navigateSubView('details', 'back');
                        }}
                        className={`h-10 px-2 rounded-xl text-callout font-medium tabular-nums transition-all cursor-pointer ${
                          isSel
                            ? 'ui-selected font-semibold'
                            : 'bg-[var(--surface-color)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        {cm.label}
                      </button>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })()}
      </div>
    )}
  </>
);
