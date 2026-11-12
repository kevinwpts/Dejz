import React from 'react';
import { House, Receipt, ChartPieSlice, ArrowsDownUp, Plus } from '@phosphor-icons/react';

export type AppTab =
  | 'home'
  | 'transactions'
  | 'analysis'
  | 'fixed'
  | 'settings'
  | 'goals'
  | 'packages'
  | 'receipts'
  | 'account-detail';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  /** Plusknappen: "Lägg till köp" (prata in eller fyll i manuellt) – nåbar från alla flikar */
  onAddTransaction?: () => void;
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
    <>
      {/* Listan tonar mjukt bort bakom menyn i stället för att klippas */}
      <div aria-hidden="true" className="ui-tabbar-fade" />
      <nav
        className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm"
        style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 8px) + 12px)' }}
      >
        {/* Flytande glasdocka: 4 flikar + plusknapp i samma höjd */}
        <div className="flex items-center gap-2.5">
          <div className="ui-tabbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={isActive ? 'ui-tabbar-item-active' : 'ui-tabbar-item'}
                >
                  <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                  <span className="text-micro font-semibold tracking-normal leading-none whitespace-nowrap">
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
              className="ui-fab"
            >
              <Plus size={26} weight="bold" />
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
