import React, { useMemo } from 'react';
import {
  Coins,
  Receipt,
  Plus,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem, AccountItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod, isDateInPeriod } from '../utils/periodEngine';
import { findMatchingFixedExpense, findMatchingIncome } from '../utils/recurring';

interface FixedTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  transactions?: TransactionItem[];
  accounts?: AccountItem[];
  onSelectIncome: (inc: IncomeItem) => void;
  onSelectFixed: (exp: FixedExpenseItem) => void;
  onAddIncome?: () => void;
  onAddFixed?: () => void;
  onDeleteIncome: (id: string) => void;
  onDeleteFixed: (id: string) => void;
  onUpdateFixed?: (exp: FixedExpenseItem) => void;
}

export const FixedTab: React.FC<FixedTabProps> = ({
  period,
  incomes,
  fixedExpenses,
  totalIncome,
  totalFixedExpenses,
  transactions = [],
  accounts = [],
  onSelectIncome,
  onSelectFixed,
  onAddIncome,
  onAddFixed,
  onUpdateFixed,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const primaryAccountLabel = useMemo(() => {
    if (!accounts || accounts.length === 0) return undefined;
    const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
    return `${checking.bankName} · ${checking.name}`;
  }, [accounts]);

  const hasBankConnected = useMemo(() => {
    return (
      (accounts && accounts.length > 0) ||
      (transactions &&
        transactions.some((tx) => tx.id?.startsWith('bank-') || Boolean(tx.bankAccountName)))
    );
  }, [accounts, transactions]);

  const enrichedIncomes = useMemo(() => {
    const allIncomeTxs = (transactions || []).filter((tx) => tx.type === 'income');
    const periodIncomeTxs = allIncomeTxs.filter((tx) => isDateInPeriod(tx.date, period));

    return incomes
      .map((inc) => {
        const paydayDateInPeriod = getDueDateInPeriod(inc.payday, period);

        const matchedInPeriod = periodIncomeTxs.some((tx) =>
          Boolean(findMatchingIncome(tx, [inc]))
        );
        const matchedTx =
          periodIncomeTxs.find((tx) => Boolean(findMatchingIncome(tx, [inc]))) ||
          allIncomeTxs.find((tx) => Boolean(findMatchingIncome(tx, [inc])));

        const dueDatePassed = isDueDayPaidInPeriod(inc.payday, period);
        const isPaidInPeriod = hasBankConnected
          ? matchedInPeriod
          : matchedInPeriod || dueDatePassed;
        const isAwaitingBank = hasBankConnected && !matchedInPeriod && dueDatePassed;

        const resolvedAccount =
          inc.bankAccountName || matchedTx?.bankAccountName || primaryAccountLabel;

        return {
          ...inc,
          bankAccountName: resolvedAccount,
          paydayDateInPeriod,
          isPaid: isPaidInPeriod,
          isAwaitingBank,
          displayAmount: inc.amount,
          matchedTxDate: matchedTx?.date,
        };
      })
      .sort((a, b) => a.paydayDateInPeriod.getTime() - b.paydayDateInPeriod.getTime());
  }, [incomes, transactions, period, primaryAccountLabel, hasBankConnected]);

  const enrichedExpenses = useMemo(() => {
    const allExpenseTxs = (transactions || [])
      .filter((tx) => tx.type !== 'income' && !tx.isExcluded)
      .sort((a, b) => b.date.localeCompare(a.date));
    const periodExpenseTxs = allExpenseTxs.filter((tx) => isDateInPeriod(tx.date, period));

    return fixedExpenses
      .map((exp) => {
        const dueDateInPeriod = getDueDateInPeriod(exp.dueDay, period);

        const matchedHistory = allExpenseTxs.filter((tx) =>
          Boolean(findMatchingFixedExpense(tx, [exp]))
        );
        const periodMatchTx = periodExpenseTxs.find((tx) =>
          Boolean(findMatchingFixedExpense(tx, [exp]))
        );
        const matchedInPeriod = Boolean(periodMatchTx);
        const matchedTx = periodMatchTx || matchedHistory[0];

        const dueDatePassed = isDueDayPaidInPeriod(exp.dueDay, period);
        const isPaidInPeriod = hasBankConnected
          ? matchedInPeriod
          : matchedInPeriod || dueDatePassed;
        const isAwaitingBank = hasBankConnected && !matchedInPeriod && dueDatePassed;

        const resolvedAccount =
          exp.bankAccountName || matchedTx?.bankAccountName || primaryAccountLabel;

        const actualChargedAmount = matchedTx ? Math.round(Math.abs(Number(matchedTx.amount) || 0)) : null;
        const plannedAmt = Math.round(Math.abs(Number(exp.amount) || 0));
        const hasPriceChange =
          !exp.isShared &&
          actualChargedAmount !== null &&
          actualChargedAmount > 0 &&
          plannedAmt > 0 &&
          Math.abs(actualChargedAmount - plannedAmt) >= 5 &&
          Math.abs(actualChargedAmount - plannedAmt) / plannedAmt <= 0.4;

        return {
          ...exp,
          bankAccountName: resolvedAccount,
          dueDateInPeriod,
          isPaid: isPaidInPeriod,
          isAwaitingBank,
          displayAmount: exp.amount,
          matchedTxDate: matchedTx?.date,
          priceChangedTo: hasPriceChange ? actualChargedAmount : null,
        };
      })
      .sort((a, b) => a.dueDateInPeriod.getTime() - b.dueDateInPeriod.getTime());
  }, [fixedExpenses, transactions, period, primaryAccountLabel, hasBankConnected]);

  const unpaidTotal = useMemo(
    () =>
      enrichedExpenses
        .filter((e) => !e.isPaid)
        .reduce((acc, e) => acc + (Number(e.displayAmount) || 0), 0),
    [enrichedExpenses]
  );

  const netAfterFixed = totalIncome - totalFixedExpenses;

  return (
    <div className="ui-page">
      {/* ============================================================== */}
      {/* TOPPÖVERSIKT: INKOMST · FASTA UTGIFTER · KVAR EFTER FASTA      */}
      {/* ============================================================== */}
      <section className="ui-card-p">
        <div className="ui-stat-grid">
          <div className="pr-3 min-w-0">
            <span className="ui-stat-label">
              Inkomster
            </span>
            <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
              +{formatKr(totalIncome)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label">
              Fasta utgifter
            </span>
            <span className="ui-stat-value">
              -{formatKr(totalFixedExpenses)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label">
              Kvar efter fasta
            </span>
            <span
              className={`ui-stat-value ${
                netAfterFixed >= 0
                  ? ''
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatKr(netAfterFixed)}
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SEKTION 1: INKOMSTER                                           */}
      {/* ============================================================== */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">
            Inkomster
          </h2>
        </div>

        <div className="ui-list-card">
          {enrichedIncomes.length > 0 ? (
            enrichedIncomes.map((inc) => {
              const catLabel = inc.category || 'Lön';
              const isSameAsName =
                inc.name.trim().toLowerCase() === catLabel.trim().toLowerCase();
              const subtitleText = isSameAsName
                ? `Den ${inc.payday}:e varje månad`
                : `${catLabel} · Den ${inc.payday}:e`;

              return (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => onSelectIncome(inc)}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <ItemLogo
                      name={inc.name}
                      category={inc.category}
                      logoUrl={inc.logo}
                      size="md"
                      isRecurring={false}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {inc.name}
                      </span>
                      <span className="ui-row-subtitle">
                        {subtitleText}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="ui-row-amount-income">
                      +{formatKr(inc.displayAmount)}
                    </span>
                    <span
                      className={`ui-row-meta ${
                        inc.isPaid
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : inc.isAwaitingBank
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : ''
                      }`}
                    >
                      {inc.isPaid
                        ? 'Mottagen'
                        : inc.isAwaitingBank
                        ? 'Inväntar insättning'
                        : `Den ${inc.payday}:e`}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-5 text-center">
              <div className="ui-empty-icon">
                <Coins size={16} weight="duotone" />
              </div>
              <p className="ui-empty-sub">Inga inkomster</p>
            </div>
          )}

          {onAddIncome && (
            <button
              type="button"
              onClick={onAddIncome}
              className="w-full py-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Plus size={13} weight="bold" />
              <span>Lägg till</span>
            </button>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SEKTION 2: FASTA UTGIFTER & ABONNEMANG                         */}
      {/* ============================================================== */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">
            Fasta utgifter
          </h2>
        </div>

        <div className="ui-list-card">
          {enrichedExpenses.length > 0 ? (
            enrichedExpenses.map((exp) => (
              <div key={exp.id} className="border-b border-[var(--border-color)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelectFixed(exp)}
                  className="ui-tx-row !border-b-0"
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
                      <span className="ui-row-subtitle">
                        {exp.category || 'Räkningar'}
                        {exp.isShared && exp.fullAmount && exp.fullAmount > exp.amount
                          ? ` · Delad (av ${formatKr(exp.fullAmount)})`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="ui-row-amount">
                      -{formatKr(exp.displayAmount)}
                    </span>
                    <span
                      className={`ui-row-meta ${
                        exp.isPaid
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : exp.isAwaitingBank
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : ''
                      }`}
                    >
                      {exp.isPaid
                        ? 'Betald'
                        : exp.isAwaitingBank
                        ? 'Inväntar dragning'
                        : `Den ${exp.dueDay}:e`}
                    </span>
                  </div>
                </button>
                {exp.priceChangedTo && onUpdateFixed && (
                  <div className="px-4 pb-3 -mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Prisändring upptäckt: drogs med {formatKr(exp.priceChangedTo)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateFixed({
                          id: exp.id,
                          name: exp.name,
                          originalName: exp.originalName,
                          amount: exp.priceChangedTo!,
                          isShared: exp.isShared,
                          fullAmount: exp.fullAmount,
                          dueDay: exp.dueDay,
                          category: exp.category,
                          paymentMethod: exp.paymentMethod,
                          logo: exp.logo,
                          bankAccountName: exp.bankAccountName,
                        });
                      }}
                      className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer shrink-0"
                    >
                      Uppdatera till {formatKr(exp.priceChangedTo)}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-5 text-center">
              <div className="ui-empty-icon">
                <Receipt size={16} weight="duotone" />
              </div>
              <p className="ui-empty-sub">Inga fasta utgifter</p>
            </div>
          )}

          {onAddFixed && (
            <button
              type="button"
              onClick={onAddFixed}
              className="w-full py-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Plus size={13} weight="bold" />
              <span>Lägg till</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

