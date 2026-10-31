import React, { useMemo } from 'react';
import {
  Plus,
  Sparkle,
  Check,
  CaretRight,
  Users,
  PiggyBank,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem, AccountItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import {
  PeriodInfo,
  isDateInPeriod,
  isDueDayPaidInPeriod,
} from '../utils/periodEngine';
import { reconcilePeriodRecurringMatches } from '../utils/recurring';
import {
  getHouseholdState,
  calculateHouseholdSettlement,
  getMemberKey,
} from '../utils/householdSync';
import { getSavingsGoals } from '../utils/appCache';
import { getGoalArtworkTheme, EmptyClusterArtwork } from './ui/VisualArtwork';

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
  onOpenDiscover,
  onOpenHousehold,
  onOpenGoals,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const sortedIncomes = useMemo(() => {
    return [...incomes].sort((a, b) => (a.payday || 25) - (b.payday || 25));
  }, [incomes]);

  const sortedExpenses = useMemo(() => {
    return [...fixedExpenses].sort((a, b) => (a.dueDay || 27) - (b.dueDay || 27));
  }, [fixedExpenses]);

  const savingsGoals = useMemo(() => getSavingsGoals(), [fixedExpenses, incomes]);

  const periodMatches = useMemo(() => {
    const periodTxs = transactions.filter((t) => isDateInPeriod(t.date, period));
    return reconcilePeriodRecurringMatches(periodTxs, fixedExpenses, incomes);
  }, [transactions, period, fixedExpenses, incomes]);

  const isExpensePaid = (exp: FixedExpenseItem) => {
    return (
      Boolean(
        periodMatches?.matchedFixedTxByExpId?.has(exp.id) ||
          periodMatches?.matchedFixedIds?.has(exp.id)
      ) || isDueDayPaidInPeriod(exp.dueDay || 27, period)
    );
  };

  const isIncomeReceived = (inc: IncomeItem) => {
    return (
      Boolean(
        periodMatches?.matchedIncomeTxByIncId?.has(inc.id) ||
          periodMatches?.matchedIncomeIds?.has(inc.id)
      ) || isDueDayPaidInPeriod(inc.payday || 25, period)
    );
  };

  const paidStats = useMemo(() => {
    let paidCount = 0;
    let remainingSum = 0;
    for (const exp of fixedExpenses) {
      if (isExpensePaid(exp)) {
        paidCount += 1;
      } else {
        remainingSum += Number(exp.amount) || 0;
      }
    }
    return {
      paidCount,
      totalCount: fixedExpenses.length,
      remainingSum,
    };
  }, [fixedExpenses, periodMatches, period]);

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
                  ? 'text-[var(--text-primary)]'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatKr(netAfterFixed)}
            </span>
          </div>
        </div>

        {paidStats.totalCount > 0 && (
          <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)] tabular-nums">
            <span className="flex items-center gap-1.5">
              <Check size={13} weight="bold" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {paidStats.paidCount} av {paidStats.totalCount} fasta utgifter betalda i perioden
              </span>
            </span>
            <span className="font-medium text-[var(--text-primary)] shrink-0">
              {paidStats.remainingSum > 0
                ? `${formatKr(paidStats.remainingSum)} kvar`
                : 'Alla dragna'}
            </span>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* GENVÄG: UPPTÄCK FASTA KOSTNADER & DELAD BUDGET                 */}
      {/* ============================================================== */}
      {(() => {
        const hh = getHouseholdState();
        if (!onOpenHousehold) return null;
        if (!hh) {
          const sharedCount = fixedExpenses.filter((f) => f.isShared).length;
          if (sharedCount === 0) return null;
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
                    Synka delad budget med din partner
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                    Du har {sharedCount} {sharedCount === 1 ? 'delad fast utgift' : 'delade fasta utgifter'} · Bjud in med kod
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
        }

        const settlement = calculateHouseholdSettlement(
          hh,
          getMemberKey(userEmail, userName),
          period.startDate
        );
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
                    : settlement.partnerMember
                    ? Math.abs(settlement.netBalance) < 5
                      ? 'Ni ligger helt jämnt i perioden'
                      : settlement.netBalance > 0
                      ? `${settlement.partnerMember.name} är skyldig dig ${formatKr(settlement.netBalance)}`
                      : `Du är skyldig ${settlement.partnerMember.name} ${formatKr(Math.abs(settlement.netBalance))}`
                    : `Totalt delat: ${formatKr(settlement.combinedTotalShared)} · Kod ${hh.inviteCode}`}
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

      {onOpenDiscover && transactions.length > 0 && (
        <button
          type="button"
          onClick={onOpenDiscover}
          className="w-full rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
              <Sparkle size={17} weight="regular" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] block truncate">
                Upptäck fasta kostnader
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                Hitta abonnemang och räkningar automatiskt från dina bankköp
              </span>
            </div>
          </div>
          <CaretRight
            size={14}
            weight="bold"
            className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-colors"
          />
        </button>
      )}

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
              const received = isIncomeReceived(inc);

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
                      +{formatKr(inc.amount)}
                    </span>
                    <span className="ui-row-meta flex items-center justify-end gap-1">
                      <span>Den {inc.payday}:e</span>
                      {received && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          · Utbetald
                        </span>
                      )}
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
              const paid = isExpensePaid(exp);
              return (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => onSelectFixed(exp)}
                  className="ui-tx-row"
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
                      <span className="ui-row-subtitle flex items-center gap-1">
                        <CategoryIcon
                          category={exp.category || 'Räkningar'}
                          size={11}
                          className="shrink-0 text-[var(--text-secondary)]"
                        />
                        <span className="truncate">
                          {exp.category || 'Räkningar'}
                          {exp.isShared ? ' · Delad' : ''}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="ui-row-amount">
                      -{formatKr(exp.amount)}
                    </span>
                    <span className="ui-row-meta flex items-center justify-end gap-1">
                      <span>Den {exp.dueDay}:e</span>
                      {paid && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          · Betald
                        </span>
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

      {/* ============================================================== */}
      {/* SEKTION 3: SPARMÅL & BUFFERT                                   */}
      {/* ============================================================== */}
      {onOpenGoals && (
        <section className="ui-section">
          <div className="ui-section-header">
            <h2 className="ui-section-title">
              Sparmål & buffert
            </h2>
            <button
              type="button"
              onClick={onOpenGoals}
              className="ui-section-action"
            >
              <Plus size={13} weight="bold" />
              <span>{savingsGoals.length > 0 ? 'Hantera' : 'Skapa mål'}</span>
            </button>
          </div>

          <div className="ui-list-card">
            {savingsGoals.length > 0 ? (
              savingsGoals.map((goal) => {
                const pct =
                  goal.targetAmount > 0
                    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                    : 0;
                const theme = getGoalArtworkTheme(goal.artworkId);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={onOpenGoals}
                    className="ui-tx-row"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: theme.heroBg }}
                      >
                        <PiggyBank size={18} weight="fill" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title truncate block">
                          {goal.name}
                        </span>
                        <span className="ui-row-subtitle tabular-nums">
                          {pct} % av {formatKr(goal.targetAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="ui-row-amount text-emerald-600 dark:text-emerald-400">
                        {formatKr(goal.currentAmount)}
                      </span>
                      <span className="ui-row-meta">
                        {goal.monthlyContribution
                          ? `+${formatKr(goal.monthlyContribution)}/mån`
                          : 'Sparmål'}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <button
                type="button"
                onClick={onOpenGoals}
                className="w-full py-4 flex items-center justify-between gap-3 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <PiggyBank size={17} weight="regular" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-display font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] block truncate">
                      Sätt upp ett sparmål eller buffert
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                      Följ dina mål och månadssparande direkt i budgeten
                    </span>
                  </div>
                </div>
                <CaretRight
                  size={14}
                  weight="bold"
                  className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-colors"
                />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

