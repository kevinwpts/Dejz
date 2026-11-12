import type { SetStateAction } from 'react';
import React from 'react';
import { Check, Copy, PencilSimple, X } from '@phosphor-icons/react';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
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
                    className="w-8 h-8 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shrink-0 cursor-pointer"
                    title="Spara namn"
                  >
                    <Check size={14} weight="bold" />
                  </button>
                  <button
                    aria-label="Avbryt"
                    type="button"
                    onClick={() => setIsEditingAccountName(false)}
                    className="w-8 h-8 rounded-xl bg-[var(--surface-raised)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 cursor-pointer"
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
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                  title="Byt namn på kontot"
                >
                  <span>{activeModalAccount.name}</span>
                  <PencilSimple size={13} className="text-[var(--text-muted)]" />
                </button>
              )}

              <div className="font-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[var(--text-primary)] tabular-nums mt-1 leading-tight">
                {formatKr(activeModalAccount.balance)}
              </div>
            </div>

            {/* Kontouppgifter & Inställningar */}
            <div className="rounded-2xl bg-[var(--surface-raised)]/60 border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] px-3.5">
              {activeModalAccount.accountNumber && (
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-meta text-[var(--text-secondary)] block">
                      Kontonummer
                    </span>
                    <span className="text-footnote font-medium text-[var(--text-primary)] tabular-nums">
                      {activeModalAccount.accountNumber}
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-meta font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                  >
                    {copiedAccountNumber ? (
                      <>
                        <Check size={12} weight="bold" className="text-positive-solid" />
                        <span>Kopierat</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Kopiera</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Räkna med i Totalt saldo */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-footnote font-normal text-[var(--text-primary)] block">
                    Räkna med i Totalt saldo
                  </span>
                  <span className="text-meta text-[var(--text-secondary)] block">
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
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    !activeModalAccount.excludeFromTotalBalance
                      ? 'bg-[var(--text-primary)]'
                      : 'bg-[var(--border-subtle)]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-color)] shadow transition duration-200 ease-in-out ${
                      !activeModalAccount.excludeFromTotalBalance
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Senaste händelser på kontot */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-meta font-medium text-[var(--text-secondary)]">
                  Senaste händelser ({activeAccountTransactions.length})
                </span>
                {activeAccountTransactions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = activeModalAccount.id;
                      setSelectedAccountModalId(null);
                      onSelectAccount?.(targetId);
                    }}
                    className="text-meta font-medium text-[var(--text-primary)] hover:opacity-75 transition-opacity cursor-pointer"
                  >
                    Visa alla
                  </button>
                )}
              </div>

              {activeAccountTransactions.length > 0 ? (
                <div className="rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--border-subtle)] px-3 divide-y divide-[var(--border-subtle)]">
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
                        className="ui-tx-row"
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
                              <CategoryIcon
                                category={tx.category}
                                size={11}
                                className="shrink-0"
                              />
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
                <div className="rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--border-subtle)] py-6 text-center text-footnote text-[var(--text-secondary)]">
                  Inga bokförda händelser på detta konto än
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
                className="w-full py-3 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] text-callout font-semibold tracking-[-0.01em] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
              >
                Visa alla transaktioner ({activeAccountTransactions.length})
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
);
