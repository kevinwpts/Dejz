import { BankModal, IncomeModal, FixedExpenseModal, TransactionModal, AuthModal } from '../lazyScreens';
import { useApp } from '../AppContext';
import React from 'react';

export const AppModals: React.FC = () => {
  const {
    isBankModalOpen,
    userEmail,
    connections,
    bankAccounts,
    preselectedBankName,
    setIsBankModalOpen,
    setPreselectedBankName,
    setIsAuthModalOpen,
    setConnections,
    setBankAccounts,
    refreshBankStatus,
    isIncomeModalOpen,
    selectedIncome,
    accounts,
    displayTransactions,
    setIsIncomeModalOpen,
    setSelectedIncome,
    setSelectedTransaction,
    setIsTxModalOpen,
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    isFixedModalOpen,
    selectedFixedExpense,
    fixedExpenses,
    setIsFixedModalOpen,
    setSelectedFixedExpense,
    handleMarkAsFixed,
    handleAddFixed,
    handleUpdateFixed,
    handleDeleteFixed,
    isTxModalOpen,
    selectedTransaction,
    incomes,
    userName,
    txPrefill,
    setTxPrefill,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleExcludeTransaction,
    handleLinkTransactionToFixed,
    handleToggleHeart,
    handleTogglePackage,
    isAuthModalOpen,
    setUserEmail,
  } = useApp();
  return (
      <>
        <BankModal
          isOpen={isBankModalOpen}
          userEmail={userEmail}
          connections={connections}
          bankAccounts={bankAccounts}
          preselectedBankName={preselectedBankName}
          onClose={() => {
            setIsBankModalOpen(false);
            setPreselectedBankName(null);
          }}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onBankStateUpdated={(conns, accs) => {
            setConnections(conns);
            setBankAccounts(accs);
            refreshBankStatus();
          }}
        />

        <IncomeModal
          isOpen={isIncomeModalOpen}
          initialIncome={selectedIncome}
          accounts={accounts}
          transactions={displayTransactions}
          onClose={() => {
            setIsIncomeModalOpen(false);
            setSelectedIncome(null);
          }}
          onSelectTransaction={(tx) => {
            setIsIncomeModalOpen(false);
            setSelectedIncome(null);
            setSelectedTransaction(tx);
            setIsTxModalOpen(true);
          }}
          onSave={handleAddIncome}
          onUpdate={handleUpdateIncome}
          onDelete={handleDeleteIncome}
        />

        <FixedExpenseModal
          isOpen={isFixedModalOpen}
          initialExpense={selectedFixedExpense}
          fixedExpenses={fixedExpenses}
          accounts={accounts}
          transactions={displayTransactions}
          onClose={() => {
            setIsFixedModalOpen(false);
            setSelectedFixedExpense(null);
          }}
          onSelectTransaction={(tx) => {
            setIsFixedModalOpen(false);
            setSelectedFixedExpense(null);
            setSelectedTransaction(tx);
            setIsTxModalOpen(true);
          }}
          onMarkAsFixed={handleMarkAsFixed}
          onSave={handleAddFixed}
          onUpdate={handleUpdateFixed}
          onDelete={handleDeleteFixed}
        />

        <TransactionModal
          isOpen={isTxModalOpen}
          initialTransaction={selectedTransaction}
          transactions={displayTransactions}
          accounts={accounts}
          fixedExpenses={fixedExpenses}
          incomes={incomes}
          userEmail={userEmail}
          userName={userName}
          prefill={txPrefill}
          onClose={() => {
            setIsTxModalOpen(false);
            setSelectedTransaction(null);
            setTxPrefill(null);
          }}
          onSelectTransaction={(tx) => {
            setSelectedTransaction(tx);
          }}
          onSave={handleAddTransaction}
          onUpdate={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
          onExclude={handleExcludeTransaction}
          onMarkAsFixed={handleMarkAsFixed}
          onLinkToFixed={handleLinkTransactionToFixed}
          onToggleHeart={handleToggleHeart}
          onTogglePackage={handleTogglePackage}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(email) => {
            setUserEmail(email);
            refreshBankStatus();
          }}
        />
      </>
  );
};
