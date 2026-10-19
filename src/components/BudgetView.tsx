import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUpDown, Clock, ChevronDown } from 'lucide-react';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { Button, Card, FilterButtonGroup } from './ui';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { BudgetCategoriesView } from './BudgetCategoriesView';
import { getActiveFixedExpenses, isExpenseCancelledAndExpired } from '../utils/cancellation';

interface BudgetViewProps {
  allTransactions?: any[];
  stats: any;
  config: Config;
  setConfig: (c: Config) => void;
  incomes: Income[];
  setIncomes: React.Dispatch<React.SetStateAction<Income[]>>;
  fixedExpenses: FixedExpense[];
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpense[]>>;
  onAddIncome: () => void;
  onEditIncome: (i: Income) => void;
  onAddFixedExpense: () => void;
  onEditFixedExpense: (e: FixedExpense) => void;
  onViewFixedExpense: (e: FixedExpense) => void;
  onViewIncome: (i: Income) => void;
  onAddMonthlySaving: () => void;
  onEditMonthlySaving: (s: any) => void;
  onViewMonthlySaving: (s: any) => void;
  onResetSavingsPot: () => void;
  t: (key: TranslationKey) => string;
  currentPeriodId: string;
  isDemoMode?: boolean;
  initialSection?: string | null;
  onClearSection?: () => void;
}

export function BudgetView({ 
  _allTransactions = [],
  stats,
  config,
  setConfig, 
  incomes, _setIncomes, 
  fixedExpenses, _setFixedExpenses, 
  onAddIncome, _onEditIncome,
  onAddFixedExpense, _onEditFixedExpense,
  onViewFixedExpense, onViewIncome,
  onAddMonthlySaving, _onEditMonthlySaving, onViewMonthlySaving,
  _onResetSavingsPot,
  t,
  currentPeriodId,
  _isDemoMode,
  initialSection,
  onClearSection
}: BudgetViewProps) {
  const [budgetFilter, setBudgetFilter] = React.useState<'fixed' | 'income' | 'savings'>('fixed');

  const [showCategoryBudgets, setShowCategoryBudgets] = React.useState(() => {
    return initialSection === 'category-budgets' || initialSection === 'allocate';
  });


  React.useEffect(() => {
    if (initialSection === 'category-budgets' || initialSection === 'allocate') {
      handleOpenCategoryBudgets();
    } else if (!initialSection) {
      setShowCategoryBudgets(false);
    }
  }, [initialSection]);

  const handleCloseCategoryBudgets = () => {
    try {
      localStorage.setItem('dejz_has_saved_initial_budget', 'true');
    } catch (_e) {
      // ignore
    }
    const updatedConfig = {
      ...config,
      hasSavedInitialBudget: true,
    };
    setConfig(updatedConfig);
    setShowCategoryBudgets(false);
    onClearSection?.();
  };

  const [fixedSortBy, setFixedSortBy] = React.useState<'day' | 'name' | 'amount'>('day');
  const [incomeSortBy, setIncomeSortBy] = React.useState<'day' | 'name' | 'amount'>('day');
  const [savingSortBy, setSavingSortBy] = React.useState<'day' | 'name' | 'amount'>('day');

  const [_selectedFreqFilter, _setSelectedFreqFilter] = React.useState<string>('all');
  const [_collapsedFreqs, _setCollapsedFreqs] = React.useState<Record<string, boolean>>({});

  const _toggleFreqCollapse = (freq: string) => {
    _setCollapsedFreqs(prev => ({ ...prev, [freq]: !prev[freq] }));
  };

  const _freqStats = React.useMemo(() => {
    const stats: Record<string, { count: number; totalMonthly: number; totalRaw: number }> = {
      [Frequency.MONTHLY]: { count: 0, totalMonthly: 0, totalRaw: 0 },
      [Frequency.QUARTERLY]: { count: 0, totalMonthly: 0, totalRaw: 0 },
      [Frequency.SEMI_ANNUALLY]: { count: 0, totalMonthly: 0, totalRaw: 0 },
      [Frequency.ANNUALLY]: { count: 0, totalMonthly: 0, totalRaw: 0 },
    };

    (fixedExpenses || []).forEach((e) => {
      const freq = e.frequency || Frequency.MONTHLY;
      const amount = (e.isVariable && e.periodOverrides && e.periodOverrides[currentPeriodId] !== undefined)
        ? e.periodOverrides[currentPeriodId]
        : (Number(e.amount) || 0);

      if (!stats[freq]) {
        stats[freq] = { count: 0, totalMonthly: 0, totalRaw: 0 };
      }
      stats[freq].count += 1;
      stats[freq].totalRaw += amount;

      let monthlyAmount = amount;
      if (freq === Frequency.QUARTERLY) monthlyAmount = amount / 3;
      else if (freq === Frequency.SEMI_ANNUALLY) monthlyAmount = amount / 6;
      else if (freq === Frequency.ANNUALLY) monthlyAmount = amount / 12;

      stats[freq].totalMonthly += monthlyAmount;
    });

    return stats;
  }, [fixedExpenses, currentPeriodId]);

  const sortedIncomes = React.useMemo(() => {
    const list = [...(incomes || [])];
    if (incomeSortBy === 'day') {
      return list.sort((a, b) => {
        const dayA = typeof a.deductionDay === 'number' && a.deductionDay > 0 ? a.deductionDay : 999;
        const dayB = typeof b.deductionDay === 'number' && b.deductionDay > 0 ? b.deductionDay : 999;
        if (dayA !== dayB) return dayA - dayB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (incomeSortBy === 'amount') {
      return list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    } else {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [incomes, incomeSortBy]);

  const [showCancelledList, setShowCancelledList] = React.useState(false);

  const activeFixedExpenses = React.useMemo(() => {
    return getActiveFixedExpenses(fixedExpenses, new Date(), stats?.periodStart, stats?.periodEnd);
  }, [fixedExpenses, stats?.periodStart, stats?.periodEnd]);

  const expiredCancelledExpenses = React.useMemo(() => {
    return (fixedExpenses || []).filter(e => isExpenseCancelledAndExpired(e, new Date()));
  }, [fixedExpenses]);

  const sortedFixedExpenses = React.useMemo(() => {
    const list = [...(activeFixedExpenses || [])];
    if (fixedSortBy === 'day') {
      return list.sort((a, b) => {
        const dayA = typeof a.deductionDay === 'number' && a.deductionDay > 0 ? a.deductionDay : 999;
        const dayB = typeof b.deductionDay === 'number' && b.deductionDay > 0 ? b.deductionDay : 999;
        if (dayA !== dayB) return dayA - dayB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (fixedSortBy === 'amount') {
      return list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    } else {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [activeFixedExpenses, fixedSortBy]);

  const filteredActiveFixedExpenses = sortedFixedExpenses;
  const filteredActiveIncomes = sortedIncomes;

  const totalMonthlyIncomeAverage = React.useMemo(() => {
    return (sortedIncomes || []).reduce((sum, i) => {
      const freq = i.frequency || Frequency.MONTHLY;
      const amount = (i.isVariable && i.periodOverrides && i.periodOverrides[currentPeriodId] !== undefined)
        ? i.periodOverrides[currentPeriodId]
        : (Number(i.amount) || 0);

      let monthlyAmount = amount;
      if (freq === Frequency.QUARTERLY) monthlyAmount = amount / 3;
      else if (freq === Frequency.SEMI_ANNUALLY) monthlyAmount = amount / 6;
      else if (freq === Frequency.ANNUALLY) monthlyAmount = amount / 12;

      return sum + monthlyAmount;
    }, 0);
  }, [sortedIncomes, currentPeriodId]);

  const totalMonthlyFixedAverage = React.useMemo(() => {
    return (sortedFixedExpenses || []).reduce((sum, e) => {
      const freq = e.frequency || Frequency.MONTHLY;
      const amount = (e.isVariable && e.periodOverrides && e.periodOverrides[currentPeriodId] !== undefined)
        ? e.periodOverrides[currentPeriodId]
        : (Number(e.amount) || 0);

      let monthlyAmount = amount;
      if (freq === Frequency.QUARTERLY) monthlyAmount = amount / 3;
      else if (freq === Frequency.SEMI_ANNUALLY) monthlyAmount = amount / 6;
      else if (freq === Frequency.ANNUALLY) monthlyAmount = amount / 12;

      return sum + monthlyAmount;
    }, 0);
  }, [sortedFixedExpenses, currentPeriodId]);



  const sortedSavings = React.useMemo(() => {
    const list = config?.monthlySavingsItems ? [...config.monthlySavingsItems] : [];
    if (savingSortBy === 'day') {
      return list.sort((a, b) => {
        const dayA = typeof a.deductionDay === 'number' && a.deductionDay > 0 ? a.deductionDay : 999;
        const dayB = typeof b.deductionDay === 'number' && b.deductionDay > 0 ? b.deductionDay : 999;
        if (dayA !== dayB) return dayA - dayB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (savingSortBy === 'amount') {
      return list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    } else {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [config?.monthlySavingsItems, config?.savingsGoals, config?.payday, savingSortBy]);




  // --- Category Budget Allocation Logic & Calculations ---
  const _totalIncomeSum = (incomes || []).reduce((sum, i) => {
    const amount = (i.isVariable && i.periodOverrides && i.periodOverrides[currentPeriodId] !== undefined)
      ? i.periodOverrides[currentPeriodId]
      : (Number(i.amount) || 0);
    return sum + amount;
  }, 0);

  const _groupedFixedExpenses = React.useMemo(() => {
    const groups: Record<Frequency, any[]> = {
      [Frequency.MONTHLY]: [],
      [Frequency.QUARTERLY]: [],
      [Frequency.SEMI_ANNUALLY]: [],
      [Frequency.ANNUALLY]: [],
    };

    (sortedFixedExpenses || []).forEach(e => {
      const freq = e.frequency || Frequency.MONTHLY;
      const targetFreq = groups[freq] ? freq : Frequency.MONTHLY;
      groups[targetFreq].push(e);
    });

    return groups;
  }, [sortedFixedExpenses]);

  const _groupedFixedSums = React.useMemo(() => {
    const sums: Record<Frequency, number> = {
      [Frequency.MONTHLY]: 0,
      [Frequency.QUARTERLY]: 0,
      [Frequency.SEMI_ANNUALLY]: 0,
      [Frequency.ANNUALLY]: 0,
    };

    (sortedFixedExpenses || []).forEach(e => {
      const freq = e.frequency || Frequency.MONTHLY;
      const amount = (e.isVariable && e.periodOverrides && e.periodOverrides[currentPeriodId] !== undefined)
        ? e.periodOverrides[currentPeriodId]
        : (Number(e.amount) || 0);

      const targetFreq = sums[freq] !== undefined ? freq : Frequency.MONTHLY;
      sums[targetFreq] += amount;
    });

    return sums;
  }, [sortedFixedExpenses, currentPeriodId]);

  const totalSavingsSum = stats?.totalSavings !== undefined
    ? stats.totalSavings
    : (Array.isArray(config.monthlySavingsItems)
        ? (config.monthlySavingsItems.reduce((sum, item) => {
            const amount = (item.isVariable && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined)
              ? item.periodOverrides[currentPeriodId]
              : (Number(item.amount) || Number((item as any).targetAmount) || 0);
            return sum + amount;
          }, 0) || 0)
        : (Number(config.monthlySavings) || 0));


  if (showCategoryBudgets) {
    return (
      <BudgetCategoriesView
        config={config}
        setConfig={setConfig}
        incomes={incomes}
        fixedExpenses={fixedExpenses}
        stats={stats}
        currentPeriodId={currentPeriodId}
        transactions={_allTransactions}
        t={t}
        initialTab="budget"
        mode="budget"
        onDone={handleCloseCategoryBudgets}
      />
    );
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-[var(--menu-content-gap)] font-sans"
    >
      {/* Top Controls: Clean FilterButtonGroup */}
      <FilterButtonGroup
        options={[
          {
            id: 'fixed',
            label: config?.language === 'en' ? 'Fixed expenses' : 'Fasta utgifter',
          },
          {
            id: 'income',
            label: config?.language === 'en' ? 'Income' : 'Inkomster',
          },
          {
            id: 'savings',
            label: config?.language === 'en' ? 'Savings' : 'Sparande',
          },
        ]}
        selectedId={budgetFilter}
        onSelect={(id) => setBudgetFilter(id as 'fixed' | 'income' | 'savings')}
        ariaLabel={config?.language === 'en' ? 'Filter finances' : 'Filtrera ekonomi'}
      />

      {/* Overview Summary Card */}
      <Card variant="default" padding="md" className="select-none space-y-1">
        <div>
          <span className="text-metric-label font-medium text-[var(--text-secondary)]">
            {budgetFilter === 'income' && (config?.language === 'en' ? 'Total monthly income' : 'Totala månadsinkomster')}
            {budgetFilter === 'savings' && (config?.language === 'en' ? 'Total monthly savings' : 'Totalt månadssparande')}
            {budgetFilter === 'fixed' && (config?.language === 'en' ? 'Total monthly fixed expenses' : 'Totala fasta utgifter')}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 pt-1">
          <AnimatedNumber
            value={Math.round(
              budgetFilter === 'income'
                ? totalMonthlyIncomeAverage
                : budgetFilter === 'savings'
                ? totalSavingsSum
                : totalMonthlyFixedAverage
            )}
            className="text-large-amount text-[var(--text-primary)] font-bold font-amount tabular-nums"
            formatter={(val) => {
              const prefix = budgetFilter === 'income' ? '+' : '−';
              return `${prefix}${formatAmount(val, config?.language)}`;
            }}
          />
          <span className="text-label font-medium text-[var(--text-secondary)] select-none">
            {config?.currency || 'kr'}
            <span className="text-micro-label text-[var(--text-tertiary)] ml-0.5">
              {config?.language === 'en' ? '/mo' : '/mån'}
            </span>
          </span>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={budgetFilter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-[var(--card-gap)]"
        >
          {/* Incomes Section */}
          {budgetFilter === 'income' && (
            <div className="space-y-[var(--card-gap)]">
              {sortedIncomes.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-0.5 mb-2.5 sm:mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (incomeSortBy === 'day') setIncomeSortBy('name');
                        else if (incomeSortBy === 'name') setIncomeSortBy('amount');
                        else setIncomeSortBy('day');
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-button-sm,10px)] text-label text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer select-none active:scale-95"
                      title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                    >
                      <ArrowUpDown size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)]">
                        {incomeSortBy === 'day' 
                          ? (config.language === 'en' ? 'Day' : 'Ankomstdag')
                          : incomeSortBy === 'name'
                          ? (config.language === 'en' ? 'Name' : 'Namn')
                          : (config.language === 'en' ? 'Amount' : 'Belopp')
                        }
                      </span>
                    </button>
                    <Button 
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={13} strokeWidth={2.5} />}
                      onClick={onAddIncome}
                    >
                      {t('newIncome')}
                    </Button>
                  </div>

                  <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle overflow-hidden divide-subtle">
                    {filteredActiveIncomes.map((income) => (
                      <BudgetItem 
                        key={income.id}
                        item={income} 
                        onClick={() => onViewIncome(income)} 
                        currency={config?.currency || 'kr'} 
                        type="income"
                        language={config.language as Language}
                        t={t}
                        config={config}
                        currentPeriodId={currentPeriodId}
                        isGrouped={true}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title={
                    config.language === 'en' ? 'No income added yet' : 'Ingen inkomst inlagd än'
                  } 
                  description={config.language === 'en' ? 'Add your salary or other regular income to calculate your daily budget.' : 'Lägg in din lön eller andra inkomster för att räkna ut din dagsbudget.'}
                  actionLabel={`+ ${t('newIncome')}`}
                  onAction={onAddIncome}
                />
              )}
            </div>
          )}

          {/* Fixed Expenses Section */}
          {budgetFilter === 'fixed' && (
            <div className="space-y-[var(--card-gap)]">
              {filteredActiveFixedExpenses.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-0.5 mb-2.5 sm:mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (fixedSortBy === 'day') setFixedSortBy('name');
                        else if (fixedSortBy === 'name') setFixedSortBy('amount');
                        else setFixedSortBy('day');
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-button-sm,10px)] text-label text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer select-none active:scale-95 min-w-0"
                      title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                    >
                      <ArrowUpDown size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)] truncate">
                        {fixedSortBy === 'day' 
                          ? (config.language === 'en' ? 'Day' : 'Dragningsdag')
                          : fixedSortBy === 'name'
                          ? (config.language === 'en' ? 'Name' : 'Namn')
                          : (config.language === 'en' ? 'Amount' : 'Belopp')
                        }
                      </span>
                    </button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={13} strokeWidth={2.5} />}
                      onClick={onAddFixedExpense}
                    >
                      {t('newFixedExpense')}
                    </Button>
                  </div>

                  <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle overflow-hidden divide-subtle">
                    {filteredActiveFixedExpenses.map((expense) => (
                      <BudgetItem 
                        key={expense.id}
                        item={expense} 
                        onClick={() => onViewFixedExpense(expense)} 
                        currency={config?.currency || 'kr'} 
                        type="expense"
                        language={config.language as Language}
                        t={t}
                        config={config}
                        currentPeriodId={currentPeriodId}
                        isGrouped={true}
                        isFixedExpenseList={true}
                      />
                    ))}
                  </div>

                  {expiredCancelledExpenses.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-subtle space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelledList(!showCancelledList)}
                        className="w-full p-3 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-color)] border border-subtle shadow-subtle hover:bg-black/[0.02] dark:hover:bg-white/[0.04] flex items-center justify-between transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {config.language === 'en' ? 'Cancelled / Ended Subscriptions' : 'Uppsagda & avslutade abonnemang'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            {expiredCancelledExpenses.length}
                          </span>
                        </div>
                        <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform duration-200 ${showCancelledList ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showCancelledList && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pt-2"
                          >
                            <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle overflow-hidden divide-subtle">
                              {expiredCancelledExpenses.map((expense) => (
                                <BudgetItem
                                  key={expense.id}
                                  item={expense}
                                  onClick={() => onViewFixedExpense(expense)}
                                  currency={config?.currency || 'kr'}
                                  type="expense"
                                  language={config.language as Language}
                                  t={t}
                                  config={config}
                                  currentPeriodId={currentPeriodId}
                                  isGrouped={true}
                                  isFixedExpenseList={true}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState 
                  title={
                    config.language === 'en' ? 'No fixed expenses added yet' : 'Inga fasta utgifter inlagda än'
                  } 
                  description={
                    config.language === 'en' ? 'Add subscriptions or bills to track upcoming payments.' : 'Lägg in abonnemang eller räkningar för att få full koll.'
                  }
                  actionLabel={`+ ${t('newFixedExpense')}`}
                  onAction={onAddFixedExpense}
                />
              )}
            </div>
          )}

          {/* Monthly Savings Section */}
          {budgetFilter === 'savings' && (
            <div className="space-y-[var(--card-gap)]">
              {sortedSavings.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-0.5 mb-2.5 sm:mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (savingSortBy === 'day') setSavingSortBy('name');
                        else if (savingSortBy === 'name') setSavingSortBy('amount');
                        else setSavingSortBy('day');
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-button-sm,10px)] text-label text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer select-none active:scale-95 min-w-0"
                      title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                    >
                      <ArrowUpDown size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)] truncate">
                        {savingSortBy === 'day' 
                          ? (config.language === 'en' ? 'Day' : 'Dragningsdag') 
                          : savingSortBy === 'name' 
                            ? (config.language === 'en' ? 'Name' : 'Namn') 
                            : (config.language === 'en' ? 'Amount' : 'Belopp')}
                      </span>
                    </button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={13} strokeWidth={2.5} />}
                      onClick={onAddMonthlySaving}
                    >
                      {t('newMonthlySaving')}
                    </Button>
                  </div>

                  <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle overflow-hidden divide-subtle">
                    {sortedSavings.map((saving) => (
                      <BudgetItem 
                        key={saving.id}
                        item={saving} 
                        onClick={() => onViewMonthlySaving(saving)} 
                        currency={config?.currency || 'kr'} 
                        type="expense"
                        language={config.language as Language}
                        t={t}
                        config={config}
                        currentPeriodId={currentPeriodId}
                        isGrouped={true}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title={config.language === 'en' ? 'No monthly savings added yet' : 'Inget månadssparande inlagt än'} 
                  description={config.language === 'en' ? 'Add recurring monthly savings to reserve money automatically each month.' : 'Lägg in fast månadssparande för att automatiskt avsätta pengar varje månad.'}
                  actionLabel={`+ ${t('newMonthlySaving')}`}
                  onAction={onAddMonthlySaving}
                />
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>


    </motion.div>
  );
}
