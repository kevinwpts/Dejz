import type { SetStateAction } from 'react';
import React from 'react';
import { Check, Copy, X } from '@phosphor-icons/react';
import { formatAccountNumberShort } from '../../utils/accountDisplay';
import { ItemLogo } from '../ItemLogo';
import { BottomSheet } from '../ui/BottomSheet';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring/checkRecurring';
import type { AccountItem, FixedExpenseItem, IncomeItem, TransactionItem } from '../../app/models';

export interface HomeAccountSheetProps {
  activeModalAccount: AccountItem | null;
  setSelectedAccountModalId: (value: SetStateAction<string | null>) => void;
  setIsEditingAccountName: (value: SetStateAction<boolean>) => void;
  isEditingAccountName: boolean;
  accountNameDraft: string;
  setAccountNameDraft: (value: SetStateAction<string>) => void;
  onUpdateAccountMeta?: (accountId: string, patch: { customName?: string; excludeFromTotalBalance?: boolean; }) => void;
  formatKr: (amount: number) => string;
  setCopiedAccountNumber: (value: SetStateAction<boolean>) => void;
  copiedAccountNumber: boolean;
  activeAccountTransactions: TransactionItem[];
  onSelectAccount?: (accountId: string) => void;
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  onSelectTransaction: (tx: TransactionItem) => void;
}

export const HomeAccountSheet: React.FC<HomeAccountSheetProps> = ({
  activeModalAccount,
  setSelectedAccountModalId,
  setIsEditingAccountName,
  isEditingAccountName,
  accountNameDraft,
  setAccountNameDraft,
  onUpdateAccountMeta,
  formatKr,
  setCopiedAccountNumber,
  copiedAccountNumber,
  activeAccountTransactions,
  onSelectAccount,
  fixedExpenses,
  incomes,
  onSelectTransaction,
}) => (
    <>
      {/* ============================================================== */}
      {/* KONTOKORT-MODAL (BOTTOM SHEET VID KLICK PÅ KONTO)              */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={Boolean(activeModalAccount)}
        onClose={() => {
          setSelectedAccountModalId(null);
          setIsEditingAccountName(false);
        }}
        title={activeModalAccount?.bankName || 'Konto'}
      >
        {activeModalAccount && (
          <div className="space-y-4">
            {/* Konto-huvud med logotyp, redigerbart namn och stort saldo */}
            <div className="flex flex-col items-center text-center pt-1 pb-2">
              <ItemLogo
                name={activeModalAccount.bankName || activeModalAccount.name}
                category="Bank"
                logoUrl={activeModalAccount.logo}
                size="lg"
              />

              {isEditingAccountName ? (
                <div className="mt-3 w-full max-w-[260px] flex items-center gap-1.5">
                  <input
                    aria-label="Kontonamn"
                    type="text"
                    value={accountNameDraft}
                    onChange={(e) => setAccountNameDraft(e.target.value)}
                    placeholder={activeModalAccount.originalName || activeModalAccount.name}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdateAccountMeta?.(activeModalAccount.id, {
                          customName: accountNameDraft.trim(),
                        });
                        setIsEditingAccountName(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingAccountName(false);
                      }
                    }}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-callout font-medium text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--text-primary)]"
                  />
                  <button
                    aria-label="Spara namn"
                    type="button"
                    onClick={() => {
                      onUpdateAccountMeta?.(activeModalAccount.id, {
                        customName: accountNameDraft.trim(),
                      });
                      setIsEditingAccountName(false);
                    }}
                    className="w-8 h-8 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
                    title="Spara namn"
                  >
                    <Check size={14} weight="bold" />
                  </button>
                  <button
                    aria-label="Avbryt"
                    type="button"
                    onClick={() => setIsEditingAccountName(false)}
                    className="ui-icon-btn"
                    title="Avbryt"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAccountNameDraft(activeModalAccount.name);
                    setIsEditingAccountName(true);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[17px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                  title="Byt namn på kontot"
                >
                  <span>{activeModalAccount.name}</span>
                </button>
              )}

              <div className="font-display text-[34px] font-bold tracking-[-0.035em] text-[var(--text-primary)] tabular-nums mt-1 leading-tight">
                {formatKr(activeModalAccount.balance)}
              </div>
            </div>

            {/* Kontouppgifter & Inställningar */}
            <div className="ui-sheet-group">
              {activeModalAccount.accountNumber && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-footnote text-[var(--text-secondary)] block">
                      Kontonummer
                    </span>
                    <span className="text-subhead font-medium text-[var(--text-primary)] tabular-nums">
                      {formatAccountNumberShort(activeModalAccount.accountNumber)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard && activeModalAccount.accountNumber) {
                        navigator.clipboard
                          .writeText(activeModalAccount.accountNumber)
                          .catch(() => {});
                        setCopiedAccountNumber(true);
                        setTimeout(() => setCopiedAccountNumber(false), 2000);
                      }
                    }}
                    className="ui-pill-btn shrink-0"
                  >
                    {copiedAccountNumber ? (
                      <>
                        <Check size={14} weight="bold" className="text-positive" />
                        <span>Kopierat</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} weight="bold" />
                        <span>Kopiera</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Räkna med i Totalt saldo */}
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-subhead font-normal text-[var(--text-primary)] block">
                    Räkna med i Totalt saldo
                  </span>
                  <span className="text-footnote text-[var(--text-secondary)] block mt-0.5">
                    Inkludera kontots saldo på hemskärmen
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!activeModalAccount.excludeFromTotalBalance}
                  aria-label="Räkna med i Totalt saldo"
                  onClick={() => {
                    onUpdateAccountMeta?.(activeModalAccount.id, {
                      excludeFromTotalBalance: !activeModalAccount.excludeFromTotalBalance,
                    });
                  }}
                  className={`ui-switch ${
                    !activeModalAccount.excludeFromTotalBalance ? 'ui-switch-on' : 'ui-switch-off'
                  }`}
                >
                  <span
                    className={`ui-switch-thumb ${
                      !activeModalAccount.excludeFromTotalBalance ? 'ui-switch-thumb-on' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Senaste händelser på kontot */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-footnote font-medium text-[var(--text-secondary)]">
                  Senaste händelser
                </span>
                {activeAccountTransactions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = activeModalAccount.id;
                      setSelectedAccountModalId(null);
                      onSelectAccount?.(targetId);
                    }}
                    className="text-footnote font-semibold text-[var(--on-accent-container)] hover:opacity-75 transition-opacity cursor-pointer"
                  >
                    Visa alla
                  </button>
                )}
              </div>

              {activeAccountTransactions.length > 0 ? (
                <div className="ui-sheet-group">
                  {activeAccountTransactions.slice(0, 6).map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isPending =
                      tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                    const recurring = checkIsRecurringTransaction(
                      tx,
                      fixedExpenses,
                      incomes
                    );
                    return (
                      <button
                        key={`acc-tx-${tx.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedAccountModalId(null);
                          onSelectTransaction(tx);
                        }}
                        className="ui-tx-row px-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo
                            name={tx.title}
                            category={tx.category}
                            logoUrl={tx.logo}
                            size="md"
                            isRecurring={recurring.isRecurring}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">{tx.title}</span>
                            <span className="ui-row-subtitle">
                              <span className="truncate">{tx.category}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={
                              isIncome ? 'ui-row-amount-income' : 'ui-row-amount'
                            }
                          >
                            {isIncome
                              ? `+${formatKr(tx.amount)}`
                              : `−${formatKr(tx.amount)}`}
                          </span>
                          <span className="ui-row-meta">
                            {isPending
                              ? 'Reserverat'
                              : formatSwedishDateHeading(tx.date)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="ui-sheet-group py-6 px-4 text-center text-callout text-[var(--text-secondary)]">
                  Inga händelser på kontot än
                </div>
              )}
            </div>

            {activeAccountTransactions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const targetId = activeModalAccount.id;
                  setSelectedAccountModalId(null);
                  onSelectAccount?.(targetId);
                }}
                className="ui-btn-primary"
              >
                Visa alla transaktioner ({activeAccountTransactions.length})
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
);
