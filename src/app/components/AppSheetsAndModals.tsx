import { useApp } from '../AppContext';
import React from 'react';
import { BottomNav } from '../../components/BottomNav';
import { AddEntrySheet, isVoiceEntrySupported } from '../../components/VoiceEntry';
import { BalanceSheet } from '../../components/BalanceSheet';
import { getItemReceipts } from '../../utils/swedishDate';
import { setManualBalance } from '../../utils/cache/manualBalance';
import { useSavingsGoals } from '../../utils/hooks/useSavingsGoals';

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
    setIsSearchModalOpen,
    setIsNotificationsModalOpen,
    setSettingsSubView,
    setActiveTab,
    settingsSubView,
    displayTransactions,
    fixedExpenses,
  } = useApp();
  const savingsGoals = useSavingsGoals();
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
            setActiveTab(tab);
          }}
          onOpenDiscover={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSettingsSubView('discover');
            setActiveTab('settings');
          }}
          activeSettingsSubView={settingsSubView}
          goalsCount={savingsGoals.length}
          savedCount={displayTransactions.filter((t) => t.isHearted).length}
          packagesCount={displayTransactions.filter((t) => t.isWaitingForPackage).length}
          receiptsCount={
            displayTransactions.reduce((sum, t) => sum + getItemReceipts(t).length, 0) +
            fixedExpenses.reduce((sum, f) => sum + getItemReceipts(f).length, 0)
          }
        />
      </>
  );
};
