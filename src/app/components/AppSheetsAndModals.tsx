import { useApp } from '../AppContext';
import React, { useEffect } from 'react';
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
  // Undersidor med tillbakaknapp (inställningar, sparmål, kvitton, paket, juridik) visar ingen
  // bottenmeny – som i iOS. Sidan får då mindre luft i nederkant (se html[data-tabbar] i index.css).
  const isPushedPage =
    activeTab === 'settings' ||
    activeTab === 'goals' ||
    activeTab === 'packages' ||
    activeTab === 'receipts';
  useEffect(() => {
    const root = document.documentElement;
    if (isPushedPage) root.setAttribute('data-tabbar', 'hidden');
    else root.removeAttribute('data-tabbar');
    return () => root.removeAttribute('data-tabbar');
  }, [isPushedPage]);
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

        {!isPushedPage && (
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
        )}
      </>
  );
};
