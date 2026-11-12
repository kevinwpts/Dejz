import React from 'react';
import { PeriodInfo } from '../../utils/periodEngine';
import { FixedExpenseItem, IncomeItem, TransactionItem } from '../../app/models';
import { BottomSheet } from '../ui/BottomSheet';
import { Bell } from '@phosphor-icons/react';
import { SheetHeader } from '../ui/SheetHeader';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: PeriodInfo;
  kvarAttSpendera?: number;
  dagsbudget?: number;
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  transactions?: TransactionItem[];
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      maxHeightClass="max-h-[88dvh]"
      zIndexClass="z-[120]"
      disablePadding={true}
    >
      {/* Header */}
      <div className="px-5 shrink-0">
        <SheetHeader title="Notiser" onClose={onClose} flush className="!static !bg-transparent" />
      </div>

      {/* Empty State */}
      <div className="p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <section className="ui-empty-state">
          <span className="ui-empty-badge" aria-hidden="true">
            <Bell size={28} weight="fill" />
          </span>
          <p className="ui-empty-title">
            Inga nya notiser
          </p>
          <p className="ui-empty-sub">
            När något viktigt händer med din budget dyker det upp här.
          </p>
        </section>
      </div>
    </BottomSheet>
  );
};
