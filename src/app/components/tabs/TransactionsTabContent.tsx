// Fliken "Transaktioner": alla köp i perioden (TransactionsTab) kopplade till appens data via useApp().
import React from 'react';
import { useApp } from '../../AppContext';
import { TransactionsTab } from '../../lazyScreens';

export const TransactionsTabContent: React.FC = () => {
  const {
    displayTransactions,
    fixedExpenses,
    incomes,
    totalVariableSpent,
    period,
    targetPayday,
    weekendHandling,
    accounts,
    selectedHistoryAccountId,
    setSelectedHistoryAccountId,
    setSelectedTransaction,
    setIsTxModalOpen,
    handleDeleteTransaction,
    handleToggleHeart,
    handleTogglePackage,
    handleExcludeTransaction,
  } = useApp();

  return (
    <TransactionsTab
      transactions={displayTransactions}
      fixedExpenses={fixedExpenses}
      incomes={incomes}
      totalVariableSpent={totalVariableSpent}
      period={period}
      targetPayday={targetPayday}
      weekendHandling={weekendHandling}
      accounts={accounts}
      selectedAccountId={selectedHistoryAccountId}
      onSelectAccount={setSelectedHistoryAccountId}
      onSelectTransaction={(tx) => {
        setSelectedTransaction(tx ?? null);
        setIsTxModalOpen(true);
      }}
      onAddTransaction={() => {
        setSelectedTransaction(null);
        setIsTxModalOpen(true);
      }}
      onDeleteTransaction={handleDeleteTransaction}
      onToggleHeart={handleToggleHeart}
      onTogglePackage={handleTogglePackage}
      onExcludeTransaction={handleExcludeTransaction}
    />
  );
};
