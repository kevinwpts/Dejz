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
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--surface-color)] border-t border-[var(--border-subtle)] pb-[var(--safe-bottom,env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto grid grid-cols-3 px-3 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive
                  ? 'text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-[var(--text-primary)] rounded-full" />
              )}
              <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
              <span className="text-[11px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
