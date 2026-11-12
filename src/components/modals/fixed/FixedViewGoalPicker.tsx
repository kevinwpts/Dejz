import type { SavingsGoalItem } from '../../../utils/cache/itemMeta';
import type { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { Check } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../../app/models';
import { SheetHeader } from '../../ui/SheetHeader';

export interface FixedViewGoalPickerProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  setLinkedGoalId: (value: SetStateAction<string>) => void;
  commitInlineChanges: (overrides?: Partial<FixedExpenseItem>) => void;
  linkedGoalId: string;
  availableGoals: SavingsGoalItem[];
  formatKr: (val: number) => string;
}

export const FixedViewGoalPicker: React.FC<FixedViewGoalPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  setLinkedGoalId,
  commitInlineChanges,
  linkedGoalId,
  availableGoals,
  formatKr,
}) => (
  <>
    {subView === 'goal-picker' && (
      <div className={`${slideAnimClass} space-y-4`}>
        <SheetHeader title="Koppla till sparmål" onBack={() => navigateSubView(pickerReturnView, 'back')} onClose={onClose} flush />

        <div className="ui-sheet-group">
          <button
            type="button"
            onClick={() => {
              setLinkedGoalId('');
              if (pickerReturnView === 'details') {
                commitInlineChanges({ linkedGoalId: '' });
              }
              navigateSubView(pickerReturnView, 'back');
            }}
            className="ui-row-btn"
          >
            <span
              className={`truncate ${
                !linkedGoalId
                  ? 'font-medium text-[var(--text-primary)]'
                  : 'font-normal text-[var(--text-secondary)]'
              }`}
            >
              Inget sparmål
            </span>
            {!linkedGoalId && (
              <Check size={16} className="text-[var(--accent-color)] shrink-0" />
            )}
          </button>

          {availableGoals.map((g) => {
            const isSel = g.id === linkedGoalId;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setLinkedGoalId(g.id);
                  if (pickerReturnView === 'details') {
                    commitInlineChanges({ linkedGoalId: g.id });
                  }
                  navigateSubView(pickerReturnView, 'back');
                }}
                className="ui-row-btn"
              >
                <div className="min-w-0 text-left">
                  <span
                    className={`block truncate ${
                      isSel
                        ? 'font-medium text-[var(--text-primary)]'
                        : 'font-normal text-[var(--text-primary)]'
                    }`}
                  >
                    {g.name}
                  </span>
                  <span className="text-footnote text-[var(--text-secondary)] tabular-nums block mt-0.5">
                    {formatKr(g.currentAmount)} av {formatKr(g.targetAmount)}
                  </span>
                </div>
                {isSel && (
                  <Check size={16} className="text-[var(--accent-color)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    )}
  </>
);
