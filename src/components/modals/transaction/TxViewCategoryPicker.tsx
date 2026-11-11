import { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { X, CaretLeft, Check } from '@phosphor-icons/react';
import { TransactionItem } from '../../HomeTab';
import { CategoryIcon } from '../../CategoryIcon';
import { saveTransactionMeta } from '../../../utils/appCache';

export interface TxViewCategoryPickerProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  availableCategories: string[];
  category: string;
  setCategory: (value: SetStateAction<string>) => void;
  activeTx: TransactionItem;
  onUpdate: (tx: TransactionItem, applyToSimilarIds?: string[], options?: { renameScope?: "single" | "same-merchant" | "chain"; renameTargetIds?: string[]; categoryTargetIds?: string[]; }) => void;
}

export const TxViewCategoryPicker: React.FC<TxViewCategoryPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  availableCategories,
  category,
  setCategory,
  activeTx,
  onUpdate,
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
            type="button"
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
                  if (pickerReturnView === 'details' && activeTx && onUpdate) {
                    saveTransactionMeta(activeTx.id, { customCategory: c });
                    onUpdate({ ...activeTx, category: c });
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
