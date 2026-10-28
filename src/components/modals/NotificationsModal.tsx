import React, { useMemo } from 'react';
import {
  Bell,
  CalendarBlank,
  Package,
  TrendUp,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod, isDateInPeriod } from '../../utils/periodEngine';
import { FixedExpenseItem, IncomeItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { findMatchingFixedExpense } from '../../utils/recurring';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: PeriodInfo;
  kvarAttSpendera?: number;
  dagsbudget?: number;
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  transactions?: TransactionItem[];
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  period,
  kvarAttSpendera = 0,
  dagsbudget = 0,
  fixedExpenses = [],
  transactions = [],
  onSelectFixed,
  onSelectTransaction,
}) => {
  const formatKr = (amount: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';

  const hasBankConnected = useMemo(
    () =>
      transactions.some(
        (tx) => tx.id?.startsWith('bank-') || Boolean(tx.bankAccountName)
      ),
    [transactions]
  );

  const upcomingUnpaidFixed = useMemo(() => {
    if (!period || fixedExpenses.length === 0) return [];
    const allExpenseTxs = transactions.filter((tx) => tx.type !== 'income');
    const periodExpenseTxs = allExpenseTxs.filter((tx) => isDateInPeriod(tx.date, period));

    return fixedExpenses
      .map((exp) => {
        const dueDate = getDueDateInPeriod(exp.dueDay, period);
        const matchedInPeriod = periodExpenseTxs.some((tx) =>
          Boolean(findMatchingFixedExpense(tx, [exp]))
        );
        const isPaid = hasBankConnected
          ? matchedInPeriod
          : matchedInPeriod || isDueDayPaidInPeriod(exp.dueDay, period);
        return { exp, dueDate, isPaid };
      })
      .filter((item) => !item.isPaid)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [fixedExpenses, transactions, period, hasBankConnected]);

  const priceIncreasedFixed = useMemo(() => {
    if (fixedExpenses.length === 0 || transactions.length === 0) return [];
    const expenseTxs = transactions
      .filter((tx) => tx.type !== 'income' && !tx.isExcluded)
      .sort((a, b) => b.date.localeCompare(a.date));

    const results: { exp: FixedExpenseItem; diff: number; prevAmt: number; latestAmt: number }[] = [];

    for (const exp of fixedExpenses) {
      const matched = expenseTxs.filter((tx) => Boolean(findMatchingFixedExpense(tx, [exp])));
      if (matched.length >= 2) {
        const shareRatio =
          exp.isShared && exp.fullAmount && exp.fullAmount > 0 && exp.amount > 0
            ? exp.amount / exp.fullAmount
            : 1;
        const latestAmt = Math.round((Number(matched[0].amount) || 0) * shareRatio);
        const prevAmt = Math.round((Number(matched[1].amount) || 0) * shareRatio);
        if (latestAmt - prevAmt >= 5) {
          results.push({
            exp,
            diff: latestAmt - prevAmt,
            prevAmt,
            latestAmt,
          });
        }
      }
    }
    return results;
  }, [fixedExpenses, transactions]);

  const waitingPackages = useMemo(() => {
    return transactions
      .filter((tx) => Boolean(tx.isWaitingForPackage))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const hasAnyNotifications =
    upcomingUnpaidFixed.length > 0 ||
    priceIncreasedFixed.length > 0 ||
    waitingPackages.length > 0 ||
    Boolean(period);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      surfaceClass="bg-[var(--bg-color)]"
      maxHeightClass="max-h-[88dvh]"
      zIndexClass="z-[120]"
      disablePadding={true}
    >
      {/* Header */}
      <div className="px-5 pt-1 pb-3.5 flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0">
        <span className="ui-sheet-title">
          Notiser & insikter
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn-surface"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto space-y-4">
        {/* Period & Dagsbudget Status */}
        {period && (
          <section className="ui-section">
            <div className="ui-section-header">
              <h2 className="ui-section-title">
                Status för löneperioden
              </h2>
              <span className="ui-section-meta">
                {period.daysRemaining} {period.daysRemaining === 1 ? 'dag' : 'dagar'} till lön
              </span>
            </div>

            <div className="ui-card-p flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkle size={18} weight="fill" />
                </div>
                <div className="min-w-0">
                  <span className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] tabular-nums block truncate">
                    {formatKr(dagsbudget)} / dag kvar
                  </span>
                  <span className="ui-row-meta truncate">
                    Totalt {formatKr(kvarAttSpendera)} kvar att spendera
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Prishöjningsvakt */}
        {priceIncreasedFixed.length > 0 && (
          <section className="ui-section">
            <div className="ui-section-header">
              <h2 className="ui-section-title">
                <TrendUp size={14} className="text-amber-500" />
                <span>Upptäckta prishöjningar ({priceIncreasedFixed.length})</span>
              </h2>
            </div>

            <div className="ui-list-card">
              {priceIncreasedFixed.map(({ exp, diff, prevAmt, latestAmt }) => (
                <button
                  key={`price-inc-${exp.id}`}
                  type="button"
                  onClick={() => {
                    if (onSelectFixed) {
                      onClose();
                      onSelectFixed(exp);
                    }
                  }}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <ItemLogo
                      name={exp.name}
                      category={exp.category}
                      logoUrl={exp.logo}
                      size="md"
                      isRecurring={false}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {exp.name}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block truncate mt-0.5 tabular-nums">
                        Höjd från {formatKr(prevAmt)} till {formatKr(latestAmt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-amber-600 dark:text-amber-400 tabular-nums block">
                      +{formatKr(diff)}/mån
                    </span>
                    <span className="ui-row-meta">
                      Den {exp.dueDay}:e
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Kommande obetalda fasta utgifter */}
        {upcomingUnpaidFixed.length > 0 && (
          <section className="ui-section">
            <div className="ui-section-header">
              <h2 className="ui-section-title">
                <CalendarBlank size={14} />
                <span>Kommande fasta utgifter ({upcomingUnpaidFixed.length})</span>
              </h2>
              <span className="ui-row-amount text-[13px] sm:text-sm">
                -{formatKr(upcomingUnpaidFixed.reduce((acc, i) => acc + i.exp.amount, 0))}
              </span>
            </div>

            <div className="ui-list-card">
              {upcomingUnpaidFixed.map(({ exp }) => (
                <button
                  key={`unpaid-${exp.id}`}
                  type="button"
                  onClick={() => {
                    if (onSelectFixed) {
                      onClose();
                      onSelectFixed(exp);
                    }
                  }}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <ItemLogo
                      name={exp.name}
                      category={exp.category}
                      logoUrl={exp.logo}
                      size="md"
                      isRecurring={false}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {exp.name}
                      </span>
                      <div className="ui-row-subtitle">
                        <span className="truncate">{exp.category || 'Räkningar'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="ui-row-amount">
                      -{formatKr(exp.amount)}
                    </span>
                    <span className="ui-row-meta">
                      Den {exp.dueDay}:e
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Paket på väg */}
        {waitingPackages.length > 0 && (
          <section className="ui-section">
            <div className="ui-section-header">
              <h2 className="ui-section-title">
                <Package size={14} className="text-amber-500" weight="fill" />
                <span>Väntar på paket ({waitingPackages.length})</span>
              </h2>
            </div>

            <div className="ui-list-card">
              {waitingPackages.map((tx) => (
                <button
                  key={`pkg-${tx.id}`}
                  type="button"
                  onClick={() => {
                    if (onSelectTransaction) {
                      onClose();
                      onSelectTransaction(tx);
                    }
                  }}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="md"
                      isRecurring={false}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                        <span className="truncate">{tx.title}</span>
                        <Package size={13} weight="fill" className="text-amber-500 shrink-0" />
                      </span>
                      <span className="ui-row-subtitle">
                        <span className="truncate">{tx.category}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="ui-row-amount">
                      -{formatKr(tx.amount)}
                    </span>
                    <span className="ui-row-meta">
                      {getTransactionTime(tx) || tx.date}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!hasAnyNotifications && (
          <section className="ui-empty-state">
            <Bell size={44} weight="light" className="ui-empty-icon" />
            <p className="ui-empty-title">
              Inga nya notiser
            </p>
          </section>
        )}
      </div>
    </BottomSheet>
  );
};

