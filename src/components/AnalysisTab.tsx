import React, { useState, useMemo } from 'react';
import type { PeriodInfo, WeekendHandlingMode } from '../utils/periodEngine';
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../app/models';
import type { BankAccount } from '../services/bankService';
import { useAnalysisData } from './analysis/useAnalysisData';
import { AnalysisPeriodNav, AnalysisPeriodSheet } from './analysis/AnalysisPeriodSelector';
import { AnalysisDonutChart } from './analysis/AnalysisDonutChart';
import { AnalysisCategoryList } from './analysis/AnalysisCategoryList';
import { formatKr } from './analysis/formatKr';

interface AnalysisTabProps {
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
  targetPayday?: number;
  weekendHandling?: WeekendHandlingMode;
  excludeInternalTransfers?: boolean;
  bankAccounts?: BankAccount[];
  userEmail?: string | null;
  userName?: string | null;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onSelectIncome?: (inc: IncomeItem) => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  incomes,
  fixedExpenses,
  transactions,
  targetPayday = 25,
  weekendHandling = 'before',
  excludeInternalTransfers = true,
  bankAccounts = [],
  userEmail = null,
  userName = null,
  onSelectTransaction,
  onSelectFixed,
  onSelectIncome,
}) => {
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [inspectedCategory, setInspectedCategory] = useState<string | null>(null);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  // Alla siffror för vald period (se analysis/useAnalysisData.ts)
  const {
    availablePeriods,
    computedPeriod,
    periodIncomeTotal,
    totalSpent,
    netSavings,
    categoryBreakdown,
    expenseChartSlices,
  } = useAnalysisData({
    incomes,
    fixedExpenses,
    transactions,
    targetPayday,
    weekendHandling,
    excludeInternalTransfers,
    bankAccounts,
    userEmail,
    userName,
    periodOffset,
  });

  const [selectedSliceCategory, setSelectedSliceCategory] = useState<string | null>(null);

  // Nollställ vald tårtbit om den inte finns i den valda perioden (justeras direkt under render)
  if (
    selectedSliceCategory &&
    !expenseChartSlices.some((s) => s.category === selectedSliceCategory)
  ) {
    setSelectedSliceCategory(null);
  }

  const activeSlice = useMemo(() => {
    if (!selectedSliceCategory) return null;
    return expenseChartSlices.find((s) => s.category === selectedSliceCategory) || null;
  }, [expenseChartSlices, selectedSliceCategory]);

  return (
    <div className="ui-page">
      {/* Sektion 0: Minimalistisk Periodväljare + Frilagd Hero-Cirkel direkt mot bakgrunden */}
      <div className="pt-0.5 pb-1">
        <AnalysisPeriodNav
          period={computedPeriod}
          periodOffset={periodOffset}
          setPeriodOffset={setPeriodOffset}
          onOpenMenu={() => setIsPeriodMenuOpen(true)}
        />

        {/* Frilagd Interaktiv Hero-Cirkel (Open Canvas utan instängd kort-modul) */}
        <AnalysisDonutChart
          slices={expenseChartSlices}
          activeSlice={activeSlice}
          selectedSliceCategory={selectedSliceCategory}
          setSelectedSliceCategory={setSelectedSliceCategory}
          onShowAll={() => {
            setSelectedSliceCategory(null);
            setInspectedCategory(null);
          }}
          totalSpent={totalSpent}
        />
      </div>

      <AnalysisPeriodSheet
        isOpen={isPeriodMenuOpen}
        onClose={() => setIsPeriodMenuOpen(false)}
        availablePeriods={availablePeriods}
        periodOffset={periodOffset}
        onSelectOffset={(offset) => {
          setPeriodOffset(offset);
          setIsPeriodMenuOpen(false);
        }}
      />

      {/* Sektion 1: Sammanhållen 3-kolumns Översikt (Inkomst · Utgifter · Kvar) */}
      <section className="ui-card-p">
        <div className="ui-stat-grid">
          <div className="pr-3 min-w-0">
            <span className="ui-stat-label">
              Inkomst
            </span>
            <span className="ui-stat-value text-positive">
              +{formatKr(periodIncomeTotal)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label">
              Utgifter
            </span>
            <span className="ui-stat-value text-[var(--text-primary)]">
              −{formatKr(totalSpent)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label">
              Kvar
            </span>
            <span
              className={`ui-stat-value ${
                netSavings >= 0
                  ? 'text-[var(--text-primary)]'
                  : 'text-negative'
              }`}
            >
              {netSavings >= 0 ? formatKr(netSavings) : formatKr(netSavings)}
            </span>
          </div>
        </div>
      </section>

      {/* Sektion 2: Kategorier (Inline Dropdown / Accordion utan nästlade kort) */}
      <AnalysisCategoryList
        categoryBreakdown={categoryBreakdown}
        inspectedCategory={inspectedCategory}
        setInspectedCategory={setInspectedCategory}
        setSelectedSliceCategory={setSelectedSliceCategory}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        onSelectTransaction={onSelectTransaction}
        onSelectFixed={onSelectFixed}
        onSelectIncome={onSelectIncome}
      />
    </div>
  );
};
