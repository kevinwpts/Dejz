import React, { useMemo } from 'react';
import {
  Bell,
  CalendarBlank,
  Package,
  X,
} from '@phosphor-icons/react';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod, isDateInPeriod } from '../../utils/periodEngine';
import { FixedExpenseItem, IncomeItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { findMatchingFixedExpense } from '../../utils/recurring';
import { formatSwedishDateHeading } from '../../utils/swedishDate';

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

  const waitingPackages = useMemo(() => {
    return transactions
      .filter((tx) => Boolean(tx.isWaitingForPackage))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const hasAnyNotifications =
    upcomingUnpaidFixed.length > 0 ||
    waitingPackages.length > 0;

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
                      <div className="ui-row-subtitle flex items-center gap-1">
                        <CategoryIcon
                          category={exp.category || 'Räkningar'}
                          size={11}
                          className="shrink-0 text-[var(--text-secondary)]"
                        />
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
                      <span className="ui-row-subtitle flex items-center gap-1">
                        <CategoryIcon
                          category={tx.category}
                          size={11}
                          className="shrink-0 text-[var(--text-secondary)]"
                        />
                        <span className="truncate">{tx.category}</span>
                        <span>· {formatSwedishDateHeading(tx.date)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="ui-row-amount">
                      -{formatKr(tx.amount)}
                    </span>
                    <span className="ui-row-meta">
                      {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                        ? 'Reserverat'
                        : getTransactionTime(tx)}
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

