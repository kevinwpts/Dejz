import React, { useState, useEffect, useRef } from 'react';
import {
  House,
  Receipt,
  ChartPieSlice,
  ArrowsDownUp,
  SquaresFour,
  Paperclip,
  PiggyBank,
  CaretRight,
  Plus,
} from '@phosphor-icons/react';

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
  /** Öppnar "Lägg till köp" – appens vanligaste handling, nåbar från alla flikar */
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
  goalsCount = 0,
  receiptsCount = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const tabs = [
    { id: 'home' as AppTab, label: 'Hem', icon: House },
    { id: 'transactions' as AppTab, label: 'Historik', icon: ArrowsDownUp },
    { id: 'analysis' as AppTab, label: 'Analys', icon: ChartPieSlice },
    { id: 'fixed' as AppTab, label: 'Fasta', icon: Receipt },
  ];

  const menuItems: {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    isSelected: boolean;
    onSelect: () => void;
  }[] = [
    {
      id: 'goals',
      label: 'Sparmål',
      icon: PiggyBank,
      badge: goalsCount > 0 ? goalsCount : undefined,
      isSelected: activeTab === 'goals',
      onSelect: () => onChangeTab('goals'),
    },
    {
      id: 'receipts',
      label: 'Kvitton',
      icon: Paperclip,
      badge: receiptsCount > 0 ? receiptsCount : undefined,
      isSelected: activeTab === 'receipts',
      onSelect: () => onChangeTab('receipts'),
    },
  ];

  const isMoreActive = isMenuOpen || menuItems.some((item) => item.isSelected);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <>
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <nav
        ref={navRef}
        className="fixed bottom-6 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm"
      >
        {/* Popover Menu for More Options */}
        {isMenuOpen && (
          <div className="mb-2.5 ml-auto w-60 bg-[var(--surface-color)]/95 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-2xl shadow-nav p-1.5 animate-scale-in origin-bottom-right space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = item.isSelected;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    item.onSelect();
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-semibold'
                      : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={17}
                      weight={isSelected ? 'fill' : 'regular'}
                      className={
                        isSelected
                          ? 'text-[var(--bg-color)]'
                          : 'text-[var(--text-secondary)]'
                      }
                    />
                    <span className="text-[13px]">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge !== undefined && (
                      <span
                        className={`text-xs tabular-nums ${
                          isSelected ? 'opacity-80' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <CaretRight
                      size={13}
                      className={isSelected ? 'opacity-80' : 'text-[var(--text-muted)]'}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Split Floating Glass Dock: Main 4-tab pill + Separated "Mer" button */}
        <div className="flex items-stretch gap-2.5">
          <div className="flex-1 bg-[var(--surface-color)]/92 dark:bg-[var(--surface-color)]/92 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-full shadow-nav px-2 py-1.5 flex items-center justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id && !isMenuOpen;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onChangeTab(tab.id);
                  }}
                  className={`flex-1 py-1.5 px-1 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer active:scale-95 ${
                    isActive
                      ? 'text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium'
                  }`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <span className="text-[10.5px] tracking-normal leading-none whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lägg till köp – alltid ett tryck bort */}
          {onAddTransaction && (
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onAddTransaction();
              }}
              aria-label="Lägg till köp"
              title="Lägg till köp"
              className="shrink-0 w-[52px] self-center aspect-square rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] shadow-nav flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 hover:opacity-90"
            >
              <Plus size={22} weight="bold" />
            </button>
          )}

          {/* Separated "Mer" Capsule Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Mer"
            aria-expanded={isMenuOpen}
            className={`bg-[var(--surface-color)]/92 dark:bg-[var(--surface-color)]/92 backdrop-blur-2xl border rounded-full shadow-nav px-4 py-1.5 flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer active:scale-95 shrink-0 min-w-[60px] ${
              isMoreActive
                ? 'border-[var(--border-control)] text-[var(--text-primary)] font-semibold'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium'
            }`}
          >
            <span className="relative inline-flex">
              <SquaresFour size={20} weight={isMoreActive ? 'fill' : 'regular'} />
            </span>
            <span className="text-[10.5px] tracking-normal leading-none whitespace-nowrap">
              Mer
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

