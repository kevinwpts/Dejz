import type { SettingsSubView } from './subviews';
import React from 'react';
import { AdminPanelView } from '../AdminSimulator';
import { TransactionItem, FixedExpenseItem } from '../../app/models';

export interface AdminSettingsViewProps {
  onStartOnboarding?: () => void;
  onStartCreateGoalWizard?: () => void;
  setSubView: (next: SettingsSubView) => void;
  onOpenAddFixedModal?: () => void;
  onOpenPreviewFixedModal?: (exp?: FixedExpenseItem) => void;
  onOpenAddIncomeModal?: () => void;
  onOpenAddTransactionModal?: () => void;
  onOpenPreviewTransactionModal?: (tx?: TransactionItem) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  onStartOnboarding,
  onStartCreateGoalWizard,
  setSubView,
  onOpenAddFixedModal,
  onOpenPreviewFixedModal,
  onOpenAddIncomeModal,
  onOpenAddTransactionModal,
  onOpenPreviewTransactionModal,
}) => {
  return (
    <div className="pb-28 animate-slide-in-right">
      <AdminPanelView
        onRestartOnboarding={() => onStartOnboarding?.()}
        onStartCreateGoalWizard={() => onStartCreateGoalWizard?.()}
        onOpenAddFixed={() => onOpenAddFixedModal?.()}
        onOpenPreviewFixed={() => onOpenPreviewFixedModal?.()}
        onOpenDiscoverSubscriptions={() => setSubView('discover')}
        onOpenAddIncome={() => onOpenAddIncomeModal?.()}
        onOpenAddTransaction={() => onOpenAddTransactionModal?.()}
        onOpenPreviewTransaction={() => onOpenPreviewTransactionModal?.()}
      />
    </div>
  );
};
