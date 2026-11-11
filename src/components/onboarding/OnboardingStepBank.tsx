import type { SetStateAction } from 'react';
import React from 'react';
import {
  ArrowRight,
  Check,
  X,
  MagnifyingGlass,
  ShieldCheck,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react';
import { BankAspsp, BankConnection, BankAccount } from '../../services/bankService';
import { ItemLogo } from '../ItemLogo';
import { OnboardingStep, POPULAR_SWEDISH_BANKS } from './onboardingConfig';

export interface OnboardingStepBankProps {
  step: 2 | 1 | 3 | 4 | 5 | 6 | 7;
  pageAnimClass: "animate-page-forward" | "animate-page-back";
  step2View: "grid" | "select-accounts";
  fetchedAccounts: BankAccount[];
  selectedAccountIds: string[];
  getSmartAccountDefaultName: (acc: BankAccount, idx: number) => string;
  toggleAccountSelection: (accId: string) => void;
  formatKr: (val: number) => string;
  savingAccounts: boolean;
  handleSaveSelectedAccounts: () => Promise<void>;
  authError: string;
  setAuthError: (value: SetStateAction<string>) => void;
  bankCallbackStatusMsg: string;
  verifyingBankReturn: boolean;
  hasConnectedBank: boolean;
  connections: BankConnection[];
  _bankAccounts: BankAccount[];
  applyConnectedBankState: (conns: BankConnection[], accs: BankAccount[]) => boolean;
  bankSearchQuery: string;
  setBankSearchQuery: (value: SetStateAction<string>) => void;
  filteredBanks: BankAspsp[];
  startingAuth: boolean;
  connectingBankName: string;
  handleSelectBankInline: (bank: BankAspsp | { name: string; country?: string; logo?: string; }) => Promise<void>;
  goNext: (from: OnboardingStep) => void;
}

export const OnboardingStepBank: React.FC<OnboardingStepBankProps> = ({
  step,
  pageAnimClass,
  step2View,
  fetchedAccounts,
  selectedAccountIds,
  getSmartAccountDefaultName,
  toggleAccountSelection,
  formatKr,
  savingAccounts,
  handleSaveSelectedAccounts,
  authError,
  setAuthError,
  bankCallbackStatusMsg,
  verifyingBankReturn,
  hasConnectedBank,
  connections,
  _bankAccounts,
  applyConnectedBankState,
  bankSearchQuery,
  setBankSearchQuery,
  filteredBanks,
  startingAuth,
  connectingBankName,
  handleSelectBankInline,
  goNext,
}) => (
  <>
    {step === 2 && (
      <div
        key="step-2"
        className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
      >
        {/* SUB-VIEW: VÄLJ KONTON (Bara kontolistan scrollar, inga dubbla namnfält) */}
        {step2View === 'select-accounts' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between">
            <div className="shrink-0 pt-6 pb-4">
              <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                Välj konton att synka
              </h1>
            </div>

            {/* Scrollbar kontolista */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
              {fetchedAccounts.map((acc, idx) => {
                const isChecked = selectedAccountIds.includes(acc.id);
                const currentName = getSmartAccountDefaultName(acc, idx);
                const rawNum = (acc.bban || acc.iban || '').trim();
                const formattedNum =
                  rawNum.length === 11 && /^\d+$/.test(rawNum)
                    ? `${rawNum.slice(0, 4)}-${rawNum.slice(4)}`
                    : rawNum || acc.product || 'Bankkonto';

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => toggleAccountSelection(acc.id)}
                    className={`w-full p-4 rounded-2xl border flex items-center gap-3.5 text-left transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                        : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-55'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {isChecked && <Check size={12} weight="bold" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                        {currentName}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] block tabular-nums mt-0.5">
                        {formattedNum}
                      </span>
                    </div>
                    {acc.balance_amount !== null && acc.balance_amount !== undefined && (
                      <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                        {formatKr(acc.balance_amount)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pinnad knapp */}
            <div className="shrink-0 pt-3">
              <button
                type="button"
                disabled={savingAccounts || selectedAccountIds.length === 0}
                onClick={handleSaveSelectedAccounts}
                className="w-full py-3.5 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
              >
                {savingAccounts ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" />
                    <span>Synkar valda konton...</span>
                  </>
                ) : (
                  <>
                    <span>Fortsätt</span>
                    <ArrowRight size={16} weight="bold" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SUB-VIEW: KOPPLA BANK MED DIREKT SÖKFÄLT + 3x3 GRID PÅ SAMMA SIDA */}
        {step2View === 'grid' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between">
            <div className="shrink-0 pt-6 pb-4">
              <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                Koppla din bank
              </h1>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-center py-1 space-y-4">
              {authError && (
                <div className="shrink-0 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2.5 animate-scale-in">
                  <div className="flex items-center gap-2">
                    <WarningCircle size={16} weight="fill" className="shrink-0" />
                    <span>{authError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthError(null)}
                    className="text-xs font-semibold underline shrink-0 cursor-pointer"
                  >
                    Stäng
                  </button>
                </div>
              )}

              {(bankCallbackStatusMsg || verifyingBankReturn) && (
                <div className="shrink-0 p-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-3 text-xs font-medium text-[var(--text-primary)] animate-scale-in">
                  <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
                  <span>
                    {bankCallbackStatusMsg ||
                      'Verifierar BankID-inloggning och hämtar dina konton...'}
                  </span>
                </div>
              )}

              {hasConnectedBank ? (
                <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <ItemLogo name={conn.aspsp_name} logoUrl={conn.aspsp_logo || undefined} size="md" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--surface-color)]" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                            {conn.aspsp_name}
                          </span>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Ansluten
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {_bankAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => applyConnectedBankState(connections, _bankAccounts)}
                      className="w-full py-2.5 rounded-xl bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Välj vilka konton som ska synkas
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col justify-center space-y-3">
                  {/* Sökfält direkt på samma sida */}
                  <div className="relative shrink-0">
                    <MagnifyingGlass
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                    />
                    <input
                      type="text"
                      value={bankSearchQuery}
                      onChange={(e) => setBankSearchQuery(e.target.value)}
                      placeholder="Sök bank..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                    />
                    {bankSearchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBankSearchQuery('')}
                        aria-label="Rensa sökning"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    )}
                  </div>

                  {bankSearchQuery.trim().length > 0 ? (
                    <div className="flex-1 min-h-0 max-h-72 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 sm:gap-2.5 content-start pr-0.5">
                      {filteredBanks.length > 0 ? (
                        filteredBanks.map((b) => {
                          const isConnecting =
                            startingAuth && connectingBankName === b.name;
                          const isAnyConnecting = startingAuth && Boolean(connectingBankName);

                          return (
                            <button
                              key={b.name}
                              type="button"
                              disabled={isAnyConnecting}
                              onClick={() => handleSelectBankInline(b)}
                              className={`p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 active:scale-95 cursor-pointer group ${
                                isConnecting
                                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] scale-[0.98]'
                                  : isAnyConnecting
                                  ? 'bg-[var(--surface-color)] border-[var(--border-subtle)] opacity-40 pointer-events-none'
                                  : 'bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-150 group-hover:scale-105 shrink-0 relative">
                                {isConnecting ? (
                                  <SpinnerGap size={24} className="animate-spin text-[var(--bg-color)]" />
                                ) : (
                                  <ItemLogo name={b.name} logoUrl={b.logo || undefined} size="lg" />
                                )}
                              </div>
                              <span className="font-display font-semibold text-[11px] sm:text-[12px] text-center truncate max-w-full leading-tight">
                                {isConnecting ? 'Ansluter...' : b.name}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-3 py-10 text-center text-xs text-[var(--text-muted)]">
                          Ingen bank hittades
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 3x3 Grid med de 9 vanligaste svenska bankerna */
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 shrink-0">
                      {POPULAR_SWEDISH_BANKS.map((b) => {
                        const isConnecting =
                          startingAuth &&
                          (connectingBankName === b.name || connectingBankName === b.displayName);
                        const isAnyConnecting = startingAuth && Boolean(connectingBankName);

                        return (
                          <button
                            key={b.id}
                            type="button"
                            disabled={isAnyConnecting}
                            onClick={() => handleSelectBankInline(b)}
                            className={`p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 active:scale-95 cursor-pointer group ${
                              isConnecting
                                ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] scale-[0.98]'
                                : isAnyConnecting
                                ? 'bg-[var(--surface-color)] border-[var(--border-subtle)] opacity-40 pointer-events-none'
                                : 'bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-150 group-hover:scale-105 shrink-0 relative">
                              {isConnecting ? (
                                <SpinnerGap size={24} className="animate-spin text-[var(--bg-color)]" />
                              ) : (
                                <ItemLogo name={b.displayName} size="lg" />
                              )}
                            </div>
                            <span className="font-display font-semibold text-[11px] sm:text-[12px] text-center truncate max-w-full leading-tight">
                              {isConnecting ? 'Ansluter...' : b.displayName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Trygghetsrad */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] pt-1 shrink-0">
                    <ShieldCheck size={14} weight="regular" />
                    <span>Säker koppling via Mobilt BankID</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pinnad bottenknapp: Visa "Fortsätt" ENDAST om bank är ansluten, annars enbart "Hoppa över just nu" */}
            <div className="shrink-0 pt-3">
              {hasConnectedBank ? (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      _bankAccounts.length > 0 &&
                      localStorage.getItem('dejz_onboarding_accounts_confirmed') !== 'true'
                    ) {
                      applyConnectedBankState(connections, _bankAccounts);
                      return;
                    }
                    goNext(2);
                  }}
                  className="w-full py-3.5 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goNext(2)}
                  className="w-full py-2.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Hoppa över just nu
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )}
  </>
);
