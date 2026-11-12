// Inkomstfönstret: väljare för kategori och utbetalningsdag.
import React from 'react';
import { X, Check, CaretLeft } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import { CategoryIcon } from '../../CategoryIcon';
import { DayOfMonthPicker } from '../../ui/DayOfMonthPicker';
import type { IncomeItem } from '../../../app/models';
import type {
  ModalSubView,
  NavigateSubView,
  PickerReturnView,
  SlideAnimClass,
} from './shared';

interface PickerHeaderProps {
  title: string;
  onBack: () => void;
  onClose: () => void;
}

const PickerHeader: React.FC<PickerHeaderProps> = ({ title, onBack, onClose }) => (
  <div className="ui-sheet-sub-header">
    <button
      type="button"
      onClick={onBack}
      title="Tillbaka"
      aria-label="Tillbaka"
      className="ui-icon-btn"
    >
      <CaretLeft size={15} weight="bold" />
    </button>
    <span className="ui-sheet-title">
      {title}
    </span>
    <button
      type="button" aria-label="Stäng"
      onClick={onClose}
      className="ui-icon-btn"
    >
      <X size={16} />
    </button>
  </div>
);

export interface IncomeViewCategoryPickerProps {
  subView: ModalSubView;
  slideAnimClass: SlideAnimClass;
  navigateSubView: NavigateSubView;
  pickerReturnView: PickerReturnView;
  onClose: () => void;
  availableIncomeCategories: string[];
  category: string;
  setCategory: (value: SetStateAction<string>) => void;
  commitInlineChanges: (overrides?: Partial<IncomeItem>) => void;
}

export const IncomeViewCategoryPicker: React.FC<IncomeViewCategoryPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  availableIncomeCategories,
  category,
  setCategory,
  commitInlineChanges,
}) => {
  if (subView !== 'category-picker') return null;
  return (
    <div className={`${slideAnimClass} space-y-4`}>
      <PickerHeader
        title="Välj kategori"
        onBack={() => navigateSubView(pickerReturnView, 'back')}
        onClose={onClose}
      />

      <div className="ui-sheet-group">
        {availableIncomeCategories.map((c) => {
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
  );
};

export interface IncomeViewDayPickerProps {
  subView: ModalSubView;
  slideAnimClass: SlideAnimClass;
  navigateSubView: NavigateSubView;
  pickerReturnView: PickerReturnView;
  onClose: () => void;
  payday: number;
  setPayday: (value: SetStateAction<number>) => void;
  commitInlineChanges: (overrides?: Partial<IncomeItem>) => void;
  displayName: string;
}

export const IncomeViewDayPicker: React.FC<IncomeViewDayPickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  payday,
  setPayday,
  commitInlineChanges,
  displayName,
}) => {
  if (subView !== 'day-picker') return null;
  return (
    <div className={`${slideAnimClass} space-y-4`}>
      <PickerHeader
        title="Välj utbetalningsdag"
        onBack={() => navigateSubView(pickerReturnView, 'back')}
        onClose={onClose}
      />

      <DayOfMonthPicker
        selectedDay={Number(payday) || 25}
        onSelectDay={(d) => {
          setPayday(d);
          if (pickerReturnView === 'details') {
            commitInlineChanges({ payday: d });
          }
          navigateSubView(pickerReturnView, 'back');
        }}
        mode="payday"
        title={`Utbetalningsdag för ${displayName}`}
      />
    </div>
  );
};
