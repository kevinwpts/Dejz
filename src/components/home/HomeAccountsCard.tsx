import type { SetStateAction } from 'react';
import React from 'react';
import { Bank, CaretDown, CaretRight } from '@phosphor-icons/react';
import { ItemLogo } from '../ItemLogo';
import { setShowAccountsOnHome } from '../../utils/appCache';
import type { AccountItem } from '../../app/models';

export interface HomeAccountsCardProps {
  accounts: AccountItem[];
  showAccounts: boolean;
  setShowAccounts: (value: SetStateAction<boolean>) => void;
  isInitialLoading: boolean;
  formatKr: (amount: number) => string;
  totalBalance: number;
  setSelectedAccountModalId: (value: SetStateAction<string | null>) => void;
  setAccountNameDraft: (value: SetStateAction<string>) => void;
  setIsEditingAccountName: (value: SetStateAction<boolean>) => void;
  setCopiedAccountNumber: (value: SetStateAction<boolean>) => void;
  onOpenBank: () => void;
}

export const HomeAccountsCard: React.FC<HomeAccountsCardProps> = ({
  accounts,
  showAccounts,
  setShowAccounts,
  isInitialLoading,
  formatKr,
  totalBalance,
  setSelectedAccountModalId,
  setAccountNameDraft,
  setIsEditingAccountName,
  setCopiedAccountNumber,
  onOpenBank,
}) => (
    <>
      {/* ============================================================== */}
      {/* MODUL 2: TOTALT SALDO · BANKKONTON                             */}
      {/* Visas bara när det finns kopplade/inlagda konton – annars blir */}
      {/* det ett förvirrande "0 kr"-kort för användare utan bank.       */}
      {/* ============================================================== */}
      {accounts.length > 0 && (
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => {
            const next = !showAccounts;
            setShowAccounts(next);
            setShowAccountsOnHome(next);
          }}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group focus:outline-none"
          aria-expanded={showAccounts}
          title={showAccounts ? 'Dölj konton' : 'Visa konton'}
        >
          <div className="min-w-0">
            <span className="text-meta text-[var(--text-secondary)] font-normal block">
              Totalt saldo
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-7 w-32 rounded-lg bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <div className="font-display text-[20px] sm:text-[20px] font-semibold tracking-[-0.015em] leading-tight text-[var(--text-primary)] tabular-nums mt-0.5">
                {formatKr(totalBalance)}
              </div>
            )}
          </div>

          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:bg-[var(--bg-color)] transition-all shrink-0">
            <CaretDown
              size={14}
              weight="regular"
              className={`transition-transform duration-200 ${
                showAccounts ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>

        {/* Mjukt utfällbar lista med dina bankkonton */}
        <div
          className={`grid transition-all duration-200 ease-out ${
            showAccounts ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-2.5 border-t border-[var(--border-subtle)]">
              {accounts.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {accounts.map((acc) => {
                    const hasDuplicateName =
                      accounts.filter(
                        (other) =>
                          other.name.trim().toLowerCase() === acc.name.trim().toLowerCase()
                      ).length > 1;
                    const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
                    const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';

                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccountModalId(acc.id);
                          setAccountNameDraft(acc.name);
                          setIsEditingAccountName(false);
                          setCopiedAccountNumber(false);
                        }}
                        title={`Visa kontodetaljer för ${acc.name}`}
                        className="w-full py-2.5 first:pt-1 last:pb-0.5 flex items-center justify-between gap-2.5 text-left text-xs sm:text-footnote hover:bg-[var(--surface-hover)] rounded-xl px-1 -mx-1 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo
                            name={acc.bankName || acc.name}
                            category="Bank"
                            logoUrl={acc.logo}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-normal text-footnote sm:text-callout tracking-[-0.005em] leading-snug text-[var(--text-primary)] block truncate">
                              {acc.name}
                            </span>
                            {(acc.bankName ||
                              (hasDuplicateName && last4) ||
                              acc.excludeFromTotalBalance) && (
                              <span className="text-meta font-normal text-[var(--text-secondary)] block truncate mt-0.5">
                                {acc.bankName}
                                {hasDuplicateName && last4 ? ` · •••• ${last4}` : ''}
                                {acc.excludeFromTotalBalance ? ' · Ej i totalt' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`font-display font-semibold text-callout tracking-[-0.01em] tabular-nums ${
                              acc.excludeFromTotalBalance
                                ? 'text-[var(--text-secondary)]'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {formatKr(acc.balance)}
                          </span>
                          <CaretRight
                            size={12}
                            weight="regular"
                            className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : isInitialLoading ? (
                <div className="space-y-2.5 animate-pulse pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-raised)]" />
                      <div className="space-y-1.5">
                        <div className="w-24 h-3 rounded bg-[var(--surface-raised)]" />
                        <div className="w-16 h-2 rounded bg-[var(--surface-raised)]" />
                      </div>
                    </div>
                    <div className="w-20 h-3.5 rounded bg-[var(--surface-raised)]" />
                  </div>
                </div>
              ) : (
                <div className="pt-1 flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Ingen bank ansluten
                  </span>
                  <button
                    type="button"
                    onClick={onOpenBank}
                    className="ui-btn-sm-primary"
                  >
                    <Bank size={14} />
                    <span>Anslut</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      )}
    </>
);
