import React, { useMemo } from 'react';
import {
  Plus,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem, AccountItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { PeriodInfo } from '../utils/periodEngine';
import { EmptyClusterArtwork } from './ui/VisualArtwork';

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
  onSelectIncome,
  onSelectFixed,
  onAddIncome,
  onAddFixed,
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

        {/* Supertunn visuell linje för Fasta utgifter vs Kvar efter fasta */}
        {totalIncome > 0 && (
          <div className="mt-3.5 h-1.5 w-full rounded-full bg-[var(--bg-color)] overflow-hidden flex gap-0.5">
            {(() => {
              const fixedPct = Math.min(100, Math.max(0, (totalFixedExpenses / totalIncome) * 100));
              const netPct = Math.max(0, 100 - fixedPct);
              return (
                <>
                  {netPct > 0 && (
                    <div
                      className="h-full rounded-full bg-emerald-500/85 dark:bg-emerald-400/85 transition-all duration-500"
                      style={{ width: `${netPct}%` }}
                      title={`Kvar efter fasta (${Math.round(netPct)}%)`}
                    />
                  )}
                  {fixedPct > 0 && (
                    <div
                      className="h-full rounded-full bg-[var(--text-primary)]/35 transition-all duration-500"
                      style={{ width: `${fixedPct}%` }}
                      title={`Fasta utgifter (${Math.round(fixedPct)}%)`}
                    />
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

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
                    <span className="ui-row-meta">
                      Den {inc.payday}:e
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
            sortedExpenses.map((exp) => (
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
                    <span className="ui-row-title">
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
                      </span>
                    </span>
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
            ))
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
