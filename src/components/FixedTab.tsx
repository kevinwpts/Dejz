import React, { useMemo } from 'react';
import { Plus } from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem, AccountItem, formatFixedCancellationBadge } from '../app/models';
import { isFixedExpenseActiveInPeriod, getFixedExpenseAmountInPeriod, PeriodMatches } from '../utils/budgetEngine';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon, PaymentMethodIcon } from './CategoryIcon';
import {
  PeriodInfo,
  isDateInPeriod,
} from '../utils/periodEngine';
import { reconcilePeriodRecurringMatches } from '../utils/recurring/periodReconcile';
import { estimateVariableBill } from '../utils/variableBills';
import { formatIsoDateStockholm } from '../utils/swedishDate';
import { useSavingsGoals } from '../utils/hooks/useSavingsGoals';

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
  onOpenDiscover?: () => void;
  onOpenGoals?: () => void;
  onDeleteIncome: (id: string) => void;
  onDeleteFixed: (id: string) => void;
  onUpdateFixed?: (exp: FixedExpenseItem) => void;
  /** Periodens kopplingar mellan dragningar och fasta poster – samma som hemkortet räknar med */
  periodMatches?: PeriodMatches;
}

/** Tomt läge i en lista: en enda tydlig rad att trycka på (ersätter illustration + dubbla knappar) */
const EmptyAddRow: React.FC<{ title: string; subtitle: string; onClick?: () => void }> = ({
  title,
  subtitle,
  onClick,
}) => (
  <button type="button" onClick={onClick} disabled={!onClick} className="ui-tx-row">
    <span className="flex items-center gap-3 min-w-0 flex-1">
      <span className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--on-accent-container)] flex items-center justify-center shrink-0">
        <Plus size={20} weight="bold" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ui-row-title text-[var(--on-accent-container)]">{title}</span>
        <span className="ui-row-subtitle">{subtitle}</span>
      </span>
    </span>
  </button>
);

export const FixedTab: React.FC<FixedTabProps> = ({
  period,
  incomes,
  fixedExpenses,
  totalIncome,
  totalFixedExpenses,
  transactions = [],
  onSelectIncome,
  onSelectFixed,
  onAddIncome,
  onAddFixed,
  onOpenDiscover: _onOpenDiscover,
  periodMatches: periodMatchesFromApp,
}) => {

  const formatPaidDate = (iso?: string) => {
    const d = new Date(`${(iso || '').slice(0, 10)}T12:00:00`);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()]}`;
  };

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const sortedIncomes = useMemo(() => {
    return [...incomes].sort((a, b) => (a.payday || 25) - (b.payday || 25));
  }, [incomes]);

  const sortedExpenses = useMemo(() => {
    return [...fixedExpenses].sort((a, b) => (a.dueDay || 27) - (b.dueDay || 27));
  }, [fixedExpenses]);

  // Sparmålen ligger i localStorage – läses vid varje rendering och när de sparas
  const savingsGoals = useSavingsGoals();
  const savingsGoalsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of savingsGoals) {
      map.set(g.id, g.name);
    }
    return map;
  }, [savingsGoals]);

  // Samma kopplingar som hemkortet räknar med (skickas från App). Reserv om de saknas.
  const fallbackMatches = useMemo(() => {
    if (periodMatchesFromApp) return null;
    const periodTxs = transactions.filter((t) => isDateInPeriod(t.date, period));
    return reconcilePeriodRecurringMatches(periodTxs, fixedExpenses, incomes);
  }, [periodMatchesFromApp, transactions, period, fixedExpenses, incomes]);
  const periodMatches = periodMatchesFromApp || fallbackMatches;

  // Räkningar vars belopp varierar (t.ex. el) – visas med "≈" tills de dragits
  const variableExpenseIds = useMemo(() => {
    const ids = new Set<string>();
    if (!period?.startDate) return ids;
    const startIso = formatIsoDateStockholm(period.startDate);
    for (const exp of fixedExpenses) {
      if (estimateVariableBill(exp, transactions, startIso)) ids.add(exp.id);
    }
    return ids;
  }, [fixedExpenses, transactions, period]);

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
            <span className={`ui-stat-value ${totalIncome > 0 ? 'text-positive' : 'text-[var(--text-primary)]'}`}>
              {totalIncome > 0 ? '+' : ''}{formatKr(totalIncome)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label">
              Fasta utgifter
            </span>
            <span className="ui-stat-value text-[var(--text-primary)]">
              {Math.round(totalFixedExpenses) !== 0 ? '−' : ''}{formatKr(totalFixedExpenses)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label">
              Kvar efter fasta
            </span>
            <span
              className={`ui-stat-value ${
                netAfterFixed >= 0
                  ? 'text-[var(--text-primary)]'
                  : 'text-negative'
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
          {onAddIncome && sortedIncomes.length > 0 && (
            <button
              type="button"
              onClick={onAddIncome}
              className="ui-section-action"
            >
              <Plus size={13} weight="bold" />
              <span>Lägg till</span>
            </button>
          )}
        </div>

        <div className="ui-list-card">
          {sortedIncomes.length > 0 ? (
            sortedIncomes.map((inc) => {
              const catLabel = inc.category || 'Lön';
              const matchedTx = periodMatches?.matchedIncomeTxByIncId?.get(inc.id);
              const actualReceivedAmt = matchedTx
                ? Math.round(Math.abs(Number(matchedTx.amount) || 0))
                : Math.round(Number(inc.amount) || 0);

              return (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => onSelectIncome(inc)}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
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
                      <span className="ui-row-subtitle min-w-0">
                        <CategoryIcon category={catLabel} size={11} className="shrink-0" />
                        <span className="truncate">{catLabel}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="ui-row-amount-income">
                      +{formatKr(actualReceivedAmt)}
                    </span>
                    <span className="ui-row-meta flex items-center justify-end gap-1">
                      <span>Den {inc.payday || 25}:e</span>
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <EmptyAddRow
              title="Lägg till din lön"
              subtitle="Då vet Dejz hur mycket som kommer in"
              onClick={onAddIncome}
            />
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SEKTION 2: FASTA UTGIFTER                                      */}
      {/* ============================================================== */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">
            Fasta utgifter
          </h2>
          {onAddFixed && sortedExpenses.length > 0 && (
            <button
              type="button"
              onClick={onAddFixed}
              className="ui-section-action"
            >
              <Plus size={13} weight="bold" />
              <span>Lägg till</span>
            </button>
          )}
        </div>

        <div className="ui-list-card">
          {sortedExpenses.length > 0 ? (
            sortedExpenses.map((exp) => {
                const matchedTx = periodMatches?.matchedFixedTxByExpId?.get(exp.id);
                // Samma uträkning som hemkortet (räknemotorn)
                const actualPaidAmt = Math.round(getFixedExpenseAmountInPeriod(exp, matchedTx, period));
                const linkedGoalName = exp.linkedGoalId
                  ? savingsGoalsMap.get(exp.linkedGoalId)
                  : undefined;
                const cancelBadge = formatFixedCancellationBadge(exp);
                const isActiveInPeriod = isFixedExpenseActiveInPeriod(exp, period);
                const displayAmt = actualPaidAmt;
                const paymentMethodLabel = exp.paymentMethod || 'Autogiro';

                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => onSelectFixed(exp)}
                    className={`ui-tx-row ${!isActiveInPeriod && !matchedTx ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ItemLogo
                        name={exp.name}
                        category={exp.category}
                        logoUrl={exp.logo}
                        size="md"
                        isRecurring={false}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title truncate block">
                          {exp.name}
                        </span>
                        <span className="ui-row-subtitle min-w-0">
                          <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                            <CategoryIcon
                              category={exp.category || 'Räkningar'}
                              size={11}
                              className="shrink-0"
                            />
                            <span className="truncate">{exp.category || 'Räkningar'}</span>
                          </span>
                          {linkedGoalName && (
                            <span className="truncate">· {linkedGoalName}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="ui-row-amount">
                        {displayAmt > 0
                          ? `${!matchedTx && variableExpenseIds.has(exp.id) ? '≈ ' : ''}−${formatKr(displayAmt)}`
                          : '0 kr'}
                      </span>
                      <span className="ui-row-meta flex items-center justify-end gap-1">
                        <span
                          className="inline-flex shrink-0 text-[var(--text-muted)]"
                          title={paymentMethodLabel}
                          aria-label={paymentMethodLabel}
                        >
                          <PaymentMethodIcon method={paymentMethodLabel} size={11} />
                        </span>
                        {cancelBadge ? (
                          <span className="text-caution font-medium">
                            {cancelBadge}
                          </span>
                        ) : matchedTx ? (
                          <span className="text-positive font-medium">
                            Betald {formatPaidDate(matchedTx.date)}
                          </span>
                        ) : (
                          <span>Den {exp.dueDay || 27}:e</span>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })
          ) : (
            <EmptyAddRow
              title="Lägg till en räkning"
              subtitle="Hyra, el, mobil, streaming …"
              onClick={onAddFixed}
            />
          )}
        </div>
      </section>
    </div>
  );
};

