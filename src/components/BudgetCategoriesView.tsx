import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, RotateCcw } from 'lucide-react';
import { Config, Income, FixedExpense, Frequency, Category } from '../types';
import { TranslationKey } from '../i18n';
import { CategoryIcon } from './CategoryIcon';
import { CategoryModal } from './CategoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Button, Modal } from './ui';
import { formatAmount } from '../utils/format';
import { getCategoryColor } from '../utils/categoryColors';
import { isEmojiString, getCategoryIconName } from '../utils/icons';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';

export interface BudgetCategoriesViewProps {
  config: Config;
  setConfig: (c: Config) => void;
  incomes?: Income[];
  fixedExpenses?: FixedExpense[];
  stats?: any;
  currentPeriodId?: string;
  transactions?: any[];
  t: (key: TranslationKey) => string;
  onRenameCategory?: (type: 'income' | 'expense', oldName: string, newName: string) => Promise<void> | void;
  onMigrateAndDeleteCategory?: (type: 'income' | 'expense', deleteCategoryId: string, migrateToCategoryId?: string) => void;
  initialTab?: 'budget' | 'categories';
  onDone?: () => void;
}

export function BudgetCategoriesView({
  config,
  setConfig,
  incomes = [],
  fixedExpenses = [],
  stats,
  currentPeriodId,
  transactions = [],
  t,
  onRenameCategory,
  onMigrateAndDeleteCategory,
  initialTab = 'budget',
  onDone,
}: BudgetCategoriesViewProps) {
  const curr = config?.currency || 'kr';
  const [activeTab, setActiveTab] = useState<'budget' | 'categories'>(initialTab);

  // Sync initialTab if changed externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // --- Budget Tab State ---
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [inlineInputValue, setInlineInputValue] = useState<string>('');
  const [showResetBudgetConfirm, setShowResetBudgetConfirm] = useState(false);

  // --- Categories Tab State ---
  const [categoryTypeTab, setCategoryTypeTab] = useState<'expense' | 'income'>('expense');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalData, setCategoryModalData] = useState<{
    type: 'income' | 'expense';
    index?: number;
    name: string;
    icon: string;
    color?: string;
  } | null>(null);
  const [deleteMigrationData, setDeleteMigrationData] = useState<{
    type: 'income' | 'expense';
    category: any;
    count: number;
  } | null>(null);
  const [targetMigrationId, setTargetMigrationId] = useState<string>('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<{
    type: 'income' | 'expense';
    index: number;
    category: any;
  } | null>(null);
  const [isResetCategoriesModalOpen, setIsResetCategoriesModalOpen] = useState(false);

  // --- Budget Calculations ---
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

  const calculatedEverydayBudget = Math.max(0, Math.round(totalIncomeSum - totalFixedSum - totalSavingsSum));
  const everydayBudget = stats?.disposablePot !== undefined ? Math.round(stats.disposablePot) : calculatedEverydayBudget;

  // Legacy Percentage Normalization on Open
  useEffect(() => {
    if (config.categories && config.categories.length > 0) {
      const budgetValues = config.categories.map((c) => Number(c.budget) || 0);
      const totalSum = budgetValues.reduce((a, b) => a + b, 0);
      const maxVal = Math.max(...budgetValues, 0);

      if (maxVal <= 100 && totalSum <= 100 && totalSum > 0 && everydayBudget > 500) {
        const normalized = config.categories.map((c) => {
          if (!c.budget || Number(c.budget) <= 0) return { ...c, budget: null };
          const converted = Math.round((everydayBudget * Number(c.budget)) / 100);
          return { ...c, budget: converted > 0 ? converted : undefined };
        });
        setConfig({ ...config, categories: normalized });
      }
    }
  }, [everydayBudget]);

  const totalPoolToAllocate = Math.max(0, totalIncomeSum - totalSavingsSum);

  const totalCategoryAllocated = (config.categories || []).reduce((sum, c) => {
    const fixedSpent = Math.round(getFixedSpentForCategory(c.name));
    const val = Math.max(Number(c.budget) || 0, fixedSpent);
    return sum + (val > 0 ? val : 0);
  }, 0);

  const remainingToAllocate = totalPoolToAllocate - totalCategoryAllocated;
  const isOverAllocated = remainingToAllocate < 0;

  const sortedCategoriesForManage = useMemo(() => {
    return [...(config.categories || [])].sort((a, b) => {
      const aFixed = Math.round(getFixedSpentForCategory(a.name));
      const bFixed = Math.round(getFixedSpentForCategory(b.name));
      if (bFixed !== aFixed) {
        return bFixed - aFixed;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [config.categories, fixedExpenses, currentPeriodId]);

  const handleResetCategoryBudgets = () => {
    const resetCategories = (config.categories || []).map((c) => ({
      ...c,
      budget: null,
    }));
    setConfig({ ...config, categories: resetCategories });
    setShowResetBudgetConfirm(false);
  };

  const handleSaveBudgetDone = () => {
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
    if (onDone) {
      onDone();
    }
  };

  // --- Category Modal Actions ---
  const handleEditCategory = (type: 'income' | 'expense', index: number, name: string, icon: string, color?: string) => {
    setCategoryModalData({ type, index, name, icon, color });
    setIsCategoryModalOpen(true);
  };

  const handleAddCategory = (type: 'income' | 'expense') => {
    setCategoryModalData({ type, name: '', icon: 'tag' });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategoryModal = (data: { name: string; icon: string; color?: string; index?: number }) => {
    if (!categoryModalData) return;
    const { type } = categoryModalData;
    const field = type === 'income' ? 'incomeCategories' : 'categories';
    const currentCategories: Category[] = [...((config[field] as Category[]) || [])];

    const oldName = categoryModalData.index !== undefined ? categoryModalData.name : null;
    const newName = (data.name || '').trim();

    if (categoryModalData.index !== undefined) {
      currentCategories[categoryModalData.index] = {
        ...currentCategories[categoryModalData.index],
        name: data.name,
        icon: data.icon,
        color: data.color,
      };
    } else {
      const newId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      currentCategories.push({ id: newId, name: data.name, icon: data.icon, color: data.color });
    }

    setConfig({ ...config, [field]: currentCategories });
    setIsCategoryModalOpen(false);

    if (oldName && newName && oldName.trim().toLowerCase() !== newName.toLowerCase()) {
      onRenameCategory?.(type, oldName.trim(), newName);
    }
  };

  const handleDeleteCategory = (type: 'income' | 'expense', index: number) => {
    const field = type === 'income' ? 'incomeCategories' : 'categories';
    const currentCategories = (config[field] as Category[]) || [];
    const cat = currentCategories[index];
    if (!cat) return;

    const affected = transactions.filter(
      (t) =>
        t.categoryId === cat.id ||
        (t.category && cat.name && t.category.trim().toLowerCase() === cat.name.trim().toLowerCase())
    );
    if (affected.length > 0) {
      const otherCats = currentCategories.filter((c) => c.id !== cat.id);
      const ovrigt = otherCats.find((c) => c.id === 'ovrigt' || c.name.toLowerCase() === 'övrigt') || otherCats[0];
      setTargetMigrationId(ovrigt?.id || otherCats[0]?.id || '');
      setDeleteMigrationData({ type, category: cat, count: affected.length });
    } else {
      setDeleteConfirmIndex({ type, index, category: cat });
    }
  };

  // --- Render Budget Category Row ---
  const renderBudgetCategoryRow = (cat: Category) => {
    const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
    const catBudget = Math.max(Number(cat.budget) || 0, fixedSpent);
    const isEditingThis = editingCategoryName === cat.name;

    return (
      <div
        key={cat.id || cat.name}
        className="py-3.5 px-4 sm:px-5 flex items-center justify-between gap-4 transition-colors"
      >
        {/* Left Part: Category Icon with Color, Name and helper text */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="shrink-0">
            {isEmojiString(cat.icon) ? (
              <div
                className="w-[34px] h-[34px] sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: `${cat.color || getCategoryColor(cat.name, config?.categories)}20` }}
              >
                {cat.icon}
              </div>
            ) : (
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: cat.color || getCategoryColor(cat.name, config?.categories) }}
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
                {formatAmount(fixedSpent, config.language)} {curr} {config.language === 'en' ? 'fixed included' : 'fast ingår'}
              </span>
            ) : (
              <span className="text-[11px] font-normal text-[var(--text-secondary)] opacity-60 block truncate mt-0.5">
                {config.language === 'en' ? 'Variable spending' : 'Rörlig utgift'}
              </span>
            )}
          </div>
        </div>

        {/* Right Part: Direct input of amount without +/- buttons */}
        <div className="shrink-0">
          {isEditingThis ? (
            <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/5 rounded-[12px] px-2.5 py-1.5 border border-[var(--accent-color)]">
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
                  try {
                    localStorage.setItem('dejz_has_saved_initial_budget', 'true');
                  } catch (_e) {
                    // ignore localStorage write errors
                  }
                  setConfig({ ...config, categories: updatedCategories, hasSavedInitialBudget: true });
                  setEditingCategoryName(null);
                }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setInlineInputValue(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
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
                setInlineInputValue(catBudget > 0 ? String(catBudget) : '');
              }}
              className="min-w-[80px] text-right py-2 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all cursor-pointer active:scale-[0.98]"
            >
              <span
                className={`text-[14px] font-bold font-amount tabular-nums ${
                  catBudget > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-60'
                }`}
              >
                {catBudget > 0 ? `${formatAmount(catBudget, config.language)} ${curr}` : `0 ${curr}`}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- Render Categories List (Cards) ---
  const renderCategoryCardsList = (type: 'expense' | 'income') => {
    const field = type === 'income' ? 'incomeCategories' : 'categories';
    const list = (config[field] as Category[]) || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {list.length} {config.language === 'en' ? 'categories' : 'kategorier'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} strokeWidth={2} />}
            onClick={() => handleAddCategory(type)}
          >
            {t('newCategory')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {list.map((cat: any, index: number) => (
            <div
              key={cat.id || index}
              onClick={() => handleEditCategory(type, index, cat.name, cat.icon, cat.color)}
              style={{ backgroundColor: cat.color || getCategoryColor(cat.name, config?.categories) }}
              className="h-32 sm:h-36 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm relative overflow-hidden"
            >
              <CategoryIcon icon={cat.icon} size="lg" noBackground whiteIcon />
              <span className="text-[14px] sm:text-[15px] font-bold text-white text-center truncate w-full px-1 drop-shadow-xs">
                {cat.name}
              </span>
            </div>
          ))}

          {/* Dashed Add New Category Card */}
          <button
            type="button"
            onClick={() => handleAddCategory(type)}
            className="h-32 sm:h-36 p-4 rounded-[22px] border-2 border-dashed border-black/10 dark:border-white/15 hover:border-[var(--accent-color)] dark:hover:border-[var(--accent-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] group-hover:bg-[var(--accent-color)]/10 transition-colors">
              <Plus size={18} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              {t('newCategory')}
            </span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans pb-12 max-w-md mx-auto">
      {/* Top Segmented Switcher: Budget vs Kategorier */}
      <div className="flex p-1 bg-black/[0.04] dark:bg-[#1C1C1C] rounded-[14px]">
        <button
          type="button"
          onClick={() => setActiveTab('budget')}
          className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
            activeTab === 'budget'
              ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Budget
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t('categories')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'budget' ? (
          <motion.div
            key="tab-budget"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* 1. Tydlig budgetöversikt i en toppmodul */}
            <div className="bg-[var(--surface-color)] rounded-[22px] p-5 sm:p-6 border-none shadow-none space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-[var(--text-secondary)] tracking-tight">
                  {config.language === 'en' ? 'Budget overview' : 'Budgetöversikt'}
                </span>
              </div>

              {/* Beloppet som återstår med störst visuell tyngd */}
              <div className="space-y-1">
                <div
                  className={`text-[26px] sm:text-[32px] leading-tight font-extrabold tracking-tight font-amount tabular-nums ${
                    isOverAllocated ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {remainingToAllocate > 0 ? (
                    <>
                      <span className="font-amount tabular-nums">
                        {formatAmount(remainingToAllocate, config.language)} {curr}
                      </span>
                      <span className="text-base sm:text-lg font-medium text-[var(--text-secondary)] font-sans ml-1.5">
                        {config.language === 'en' ? 'left to allocate' : 'kvar att fördela'}
                      </span>
                    </>
                  ) : remainingToAllocate === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xl sm:text-2xl py-1 font-sans font-bold">
                      ✓ {config.language === 'en' ? 'All allocated! 🎉' : 'Allt är fördelat! 🎉'}
                    </span>
                  ) : (
                    <>
                      <span className="font-amount tabular-nums">
                        {formatAmount(Math.abs(remainingToAllocate), config.language)} {curr}
                      </span>
                      <span className="text-base sm:text-lg font-medium text-rose-500/80 font-sans ml-1.5">
                        {config.language === 'en' ? 'overallocated' : 'överfördelat'}
                      </span>
                    </>
                  )}
                </div>

                {/* Kompletterande mindre information */}
                <div className="text-xs sm:text-[13px] font-semibold text-[var(--text-secondary)]">
                  <span className="font-amount tabular-nums">
                    {formatAmount(totalCategoryAllocated, config.language)}
                  </span>{' '}
                  {config.language === 'en' ? 'of' : 'av'}{' '}
                  <span className="font-amount tabular-nums">
                    {formatAmount(totalPoolToAllocate, config.language)}
                  </span>{' '}
                  {curr} {config.language === 'en' ? 'allocated' : 'fördelat'}
                  {totalSavingsSum > 0 && (
                    <span className="block text-[11px] font-normal opacity-75 mt-0.5">
                      {config.language === 'en'
                        ? `(Income ${formatAmount(totalIncomeSum, config.language)} − Savings ${formatAmount(totalSavingsSum, config.language)} ${curr})`
                        : `(Inkomst ${formatAmount(totalIncomeSum, config.language)} − Sparande ${formatAmount(totalSavingsSum, config.language)} ${curr})`}
                    </span>
                  )}
                </div>
              </div>

              {/* Diskret förloppsindikator */}
              <div className="w-full h-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverAllocated ? 'bg-rose-500' : 'bg-[var(--accent-color)]'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((totalCategoryAllocated / (totalPoolToAllocate || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* 2. Kategorilistan (Alla kategorier samlade i en ren lista) */}
            <div className="space-y-3">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight px-1 block">
                {config.language === 'en' ? 'Categories' : 'Kategorier'}
              </span>

              <div className="overflow-hidden rounded-[22px] bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {sortedCategoriesForManage.map((cat) => renderBudgetCategoryRow(cat))}
              </div>
            </div>

            {/* Spara & Nollställ */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleSaveBudgetDone}
                className="w-full h-12 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-none"
              >
                <Check size={16} strokeWidth={2.5} />
                {config.language === 'en' ? 'Done, save budget' : 'Klar, spara budgeten'}
              </button>

              <button
                type="button"
                onClick={() => setShowResetBudgetConfirm(true)}
                className="w-full py-2.5 text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={13} strokeWidth={2} />
                <span>{config.language === 'en' ? 'Reset budget' : 'Nollställ budgeten'}</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tab-categories"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 w-full py-1"
          >
            {/* Utgifter / Inkomster Toggle */}
            <div className="flex p-1 bg-black/[0.04] dark:bg-[#1C1C1C] rounded-[14px]">
              <button
                type="button"
                onClick={() => setCategoryTypeTab('expense')}
                className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
                  categoryTypeTab === 'expense'
                    ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t('expenses')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryTypeTab('income')}
                className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
                  categoryTypeTab === 'income'
                    ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t('incomes')}
              </button>
            </div>

            <div key={categoryTypeTab}>
              {categoryTypeTab === 'expense'
                ? renderCategoryCardsList('expense')
                : renderCategoryCardsList('income')}
            </div>

            {/* Reset categories to default button */}
            <div className="pt-2 pb-1 flex justify-center">
              <button
                type="button"
                onClick={() => setIsResetCategoriesModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw size={13} strokeWidth={2} />
                <span>
                  {config.language === 'en'
                    ? 'Reset categories to default'
                    : 'Återställ kategorier till standard'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Modals --- */}
      {/* 1. Category Modal (Create / Edit) */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        type={categoryModalData?.type || 'expense'}
        initialData={categoryModalData}
        onSave={handleSaveCategoryModal}
        onDelete={(index) => {
          handleDeleteCategory(categoryModalData!.type, index);
          setIsCategoryModalOpen(false);
        }}
        t={t}
      />

      {/* 2. Reset Budget Modal */}
      {showResetBudgetConfirm && (
        <ConfirmModal
          isOpen={showResetBudgetConfirm}
          title={config.language === 'en' ? 'Reset budget?' : 'Nollställ budgeten?'}
          message={
            config.language === 'en'
              ? 'Do you want to reset all category budgets to 0? Your income, fixed expenses, and savings will remain unchanged.'
              : 'Vill du nollställa alla kategoribudgetar till 0 kr? Dina inkomster, fasta utgifter och sparande påverkas inte.'
          }
          confirmText={config.language === 'en' ? 'Reset budget' : 'Nollställ budget'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={handleResetCategoryBudgets}
          onCancel={() => setShowResetBudgetConfirm(false)}
          t={t}
        />
      )}

      {/* 3. Delete Category Migration Modal */}
      {deleteMigrationData && (
        <Modal
          isOpen={!!deleteMigrationData}
          onClose={() => setDeleteMigrationData(null)}
          title={
            config.language === 'en'
              ? `Delete ${deleteMigrationData.category.name}?`
              : `Ta bort ${deleteMigrationData.category.name}?`
          }
          showCloseButton={true}
          bodyClassName="p-6 space-y-4"
        >
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
            {config.language === 'en'
              ? `This category is used by ${deleteMigrationData.count} transactions. Choose which category to move them to before deleting.`
              : `Kategorin används av ${deleteMigrationData.count} transaktioner. Välj vilken kategori de ska flyttas till innan den tas bort.`}
          </p>
          <div className="space-y-2 mb-2">
            <label className="text-xs font-semibold font-display tracking-wider text-[var(--text-secondary)]">
              {config.language === 'en' ? 'Move transactions to:' : 'Flytta transaktioner till:'}
            </label>
            <select
              value={targetMigrationId}
              onChange={(e) => setTargetMigrationId(e.target.value)}
              className="w-full h-[48px] bg-[var(--surface-muted)] border border-black/[0.06] dark:border-white/[0.08] rounded-[14px] px-3 text-[14px] font-normal text-[var(--text-primary)] outline-none"
            >
              {(deleteMigrationData.type === 'income'
                ? config.incomeCategories || []
                : config.categories || []
              )
                .filter((c) => c.id !== deleteMigrationData.category.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={() => {
                onMigrateAndDeleteCategory?.(
                  deleteMigrationData.type,
                  deleteMigrationData.category.id,
                  targetMigrationId
                );
                setDeleteMigrationData(null);
              }}
              variant="danger"
              fullWidth
            >
              {config.language === 'en' ? 'Move & Delete' : 'Flytta & ta bort'}
            </Button>
            <Button
              onClick={() => setDeleteMigrationData(null)}
              variant="ghost"
              fullWidth
            >
              {config.language === 'en' ? 'Cancel' : 'Avbryt'}
            </Button>
          </div>
        </Modal>
      )}

      {/* 4. Delete Category Direct Confirm Modal */}
      {deleteConfirmIndex && (
        <ConfirmModal
          isOpen={!!deleteConfirmIndex}
          title={
            config.language === 'en'
              ? `Delete ${deleteConfirmIndex.category.name}?`
              : `Ta bort ${deleteConfirmIndex.category.name}?`
          }
          message={
            config.language === 'en'
              ? 'Are you sure you want to delete this category? It is not used by any transactions.'
              : 'Är du säker på att du vill ta bort denna kategori? Den används inte av några transaktioner.'
          }
          confirmText={config.language === 'en' ? 'Delete' : 'Ta bort'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          onConfirm={() => {
            const field = deleteConfirmIndex.type === 'income' ? 'incomeCategories' : 'categories';
            const currentCategories = (config[field] as Category[]) || [];
            const newCategories = currentCategories.filter((_, i) => i !== deleteConfirmIndex.index);
            setConfig({ ...config, [field]: newCategories });
            setDeleteConfirmIndex(null);
          }}
          onCancel={() => setDeleteConfirmIndex(null)}
          variant="danger"
          t={t}
        />
      )}

      {/* 5. Reset Categories to Default Modal */}
      {isResetCategoriesModalOpen && (
        <ConfirmModal
          isOpen={isResetCategoriesModalOpen}
          title={
            config.language === 'en'
              ? 'Reset categories to default?'
              : 'Återställ kategorier till standard?'
          }
          message={
            config.language === 'en'
              ? 'This will restore all standard expense and income categories with their original colors and icons.'
              : 'Detta återställer alla utgifts- och inkomstkategorier till standardlistan med ursprungliga ikoner och färger.'
          }
          confirmText={config.language === 'en' ? 'Reset' : 'Återställ'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={() => {
            setConfig({
              ...config,
              categories: DEFAULT_EXPENSE_CATEGORIES,
              incomeCategories: DEFAULT_INCOME_CATEGORIES,
            });
            setIsResetCategoriesModalOpen(false);
          }}
          onCancel={() => setIsResetCategoriesModalOpen(false)}
          t={t}
        />
      )}
    </div>
  );
}
