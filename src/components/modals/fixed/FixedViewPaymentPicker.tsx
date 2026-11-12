import type { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { Check } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../../app/models';
import { PaymentMethodIcon } from '../../CategoryIcon';
import { SheetHeader } from '../../ui/SheetHeader';

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
        <SheetHeader title="Välj betalsätt" onBack={() => navigateSubView(pickerReturnView, 'back')} onClose={onClose} flush />

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
                  <Check size={14} className="text-[var(--text-primary)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    )}
  </>
);
