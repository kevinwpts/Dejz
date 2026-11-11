import { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { X, CaretLeft, Check } from '@phosphor-icons/react';
import { TransactionItem } from '../../HomeTab';
import { PaymentMethodIcon } from '../../CategoryIcon';
import { saveTransactionMeta } from '../../../utils/appCache';

export interface TxViewPaymentPickerProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  availablePaymentMethods: string[];
  paymentMethod: string;
  setPaymentMethod: (value: SetStateAction<string>) => void;
  activeTx: TransactionItem;
  onUpdate: (tx: TransactionItem, applyToSimilarIds?: string[], options?: { renameScope?: "single" | "same-merchant" | "chain"; renameTargetIds?: string[]; categoryTargetIds?: string[]; }) => void;
}

export const TxViewPaymentPicker: React.FC<TxViewPaymentPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  availablePaymentMethods,
  paymentMethod,
  setPaymentMethod,
  activeTx,
  onUpdate,
}) => (
  <>
    {subView === 'payment-picker' && (
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
            Välj betalsätt
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
          {availablePaymentMethods.map((m) => {
            const isSel = m === paymentMethod;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setPaymentMethod(m);
                  if (pickerReturnView === 'details' && activeTx && onUpdate) {
                    saveTransactionMeta(activeTx.id, { paymentMethod: m });
                    onUpdate({ ...activeTx, paymentMethod: m });
                  }
                  navigateSubView(pickerReturnView, 'back');
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
