import React from 'react';
import { House, Receipt, ArrowsDownUp } from '@phosphor-icons/react';

export type AppTab = 'home' | 'fixed' | 'transactions' | 'settings';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'home' as AppTab, label: 'Hem', icon: House },
    { id: 'fixed' as AppTab, label: 'Ekonomi', icon: Receipt },
    { id: 'transactions' as AppTab, label: 'Historik', icon: ArrowsDownUp },
  ];

  return (
    <nav className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm pb-[env(safe-area-inset-bottom,0px)]">
      <div className="bg-[var(--surface-color)]/95 dark:bg-[var(--surface-color)]/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/35 p-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold shadow-xs scale-[1.02]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium'
              }`}
            >
              <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
              <span className="text-xs tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
