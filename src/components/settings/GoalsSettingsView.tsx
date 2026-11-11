import React from 'react';
import { SavingsGoalsView } from '../SavingsGoalsView';
import { TransactionItem, AccountItem } from '../HomeTab';

export interface GoalsSettingsViewProps {
  userName: string;
  transactions: TransactionItem[];
  accounts: AccountItem[];
  selectedGoalId: string;
  onSelectGoalId: (goalId: string) => void;
}

export const GoalsSettingsView: React.FC<GoalsSettingsViewProps> = ({
  userName,
  transactions,
  accounts,
  selectedGoalId,
  onSelectGoalId,
}) => {
  return (
    <div className="animate-slide-in-right">
      <SavingsGoalsView
        userName={userName}
        transactions={transactions}
        accounts={accounts}
        selectedGoalId={selectedGoalId}
        onSelectGoalId={onSelectGoalId}
      />
    </div>
  );
};
