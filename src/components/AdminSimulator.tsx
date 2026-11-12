import React from 'react';
import { Play, PiggyBank, Sparkle, Plus, Receipt, Wallet } from '@phosphor-icons/react';

export interface AdminPanelProps {
  onRestartOnboarding: () => void;
  onStartCreateGoalWizard: () => void;
  onOpenAddFixed: () => void;
  onOpenPreviewFixed: () => void;
  onOpenDiscoverSubscriptions: () => void;
  onOpenAddIncome: () => void;
  onOpenAddTransaction: () => void;
  onOpenPreviewTransaction: () => void;
}

export const AdminPanelView: React.FC<AdminPanelProps> = ({
  onRestartOnboarding,
  onStartCreateGoalWizard,
  onOpenAddFixed,
  onOpenPreviewFixed,
  onOpenDiscoverSubscriptions,
  onOpenAddIncome,
  onOpenAddTransaction,
  onOpenPreviewTransaction,
}) => {
  return (
    <div className="space-y-5">
      {/* ============================================================== */}
      {/* TESTA STEG & FLÖDEN DIREKT                                     */}
      {/* ============================================================== */}
      <div className="space-y-1.5">
        <h3 className="ui-section-title px-1">Testa steg & flöden i appen</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onStartCreateGoalWizard}
            className="ui-shortcut-tile"
          >
            <PiggyBank size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Skapa sparmål
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Testa steg 1–5
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onRestartOnboarding}
            className="ui-shortcut-tile"
          >
            <Play size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Onboarding-guide
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Från första steget
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenPreviewFixed}
            className="ui-shortcut-tile"
          >
            <Receipt size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Fast utgift (Vy)
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Testa förhandsgranskning
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenPreviewTransaction}
            className="ui-shortcut-tile"
          >
            <Wallet size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Transaktion (Vy)
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Testa förhandsgranskning
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenDiscoverSubscriptions}
            className="ui-shortcut-tile"
          >
            <Sparkle size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Hitta abonnemang
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Skanna bankköp
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAddFixed}
            className="ui-shortcut-tile"
          >
            <Plus size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Ny fast utgift
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Öppna skapandevy
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAddIncome}
            className="ui-shortcut-tile"
          >
            <Plus size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Ny fast inkomst
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Öppna skapandevy
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAddTransaction}
            className="ui-shortcut-tile"
          >
            <Plus size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="ui-tile-title">
                Ny transaktion
              </span>
              <span className="text-caption text-[var(--text-secondary)] block truncate">
                Öppna skapandevy
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
