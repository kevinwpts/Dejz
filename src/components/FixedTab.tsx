import React, { useMemo } from 'react';
import {
  Plus,
  Sparkle,
  Check,
  CaretRight,
  Users,
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

  const periodMatches = useMemo(() => {
    const periodTxs = transactions.filter((t) => isDateInPeriod(t.date, period));
    return reconcilePeriodRecurringMatches(periodTxs, fixedExpenses, incomes);
  }, [transactions, period, fixedExpenses, incomes]);

  const isExpensePaid = (exp: FixedExpenseItem) => {
    return (
      periodMatches.matchedFixedIds.has(exp.id) ||
      isDueDayPaidInPeriod(exp.dueDay || 27, period)
    );
  };

  const isIncomeReceived = (inc: IncomeItem) => {
    return (
      periodMatches.matchedIncomeIds.has(inc.id) ||
      isDueDayPaidInPeriod(inc.payday || 25, period)
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
            <span className="ui-stat-label flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
              <span>Inkomster</span>
            </span>
            <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
              +{formatKr(totalIncome)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
              <span>Fasta utgifter</span>
            </span>
            <span className="ui-stat-value text-indigo-600 dark:text-indigo-400">
              -{formatKr(totalFixedExpenses)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  netAfterFixed >= 0
                    ? 'bg-sky-500 dark:bg-sky-400'
                    : 'bg-rose-500 dark:bg-rose-400'
                }`}
              />
              <span>Kvar efter fasta</span>
            </span>
            <span
              className={`ui-stat-value ${
                netAfterFixed >= 0
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatKr(netAfterFixed)}
            </span>
          </div>
        </div>

        {/* Tydligt färgkodad linje för Fasta utgifter (Indigo) vs Kvar efter fasta (Sky/Grön) */}
        {totalIncome > 0 && (
          <div className="mt-3.5 h-2 w-full rounded-full bg-[var(--bg-color)] overflow-hidden flex gap-1">
            {(() => {
              const fixedPct = Math.min(100, Math.max(0, (totalFixedExpenses / totalIncome) * 100));
              const netPct = Math.max(0, 100 - fixedPct);
              return (
                <>
                  {fixedPct > 0 && (
                    <div
                      className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
                      style={{ width: `${fixedPct}%` }}
                      title={`Fasta utgifter (${Math.round(fixedPct)}%)`}
                    />
                  )}
                  {netPct > 0 && (
                    <div
                      className="h-full rounded-full bg-sky-500 dark:bg-sky-400 transition-all duration-500"
                      style={{ width: `${netPct}%` }}
                      title={`Kvar efter fasta (${Math.round(netPct)}%)`}
                    />
                  )}
                </>
              );
            })()}
          </div>
        )}

        {paidStats.totalCount > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)] tabular-nums">
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
                <div className="w-9 h-9 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Users size={17} weight="fill" />
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
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users size={17} weight="fill" />
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
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkle size={17} weight="fill" />
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
                    <span className="ui-row-meta flex items-center justify-end gap-1.5">
                      <span>Den {inc.payday}:e</span>
                      {received && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                          <Check size={9} weight="bold" />
                          <span>Utbetald</span>
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
                      <span className="ui-row-title flex items-center gap-1.5">
                        <span className="truncate">{exp.name}</span>
                        {exp.isShared && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold shrink-0">
                            <Users size={10} weight="bold" />
                            <span>Delad</span>
                          </span>
                        )}
                      </span>
                      <span className="ui-row-subtitle flex items-center gap-1">
                        <CategoryIcon
                          category={exp.category || 'Räkningar'}
                          size={11}
                          className="shrink-0 text-[var(--text-secondary)]"
                        />
                        <span className="truncate">
                          {exp.category || 'Räkningar'}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="ui-row-amount">
                      -{formatKr(exp.amount)}
                    </span>
                    <span className="ui-row-meta flex items-center justify-end gap-1.5">
                      <span>Den {exp.dueDay}:e</span>
                      {paid && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                          <Check size={9} weight="bold" />
                          <span>Betald</span>
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
    </div>
  );
};
