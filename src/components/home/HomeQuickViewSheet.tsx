import type { SetStateAction } from 'react';
import React from 'react';
import { Heart, Package, Paperclip } from '@phosphor-icons/react';
import { PeriodInfo, isDateInPeriod } from '../../utils/periodEngine';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../../app/models';
import { getTransactionTime } from '../../app/models';

export interface HomeQuickViewSheetProps {
  activeHeroPopup: "income" | "fixed" | "variable" | null;
  setActiveHeroPopup: (value: SetStateAction<"income" | "fixed" | "variable" | null>) => void;
  transactions: TransactionItem[];
  period: PeriodInfo;
  periodRecurringMatches: { claimedFixedTxIds: Set<string>; matchedFixedTxByExpId: Map<string, TransactionItem>; matchedFixedIds: Set<string>; claimedIncomeTxIds: Set<string>; matchedIncomeTxByIncId: Map<string, TransactionItem>; matchedIncomeIds: Set<string>; };
  incomes: IncomeItem[];
  onSelectIncome?: (inc: IncomeItem) => void;
  formatKr: (amount: number) => string;
  onSelectTransaction: (tx: TransactionItem) => void;
  fixedExpenses: FixedExpenseItem[];
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  variablePeriodTransactions: TransactionItem[];
  todayStr: string;
}

export const HomeQuickViewSheet: React.FC<HomeQuickViewSheetProps> = ({
  activeHeroPopup,
  setActiveHeroPopup,
  transactions,
  period,
  periodRecurringMatches,
  incomes,
  onSelectIncome,
  formatKr,
  onSelectTransaction,
  fixedExpenses,
  onSelectFixed,
  variablePeriodTransactions,
  todayStr,
}) => (
    <>
      {/* ============================================================== */}
      {/* SNABBVY-MODAL FÖR INKOMST / FASTA / RÖRLIGT                     */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={Boolean(activeHeroPopup)}
        onClose={() => setActiveHeroPopup(null)}
        surfaceClass="bg-[var(--bg-color)]"
        title={
          activeHeroPopup === 'income'
            ? 'Inkomst'
            : activeHeroPopup === 'fixed'
            ? 'Fasta utgifter'
            : 'Rörliga utgifter'
        }
      >
        <div>
          {activeHeroPopup === 'income' &&
            (() => {
              const extraIncomeTxs = deduplicateTransactions(transactions || []).filter(
                (tx) =>
                  !tx.isExcluded &&
                  tx.type === 'income' &&
                  !(typeof tx.id === 'string' && tx.id.startsWith('inc-')) &&
                  isDateInPeriod(tx.date, period) &&
                  !periodRecurringMatches.claimedIncomeTxIds.has(tx.id) &&
                  tx.category !== 'Återbetalning' &&
                  tx.category !== 'Swish' &&
                  !/swish/i.test(tx.title || '')
              );

              if (incomes.length === 0 && extraIncomeTxs.length === 0) {
                return (
                  <div className="ui-list-card py-10 text-center text-footnote text-[var(--text-secondary)]">
                    Inga inkomster
                  </div>
                );
              }

              return (
                <div className="ui-list-card">
                  {incomes.map((inc) => {
                    const catLabel = inc.category || 'Lön';
                    const matchedTx =
                      periodRecurringMatches.matchedIncomeTxByIncId.get(inc.id);
                    const effectiveAmt = matchedTx
                      ? Math.round(Math.abs(Number(matchedTx.amount) || 0))
                      : Math.round(Number(inc.amount) || 0);
                    const hasVariableDiff =
                      Boolean(matchedTx) &&
                      effectiveAmt !== Math.round(Number(inc.amount) || 0);

                    return (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => {
                          if (onSelectIncome) {
                            setActiveHeroPopup(null);
                            onSelectIncome(inc);
                          }
                        }}
                        className="ui-tx-row"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo
                            name={inc.name}
                            category={catLabel}
                            logoUrl={inc.logo}
                            size="md"
                            isRecurring={false}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">{inc.name}</span>
                            <span className="ui-row-subtitle flex items-center gap-1">
                              <CategoryIcon
                                category={catLabel}
                                size={11}
                                className="shrink-0 text-[var(--text-secondary)]"
                              />
                              <span className="truncate">{catLabel}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="ui-row-amount-income">
                            +{formatKr(effectiveAmt)}
                          </span>
                          <span className="ui-row-meta flex items-center justify-end gap-1">
                            <span>
                              {hasVariableDiff
                                ? `Riktvärde ${formatKr(inc.amount)}`
                                : `Den ${inc.payday || 25}:e`}
                            </span>
                            {matchedTx && (
                              <span className="text-positive font-medium">
                                · Utbetald
                              </span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {extraIncomeTxs.map((tx) => {
                    const catLabel = tx.category || 'Övrig inkomst';
                    const isPending =
                      tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setActiveHeroPopup(null);
                          onSelectTransaction(tx);
                        }}
                        className="ui-tx-row"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo
                            name={tx.title}
                            category={catLabel}
                            logoUrl={tx.logo}
                            size="md"
                            isRecurring={false}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">{tx.title}</span>
                            <span className="ui-row-subtitle flex items-center gap-1">
                              <CategoryIcon
                                category={catLabel}
                                size={11}
                                className="shrink-0 text-[var(--text-secondary)]"
                              />
                              <span className="truncate">{catLabel}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="ui-row-amount-income">
                            +{formatKr(tx.amount)}
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
              );
            })()}

          {activeHeroPopup === 'fixed' &&
            (fixedExpenses.length > 0 ? (
              <div className="ui-list-card">
                {fixedExpenses.map((exp) => {
                  const catLabel = exp.category || 'Räkningar';
                  const matchedTx =
                    periodRecurringMatches.matchedFixedTxByExpId.get(exp.id);
                  const effectiveAmt = matchedTx
                    ? Math.round(Math.abs(Number(matchedTx.amount) || 0))
                    : Math.round(Number(exp.amount) || 0);
                  const hasVariableDiff =
                    Boolean(matchedTx) &&
                    effectiveAmt !== Math.round(Number(exp.amount) || 0);

                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => {
                        if (onSelectFixed) {
                          setActiveHeroPopup(null);
                          onSelectFixed(exp);
                        }
                      }}
                      className="ui-tx-row"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemLogo
                          name={exp.name}
                          category={catLabel}
                          logoUrl={exp.logo}
                          size="md"
                          isRecurring={true}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title truncate block">
                            {exp.name}
                          </span>
                          <span className="ui-row-subtitle flex items-center gap-1">
                            <CategoryIcon
                              category={catLabel}
                              size={11}
                              className="shrink-0 text-[var(--text-secondary)]"
                            />
                            <span className="truncate">{catLabel}</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="ui-row-amount">
                          −{formatKr(effectiveAmt)}
                        </span>
                        <span className="ui-row-meta flex items-center justify-end gap-1">
                          <span>
                            {hasVariableDiff
                              ? `Riktvärde ${formatKr(exp.amount)}`
                              : `Den ${exp.dueDay || 28}:e`}
                          </span>
                          {matchedTx && (
                            <span className="text-positive font-medium">
                              · Betald
                            </span>
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="ui-list-card py-10 text-center text-footnote text-[var(--text-secondary)]">
                Inga fasta utgifter
              </div>
            ))}

          {activeHeroPopup === 'variable' &&
            (() => {
              if (variablePeriodTransactions.length === 0) {
                return (
                  <div className="ui-list-card py-10 text-center text-footnote text-[var(--text-secondary)]">
                    Inga rörliga utgifter i perioden
                  </div>
                );
              }

              const groupsMap = new Map<string, TransactionItem[]>();
              for (const tx of variablePeriodTransactions) {
                const key = tx.date || todayStr;
                const list = groupsMap.get(key);
                if (list) {
                  list.push(tx);
                } else {
                  groupsMap.set(key, [tx]);
                }
              }

              const sortedDateKeys = Array.from(groupsMap.keys()).sort((a, b) =>
                b.localeCompare(a)
              );

              return (
                <div className="space-y-4">
                  {sortedDateKeys.map((dateKey) => {
                    const items = groupsMap.get(dateKey) || [];
                    const dayNet = items.reduce((acc, item) => {
                      const amt = Number(item.amount) || 0;
                      return item.type === 'income' ? acc + amt : acc - amt;
                    }, 0);

                    return (
                      <div key={dateKey}>
                        <div className="ui-date-header">
                          <span className="font-medium text-[var(--text-secondary)]">
                            {formatSwedishDateHeading(dateKey)}
                          </span>
                          <span
                            className={`font-display font-medium tabular-nums ${
                              dayNet > 0
                                ? 'text-positive'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {dayNet > 0
                              ? `+${formatKr(dayNet)}`
                              : dayNet < 0
                              ? `−${formatKr(Math.abs(dayNet))}`
                              : formatKr(0)}
                          </span>
                        </div>

                        <section className="ui-list-card">
                          {items.map((tx) => {
                            const isRefund = tx.type === 'income';
                            const isPending =
                              tx.bookingStatus === 'PDNG' ||
                              tx.bookingStatus === 'HOLD';
                            const hasReceipts = Boolean(
                              (Array.isArray(tx.receipts) &&
                                tx.receipts.length > 0) ||
                                tx.receiptUrl
                            );
                            const statusSub = isPending
                              ? 'Reserverat'
                              : getTransactionTime(tx);

                            return (
                              <button
                                key={tx.id}
                                type="button"
                                onClick={() => {
                                  setActiveHeroPopup(null);
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
                                    isRecurring={false}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title">
                                      {tx.title}
                                    </span>
                                    <span className="ui-row-subtitle">
                                      <CategoryIcon
                                        category={tx.category}
                                        size={11}
                                        className="shrink-0"
                                      />
                                      <span className="truncate">
                                        {tx.category}
                                      </span>
                                      {tx.isHearted && (
                                        <Heart
                                          size={11}
                                          weight="fill"
                                          className="text-negative-solid shrink-0 ml-0.5"
                                        />
                                      )}
                                      {tx.isWaitingForPackage && (
                                        <Package
                                          size={11}
                                          weight="fill"
                                          className="text-caution-solid shrink-0 ml-0.5"
                                        />
                                      )}
                                      {hasReceipts && (
                                        <Paperclip
                                          size={11}
                                          weight="bold"
                                          className="text-[var(--text-secondary)] shrink-0 ml-0.5"
                                        />
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span
                                    className={
                                      isRefund
                                        ? 'ui-row-amount-income'
                                        : 'ui-row-amount'
                                    }
                                  >
                                    {isRefund
                                      ? `+${formatKr(tx.amount)}`
                                      : `−${formatKr(tx.amount)}`}
                                  </span>
                                  {statusSub ? (
                                    <span className="ui-row-meta">
                                      {statusSub}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </section>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </div>
      </BottomSheet>
    </>
);
