import React from 'react';
import { X } from '@phosphor-icons/react';
import { PeriodInfo } from '../../utils/periodEngine';
import { FixedExpenseItem, IncomeItem, TransactionItem } from '../HomeTab';
import { BottomSheet } from '../ui/BottomSheet';
import { EmptyClusterArtwork } from '../ui/VisualArtwork';

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
      surfaceClass="bg-[var(--bg-color)]"
      maxHeightClass="max-h-[88dvh]"
      zIndexClass="z-[120]"
      disablePadding={true}
    >
      {/* Header */}
      <div className="px-5 pt-1 pb-3.5 flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0">
        <span className="ui-sheet-title">
          Notiser
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn-surface"
        >
          <X size={16} />
        </button>
      </div>

      {/* Empty State */}
      <div className="p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <section className="ui-empty-state">
          <EmptyClusterArtwork variant="notifications" />
          <p className="ui-empty-title">
            Inga nya notiser
          </p>
          <p className="ui-empty-sub">
            När något viktigt händer med dina konton eller räkningar dyker det upp här.
          </p>
        </section>
      </div>
    </BottomSheet>
  );
};
