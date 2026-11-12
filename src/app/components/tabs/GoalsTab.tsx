// Fliken "Sparmål": sparmålen (SavingsGoalsView) kopplade till appens data via useApp().
import React from 'react';
import { useApp } from '../../AppContext';
import { SavingsGoalsView } from '../../lazyScreens';

export const GoalsTab: React.FC = () => {
  const {
    handleAddFixed,
    targetPayday,
    showFeedbackToast,
    userName,
    displayTransactions,
    accounts,
    totalBalance,
    selectedGoalIdInView,
    setSelectedGoalIdInView,
    autoOpenGoalWizard,
    setAutoOpenGoalWizard,
  } = useApp();

  return (
    <SavingsGoalsView
      onCreateMonthlySaving={({ goalId, goalName, amount }) => {
        void handleAddFixed({
          name: `Sparande: ${goalName}`,
          amount,
          dueDay: targetPayday || 25,
          category: 'Sparande',
          paymentMethod: 'Överföring',
          linkedGoalId: goalId,
        });
        showFeedbackToast({ id: `monthly-saving-${goalId}`, title: 'Månadssparande tillagt' });
      }}
      userName={userName}
      transactions={displayTransactions}
      accounts={accounts}
      totalBalance={totalBalance}
      selectedGoalId={selectedGoalIdInView}
      onSelectGoalId={setSelectedGoalIdInView}
      autoOpenCreate={autoOpenGoalWizard}
      onAutoOpenConsumed={() => setAutoOpenGoalWizard(false)}
    />
  );
};
