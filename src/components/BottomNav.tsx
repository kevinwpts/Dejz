import React, { useState, useEffect, useRef } from 'react';
import {
  House,
  Receipt,
  ChartPieSlice,
  ArrowsDownUp,
  SquaresFour,
  Heart,
  Package,
  Paperclip,
  CaretRight,
} from '@phosphor-icons/react';

export type AppTab =
  | 'home'
  | 'transactions'
  | 'analysis'
  | 'fixed'
  | 'settings'
  | 'saved'
  | 'packages'
  | 'receipts';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  savedCount?: number;
  packagesCount?: number;
  receiptsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  savedCount = 0,
  packagesCount = 0,
  receiptsCount = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const tabs = [
    { id: 'home' as AppTab, label: 'Hem', icon: House },
    { id: 'transactions' as AppTab, label: 'Historik', icon: ArrowsDownUp },
    { id: 'analysis' as AppTab, label: 'Analys', icon: ChartPieSlice },
    { id: 'fixed' as AppTab, label: 'Ekonomi', icon: Receipt },
  ];

  const menuItems = [
    {
      id: 'saved' as AppTab,
      label: 'Sparade köp',
      icon: Heart,
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'packages' as AppTab,
      label: 'Paket',
      icon: Package,
      badge: packagesCount > 0 ? packagesCount : undefined,
    },
    {
      id: 'receipts' as AppTab,
      label: 'Kvitton',
      icon: Paperclip,
      badge: receiptsCount > 0 ? receiptsCount : undefined,
    },
  ];

  const isMoreActive = isMenuOpen || menuItems.some((item) => item.id === activeTab);

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
          <div className="mb-2.5 ml-auto w-56 bg-[var(--surface-color)]/95 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-3xl shadow-modal p-2 animate-slide-up space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onChangeTab(item.id);
                  }}
                  className={`w-full px-3.5 py-3 rounded-2xl flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold'
                      : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={17}
                      weight={
                        item.id === 'saved' || item.id === 'packages'
                          ? 'fill'
                          : isSelected
                          ? 'bold'
                          : 'regular'
                      }
                      className={
                        !isSelected
                          ? item.id === 'saved'
                            ? 'text-rose-500'
                            : item.id === 'packages'
                            ? 'text-amber-500'
                            : undefined
                          : undefined
                      }
                    />
                    <span className="text-xs">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge !== undefined && (
                      <span
                        className={`text-xs tabular-nums ${
                          isSelected ? 'opacity-80' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <CaretRight
                      size={14}
                      className={isSelected ? 'opacity-80' : 'text-[var(--text-muted)]'}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Split Dock: Main Footer Pill + Detached "Mer" Button Outside */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[var(--surface-color)]/90 dark:bg-[var(--surface-color)]/90 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-3xl shadow-modal p-1.5 flex items-center justify-around">
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
                  className={`flex-1 py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium'
                  }`}
                >
                  <Icon size={19} weight={isActive ? 'fill' : 'regular'} />
                  <span className="text-[10.5px] tracking-tight leading-none">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Standalone "Mer" Button Outside Main Footer */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Mer"
            className={`shrink-0 w-[58px] self-stretch rounded-3xl backdrop-blur-2xl border border-[var(--border-subtle)] shadow-modal p-1.5 flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer active:scale-95 ${
              isMoreActive
                ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold border-transparent'
                : 'bg-[var(--surface-color)]/90 dark:bg-[var(--surface-color)]/90 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium'
            }`}
          >
            <SquaresFour size={19} weight={isMoreActive ? 'fill' : 'regular'} />
            <span className="text-[10.5px] tracking-tight leading-none">Mer</span>
          </button>
        </div>
      </nav>
    </>
  );
};
