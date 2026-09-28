import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { RefreshCw, Check, Sparkles, RotateCcw, Plus, Pin, ChevronUp, ChevronDown, Calendar, ArrowDownLeft, PiggyBank, ArrowUpDown } from 'lucide-react';
import { ICON_MAP, isEmojiString } from '../utils/icons';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey, Language } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
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
  const [editingCategoryName, setEditingCategoryName] = React.useState<string | null>(null);
  const [inlineInputValue, setInlineInputValue] = React.useState<string>("");
  const [budgetFilter, setBudgetFilter] = React.useState<'fixed' | 'income' | 'savings'>('fixed');
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
    const list = [...(config?.monthlySavingsItems || [])];
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
  }, [config?.monthlySavingsItems, savingSortBy]);

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

  const totalSavingsSum = (config.monthlySavingsItems?.reduce((sum, item) => {
    const amount = (item.isVariable && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined)
      ? item.periodOverrides[currentPeriodId]
      : (Number(item.amount) || 0);
    return sum + amount;
  }, 0) || 0) + (Number(config.monthlySavings) || 0);

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

  


  const togglePinCategory = (categoryName: string) => {
    const cats = config.categories || [];
    const target = cats.find(c => c.name === categoryName);
    if (!target) return;

    const isPinned = !target.pinned;
    
    let nextOrder = 0;
    if (isPinned) {
      const pinnedCats = cats.filter(c => c.pinned);
      nextOrder = pinnedCats.length > 0 ? Math.max(...pinnedCats.map(c => c.pinOrder || 0)) + 1 : 0;
    }

    const updated = cats.map(c => {
      if (c.name === categoryName) {
        return { ...c, pinned: isPinned, pinOrder: isPinned ? nextOrder : undefined };
      }
      return c;
    });

    setConfig({ ...config, categories: updated });
  };

  const movePinnedCategory = (categoryName: string, direction: "up" | "down") => {
    const cats = [...(config.categories || [])];
    const pinnedCats = cats
      .filter(c => c.pinned)
      .sort((a, b) => (a.pinOrder || 0) - (b.pinOrder || 0));

    const index = pinnedCats.findIndex(c => c.name === categoryName);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const current = pinnedCats[index];
      const prev = pinnedCats[index - 1];
      const tempOrder = current.pinOrder || 0;
      current.pinOrder = prev.pinOrder || 0;
      prev.pinOrder = tempOrder;
    } else if (direction === "down" && index < pinnedCats.length - 1) {
      const current = pinnedCats[index];
      const next = pinnedCats[index + 1];
      const tempOrder = current.pinOrder || 0;
      current.pinOrder = next.pinOrder || 0;
      next.pinOrder = tempOrder;
    }

    const updated = cats.map(c => {
      const match = pinnedCats.find(p => p.name === c.name);
      if (match) {
        return { ...c, pinned: true, pinOrder: match.pinOrder };
      }
      return c;
    });

    setConfig({ ...config, categories: updated });
  };

  const sortedCategoriesForManage = [...(config.categories || [])].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      return (a.pinOrder || 0) - (b.pinOrder || 0);
    }

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
                  <span className="text-rose-600 dark:text-rose-400">{formatAmount(totalAllocated, config.language)} kr</span>
                  <span className="text-[#6E6961] dark:text-white/60 text-lg sm:text-xl font-medium"> fördelat av </span>
                  <span>{formatAmount(totalIncomeSum, config.language)} kr</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatAmount(totalAllocated, config.language)} kr</span>
                  <span className="text-[#6E6961] dark:text-white/60 text-lg sm:text-xl font-medium"> fördelat av </span>
                  <span>{formatAmount(totalIncomeSum, config.language)} kr</span>
                </>
              )}
            </div>
            {isOverAllocated ? (
              <span className="text-xs font-semibold tracking-wide text-rose-600 dark:text-rose-400 block mt-1">
                ⚠️ Du har fördelat {formatAmount(Math.abs(remainingToAllocate), config.language)} kr mer än din inkomst ({formatAmount(totalIncomeSum, config.language)} kr)
              </span>
            ) : (
              <span className="text-xs font-semibold tracking-wide text-emerald-600 dark:text-emerald-400 block mt-1">
                ✓ {formatAmount(remainingToAllocate, config.language)} kr kvar att fördela av din inkomst ({formatAmount(totalIncomeSum, config.language)} kr)
              </span>
            )}
          </div>

          {/* Simple progress bar */}
          <div className="w-full h-1.5 bg-black/5 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isOverAllocated ? "bg-rose-500" : "bg-emerald-600 dark:bg-emerald-400"
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
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-white flex items-center gap-1.5 py-1 px-3 rounded-full bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-500/15 transition-all cursor-pointer active:scale-95"
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
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6E6961] dark:text-[var(--text-secondary)] px-1 opacity-60 block">
            Kategorier ({config.categories?.length || 0})
          </span>
          
          <div className="overflow-hidden border border-[#E6E2D8] dark:border-white/[0.04] rounded-[22px] bg-[#FFFFFF] dark:bg-[#2b2b2b] shadow-xs dark:shadow-none divide-y divide-[#EDE9DF] dark:divide-white/[0.04]">
            {sortedCategoriesForManage.map((cat) => {
              const iconName = cat.icon;
              const Icon = ICON_MAP[iconName];
              const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
              const catBudget = Math.max(Number(cat.budget) || 0, fixedSpent);
              const isEditingThis = editingCategoryName === cat.name;

              return (
                <div 
                  key={cat.name}
                  className={`p-4 transition-all flex flex-col gap-3 ${
                    catBudget === 0 ? "opacity-65 hover:opacity-100" : "opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    {/* Left: Icon & Name & Fixed label */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Pin button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinCategory(cat.name);
                        }}
                        className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer flex items-center justify-center shrink-0 ${
                          cat.pinned 
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" 
                            : "bg-black/5 dark:bg-white/[0.02] text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white border border-transparent hover:border-[#E6E2D8] dark:hover:border-white/[0.05]"
                        }`}
                        title={cat.pinned ? "Avfäst från Hem" : "Fäst på Hem"}
                      >
                        <Pin size={12} className={cat.pinned ? "fill-emerald-600 dark:fill-emerald-400" : ""} />
                      </button>

                      {/* Reorder up/down buttons */}
                      {cat.pinned && (
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePinnedCategory(cat.name, "up");
                            }}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/[0.06] text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white transition-all cursor-pointer active:scale-75"
                          >
                            <ChevronUp size={11} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePinnedCategory(cat.name, "down");
                            }}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/[0.06] text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white transition-all cursor-pointer active:scale-75"
                          >
                            <ChevronDown size={11} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}

                      <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/[0.04] border border-[#E6E2D8] dark:border-white/[0.035] text-[#1C1917] dark:text-white flex items-center justify-center shrink-0">
                        {isEmojiString(iconName) ? (
                          <span className="text-base leading-none">{iconName}</span>
                        ) : Icon ? (
                          <Icon size={16} strokeWidth={1.8} className="text-[#1C1917] dark:text-white" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[#1C1917] dark:bg-white" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[13.5px] font-semibold text-[#1C1917] dark:text-white truncate block tracking-tight">
                          {cat.name}
                        </span>
                        {fixedSpent > 0 && (
                          <span className="text-[11px] font-medium text-[#6E6961] dark:text-[#9CA6BC] opacity-80 block truncate mt-0.5">
                            {formatAmount(fixedSpent, config.language)} kr fast
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Plus, Minus, and Editable/Tappable amount */}
                    <div className="flex items-center gap-2.5 shrink-0 select-none">
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
                        className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/[0.03] border border-[#E6E2D8] dark:border-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.07] text-[#1C1917] dark:text-[#9CA6BC] hover:text-black dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 text-lg font-bold"
                      >
                        −
                      </button>

                      {/* Tappable/Editable amount in the middle */}
                      <div className="w-24 flex justify-center items-center">
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
                            className="w-full h-8 px-1.5 rounded-lg bg-white dark:bg-white/[0.08] border border-emerald-500 text-center text-xs font-bold text-[#1C1917] dark:text-white font-amount tabular-nums outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryName(cat.name);
                              setInlineInputValue(catBudget > 0 ? String(catBudget) : "");
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold font-amount tabular-nums text-center w-full hover:bg-black/5 dark:hover:bg-white/[0.05] cursor-pointer ${
                              catBudget > 0 
                                ? "bg-black/5 dark:bg-white/[0.04] text-[#1C1917] dark:text-white border-[#E6E2D8] dark:border-white/[0.06]" 
                                : "bg-transparent text-[#6E6961] dark:text-[var(--text-secondary)] opacity-60 border-transparent hover:border-[#E6E2D8] dark:hover:border-white/[0.04]"
                            }`}
                          >
                            {catBudget > 0 ? `${formatAmount(catBudget, config.language)} kr` : "Ange budget"}
                          </button>
                        )}
                      </div>

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
                        className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/[0.03] border border-[#E6E2D8] dark:border-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.07] text-[#1C1917] dark:text-[#9CA6BC] hover:text-black dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
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
      {/* Budget Filter Segmented Control */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        <button
          onClick={() => setBudgetFilter('fixed')}
          className={`flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            budgetFilter === 'fixed'
              ? 'bg-[#05b862] text-white font-semibold border-transparent shadow-xs'
              : 'text-[#6E6961] hover:text-[#1C1917] hover:bg-black/5 dark:text-[#9CA6BC] dark:hover:text-[#C7CDDC] dark:hover:bg-white/[0.03]'
          }`}
        >
          <Calendar size={13} />
          {t('fixedExpenses' as TranslationKey) || 'Fasta utgifter'}
        </button>
        <button
          onClick={() => setBudgetFilter('income')}
          className={`flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            budgetFilter === 'income'
              ? 'bg-[#05b862] text-white font-semibold border-transparent shadow-xs'
              : 'text-[#6E6961] hover:text-[#1C1917] hover:bg-black/5 dark:text-[#9CA6BC] dark:hover:text-[#C7CDDC] dark:hover:bg-white/[0.03]'
          }`}
        >
          <ArrowDownLeft size={13} />
          {t('incomes' as TranslationKey) || 'Inkomster'}
        </button>
        <button
          onClick={() => setBudgetFilter('savings')}
          className={`flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            budgetFilter === 'savings'
              ? 'bg-[#05b862] text-white font-semibold border-transparent shadow-xs'
              : 'text-[#6E6961] hover:text-[#1C1917] hover:bg-black/5 dark:text-[#9CA6BC] dark:hover:text-[#C7CDDC] dark:hover:bg-white/[0.03]'
          }`}
        >
          <PiggyBank size={13} />
          {t('monthlySavings' as TranslationKey) || 'Sparande'}
        </button>
      </div>

      {/* Overview Hero Section - Dynamic based on filter */}
      <div className="py-2 text-center space-y-1.5 flex flex-col items-center">
        <span className="text-[13px] sm:text-[14px] font-bold uppercase tracking-[0.08em] text-[#6E6961] dark:text-[#9CA6BC] block select-none font-display">
          {budgetFilter === 'fixed' && (config?.language === 'en' ? 'TOTAL FIXED EXPENSES' : 'TOTALA FASTA UTGIFTER')}
          {budgetFilter === 'income' && (config?.language === 'en' ? 'TOTAL INCOME' : 'TOTALA INKOMSTER')}
          {budgetFilter === 'savings' && (config?.language === 'en' ? 'TOTAL SAVINGS' : 'TOTALT SPARANDE')}
        </span>
        <div className="flex items-baseline justify-center gap-2">
          <AnimatedNumber 
            value={Math.round(
              budgetFilter === 'fixed' ? totalFixedSum :
              budgetFilter === 'income' ? totalIncomeSum :
              totalSavingsSum
            )} 
            className={`text-[44px] sm:text-[54px] leading-none font-bold font-amount tabular-nums tracking-normal ${
              budgetFilter === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#1C1917] dark:text-white'
            }`}
            formatter={(val) => {
              const prefix = budgetFilter === 'income' ? '+' : '−';
              return `${prefix}${formatAmount(val, config?.language)}`;
            }}
          />
          <span className={`text-[19px] sm:text-[21px] font-semibold ${
            budgetFilter === 'income' ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-[#8C867C] dark:text-[#9CA6BC]'
          }`}>
            {config?.currency}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.04] hover:bg-black/5 dark:hover:bg-white/[0.07] border border-[#E6E2D8] dark:border-white/[0.035] text-xs text-[#1C1917] dark:text-white transition-all cursor-pointer select-none active:scale-95"
                  title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                >
                  <ArrowUpDown size={12} strokeWidth={2} className="text-[#05b862] shrink-0" />
                  <span className="text-[#6E6961] dark:text-[#9CA6BC]/80">
                    {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                  </span>
                  <span className="font-semibold text-[#1C1917] dark:text-white">
                    {incomeSortBy === 'day' 
                      ? (config.language === 'en' ? 'Day' : 'Ankomstdag')
                      : incomeSortBy === 'name'
                      ? (config.language === 'en' ? 'Name' : 'Namn')
                      : (config.language === 'en' ? 'Amount' : 'Belopp')
                    }
                  </span>
                </button>
                <button 
                  onClick={onAddIncome} 
                  className="text-xs font-medium text-emerald-600 dark:text-[#05b862] hover:text-emerald-800 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-1"
                >
                  <Plus size={14} strokeWidth={2} />
                  <span>{t('newIncome')}</span>
                </button>
              </div>

              {sortedIncomes.length > 0 ? (
                <div className="bg-[#FFFFFF] dark:bg-white/[0.035] rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.025] divide-y divide-[#EDE9DF] dark:divide-white/[0.035] overflow-hidden">
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
                {/* Single compact sort toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (fixedSortBy === 'day') setFixedSortBy('name');
                    else if (fixedSortBy === 'name') setFixedSortBy('amount');
                    else setFixedSortBy('day');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.04] hover:bg-black/5 dark:hover:bg-white/[0.07] border border-[#E6E2D8] dark:border-white/[0.035] text-xs text-[#1C1917] dark:text-white transition-all cursor-pointer select-none active:scale-95"
                  title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                >
                  <ArrowUpDown size={12} strokeWidth={2} className="text-[#05b862] shrink-0" />
                  <span className="text-[#6E6961] dark:text-[#9CA6BC]/80">
                    {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                  </span>
                  <span className="font-semibold text-[#1C1917] dark:text-white">
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
                  className="text-xs font-medium text-emerald-600 dark:text-[#05b862] hover:text-emerald-800 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-1"
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
                      <span className="text-xs font-medium text-[#6E6961] dark:text-[#9CA6BC]">
                        {Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq) 
                          ? t(`freq_${Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq)!.toLowerCase()}` as TranslationKey)
                          : freq}
                      </span>
                    </div>
                    <div className="bg-[#FFFFFF] dark:bg-white/[0.035] rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.025] divide-y divide-[#EDE9DF] dark:divide-white/[0.035] overflow-hidden">
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
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                {/* Single compact sort toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (savingSortBy === 'day') setSavingSortBy('name');
                    else if (savingSortBy === 'name') setSavingSortBy('amount');
                    else setSavingSortBy('day');
                  }}
                  title={config.language === 'en' ? 'Click to change sort order' : 'Klicka för att ändra sortering'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.04] hover:bg-black/5 dark:hover:bg-white/[0.07] border border-[#E6E2D8] dark:border-white/[0.035] text-xs text-[#1C1917] dark:text-white transition-all cursor-pointer select-none active:scale-95"
                >
                  <ArrowUpDown size={12} strokeWidth={2} className="text-[#05b862] shrink-0" />
                  <span className="text-[#6E6961] dark:text-[#9CA6BC]/80">
                    {config.language === 'en' ? 'Sort:' : 'Sortera:'}
                  </span>
                  <span className="font-semibold text-[#1C1917] dark:text-white">
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
                  className="text-xs font-medium text-emerald-600 dark:text-[#05b862] hover:text-emerald-800 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 py-1 px-1"
                >
                  <Plus size={14} strokeWidth={2} />
                  <span>{t('newMonthlySaving')}</span>
                </button>
              </div>

              {sortedSavings.length > 0 ? (
                <div className="bg-[#FFFFFF] dark:bg-white/[0.035] rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.025] divide-y divide-[#EDE9DF] dark:divide-white/[0.035] overflow-hidden">
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
                  className="w-full bg-[#FFFFFF] dark:bg-white/[0.04] p-4 sm:p-5 rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.025] hover:bg-[#EDE9DF] dark:hover:bg-white/[0.06] transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/[0.04] border border-[#E6E2D8] dark:border-white/[0.035] flex items-center justify-center text-[#6E6961] dark:text-[#C7CDDC] shrink-0">
                      <RefreshCw size={17} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1C1917] dark:text-white tracking-tight leading-tight">
                        Migrera månadssparande
                      </p>
                      <p className="text-xs font-normal text-[#6E6961] dark:text-[#9CA6BC] mt-1">
                        Lägg till sparande på <span className="font-amount tabular-nums font-semibold text-[#1C1917] dark:text-white">{formatAmount(config.monthlySavings)}</span> <span className="text-xs text-[#6E6961] dark:text-[#9CA6BC]">{config.currency}</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-7 px-3 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-[#05b862]/[0.16] dark:text-white dark:border-[#05b862]/30 text-xs font-medium shrink-0 ml-3 flex items-center justify-center">
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
