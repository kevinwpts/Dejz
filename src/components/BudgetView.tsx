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
import {
  isExpenseCancelledAndExpired,
  isExpenseActiveForPeriod,
  hasRemainingPayments,
} from '../utils/cancellation';

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

function normalizeFrequency(freq?: Frequency | string): Frequency {
  if (!freq) return Frequency.MONTHLY;
  const s = String(freq).trim().toLowerCase();
  if (freq === Frequency.QUARTERLY || s === 'kvartalsvis' || s === 'quarterly' || s === 'kvartal') {
    return Frequency.QUARTERLY;
  }
  if (freq === Frequency.SEMI_ANNUALLY || s === 'halvårsvis' || s === 'semi_annually' || s === 'semi-annually' || s === 'halvår') {
    return Frequency.SEMI_ANNUALLY;
  }
  if (freq === Frequency.ANNUALLY || s === 'årsvis' || s === 'annually' || s === 'yearly' || s === 'helår') {
    return Frequency.ANNUALLY;
  }
  return Frequency.MONTHLY;
}

function getFixedFrequencyHeading(freq: Frequency, lang?: string): string {
  switch (freq) {
    case Frequency.QUARTERLY:
      if (lang === 'en') return 'Quarterly';
      if (lang === 'fi') return 'Neljännesvuosittain';
      return 'Kvartalsvis';
    case Frequency.SEMI_ANNUALLY:
      if (lang === 'en') return 'Semi-annually';
      if (lang === 'fi') return 'Puolivuosittain';
      return 'Halvårsvis';
    case Frequency.ANNUALLY:
      if (lang === 'en') return 'Annually';
      if (lang === 'fi') return 'Vuosittain';
      return 'Årsvis';
    default:
      if (lang === 'en') return 'Monthly';
      if (lang === 'fi') return 'Kuukausittain';
      return 'Månadsvis';
  }
}

function getEffectiveItemAmount(
  item: { amount?: number; isVariable?: boolean; periodOverrides?: Record<string, number> },
  currentPeriodId: string
): number {
  if (item?.isVariable && currentPeriodId && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined) {
    return Number(item.periodOverrides[currentPeriodId]) || 0;
  }
  return Number(item?.amount) || Number((item as any)?.targetAmount) || 0;
}

function getFrequencySummaryLabel(
  freq: Frequency,
  items: Array<{ amount?: number; isVariable?: boolean; periodOverrides?: Record<string, number> }>,
  currentPeriodId: string,
  currency: string = 'kr',
  lang: string = 'sv'
): string {
  const isEn = lang === 'en';
  const groupTotal = items.reduce((sum, item) => {
    return sum + getEffectiveItemAmount(item, currentPeriodId);
  }, 0);

  const roundedTotal = Math.round(groupTotal);
  const totalStr = formatAmount(roundedTotal, lang);
  const moUnit = isEn ? 'mo' : 'mån';

  if (freq === Frequency.MONTHLY) {
    return isEn ? `Total ${totalStr} ${currency}/${moUnit}` : `Totalt ${totalStr} ${currency}/${moUnit}`;
  }

  let divisor = 1;
  if (freq === Frequency.QUARTERLY) divisor = 3;
  else if (freq === Frequency.SEMI_ANNUALLY) divisor = 6;
  else if (freq === Frequency.ANNUALLY) divisor = 12;

  const monthlyEquivalent = Math.round(groupTotal / divisor);
  const monthlyStr = formatAmount(monthlyEquivalent, lang);

  return isEn
    ? `Total ${totalStr} ${currency} (${monthlyStr} ${currency}/${moUnit})`
    : `Totalt ${totalStr} ${currency} (${monthlyStr} ${currency}/${moUnit})`;
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
  const [budgetFilter, setBudgetFilter] = React.useState<'fixed' | 'income' | 'savings' | 'categories'>(() => {
    if (initialSection === 'category-budgets' || initialSection === 'allocate' || initialSection === 'budget') {
      return 'categories';
    }
    if (initialSection === 'income' || initialSection === 'fixed' || initialSection === 'savings') {
      return initialSection;
    }
    return 'fixed';
  });

  const [showCategoryBudgets, setShowCategoryBudgets] = React.useState(false);

  const handleOpenCategoryBudgets = React.useCallback(() => {
    setBudgetFilter('categories');
  }, []);

  React.useEffect(() => {
    if (initialSection === 'category-budgets' || initialSection === 'allocate' || initialSection === 'budget') {
      handleOpenCategoryBudgets();
    } else if (initialSection === 'income' || initialSection === 'fixed' || initialSection === 'savings') {
      setBudgetFilter(initialSection);
    } else if (!initialSection) {
      setShowCategoryBudgets(false);
    }
  }, [initialSection, handleOpenCategoryBudgets]);

  const handleCloseCategoryBudgets = () => {
    const hasAnyBudget = Boolean(
      config.categories && config.categories.some((c: any) => typeof c.budget === 'number' && c.budget > 0)
    );
    if (hasAnyBudget && !config.hasSavedInitialBudget) {
      const updatedConfig = {
        ...config,
        hasSavedInitialBudget: true,
      };
      setConfig(updatedConfig);
    }
    setShowCategoryBudgets(false);
    setBudgetFilter('fixed');
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
      const freq = normalizeFrequency(e.frequency);
      const amount = getEffectiveItemAmount(e, currentPeriodId);

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
      return list.sort((a, b) => getEffectiveItemAmount(b, currentPeriodId) - getEffectiveItemAmount(a, currentPeriodId));
    } else {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [incomes, incomeSortBy, currentPeriodId]);

  const [showCancelledList, setShowCancelledList] = React.useState(false);

  const visibleFixedExpenses = React.useMemo(() => {
    return (fixedExpenses || []).filter(e => !isExpenseCancelledAndExpired(e, new Date()));
  }, [fixedExpenses]);

  const nonExpiredFixedExpenses = React.useMemo(() => {
    return (fixedExpenses || []).filter(e => !isExpenseCancelledAndExpired(e, new Date()));
  }, [fixedExpenses]);

  const cancelledFixedExpenses = React.useMemo(() => {
    const list = (fixedExpenses || []).filter(e => isExpenseCancelledAndExpired(e, new Date()));
    return list.sort((a, b) => {
      if (fixedSortBy === 'day') {
        const dayA = typeof a.deductionDay === 'number' && a.deductionDay > 0 ? a.deductionDay : 999;
        const dayB = typeof b.deductionDay === 'number' && b.deductionDay > 0 ? b.deductionDay : 999;
        if (dayA !== dayB) return dayA - dayB;
        return (a.name || '').localeCompare(b.name || '');
      } else if (fixedSortBy === 'amount') {
        return getEffectiveItemAmount(b, currentPeriodId) - getEffectiveItemAmount(a, currentPeriodId);
      } else {
        return (a.name || '').localeCompare(b.name || '');
      }
    });
  }, [fixedExpenses, fixedSortBy, currentPeriodId]);

  const sortedFixedExpenses = React.useMemo(() => {
    const list = [...(visibleFixedExpenses || [])];
    if (fixedSortBy === 'day') {
      return list.sort((a, b) => {
        const dayA = typeof a.deductionDay === 'number' && a.deductionDay > 0 ? a.deductionDay : 999;
        const dayB = typeof b.deductionDay === 'number' && b.deductionDay > 0 ? b.deductionDay : 999;
        if (dayA !== dayB) return dayA - dayB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (fixedSortBy === 'amount') {
      return list.sort((a, b) => getEffectiveItemAmount(b, currentPeriodId) - getEffectiveItemAmount(a, currentPeriodId));
    } else {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [visibleFixedExpenses, fixedSortBy, currentPeriodId]);

  const filteredActiveFixedExpenses = sortedFixedExpenses;
  const filteredActiveIncomes = sortedIncomes;

  const totalMonthlyIncomeAverage = React.useMemo(() => {
    return (sortedIncomes || []).reduce((sum, i) => {
      const freq = normalizeFrequency(i.frequency);
      const amount = getEffectiveItemAmount(i, currentPeriodId);

      let monthlyAmount = amount;
      if (freq === Frequency.QUARTERLY) monthlyAmount = amount / 3;
      else if (freq === Frequency.SEMI_ANNUALLY) monthlyAmount = amount / 6;
      else if (freq === Frequency.ANNUALLY) monthlyAmount = amount / 12;

      return sum + monthlyAmount;
    }, 0);
  }, [sortedIncomes, currentPeriodId]);

  const totalMonthlyFixedAverage = React.useMemo(() => {
    return (nonExpiredFixedExpenses || []).reduce((sum, e) => {
      if (e.isCancelled && !hasRemainingPayments(e, new Date())) {
        return sum;
      }
      if (stats?.periodStart && stats?.periodEnd) {
        if (!isExpenseActiveForPeriod(e, stats.periodStart, stats.periodEnd)) {
          return sum;
        }
      }

      const freq = normalizeFrequency(e.frequency);
      const amount = getEffectiveItemAmount(e, currentPeriodId);

      let monthlyAmount = amount;
      if (freq === Frequency.QUARTERLY) monthlyAmount = amount / 3;
      else if (freq === Frequency.SEMI_ANNUALLY) monthlyAmount = amount / 6;
      else if (freq === Frequency.ANNUALLY) monthlyAmount = amount / 12;

      return sum + monthlyAmount;
    }, 0);
  }, [nonExpiredFixedExpenses, currentPeriodId, stats?.periodStart, stats?.periodEnd]);

  const cancelledButDeductedThisPeriodAmount = React.useMemo(() => {
    if (!stats?.periodStart || !stats?.periodEnd) return 0;
    return (fixedExpenses || []).reduce((sum, e) => {
      const isCancelledWithNoMorePayments = Boolean(
        e.isCancelled && !hasRemainingPayments(e, new Date())
      );
      if (!isCancelledWithNoMorePayments) return sum;
      if (!isExpenseActiveForPeriod(e, stats.periodStart, stats.periodEnd)) return sum;

      const freq = normalizeFrequency(e.frequency);
      const amount = getEffectiveItemAmount(e, currentPeriodId);

      let monthlyAmount = amount;
      if (freq === Frequency.QUARTERLY) monthlyAmount = amount / 3;
      else if (freq === Frequency.SEMI_ANNUALLY) monthlyAmount = amount / 6;
      else if (freq === Frequency.ANNUALLY) monthlyAmount = amount / 12;

      return sum + monthlyAmount;
    }, 0);
  }, [fixedExpenses, currentPeriodId, stats?.periodStart, stats?.periodEnd]);



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
      return list.sort((a, b) => getEffectiveItemAmount(b, currentPeriodId) - getEffectiveItemAmount(a, currentPeriodId));
    } else {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [config?.monthlySavingsItems, config?.savingsGoals, config?.payday, savingSortBy, currentPeriodId]);




  // --- Category Budget Allocation Logic & Calculations ---
  const _totalIncomeSum = (incomes || []).reduce((sum, i) => {
    const amount = (i.isVariable && i.periodOverrides && i.periodOverrides[currentPeriodId] !== undefined)
      ? i.periodOverrides[currentPeriodId]
      : (Number(i.amount) || 0);
    return sum + amount;
  }, 0);

  const groupedFixedExpenses = React.useMemo(() => {
    const groups: Record<Frequency, FixedExpense[]> = {
      [Frequency.MONTHLY]: [],
      [Frequency.QUARTERLY]: [],
      [Frequency.SEMI_ANNUALLY]: [],
      [Frequency.ANNUALLY]: [],
    };

    (sortedFixedExpenses || []).forEach(e => {
      const targetFreq = normalizeFrequency(e.frequency);
      groups[targetFreq].push(e);
    });

    return groups;
  }, [sortedFixedExpenses]);

  const groupedIncomes = React.useMemo(() => {
    const groups: Record<Frequency, Income[]> = {
      [Frequency.MONTHLY]: [],
      [Frequency.QUARTERLY]: [],
      [Frequency.SEMI_ANNUALLY]: [],
      [Frequency.ANNUALLY]: [],
    };

    (filteredActiveIncomes || []).forEach(i => {
      const targetFreq = normalizeFrequency(i.frequency);
      groups[targetFreq].push(i);
    });

    return groups;
  }, [filteredActiveIncomes]);

  const groupedSavings = React.useMemo(() => {
    const groups: Record<Frequency, any[]> = {
      [Frequency.MONTHLY]: [],
      [Frequency.QUARTERLY]: [],
      [Frequency.SEMI_ANNUALLY]: [],
      [Frequency.ANNUALLY]: [],
    };

    (sortedSavings || []).forEach(s => {
      const targetFreq = normalizeFrequency(s.frequency);
      groups[targetFreq].push(s);
    });

    return groups;
  }, [sortedSavings]);

  const _groupedFixedSums = React.useMemo(() => {
    const sums: Record<Frequency, number> = {
      [Frequency.MONTHLY]: 0,
      [Frequency.QUARTERLY]: 0,
      [Frequency.SEMI_ANNUALLY]: 0,
      [Frequency.ANNUALLY]: 0,
    };

    (sortedFixedExpenses || []).forEach(e => {
      if (stats?.periodStart && stats?.periodEnd) {
        if (!isExpenseActiveForPeriod(e, stats.periodStart, stats.periodEnd)) {
          return;
        }
      } else if (e.isCancelled && !hasRemainingPayments(e, new Date())) {
        return;
      }

      const targetFreq = normalizeFrequency(e.frequency);
      const amount = (e.isVariable && e.periodOverrides && e.periodOverrides[currentPeriodId] !== undefined)
        ? e.periodOverrides[currentPeriodId]
        : (Number(e.amount) || 0);

      sums[targetFreq] += amount;
    });

    return sums;
  }, [sortedFixedExpenses, currentPeriodId, stats?.periodStart, stats?.periodEnd]);

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
          {
            id: 'categories',
            label: config?.language === 'en' ? 'Category budget' : 'Kategoribudget',
          },
        ]}
        selectedId={budgetFilter}
        onSelect={(id) => {
          setBudgetFilter(id as 'fixed' | 'income' | 'savings' | 'categories');
          if (id !== 'categories') {
            onClearSection?.();
          }
        }}
        ariaLabel={config?.language === 'en' ? 'Filter finances' : 'Filtrera ekonomi'}
      />

      {/* Overview Summary Card */}
      {budgetFilter !== 'categories' && (
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
              className={`text-large-amount font-bold font-amount tabular-nums ${
                budgetFilter === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
              }`}
              formatter={(val) => formatAmount(val, config?.language)}
            />
            <span className="text-label font-medium text-[var(--text-secondary)] select-none">
              {config?.currency || 'kr'}
              <span className="text-micro-label text-[var(--text-tertiary)] ml-0.5">
                {config?.language === 'en' ? '/mo' : '/mån'}
              </span>
            </span>
          </div>
          {budgetFilter === 'fixed' && Math.round(cancelledButDeductedThisPeriodAmount) > 0 && (
            <p className="text-secondary text-[var(--text-secondary)] pt-0.5 tabular-nums">
              {config?.language === 'en'
                ? `This period: ${formatAmount(Math.round(totalMonthlyFixedAverage + cancelledButDeductedThisPeriodAmount), config?.language)} ${config?.currency || 'kr'} (incl. ${formatAmount(Math.round(cancelledButDeductedThisPeriodAmount), config?.language)} ${config?.currency || 'kr'} already paid)`
                : `Denna period: ${formatAmount(Math.round(totalMonthlyFixedAverage + cancelledButDeductedThisPeriodAmount), config?.language)} ${config?.currency || 'kr'} (inkl. ${formatAmount(Math.round(cancelledButDeductedThisPeriodAmount), config?.language)} ${config?.currency || 'kr'} som redan dragits)`}
            </p>
          )}
        </Card>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={budgetFilter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-[var(--card-gap)]"
        >
          {/* Category Budgets Section */}
          {budgetFilter === 'categories' && (
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
          )}
          {/* Incomes Section */}
          {budgetFilter === 'income' && (
            <div className="space-y-[var(--card-gap)]">
              {sortedIncomes.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-0.5 pt-1">
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
                      variant="tonal"
                      size="sm"
                      onClick={onAddIncome}
                    >
                      {t('newIncome')}
                    </Button>
                  </div>

                  <div className="space-y-8 sm:space-y-9 pt-3 sm:pt-4">
                    {([Frequency.MONTHLY, Frequency.QUARTERLY, Frequency.SEMI_ANNUALLY, Frequency.ANNUALLY] as const).map((freq) => {
                      const items = groupedIncomes[freq] || [];
                      if (items.length === 0) return null;
                      return (
                        <div key={freq} className="space-y-2.5 sm:space-y-3">
                          <div className="px-1 flex items-center justify-between gap-2">
                            <span className="text-label font-medium text-[var(--text-secondary)]">
                              {getFixedFrequencyHeading(freq, config?.language)}
                            </span>
                            <span className="text-label font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
                              {getFrequencySummaryLabel(freq, items, currentPeriodId, config?.currency || 'kr', config?.language)}
                            </span>
                          </div>
                          <Card variant="default" padding="none" className="divide-y divide-menu overflow-hidden">
                            {items.map((income) => (
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
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title={
                    config.language === 'en' ? 'No income added yet' : 'Inga inkomster inlagda än'
                  } 
                  description={config.language === 'en' ? 'Add your salary or other regular income to see what you have left to spend.' : 'Lägg in din lön eller andra inkomster för att se vad du har kvar att röra dig med.'}
                  actionLabel={config.language === 'en' ? 'Add income' : 'Lägg till inkomst'}
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
                  <div className="flex items-center justify-between gap-2 px-0.5 pt-1">
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
                      variant="tonal"
                      size="sm"
                      onClick={onAddFixedExpense}
                    >
                      {t('newFixedExpense')}
                    </Button>
                  </div>

                  <div className="space-y-8 sm:space-y-9 pt-3 sm:pt-4">
                    {([Frequency.MONTHLY, Frequency.QUARTERLY, Frequency.SEMI_ANNUALLY, Frequency.ANNUALLY] as const).map((freq) => {
                      const items = groupedFixedExpenses[freq] || [];
                      if (items.length === 0) return null;
                      return (
                        <div key={freq} className="space-y-2.5 sm:space-y-3">
                          <div className="px-1 flex items-center justify-between gap-2">
                            <span className="text-label font-medium text-[var(--text-secondary)]">
                              {getFixedFrequencyHeading(freq, config?.language)}
                            </span>
                            <span className="text-label font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
                              {getFrequencySummaryLabel(freq, items, currentPeriodId, config?.currency || 'kr', config?.language)}
                            </span>
                          </div>
                          <Card variant="default" padding="none" className="divide-y divide-menu overflow-hidden">
                            {items.map((expense) => (
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
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title={
                    cancelledFixedExpenses.length > 0
                      ? (config.language === 'en' ? 'No active fixed expenses' : 'Inga aktiva fasta utgifter')
                      : (config.language === 'en' ? 'No fixed expenses added yet' : 'Inga fasta utgifter inlagda än')
                  } 
                  description={
                    cancelledFixedExpenses.length > 0
                      ? (config.language === 'en' ? 'All your subscriptions are ended and listed below.' : 'Alla dina inlagda abonnemang är avslutade och ligger samlade nedan.')
                      : (config.language === 'en' ? 'Add subscriptions or bills to track upcoming payments.' : 'Lägg in abonnemang eller räkningar för att få full koll.')
                  }
                  actionLabel={config.language === 'en' ? 'Add fixed expense' : 'Lägg till fast utgift'}
                  onAction={onAddFixedExpense}
                />
              )}

              {cancelledFixedExpenses.length > 0 && (
                <div className="pt-4 sm:pt-5">
                  <Card variant="default" padding="none" className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowCancelledList(!showCancelledList)}
                      aria-expanded={showCancelledList}
                      className="w-full px-4 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] flex items-center justify-between transition-colors cursor-pointer text-left select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Clock size={15} className="text-[var(--text-secondary)] shrink-0" />
                        <span className="text-body-medium font-medium text-[var(--text-primary)] truncate">
                          {config.language === 'en' ? 'Ended subscriptions' : 'Avslutade abonnemang'}
                        </span>
                        <span className="text-label font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
                          ({cancelledFixedExpenses.length})
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-[var(--text-secondary)] transition-transform duration-200 shrink-0 ${showCancelledList ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {showCancelledList && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-subtle divide-y divide-menu">
                            {cancelledFixedExpenses.map((expense) => (
                              <BudgetItem
                                key={expense.id}
                                item={expense}
                                onClick={() => onViewFixedExpense(expense)}
                                currency={config?.currency || 'kr'}
                                type="expense"
                                language={config.language as any}
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
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Monthly Savings Section */}
          {budgetFilter === 'savings' && (
            <div className="space-y-[var(--card-gap)]">
              {sortedSavings.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-0.5 pt-1">
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
                      variant="tonal"
                      size="sm"
                      onClick={onAddMonthlySaving}
                    >
                      {t('newMonthlySaving')}
                    </Button>
                  </div>

                  <div className="space-y-8 sm:space-y-9 pt-3 sm:pt-4">
                    {([Frequency.MONTHLY, Frequency.QUARTERLY, Frequency.SEMI_ANNUALLY, Frequency.ANNUALLY] as const).map((freq) => {
                      const items = groupedSavings[freq] || [];
                      if (items.length === 0) return null;
                      return (
                        <div key={freq} className="space-y-2.5 sm:space-y-3">
                          <div className="px-1 flex items-center justify-between gap-2">
                            <span className="text-label font-medium text-[var(--text-secondary)]">
                              {getFixedFrequencyHeading(freq, config?.language)}
                            </span>
                            <span className="text-label font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
                              {getFrequencySummaryLabel(freq, items, currentPeriodId, config?.currency || 'kr', config?.language)}
                            </span>
                          </div>
                          <Card variant="default" padding="none" className="divide-y divide-menu overflow-hidden">
                            {items.map((saving) => (
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
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title={config.language === 'en' ? 'No monthly savings added yet' : 'Inget månadssparande inlagt än'} 
                  description={config.language === 'en' ? 'Add recurring monthly savings to reserve money automatically each month.' : 'Lägg in fast månadssparande för att automatiskt avsätta pengar varje månad.'}
                  actionLabel={config.language === 'en' ? 'Add monthly saving' : 'Lägg till månadssparande'}
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
