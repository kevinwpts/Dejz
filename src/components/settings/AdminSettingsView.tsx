import type { SettingsSubView } from '../SettingsTab';
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
  splitSimulatorActive: boolean;
  onToggleSplitSimulator: (active: boolean) => void;
  onStartOnboarding: () => void;
  onStartCreateGoalWizard: () => void;
  setSubView: (next: SettingsSubView) => void;
  onOpenAddFixedModal: () => void;
  onOpenPreviewFixedModal: (exp?: any) => void;
  onOpenAddIncomeModal: () => void;
  onOpenAddTransactionModal: () => void;
  onOpenPreviewTransactionModal: (tx?: any) => void;
  onOpenFriendsChat: (friendKey?: string) => void;
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
  splitSimulatorActive,
  onToggleSplitSimulator,
  onStartOnboarding,
  onStartCreateGoalWizard,
  setSubView,
  onOpenAddFixedModal,
  onOpenPreviewFixedModal,
  onOpenAddIncomeModal,
  onOpenAddTransactionModal,
  onOpenPreviewTransactionModal,
  onOpenFriendsChat,
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
        splitSimulatorActive={splitSimulatorActive}
        onToggleSplitSimulator={(act) => onToggleSplitSimulator?.(act)}
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
        onOpenFriendsChat={(fk) => onOpenFriendsChat?.(fk)}
        onOpenHouseholdBudget={() => setSubView('household')}
        onApplyFixedExpenses={onApplyFixedExpenses}
      />
    </div>
  );
};
