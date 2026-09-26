import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { RefreshCw, ArrowLeft, Check, Trash2, Sparkles, RotateCcw, Calendar, ArrowUpDown, Plus } from 'lucide-react';
import { ICON_MAP, isEmojiString } from '../utils/icons';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey, Language } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

interface BudgetViewProps {
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
  const [initialCategoryNames, setInitialCategoryNames] = React.useState<string[]>([]);

  const handleOpenCategoryBudgets = () => {
    const getCatBudgetPct = (c: any) => {
      if (c.budget === undefined || c.budget === null) return 0;
      return Number(c.budget) || 0;
    };

    const sortedNames = [...(config.categories || [])]
      .sort((a, b) => getCatBudgetPct(b) - getCatBudgetPct(a))
      .map(c => c.name);

    setInitialCategoryNames(sortedNames);
    setShowCategoryBudgets(true);
  };

  React.useEffect(() => {
    if (initialSection === 'category-budgets' || initialSection === 'allocate') {
      handleOpenCategoryBudgets();
    } else if (!initialSection) {
      setShowCategoryBudgets(false);
    }
  }, [initialSection]);

  const handleCloseCategoryBudgets = () => {
    setShowCategoryBudgets(false);
    onClearSection?.();
  };

  const totalSavings = (config.monthlySavingsItems?.reduce((sum, item) => {
    const amount = (item.isVariable && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined)
      ? item.periodOverrides[currentPeriodId]
      : (Number(item.amount) || 0);
    return sum + amount;
  }, 0) || 0) + (Number(config.monthlySavings) || 0);

  const [fixedSortBy, setFixedSortBy] = React.useState<'day' | 'name' | 'amount'>('day');

  const sortedIncomes = incomes || [];
  const sortedFixedExpenses = React.useMemo(() => {
    const list = [...(fixedExpenses || [])];
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
  }, [fixedExpenses, fixedSortBy]);

  const sortedSavings = config?.monthlySavingsItems || [];

  const getFixedSpentForCategory = (catName: string) => {
    return (fixedExpenses || [])
      .filter((e) => e.category?.trim().toLowerCase() === catName.trim().toLowerCase())
      .reduce((sum, e) => {
        const amount = (e.isVariable && e.periodOverrides && e.periodOverrides[currentPeriodId] !== undefined)
          ? e.periodOverrides[currentPeriodId]
          : (Number(e.amount) || 0);
        switch (e.frequency) {
          case 'quarterly': return sum + amount / 3;
          case 'semi-annually': return sum + amount / 6;
          case 'annually': return sum + amount / 12;
          default: return sum + amount;
        }
      }, 0);
  };

  const getVariableSpentForCategory = (catName: string) => {
    if (!stats || !stats.periodTransactions) return 0;
    let sum = 0;
    stats.periodTransactions.forEach((t: any) => {
      if (t.category?.trim().toLowerCase() === catName.trim().toLowerCase()) {
        sum += (Number(t.amount) || 0);
      }
    });
    return sum;
  };

  const totalBudgetPot = stats?.periodBudgetCents ? stats.periodBudgetCents / 100 : (stats?.disposablePot || 0);

  const getCategoryBudgetPct = (cat: any) => {
    if (cat.budget === undefined || cat.budget === null) return 0;
    return Number(cat.budget) || 0;
  };

  const getCategoryBudgetKr = (cat: any) => {
    const pct = getCategoryBudgetPct(cat);
    return Math.round((totalBudgetPot * pct) / 100);
  };

  const totalAllocatedPercentage = (config.categories || []).reduce(
    (sum, c) => sum + getCategoryBudgetPct(c),
    0
  );
  const totalAllocatedKronor = Math.round((totalBudgetPot * totalAllocatedPercentage) / 100);
  const remainingPercentage = 100 - totalAllocatedPercentage;
  const remainingToAllocate = Math.round((totalBudgetPot * remainingPercentage) / 100);

  const handleDistributeEvenly = () => {
    const cats = config.categories || [];
    if (cats.length === 0) return;
    const basePct = Math.floor(100 / cats.length);
    let remainder = 100 - basePct * cats.length;
    const updatedCategories = cats.map((c) => {
      const added = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;
      return { ...c, budget: basePct + added };
    });
    setConfig({ ...config, categories: updatedCategories });
  };

  if (showCategoryBudgets) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6 font-sans"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handleCloseCategoryBudgets}
            className="flex items-center gap-1.5 text-xs font-medium text-[#9CA6BC] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span>Tillbaka</span>
          </button>
          <span className="text-sm font-semibold text-white">
            Fördela vardagsbudget
          </span>
          <div className="w-12" />
        </div>

        {/* Hero Allocation Status Card */}
        <div className="bg-white/[0.045] backdrop-blur-[20px] border border-white/[0.03] rounded-[24px] p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] block mb-1">
                Kvar att fördela
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-semibold font-amount tabular-nums ${
                  remainingPercentage < 0 ? 'text-rose-400' : remainingPercentage === 0 ? 'text-[#8B9CFF]' : 'text-white'
                }`}>
                  {remainingPercentage}%
                </span>
                <span className="text-xs font-normal text-[#9CA6BC] tabular-nums">
                  ({formatAmount(Math.abs(remainingToAllocate), config.language)} {config.currency})
                </span>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] block mb-1">
                Vardagsbudget
              </span>
              <span className="text-base sm:text-lg font-semibold text-white font-amount tabular-nums">
                {formatAmount(totalBudgetPot, config.language)} {config.currency}
              </span>
              <span className="text-[11px] text-[#9CA6BC] font-normal">
                Fördelat: {totalAllocatedPercentage}% ({formatAmount(totalAllocatedKronor, config.language)} kr)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-white/[0.07] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                remainingPercentage < 0 ? 'bg-rose-500' : 'bg-[#8B9CFF]'
              }`}
              style={{ width: `${Math.min(100, totalAllocatedPercentage)}%` }}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] gap-2">
            <button
              type="button"
              onClick={handleDistributeEvenly}
              className="text-xs font-medium text-[#8B9CFF] hover:text-white flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#818cf8]/[0.12] transition-colors cursor-pointer"
            >
              <Sparkles size={13} />
              Fördela potten jämnt
            </button>

            <button
              type="button"
              onClick={() => {
                const updatedCategories = (config.categories || []).map((c) => ({ ...c, budget: undefined }));
                setConfig({ ...config, categories: updatedCategories });
              }}
              className="text-xs font-normal text-[#9CA6BC] hover:text-rose-400 flex items-center gap-1 py-1 px-2 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              Nollställ
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC]">
              Kategorier ({config.categories?.length || 0})
            </span>
          </div>
          
          <div className="space-y-2.5">
            {[...(config.categories || [])]
              .sort((a, b) => {
                const indexA = initialCategoryNames.indexOf(a.name);
                const indexB = initialCategoryNames.indexOf(b.name);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                return getCategoryBudgetPct(b) - getCategoryBudgetPct(a);
              })
              .map((cat) => {
              const iconName = cat.icon;
              const Icon = ICON_MAP[iconName];
              const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
              const variableSpent = Math.round(getVariableSpentForCategory(cat.name));
              const catPct = getCategoryBudgetPct(cat);
              const catKr = getCategoryBudgetKr(cat);

              return (
                <div 
                  key={cat.name}
                  className="p-3.5 sm:p-4 rounded-[18px] border border-white/[0.025] bg-white/[0.04] backdrop-blur-[18px] flex flex-col gap-2.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.035] text-[#C7CDDC] flex items-center justify-center shrink-0">
                        {isEmojiString(iconName) ? (
                          <span className="text-sm leading-none">{iconName}</span>
                        ) : Icon ? (
                          <Icon size={15} strokeWidth={1.75} className="text-[#C7CDDC]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C7CDDC]" />
                        )}
                      </div>
                      <span className="text-[13.5px] font-medium text-white truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold font-amount tabular-nums text-white">
                        {formatAmount(catKr, config.language)} kr
                      </span>
                      <div className="relative w-16">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          placeholder="0"
                          value={catPct > 0 ? catPct : ''}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              const updatedCategories = (config.categories || []).map((c) => 
                                c.name === cat.name ? { ...c, budget: undefined } : c
                              );
                              setConfig({ ...config, categories: updatedCategories });
                              return;
                            }
                            let val = Math.round(Number(e.target.value));
                            if (val < 0) val = 0;
                            if (val > 100) val = 100;
                            const updatedCategories = (config.categories || []).map((c) => 
                              c.name === cat.name ? { ...c, budget: val } : c
                            );
                            setConfig({ ...config, categories: updatedCategories });
                          }}
                          className="w-full h-8 px-2 rounded-xl bg-white/[0.04] border border-white/[0.035] text-xs font-semibold text-white text-right pr-5 focus:outline-none focus:border-[#8B9CFF] tabular-nums"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#9CA6BC] pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="px-0.5">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={catPct}
                      onChange={(e) => {
                        const val = Math.round(Number(e.target.value));
                        const updatedCategories = (config.categories || []).map((c) => 
                          c.name === cat.name ? { ...c, budget: val } : c
                        );
                        setConfig({ ...config, categories: updatedCategories });
                      }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#8B9CFF] focus:outline-none bg-white/[0.07]"
                    />
                  </div>

                  {(fixedSpent > 0 || variableSpent > 0) && (
                    <div className="flex items-center justify-between text-[11px] font-normal text-[#9CA6BC] px-0.5">
                      {variableSpent > 0 ? (
                        <span>Spenderat: {formatAmount(variableSpent, config.language)} kr</span>
                      ) : <span />}
                      {fixedSpent > 0 && (
                        <span>(Fasta: {formatAmount(fixedSpent, config.language)} kr)</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              if (confirm("Är du säker på att du vill nollställa all kategoribudgetering?")) {
                const updatedCategories = config.categories.map((c) => ({ ...c, budget: undefined }));
                setConfig({ ...config, categories: updatedCategories });
              }
            }}
            className="w-full h-11 rounded-full border border-rose-500/20 bg-rose-500/05 hover:bg-rose-500/10 text-rose-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={14} />
            Nollställ all budgetering
          </button>
          
          <button
            onClick={handleCloseCategoryBudgets}
            className="w-full h-11 rounded-full bg-[#818cf8]/[0.18] hover:bg-[#818cf8]/[0.25] text-white border border-[#8B9CFF]/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            Spara och gå tillbaka
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-7 font-sans"
    >
      {/* Overview Hero Section */}
      <div className="py-2 text-left space-y-1.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] block select-none">
          {t('monthlyDisposable')}
        </span>
        <div className="flex items-baseline gap-2">
          <AnimatedNumber 
            value={stats.disposablePot || 0} 
            className="text-[44px] sm:text-[54px] leading-none font-semibold font-amount tabular-nums text-white tracking-tight"
            formatter={(val) => formatAmount(val, config.language)}
          />
          <span className="text-[19px] sm:text-[21px] font-normal text-[#9CA6BC]">
            {config.currency}
          </span>
        </div>
      </div>

      {/* Budget Filter Segmented Control */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        <button
          onClick={() => setBudgetFilter('fixed')}
          className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            budgetFilter === 'fixed'
              ? 'bg-[#818cf8]/[0.16] text-white border border-[#8B9CFF]/30 shadow-none'
              : 'text-[#9CA6BC] hover:text-[#C7CDDC] hover:bg-white/[0.03]'
          }`}
        >
          {t('fixedExpenses' as TranslationKey) || 'Fasta utgifter'}
        </button>
        <button
          onClick={() => setBudgetFilter('income')}
          className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            budgetFilter === 'income'
              ? 'bg-[#818cf8]/[0.16] text-white border border-[#8B9CFF]/30 shadow-none'
              : 'text-[#9CA6BC] hover:text-[#C7CDDC] hover:bg-white/[0.03]'
          }`}
        >
          {t('incomes' as TranslationKey) || 'Inkomster'}
        </button>
        <button
          onClick={() => setBudgetFilter('savings')}
          className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            budgetFilter === 'savings'
              ? 'bg-[#818cf8]/[0.16] text-white border border-[#8B9CFF]/30 shadow-none'
              : 'text-[#9CA6BC] hover:text-[#C7CDDC] hover:bg-white/[0.03]'
          }`}
        >
          {t('monthlySavings' as TranslationKey) || 'Sparande'}
        </button>
      </div>

      {/* Total Amount Header */}
      <div className="flex items-center justify-between px-1 pt-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC]">
          {budgetFilter === 'fixed' && (t('fixedExpenses') || 'Fasta utgifter')}
          {budgetFilter === 'income' && (t('incomes') || 'Inkomster')}
          {budgetFilter === 'savings' && (t('monthlySavings') || 'Månadssparande')}
        </span>
        <span className="text-base sm:text-lg font-semibold font-amount tabular-nums text-white">
          {budgetFilter === 'fixed' && `−${formatAmount(Math.abs(stats.totalFixed || 0), config.language)} ${config.currency || 'kr'}`}
          {budgetFilter === 'income' && `+${formatAmount(Math.abs(stats.totalIncome || 0), config.language)} ${config.currency || 'kr'}`}
          {budgetFilter === 'savings' && `−${formatAmount(Math.abs(totalSavings || 0), config.language)} ${config.currency || 'kr'}`}
        </span>
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
              <div className="flex justify-end px-1">
                <button 
                  onClick={onAddIncome} 
                  className="text-xs font-medium text-[#8B9CFF] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-1"
                >
                  <Plus size={14} strokeWidth={2} />
                  <span>{t('newIncome')}</span>
                </button>
              </div>

              {sortedIncomes.length > 0 ? (
                <div className="bg-white/[0.035] backdrop-blur-[18px] rounded-[24px] border border-white/[0.025] divide-y divide-white/[0.035] overflow-hidden">
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
                      isGrouped={true}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title={t('noDataAvailable')} />
              )}
            </div>
          )}

          {/* Fixed Expenses Section */}
          {budgetFilter === 'fixed' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                {/* Discreet text sort controls */}
                <div className="flex items-center gap-2 text-xs text-[#9CA6BC]">
                  <span className="text-[11px] text-[#9CA6BC]/70">{config.language === 'en' ? 'Sort:' : 'Sortera:'}</span>
                  <button
                    type="button"
                    onClick={() => setFixedSortBy('day')}
                    className={`transition-colors cursor-pointer ${
                      fixedSortBy === 'day' 
                        ? 'text-white font-semibold' 
                        : 'hover:text-[#C7CDDC]'
                    }`}
                  >
                    {config.language === 'en' ? 'Day' : 'Dragningsdag'}
                  </button>
                  <span className="text-white/10">·</span>
                  <button
                    type="button"
                    onClick={() => setFixedSortBy('name')}
                    className={`transition-colors cursor-pointer ${
                      fixedSortBy === 'name' 
                        ? 'text-white font-semibold' 
                        : 'hover:text-[#C7CDDC]'
                    }`}
                  >
                    {config.language === 'en' ? 'Name' : 'Namn'}
                  </button>
                  <span className="text-white/10">·</span>
                  <button
                    type="button"
                    onClick={() => setFixedSortBy('amount')}
                    className={`transition-colors cursor-pointer ${
                      fixedSortBy === 'amount' 
                        ? 'text-white font-semibold' 
                        : 'hover:text-[#C7CDDC]'
                    }`}
                  >
                    {config.language === 'en' ? 'Amount' : 'Belopp'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onAddFixedExpense}
                  className="text-xs font-medium text-[#8B9CFF] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-1"
                >
                  <Plus size={14} strokeWidth={2} />
                  <span>{t('newFixedExpense')}</span>
                </button>
              </div>

              {sortedFixedExpenses.length > 0 ? (
                Object.entries(
                  sortedFixedExpenses.reduce((acc, exp) => {
                    const freq = exp.frequency || Frequency.MONTHLY;
                    if (!acc[freq]) acc[freq] = [];
                    acc[freq].push(exp);
                    return acc;
                  }, {} as Record<string, FixedExpense[]>)
                ).map(([freq, items]) => (
                  <div key={freq} className="space-y-2">
                    <div className="flex items-center gap-3 px-1 pt-1">
                      <span className="text-xs font-medium text-[#9CA6BC]">
                        {Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq) 
                          ? t(`freq_${Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq)!.toLowerCase()}` as TranslationKey)
                          : freq}
                      </span>
                    </div>
                    <div className="bg-white/[0.035] backdrop-blur-[18px] rounded-[24px] border border-white/[0.025] divide-y divide-white/[0.035] overflow-hidden">
                      {items.map((expense) => (
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
                          isGrouped={true}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title={t('noDataAvailable')} />
              )}
            </div>
          )}

          {/* Monthly Savings Section */}
          {budgetFilter === 'savings' && (
            <div className="space-y-4">
              <div className="flex justify-end px-1">
                <button 
                  type="button"
                  onClick={onAddMonthlySaving} 
                  className="text-xs font-medium text-[#8B9CFF] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-1"
                >
                  <Plus size={14} strokeWidth={2} />
                  <span>{t('newMonthlySaving')}</span>
                </button>
              </div>

              {sortedSavings.length > 0 ? (
                <div className="bg-white/[0.035] backdrop-blur-[18px] rounded-[24px] border border-white/[0.025] divide-y divide-white/[0.035] overflow-hidden">
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
                      isGrouped={true}
                    />
                  ))}
                </div>
              ) : config.monthlySavings > 0 ? (
                <button 
                  type="button"
                  onClick={onAddMonthlySaving} 
                  className="w-full bg-white/[0.04] p-4 sm:p-5 rounded-[22px] border border-white/[0.025] hover:bg-white/[0.06] transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.035] flex items-center justify-center text-[#C7CDDC] shrink-0">
                      <RefreshCw size={17} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white tracking-tight leading-tight">
                        Migrera månadssparande
                      </p>
                      <p className="text-xs font-normal text-[#9CA6BC] mt-1">
                        Lägg till sparande på <span className="font-amount tabular-nums font-semibold text-white">{formatAmount(config.monthlySavings)}</span> <span className="text-xs text-[#9CA6BC]">{config.currency}</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-7 px-3 rounded-full bg-[#818cf8]/[0.16] text-white border border-[#8B9CFF]/30 text-xs font-medium shrink-0 ml-3 flex items-center justify-center">
                    Lägg till
                  </div>
                </button>
              ) : (
                <EmptyState 
                  title={config.language === 'en' ? 'No monthly savings added yet' : 'Inget månadssparande inlagt än'} 
                  description={config.language === 'en' ? 'Add recurring monthly savings to reserve money automatically.' : 'Lägg in fast månadssparande för att automatiskt avsätta pengar varje månad.'}
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
