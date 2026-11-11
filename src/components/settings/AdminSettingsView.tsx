import type { SettingsSubView } from './subviews';
import React from 'react';
import { PeriodInfo } from '../../utils/periodEngine';
import { AdminPanelView } from '../AdminSimulator';
import { TransactionItem, FixedExpenseItem, IncomeItem } from '../HomeTab';

export interface AdminSettingsViewProps {
  period: PeriodInfo;
  userEmail: string;
  userName: string;
  userAvatar: string;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  onStartOnboarding: () => void;
  onStartCreateGoalWizard: () => void;
  setSubView: (next: SettingsSubView) => void;
  onOpenAddFixedModal: () => void;
  onOpenPreviewFixedModal: (exp?: any) => void;
  onOpenAddIncomeModal: () => void;
  onOpenAddTransactionModal: () => void;
  onOpenPreviewTransactionModal: (tx?: any) => void;
  onApplyFixedExpenses: (next: FixedExpenseItem[]) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  period,
  userEmail,
  userName,
  userAvatar,
  incomes,
  fixedExpenses,
  transactions,
  onStartOnboarding,
  onStartCreateGoalWizard,
  setSubView,
  onOpenAddFixedModal,
  onOpenPreviewFixedModal,
  onOpenAddIncomeModal,
  onOpenAddTransactionModal,
  onOpenPreviewTransactionModal,
  onApplyFixedExpenses,
}) => {
  return (
    <div className="pb-28 animate-slide-in-right">
      <AdminPanelView
        period={period}
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
        incomes={incomes}
        fixedExpenses={fixedExpenses}
        transactions={transactions}
        onRestartOnboarding={() => onStartOnboarding?.()}
        onStartCreateGoalWizard={() => {
          if (onStartCreateGoalWizard) {
            onStartCreateGoalWizard();
          } else {
            setSubView('goals');
          }
        }}
        onOpenAddFixed={() => onOpenAddFixedModal?.()}
        onOpenPreviewFixed={() => onOpenPreviewFixedModal?.()}
        onOpenDiscoverSubscriptions={() => setSubView('discover')}
        onOpenAddIncome={() => onOpenAddIncomeModal?.()}
        onOpenAddTransaction={() => onOpenAddTransactionModal?.()}
        onOpenPreviewTransaction={() => onOpenPreviewTransactionModal?.()}
        onOpenHouseholdBudget={() => setSubView('household')}
        onApplyFixedExpenses={onApplyFixedExpenses}
      />
    </div>
  );
};
