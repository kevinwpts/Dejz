import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Check, Sparkles, RotateCcw, Plus, Calendar, ArrowDownLeft, PiggyBank, ArrowUpDown, MoreVertical, ChevronDown } from 'lucide-react';
import { ICON_MAP, isEmojiString, getCategoryIconName } from '../utils/icons';
import { CategoryIcon } from './CategoryIcon';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey, Language } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { FilterSelectButton, FilterMenuModal, Button } from './ui';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

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
  const curr = config?.currency || 'kr';
  const [editingCategoryName, setEditingCategoryName] = React.useState<string | null>(null);
  const [inlineInputValue, setInlineInputValue] = React.useState<string>("");
  const [budgetFilter, setBudgetFilter] = React.useState<'fixed' | 'income' | 'savings'>('fixed');
  const [isBudgetFilterModalOpen, setIsBudgetFilterModalOpen] = React.useState(false);
  const [showCategoryBudgets, setShowCategoryBudgets] = React.useState(() => {
    return initialSection === 'category-budgets' || initialSection === 'allocate';
  });
  const handleOpenCategoryBudgets = () => {
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

  const [fixedSortBy, setFixedSortBy] = React.useState<'day' | 'name' | 'amount'>('day');
  const [incomeSortBy, setIncomeSortBy] = React.useState<'day' | 'name' | 'amount'>('day');
  const [savingSortBy, setSavingSortBy] = React.useState<'day' | 'name' | 'amount'>('day');
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (confirmReset) {
      const timer = setTimeout(() => setConfirmReset(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmReset]);

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

  const getFixedSpentForCategory = (catName: string) => {
    return (fixedExpenses || [])
      .filter((e) => e.category?.trim().toLowerCase() === catName.trim().toLowerCase())
      .reduce((sum, e) => {
        const amount = (e.isVariable && e.periodOverrides && e.periodOverrides[currentPeriodId] !== undefined)
          ? e.periodOverrides[currentPeriodId]
          : (Number(e.amount) || 0);
        switch (e.frequency) {
          case Frequency.QUARTERLY: return sum + amount / 3;
          case Frequency.SEMI_ANNUALLY: return sum + amount / 6;
          case Frequency.ANNUALLY: return sum + amount / 12;
          default: return sum + amount;
        }
      }, 0);
  };



  // --- Category Budget Allocation Logic & Calculations ---
  const totalIncomeSum = (incomes || []).reduce((sum, i) => {
    const amount = (i.isVariable && i.periodOverrides && i.periodOverrides[currentPeriodId] !== undefined)
      ? i.periodOverrides[currentPeriodId]
      : (Number(i.amount) || 0);
    return sum + amount;
  }, 0);

  const totalFixedSum = (fixedExpenses || []).reduce((sum, e) => {
    const amount = (e.isVariable && e.periodOverrides && e.periodOverrides[currentPeriodId] !== undefined)
      ? e.periodOverrides[currentPeriodId]
      : (Number(e.amount) || 0);
    switch (e.frequency) {
      case Frequency.QUARTERLY: return sum + amount / 3;
      case Frequency.SEMI_ANNUALLY: return sum + amount / 6;
      case Frequency.ANNUALLY: return sum + amount / 12;
      default: return sum + amount;
    }
  }, 0);

  const totalSavingsSum = config.monthlySavingsItems && config.monthlySavingsItems.length > 0
    ? (config.monthlySavingsItems.reduce((sum, item) => {
        const amount = (item.isVariable && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined)
          ? item.periodOverrides[currentPeriodId]
          : (Number(item.amount) || 0);
        return sum + amount;
      }, 0) || 0)
    : (Number(config.monthlySavings) || 0);

  const calculatedEverydayBudget = Math.max(0, Math.round(totalIncomeSum - totalFixedSum - totalSavingsSum));
  const everydayBudget = stats?.disposablePot !== undefined ? Math.round(stats.disposablePot) : calculatedEverydayBudget;

  // Category Budget Editing Modal State
  
  

  // Legacy Percentage Normalization on Open
  React.useEffect(() => {
    if (showCategoryBudgets && config.categories && config.categories.length > 0) {
      const budgetValues = config.categories.map((c) => Number(c.budget) || 0);
      const totalSum = budgetValues.reduce((a, b) => a + b, 0);
      const maxVal = Math.max(...budgetValues, 0);

      // If budgets look like legacy percentages (max <= 100 and sum <= 100) and everydayBudget > 500, convert to SEK
      if (maxVal <= 100 && totalSum <= 100 && totalSum > 0 && everydayBudget > 500) {
        const normalized = config.categories.map((c) => {
          if (!c.budget || Number(c.budget) <= 0) return { ...c, budget: null };
          const converted = Math.round((everydayBudget * Number(c.budget)) / 100);
          return { ...c, budget: converted > 0 ? converted : undefined };
        });
        setConfig({ ...config, categories: normalized });
      }
    }
  }, [showCategoryBudgets, everydayBudget]);

  const totalAllocated = (config.categories || []).reduce((sum, c) => {
    const fixedSpent = Math.round(getFixedSpentForCategory(c.name));
    const val = Math.max(Number(c.budget) || 0, fixedSpent);
    return sum + (val > 0 ? val : 0);
  }, 0);

  const remainingToAllocate = totalIncomeSum - totalAllocated;
  const isOverAllocated = remainingToAllocate < 0;

  // Automatic Distribution (Secondary choice requested by user)
  const handleAutoDistribute = () => {
    const cats = config.categories || [];
    if (cats.length === 0 || everydayBudget <= 0) return;

    // Target amount to distribute: if 0 allocated, distribute everydayBudget; else distribute remainingToAllocate across unbudgeted
    const unbudgetedCats = cats.filter((c) => !c.budget || Number(c.budget) <= 0);
    const targetPool = unbudgetedCats.length > 0 ? unbudgetedCats : cats;

    const amountPerCat = Math.floor(everydayBudget / targetPool.length / 50) * 50; // round to nearest 50 kr

    const updated = cats.map((c) => {
      if (targetPool.some((t) => t.name === c.name)) {
        return { ...c, budget: amountPerCat > 0 ? amountPerCat : 500 };
      }
      return c;
    });

    setConfig({ ...config, categories: updated });
  };

  // Auto-adapt down if over-allocated
  const handleAutoAdaptDown = () => {
    if (!isOverAllocated || totalAllocated <= 0 || totalIncomeSum <= 0) return;
    const ratio = totalIncomeSum / totalAllocated;

    const updated = (config.categories || []).map((c) => {
      if (!c.budget || Number(c.budget) <= 0) return c;
      const scaled = Math.round((Number(c.budget) * ratio) / 50) * 50;
      return { ...c, budget: scaled > 0 ? scaled : undefined };
    });

    setConfig({ ...config, categories: updated });
  };

  


  const sortedCategoriesForManage = [...(config.categories || [])]
    .filter((cat) => {
      if (!config?.hideEmptyCategories) return true;
      const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
      const budgetVal = cat.budget !== undefined && cat.budget !== null ? Number(cat.budget) || 0 : 0;
      return budgetVal > 0 || fixedSpent > 0;
    })
    .sort((a, b) => {
      const aFixed = Math.round(getFixedSpentForCategory(a.name));
      const bFixed = Math.round(getFixedSpentForCategory(b.name));
      if (bFixed !== aFixed) {
        return bFixed - aFixed;
      }
      return (a.name || "").localeCompare(b.name || "");
    });

  if (showCategoryBudgets) {
    const renderCategoryRow = (cat: any) => {
      const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
      const catBudget = Math.max(Number(cat.budget) || 0, fixedSpent);
      const isEditingThis = editingCategoryName === cat.name;
      const extraBudget = catBudget - fixedSpent;

      return (
        <div 
          key={cat.name}
          className="py-3.5 px-4 sm:px-5 flex items-center justify-between gap-4 transition-colors"
        >
          {/* Left Part: Category Icon with Color, Name and helper text */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="shrink-0">
              {isEmojiString(cat.icon) ? (
                <div 
                  className="w-[34px] h-[34px] sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: cat.color ? `${cat.color}20` : 'var(--surface-muted)' }}
                >
                  {cat.icon}
                </div>
              ) : (
                <div 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                  style={{ backgroundColor: cat.color || '#6366f1' }}
                >
                  <CategoryIcon
                    icon={cat.icon || getCategoryIconName(cat.name)}
                    size="sm"
                    noBackground
                    whiteIcon
                  />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[13.5px] font-bold text-[var(--text-primary)] truncate block tracking-tight">
                {cat.name}
              </span>
              {fixedSpent > 0 ? (
                <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-85 block truncate mt-0.5 font-sans">
                  {formatAmount(fixedSpent, config.language)} {curr} fast ingår
                  {extraBudget > 0 && ` (+${formatAmount(extraBudget, config.language)} ${curr} extra)`}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-40 block truncate mt-0.5">
                  Endast rörliga utgifter
                </span>
              )}
            </div>
          </div>

          {/* Right Part: Direct input of amount without +/- buttons */}
          <div className="shrink-0">
            {isEditingThis ? (
              <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-[#222222] rounded-[12px] px-2.5 py-1.5 border border-[var(--accent-color)]">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={inlineInputValue}
                  onBlur={() => {
                    const finalVal = Math.max(fixedSpent, Number(inlineInputValue) || 0);
                    const updatedCategories = (config.categories || []).map((c) => {
                      if (c.name === cat.name) {
                        return { ...c, budget: finalVal > 0 ? finalVal : null };
                      }
                      return c;
                    });
                    setConfig({ ...config, categories: updatedCategories });
                    setEditingCategoryName(null);
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setInlineInputValue(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-16 sm:w-20 bg-transparent border-none text-right text-sm font-bold text-[var(--text-primary)] font-amount tabular-nums outline-none"
                />
                <span className="text-xs font-bold text-[var(--text-secondary)] select-none">
                  {curr}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingCategoryName(cat.name);
                  setInlineInputValue(catBudget > 0 ? String(catBudget) : "");
                }}
                className="min-w-[80px] text-right py-2 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className={`text-[14px] font-bold font-amount tabular-nums ${
                  catBudget > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-60'
                }`}>
                  {catBudget > 0 ? `${formatAmount(catBudget, config.language)} ${curr}` : `0 ${curr}`}
                </span>
              </button>
            )}
          </div>
        </div>
      );
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6 font-sans"
      >
        {/* 1. Tydlig budgetöversikt i en toppmodul */}
        <div className="bg-[var(--surface-color)] rounded-[22px] p-5 sm:p-6 border-none shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[var(--text-secondary)] tracking-tight">
              {config.language === 'en' ? 'Budget overview' : 'Budgetöversikt'}
            </span>
            
            {/* Tre-punkters meny */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-[#222222] hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Fler alternativ"
              >
                <MoreVertical size={16} strokeWidth={2.2} />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[100]" 
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-[#222222] rounded-[16px] shadow-lg border border-black/5 dark:border-white/10 z-[110] overflow-hidden py-1"
                    >
                      {isOverAllocated && (
                        <button
                          type="button"
                          onClick={() => {
                            handleAutoAdaptDown();
                            setIsMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Sparkles size={13} />
                          Anpassa automatiskt
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirmReset) {
                            setConfirmReset(true);
                          } else {
                            const updatedCategories = (config.categories || []).map((c) => ({ ...c, budget: null }));
                            setConfig({ ...config, categories: updatedCategories });
                            setConfirmReset(false);
                            setIsMenuOpen(false);
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <RotateCcw size={13} />
                        {confirmReset ? 'Klicka igen för att nollställa' : 'Nollställ budgeten'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Beloppet som återstår med störst visuell tyngd */}
          <div className="space-y-1">
            <div className={`text-[26px] sm:text-[32px] leading-tight font-extrabold tracking-tight font-amount tabular-nums ${
              isOverAllocated ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-primary)]"
            }`}>
              {remainingToAllocate > 0 ? (
                <>
                  <span>{formatAmount(remainingToAllocate, config.language)} {curr}</span>
                  <span className="text-base sm:text-lg font-medium text-[var(--text-secondary)] font-sans ml-1.5">kvar att fördela</span>
                </>
              ) : remainingToAllocate === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xl sm:text-2xl py-1 font-sans font-bold">
                  ✓ Allt är fördelat! 🎉
                </span>
              ) : (
                <>
                  <span>{formatAmount(Math.abs(remainingToAllocate), config.language)} {curr}</span>
                  <span className="text-base sm:text-lg font-medium text-rose-500/80 font-sans ml-1.5">överfördelat</span>
                </>
              )}
            </div>

            {/* Kompletterande mindre information */}
            <div className="text-xs sm:text-[13px] font-semibold text-[var(--text-secondary)]">
              {formatAmount(totalAllocated, config.language)} av {formatAmount(totalIncomeSum, config.language)} {curr} fördelat
            </div>
          </div>

          {/* Diskret förloppsindikator */}
          <div className="w-full h-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isOverAllocated ? "bg-rose-500" : "bg-[var(--accent-color)]"
              }`}
              style={{ width: `${Math.min(100, Math.round((totalAllocated / (totalIncomeSum || 1)) * 100))}%` }}
            />
          </div>

          {/* Knappen "Fördela automatiskt" under förloppsindikatorn */}
          {!isOverAllocated && remainingToAllocate > 0 && (
            <button
              type="button"
              onClick={handleAutoDistribute}
              className="w-full mt-2 h-[40px] rounded-full bg-black/5 dark:bg-[#222222] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-primary)] hover:text-[var(--accent-color)] text-[12.5px] font-semibold tracking-tight flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Sparkles size={13} className="text-[var(--accent-color)] animate-pulse" />
              Fördela automatiskt
            </button>
          )}
        </div>

        {/* 2. Kategorilistan (Alla kategorier samlade i en ren lista) */}
        <div className="space-y-3">
          <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight px-1 block">
            {config.language === 'en' ? 'Categories' : 'Kategorier'}
          </span>
          
          <div className="overflow-hidden rounded-[22px] bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {sortedCategoriesForManage.map((cat) => renderCategoryRow(cat))}
          </div>
        </div>

        {/* Spara & Klar */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleCloseCategoryBudgets}
            className="w-full h-12 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-none"
          >
            <Check size={16} strokeWidth={2.5} />
            {config.language === 'en' ? 'Done, save budget' : 'Klar, spara budgeten'}
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
      className="space-y-6 font-sans"
    >
      {/* Budget Filter Single Selector Button */}
      <div className="w-full">
        <FilterSelectButton
          icon={
            budgetFilter === 'fixed' ? <Calendar size={15} strokeWidth={2} /> :
            budgetFilter === 'income' ? <ArrowDownLeft size={15} strokeWidth={2} /> :
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
              icon: <ArrowDownLeft size={16} strokeWidth={2} />,
            },
            {
              id: 'savings',
              label: config?.language === 'en' ? 'Monthly savings' : 'Månadssparande',
              icon: <PiggyBank size={16} strokeWidth={2} />,
            },
          ]}
        />
      </div>

      {/* Overview Hero Section - Dynamic based on filter */}
      <div className="text-center flex flex-col items-center gap-1 py-1 select-none">
        <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block">
          {budgetFilter === 'fixed' && (config?.language === 'en' ? 'Total fixed expenses' : 'Totala fasta utgifter')}
          {budgetFilter === 'income' && (config?.language === 'en' ? 'Total income' : 'Totala inkomster')}
          {budgetFilter === 'savings' && (config?.language === 'en' ? 'Total savings' : 'Totalt sparande')}
        </span>
        <div className="flex items-baseline justify-center gap-1.5">
          <AnimatedNumber 
            value={Math.round(
              budgetFilter === 'fixed' ? totalFixedSum :
              budgetFilter === 'income' ? totalIncomeSum :
              totalSavingsSum
            )} 
            className="text-[34px] sm:text-[38px] md:text-[42px] leading-tight font-semibold font-amount tabular-nums tracking-tight text-[var(--text-primary)]"
            formatter={(val) => {
              const prefix = budgetFilter === 'income' ? '+' : '−';
              return `${prefix}${formatAmount(val, config?.language)}`;
            }}
          />
          <span className="text-sm sm:text-base font-normal text-[var(--text-secondary)]">
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
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                {/* Single compact sort toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (incomeSortBy === 'day') setIncomeSortBy('name');
                    else if (incomeSortBy === 'name') setIncomeSortBy('amount');
                    else setIncomeSortBy('day');
                  }}
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 border-none text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
                  title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                >
                  <ArrowUpDown size={13} strokeWidth={2.2} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="text-[var(--text-secondary)] font-normal">
                    {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
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
                  className="h-9 px-4 rounded-xl bg-[var(--accent-color)] hover:brightness-105 text-[var(--text-on-accent)] text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98] shadow-xs"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{t('newIncome')}</span>
                </button>
              </div>

              {sortedIncomes.length > 0 ? (
                <div className="space-y-2.5">
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
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 mb-4">
                {/* Single compact sort toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (fixedSortBy === 'day') setFixedSortBy('name');
                    else if (fixedSortBy === 'name') setFixedSortBy('amount');
                    else setFixedSortBy('day');
                  }}
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 border-none text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
                  title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                >
                  <ArrowUpDown size={13} strokeWidth={2.2} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="text-[var(--text-secondary)] font-normal">
                    {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
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
                  icon={<Plus size={14} strokeWidth={2.5} />}
                  onClick={onAddFixedExpense}
                >
                  {t('newFixedExpense')}
                </Button>
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
                      <span className="text-xs font-semibold font-display uppercase tracking-wider text-[var(--text-secondary)]">
                        {Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq) 
                          ? t(`freq_${Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq)!.toLowerCase()}` as TranslationKey)
                          : freq}
                      </span>
                    </div>
                    <div className="space-y-2.5">
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
                <EmptyState 
                  title={config.language === 'en' ? 'No fixed expenses added yet' : 'Inga fasta utgifter inlagda än'} 
                  description={config.language === 'en' ? 'Add rent, bills, and subscriptions to track upcoming payments.' : 'Lägg in hyra, räkningar och abonnemang för att få full koll på fasta kostnader.'}
                  actionLabel={`+ ${t('newFixedExpense')}`}
                  onAction={onAddFixedExpense}
                />
              )}
            </div>
          )}

          {/* Monthly Savings Section */}
          {budgetFilter === 'savings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 mb-4">
                {/* Single compact sort toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (savingSortBy === 'day') setSavingSortBy('name');
                    else if (savingSortBy === 'name') setSavingSortBy('amount');
                    else setSavingSortBy('day');
                  }}
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 border-none text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
                  title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                >
                  <ArrowUpDown size={13} strokeWidth={2.2} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="text-[var(--text-secondary)] font-normal">
                    {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
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
                  icon={<Plus size={14} strokeWidth={2.5} />}
                  onClick={onAddMonthlySaving}
                >
                  {t('newMonthlySaving')}
                </Button>
              </div>

              {sortedSavings.length > 0 ? (
                <div className="space-y-2.5">
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
