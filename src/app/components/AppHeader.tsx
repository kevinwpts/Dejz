import { useApp } from '../AppContext';
import React from 'react';

export const AppHeader: React.FC = () => {
  const {
    splitSimulatorActive,
    setMobileSimPane,
    mobileSimPane,
    handleToggleSplitSimulator,
  } = useApp();
  return (
      <>
        {/* Top Switcher Bar when simulator is active on narrower screens (<820px) */}
        {splitSimulatorActive && (
          <div className="min-[820px]:hidden sticky top-0 z-[160] bg-[var(--surface-color)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex-1 grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setMobileSimPane('mine')}
                className={`py-1.5 rounded-lg text-xs font-display font-semibold transition-colors cursor-pointer ${
                  mobileSimPane === 'mine'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Min app
              </button>
              <button
                type="button"
                onClick={() => setMobileSimPane('partner')}
                className={`py-1.5 rounded-lg text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mobileSimPane === 'partner'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Motpartens telefon</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSplitSimulator(false)}
              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              Stäng
            </button>
          </div>
        )}
      </>
  );
};
