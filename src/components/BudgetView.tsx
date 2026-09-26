import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { RefreshCw, ArrowLeft, Check, Trash2, Sparkles, RotateCcw, Plus } from 'lucide-react';
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
      case 'quarterly': return sum + amount / 3;
      case 'semi-annually': return sum + amount / 6;
      case 'annually': return sum + amount / 12;
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
  const [editingCategory, setEditingCategory] = React.useState<any | null>(null);
  const [editAmountText, setEditAmountText] = React.useState<string>('');

  // Legacy Percentage Normalization on Open
  React.useEffect(() => {
    if (showCategoryBudgets && config.categories && config.categories.length > 0) {
      const budgetValues = config.categories.map((c) => Number(c.budget) || 0);
      const totalSum = budgetValues.reduce((a, b) => a + b, 0);
      const maxVal = Math.max(...budgetValues, 0);

      // If budgets look like legacy percentages (max <= 100 and sum <= 100) and everydayBudget > 500, convert to SEK
      if (maxVal <= 100 && totalSum <= 100 && totalSum > 0 && everydayBudget > 500) {
        const normalized = config.categories.map((c) => {
          if (!c.budget || Number(c.budget) <= 0) return { ...c, budget: undefined };
          const converted = Math.round((everydayBudget * Number(c.budget)) / 100);
          return { ...c, budget: converted > 0 ? converted : undefined };
        });
        setConfig({ ...config, categories: normalized });
      }
    }
  }, [showCategoryBudgets, everydayBudget]);

  const totalAllocated = (config.categories || []).reduce((sum, c) => {
    const val = Number(c.budget) || 0;
    return sum + (val > 0 ? val : 0);
  }, 0);

  const remainingToAllocate = everydayBudget - totalAllocated;
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
    if (!isOverAllocated || totalAllocated <= 0 || everydayBudget <= 0) return;
    const ratio = everydayBudget / totalAllocated;

    const updated = (config.categories || []).map((c) => {
      if (!c.budget || Number(c.budget) <= 0) return c;
      const scaled = Math.round((Number(c.budget) * ratio) / 50) * 50;
      return { ...c, budget: scaled > 0 ? scaled : undefined };
    });

    setConfig({ ...config, categories: updated });
  };

  const handleOpenEditCategoryModal = (cat: any) => {
    setEditingCategory(cat);
    setEditAmountText(cat.budget && Number(cat.budget) > 0 ? String(Number(cat.budget)) : '');
  };

  const handleSaveCategoryBudget = (newAmount?: number) => {
    if (!editingCategory) return;
    const finalAmount = newAmount !== undefined ? newAmount : (Number(editAmountText.replace(/\s/g, '')) || 0);

    const updatedCategories = (config.categories || []).map((c) => {
      if (c.name === editingCategory.name) {
        return { ...c, budget: finalAmount > 0 ? finalAmount : undefined };
      }
      return c;
    });

    setConfig({ ...config, categories: updatedCategories });
    setEditingCategory(null);
  };

  if (showCategoryBudgets) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-5 font-sans"
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

        {/* Concept & Hero Allocation Summary Card */}
        <div className="bg-[var(--surface-color)] dark:bg-white/[0.025] backdrop-blur-[18px] border border-[var(--border-color)]/60 dark:border-white/[0.025] rounded-[24px] p-5 space-y-4 shadow-none">
          <p className="text-xs text-[var(--text-secondary)] opacity-85 leading-relaxed border-b border-[var(--border-color)]/30 dark:border-white/[0.035] pb-3">
            Dejz har redan räknat bort dina fasta kostnader ({formatAmount(totalFixedSum, config.language)} kr). Nu bestämmer du hur du vill fördela din kvarvarande <span className="font-semibold text-[var(--text-primary)]">vardagsbudget</span>.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center sm:text-left">
            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block opacity-70 mb-0.5">
                Vardagsbudget
              </span>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-amount tabular-nums">
                {formatAmount(everydayBudget, config.language)} kr
              </span>
            </div>

            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block opacity-70 mb-0.5">
                Fördelat
              </span>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-amount tabular-nums">
                {formatAmount(totalAllocated, config.language)} kr
              </span>
            </div>

            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block opacity-70 mb-0.5">
                {isOverAllocated ? 'Överfördelat' : 'Kvar att fördela'}
              </span>
              <span className={`text-base sm:text-lg font-bold font-amount tabular-nums ${
                isOverAllocated ? 'text-rose-400' : remainingToAllocate === 0 ? 'text-[#8B9CFF]' : 'text-emerald-400'
              }`}>
                {formatAmount(Math.abs(remainingToAllocate), config.language)} kr
              </span>
            </div>
          </div>

          {/* Simple Secondary Progress Bar */}
          <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isOverAllocated ? 'bg-rose-500' : 'bg-[var(--accent-color)] dark:bg-[#8B9CFF]'
              }`}
              style={{ width: `${Math.min(100, Math.round((totalAllocated / (everydayBudget || 1)) * 100))}%` }}
            />
          </div>

          {/* Secondary Quick Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/30 dark:border-white/[0.035] gap-2">
            <button
              type="button"
              onClick={handleAutoDistribute}
              className="text-xs font-semibold text-[#8B9CFF] hover:text-white flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#818cf8]/[0.12] transition-all cursor-pointer active:scale-95"
            >
              <Sparkles size={13} />
              Fördela automatiskt
            </button>

            <button
              type="button"
              onClick={() => {
                const updatedCategories = (config.categories || []).map((c) => ({ ...c, budget: undefined }));
                setConfig({ ...config, categories: updatedCategories });
              }}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-rose-400 flex items-center gap-1 py-1 px-2.5 transition-colors cursor-pointer opacity-80"
            >
              <RotateCcw size={12} />
              Nollställ
            </button>
          </div>
        </div>

        {/* Over-allocation Notice Banner if budget decreased */}
        {isOverAllocated && (
          <div className="p-3.5 rounded-[20px] bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-rose-400 shrink-0">⚠️</span>
              <p className="leading-tight">
                Din vardagsbudget har minskat. Justera dina kategorier med <span className="font-bold">{formatAmount(Math.abs(remainingToAllocate))} kr</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAutoAdaptDown}
              className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-[11px] shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              Anpassa automatiskt
            </button>
          </div>
        )}

        {/* Clean Continuous Category List */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] px-1.5 opacity-60 block">
            Kategorier ({config.categories?.length || 0})
          </span>
          
          <div className="overflow-hidden border border-[var(--border-color)]/60 dark:border-white/[0.025] rounded-[24px] bg-[var(--surface-color)] dark:bg-white/[0.025] backdrop-blur-[18px] shadow-none divide-y divide-[var(--border-color)]/30 dark:divide-white/[0.025]">
            {[...(config.categories || [])]
              .map((cat) => {
                const iconName = cat.icon;
                const Icon = ICON_MAP[iconName];
                const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
                const catBudget = Number(cat.budget) || 0;

                return (
                  <div 
                    key={cat.name}
                    onClick={() => handleOpenEditCategoryModal(cat)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[var(--surface-muted)]/50 dark:hover:bg-white/[0.03] transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    {/* Left: Icon & Name & Discrete Fixed Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] dark:bg-white/[0.04] border border-[var(--border-color)]/30 dark:border-white/[0.035] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                        {isEmojiString(iconName) ? (
                          <span className="text-base leading-none">{iconName}</span>
                        ) : Icon ? (
                          <Icon size={16} strokeWidth={1.8} className="text-[var(--text-primary)]" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[var(--text-primary)]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate block tracking-tight">
                          {cat.name}
                        </span>
                        {fixedSpent > 0 ? (
                          <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-70 block truncate">
                            Fasta kostnader: {formatAmount(fixedSpent, config.language)} kr · Redan avräknat
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-50 block truncate">
                            Rörlig vardagsbudget
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Budgeted Amount Pill */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-3 py-1.5 rounded-xl border transition-all text-xs font-bold font-amount tabular-nums flex items-center gap-1 ${
                        catBudget > 0 
                          ? 'bg-[var(--surface-muted)] dark:bg-white/[0.08] text-[var(--text-primary)] border-[var(--border-color)] dark:border-white/[0.08] group-hover:border-[var(--accent-color)]/50' 
                          : 'bg-transparent text-[var(--text-secondary)] opacity-50 border-transparent group-hover:opacity-80'
                      }`}>
                        <span>{catBudget > 0 ? `${formatAmount(catBudget, config.language)} kr` : '0 kr'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Bottom Save & Exit Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm("Är du säker på att du vill nollställa all kategoribudgetering?")) {
                const updatedCategories = (config.categories || []).map((c) => ({ ...c, budget: undefined }));
                setConfig({ ...config, categories: updatedCategories });
              }
            }}
            className="w-full h-11 rounded-full border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Trash2 size={14} />
            Nollställ all budgetering
          </button>
          
          <button
            type="button"
            onClick={handleCloseCategoryBudgets}
            className="w-full h-11 rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
          >
            <Check size={14} strokeWidth={2.5} />
            Spara och gå tillbaka
          </button>
        </div>

        {/* Modal for Editing Individual Category Budget */}
        <AnimatePresence>
          {editingCategory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-[28px] p-5 space-y-5 shadow-2xl relative"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    {isEmojiString(editingCategory.icon) ? (
                      <span className="text-lg">{editingCategory.icon}</span>
                    ) : ICON_MAP[editingCategory.icon] ? (
                      React.createElement(ICON_MAP[editingCategory.icon], { size: 18, strokeWidth: 2 })
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[var(--text-primary)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-[var(--text-primary)] truncate">
                      Budget för {editingCategory.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] opacity-80">
                      Anges i kronor per månad
                    </p>
                  </div>
                </div>

                {getFixedSpentForCategory(editingCategory.name) > 0 && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)]/40 text-xs text-[var(--text-secondary)] leading-relaxed">
                    ℹ️ Fasta kostnader på <span className="font-bold text-[var(--text-primary)]">{formatAmount(Math.round(getFixedSpentForCategory(editingCategory.name)))} kr</span> är redan avräknade. Här sätter du enbart extra rörliga pengar.
                  </div>
                )}

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] opacity-60 block px-1">
                    Snabblänkar
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[500, 1000, 2000, 3000, 0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSaveCategoryBudget(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                          (Number(editAmountText) || 0) === preset
                            ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                            : 'bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)]/50 hover:border-[var(--border-color)]'
                        }`}
                      >
                        {preset === 0 ? '0 kr' : `+${formatAmount(preset)} kr`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct SEK Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] opacity-60 block px-1">
                    Ange belopp (kr)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      placeholder="0"
                      autoFocus
                      value={editAmountText}
                      onChange={(e) => setEditAmountText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCategoryBudget();
                      }}
                      className="w-full h-12 px-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)] focus:border-[var(--accent-color)] text-base font-bold text-[var(--text-primary)] font-amount tabular-nums outline-none transition-all"
                    />
                    <span className="absolute right-4 text-sm font-semibold text-[var(--text-secondary)] pointer-events-none">
                      kr
                    </span>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveCategoryBudget()}
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent-color)] text-[var(--text-on-accent)] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    Spara
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
