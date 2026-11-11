import React, { useMemo } from 'react';
import {
  Plus,
  CaretRight,
  Users,
} from '@phosphor-icons/react';
import {
  FixedExpenseItem,
  IncomeItem,
  TransactionItem,
  AccountItem,
  formatFixedCancellationBadge,
  isFixedExpenseActiveInPeriod,
} from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon, PaymentMethodIcon } from './CategoryIcon';
import {
  PeriodInfo,
  isDateInPeriod,
} from '../utils/periodEngine';
import { reconcilePeriodRecurringMatches } from '../utils/recurring';
import { estimateVariableBill } from '../utils/variableBills';
import { formatIsoDateStockholm } from '../utils/swedishDate';
import {
  getHouseholdState,
  hasConnectedHouseholdPartner,
  calculateHouseholdSettlement,
  getMemberKey,
} from '../utils/householdSync';
import { getSavingsGoals } from '../utils/appCache';
import { EmptyClusterArtwork } from './ui/VisualArtwork';

interface FixedTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  transactions?: TransactionItem[];
  accounts?: AccountItem[];
  userEmail?: string | null;
  userName?: string | null;
  onSelectIncome: (inc: IncomeItem) => void;
  onSelectFixed: (exp: FixedExpenseItem) => void;
  onAddIncome?: () => void;
  onAddFixed?: () => void;
  onOpenDiscover?: () => void;
  onOpenHousehold?: () => void;
  onOpenGoals?: () => void;
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
  userEmail,
  userName,
  onSelectIncome,
  onSelectFixed,
  onAddIncome,
  onAddFixed,
  onOpenDiscover: _onOpenDiscover,
  onOpenHousehold,
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

  const savingsGoalsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of getSavingsGoals()) {
      map.set(g.id, g.name);
    }
    return map;
  }, [fixedExpenses, transactions]);

  const periodMatches = useMemo(() => {
    const periodTxs = transactions.filter((t) => isDateInPeriod(t.date, period));
    return reconcilePeriodRecurringMatches(periodTxs, fixedExpenses, incomes);
  }, [transactions, period, fixedExpenses, incomes]);

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
            <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
              +{formatKr(totalIncome)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label">
              Fasta utgifter
            </span>
            <span className="ui-stat-value text-[var(--text-primary)]">
              −{formatKr(totalFixedExpenses)}
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
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatKr(netAfterFixed)}
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* GENVÄG: DELAD BUDGET                                           */}
      {/* ============================================================== */}
      {(() => {
        const hh = getHouseholdState();
        if (!onOpenHousehold || !hh || !hasConnectedHouseholdPartner(hh)) return null;

        const settlement = calculateHouseholdSettlement(
          hh,
          getMemberKey(userEmail, userName),
          period.startDate
        );
        if (!settlement.partnerMember) return null;

        return (
          <button
            type="button"
            onClick={onOpenHousehold}
            className="w-full rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                <Users size={17} weight="regular" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] block truncate">
                  {hh.name} · Delad budget
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block truncate tabular-nums">
                  {settlement.isSettledForCurrentPeriod
                    ? 'Perioden är markerad som utjämnad'
                    : Math.abs(settlement.netBalance) < 5
                    ? 'Ni ligger helt jämnt i perioden'
                    : settlement.netBalance > 0
                    ? `${settlement.partnerMember.name} är skyldig dig ${formatKr(settlement.netBalance)}`
                    : `Du är skyldig ${settlement.partnerMember.name} ${formatKr(Math.abs(settlement.netBalance))}`}
                </span>
              </div>
            </div>
            <CaretRight
              size={14}
              weight="bold"
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-colors"
            />
          </button>
        );
      })()}

      {/* ============================================================== */}
      {/* SEKTION 1: INKOMSTER                                           */}
      {/* ============================================================== */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">
            Inkomster
          </h2>
          {onAddIncome && (
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
            <div className="py-9 px-4 text-center">
              <EmptyClusterArtwork variant="income" />
              <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
                Du har inga fasta inkomster än
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-[260px] mx-auto mt-1 mb-4 leading-relaxed">
                Lägg till din lön eller fasta inkomster för att få exakt koll på din lön-till-lön-budget.
              </p>
              {onAddIncome && (
                <button
                  type="button"
                  onClick={onAddIncome}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <span>Kom igång</span>
                </button>
              )}
            </div>
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
          {onAddFixed && (
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
                const isPartnerConnected = hasConnectedHouseholdPartner();
                const shareRatio =
                  isPartnerConnected && exp.isShared && exp.fullAmount && exp.fullAmount > 0 && exp.amount > 0
                    ? exp.amount / exp.fullAmount
                    : 1;
                const actualPaidAmt = matchedTx
                  ? Math.round(Math.abs(Number(matchedTx.amount) || 0) * shareRatio)
                  : Math.round(Number(exp.amount) || 0);
                const linkedGoalName = exp.linkedGoalId
                  ? savingsGoalsMap.get(exp.linkedGoalId)
                  : undefined;
                const cancelBadge = formatFixedCancellationBadge(exp);
                const isActiveInPeriod = isFixedExpenseActiveInPeriod(exp, period);
                const displayAmt =
                  !isActiveInPeriod && !matchedTx ? 0 : actualPaidAmt;
                const paymentMethodLabel = exp.paymentMethod || 'Autogiro';

                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => onSelectFixed(exp)}
                    className={`ui-tx-row ${!isActiveInPeriod && !matchedTx ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <ItemLogo
                        name={exp.name}
                        category={exp.category}
                        logoUrl={exp.logo}
                        size="md"
                        isRecurring={true}
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
                          {isPartnerConnected && exp.isShared && (
                            <span className="shrink-0">· Delad</span>
                          )}
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
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {cancelBadge}
                          </span>
                        ) : matchedTx ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
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
            <div className="py-9 px-4 text-center">
              <EmptyClusterArtwork variant="fixed" />
              <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
                Du har inga fasta utgifter än
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-[270px] mx-auto mt-1 mb-4 leading-relaxed">
                Lägg till dina fasta betalningar. Då får du en fullständig översikt över kommande räkningar och vad som är kvar att spendera.
              </p>
              {onAddFixed && (
                <button
                  type="button"
                  onClick={onAddFixed}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <span>Kom igång</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

