// Fliken "Hem": kopplar hemkortet (HomeTab) till appens data och handlingar via useApp().
import React from 'react';
import { useApp } from '../../AppContext';
import { HomeTab } from '../../../components/HomeTab';
import { saveAccountMeta } from '../../../utils/cache/itemMeta';

export const HomeTabContent: React.FC = () => {
  const {
    hasActiveBankConnection,
    period,
    connectedBank,
    accounts,
    incomes,
    fixedExpenses,
    displayTransactions,
    totalBalance,
    totalIncome,
    totalFixedExpenses,
    totalVariableSpent,
    kvarAttSpendera,
    dagsbudget,
    isInitialLoading,
    setIsBankModalOpen,
    setSelectedTransaction,
    setIsTxModalOpen,
    setSelectedFixedExpense,
    setIsFixedModalOpen,
    setSelectedIncome,
    setIsIncomeModalOpen,
    setActiveTab,
    setSelectedGoalIdInView,
    activeManualBalance,
    setIsBalanceSheetOpen,
    setSelectedHistoryAccountId,
    setAccountMetaVersion,
    handleToggleHeart,
    handleTogglePackage,
    handleExcludeTransaction,
    handleUpdateTransaction,
  } = useApp();

  return (
    <HomeTab
      hasBankConnection={hasActiveBankConnection}
      period={period}
      connectedBank={connectedBank}
      accounts={accounts}
      incomes={incomes}
      fixedExpenses={fixedExpenses}
      transactions={displayTransactions}
      totalBalance={totalBalance}
      totalIncome={totalIncome}
      totalFixedExpenses={totalFixedExpenses}
      totalVariableSpent={totalVariableSpent}
      kvarAttSpendera={kvarAttSpendera}
      dagsbudget={dagsbudget}
      isInitialLoading={isInitialLoading}
      onOpenBank={() => setIsBankModalOpen(true)}
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
      onNavigateToFixed={() => setActiveTab('fixed')}
      onNavigateToTransactions={() => setActiveTab('transactions')}
      onNavigateToGoals={() => {
        setSelectedGoalIdInView(null);
        setActiveTab('goals');
      }}
      manualBalance={activeManualBalance}
      onOpenBalance={hasActiveBankConnection ? undefined : () => setIsBalanceSheetOpen(true)}
      onSelectAccount={(accountId) => {
        setSelectedHistoryAccountId(accountId);
        setActiveTab('transactions');
      }}
      onUpdateAccountMeta={(accountId, patch) => {
        saveAccountMeta(accountId, patch);
        setAccountMetaVersion((v) => v + 1);
      }}
      onToggleHeart={handleToggleHeart}
      onTogglePackage={handleTogglePackage}
      onExcludeTransaction={handleExcludeTransaction}
      onUpdateTransaction={handleUpdateTransaction}
    />
  );
};
