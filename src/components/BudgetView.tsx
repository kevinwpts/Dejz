import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Calendar, ArrowDownLeft, PiggyBank, ArrowUpDown, LayoutGrid, PieChart, CircleHalf, CalendarCheck } from 'lucide-react';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { FilterSelectButton, FilterMenuModal, FilterButtonGroup } from './ui';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { BudgetCategoriesView } from './BudgetCategoriesView';
import { getActiveFixedExpenses } from '../utils/cancellation';

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
  const [isBudgetFilterModalOpen, setIsBudgetFilterModalOpen] = React.useState(false);
  const [freqFilter, setFreqFilter] = React.useState<'all' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually'>('all');
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

  const activeFixedExpenses = React.useMemo(() => getActiveFixedExpenses(fixedExpenses), [fixedExpenses]);

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

  const filteredActiveFixedExpenses = React.useMemo(() => {
    if (freqFilter === 'all') return sortedFixedExpenses;
    return sortedFixedExpenses.filter(e => {
      const freq = e.frequency || Frequency.MONTHLY;
      if (freqFilter === 'monthly') return freq === Frequency.MONTHLY;
      if (freqFilter === 'quarterly') return freq === Frequency.QUARTERLY;
      if (freqFilter === 'semi-annually') return freq === Frequency.SEMI_ANNUALLY;
      if (freqFilter === 'annually') return freq === Frequency.ANNUALLY;
      return true;
    });
  }, [sortedFixedExpenses, freqFilter]);

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
  const totalIncomeSum = (incomes || []).reduce((sum, i) => {
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

  const groupedFixedSums = React.useMemo(() => {
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
    : (config.monthlySavingsItems && config.monthlySavingsItems.length > 0
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
      className="space-y-6 font-sans"
    >
      {/* Top Controls: Main Dropdown (Fasta utgifter / Inkomster / Månadssparande) & Direct Interval Filter Buttons */}
      <div className="space-y-2.5">
        <FilterSelectButton
          icon={
            budgetFilter === 'fixed' ? <Calendar size={15} strokeWidth={2} /> :
            budgetFilter === 'income' ? <ArrowDownLeft size={15} strokeWidth={2.5} /> :
            <PiggyBank size={15} strokeWidth={2} />
          }
          value={
            budgetFilter === 'fixed' ? (t('fixedExpenses' as TranslationKey) || (config?.language === 'en' ? 'Fixed expenses' : 'Fasta utgifter')) :
            budgetFilter === 'income' ? (t('incomes' as TranslationKey) || (config?.language === 'en' ? 'Income' : 'Inkomster')) :
            (t('monthlySavings' as TranslationKey) || (config?.language === 'en' ? 'Monthly savings' : 'Månadssparande'))
          }
          onClick={() => setIsBudgetFilterModalOpen(true)}
          className="w-full"
        />

        <FilterMenuModal
          isOpen={isBudgetFilterModalOpen}
          onClose={() => setIsBudgetFilterModalOpen(false)}
          title={config?.language === 'en' ? 'Select section' : 'Välj budgetkategori'}
          selectedId={budgetFilter}
          onSelect={(id) => setBudgetFilter(id as 'fixed' | 'income' | 'savings')}
          options={[
            {
              id: 'fixed',
              label: config?.language === 'en' ? 'Fixed expenses' : 'Fasta utgifter',
              icon: <Calendar size={16} strokeWidth={2} />,
            },
            {
              id: 'income',
              label: config?.language === 'en' ? 'Income' : 'Inkomster',
              icon: <ArrowDownLeft size={16} strokeWidth={2.5} />,
            },
            {
              id: 'savings',
              label: config?.language === 'en' ? 'Monthly savings' : 'Månadssparande',
              icon: <PiggyBank size={16} strokeWidth={2} />,
            },
          ]}
        />

        {budgetFilter === 'fixed' && (
          <FilterButtonGroup
            options={[
              {
                id: 'all',
                label: config?.language === 'en' ? 'All' : 'Alla',
                icon: <LayoutGrid size={14} strokeWidth={2} />,
              },
              {
                id: 'monthly',
                label: config?.language === 'en' ? 'Monthly' : 'Månad',
                icon: <Calendar size={14} strokeWidth={2} />,
              },
              {
                id: 'quarterly',
                label: config?.language === 'en' ? 'Quarterly' : 'Kvartal',
                icon: <PieChart size={14} strokeWidth={2} />,
              },
              {
                id: 'semi-annually',
                label: config?.language === 'en' ? 'Semi-annually' : 'Halvår',
                icon: <CircleHalf size={14} strokeWidth={2} />,
              },
              {
                id: 'annually',
                label: config?.language === 'en' ? 'Annually' : 'År',
                icon: <CalendarCheck size={14} strokeWidth={2} />,
              },
            ]}
            selectedId={freqFilter}
            onSelect={(id) => setFreqFilter(id as 'all' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually')}
            ariaLabel={config?.language === 'en' ? 'Payment interval' : 'Betalningsintervall'}
          />
        )}
      </div>

      {/* Overview Hero Section - Dynamic based on filter */}
      <div className="text-center flex flex-col items-center gap-1 py-1 select-none">
        <span className="text-xs sm:text-[13px] font-medium text-[var(--text-secondary)] flex items-center justify-center gap-1 flex-wrap">
          {budgetFilter === 'income' && (config?.language === 'en' ? 'Total income' : 'Totala inkomster')}
          {budgetFilter === 'savings' && (config?.language === 'en' ? 'Total savings' : 'Totalt sparande')}
          {budgetFilter === 'fixed' && (
            freqFilter === 'all' ? (
              <>
                <span>{config?.language === 'en' ? 'Total fixed expenses' : 'Totala fasta utgifter'}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] font-normal">
                  {config?.language === 'en' ? '(average/month)' : '(snitt/månad)'}
                </span>
              </>
            ) :
            freqFilter === 'monthly' ? (config?.language === 'en' ? 'Total monthly expenses' : 'Totala månadsutgifter') :
            freqFilter === 'quarterly' ? (config?.language === 'en' ? 'Total quarterly expenses' : 'Totala kvartalsutgifter') :
            freqFilter === 'semi-annually' ? (config?.language === 'en' ? 'Total semi-annual expenses' : 'Totala halvårsutgifter') :
            (config?.language === 'en' ? 'Total annual expenses' : 'Totala årsutgifter')
          )}
        </span>
        <div className="flex items-baseline justify-center gap-1.5">
          <AnimatedNumber 
            value={Math.round(
              budgetFilter === 'income' ? totalIncomeSum :
              budgetFilter === 'savings' ? totalSavingsSum :
              (
                freqFilter === 'all' ? totalMonthlyFixedAverage :
                freqFilter === 'monthly' ? groupedFixedSums[Frequency.MONTHLY] :
                freqFilter === 'quarterly' ? groupedFixedSums[Frequency.QUARTERLY] :
                freqFilter === 'semi-annually' ? groupedFixedSums[Frequency.SEMI_ANNUALLY] :
                groupedFixedSums[Frequency.ANNUALLY]
              )
            )} 
            className="text-[34px] sm:text-[38px] md:text-[42px] leading-tight font-semibold font-amount tabular-nums tracking-tight text-[var(--text-primary)]"
            formatter={(val) => {
              const prefix = budgetFilter === 'income' ? '+' : '−';
              return `${prefix}${formatAmount(val, config?.language)}`;
            }}
          />
          <span className="text-sm sm:text-base font-normal text-[var(--text-secondary)] border-none">
            {config?.currency || 'kr'}
          </span>
        </div>
      </div>


      <AnimatePresence mode="wait">
        <motion.div
          key={budgetFilter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Incomes Section */}
          {budgetFilter === 'income' && (
            <div className="space-y-4">
              {sortedIncomes.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    {/* Single compact sort toggle button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (incomeSortBy === 'day') setIncomeSortBy('name');
                        else if (incomeSortBy === 'name') setIncomeSortBy('amount');
                        else setIncomeSortBy('day');
                      }}
                      className="flex items-center gap-2 h-9 px-3.5 rounded-[14px] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 border border-black/[0.04] dark:border-white/[0.06] text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
                      title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                    >
                      <ArrowUpDown size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="text-[var(--text-secondary)] font-normal">
                        {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {incomeSortBy === 'day' 
                          ? (config.language === 'en' ? 'Day' : 'Ankomstdag')
                          : incomeSortBy === 'name'
                          ? (config.language === 'en' ? 'Name' : 'Namn')
                          : (config.language === 'en' ? 'Amount' : 'Belopp')
                        }
                      </span>
                    </button>
                    <button 
                      type="button"
                      onClick={onAddIncome} 
                      className="h-9 px-4 rounded-[14px] bg-[var(--surface-color)] dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/[0.04] dark:border-white/[0.06] text-[var(--text-primary)] text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98] shadow-none"
                    >
                      <Plus size={14} strokeWidth={2} />
                      <span>{t('newIncome')}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 mt-3.5">
                    {sortedIncomes.map((income) => (
                      <BudgetItem 
                        key={income.id}
                        item={income} 
                        onClick={() => onViewIncome(income)} 
                        currency={config.currency} 
                        type="income"
                        language={config.language as Language}
                        t={t}
                        config={config}
                        currentPeriodId={currentPeriodId}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title={config.language === 'en' ? 'No income added yet' : 'Ingen inkomst inlagd än'} 
                  description={config.language === 'en' ? 'Add your salary or other regular income to calculate your daily budget.' : 'Lägg in din lön eller andra inkomster för att räkna ut din dagsbudget.'}
                  actionLabel={`+ ${t('newIncome')}`}
                  onAction={onAddIncome}
                />
              )}
            </div>
          )}

          {/* Fixed Expenses Section */}
          {budgetFilter === 'fixed' && (
            <div className="space-y-4">
              {filteredActiveFixedExpenses.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    {/* Single compact sort toggle button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (fixedSortBy === 'day') setFixedSortBy('name');
                        else if (fixedSortBy === 'name') setFixedSortBy('amount');
                        else setFixedSortBy('day');
                      }}
                      className="flex items-center gap-2 h-9 px-3.5 rounded-[14px] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 border border-black/[0.04] dark:border-white/[0.06] text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
                      title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                    >
                      <ArrowUpDown size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="text-[var(--text-secondary)] font-normal">
                        {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {fixedSortBy === 'day' 
                          ? (config.language === 'en' ? 'Day' : 'Dragningsdag')
                          : fixedSortBy === 'name'
                          ? (config.language === 'en' ? 'Name' : 'Namn')
                          : (config.language === 'en' ? 'Amount' : 'Belopp')
                        }
                      </span>
                    </button>
                    <button 
                      type="button"
                      onClick={onAddFixedExpense} 
                      className="h-9 px-4 rounded-[14px] bg-[var(--surface-color)] dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/[0.04] dark:border-white/[0.06] text-[var(--text-primary)] text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98] shadow-none"
                    >
                      <Plus size={14} strokeWidth={2} />
                      <span>{t('newFixedExpense')}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 mt-3.5">
                    {filteredActiveFixedExpenses.map((expense) => (
                      <BudgetItem 
                        key={expense.id}
                        item={expense} 
                        onClick={() => onViewFixedExpense(expense)} 
                        currency={config.currency} 
                        type="expense"
                        language={config.language as Language}
                        t={t}
                        config={config}
                        currentPeriodId={currentPeriodId}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title={
                    freqFilter === 'all'
                      ? (config.language === 'en' ? 'No fixed expenses added yet' : 'Inga fasta utgifter inlagda än')
                      : (config.language === 'en' ? 'No expenses matching this period' : 'Inga utgifter för denna period')
                  } 
                  description={
                    freqFilter === 'all'
                      ? (config.language === 'en' ? 'Add subscriptions or bills to track upcoming payments.' : 'Lägg in abonnemang eller räkningar för att få full koll.')
                      : (config.language === 'en' ? 'Add a fixed expense with this period to see it here.' : 'Lägg till en fast utgift med denna period för att se den här.')
                  }
                  actionLabel={`+ ${t('newFixedExpense')}`}
                  onAction={onAddFixedExpense}
                />
              )}
            </div>
          )}

          {/* Monthly Savings Section */}
          {budgetFilter === 'savings' && (
            <div className="space-y-4">
              {sortedSavings.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    {/* Single compact sort toggle button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (savingSortBy === 'day') setSavingSortBy('name');
                        else if (savingSortBy === 'name') setSavingSortBy('amount');
                        else setSavingSortBy('day');
                      }}
                      className="flex items-center gap-2 h-9 px-3.5 rounded-[14px] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 border border-black/[0.04] dark:border-white/[0.06] text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
                      title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                    >
                      <ArrowUpDown size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="text-[var(--text-secondary)] font-normal">
                        {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {savingSortBy === 'day' 
                          ? (config.language === 'en' ? 'Day' : 'Dragningsdag') 
                          : savingSortBy === 'name' 
                            ? (config.language === 'en' ? 'Name' : 'Namn') 
                            : (config.language === 'en' ? 'Amount' : 'Belopp')}
                      </span>
                    </button>

                    <button 
                      type="button"
                      onClick={onAddMonthlySaving} 
                      className="h-9 px-4 rounded-[14px] bg-[var(--surface-color)] dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/[0.04] dark:border-white/[0.06] text-[var(--text-primary)] text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98] shadow-none"
                    >
                      <Plus size={14} strokeWidth={2} />
                      <span>{t('newMonthlySaving')}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 mt-3.5">
                    {sortedSavings.map((saving) => (
                      <BudgetItem 
                        key={saving.id}
                        item={saving} 
                        onClick={() => onViewMonthlySaving(saving)} 
                        currency={config.currency} 
                        type="expense"
                        language={config.language as Language}
                        t={t}
                        config={config}
                        currentPeriodId={currentPeriodId}
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
