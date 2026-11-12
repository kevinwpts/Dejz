import type { RecurringMatchResult } from '../../../utils/recurring/checkRecurring';
import { ModalSubView } from './shared';
import React from 'react';
import { X, CaretLeft, Check, Plus } from '@phosphor-icons/react';
import { TransactionItem, FixedExpenseItem, IncomeItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';

export interface TxViewLinkFixedPickerProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  activeTx: TransactionItem | null;
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  isIncome: boolean;
  onClose: () => void;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  recurringStatus: RecurringMatchResult;
  onLinkToFixed?: (tx: TransactionItem, item: IncomeItem | FixedExpenseItem | null, kind: "expense" | "income") => void;
  formatKr: (val: number) => string;
  onMarkAsFixed?: (tx: TransactionItem, kind: "expense" | "income") => void;
}

export const TxViewLinkFixedPicker: React.FC<TxViewLinkFixedPickerProps> = ({
  subView,
  activeTx,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  isIncome,
  onClose,
  incomes,
  fixedExpenses,
  recurringStatus,
  onLinkToFixed,
  formatKr,
  onMarkAsFixed,
}) => (
  <>
    {subView === 'link-fixed-picker' && activeTx && (
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
            {isIncome ? 'Koppla till fast inkomst' : 'Koppla till fast utgift'}
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
          {(isIncome ? incomes : fixedExpenses).map((item) => {
            const isMatched =
              (isIncome
                ? activeTx.linkedIncomeId === item.id
                : activeTx.linkedFixedExpenseId === item.id) ||
              recurringStatus.matchedItemId === item.id;
            const dayNum = 'dueDay' in item ? item.dueDay : item.payday;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onLinkToFixed) {
                    onLinkToFixed(activeTx, item, isIncome ? 'income' : 'expense');
                  }
                  navigateSubView(pickerReturnView, 'back');
                }}
                className="ui-row-btn"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ItemLogo
                    name={item.name}
                    category={item.category}
                    logoUrl={item.logo}
                    size="md"
                    isRecurring={true}
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <span
                      className={`block truncate ${
                        isMatched
                          ? 'font-medium text-[var(--text-primary)]'
                          : 'font-normal text-[var(--text-primary)]'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-caption text-[var(--text-secondary)] tabular-nums">
                      {formatKr(item.amount)}/mån · Den {dayNum}:e
                    </span>
                  </div>
                </div>
                {isMatched && (
                  <Check size={14} weight="bold" className="text-positive-solid shrink-0" />
                )}
              </button>
            );
          })}

          {(activeTx.linkedFixedExpenseId || activeTx.linkedIncomeId) && onLinkToFixed && (
            <button
              type="button"
              onClick={() => {
                onLinkToFixed(activeTx, null, isIncome ? 'income' : 'expense');
                navigateSubView(pickerReturnView, 'back');
              }}
              className="ui-row-btn text-negative-solid"
            >
              <span className="font-medium">Ta bort koppling till fast post</span>
            </button>
          )}
        </div>

        {onMarkAsFixed && (
          <button
            type="button"
            onClick={() => onMarkAsFixed(activeTx, isIncome ? 'income' : 'expense')}
            className="ui-btn-secondary w-full flex items-center justify-center gap-1.5"
          >
            <Plus size={14} weight="bold" />
            <span>
              Skapa som ny fast {isIncome ? 'inkomst' : 'utgift'} ({activeTx.title})
            </span>
          </button>
        )}
      </div>
    )}
  </>
);
