import React from 'react';
import { House, Receipt, ChartPieSlice, ArrowsDownUp, Plus } from '@phosphor-icons/react';

export type AppTab =
  | 'home'
  | 'transactions'
  | 'analysis'
  | 'fixed'
  | 'settings'
  | 'goals'
  | 'saved'
  | 'packages'
  | 'receipts'
  | 'friends'
  | 'account-detail';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  onOpenHousehold?: () => void;
  onOpenDiscover?: () => void;
  /** Plusknappen: "Lägg till köp" (prata in eller fyll i manuellt) – nåbar från alla flikar */
  onAddTransaction?: () => void;
  activeSettingsSubView?: string;
  goalsCount?: number;
  savedCount?: number;
  packagesCount?: number;
  receiptsCount?: number;
  friendsUnreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onAddTransaction,
}) => {
  const tabs = [
    { id: 'home' as AppTab, label: 'Hem', icon: House },
    { id: 'transactions' as AppTab, label: 'Historik', icon: ArrowsDownUp },
    { id: 'analysis' as AppTab, label: 'Analys', icon: ChartPieSlice },
    { id: 'fixed' as AppTab, label: 'Fasta', icon: Receipt },
  ];

  return (
    <nav className="fixed bottom-6 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
      {/* Flytande docka: 4 flikar + separat plusknapp för nytt köp */}
      <div className="flex items-stretch gap-2.5">
        <div className="flex-1 bg-[var(--surface-color)]/92 dark:bg-[var(--surface-color)]/92 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-full shadow-nav px-2 py-1.5 flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`flex-1 py-1.5 px-1 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-[var(--nav-active-color)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium'
                }`}
              >
                <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                <span className="text-[11px] tracking-normal leading-none whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {onAddTransaction && (
          <button
            type="button"
            onClick={onAddTransaction}
            aria-label="Lägg till köp"
            className="shrink-0 self-center w-[60px] h-[60px] rounded-full text-white flex items-center justify-center transition-transform duration-200 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #7356FF 0%, #5B3DF5 50%, #3F22C9 100%)',
              boxShadow: '0 10px 24px -8px rgba(63, 34, 201, 0.55)',
            }}
          >
            <Plus size={26} weight="bold" />
          </button>
        )}
      </div>
    </nav>
  );
};
