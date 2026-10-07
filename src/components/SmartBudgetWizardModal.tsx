import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronLeft, ChevronRight, Check, X, Wand2, History, Sliders, ArrowRight } from 'lucide-react';
import { Config, Income, FixedExpense, Frequency, Category } from '../types';
import { TranslationKey } from '../i18n';
import { CategoryIcon } from './CategoryIcon';
import { Modal } from './ui';
import { formatAmount } from '../utils/format';
import { getCategoryColor } from '../utils/categoryColors';
import { DEFAULT_EXPENSE_CATEGORIES } from '../constants';

export interface SmartBudgetWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  setConfig: (c: Config) => void;
  incomes?: Income[];
  fixedExpenses?: FixedExpense[];
  stats?: any;
  currentPeriodId?: string;
  transactions?: any[];
  t: (key: TranslationKey) => string;
  onComplete?: () => void;
}

// Recommended proportions for budget presets (sums to ~100% of disposable income)
const BALANCED_DISTRIBUTION: Record<string, number> = {
  'mat-dagligvaror': 0.35, // 35%
  'restaurang': 0.12,     // 12%
  'transport': 0.12,      // 12%
  'shopping': 0.15,       // 15%
  'nojen': 0.14,          // 14%
  'boende': 0.05,         // 5%
  'ovrigt': 0.07          // 7%
};

export function SmartBudgetWizardModal({
  isOpen,
  onClose,
  config,
  setConfig,
  incomes = [],
  fixedExpenses = [],
  stats,
  currentPeriodId,
  transactions = [],
  t: _t,
  onComplete,
}: SmartBudgetWizardModalProps) {
  const isEn = config?.language === 'en';
  const curr = config?.currency || 'kr';

  // Step state: 1 = Pot & Strategy, 2 = Category Slider, 3 = Summary
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedStrategy, setSelectedStrategy] = useState<'balanced' | 'history' | 'manual'>('balanced');
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(0);

  // Category list and local draft budgets
  const categories: Category[] = useMemo(() => {
    return (config.categories && config.categories.length > 0)
      ? config.categories
      : DEFAULT_EXPENSE_CATEGORIES;
  }, [config.categories]);

  // Working copy of category budgets: { [catIdOrName]: budgetAmount }
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});

  // Fixed expense spending per category
  const getFixedSpentForCategory = (catName: string) => {
    return (fixedExpenses || [])
      .filter((e) => (e.category || '').trim().toLowerCase() === (catName || '').trim().toLowerCase())
      .reduce((sum, e) => {
        const amount =
          e.isVariable && e.periodOverrides && currentPeriodId && e.periodOverrides[currentPeriodId] !== undefined
            ? e.periodOverrides[currentPeriodId]
            : Number(e.amount) || 0;
        switch (e.frequency) {
          case Frequency.QUARTERLY:
            return sum + amount / 3;
          case Frequency.SEMI_ANNUALLY:
            return sum + amount / 6;
          case Frequency.ANNUALLY:
            return sum + amount / 12;
          default:
            return sum + amount;
        }
      }, 0);
  };

  // Financial totals
  const totalIncomeSum = (incomes || []).reduce((sum, i) => {
    const amount =
      i.isVariable && i.periodOverrides && currentPeriodId && i.periodOverrides[currentPeriodId] !== undefined
        ? i.periodOverrides[currentPeriodId]
        : Number(i.amount) || 0;
    return sum + amount;
  }, 0);

  const totalFixedSum = (fixedExpenses || []).reduce((sum, e) => {
    const amount =
      e.isVariable && e.periodOverrides && currentPeriodId && e.periodOverrides[currentPeriodId] !== undefined
        ? e.periodOverrides[currentPeriodId]
        : Number(e.amount) || 0;
    switch (e.frequency) {
      case Frequency.QUARTERLY:
        return sum + amount / 3;
      case Frequency.SEMI_ANNUALLY:
        return sum + amount / 6;
      case Frequency.ANNUALLY:
        return sum + amount / 12;
      default:
        return sum + amount;
    }
  }, 0);

  const totalSavingsSum =
    stats?.totalSavings !== undefined
      ? stats.totalSavings
      : config.monthlySavingsItems && config.monthlySavingsItems.length > 0
      ? config.monthlySavingsItems.reduce((sum, item) => {
          const amount =
            item.isVariable && item.periodOverrides && currentPeriodId && item.periodOverrides[currentPeriodId] !== undefined
              ? item.periodOverrides[currentPeriodId]
              : Number(item.amount) || Number((item as any).targetAmount) || 0;
          return sum + amount;
        }, 0) || 0
      : Number(config.monthlySavings) || 0;

  const totalPoolToAllocate = Math.max(0, totalIncomeSum - totalSavingsSum);
  const calculatedEverydayPot = Math.max(0, Math.round(totalIncomeSum - totalFixedSum - totalSavingsSum));
  const disposablePot = stats?.disposablePot !== undefined ? Math.round(stats.disposablePot) : calculatedEverydayPot;

  // Initialize draft budgets on wizard open
  React.useEffect(() => {
    if (isOpen) {
      const initialMap: Record<string, number> = {};
      categories.forEach((cat) => {
        const key = cat.id || cat.name;
        const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
        const currentBudget = Number(cat.budget) || 0;
        initialMap[key] = Math.max(currentBudget, fixedSpent);
      });
      setDraftBudgets(initialMap);
      setStep(1);
      setCurrentCategoryIndex(0);
    }
  }, [isOpen, categories, fixedExpenses, currentPeriodId]);

  // Calculate historical monthly spending averages per category
  const historicalAverages = useMemo(() => {
    if (!transactions || transactions.length === 0) return {};
    const sums: Record<string, number> = {};
    const count = 1; // Base on available data

    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.amount > 0) {
        const catName = (tx.category || '').trim().toLowerCase();
        const matched = categories.find((c) => c.name.trim().toLowerCase() === catName || c.id === tx.categoryId);
        if (matched) {
          const key = matched.id || matched.name;
          sums[key] = (sums[key] || 0) + Number(tx.amount);
        }
      }
    });

    const map: Record<string, number> = {};
    categories.forEach((c) => {
      const key = c.id || c.name;
      map[key] = Math.round((sums[key] || 0) / count);
    });
    return map;
  }, [transactions, categories]);

  // Apply chosen strategy
  const applyStrategy = (strategy: 'balanced' | 'history' | 'manual') => {
    setSelectedStrategy(strategy);
    const newBudgets: Record<string, number> = {};

    if (strategy === 'balanced') {
      const potToDivide = disposablePot > 0 ? disposablePot : 10000;
      categories.forEach((cat) => {
        const key = cat.id || cat.name;
        const ratio = BALANCED_DISTRIBUTION[cat.id] || BALANCED_DISTRIBUTION[cat.name.toLowerCase()] || (1 / categories.length);
        const calculated = Math.round((potToDivide * ratio) / 100) * 100; // round to nearest 100 kr
        const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
        newBudgets[key] = Math.max(calculated, fixedSpent);
      });
    } else if (strategy === 'history') {
      categories.forEach((cat) => {
        const key = cat.id || cat.name;
        const avg = historicalAverages[key] || 0;
        const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
        newBudgets[key] = Math.max(avg > 0 ? Math.round(avg / 50) * 50 : 0, fixedSpent);
      });
    } else {
      // Manual - keep existing or min fixed spent
      categories.forEach((cat) => {
        const key = cat.id || cat.name;
        const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
        newBudgets[key] = Math.max(Number(cat.budget) || 0, fixedSpent);
      });
    }

    setDraftBudgets(newBudgets);
  };

  // Total allocated across draft budgets
  const totalDraftAllocated = useMemo(() => {
    return categories.reduce((sum, c) => {
      const key = c.id || c.name;
      const fixedSpent = Math.round(getFixedSpentForCategory(c.name));
      const val = Math.max(draftBudgets[key] || 0, fixedSpent);
      return sum + val;
    }, 0);
  }, [categories, draftBudgets, fixedExpenses]);

  const remainingToAllocate = totalPoolToAllocate - totalDraftAllocated;
  const isOverAllocated = remainingToAllocate < 0;

  // Active category in Step 2
  const activeCategory = categories[currentCategoryIndex] || categories[0];
  const activeCatKey = activeCategory ? (activeCategory.id || activeCategory.name) : '';
  const activeFixedSpent = activeCategory ? Math.round(getFixedSpentForCategory(activeCategory.name)) : 0;
  const activeCurrentValue = activeCatKey ? (draftBudgets[activeCatKey] ?? 0) : 0;

  const updateCategoryValue = (val: number) => {
    if (!activeCatKey) return;
    const clamped = Math.max(activeFixedSpent, val);
    setDraftBudgets((prev) => ({ ...prev, [activeCatKey]: clamped }));
  };

  const adjustCategoryValue = (delta: number) => {
    updateCategoryValue(activeCurrentValue + delta);
  };

  const setCategoryPercentageOfPot = (pct: number) => {
    const amount = Math.round((totalPoolToAllocate * pct) / 100 / 50) * 50; // round to nearest 50 kr
    updateCategoryValue(amount);
  };

  // Save budget handler
  const handleSaveBudget = () => {
    const updatedCategories = categories.map((cat) => {
      const key = cat.id || cat.name;
      const val = draftBudgets[key];
      return {
        ...cat,
        budget: val && val > 0 ? val : null,
      };
    });

    try {
      localStorage.setItem('dejz_has_saved_initial_budget', 'true');
    } catch (_e) {
      // ignore
    }

    setConfig({
      ...config,
      categories: updatedCategories,
      hasSavedInitialBudget: true,
    });

    onComplete?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      showCloseButton={false}
      bodyClassName="p-0 overflow-hidden"
    >
      <div className="bg-[var(--bg-color)] text-[var(--text-primary)] rounded-[28px] max-w-lg mx-auto flex flex-col min-h-[520px] max-h-[85vh] font-sans overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 pt-5 pb-3 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between shrink-0 bg-[var(--surface-color)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0">
              <Sparkles size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                {isEn ? 'Smart Budget Wizard' : 'Smart Budgetguide'}
              </h3>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                {step === 1 && (isEn ? 'Step 1 of 3: Choose Strategy' : 'Steg 1 av 3: Välj fördelningsmodell')}
                {step === 2 && (isEn ? `Step 2 of 3: Category ${currentCategoryIndex + 1} of ${categories.length}` : `Steg 2 av 3: Kategori ${currentCategoryIndex + 1} av ${categories.length}`)}
                {step === 3 && (isEn ? 'Step 3 of 3: Overview & Save' : 'Steg 3 av 3: Överblick & spara')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1 bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-[var(--accent-color)] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <AnimatePresence mode="wait">
            
            {/* --- STEP 1: Pot Overview & Preset Strategy Selection --- */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Pot summary card */}
                <div className="bg-[var(--surface-color)] p-4 rounded-[20px] space-y-3">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block">
                    {isEn ? 'Your monthly disposable pot' : 'Din månatliga disponibla pott'}
                  </span>
                  
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-extrabold tracking-tight font-amount tabular-nums text-[var(--text-primary)]">
                        {formatAmount(disposablePot, config.language)} {curr}
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {isEn ? 'Available for variable category budgets' : 'Kvar för rörliga vardagskategorier'}
                      </span>
                    </div>

                    <div className="text-right text-xs font-medium text-[var(--text-secondary)] space-y-0.5">
                      <div>Inkomst: <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatAmount(totalIncomeSum, config.language)}</span></div>
                      <div>Fasta + Sparande: <span className="font-bold text-rose-500">-{formatAmount(totalFixedSum + totalSavingsSum, config.language)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Strategy Choices */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-[var(--text-secondary)] px-1 block">
                    {isEn ? 'Choose how to create your budget' : 'Hur vill du fördela din budget?'}
                  </span>

                  {/* Choice 1: Balanced Preset */}
                  <button
                    type="button"
                    onClick={() => applyStrategy('balanced')}
                    className={`w-full p-4 rounded-[18px] border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      selectedStrategy === 'balanced'
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5 ring-1 ring-[var(--accent-color)]'
                        : 'border-black/[0.06] dark:border-white/[0.08] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="p-2.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] shrink-0 mt-0.5">
                      <Wand2 size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {isEn ? 'Balanced Split (Recommended)' : 'Balanserad fördelning (Rekommenderad)'}
                        </span>
                        {selectedStrategy === 'balanced' && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)]">
                            {isEn ? 'Selected' : 'Vald'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {isEn
                          ? 'Calculates optimal values for Food (35%), Restaurants (12%), Shopping (15%), Entertainment (14%), etc.'
                          : 'Räknar ut smarta belopp baserat på Mat (35%), Restaurang (12%), Shopping (15%), Nöje (14%) m.fl.'}
                      </p>
                    </div>
                  </button>

                  {/* Choice 2: Based on History */}
                  <button
                    type="button"
                    onClick={() => applyStrategy('history')}
                    className={`w-full p-4 rounded-[18px] border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      selectedStrategy === 'history'
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5 ring-1 ring-[var(--accent-color)]'
                        : 'border-black/[0.06] dark:border-white/[0.08] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
                      <History size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {isEn ? 'Based on spending history' : 'Baserad på historiska köp'}
                        </span>
                        {selectedStrategy === 'history' && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                            {isEn ? 'Selected' : 'Vald'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {isEn
                          ? 'Uses your past transactions to suggest realistic budget levels for each category.'
                          : 'Använder dina tidigare transaktioner för att föreslå realistiska budgetnivåer.'}
                      </p>
                    </div>
                  </button>

                  {/* Choice 3: Custom / Manual */}
                  <button
                    type="button"
                    onClick={() => applyStrategy('manual')}
                    className={`w-full p-4 rounded-[18px] border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      selectedStrategy === 'manual'
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5 ring-1 ring-[var(--accent-color)]'
                        : 'border-black/[0.06] dark:border-white/[0.08] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                      <Sliders size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {isEn ? 'Manual step-by-step' : 'Anpassa kategori för kategori'}
                        </span>
                        {selectedStrategy === 'manual' && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                            {isEn ? 'Selected' : 'Vald'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {isEn
                          ? 'Keep your existing budget values or start from scratch and adjust every category.'
                          : 'Behåll dina nuvarande belopp eller starta från noll och ställ in fritt.'}
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* --- STEP 2: Step-by-Step Category Adjustment --- */}
            {step === 2 && activeCategory && (
              <motion.div
                key={`step2_${currentCategoryIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Remaining Counter Bar */}
                <div className="bg-[var(--surface-color)] p-3.5 rounded-[18px] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    {isEn ? 'Left to allocate:' : 'Kvar att fördela:'}
                  </span>
                  <div className={`text-base font-extrabold font-amount tabular-nums ${
                    isOverAllocated
                      ? 'text-rose-600 dark:text-rose-400'
                      : remainingToAllocate === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[var(--text-primary)]'
                  }`}>
                    {remainingToAllocate === 0
                      ? (isEn ? '0 kr (Balanced)' : '0 kr (Balanserad)')
                      : `${formatAmount(remainingToAllocate, config.language)} ${curr}`}
                  </div>
                </div>

                {/* Category Navigation Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {categories.map((cat, idx) => {
                    const isCurrent = idx === currentCategoryIndex;
                    const catVal = draftBudgets[cat.id || cat.name] || 0;
                    return (
                      <button
                        key={cat.id || idx}
                        type="button"
                        onClick={() => setCurrentCategoryIndex(idx)}
                        className={`px-3 py-1.5 rounded-[12px] text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          isCurrent
                            ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs scale-102'
                            : catVal > 0
                            ? 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)] hover:bg-black/10'
                            : 'bg-black/5 dark:bg-white/5 text-[var(--text-tertiary)]'
                        }`}
                      >
                        <CategoryIcon icon={cat.icon} size="xs" noBackground />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Main Category Card */}
                <div
                  style={{ backgroundColor: activeCategory.color || getCategoryColor(activeCategory.name, config?.categories) }}
                  className="p-5 rounded-[24px] text-white space-y-4 shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CategoryIcon icon={activeCategory.icon} size="lg" noBackground whiteIcon />
                      <div>
                        <span className="text-xs text-white/80 font-medium block">
                          {isEn ? `Category ${currentCategoryIndex + 1} of ${categories.length}` : `Kategori ${currentCategoryIndex + 1} av ${categories.length}`}
                        </span>
                        <h4 className="text-xl font-bold tracking-tight text-white">
                          {activeCategory.name}
                        </h4>
                      </div>
                    </div>

                    {activeFixedSpent > 0 && (
                      <span className="text-[10px] font-bold bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full text-white/90">
                        Fasta: {formatAmount(activeFixedSpent, config.language)} {curr}
                      </span>
                    )}
                  </div>

                  {/* Budget Amount Display */}
                  <div className="bg-black/25 backdrop-blur-md rounded-[18px] p-4 text-center border border-white/15 space-y-1">
                    <span className="text-[11px] font-semibold text-white/80 block">
                      {isEn ? 'Monthly Budget' : 'Månadsbudget'}
                    </span>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-3xl sm:text-4xl font-extrabold font-amount tabular-nums text-white">
                        {formatAmount(activeCurrentValue, config.language)}
                      </span>
                      <span className="text-base font-semibold text-white/80">
                        {curr}
                      </span>
                    </div>
                  </div>

                  {/* Tactile Adjust Toolbar: -500, -100, +100, +500 */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => adjustCategoryValue(-500)}
                      className="py-2.5 rounded-[12px] bg-black/20 hover:bg-black/30 active:scale-95 transition-all text-xs font-bold text-white cursor-pointer border border-white/10"
                    >
                      -500
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCategoryValue(-100)}
                      className="py-2.5 rounded-[12px] bg-black/20 hover:bg-black/30 active:scale-95 transition-all text-xs font-bold text-white cursor-pointer border border-white/10"
                    >
                      -100
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCategoryValue(100)}
                      className="py-2.5 rounded-[12px] bg-black/20 hover:bg-black/30 active:scale-95 transition-all text-xs font-bold text-white cursor-pointer border border-white/10"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCategoryValue(500)}
                      className="py-2.5 rounded-[12px] bg-black/20 hover:bg-black/30 active:scale-95 transition-all text-xs font-bold text-white cursor-pointer border border-white/10"
                    >
                      +500
                    </button>
                  </div>

                  {/* Direct Input & Percentage Shortcuts */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCategoryPercentageOfPot(15)}
                      className="flex-1 py-1.5 rounded-[10px] bg-white/15 hover:bg-white/25 transition-colors text-[11px] font-bold text-white cursor-pointer"
                    >
                      15% av potten
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryPercentageOfPot(25)}
                      className="flex-1 py-1.5 rounded-[10px] bg-white/15 hover:bg-white/25 transition-colors text-[11px] font-bold text-white cursor-pointer"
                    >
                      25% av potten
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCategoryValue(0)}
                      className="py-1.5 px-3 rounded-[10px] bg-black/30 hover:bg-black/40 transition-colors text-[11px] font-bold text-white/90 cursor-pointer"
                    >
                      Nollställ
                    </button>
                  </div>
                </div>

                {/* Navigation Controls: Prev / Next */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={currentCategoryIndex === 0}
                    onClick={() => setCurrentCategoryIndex((prev) => Math.max(0, prev - 1))}
                    className="h-10 px-4 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                    <span>{isEn ? 'Previous' : 'Föregående'}</span>
                  </button>

                  {currentCategoryIndex < categories.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentCategoryIndex((prev) => Math.min(categories.length - 1, prev + 1))}
                      className="h-10 px-5 rounded-[14px] bg-[var(--accent-color)] text-[var(--text-on-accent)] text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
                    >
                      <span>{isEn ? 'Next category' : 'Nästa kategori'}</span>
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="h-10 px-5 rounded-[14px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
                    >
                      <span>{isEn ? 'Review Summary' : 'Granska sammanfattning'}</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* --- STEP 3: Overview & Confirm --- */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Balance status banner */}
                <div className={`p-4 rounded-[20px] flex items-center justify-between ${
                  isOverAllocated
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300'
                    : remainingToAllocate === 0
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">
                      {isOverAllocated
                        ? (isEn ? 'Budget exceeds disposable income' : 'Överbudgeterad')
                        : remainingToAllocate === 0
                        ? (isEn ? 'Perfectly Balanced!' : 'Perfekt balanserad!')
                        : (isEn ? 'Buffer Remaining' : 'Buffert kvar')}
                    </span>
                    <span className="text-[11px] opacity-90 block">
                      {isOverAllocated
                        ? (isEn ? `You allocated ${formatAmount(Math.abs(remainingToAllocate), config.language)} ${curr} more than your pot.` : `Du har fördelat ${formatAmount(Math.abs(remainingToAllocate), config.language)} ${curr} mer än din pott.`)
                        : remainingToAllocate === 0
                        ? (isEn ? '100% of your disposable income is allocated.' : '100% av din disponibla pott är fördelad.')
                        : (isEn ? `${formatAmount(remainingToAllocate, config.language)} ${curr} unallocated reserve.` : `${formatAmount(remainingToAllocate, config.language)} ${curr} orörd som oprioriterad buffert.`)}
                    </span>
                  </div>

                  <div className="text-lg font-extrabold font-amount tabular-nums">
                    {formatAmount(totalDraftAllocated, config.language)} / {formatAmount(totalPoolToAllocate, config.language)} {curr}
                  </div>
                </div>

                {/* Category breakdown list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">
                      {isEn ? 'Category Breakdown' : 'Sammanfattning per kategori'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-[var(--accent-color)] hover:underline cursor-pointer"
                    >
                      {isEn ? 'Edit categories' : 'Ändra belopp'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {categories.map((cat, idx) => {
                      const key = cat.id || cat.name;
                      const val = draftBudgets[key] || 0;
                      const pct = totalPoolToAllocate > 0 ? Math.round((val / totalPoolToAllocate) * 100) : 0;

                      return (
                        <div
                          key={cat.id || idx}
                          className="p-3 bg-[var(--surface-color)] rounded-[16px] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon icon={cat.icon} size="sm" noBackground />
                            <div>
                              <span className="text-xs font-bold text-[var(--text-primary)] block leading-tight">
                                {cat.name}
                              </span>
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {pct}% av potten
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)]">
                            {formatAmount(val, config.language)} {curr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation CTA */}
        <div className="p-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-[var(--surface-color)] shrink-0 flex items-center justify-between gap-3">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-12 rounded-[16px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-xs"
            >
              <span>{isEn ? 'Continue to Category Setup' : 'Fortsätt till kategorier'}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          ) : step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full h-12 rounded-[16px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-xs"
            >
              <span>{isEn ? 'Review Budget Summary' : 'Granska sammanfattning'}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-12 px-4 rounded-[16px] bg-black/5 dark:bg-white/5 text-xs font-bold text-[var(--text-primary)] hover:bg-black/10 transition-colors cursor-pointer"
              >
                {isEn ? 'Back' : 'Tillbaka'}
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                className="flex-1 h-12 rounded-[16px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-md"
              >
                <Check size={18} strokeWidth={2.5} />
                <span>{isEn ? 'Save & Apply Budget' : 'Spara & tillämpa budget'}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
