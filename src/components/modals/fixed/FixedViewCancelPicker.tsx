import type { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { X, Check, CaretRight, CaretLeft } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../../app/models';
import { getSwedishDateStr } from '../../../utils/swedishDate';

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
            Uppsagd · {displayName}
          </span>
          <button
            type="button" aria-label="Stäng"
            onClick={onClose}
            className="ui-icon-btn"
          >
            <X size={16} />
          </button>
        </div>

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
                rightLabel: `Sista: ${target.label}`,
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
            <div className="space-y-3.5">
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
                  className="w-full py-3 px-4 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Ångra uppsägning</span>
                  <span className="text-positive font-semibold">
                    Gör aktiv igen
                  </span>
                </button>
              )}

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
                    <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span>{sc.rightLabel}</span>
                      {sc.isSelected && (
                        <Check size={14} weight="bold" className="text-[var(--text-primary)]" />
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
                    Välj sista månad
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
                <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
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
                        className={`py-2 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                            : 'bg-[var(--surface-color)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        {cm.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleOpenCancelGuide}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5 px-3 transition-colors cursor-pointer"
                >
                  Hur säger jag upp hos {displayName}?
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    )}
  </>
);
