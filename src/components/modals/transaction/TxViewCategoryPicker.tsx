import { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { Check } from '@phosphor-icons/react';
import { TransactionItem } from '../../../app/models';
import { CategoryIcon } from '../../CategoryIcon';
import { saveTransactionMeta } from '../../../utils/cache/itemMeta';
import { SheetHeader } from '../../ui/SheetHeader';

export interface TxViewCategoryPickerProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  availableCategories: string[];
  category: string;
  setCategory: (value: SetStateAction<string>) => void;
  activeTx: TransactionItem | null;
  onUpdate?: (tx: TransactionItem, applyToSimilarIds?: string[], options?: { renameScope?: "single" | "same-merchant" | "chain"; renameTargetIds?: string[]; categoryTargetIds?: string[]; }) => void;
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
        <SheetHeader title="Välj kategori" onBack={() => navigateSubView(pickerReturnView, 'back')} onClose={onClose} flush />

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
