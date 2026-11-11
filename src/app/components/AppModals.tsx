import type { AccountItem, FixedExpenseItem, IncomeItem } from '../models';
import type { AppTab } from '../../components/BottomNav';
import type { BankAccount, BankConnection } from '../../services/bankService';
import type { SetStateAction } from 'react';
import React from 'react';
import { TransactionItem } from '../../components/HomeTab';
import { BankModal } from '../../components/modals/BankModal';
import { IncomeModal } from '../../components/modals/IncomeModal';
import { FixedExpenseModal } from '../../components/modals/FixedExpenseModal';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { AuthModal } from '../../components/modals/AuthModal';

export interface AppModalsProps {
  isBankModalOpen: boolean;
  userEmail: string;
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  preselectedBankName: string;
  setIsBankModalOpen: (value: SetStateAction<boolean>) => void;
  setPreselectedBankName: (value: SetStateAction<string>) => void;
  setIsAuthModalOpen: (value: SetStateAction<boolean>) => void;
  setConnections: (value: SetStateAction<BankConnection[]>) => void;
  setBankAccounts: (value: SetStateAction<BankAccount[]>) => void;
  refreshBankStatus: () => Promise<{ connections: BankConnection[]; accounts: BankAccount[]; }>;
  isIncomeModalOpen: boolean;
  selectedIncome: IncomeItem;
  accounts: AccountItem[];
  displayTransactions: TransactionItem[];
  setIsIncomeModalOpen: (value: SetStateAction<boolean>) => void;
  setSelectedIncome: (value: SetStateAction<IncomeItem>) => void;
  setSelectedTransaction: (value: SetStateAction<TransactionItem>) => void;
  setIsTxModalOpen: (value: SetStateAction<boolean>) => void;
  handleAddIncome: (data: Omit<IncomeItem, "id">) => Promise<IncomeItem>;
  handleUpdateIncome: (updated: IncomeItem) => Promise<void>;
  handleDeleteIncome: (id: string) => Promise<void>;
  isFixedModalOpen: boolean;
  selectedFixedExpense: FixedExpenseItem;
  fixedExpenses: FixedExpenseItem[];
  setIsFixedModalOpen: (value: SetStateAction<boolean>) => void;
  setSelectedFixedExpense: (value: SetStateAction<FixedExpenseItem>) => void;
  handleMarkAsFixed: (tx: TransactionItem, kind: "expense" | "income") => Promise<void>;
  handleAddFixed: (data: Omit<FixedExpenseItem, "id">) => Promise<FixedExpenseItem>;
  handleUpdateFixed: (updated: FixedExpenseItem) => Promise<void>;
  handleDeleteFixed: (id: string) => Promise<void>;
  isTxModalOpen: boolean;
  selectedTransaction: TransactionItem;
  incomes: IncomeItem[];
  userName: string;
  setSelectedChatFriendKey: (value: SetStateAction<string>) => void;
  setActiveTab: (value: SetStateAction<AppTab>) => void;
  txPrefill: { title: string; amount?: number; };
  setTxPrefill: (value: SetStateAction<{ title: string; amount?: number; }>) => void;
  handleAddTransaction: (data: Omit<TransactionItem, "id">) => Promise<void>;
  handleUpdateTransaction: (updated: TransactionItem, applyToSimilarIds?: string[], options?: { renameScope?: "single" | "same-merchant" | "chain"; renameTargetIds?: string[]; categoryTargetIds?: string[]; }) => Promise<void>;
  handleDeleteTransaction: (id: string) => Promise<void>;
  handleExcludeTransaction: (id: string, exclude: boolean, skipToast?: boolean) => Promise<void>;
  handleLinkTransactionToFixed: (tx: TransactionItem, targetItem: FixedExpenseItem | IncomeItem, kind: "expense" | "income") => Promise<void>;
  handleToggleHeart: (id: string, isHearted: boolean) => void;
  handleTogglePackage: (id: string, isWaitingForPackage: boolean) => void;
  isAuthModalOpen: boolean;
  setUserEmail: (value: SetStateAction<string>) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
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
  setSelectedChatFriendKey,
  setActiveTab,
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
}) => (
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
        onOpenFriendsChat={(friendKey) => {
          setIsTxModalOpen(false);
          setSelectedTransaction(null);
          setSelectedChatFriendKey(friendKey || null);
          setActiveTab('friends');
        }}
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
