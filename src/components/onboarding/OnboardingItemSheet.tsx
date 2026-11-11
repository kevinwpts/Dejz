import type { FormEvent, SetStateAction } from 'react';
import React from 'react';
import { CaretLeft, CaretRight, Trash, Check, X } from '@phosphor-icons/react';
import {
  inferCategoryAndMethodFromName,
} from '../../utils/bankHistoryAnalyzer';
import { hasConnectedHouseholdPartner } from '../../utils/householdSync';


import { ItemLogo } from '../ItemLogo';
import { CategoryIcon, PaymentMethodIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { DayOfMonthPicker } from '../ui/DayOfMonthPicker';
import {
  SheetEditorState,
} from './onboardingConfig';

export interface OnboardingItemSheetProps {
  sheetEditor: SheetEditorState;
  setSheetEditor: (value: SetStateAction<SheetEditorState>) => void;
  sheetSubView: "main" | "day-picker" | "category-picker" | "payment-picker";
  setSheetNavDir: (value: SetStateAction<"forward" | "back">) => void;
  setSheetSubView: (value: SetStateAction<"main" | "day-picker" | "category-picker" | "payment-picker">) => void;
  availableIncomeCategories: string[];
  availableExpenseCategories: string[];
  availablePaymentMethods: string[];
  handleSaveSheet: (e?: FormEvent<Element>) => void;
  sheetNavDir: "forward" | "back";
  formatKr: (val: number) => string;
  handleDeleteFromSheet: () => void;
}

export const OnboardingItemSheet: React.FC<OnboardingItemSheetProps> = ({
  sheetEditor,
  setSheetEditor,
  sheetSubView,
  setSheetNavDir,
  setSheetSubView,
  availableIncomeCategories,
  availableExpenseCategories,
  availablePaymentMethods,
  handleSaveSheet,
  sheetNavDir,
  formatKr,
  handleDeleteFromSheet,
}) => (
    <BottomSheet
      isOpen={Boolean(sheetEditor)}
      onClose={() => setSheetEditor(null)}
    >
      {sheetEditor && (
        <div>
          {sheetSubView === 'day-picker' && (
            <div
              key="sheet-day-picker"
              className="animate-page-forward space-y-4"
            >
              <div className="ui-sheet-sub-header">
                <button
                  type="button"
                  onClick={() => {
                    setSheetNavDir('back');
                    setSheetSubView('main');
                  }}
                  title="Tillbaka"
                  aria-label="Tillbaka"
                  className="ui-icon-btn"
                >
                  <CaretLeft size={15} weight="bold" />
                </button>
                <span className="ui-sheet-title">
                  {sheetEditor.type === 'income' ? 'Välj utbetalningsdag' : 'Välj förfallodag'}
                </span>
                <button
                  type="button"
                  onClick={() => setSheetEditor(null)}
                  className="ui-icon-btn"
                >
                  <X size={16} />
                </button>
              </div>

              <DayOfMonthPicker
                selectedDay={sheetEditor.day}
                onSelectDay={(d) => {
                  setSheetEditor({ ...sheetEditor, day: d });
                  setSheetNavDir('back');
                  setSheetSubView('main');
                }}
                mode={sheetEditor.type === 'income' ? 'payday' : 'dueday'}
              />
            </div>
          )}

          {sheetSubView === 'category-picker' && (
            <div
              key="sheet-category-picker"
              className="animate-page-forward space-y-4"
            >
              <div className="ui-sheet-sub-header">
                <button
                  type="button"
                  onClick={() => {
                    setSheetNavDir('back');
                    setSheetSubView('main');
                  }}
                  title="Tillbaka"
                  aria-label="Tillbaka"
                  className="ui-icon-btn"
                >
                  <CaretLeft size={15} weight="bold" />
                </button>
                <span className="ui-sheet-title">Välj kategori</span>
                <button
                  type="button"
                  onClick={() => setSheetEditor(null)}
                  className="ui-icon-btn"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="ui-sheet-group">
                {(sheetEditor.type === 'income'
                  ? availableIncomeCategories
                  : availableExpenseCategories
                ).map((c) => {
                  const isSel = c === sheetEditor.category;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSheetEditor({ ...sheetEditor, category: c });
                        setSheetNavDir('back');
                        setSheetSubView('main');
                      }}
                      className="ui-row-btn"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon category={c} size={14} badge={true} />
                        <span
                          className={`truncate ${
                            isSel
                              ? 'font-medium text-[var(--text-primary)]'
                              : 'font-normal text-[var(--text-primary)]'
                          }`}
                        >
                          {c}
                        </span>
                      </div>
                      {isSel && (
                        <Check
                          size={14}
                          weight="bold"
                          className="text-[var(--text-primary)] shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sheetSubView === 'payment-picker' && (
            <div
              key="sheet-payment-picker"
              className="animate-page-forward space-y-4"
            >
              <div className="ui-sheet-sub-header">
                <button
                  type="button"
                  onClick={() => {
                    setSheetNavDir('back');
                    setSheetSubView('main');
                  }}
                  title="Tillbaka"
                  aria-label="Tillbaka"
                  className="ui-icon-btn"
                >
                  <CaretLeft size={15} weight="bold" />
                </button>
                <span className="ui-sheet-title">Välj betalsätt</span>
                <button
                  type="button"
                  onClick={() => setSheetEditor(null)}
                  className="ui-icon-btn"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="ui-sheet-group">
                {availablePaymentMethods.map((m) => {
                  const isSel = m === (sheetEditor.paymentMethod || 'Autogiro');
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSheetEditor({ ...sheetEditor, paymentMethod: m });
                        setSheetNavDir('back');
                        setSheetSubView('main');
                      }}
                      className="ui-row-btn"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PaymentMethodIcon method={m} size={17} />
                        <span
                          className={`truncate ${
                            isSel
                              ? 'font-medium text-[var(--text-primary)]'
                              : 'font-normal text-[var(--text-primary)]'
                          }`}
                        >
                          {m}
                        </span>
                      </div>
                      {isSel && (
                        <Check
                          size={14}
                          weight="bold"
                          className="text-[var(--text-primary)] shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sheetSubView === 'main' && (
            <form
              key="sheet-main"
              onSubmit={handleSaveSheet}
              className={`space-y-5 ${
                sheetNavDir === 'back' ? 'animate-page-back' : ''
              }`}
            >
              <div className="ui-sheet-sub-header">
                <span className="ui-sheet-title">
                  {sheetEditor.mode === 'add'
                    ? sheetEditor.type === 'income'
                      ? 'Lägg till inkomst'
                      : 'Lägg till fast utgift'
                    : sheetEditor.type === 'income'
                    ? 'Redigera inkomst'
                    : 'Redigera fast utgift'}
                </span>
                <button
                  type="button"
                  onClick={() => setSheetEditor(null)}
                  className="ui-icon-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
              <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
                <label className="flex items-center gap-3.5 cursor-text">
                  <ItemLogo
                    name={
                      sheetEditor.name ||
                      (sheetEditor.type === 'income' ? 'Lön' : 'Fast utgift')
                    }
                    category={sheetEditor.category}
                    logoUrl={sheetEditor.logo}
                    size="lg"
                    isRecurring={true}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                      Namn
                    </span>
                    <input
                      type="text"
                      required
                      autoFocus={sheetEditor.mode === 'add' && !sheetEditor.name}
                      placeholder={
                        sheetEditor.type === 'income'
                          ? 't.ex. Lön eller CSN'
                          : 't.ex. Riksbyggen eller Netflix'
                      }
                      value={sheetEditor.name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        const inferred = inferCategoryAndMethodFromName(
                          nextName,
                          sheetEditor.type
                        );
                        setSheetEditor((prev) =>
                          prev
                            ? {
                                ...prev,
                                name: nextName,
                                ...(inferred?.category ? { category: inferred.category } : {}),
                                ...(inferred?.paymentMethod && prev.type === 'fixed'
                                  ? { paymentMethod: inferred.paymentMethod }
                                  : {}),
                                ...(inferred?.logo ? { logo: inferred.logo } : {}),
                              }
                            : prev
                        );
                      }}
                      className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                    />
                  </div>
                </label>

                <div className="border-t border-[var(--border-subtle)] pt-3.5">
                  <label className="block cursor-text">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                      Belopp per månad
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        autoFocus={sheetEditor.mode === 'add' && !!sheetEditor.name}
                        placeholder="0"
                        value={sheetEditor.amount}
                        onChange={(e) =>
                          setSheetEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  amount: e.target.value.replace(/[^\d]/g, ''),
                                }
                              : prev
                          )
                        }
                        className={`w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl tabular-nums focus:outline-none placeholder-[var(--text-muted)]/40 ${
                          sheetEditor.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[var(--text-primary)]'
                        }`}
                      />
                      <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                        kr/mån
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Valbara rader för Kategori, Betalsätt och Dag */}
              <div className="ui-sheet-group text-[14px] sm:text-sm">

                <button
                  type="button"
                  onClick={() => {
                    setSheetNavDir('forward');
                    setSheetSubView('category-picker');
                  }}
                  className="ui-row-btn"
                >
                  <span className="text-[var(--text-muted)] shrink-0">Kategori</span>
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <CategoryIcon
                      category={
                        sheetEditor.category ||
                        (sheetEditor.type === 'income' ? 'Lön' : 'Räkningar')
                      }
                      size={13}
                      className="shrink-0 text-[var(--text-secondary)]"
                    />
                    <span>
                      {sheetEditor.category ||
                        (sheetEditor.type === 'income' ? 'Lön' : 'Räkningar')}
                    </span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </span>
                </button>

                {sheetEditor.type === 'fixed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSheetNavDir('forward');
                      setSheetSubView('payment-picker');
                    }}
                    className="ui-row-btn"
                  >
                    <span className="text-[var(--text-muted)] shrink-0">Betalsätt</span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <PaymentMethodIcon method={sheetEditor.paymentMethod || 'Autogiro'} size={15} />
                      <span>{sheetEditor.paymentMethod || 'Autogiro'}</span>
                      <CaretRight size={12} className="text-[var(--text-muted)]" />
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSheetNavDir('forward');
                    setSheetSubView('day-picker');
                  }}
                  className="ui-row-btn"
                >
                  <span className="text-[var(--text-muted)] shrink-0">
                    {sheetEditor.type === 'income' ? 'Utbetalningsdag' : 'Förfallodag'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                    <span>Den {sheetEditor.day}:e</span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </span>
                </button>

                {sheetEditor.type === 'fixed' && hasConnectedHouseholdPartner() && (
                  <div className="ui-row">
                    <div className="min-w-0">
                      <span className="text-[var(--text-muted)] block">Dela utgift (50 %)</span>
                      {sheetEditor.isShared && (
                        <span className="text-[11px] text-[var(--text-secondary)] tabular-nums block">
                          Din andel: {formatKr(Number(sheetEditor.amount) || 0)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(sheetEditor.isShared)}
                      onClick={() =>
                        setSheetEditor((prev) => {
                          if (!prev) return prev;
                          const nextShared = !prev.isShared;
                          const currAmt = Math.max(0, Math.round(Number(prev.amount) || 0));
                          if (nextShared) {
                            const half = Math.max(1, Math.round(currAmt / 2));
                            return {
                              ...prev,
                              isShared: true,
                              fullAmount: String(currAmt),
                              amount: String(half),
                            };
                          } else {
                            const restored = Math.max(
                              currAmt,
                              Math.round(Number(prev.fullAmount) || currAmt * 2)
                            );
                            return {
                              ...prev,
                              isShared: false,
                              amount: String(restored),
                            };
                          }
                        })
                      }
                      className={`ui-switch ${
                        sheetEditor.isShared ? 'ui-switch-on' : 'ui-switch-off'
                      }`}
                    >
                      <span
                        className={`ui-switch-thumb ${
                          sheetEditor.isShared ? 'ui-switch-thumb-on' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={!sheetEditor.name.trim() || !(Number(sheetEditor.amount) > 0)}
                  className="ui-btn-primary"
                >
                  <Check size={14} weight="bold" />
                  <span>Spara</span>
                </button>

                {sheetEditor.mode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDeleteFromSheet}
                    className="ui-btn-danger"
                  >
                    <Trash size={14} />
                    <span>Ta bort</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </BottomSheet>
);
