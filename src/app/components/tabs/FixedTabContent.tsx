// Fliken "Fasta": inkomster och fasta utgifter (FixedTab) kopplade till appens data via useApp().
import React from 'react';
import { useApp } from '../../AppContext';
import { FixedTab } from '../../lazyScreens';

export const FixedTabContent: React.FC = () => {
  const {
    periodRecurringMatches,
    period,
    incomes,
    fixedExpenses,
    totalIncome,
    totalFixedExpenses,
    displayTransactions,
    accounts,
    setSelectedIncome,
    setIsIncomeModalOpen,
    setSelectedFixedExpense,
    setIsFixedModalOpen,
    setSettingsSubView,
    setActiveTab,
    handleDeleteIncome,
    handleDeleteFixed,
    handleUpdateFixed,
  } = useApp();

  return (
    <FixedTab
      periodMatches={periodRecurringMatches}
      period={period}
      incomes={incomes}
      fixedExpenses={fixedExpenses}
      totalIncome={totalIncome}
      totalFixedExpenses={totalFixedExpenses}
      transactions={displayTransactions}
      accounts={accounts}
      onSelectIncome={(inc) => {
        setSelectedIncome(inc);
        setIsIncomeModalOpen(true);
      }}
      onSelectFixed={(exp) => {
        setSelectedFixedExpense(exp ?? null);
        setIsFixedModalOpen(true);
      }}
      onAddIncome={() => {
        setSelectedIncome(null);
        setIsIncomeModalOpen(true);
      }}
      onAddFixed={() => {
        setSelectedFixedExpense(null);
        setIsFixedModalOpen(true);
      }}
      onOpenDiscover={() => {
        setSettingsSubView('discover');
        setActiveTab('settings');
      }}
      onOpenGoals={() => setActiveTab('goals')}
      onDeleteIncome={handleDeleteIncome}
      onDeleteFixed={handleDeleteFixed}
      onUpdateFixed={handleUpdateFixed}
    />
  );
};
