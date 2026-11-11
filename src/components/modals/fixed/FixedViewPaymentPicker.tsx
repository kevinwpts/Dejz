import type { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { X, Check, CaretLeft } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../HomeTab';
import { PaymentMethodIcon } from '../../CategoryIcon';

export interface FixedViewPaymentPickerProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  availablePaymentMethods: string[];
  paymentMethod: string;
  setPaymentMethod: (value: SetStateAction<string>) => void;
  commitInlineChanges: (overrides?: Partial<FixedExpenseItem>) => void;
}

export const FixedViewPaymentPicker: React.FC<FixedViewPaymentPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  availablePaymentMethods,
  paymentMethod,
  setPaymentMethod,
  commitInlineChanges,
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
                  if (pickerReturnView === 'details') {
                    commitInlineChanges({ paymentMethod: m });
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
