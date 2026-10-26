import React from 'react';
import { X, Bell, CheckCircle, Lightbulb, ShieldCheck } from '@phosphor-icons/react';
import { PeriodInfo } from '../../utils/periodEngine';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: PeriodInfo;
  kvarAttSpendera: number;
  dagsbudget: number;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  period,
  kvarAttSpendera,
  dagsbudget,
}) => {
  if (!isOpen) return null;

  const formatKr = (amount: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg my-auto bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl p-6 border border-[var(--border-subtle)] shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Bell size={16} weight="duotone" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
              Notiser & Uppdateringar
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 mb-5">
          {/* Notification 1: Budget Status */}
          <div className="p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
              <CheckCircle size={18} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  Aktuell budgetstatus
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Idag</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Du har <span className="font-bold text-[var(--text-primary)]">{formatKr(kvarAttSpendera)}</span> kvar att spendera denna period ({period.daysRemaining} dagar kvar). Din rekommenderade dagsbudget är <span className="font-bold text-[var(--text-primary)]">{formatKr(dagsbudget)}/dag</span>.
              </p>
            </div>
          </div>

          {/* Notification 2: Bank Sync active */}
          <div className="p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 mt-0.5">
              <ShieldCheck size={18} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  Bankanslutning aktiv
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Realtid</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Dina konton är säkert synkade med banken. Transaktioner och reserverade köp uppdateras automatiskt.
              </p>
            </div>
          </div>

          {/* Notification 3: Tip */}
          <div className="p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 mt-0.5">
              <Lightbulb size={18} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  Tips
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Nytt</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Du kan klicka på valfri transaktion för att ändra dess kategori, lägga till anteckning, bifoga kvitto eller göra den till en fast utgift.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          Stäng
        </button>
      </div>
    </div>
  );
};
