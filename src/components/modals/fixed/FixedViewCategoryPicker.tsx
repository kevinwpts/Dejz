import type { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { X, Check, CaretLeft } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../HomeTab';
import { CategoryIcon } from '../../CategoryIcon';

export interface FixedViewCategoryPickerProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  availableCategories: string[];
  category: string;
  setCategory: (value: SetStateAction<string>) => void;
  commitInlineChanges: (overrides?: Partial<FixedExpenseItem>) => void;
}

export const FixedViewCategoryPicker: React.FC<FixedViewCategoryPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  availableCategories,
  category,
  setCategory,
  commitInlineChanges,
}) => (
  <>
    {subView === 'category-picker' && (
      <div className={`${slideAnimClass} space-y-4`}>
        <div className="ui-sheet-sub-header">
          <button
            type="button"
            onClick={() => navigateSubView(pickerReturnView, 'back')}
            title="Tillbaka"
            aria-label="Tillbaka"
            className="ui-icon-btn"
          >
            <CaretLeft size={15} weight="bold" />
          </button>
          <span className="ui-sheet-title">
            Välj kategori
          </span>
          <button
            type="button" aria-label="Stäng"
            onClick={onClose}
            className="ui-icon-btn"
          >
            <X size={16} />
          </button>
        </div>

        <div className="ui-sheet-group">
          {availableCategories.map((c) => {
            const isSel = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  if (pickerReturnView === 'details') {
                    commitInlineChanges({ category: c });
                  }
                  navigateSubView(pickerReturnView, 'back');
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
                  <Check size={14} weight="bold" className="text-[var(--text-primary)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    )}
  </>
);
