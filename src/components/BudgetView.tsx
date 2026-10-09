import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Calendar, ArrowDownLeft, PiggyBank, ArrowUpDown, LayoutGrid, PieChart, CircleHalf, CalendarCheck, ChevronDown } from 'lucide-react';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { TransactionLogo } from './TransactionLogo';
import { EmptyState } from './EmptyState';
import { FilterMenuModal, FilterButtonGroup, Button } from './ui';
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

  const filteredActiveIncomes = React.useMemo(() => {
    if (freqFilter === 'all') return sortedIncomes;
    return sortedIncomes.filter(i => {
      const freq = i.frequency || Frequency.MONTHLY;
      if (freqFilter === 'monthly') return freq === Frequency.MONTHLY;
      if (freqFilter === 'quarterly') return freq === Frequency.QUARTERLY;
      if (freqFilter === 'semi-annually') return freq === Frequency.SEMI_ANNUALLY;
      if (freqFilter === 'annually') return freq === Frequency.ANNUALLY;
      return true;
    });
  }, [sortedIncomes, freqFilter]);

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
      className="space-y-[var(--menu-content-gap)] font-sans"
    >
      {/* Top Controls: Compact Inline Row (Section button + Interval pills) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5 -mx-0.5">
        <button
          type="button"
          onClick={() => setIsBudgetFilterModalOpen(true)}
          className="flex-shrink-0 h-[34px] sm:h-[36px] px-3 rounded-full inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12px] font-medium bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer active:scale-[0.98] sticky left-0 z-10 shadow-xs"
        >
          {budgetFilter === 'fixed' ? <Calendar size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" /> :
           budgetFilter === 'income' ? <ArrowDownLeft size={13} strokeWidth={2.5} className="text-[var(--text-secondary)] shrink-0" /> :
           <PiggyBank size={13} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />}
          <span className="truncate">
            {budgetFilter === 'fixed' ? (t('fixedExpenses' as TranslationKey) || (config?.language === 'en' ? 'Fixed expenses' : 'Fasta utgifter')) :
             budgetFilter === 'income' ? (t('incomes' as TranslationKey) || (config?.language === 'en' ? 'Income' : 'Inkomster')) :
             (t('monthlySavings' as TranslationKey) || (config?.language === 'en' ? 'Monthly savings' : 'Månadssparande'))}
          </span>
          <ChevronDown size={12} className="text-[var(--text-secondary)] shrink-0 ml-0.5" />
        </button>
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
        {(budgetFilter === 'fixed' || budgetFilter === 'income') && (
          <FilterButtonGroup
            options={[
              {
                id: 'all',
                label: config?.language === 'en' ? 'All' : 'Alla',
                icon: <LayoutGrid size={13} strokeWidth={2} />,
              },
              {
                id: 'monthly',
                label: config?.language === 'en' ? 'Monthly' : 'Månad',
                icon: <Calendar size={13} strokeWidth={2} />,
              },
              {
                id: 'quarterly',
                label: config?.language === 'en' ? 'Quarterly' : 'Kvartal',
                icon: <PieChart size={13} strokeWidth={2} />,
              },
              {
                id: 'semi-annually',
                label: config?.language === 'en' ? 'Semi-annually' : 'Halvår',
                icon: <CircleHalf size={13} strokeWidth={2} />,
              },
              {
                id: 'annually',
                label: config?.language === 'en' ? 'Annually' : 'År',
                icon: <CalendarCheck size={13} strokeWidth={2} />,
              },
            ]}
            selectedId={freqFilter}
            onSelect={(id) => setFreqFilter(id as 'all' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually')}
            ariaLabel={config?.language === 'en' ? 'Payment interval' : 'Betalningsintervall'}
            className="flex-shrink-0 w-auto"
          />
        )}
      </div>

      {/* Overview Summary flat on background */}
      <div className="px-1 py-1 select-none">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-metric-label">
              {budgetFilter === 'income' && (
                freqFilter === 'all' ? (config?.language === 'en' ? 'Total income' : 'Totala inkomster') :
                freqFilter === 'monthly' ? (config?.language === 'en' ? 'Total monthly income' : 'Totala månadsinkomster') :
                freqFilter === 'quarterly' ? (config?.language === 'en' ? 'Total quarterly income' : 'Totala kvartalsinkomster') :
                freqFilter === 'semi-annually' ? (config?.language === 'en' ? 'Total semi-annual income' : 'Totala halvårsinkomster') :
                (config?.language === 'en' ? 'Total annual income' : 'Totala årsinkomster')
              )}
              {budgetFilter === 'savings' && (config?.language === 'en' ? 'Total savings' : 'Totalt sparande')}
              {budgetFilter === 'fixed' && (
                freqFilter === 'all' ? (config?.language === 'en' ? 'Total fixed expenses' : 'Totala fasta utgifter') :
                freqFilter === 'monthly' ? (config?.language === 'en' ? 'Total monthly expenses' : 'Totala månadsutgifter') :
                freqFilter === 'quarterly' ? (config?.language === 'en' ? 'Total quarterly expenses' : 'Totala kvartalsutgifter') :
                freqFilter === 'semi-annually' ? (config?.language === 'en' ? 'Total semi-annual expenses' : 'Totala halvårsutgifter') :
                (config?.language === 'en' ? 'Total annual expenses' : 'Totala årsutgifter')
              )}
            </span>
            {(budgetFilter === 'fixed' || budgetFilter === 'income') && freqFilter === 'all' && (
              <span className="text-micro-label text-[var(--text-tertiary)] font-normal shrink-0">
                {config?.language === 'en' ? 'Average / month' : 'Genomsnitt / månad'}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <AnimatedNumber 
              value={Math.round(
                budgetFilter === 'income' ? (
                  freqFilter === 'all' ? totalMonthlyIncomeAverage :
                  freqFilter === 'monthly' ? groupedIncomeSums[Frequency.MONTHLY] :
                  freqFilter === 'quarterly' ? groupedIncomeSums[Frequency.QUARTERLY] :
                  freqFilter === 'semi-annually' ? groupedIncomeSums[Frequency.SEMI_ANNUALLY] :
                  groupedIncomeSums[Frequency.ANNUALLY]
                ) :
                budgetFilter === 'savings' ? totalSavingsSum :
                (
                  freqFilter === 'all' ? totalMonthlyFixedAverage :
                  freqFilter === 'monthly' ? groupedFixedSums[Frequency.MONTHLY] :
                  freqFilter === 'quarterly' ? groupedFixedSums[Frequency.QUARTERLY] :
                  freqFilter === 'semi-annually' ? groupedFixedSums[Frequency.SEMI_ANNUALLY] :
                  groupedFixedSums[Frequency.ANNUALLY]
                )
              )} 
              className="text-large-amount text-[var(--text-primary)]"
              formatter={(val) => {
                const prefix = budgetFilter === 'income' ? '+' : '−';
                return `${prefix}${formatAmount(val, config?.language)}`;
              }}
            />
            <span className="text-label font-medium text-[var(--text-secondary)]">
              {config?.currency || 'kr'}
            </span>
          </div>
        </div>
      </div>


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
                  <div className="flex items-center justify-between gap-2 px-0.5">
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
                      <span className="font-normal">
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
                    <Button 
                      variant="primary"
                      size="sm"
                      icon={<Plus size={13} strokeWidth={2.5} />}
                      onClick={onAddIncome}
                    >
                      {t('newIncome')}
                    </Button>
                  </div>

                  <div className="space-y-[var(--card-gap)]">
                    {filteredActiveIncomes.map((income) => (
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
                  title={
                    freqFilter === 'all'
                      ? (config.language === 'en' ? 'No income added yet' : 'Ingen inkomst inlagd än')
                      : (config.language === 'en' ? 'No income matching this period' : 'Ingen inkomst för denna period')
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
                                    {/* Timeline matching image reference */}
                  <div
                    className="w-full border rounded-card p-4 sm:p-5 select-none relative overflow-hidden shadow-xs"
                    style={{
                      backgroundColor: 'var(--surface-color)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-micro-label font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        {config?.language === 'en' ? 'Deduction Timeline' : 'Dra-tidslinje'}
                      </span>
                      <span className="text-micro-label font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        1 {config?.language === 'en' ? 'to' : 'till'} 31
                      </span>
                    </div>
                    <div className="relative h-[110px] sm:h-[120px] w-full mt-2 mb-2">
                      <div className="absolute inset-0 top-6 pointer-events-none">
                        <svg className="w-full h-12 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 30">
                          <path
                            d="M 0 15 Q 25 28, 50 15 T 100 15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            style={{ color: 'var(--border-subtle)' }}
                            className="opacity-70"
                          />
                        </svg>
                      </div>
                      {(() => {
                        const today = new Date();
                        const currentDay = today.getDate();
                        const getPos = (d: number) => ((Math.max(1, Math.min(31, d)) - 1) / 30) * 100;
                        const validExps = (filteredActiveFixedExpenses || []).filter(e => !e.isCancelled);
                        return (
                          <>
                            {currentDay >= 1 && currentDay <= 31 && (
                              <div
                                className="absolute top-2 bottom-6 z-10 flex flex-col items-center pointer-events-none transform -translate-x-1/2"
                                style={{ left: `${getPos(currentDay)}%` }}
                              >
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1 whitespace-nowrap"
                                  style={{
                                    color: 'var(--accent-color)',
                                    backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
                                  }}
                                >
                                  {config?.language === 'en' ? 'Today' : 'Idag'}
                                </span>
                                <div
                                  className="w-2 h-2 rounded-full shadow-xs"
                                  style={{
                                    backgroundColor: 'var(--accent-color)',
                                    boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent-color) 20%, transparent)',
                                  }}
                                />
                                <div
                                  className="w-[1.5px] flex-1 opacity-60"
                                  style={{
                                    background: 'linear-gradient(to bottom, var(--accent-color), transparent)',
                                  }}
                                />
                              </div>
                            )}
                            <div className="absolute inset-0 pt-1 pointer-events-auto">
                              {validExps.map((expense, idx) => {
                                const day = typeof expense.deductionDay === 'number' && expense.deductionDay >= 1 ? expense.deductionDay : 1;
                                const leftPct = getPos(day);
                                const isEven = idx % 2 === 0;
                                const tx = {
                                  id: expense.id,
                                  amount: expense.amount,
                                  category: expense.category,
                                  merchant: expense.name,
                                  type: 'expense',
                                  timestamp: Date.now(),
                                  logo: expense.logo,
                                  icon: expense.icon,
                                  paymentMethod: expense.paymentMethod,
                                  deductionDay: day,
                                  frequency: expense.frequency,
                                };
                                return (
                                  <div
                                    key={expense.id || idx}
                                    className="absolute flex flex-col items-center transform -translate-x-1/2 transition-transform hover:scale-110 cursor-pointer group/pin"
                                    style={{
                                      left: `${leftPct}%`,
                                      top: isEven ? '2px' : '18px',
                                    }}
                                    onClick={() => onViewFixedExpense(expense)}
                                    title={`${expense.name} (Dag ${day}) - ${expense.amount} kr`}
                                  >

                                    <div className="relative flex flex-col items-center">
                                      <div
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shadow-sm border flex items-center justify-center transition-shadow group-hover/pin:shadow-md"
                                        style={{
                                          backgroundColor: 'var(--surface-color)',
                                          borderColor: 'var(--border-subtle)',
                                        }}
                                      >
                                        <TransactionLogo transaction={tx} config={config} size="sm" />
                                      </div>
                                      <div className="w-[1.5px] h-3 transition-colors" style={{ backgroundColor: 'var(--border-subtle)' }} />
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div
                      className="relative pt-3 border-t flex items-center justify-between text-[11px] font-medium tabular-nums"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-[1px] h-2 mb-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        <span>1</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-[1px] h-2 mb-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        <span>8</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-[1px] h-2 mb-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        <span>15</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-[1px] h-2 mb-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        <span>22</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-[1px] h-2 mb-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        <span>31</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-0.5">
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
                      <span className="font-normal truncate">
                        {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                      </span>
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
                      variant="outline"
                      size="sm"
                      icon={<Plus size={12} strokeWidth={2.5} />}
                      onClick={onAddFixedExpense}
                    >
                      {t('newFixedExpense')}
                    </Button>
                  </div>

                  <div className="space-y-[var(--card-gap)]">
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
            <div className="space-y-[var(--card-gap)]">
              {sortedSavings.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-0.5">
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
                      <span className="font-normal truncate">
                        {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                      </span>
                      <span className="font-medium text-[var(--text-primary)] truncate">
                        {savingSortBy === 'day' 
                          ? (config.language === 'en' ? 'Day' : 'Dragningsdag') 
                          : savingSortBy === 'name' 
                            ? (config.language === 'en' ? 'Name' : 'Namn') 
                            : (config.language === 'en' ? 'Amount' : 'Belopp')}
                      </span>
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Plus size={12} strokeWidth={2.5} />}
                      onClick={onAddMonthlySaving}
                    >
                      {t('newMonthlySaving')}
                    </Button>
                  </div>

                  <div className="space-y-[var(--card-gap)]">
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
