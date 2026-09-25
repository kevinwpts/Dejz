import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { RefreshCw, ArrowLeft, Check, Trash2, SlidersHorizontal, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';
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
  isDemoMode,
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
  const _totalOut = (stats?.totalFixed || 0) + totalSavings;
  const _retentionRate = (stats?.totalIncome || 0) > 0 ? ((stats?.remainingPeriodCents || 0) / stats!.totalIncome) * 100 : 0;
  const _expensesPercent = (stats?.totalIncome || 0) > 0 ? ((stats?.totalFixed || 0) / stats!.totalIncome) * 100 : 0;
  const _savingsPercent = (stats?.totalIncome || 0) > 0 ? (totalSavings / stats!.totalIncome) * 100 : 0;

  // sortItems removed

  const sortedIncomes = incomes || [];
  const sortedFixedExpenses = fixedExpenses || [];
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

  const totalBudgetPot = Math.max(
    0,
    (stats?.disposablePot !== undefined && stats?.disposablePot !== null)
      ? stats.disposablePot
      : ((stats?.totalIncome || 0) - (stats?.totalFixed || 0) - totalSavings)
  );

  const getCategoryBudgetPct = (c: any): number => {
    if (c.budget === undefined || c.budget === null) return 0;
    if (c.budget > 100) {
      return totalBudgetPot > 0 ? Math.round((c.budget / totalBudgetPot) * 100) : 0;
    }
    return Math.max(0, Math.min(100, Math.round(Number(c.budget) || 0)));
  };

  const getCategoryBudgetKr = (c: any): number => {
    const pct = getCategoryBudgetPct(c);
    return totalBudgetPot > 0 ? Math.round((pct / 100) * totalBudgetPot) : 0;
  };

  const totalAllocatedPercentage = (config.categories || []).reduce((sum, c) => {
    return sum + getCategoryBudgetPct(c);
  }, 0);

  const totalAllocatedKronor = totalBudgetPot > 0 
    ? Math.round((totalAllocatedPercentage / 100) * totalBudgetPot) 
    : 0;

  const remainingPercentage = 100 - totalAllocatedPercentage;
  const remainingToAllocate = totalBudgetPot - totalAllocatedKronor;

  const handleDistributeEvenly = () => {
    const categories = config.categories || [];
    if (categories.length === 0) return;

    // Distribute 100% evenly across categories
    const count = categories.length;
    const basePct = Math.floor(100 / count);
    const remainder = 100 - (basePct * count);

    const updatedCategories = categories.map((c, idx) => ({
      ...c,
      budget: basePct + (idx === 0 ? remainder : 0),
    }));

    setConfig({ ...config, categories: updatedCategories });
  };

  if (!stats) return null;

  if (showCategoryBudgets) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleCloseCategoryBudgets}
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

        {/* Sticky Budget Distribution Hub */}
        <div className={`sticky ${
          isDemoMode 
            ? 'top-[calc(7.2rem+env(safe-area-inset-top)+12px)]' 
            : 'top-[calc(5rem+env(safe-area-inset-top)+12px)]'
        } z-20 p-4 sm:p-5 rounded-[22px] border border-[var(--border-color)] bg-[var(--surface-color)]/95 backdrop-blur-md shadow-sm space-y-3`}>
          {/* Main Key Figures */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">
                Kvar att fördela
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-extrabold font-amount tabular-nums tracking-tight ${
                  remainingPercentage < 0 
                    ? 'text-rose-500' 
                    : remainingPercentage === 0 
                    ? 'text-emerald-500' 
                    : 'text-[var(--accent-color)]'
                }`}>
                  {remainingPercentage < 0 ? `+${Math.abs(remainingPercentage)}%` : `${remainingPercentage}%`}
                </span>
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] tabular-nums">
                  ({formatAmount(Math.abs(remainingToAllocate), config.language)} {config.currency})
                </span>
                {remainingPercentage < 0 && (
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tight bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                    överfördelat
                  </span>
                )}
                {remainingPercentage === 0 && (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                    100% klart
                  </span>
                )}
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">
                Vardagsbudget
              </span>
              <span className="text-[14px] sm:text-[15px] font-bold text-[var(--text-primary)] font-amount tabular-nums">
                {formatAmount(totalBudgetPot, config.language)} {config.currency}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                Fördelat: <strong className="text-[var(--text-primary)] font-bold">{totalAllocatedPercentage}%</strong> ({formatAmount(totalAllocatedKronor, config.language)} kr)
              </span>
            </div>
          </div>

          {/* Multi-colored Category Segment Bar */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-[var(--border-color)]/50 rounded-full overflow-hidden flex shadow-inner">
              {(config.categories || [])
                .filter((c) => getCategoryBudgetPct(c) > 0)
                .map((c) => {
                  const pct = getCategoryBudgetPct(c);
                  const amount = getCategoryBudgetKr(c);
                  return (
                    <div
                      key={c.name}
                      title={`${c.name}: ${pct}% (${formatAmount(amount, config.language)} kr)`}
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: c.color || '#94a3b8',
                      }}
                      className="h-full transition-all duration-200 border-r border-black/10 last:border-r-0"
                    />
                  );
                })}
            </div>
          </div>

          {/* Smart Quick Actions */}
          <div className="flex items-center justify-between pt-0.5 gap-2 border-t border-[var(--border-color)]/40">
            <button
              type="button"
              onClick={handleDistributeEvenly}
              className="text-[11.5px] font-semibold text-[var(--accent-color)] hover:opacity-85 flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[var(--accent-color)]/10 transition-all cursor-pointer"
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
              className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-rose-500 flex items-center gap-1 py-1 px-2 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              Nollställ
            </button>
          </div>
        </div>

        {/* Compact list of categories */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[12.5px] font-bold text-[var(--text-primary)] tracking-tight">
              Kategorier ({config.categories?.length || 0})
            </h3>
            <span className="text-[11px] text-[var(--text-secondary)]">
              Anpassas automatiskt efter inkomst och fasta utgifter
            </span>
          </div>
          
          <div className="space-y-2.5">
            {[...(config.categories || [])]
              .sort((a, b) => {
                const indexA = initialCategoryNames.indexOf(a.name);
                const indexB = initialCategoryNames.indexOf(b.name);
                if (indexA !== -1 && indexB !== -1) {
                  return indexA - indexB;
                }
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
                  className="p-3 sm:p-3.5 rounded-[18px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-3xs flex flex-col gap-2 transition-all hover:border-[var(--border-color)]/80"
                >
                  {/* Top Row: Icon, Name, Calculated Kronor and % Input */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-3xs text-[15px]"
                        style={{ backgroundColor: cat.color || '#94a3b8' }}
                      >
                        {isEmojiString(iconName) ? (
                          <span className="leading-none">{iconName}</span>
                        ) : Icon ? (
                          <Icon size={16} strokeWidth={2} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[13px] sm:text-[13.5px] font-bold text-[var(--text-primary)] tracking-tight truncate block">
                          {cat.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[13px] font-bold font-amount tabular-nums text-[var(--text-primary)]">
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
                          className="w-full h-8 px-2 rounded-[10px] bg-[var(--surface-muted)]/70 border border-[var(--border-color)] text-[12.5px] font-bold text-[var(--text-primary)] text-right pr-5 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] tabular-nums"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--text-secondary)] pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Percentage Slider Control */}
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
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--accent-color)] focus:outline-none bg-[var(--border-color)]/60"
                      style={{
                        backgroundImage: `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${catPct}%, var(--border-color) ${catPct}%, var(--border-color) 100%)`
                      }}
                    />
                  </div>

                  {/* Context note: variable spent or fixed bills */}
                  {(fixedSpent > 0 || variableSpent > 0) && (
                    <div className="flex items-center justify-between text-[10.5px] text-[var(--text-secondary)] px-0.5 opacity-75">
                      {variableSpent > 0 ? (
                        <span>Spenderat: <strong className="text-[var(--text-primary)] font-semibold">{formatAmount(variableSpent, config.language)} kr</strong></span>
                      ) : <span />}
                      {fixedSpent > 0 && (
                        <span>(Fasta räkningar: {formatAmount(fixedSpent, config.language)} kr)</span>
                      )}
                    </div>
                  )}
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
          className="p-5 sm:p-6 rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-sm flex flex-col items-center text-center"
        >
          <span className="text-xs font-semibold text-[var(--text-secondary)] opacity-85 mb-2 block">
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
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">{t('fixedExpenses') || 'Fasta utgifter'}</span>
            <span className="text-[15px] sm:text-[17px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">-{formatAmount(Math.abs(stats.totalFixed || 0), config.language)} {config.currency || 'kr'}</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">{t('incomes') || 'Inkomster'}</span>
            <span className="text-[15px] sm:text-[17px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">+{formatAmount(Math.abs(stats.totalIncome || 0), config.language)} {config.currency || 'kr'}</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-2xs border border-[var(--border-color)] bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] tracking-tight text-center truncate w-full">{t('monthlySavings') || 'Månadssparande'}</span>
          </motion.div>
        </div>

        {/* Quick Action to Allocate Everyday Budget */}
        <button
          type="button"
          onClick={handleOpenCategoryBudgets}
          className="w-full p-3.5 sm:p-4 rounded-[22px] border border-[var(--border-color)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)]/50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center transition-transform group-hover:scale-105">
              <SlidersHorizontal size={20} strokeWidth={2} />
            </div>
            <div className="text-left">
              <span className="text-[13.5px] font-bold text-[var(--text-primary)] block">
                {config.language === 'en' ? 'Allocate everyday budget' : 'Fördela din vardagsbudget'}
              </span>
              <span className="text-[11.5px] text-[var(--text-secondary)] font-medium">
                {config.language === 'en' ? 'Set percentage or amount per category' : 'Sätt gränser och fördela per kategori'}
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* Budget Filter Segmented Control */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-full shadow-xs">
        <button
          onClick={() => setBudgetFilter('fixed')}
          className={`h-10 sm:h-11 rounded-full text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center px-2 ${
            budgetFilter === 'fixed'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('fixedExpenses' as TranslationKey) || 'Fasta utgifter'}
        </button>
        <button
          onClick={() => setBudgetFilter('income')}
          className={`h-10 sm:h-11 rounded-full text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center px-2 ${
            budgetFilter === 'income'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('incomes' as TranslationKey) || 'Inkomster'}
        </button>
        <button
          onClick={() => setBudgetFilter('savings')}
          className={`h-10 sm:h-11 rounded-full text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center px-2 ${
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
