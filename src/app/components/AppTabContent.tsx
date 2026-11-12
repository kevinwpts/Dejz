import React from 'react';
import { useApp } from '../AppContext';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { HomeTabContent } from './tabs/HomeTabContent';
import { FixedTabContent } from './tabs/FixedTabContent';
import { AnalysisTabContent } from './tabs/AnalysisTabContent';
import { TransactionsTabContent } from './tabs/TransactionsTabContent';
import { GoalsTab } from './tabs/GoalsTab';
import { SavedTab } from './tabs/SavedTab';
import { PackagesTab } from './tabs/PackagesTab';
import { ReceiptsTab } from './tabs/ReceiptsTab';
import { SettingsTabContent } from './tabs/SettingsTabContent';

/** Innehållet för den valda fliken, med "dra ner för att uppdatera". Varje flik ligger i mappen tabs/. */
export const AppTabContent: React.FC = () => {
  const { activeTab, performSilentBankSync, refreshBankStatus } = useApp();
  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
      <PullToRefresh
        onRefresh={async () => {
          await performSilentBankSync(true);
          await refreshBankStatus();
        }}
      >
        <>
          {activeTab === 'home' && <HomeTabContent />}
          {activeTab === 'fixed' && <FixedTabContent />}
          {activeTab === 'analysis' && <AnalysisTabContent />}
          {activeTab === 'transactions' && <TransactionsTabContent />}
          {activeTab === 'goals' && <GoalsTab />}
          {activeTab === 'saved' && <SavedTab />}
          {activeTab === 'packages' && <PackagesTab />}
          {activeTab === 'receipts' && <ReceiptsTab />}
          {activeTab === 'settings' && <SettingsTabContent />}
        </>
      </PullToRefresh>
    </main>
  );
};
