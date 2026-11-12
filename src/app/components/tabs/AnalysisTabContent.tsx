// Fliken "Analys": statistik över perioden (AnalysisTab) kopplad till appens data via useApp().
import React from 'react';
import { useApp } from '../../AppContext';
import { AnalysisTab } from '../../lazyScreens';

export const AnalysisTabContent: React.FC = () => {
  const {
    period,
    incomes,
    fixedExpenses,
    displayTransactions,
    totalIncome,
    totalFixedExpenses,
    totalVariableSpent,
    targetPayday,
    weekendHandling,
    excludeInternalTransfers,
    bankAccounts,
    userEmail,
    userName,
    setSelectedTransaction,
    setIsTxModalOpen,
    setSelectedFixedExpense,
    setIsFixedModalOpen,
    setSelectedIncome,
    setIsIncomeModalOpen,
  } = useApp();

  return (
    <AnalysisTab
      period={period}
      incomes={incomes}
      fixedExpenses={fixedExpenses}
      transactions={displayTransactions}
      totalIncome={totalIncome}
      totalFixedExpenses={totalFixedExpenses}
      totalVariableSpent={totalVariableSpent}
      targetPayday={targetPayday}
      weekendHandling={weekendHandling}
      excludeInternalTransfers={excludeInternalTransfers}
      bankAccounts={bankAccounts}
      userEmail={userEmail}
      userName={userName}
      onSelectTransaction={(tx) => {
        setSelectedTransaction(tx ?? null);
        setIsTxModalOpen(true);
      }}
      onSelectFixed={(exp) => {
        setSelectedFixedExpense(exp ?? null);
        setIsFixedModalOpen(true);
      }}
      onSelectIncome={(inc) => {
        setSelectedIncome(inc);
        setIsIncomeModalOpen(true);
      }}
    />
  );
};
