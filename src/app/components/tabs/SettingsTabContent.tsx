// Fliken "Inställningar": SettingsTab kopplad till appens data och handlingar via useApp().
import React from 'react';
import { useApp } from '../../AppContext';
import { SettingsTab } from '../../lazyScreens';
import { getItemReceipts } from '../../../utils/swedishDate';
import { useSavingsGoals } from '../../../utils/hooks/useSavingsGoals';

export const SettingsTabContent: React.FC = () => {
  const {
    connectedBank,
    connections,
    bankAccounts,
    accounts,
    refreshBankStatus,
    syncingBank,
    targetPayday,
    weekendHandling,
    userEmail,
    userName,
    userAvatar,
    excludeInternalTransfers,
    displayTransactions,
    fixedExpenses,
    incomes,
    handleToggleExcludeInternalTransfers,
    handleUpdatePayday,
    handleUpdateWeekendHandling,
    handleUpdateAvatar,
    setIsBankModalOpen,
    handleDisconnectBank,
    handleSyncBank,
    setIsAuthModalOpen,
    handleSignOut,
    handleDeleteAccount,
    handleResetAccount,
    setSelectedTransaction,
    setIsTxModalOpen,
    handleAddIncome,
    handleAddFixed,
    handleUpdateIncome,
    handleUpdateFixed,
    handleUpdateEmail,
    handleUpdateName,
    setIsOnboardingActive,
    handleCategoryMutated,
    settingsSubView,
    setSettingsSubView,
    setSelectedGoalIdInView,
    setAutoOpenGoalWizard,
    setActiveTab,
    setSelectedFixedExpense,
    setIsFixedModalOpen,
    setSelectedIncome,
    setIsIncomeModalOpen,
  } = useApp();
  const savingsGoals = useSavingsGoals();

  return (
    <SettingsTab
      connectedBank={connectedBank}
      connections={connections}
      bankAccounts={bankAccounts}
      accounts={accounts}
      onRefreshBankStatus={refreshBankStatus}
      syncingBank={syncingBank}
      targetPayday={targetPayday}
      weekendHandling={weekendHandling}
      userEmail={userEmail}
      userName={userName}
      userAvatar={userAvatar}
      excludeInternalTransfers={excludeInternalTransfers}
      transactions={displayTransactions}
      fixedExpenses={fixedExpenses}
      incomes={incomes}
      onToggleExcludeInternalTransfers={handleToggleExcludeInternalTransfers}
      onUpdatePayday={handleUpdatePayday}
      onUpdateWeekendHandling={handleUpdateWeekendHandling}
      onUpdateAvatar={handleUpdateAvatar}
      onOpenBank={() => setIsBankModalOpen(true)}
      onDisconnectBank={handleDisconnectBank}
      onSyncBank={handleSyncBank}
      onOpenAuth={() => setIsAuthModalOpen(true)}
      onSignOut={handleSignOut}
      onDeleteAccount={handleDeleteAccount}
      onResetAccount={handleResetAccount}
      onSelectTransaction={(tx) => {
        setSelectedTransaction(tx ?? null);
        setIsTxModalOpen(true);
      }}
      onAddIncome={handleAddIncome}
      onAddFixed={handleAddFixed}
      onUpdateIncome={handleUpdateIncome}
      onUpdateFixed={handleUpdateFixed}
      onUpdateEmail={handleUpdateEmail}
      onUpdateName={handleUpdateName}
      onStartOnboarding={() => setIsOnboardingActive(true)}
      onCategoryMutated={handleCategoryMutated}
      subView={settingsSubView}
      onSubViewChange={(next) => {
        setSelectedGoalIdInView(null);
        setSettingsSubView(next);
      }}
      onStartCreateGoalWizard={() => {
        setSelectedGoalIdInView(null);
        setAutoOpenGoalWizard(true);
        setActiveTab('goals');
      }}
      onOpenAddFixedModal={() => {
        setSelectedFixedExpense(null);
        setIsFixedModalOpen(true);
      }}
      onOpenPreviewFixedModal={(exp) => {
        setSelectedFixedExpense(exp ?? null);
        setIsFixedModalOpen(true);
      }}
      onOpenAddIncomeModal={() => {
        setSelectedIncome(null);
        setIsIncomeModalOpen(true);
      }}
      onOpenAddTransactionModal={() => {
        setSelectedTransaction(null);
        setIsTxModalOpen(true);
      }}
      onOpenPreviewTransactionModal={(tx) => {
        setSelectedTransaction(tx ?? null);
        setIsTxModalOpen(true);
      }}
      onOpenSection={(section) => {
        setSelectedGoalIdInView(null);
        setActiveTab(section);
      }}
      sectionCounts={{
        goals: savingsGoals.length,
        packages: displayTransactions.filter((t) => t.isWaitingForPackage).length,
        receipts:
          displayTransactions.reduce((sum, t) => sum + getItemReceipts(t).length, 0) +
          fixedExpenses.reduce((sum, f) => sum + getItemReceipts(f).length, 0),
      }}
    />
  );
};
