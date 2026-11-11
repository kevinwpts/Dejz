import type { AppTab } from '../../components/BottomNav';
import type { FixedExpenseItem } from '../models';
import type { ManualBalance } from '../../utils/appCache';
import type { SettingsSubView } from '../../components/SettingsTab';
import type { SetStateAction } from 'react';
import React from 'react';
import { BottomNav } from '../../components/BottomNav';
import { AddEntrySheet, isVoiceEntrySupported } from '../../components/VoiceEntry';
import { BalanceSheet } from '../../components/BalanceSheet';
import { TransactionItem } from '../../components/HomeTab';
import { getItemReceipts } from '../../utils/swedishDate';
import { setManualBalance, getSavingsGoals } from '../../utils/appCache';

export interface AppSheetsAndModalsProps {
  isBalanceSheetOpen: boolean;
  setIsBalanceSheetOpen: (value: SetStateAction<boolean>) => void;
  activeManualBalance: ManualBalance;
  isAddSheetOpen: boolean;
  setIsAddSheetOpen: (value: SetStateAction<boolean>) => void;
  setSelectedTransaction: (value: SetStateAction<TransactionItem>) => void;
  setTxPrefill: (value: SetStateAction<{ title: string; amount?: number; }>) => void;
  setIsTxModalOpen: (value: SetStateAction<boolean>) => void;
  activeTab: "transactions" | "home" | "analysis" | "fixed" | "settings" | "goals" | "saved" | "packages" | "receipts" | "friends" | "account-detail";
  selectedChatFriendKey: string;
  setIsSearchModalOpen: (value: SetStateAction<boolean>) => void;
  setIsNotificationsModalOpen: (value: SetStateAction<boolean>) => void;
  setSettingsSubView: (value: SetStateAction<SettingsSubView>) => void;
  setSelectedChatFriendKey: (value: SetStateAction<string>) => void;
  setActiveTab: (value: SetStateAction<AppTab>) => void;
  settingsSubView: "goals" | "main" | "admin" | "household" | "discover" | "categories" | "paymentMethods" | "period" | "bank" | "appearance" | "security" | "preferences" | "profile" | "feedback" | "legal" | "privacy" | "terms" | "psd2" | "cookies";
  friendsUnreadCount: number;
  displayTransactions: TransactionItem[];
  fixedExpenses: FixedExpenseItem[];
}

export const AppSheetsAndModals: React.FC<AppSheetsAndModalsProps> = ({
  isBalanceSheetOpen,
  setIsBalanceSheetOpen,
  activeManualBalance,
  isAddSheetOpen,
  setIsAddSheetOpen,
  setSelectedTransaction,
  setTxPrefill,
  setIsTxModalOpen,
  activeTab,
  selectedChatFriendKey,
  setIsSearchModalOpen,
  setIsNotificationsModalOpen,
  setSettingsSubView,
  setSelectedChatFriendKey,
  setActiveTab,
  settingsSubView,
  friendsUnreadCount,
  displayTransactions,
  fixedExpenses,
}) => (
    <>
      <BalanceSheet
        isOpen={isBalanceSheetOpen}
        onClose={() => setIsBalanceSheetOpen(false)}
        current={activeManualBalance}
        onSave={(amount) => {
          setManualBalance({ amount, at: new Date().toISOString() });
          setIsBalanceSheetOpen(false);
        }}
        onClear={() => {
          setManualBalance(null);
          setIsBalanceSheetOpen(false);
        }}
      />

      <AddEntrySheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onResult={(result) => {
          setIsAddSheetOpen(false);
          setSelectedTransaction(null);
          setTxPrefill(result);
          setIsTxModalOpen(true);
        }}
        onManual={() => {
          setIsAddSheetOpen(false);
          setSelectedTransaction(null);
          setTxPrefill(null);
          setIsTxModalOpen(true);
        }}
      />

      {!(activeTab === 'friends' && Boolean(selectedChatFriendKey)) && (
        <BottomNav
          activeTab={activeTab}
          onAddTransaction={() => {
            setSelectedTransaction(null);
            setTxPrefill(null);
            // Utan taligenkänning i webbläsaren går vi direkt till manuell inmatning
            if (isVoiceEntrySupported()) setIsAddSheetOpen(true);
            else setIsTxModalOpen(true);
          }}
          onChangeTab={(tab) => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSettingsSubView('main');
            if (tab !== 'friends') {
              setSelectedChatFriendKey(null);
            }
            setActiveTab(tab);
          }}
          onOpenHousehold={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSettingsSubView('household');
            setActiveTab('settings');
          }}
          onOpenDiscover={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSettingsSubView('discover');
            setActiveTab('settings');
          }}
          activeSettingsSubView={settingsSubView}
          goalsCount={getSavingsGoals().length}
          friendsUnreadCount={friendsUnreadCount}
          savedCount={displayTransactions.filter((t) => t.isHearted).length}
          packagesCount={displayTransactions.filter((t) => t.isWaitingForPackage).length}
          receiptsCount={
            displayTransactions.reduce((sum, t) => sum + getItemReceipts(t).length, 0) +
            fixedExpenses.reduce((sum, f) => sum + getItemReceipts(f).length, 0)
          }
        />
      )}
    </>
);
