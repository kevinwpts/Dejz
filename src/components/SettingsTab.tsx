import React, { useRef } from 'react';
import {
  Bank,
  ArrowClockwise,
  UserCircle,
  SignOut,
  CalendarBlank,
  Camera,
  ShieldCheck,
  CreditCard,
  Info,
} from '@phosphor-icons/react';
import { BankConnection } from '../services/bankService';
import { PeriodInfo, WeekendHandlingMode } from '../utils/periodEngine';

interface SettingsTabProps {
  period: PeriodInfo;
  connectedBank: string | null;
  connections: BankConnection[];
  syncingBank: boolean;
  targetPayday: number;
  weekendHandling: WeekendHandlingMode;
  userEmail: string | null;
  userAvatar?: string | null;
  onUpdatePayday: (day: number) => void;
  onUpdateWeekendHandling: (mode: WeekendHandlingMode) => void;
  onUpdateAvatar?: (avatarDataUrl: string | null) => void;
  onOpenBank: () => void;
  onDisconnectBank: (connectionId?: string) => void;
  onSyncBank: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onResetAccount: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  period,
  connectedBank,
  connections,
  syncingBank,
  targetPayday,
  weekendHandling,
  userEmail,
  userAvatar,
  onUpdatePayday,
  onUpdateWeekendHandling,
  onUpdateAvatar,
  onOpenBank,
  onDisconnectBank,
  onSyncBank,
  onOpenAuth,
  onSignOut,
  onDeleteAccount,
  onResetAccount,
}) => {
  const hasActiveBank = Boolean(connectedBank || connections.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAvatar) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
      {/* Profile Header Card */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-6 flex items-center gap-4 shadow-sm">
        <div className="relative group shrink-0">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] border-2 border-[var(--border-subtle)] overflow-hidden flex items-center justify-center shadow-inner">
            {userAvatar ? (
              <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
            ) : userEmail ? (
              <span className="font-display font-bold text-xl uppercase text-[var(--text-primary)]">
                {userEmail.charAt(0)}
              </span>
            ) : (
              <UserCircle size={36} weight="duotone" className="text-[var(--text-secondary)]" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] shadow-md hover:scale-105 transition-transform"
            title="Byt profilbild"
          >
            <Camera size={12} weight="bold" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)] truncate">
            {userEmail || 'Gästkonto'}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                userEmail ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{userEmail ? 'Molnsynk aktiverad' : 'Lokalt läge (ej inloggad)'}</span>
          </p>
        </div>
      </div>

      {/* Grouped Settings: Account & Cloud */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/50">
          <span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
            <ShieldCheck size={15} className="text-[var(--text-primary)]" />
            <span>Konto & Molnsynk</span>
          </span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {userEmail ? (
            <div className="p-4 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[var(--text-primary)] block">Inloggad e-post</span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">{userEmail}</span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 hover:bg-rose-500/20 transition-colors"
              >
                <SignOut size={14} />
                <span>Logga ut</span>
              </button>
            </div>
          ) : (
            <div className="p-4 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[var(--text-primary)] block">Logga in eller skapa konto</span>
                <span className="text-[11px] text-[var(--text-muted)]">Synka dina bankkonton mellan enheter</span>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] font-bold hover:opacity-90 transition-opacity"
              >
                Logga in
              </button>
            </div>
          )}

          <div className="p-4 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-[var(--text-primary)] block">Radera konto & all data</span>
              <span className="text-[11px] text-[var(--text-muted)]">Raderar all lokal och sparad data permanent</span>
            </div>
            <button
              type="button"
              onClick={onDeleteAccount}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-500/20 transition-colors"
            >
              Radera konto
            </button>
          </div>

          <div className="p-4 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-[var(--text-primary)] block">Nollställ konto</span>
              <span className="text-[11px] text-[var(--text-muted)]">Rensa all finansiell data och börja om helt från början</span>
            </div>
            <button
              type="button"
              onClick={onResetAccount}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 transition-colors"
            >
              Nollställ konto
            </button>
          </div>

        </div>
      </div>

      {/* Grouped Settings: Bank & Enable Banking */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 flex items-center justify-between">
          <span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
            <CreditCard size={15} className="text-[var(--text-primary)]" />
            <span>Bank & Automatiska transaktioner</span>
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              hasActiveBank
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
            }`}
          >
            {hasActiveBank ? 'Ansluten' : 'Ej ansluten'}
          </span>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {hasActiveBank
              ? `Ansluten via Enable Banking (${connectedBank || connections.map((c) => c.aspsp_name).join(', ')}). Saldon och transaktioner uppdateras automatiskt.`
              : 'Anslut din svenska bank säkert via Enable Banking (PSD2 / Mobilt BankID) för att hämta riktiga konton och transaktioner.'}
          </p>

          {connections.length > 0 && (
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-3">
              {connections.map((conn) => (
                <div key={conn.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">{conn.aspsp_name}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {conn.status === 'active' ? 'Aktiv · Autosynk' : conn.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDisconnectBank(conn.id)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Koppla från
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex items-center gap-2.5">
            {hasActiveBank && (
              <button
                type="button"
                onClick={onSyncBank}
                disabled={syncingBank}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                <ArrowClockwise size={14} className={syncingBank ? 'animate-spin' : ''} />
                <span>{syncingBank ? 'Synkar...' : 'Synka nu'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenBank}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Bank size={15} />
              <span>{hasActiveBank ? 'Hantera konton' : 'Anslut bank'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Settings: Budget & Period */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/50">
          <span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
            <CalendarBlank size={15} className="text-[var(--text-primary)]" />
            <span>Periodberäkning & Lönedag</span>
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)] block">
              Ordinarie lönedag
            </label>
            <select
              value={targetPayday}
              onChange={(e) => onUpdatePayday(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Den {d}:e varje månad {d === 25 ? '(Standard i Sverige)' : d === 31 ? '(Sista dagen)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-[var(--text-primary)] block">
              Helghantering (om lönedag infaller på helg)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  mode: 'before' as WeekendHandlingMode,
                  title: 'Fredagen före helgen (standard)',
                  desc: 'Utbetalning sker närmaste vardag före',
                },
                {
                  mode: 'after' as WeekendHandlingMode,
                  title: 'Måndagen efter helgen',
                  desc: 'Utbetalning sker närmaste vardag efter',
                },
                {
                  mode: 'none' as WeekendHandlingMode,
                  title: 'Ingen helgjustering',
                  desc: 'Perioden startar alltid på exakt vald dag',
                },
              ].map((option) => {
                const isSelected = weekendHandling === option.mode;
                return (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => onUpdateWeekendHandling(option.mode)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--surface-raised)] border-[var(--text-primary)]'
                        : 'bg-[var(--bg-color)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">{option.title}</span>
                      <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">{option.desc}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                          : 'border-[var(--text-muted)]'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--bg-color)]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Period Preview Card */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">Aktuell löneperiod</span>
              <span className="font-display font-bold text-[var(--text-primary)] tabular-nums">
                {period.startLabel} – {period.endLabel}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
              <span>
                Dag {period.daysElapsed} av {period.daysTotal} ({period.daysRemaining} dagar kvar)
              </span>
              <span>Nästa lön: {period.nextPayLabel}</span>
            </div>
            {period.isAdjustedForWeekend && period.weekendAdjustmentNote && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-[var(--border-subtle)]">
                {period.weekendAdjustmentNote}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* App Info Footer */}
      <div className="text-center py-2 space-y-1">
        <p className="text-xs text-[var(--text-muted)] font-medium flex items-center justify-center gap-1">
          <Info size={14} />
          <span>Dejz v1.0.0 · Svensk tidszon (Europe/Stockholm)</span>
        </p>
        <p className="text-[10px] text-[var(--text-muted)]/70">
          Strikt betaldatumbaserad budgetering utan framtida datum.
        </p>
      </div>
    </div>
  );
};
