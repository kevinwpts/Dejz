import React, { useState, useRef } from 'react';
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
  ArrowsLeftRight,
  Tag,
  CaretRight,
  CaretLeft,
  Heart,
} from '@phosphor-icons/react';
import { BankConnection } from '../services/bankService';
import { PeriodInfo, WeekendHandlingMode } from '../utils/periodEngine';
import { CategorySettings } from './CategorySettings';
import { TransactionItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';

interface SettingsTabProps {
  period: PeriodInfo;
  connectedBank: string | null;
  connections: BankConnection[];
  syncingBank: boolean;
  targetPayday: number;
  weekendHandling: WeekendHandlingMode;
  userEmail: string | null;
  userAvatar?: string | null;
  excludeInternalTransfers?: boolean;
  transactions?: TransactionItem[];
  onToggleExcludeInternalTransfers?: (enabled: boolean) => void;
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
  onSelectTransaction?: (tx: TransactionItem) => void;
}

type SubView = 'main' | 'categories' | 'period' | 'bank' | 'security' | 'preferences' | 'hearted';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  period,
  connectedBank,
  connections,
  syncingBank,
  targetPayday,
  weekendHandling,
  userEmail,
  userAvatar,
  excludeInternalTransfers = true,
  transactions = [],
  onToggleExcludeInternalTransfers,
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
  onSelectTransaction,
}) => {
  const [subView, setSubView] = useState<SubView>('main');
  const hasActiveBank = Boolean(connectedBank || connections.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

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

  // ==========================================
  // SUB-VIEW: KATEGORIER
  // ==========================================
  if (subView === 'categories') {
    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setSubView('main')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
        >
          <CaretLeft size={16} />
          <span>Tillbaka till inställningar</span>
        </button>

        <div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            Kategorier
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Hantera och anpassa dina utgifts- och inkomstkategorier
          </p>
        </div>

        <CategorySettings />
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: HJÄRTMARKERADE TRANSAKTIONER
  // ==========================================
  if (subView === 'hearted') {
    const heartedTxs = transactions.filter((tx) => tx.isHearted);
    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setSubView('main')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
        >
          <CaretLeft size={16} />
          <span>Tillbaka till inställningar</span>
        </button>

        <div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            Hjärtmarkerade transaktioner
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Dina sparade och favoritmarkerade transaktioner
          </p>
        </div>

        {heartedTxs.length > 0 ? (
          <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 shadow-sm">
            <div className="divide-y divide-[var(--border-subtle)]">
              {heartedTxs.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onSelectTransaction?.(tx)}
                    className="w-full py-3.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <ItemLogo
                        name={tx.title}
                        category={tx.category}
                        logoUrl={tx.logo}
                        size="md"
                        isRecurring={false}
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-[var(--text-primary)] block truncate">
                          {tx.title}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate mt-0.5">
                          <CategoryIcon category={tx.category} size={11} />
                          <span>{tx.category}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`font-display font-bold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                        {isIncome ? '+' : '-'}{formatKr(tx.amount)}
                      </span>
                      <Heart size={15} weight="fill" className="text-rose-500 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-3">
              <Heart size={24} />
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">Inga hjärtmarkerade transaktioner</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Klicka på hjärtikonen i en transaktionsdetalj för att spara den här.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: PERIODBERÄKNING & LÖNEDAG
  // ==========================================
  if (subView === 'period') {
    return (
      <div className="space-y-6 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setSubView('main')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
        >
          <CaretLeft size={16} />
          <span>Tillbaka till inställningar</span>
        </button>

        <div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            Periodberäkning & Lönedag
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Ställ in din lönedag och hur helger hanteras för budgetperioder
          </p>
        </div>

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)] block">
              Ordinarie lönedag
            </label>
            <select
              value={targetPayday}
              onChange={(e) => onUpdatePayday(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
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
          <div className="p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] space-y-1.5">
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
    );
  }

  // ==========================================
  // SUB-VIEW: BANK & AUTOMATISKA TRANSAKTIONER
  // ==========================================
  if (subView === 'bank') {
    return (
      <div className="space-y-6 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setSubView('main')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
        >
          <CaretLeft size={16} />
          <span>Tillbaka till inställningar</span>
        </button>

        <div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            Bank & Automatiska transaktioner
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Anslut och hantera dina bankkonton via Enable Banking (PSD2)
          </p>
        </div>

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)]">Anslutningsstatus</span>
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                hasActiveBank
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
              }`}
            >
              {hasActiveBank ? 'Ansluten' : 'Ej ansluten'}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {hasActiveBank
              ? `Ansluten via Enable Banking (${connectedBank || connections.map((c) => c.aspsp_name).join(', ')}). Saldon och transaktioner uppdateras automatiskt.`
              : 'Anslut din svenska bank säkert via Enable Banking (PSD2 / Mobilt BankID) för att hämta riktiga konton och transaktioner.'}
          </p>

          {connections.length > 0 && (
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-4">
              {connections.map((conn) => (
                <div key={conn.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">{conn.aspsp_name}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {conn.status === 'active' ? 'Aktiv · Autosynk' : conn.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDisconnectBank(conn.id)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
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
                className="flex-1 py-3 px-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] disabled:opacity-50 cursor-pointer"
              >
                <ArrowClockwise size={15} className={syncingBank ? 'animate-spin' : ''} />
                <span>{syncingBank ? 'Synkar...' : 'Synka nu'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenBank}
              className="flex-1 py-3 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Bank size={16} />
              <span>{hasActiveBank ? 'Hantera konton' : 'Anslut bank'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: PREFERENSER & REGLER
  // ==========================================
  if (subView === 'preferences') {
    return (
      <div className="space-y-6 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setSubView('main')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
        >
          <CaretLeft size={16} />
          <span>Tillbaka till inställningar</span>
        </button>

        <div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            Preferenser & Regler
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Anpassa hur transaktioner och överföringar hanteras
          </p>
        </div>

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Exkludera interna överföringar
              </span>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                Döljer och exkluderar överföringar mellan dina egna konton (t.ex. till/från sparkonto eller överföringar i ditt eget namn) så att de inte räknas som rörliga utgifter/inkomster eller påverkar &quot;Kvar att spendera&quot;.
              </p>
            </div>
            {onToggleExcludeInternalTransfers && (
              <button
                type="button"
                role="switch"
                aria-checked={excludeInternalTransfers}
                onClick={() => onToggleExcludeInternalTransfers(!excludeInternalTransfers)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  excludeInternalTransfers ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-subtle)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-color)] shadow-sm ring-0 transition duration-200 ease-in-out ${
                    excludeInternalTransfers ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: KONTO & SÄKERHET
  // ==========================================
  if (subView === 'security') {
    return (
      <div className="space-y-6 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setSubView('main')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
        >
          <CaretLeft size={16} />
          <span>Tillbaka till inställningar</span>
        </button>

        <div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            Konto & Säkerhet
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Hantera din data, nollställ konto eller radera permanent
          </p>
        </div>

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm divide-y divide-[var(--border-subtle)]">
          <div className="p-5 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-[var(--text-primary)] block">Nollställ konto</span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">Rensa all finansiell data och börja om helt från början</span>
            </div>
            <button
              type="button"
              onClick={onResetAccount}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
            >
              Nollställ
            </button>
          </div>

          <div className="p-5 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-[var(--text-primary)] block">Radera konto & all data</span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">Raderar all lokal och sparad data permanent</span>
            </div>
            <button
              type="button"
              onClick={onDeleteAccount}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
            >
              Radera
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN SETTINGS & PROFILE MENU
  // ==========================================
  return (
    <div className="space-y-6 pb-36 sm:pb-40 animate-fade-in max-w-lg mx-auto">
      {/* 1. Profile Header Card */}
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
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] shadow-md hover:scale-105 transition-transform cursor-pointer"
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-lg text-[var(--text-primary)] truncate">
              {userEmail || 'Gästkonto'}
            </h2>
            {userEmail ? (
              <button
                type="button"
                onClick={onSignOut}
                className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
              >
                <SignOut size={13} />
                <span>Logga ut</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-xs"
              >
                Logga in
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                userEmail ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{userEmail ? 'Molnsynk aktiverad' : 'Lokalt läge (ej inloggad)'}</span>
          </p>
        </div>
      </div>

      {/* 2. Settings Navigation Menu */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/50">
          <span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
            Inställningar & Anpassning
          </span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {/* Hjärtmarkerade transaktioner */}
          <button
            type="button"
            onClick={() => setSubView('hearted')}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                <Heart size={17} weight="fill" className="text-rose-500" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Hjärtmarkerade
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
                  {transactions.filter((t) => t.isHearted).length} sparade transaktioner
                </span>
              </div>
            </div>
            <CaretRight
              size={16}
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
            />
          </button>

          {/* Periodberäkning & Lönedag */}
          <button
            type="button"
            onClick={() => setSubView('period')}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                <CalendarBlank size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Periodberäkning & Lönedag
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
                  Lönedag {targetPayday}:e, helghantering och löneperioder
                </span>
              </div>
            </div>
            <CaretRight
              size={16}
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
            />
          </button>

          {/* Kategorier */}
          <button
            type="button"
            onClick={() => setSubView('categories')}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                <Tag size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Kategorier
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
                  Hantera utgifts- och inkomstkategorier
                </span>
              </div>
            </div>
            <CaretRight
              size={16}
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
            />
          </button>

          {/* Bank & Automatiska transaktioner */}
          <button
            type="button"
            onClick={() => setSubView('bank')}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                <CreditCard size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Bank & Automatiska transaktioner
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
                  {hasActiveBank ? `Ansluten (${connectedBank || 'PSD2'})` : 'Anslut bank via Enable Banking'}
                </span>
              </div>
            </div>
            <CaretRight
              size={16}
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
            />
          </button>

          {/* Preferenser & Regler */}
          <button
            type="button"
            onClick={() => setSubView('preferences')}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                <ArrowsLeftRight size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Preferenser & Regler
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
                  Exkludera interna överföringar m.m.
                </span>
              </div>
            </div>
            <CaretRight
              size={16}
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
            />
          </button>

          {/* Konto & Säkerhet */}
          <button
            type="button"
            onClick={() => setSubView('security')}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                <ShieldCheck size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Konto & Säkerhet
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
                  Nollställ eller radera konto
                </span>
              </div>
            </div>
            <CaretRight
              size={16}
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
            />
          </button>
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
