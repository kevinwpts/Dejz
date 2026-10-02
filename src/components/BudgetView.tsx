import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Check, Sparkles, RotateCcw, Plus, Calendar, ArrowDownLeft, PiggyBank, ArrowUpDown } from 'lucide-react';
import { ICON_MAP, isEmojiString } from '../utils/icons';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey, Language } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { FilterSelectButton, FilterMenuModal } from './ui';
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

  


  const sortedCategoriesForManage = [...(config.categories || [])].sort((a, b) => {
    const aFixed = Math.round(getFixedSpentForCategory(a.name));
    const bFixed = Math.round(getFixedSpentForCategory(b.name));
    if (bFixed !== aFixed) {
      return bFixed - aFixed;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  if (showCategoryBudgets) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6 font-sans"
      >
        {/* Open Top Header - No card slop, directly on background */}
        <div className="px-1 py-3 space-y-5">


          {/* Large dynamic status amount focused on "[spent] av [income] fördelat" */}
          <div className="space-y-1">
            <div className="text-[26px] sm:text-[32px] leading-tight font-bold tracking-tight text-[#1C1917] dark:text-white tabular-nums">
              {isOverAllocated ? (
                <>
                  <span className="text-rose-600 dark:text-rose-400">{formatAmount(totalAllocated, config.language)} {curr}</span>
                  <span className="text-[#6E6961] dark:text-[#A8A8A8] text-lg sm:text-xl font-medium"> fördelat av </span>
                  <span>{formatAmount(totalIncomeSum, config.language)} {curr}</span>
                </>
              ) : (
                <>
                  <span className="text-[#1C1917] dark:text-white">{formatAmount(totalAllocated, config.language)} {curr}</span>
                  <span className="text-[#6E6961] dark:text-[#A8A8A8] text-lg sm:text-xl font-medium"> fördelat av </span>
                  <span>{formatAmount(totalIncomeSum, config.language)} {curr}</span>
                </>
              )}
            </div>
            {isOverAllocated ? (
              <span className="text-xs font-semibold tracking-wide text-rose-600 dark:text-rose-400 block mt-1">
                ⚠️ Du har fördelat {formatAmount(Math.abs(remainingToAllocate), config.language)} {curr} mer än din inkomst ({formatAmount(totalIncomeSum, config.language)} {curr})
              </span>
            ) : (
              <span className="text-xs font-semibold tracking-wide text-[#6E6961] dark:text-[#A8A8A8] block mt-1">
                ✓ {formatAmount(remainingToAllocate, config.language)} {curr} kvar att fördela av din inkomst ({formatAmount(totalIncomeSum, config.language)} {curr})
              </span>
            )}
          </div>

          {/* Simple progress bar */}
          <div className="w-full h-1.5 bg-black/5 dark:bg-[#222222] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isOverAllocated ? "bg-rose-500" : "bg-[#1C1917] dark:bg-white"
              }`}
              style={{ width: `${Math.min(100, Math.round((totalAllocated / (totalIncomeSum || 1)) * 100))}%` }}
            />
          </div>

          {/* Secondary Quick Actions - Discreetly placed */}
          <div className="flex items-center gap-3 pt-1">
            {isOverAllocated ? (
              <button
                type="button"
                onClick={handleAutoAdaptDown}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-white flex items-center gap-1.5 py-1 px-3 rounded-full bg-rose-50 dark:bg-rose-500/[0.08] border border-rose-200 dark:border-rose-500/15 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles size={11} />
                Anpassa automatiskt
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAutoDistribute}
                className="text-[11px] font-bold text-[#1C1917] dark:text-white flex items-center gap-1.5 py-1 px-3 rounded-full bg-black/5 dark:bg-[#222222] hover:bg-black/10 dark:hover:bg-white/20 border border-[#E6E2D8] dark:border-white/10 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles size={11} />
                Fördela automatiskt
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
                }
              }}
              className={`text-[11px] font-bold flex items-center gap-1.5 py-1 px-3 rounded-full border transition-all cursor-pointer active:scale-95 ${
                confirmReset 
                  ? "bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse" 
                  : "bg-white dark:bg-white/[0.03] border-[#E6E2D8] dark:border-white/[0.05] text-[#6E6961] dark:text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              <RotateCcw size={11} />
              {confirmReset ? "Klicka igen för att nollställa" : "Nollställ"}
            </button>
          </div>
        </div>

        {/* Continuous Category List */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6E6961] dark:text-[var(--text-secondary)] px-1 opacity-50 block">
            Kategorier ({config.categories?.length || 0})
          </span>
          
          <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#1C1C1C] shadow-none border-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {sortedCategoriesForManage.map((cat) => {
              const iconName = cat.icon;
              const Icon = ICON_MAP[iconName];
              const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
              const catBudget = Math.max(Number(cat.budget) || 0, fixedSpent);
              const isEditingThis = editingCategoryName === cat.name;

              return (
                <div 
                  key={cat.name}
                  className={`py-3 px-3.5 sm:px-4 transition-all flex items-center justify-between gap-3 ${
                    catBudget === 0 ? "opacity-75 hover:opacity-100" : "opacity-100"
                  }`}
                >
                  {/* Left: Icon, Name, Fixed text */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/[0.04] border border-[#E6E2D8] dark:border-white/[0.035] text-[#1C1917] dark:text-white flex items-center justify-center shrink-0">
                      {isEmojiString(iconName) ? (
                        <span className="text-sm leading-none">{iconName}</span>
                      ) : Icon ? (
                        <Icon size={15} strokeWidth={1.8} className="text-[#1C1917] dark:text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#1C1917] dark:bg-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] sm:text-[13.5px] font-semibold text-[#1C1917] dark:text-white truncate block tracking-tight">
                        {cat.name}
                      </span>
                      {fixedSpent > 0 && (
                        <span className="text-[11px] font-medium text-[#6E6961] dark:text-[#A8A8A8] opacity-80 block truncate mt-0.5">
                          {formatAmount(fixedSpent, config.language)} {curr} fast
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount + Minus/Plus OR "Ange budget" */}
                  <div className="flex items-center gap-2 shrink-0 select-none">
                    {catBudget > 0 ? (
                      <div className="flex items-center gap-1.5">
                        {/* Minus button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentAmount = Math.max(Number(cat.budget) || 0, fixedSpent);
                            const newAmount = Math.max(fixedSpent, currentAmount - 100);
                            const updatedCategories = (config.categories || []).map((c) => {
                              if (c.name === cat.name) {
                                return { ...c, budget: newAmount > 0 ? newAmount : undefined };
                              }
                              return c;
                            });
                            setConfig({ ...config, categories: updatedCategories });
                          }}
                          className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/[0.03] border border-[#E6E2D8] dark:border-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.07] text-[#1C1917] dark:text-[#A8A8A8] hover:text-black dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 text-xs font-bold"
                        >
                          −
                        </button>

                        {/* Direct editable amount or button */}
                        {isEditingThis ? (
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
                            className="w-20 h-7 px-1.5 rounded-lg bg-black/5 dark:bg-[#222222] border border-[#1C1917] dark:border-white text-center text-xs font-bold text-[#1C1917] dark:text-white font-amount tabular-nums outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryName(cat.name);
                              setInlineInputValue(catBudget > 0 ? String(catBudget) : "");
                            }}
                            className="px-2 py-1 rounded-lg transition-all text-xs font-bold font-amount tabular-nums text-center text-[#1C1917] dark:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] cursor-pointer"
                          >
                            {formatAmount(catBudget, config.language)} {curr}
                          </button>
                        )}

                        {/* Plus button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentAmount = Number(cat.budget) || 0;
                            const newAmount = currentAmount + 100;
                            const updatedCategories = (config.categories || []).map((c) => {
                              if (c.name === cat.name) {
                                return { ...c, budget: newAmount };
                              }
                              return c;
                            });
                            setConfig({ ...config, categories: updatedCategories });
                          }}
                          className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/[0.03] border border-[#E6E2D8] dark:border-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.07] text-[#1C1917] dark:text-[#A8A8A8] hover:text-black dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      isEditingThis ? (
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
                          className="w-24 h-7 px-1.5 rounded-lg bg-black/5 dark:bg-[#222222] border border-[#1C1917] dark:border-white text-center text-xs font-bold text-[#1C1917] dark:text-white font-amount tabular-nums outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategoryName(cat.name);
                            setInlineInputValue("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] text-[#1C1917] dark:text-white text-xs font-semibold border border-[#E6E2D8] dark:border-white/[0.06] transition-all cursor-pointer active:scale-95"
                        >
                          Ange budget
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save & Exit */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleCloseCategoryBudgets}
            className="w-full h-12 rounded-full bg-[#1C1917] text-white dark:bg-white dark:text-[#0B0A12] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
          >
            <Check size={14} strokeWidth={2.5} />
            Klar, spara budgeten
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
          subtitle={config?.language === 'en' ? 'Switch between fixed expenses, income and savings' : 'Växla mellan fasta utgifter, inkomster och sparande'}
          selectedId={budgetFilter}
          onSelect={(id) => setBudgetFilter(id as 'fixed' | 'income' | 'savings')}
          options={[
            {
              id: 'fixed',
              label: config?.language === 'en' ? 'Fixed expenses' : 'Fasta utgifter',
              subtitle: config?.language === 'en' ? 'Recurring rent, bills and subscriptions' : 'Återkommande hyra, räkningar och abonnemang',
              icon: <Calendar size={16} strokeWidth={2} />,
            },
            {
              id: 'income',
              label: config?.language === 'en' ? 'Income' : 'Inkomster',
              subtitle: config?.language === 'en' ? 'Salary, benefits and extra income' : 'Lön, bidrag och extra inkomster',
              icon: <ArrowDownLeft size={16} strokeWidth={2} />,
            },
            {
              id: 'savings',
              label: config?.language === 'en' ? 'Monthly savings' : 'Månadssparande',
              subtitle: config?.language === 'en' ? 'Savings goals and auto savings' : 'Målsparande och automatiskt sparande',
              icon: <PiggyBank size={16} strokeWidth={2} />,
            },
          ]}
        />
      </div>

      {/* Overview Hero Section - Dynamic based on filter */}
      <div className="py-2 text-center space-y-1 flex flex-col items-center select-none">
        <span className="text-[14px] font-medium text-[#6D6962] dark:text-[#A8A8A8] block leading-snug">
          {budgetFilter === 'fixed' && (config?.language === 'en' ? 'Total fixed expenses' : 'Totala fasta utgifter')}
          {budgetFilter === 'income' && (config?.language === 'en' ? 'Total income' : 'Totala inkomster')}
          {budgetFilter === 'savings' && (config?.language === 'en' ? 'Total savings' : 'Totalt sparande')}
        </span>
        <div className="flex items-baseline justify-center gap-1.5 mt-1">
          <AnimatedNumber 
            value={Math.round(
              budgetFilter === 'fixed' ? totalFixedSum :
              budgetFilter === 'income' ? totalIncomeSum :
              totalSavingsSum
            )} 
            className="text-[34px] sm:text-[38px] font-semibold leading-none font-amount tabular-nums tracking-tight text-[#1C1917] dark:text-white"
            formatter={(val) => {
              const prefix = budgetFilter === 'income' ? '+' : '−';
              return `${prefix}${formatAmount(val, config?.language)}`;
            }}
          />
          <span className="text-[18px] sm:text-[20px] font-normal leading-none text-[#6D6962] dark:text-[#A8A8A8]">
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
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-white dark:bg-[#1C1C1C] hover:bg-black/5 dark:hover:bg-[#241F32] border-none text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
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
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                {/* Single compact sort toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (fixedSortBy === 'day') setFixedSortBy('name');
                    else if (fixedSortBy === 'name') setFixedSortBy('amount');
                    else setFixedSortBy('day');
                  }}
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-white dark:bg-[#1C1C1C] hover:bg-black/5 dark:hover:bg-[#241F32] border-none text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
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
                <button 
                  type="button"
                  onClick={onAddFixedExpense} 
                  className="h-9 px-4 rounded-xl bg-[var(--accent-color)] hover:brightness-105 text-[var(--text-on-accent)] text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98] shadow-xs"
                >
                  <Plus size={14} strokeWidth={2.5} />
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
                      <span className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8]">
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
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                {/* Single compact sort toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (savingSortBy === 'day') setSavingSortBy('name');
                    else if (savingSortBy === 'name') setSavingSortBy('amount');
                    else setSavingSortBy('day');
                  }}
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-white dark:bg-[#1C1C1C] hover:bg-black/5 dark:hover:bg-[#241F32] border-none text-xs text-[var(--text-primary)] transition-all cursor-pointer select-none active:scale-[0.98] shadow-none"
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

                <button 
                  type="button"
                  onClick={onAddMonthlySaving} 
                  className="h-9 px-4 rounded-xl bg-[var(--accent-color)] hover:brightness-105 text-[var(--text-on-accent)] text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98] shadow-xs"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{t('newMonthlySaving')}</span>
                </button>
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
