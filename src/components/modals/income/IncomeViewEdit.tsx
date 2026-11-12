// Inkomstfönstret: lägg till ny inkomst eller redigera en befintlig.
import React from 'react';
import { Check, CaretRight } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import { ItemLogo } from '../../ItemLogo';
import { CategoryIcon } from '../../CategoryIcon';
import { inferCategoryAndMethodFromName } from '../../../utils/bankAnalysis/existingBudget/manualCategory';
import type { ModalSubView, NavigateSubView, SlideAnimClass } from './shared';
import { SheetHeader } from '../../ui/SheetHeader';

export interface IncomeViewEditProps {
  subView: ModalSubView;
  slideAnimClass: SlideAnimClass;
  isCreateMode: boolean;
  navigateSubView: NavigateSubView;
  onClose: () => void;
  handleCancelEdit: () => void;
  name: string;
  setName: (value: SetStateAction<string>) => void;
  amount: number | string;
  setAmount: (value: SetStateAction<number | string>) => void;
  category: string;
  setCategory: (value: SetStateAction<string>) => void;
  payday: number;
  handleCreateSave: () => void;
  commitInlineChanges: () => void;
}

export const IncomeViewEdit: React.FC<IncomeViewEditProps> = ({
  subView,
  slideAnimClass,
  isCreateMode,
  navigateSubView,
  onClose,
  handleCancelEdit,
  name,
  setName,
  amount,
  setAmount,
  category,
  setCategory,
  payday,
  handleCreateSave,
  commitInlineChanges,
}) => {
  if (subView !== 'edit') return null;
  return (
    <div className={`${slideAnimClass} space-y-4`}>
      {isCreateMode ? (
        <SheetHeader title="Lägg till inkomst" onClose={onClose} flush />
      ) : (
        <SheetHeader variant="edit" title="Redigera inkomst" onCancel={handleCancelEdit} flush />
      )}

      {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
      <div className="ui-field-card space-y-3.5">
        <div className="flex items-center gap-3.5">
          <label className="flex items-center gap-3.5 cursor-text flex-1 min-w-0">
            <ItemLogo
              name={name || 'Lön'}
              category={category}
              size="lg"
              isRecurring={true}
            />
            <div className="flex-1 min-w-0">
              <span className="ui-field-label block mb-0.5">
                Namn
              </span>
              <input
                type="text"
                spellCheck={false}
                autoCorrect="off"
                autoFocus={isCreateMode}
                placeholder="Inkomstkälla"
                value={name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setName(nextName);
                  if (!isCreateMode) return;
                  const inferred = inferCategoryAndMethodFromName(nextName, 'income');
                  if (inferred?.category) {
                    setCategory(inferred.category);
                  }
                }}
                className="ui-field-input-lg focus:ring-0"
              />
            </div>
          </label>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-3.5">
          <label className="block cursor-text">
            <span className="ui-field-label block mb-0.5">
              Belopp per månad
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl text-positive placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
              />
              <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                kr/mån
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="ui-sheet-group">
        <button
          type="button"
          onClick={() => navigateSubView('category-picker', 'forward')}
          className="ui-row-btn"
        >
          <span className="ui-info-label shrink-0">Kategori</span>
          <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5">
            <CategoryIcon category={category} size={13} />
            <span>{category}</span>
            <CaretRight size={12} className="text-[var(--text-muted)]" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigateSubView('day-picker', 'forward')}
          className="ui-row-btn"
        >
          <span className="ui-info-label shrink-0">Utbetalningsdag</span>
          <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
            <span>Den {payday}:e</span>
            <CaretRight size={12} className="text-[var(--text-muted)]" />
          </span>
        </button>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => {
            if (isCreateMode) {
              handleCreateSave();
            } else {
              commitInlineChanges();
              navigateSubView('details', 'back');
            }
          }}
          disabled={!name.trim() || !(Number(amount) > 0)}
          className="ui-btn-primary"
        >
          <Check size={14} weight="bold" />
          <span>{isCreateMode ? 'Spara inkomst' : 'Spara ändringar'}</span>
        </button>
      </div>
    </div>
  );
};
