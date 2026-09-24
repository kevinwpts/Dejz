import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { RefreshCw, SlidersHorizontal, ArrowLeft, Check, Trash2 } from 'lucide-react';
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
  currentPeriodId
}: BudgetViewProps) {
  if (!stats) return null;

  const [budgetFilter, setBudgetFilter] = React.useState<'fixed' | 'income' | 'savings'>('fixed');
  const [showCategoryBudgets, setShowCategoryBudgets] = React.useState(false);

  const totalSavings = (config.monthlySavingsItems?.reduce((sum, item) => {
    const amount = (item.isVariable && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined)
      ? item.periodOverrides[currentPeriodId]
      : (Number(item.amount) || 0);
    return sum + amount;
  }, 0) || 0) + (Number(config.monthlySavings) || 0);
  const _totalOut = stats.totalFixed + totalSavings;
  const _retentionRate = stats.totalIncome > 0 ? (stats.remainingPeriodCents / stats.totalIncome) * 100 : 0;
  const _expensesPercent = stats.totalIncome > 0 ? (stats.totalFixed / stats.totalIncome) * 100 : 0;
  const _savingsPercent = stats.totalIncome > 0 ? (totalSavings / stats.totalIncome) * 100 : 0;

  // sortItems removed

  const sortedIncomes = incomes || [];
  const sortedFixedExpenses = fixedExpenses || [];
  const sortedSavings = config?.monthlySavingsItems || [];

  if (showCategoryBudgets) {
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
        if (t.category === 'Spargris') return;
        const splits = t.splits;
        if (splits && splits.length > 0) {
          splits.forEach((s: any) => {
            if (s.category?.trim().toLowerCase() === catName.trim().toLowerCase()) {
              sum += (Number(s.amount) || 0);
            }
          });
        } else if (t.category?.trim().toLowerCase() === catName.trim().toLowerCase()) {
          sum += (Number(t.amount) || 0);
        }
      });
      return sum;
    };

    const disposablePot = stats.disposablePot || 0;

    const getBudgetPercentage = (c: any, totalPot: number) => {
      if (c.budget === undefined) return undefined;
      if (c.budget > 100) {
        // Safe migration for old absolute budget values (e.g. 2000 kr -> 24%)
        return totalPot > 0 ? Math.min(100, Math.round((c.budget / totalPot) * 100)) : 0;
      }
      return c.budget;
    };

    const totalAllocatedPercentage = config.categories?.reduce((sum, c) => {
      const pct = getBudgetPercentage(c, disposablePot);
      if (pct !== undefined) return sum + pct;
      
      const catFixed = getFixedSpentForCategory(c.name);
      const catVariable = getVariableSpentForCategory(c.name);
      const catTotalUsed = catFixed + catVariable;
      const defaultPct = disposablePot > 0 ? Math.min(100, Math.round((catTotalUsed / disposablePot) * 100)) : 0;
      return sum + defaultPct;
    }, 0) || 0;

    const remainingPercentage = Math.max(0, 100 - totalAllocatedPercentage);
    const remainingBufferKronor = Math.round((remainingPercentage / 100) * disposablePot);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCategoryBudgets(false)}
            className="h-9 px-3.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-color)] text-[12px] font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            Tillbaka
          </button>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
            Fördela din vardagsbudget
          </h2>
          <div className="w-[85px]" /> {/* Spacer for visual balance */}
        </div>

        {/* Info card with progress meter */}
        <div className="p-5 sm:p-6 rounded-[24px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-xs space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                Totalt rörligt utrymme
              </span>
              <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-amount tabular-nums">
                {formatAmount(disposablePot, config.language)} {config.currency}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                Oallokerat kvar
              </span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-500 font-amount tabular-nums">
                {remainingPercentage}% <span className="text-[11px] font-normal opacity-80 text-[var(--text-secondary)]">({formatAmount(remainingBufferKronor, config.language)} {config.currency})</span>
              </span>
            </div>
          </div>

          {/* Allocation Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-[var(--border-color)]/60 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-300"
                style={{ width: `${totalAllocatedPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium text-[var(--text-secondary)]">
              <span>{totalAllocatedPercentage}% fördelat ({formatAmount(Math.round((totalAllocatedPercentage / 100) * disposablePot), config.language)} kr)</span>
              <span>{remainingPercentage}% kvar ({formatAmount(remainingBufferKronor, config.language)} kr)</span>
            </div>
          </div>
        </div>

        {/* Scrollable list of categories and their budgets */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight px-1">
            Budget per rörlig kategori
          </h3>
          
          <div className="space-y-4 pr-1">
            {config.categories?.map((cat) => {
              const iconName = cat.icon;
              const Icon = ICON_MAP[iconName];

              const fixedSpent = getFixedSpentForCategory(cat.name);
              const variableSpent = getVariableSpentForCategory(cat.name);
              const totalUsed = fixedSpent + variableSpent;

              const currentUsedPercentage = totalUsed > 0 && disposablePot > 0 ? Math.min(100, Math.round((totalUsed / disposablePot) * 100)) : 0;
              const displayedPercentage = getBudgetPercentage(cat, disposablePot) !== undefined 
                ? getBudgetPercentage(cat, disposablePot)! 
                : currentUsedPercentage;

              const displayedBudget = Math.round((displayedPercentage / 100) * disposablePot);
              const maxPercentageVal = Math.min(100, displayedPercentage + remainingPercentage);

              return (
                <div 
                  key={cat.name}
                  className="p-4 sm:p-5 rounded-[24px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-2xs flex flex-col gap-3.5"
                >
                  {/* Top Row: Icon, Name and Percentage Input */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-3xs"
                        style={{ backgroundColor: cat.color || '#94a3b8' }}
                      >
                        {isEmojiString(iconName) ? (
                          <span className="text-[17px] leading-none">{iconName}</span>
                        ) : Icon ? (
                          <Icon size={18} strokeWidth={1.75} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full" />
                        )}
                      </div>
                      <span className="text-[13.5px] font-bold text-[var(--text-primary)] tracking-tight truncate flex items-center gap-1.5">
                        {cat.name}
                        <span className="px-1.5 py-0.5 rounded-md bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[10px] font-semibold tabular-nums shrink-0">
                          {displayedPercentage}%
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <input
                          type="number"
                          placeholder={`${currentUsedPercentage}%`}
                          value={getBudgetPercentage(cat, disposablePot) !== undefined ? getBudgetPercentage(cat, disposablePot) : ''}
                          min={0}
                          max={maxPercentageVal}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              const updatedCategories = config.categories.map((c) => 
                                c.name === cat.name ? { ...c, budget: undefined } : c
                              );
                              setConfig({ ...config, categories: updatedCategories });
                              return;
                            }
                            let val = Number(e.target.value);
                            if (val < 0) val = 0;
                            if (val > maxPercentageVal) val = maxPercentageVal;
                            const updatedCategories = config.categories.map((c) => 
                              c.name === cat.name ? { ...c, budget: val } : c
                            );
                            setConfig({ ...config, categories: updatedCategories });
                          }}
                          className="w-20 h-9 px-3 rounded-[12px] bg-[var(--surface-muted)]/50 border border-[var(--border-color)] text-[12.5px] font-bold text-[var(--text-primary)] text-right pr-6 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] tabular-nums"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[var(--text-secondary)]">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Usage details and helper buttons */}
                  <div className="flex flex-col gap-2 bg-[var(--surface-muted)]/40 p-3 rounded-[16px] border border-[var(--border-color)]/30">
                    <div className="flex flex-wrap justify-between items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)]">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <span>Motsvarar kostnad: <strong className="text-[var(--text-primary)] font-bold font-amount">{formatAmount(displayedBudget, config.language)} kr</strong></span>
                        {totalUsed > 0 && (
                          <span>Spenderat hittills: <strong className="text-[var(--text-primary)] font-semibold font-amount">{formatAmount(totalUsed, config.language)} kr ({currentUsedPercentage}%)</strong></span>
                        )}
                      </div>

                      {/* Quick helper button to restore to pre-filled totalUsed ONLY if custom budget has been set and differs */}
                      {getBudgetPercentage(cat, disposablePot) !== undefined && getBudgetPercentage(cat, disposablePot) !== currentUsedPercentage && (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedCategories = config.categories.map((c) => 
                              c.name === cat.name ? { ...c, budget: undefined } : c
                            );
                            setConfig({ ...config, categories: updatedCategories });
                          }}
                          className="px-2.5 py-1 rounded-full bg-[var(--accent-color)]/10 hover:bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-bold text-[10px] active:scale-95 transition-all cursor-pointer border border-[var(--accent-color)]/20 shadow-4xs"
                        >
                          Återställ till nuvarande ({currentUsedPercentage}%)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Slider Control */}
                  <div className="space-y-1.5 px-1 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={maxPercentageVal}
                      step="1"
                      value={displayedPercentage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const updatedCategories = config.categories.map((c) => 
                          c.name === cat.name ? { ...c, budget: val } : c
                        );
                        setConfig({ ...config, categories: updatedCategories });
                      }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--accent-color)] focus:outline-none bg-[var(--border-color)]/60"
                      style={{
                        backgroundImage: `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${maxPercentageVal > 0 ? (displayedPercentage / maxPercentageVal) * 100 : 0}%, var(--border-color) ${maxPercentageVal > 0 ? (displayedPercentage / maxPercentageVal) * 100 : 0}%, var(--border-color) 100%)`
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-semibold">
                      <span>0% ({formatAmount(0, config.language)} kr)</span>
                      <span>Max: {maxPercentageVal}% ({formatAmount(Math.round((maxPercentageVal / 100) * disposablePot), config.language)} kr)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => {
              if (confirm("Är du säker på att du vill nollställa all kategoribudgetering? Alla kategorier kommer att återgå till sina förinställda värden.")) {
                const updatedCategories = config.categories.map((c) => ({ ...c, budget: undefined }));
                setConfig({ ...config, categories: updatedCategories });
              }
            }}
            className="w-full h-11 rounded-full border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={16} />
            Nollställ all budgetering
          </button>
          
          <button
            onClick={() => setShowCategoryBudgets(false)}
            className="w-full h-11 rounded-full bg-[var(--accent-color)] text-[13px] font-bold text-[var(--text-on-accent)] shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={16} />
            Spara och gå tillbaka
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 sm:space-y-10"
    >
      {/* Overview Section - Clean & Simple */}
      <div className="space-y-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="p-6 sm:p-7 rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-sm flex flex-col items-center text-center"
        >
          <span className="text-xs font-semibold text-[var(--text-secondary)] opacity-85 mb-2.5 block">
            {t('monthlyDisposable')}
          </span>
          <div className="flex items-baseline justify-center gap-1.5">
            <AnimatedNumber 
                value={stats.disposablePot || 0} 
                className="text-3xl sm:text-4xl md:text-5xl leading-none font-bold text-[var(--text-primary)] font-amount tabular-nums tracking-tight"
                formatter={(val) => formatAmount(val, config.language)}
            />
            <span className="text-base sm:text-lg font-light opacity-60 text-[var(--text-secondary)]">
              {config.currency}
            </span>
          </div>

        </motion.div>

        {/* Core Stats Modules - Standardized, Color-themed & Compact */}
        <div className="grid grid-cols-3 gap-2.5">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">{t('incomes') || 'Inkomster'}</span>
            <span className="text-[15px] sm:text-[17px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">+{formatAmount(Math.abs(stats.totalIncome || 0), config.language)} {config.currency || 'kr'}</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">{t('fixedExpenses') || 'Fasta utgifter'}</span>
            <span className="text-[15px] sm:text-[17px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">-{formatAmount(Math.abs(stats.totalFixed || 0), config.language)} {config.currency || 'kr'}</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">{t('monthlySavings') || 'Månadssparande'}</span>
            <span className="text-[15px] sm:text-[17px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">-{formatAmount(Math.abs(totalSavings || 0), config.language)} {config.currency || 'kr'}</span>
          </motion.div>
        </div>

        {/* Category Budget Allocation Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => setShowCategoryBudgets(true)}
          className="w-full h-11 rounded-[16px] bg-[var(--surface-color)] border border-[var(--border-color)] text-[12.5px] sm:text-[13px] font-bold text-[var(--accent-color)] hover:bg-[var(--surface-muted)]/70 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
        >
          <SlidersHorizontal size={15} />
          Fördela din vardagsbudget
        </motion.button>
      </div>

      {/* Budget Filter Segmented Control */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-full shadow-xs">
        <button
          onClick={() => setBudgetFilter('fixed')}
          className={`h-9 rounded-full text-[11px] sm:text-[12px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center ${
            budgetFilter === 'fixed'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('fixedExpenses' as TranslationKey) || 'Fasta utgifter'}
        </button>
        <button
          onClick={() => setBudgetFilter('income')}
          className={`h-9 rounded-full text-[11px] sm:text-[12px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center ${
            budgetFilter === 'income'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('incomes' as TranslationKey) || 'Inkomster'}
        </button>
        <button
          onClick={() => setBudgetFilter('savings')}
          className={`h-9 rounded-full text-[11px] sm:text-[12px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center ${
            budgetFilter === 'savings'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('monthlySavings' as TranslationKey) || 'Sparande'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={budgetFilter}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8 sm:space-y-10"
        >
          {/* Incomes Section */}
          {budgetFilter === 'income' && (
            <div className="space-y-3.5">
              <div className="flex justify-end px-2">
                <button onClick={onAddIncome} className="h-8 px-3 rounded-full bg-[var(--surface-color)] text-[12px] font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs">
                  + {t('newIncome')}
                </button>
              </div>
              <div className="space-y-3.5">
                {sortedIncomes.length > 0 ? (
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                      {sortedIncomes.map((income, index) => (
                        <motion.div
                          key={`${income.id}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <BudgetItem 
                            item={income} 
                            onClick={() => onViewIncome(income)} 
                            currency={config.currency} 
                            type="income"
                            language={config.language as Language}
                            t={t}
                            config={config}
                            currentPeriodId={currentPeriodId}
                            isGrouped={false}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <EmptyState title={t('noDataAvailable')} />
                )}
              </div>
            </div>
          )}

          {/* Fixed Expenses Section */}
          {budgetFilter === 'fixed' && (
            <div className="space-y-3.5 pt-2 sm:pt-3">
              <div className="flex justify-end px-2">
                <button onClick={onAddFixedExpense} className="h-8 px-3 rounded-full bg-[var(--surface-color)] text-[12px] font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs">
                  + {t('newFixedExpense')}
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
                  <div key={freq} className="space-y-2.5">
                    <div className="flex items-center gap-3 px-2">
                      <span className="text-xs font-semibold text-[var(--accent-color)] opacity-90">
                        {Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq) 
                          ? t(`freq_${Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq)!.toLowerCase()}` as TranslationKey)
                          : freq}
                      </span>
                      <div className="h-[0.5px] flex-1 bg-[var(--border-color)]" />
                    </div>
                    <div className="space-y-2.5">
                      <AnimatePresence mode="popLayout">
                        {items.map((expense, index) => (
                          <motion.div
                            key={`${expense.id}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <BudgetItem 
                              item={expense} 
                              onClick={() => onViewFixedExpense(expense)} 
                              currency={config.currency} 
                              type="expense"
                              language={config.language as Language}
                              t={t}
                              config={config}
                              currentPeriodId={currentPeriodId}
                              isGrouped={false}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
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
            <div className="space-y-3.5 pt-2 sm:pt-3">
              <div className="flex justify-end px-2">
                <button onClick={onAddMonthlySaving} className="h-8 px-3 rounded-full bg-[var(--surface-color)] text-[12px] font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs">
                  + {t('newMonthlySaving')}
                </button>
              </div>
              <div className="space-y-3.5">
                {sortedSavings.length > 0 ? (
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                      {sortedSavings.map((saving, index) => (
                        <motion.div
                          key={`${saving.id}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <BudgetItem 
                            item={saving} 
                            onClick={() => onViewMonthlySaving(saving)} 
                            currency={config.currency} 
                            type="expense"
                            language={config.language as Language}
                            t={t}
                            config={config}
                            currentPeriodId={currentPeriodId}
                            isGrouped={false}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : config.monthlySavings > 0 ? (
                  <button 
                    type="button"
                    onClick={onAddMonthlySaving}
                    className="w-full bg-[var(--surface-color)] p-4 sm:p-5 rounded-[16px] border border-[var(--border-color)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-between text-left group shadow-xs cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform shrink-0">
                        <RefreshCw size={18} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] sm:text-[15px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                          Migrera månadssparande
                        </p>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                          Lägg till sparande på <span className="font-amount tabular-nums font-bold text-[var(--text-primary)]">{formatAmount(config.monthlySavings)}</span> <span className="font-sans text-[11px] font-bold text-[var(--text-secondary)]">{config.currency}</span>
                        </p>
                      </div>
                    </div>
                    <div className="h-7 px-2.5 rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] text-[11px] font-semibold shrink-0 ml-3 flex items-center justify-center group-hover:opacity-90 transition-opacity">
                      Lägg till
                    </div>
                  </button>
                ) : (
                  <EmptyState title={t('noDataAvailable')} />
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
    </motion.div>
  );
}
