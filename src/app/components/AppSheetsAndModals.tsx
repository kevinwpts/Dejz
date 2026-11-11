import { useApp } from '../AppContext';
import React from 'react';
import { BottomNav } from '../../components/BottomNav';
import { AddEntrySheet, isVoiceEntrySupported } from '../../components/VoiceEntry';
import { BalanceSheet } from '../../components/BalanceSheet';
import { getItemReceipts } from '../../utils/swedishDate';
import { setManualBalance, getSavingsGoals } from '../../utils/appCache';

export const AppSheetsAndModals: React.FC = () => {
  const {
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
  } = useApp();
  return (
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
};
