import { useApp } from '../AppContext';
import React from 'react';
import { BottomNav } from '../../components/BottomNav';
import { AddEntrySheet, isVoiceEntrySupported } from '../../components/VoiceEntry';
import { BalanceSheet } from '../../components/BalanceSheet';
import { setManualBalance } from '../../utils/cache/manualBalance';

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
        />
      </>
  );
};
