import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, RotateCcw, ChevronRight, Sparkles } from 'lucide-react';
import { Config, Income, FixedExpense, Frequency, Category } from '../types';
import { TranslationKey } from '../i18n';
import { CategoryIcon } from './CategoryIcon';
import { CategoryModal } from './CategoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Button, Modal, Select, Card, SegmentedControl, ListRow } from './ui';
import { formatAmount, formatCurrency } from '../utils/format';
import { getCategoryColor } from '../utils/categoryColors';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';
import { getActiveFixedExpenses } from '../utils/cancellation';
import { dataService } from '../services/dataService';

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
  mode?: 'all' | 'budget' | 'categories';
  onDone?: () => void;
  userId?: string;
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
  initialTab,
  mode,
  onDone,
  userId,
}: BudgetCategoriesViewProps) {
  const curr = config?.currency || 'kr';
  const isEn = config.language === 'en';
  const effectiveMode: 'all' | 'budget' | 'categories' = mode || (initialTab === 'budget' ? 'budget' : initialTab === 'categories' ? 'categories' : 'all');

  const [activeCategoryType, setActiveCategoryType] = useState<'expense' | 'income'>(
    effectiveMode === 'budget' ? 'expense' : 'expense'
  );

  // --- Inline Budget Editing State ---
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [inlineInputValue, setInlineInputValue] = useState<string>('');
  const [showResetBudgetConfirm, setShowResetBudgetConfirm] = useState(false);

  // --- Category Modal State ---
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalData, setCategoryModalData] = useState<{
    type: 'income' | 'expense';
    index?: number;
    name: string;
    icon: string;
    color?: string;
    budget?: number | null;
  } | null>(null);

  // --- Deletion Migration & Reset Modals ---
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

  // --- Auto Allocate Modal State ---
  const [isAutoAllocateModalOpen, setIsAutoAllocateModalOpen] = useState(false);
  const [autoAllocateData, setAutoAllocateData] = useState<{
    proposed: { name: string; budget: number; icon: string; color?: string; id?: string }[];
    unallocatedPool: number;
  } | null>(null);
  const [editableProposedBudgets, setEditableProposedBudgets] = useState<Record<string, string>>({});

  const handleOpenAutoAllocate = () => {
    const categories = config.categories || DEFAULT_EXPENSE_CATEGORIES;
    const pool = totalPoolToAllocate;
    
    const catData = categories.map((cat) => {
      const fixed = Math.round(getFixedSpentForCategory(cat.name));
      const manual = Number(cat.budget) || 0;
      const hasManual = manual > fixed;
      return {
        ...cat,
        fixedSpent: fixed,
        manualBudget: manual,
        hasManual,
      };
    });

    const lockedSum = catData.reduce((sum, c) => {
      return sum + Math.max(c.fixedSpent, c.hasManual ? c.manualBudget : c.fixedSpent);
    }, 0);

    const unallocatedPool = Math.max(0, pool - lockedSum);
    const eligibleCats = catData.filter((c) => !c.hasManual && c.fixedSpent <= 2000);

    const getVariableWeight = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('mat') || lower.includes('dagligvaror') || lower.includes('livsmedel') || lower.includes('mad') || lower.includes('ruoka') || lower.includes('groceries')) return 0.50;
      if (lower.includes('transport') || lower.includes('bensin') || lower.includes('bil') || lower.includes('liikenne')) return 0.20;
      if (lower.includes('restaurang') || lower.includes('fika') || lower.includes('cafe') || lower.includes('ravintola')) return 0.15;
      if (lower.includes('shopping') || lower.includes('kläder') || lower.includes('ostokset')) return 0.10;
      return 0.05;
    };

    const totalWeight = eligibleCats.reduce((sum, c) => sum + getVariableWeight(c.name), 0) || 1;

    const proposed = catData.map((c) => {
      if (c.hasManual) {
        return { name: c.name, budget: c.manualBudget, icon: c.icon, color: c.color, id: c.id };
      }
      if (c.fixedSpent > 2000) {
        // Heavy fixed cost category (e.g. Rent/Boende), set budget equal to fixed expenses
        return { name: c.name, budget: c.fixedSpent, icon: c.icon, color: c.color, id: c.id };
      }
      const weight = getVariableWeight(c.name);
      const rawShare = (weight / totalWeight) * unallocatedPool;
      // Round to nearest 100 kr for natural rounded numbers
      const roundedShare = Math.round(rawShare / 100) * 100;
      const finalVal = Math.max(c.fixedSpent, c.fixedSpent + roundedShare);
      return { name: c.name, budget: finalVal, icon: c.icon, color: c.color, id: c.id };
    });

    const initialEditable: Record<string, string> = {};
    proposed.forEach(p => {
      initialEditable[p.name] = String(p.budget);
    });

    setAutoAllocateData({ proposed, unallocatedPool });
    setEditableProposedBudgets(initialEditable);
    setIsAutoAllocateModalOpen(true);
  };

  const handleApplyAutoAllocate = async () => {
    if (!autoAllocateData) return;
    const updatedCategories = (config.categories || DEFAULT_EXPENSE_CATEGORIES).map((c) => {
      const newBudgetValue = Number(editableProposedBudgets[c.name]);
      const fixed = Math.round(getFixedSpentForCategory(c.name));
      const finalVal = Math.max(fixed, !isNaN(newBudgetValue) ? newBudgetValue : 0);
      return {
        ...c,
        budget: finalVal > 0 ? finalVal : null,
      };
    });

    try {
      localStorage.setItem('dejz_has_saved_initial_budget', 'true');
    } catch (_e) {
      // ignore
    }

    const updatedConfig = {
      ...config,
      categories: updatedCategories,
      hasSavedInitialBudget: true,
    };
    setConfig(updatedConfig);
    if (userId) {
      try {
        await dataService.saveSettings(userId, updatedConfig);
      } catch (err) {
        console.warn('Could not save auto-allocated budget:', err);
      }
    }
    setIsAutoAllocateModalOpen(false);
  };
  const activeExpenses = getActiveFixedExpenses(fixedExpenses, new Date(), stats?.periodStart, stats?.periodEnd);

  const getFixedSpentForCategory = (catName: string) => {
    return (activeExpenses || [])
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

  const totalFixedSum = (activeExpenses || []).reduce((sum, e) => {
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
      : Array.isArray(config.monthlySavingsItems)
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

  const handleResetCategoryBudgets = () => {
    const resetCategories = (config.categories || []).map((c) => ({
      ...c,
      budget: null,
    }));
    setConfig({ ...config, categories: resetCategories });
    setShowResetBudgetConfirm(false);
  };

  const _handleSaveBudgetDone = () => {
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
  const handleEditCategory = (
    type: 'income' | 'expense',
    index: number,
    name: string,
    icon: string,
    color?: string,
    budget?: number | null
  ) => {
    if (effectiveMode === 'budget') return;
    setCategoryModalData({ type, index, name, icon, color, budget });
    setIsCategoryModalOpen(true);
  };

  const handleAddCategory = (type: 'income' | 'expense') => {
    if (effectiveMode === 'budget') return;
    setCategoryModalData({ type, name: '', icon: 'tag', budget: null });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategoryModal = (data: {
    name: string;
    icon: string;
    color?: string;
    budget?: number | null;
    index?: number;
  }) => {
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
        ...(type === 'expense'
          ? {
              budget:
                data.budget !== undefined && data.budget !== null && Number(data.budget) > 0
                  ? Number(data.budget)
                  : null,
            }
          : {}),
      };
    } else {
      const newId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      currentCategories.push({
        id: newId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        ...(type === 'expense' && data.budget && Number(data.budget) > 0
          ? { budget: Number(data.budget) }
          : {}),
      });
    }

    try {
      localStorage.setItem('dejz_has_saved_initial_budget', 'true');
    } catch (_e) {
      // ignore
    }

    setConfig({ ...config, [field]: currentCategories, hasSavedInitialBudget: true });
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

  const categoriesList = (config.categories as Category[]) || DEFAULT_EXPENSE_CATEGORIES;
  const incomeCategoriesList = (config.incomeCategories as Category[]) || DEFAULT_INCOME_CATEGORIES;

  return (
    <div className="space-y-[var(--menu-content-gap)] font-sans pb-10 page-max mx-auto w-full">
      {/* 0. Flikväljare: Utgifter / Inkomster (döljs i rent budgetläge) */}
      {effectiveMode !== 'budget' && (
        <SegmentedControl
          options={[
            { value: 'expense', label: isEn ? 'Expenses' : 'Utgifter' },
            { value: 'income', label: isEn ? 'Income' : 'Inkomster' }
          ]}
          value={activeCategoryType}
          onChange={setActiveCategoryType}
          fullWidth
        />
      )}

      {activeCategoryType === 'expense' ? (
        <div className="space-y-[var(--menu-content-gap)]">
          {/* 1. Toppmodul (visas endast vid budgetfördelning) */}
          {effectiveMode !== 'categories' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="sticky top-0 z-20 bg-[var(--surface-color)]/95 backdrop-blur-md rounded-card p-5 sm:p-6 shadow-subtle space-y-3.5"
            >
              <div className="flex items-baseline justify-between">
                <div className="space-y-0.5">
                  <span className="text-body-medium font-semibold text-[var(--text-secondary)]">
                    {isEn ? 'Left to allocate' : 'Kvar att fördela'}
                  </span>
                  <div
                    className={`text-large-amount font-amount tabular-nums ${
                      isOverAllocated
                        ? 'text-[var(--danger-color)]'
                        : remainingToAllocate === 0
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {formatCurrency(remainingToAllocate, curr, config.language)}
                  </div>
                </div>

                <div className="text-right text-body-medium font-semibold text-[var(--text-secondary)] font-amount tabular-nums">
                  {formatAmount(totalCategoryAllocated, config.language)} / {formatAmount(totalPoolToAllocate, config.language)} {curr}
                </div>
              </div>

              {/* Diskret förloppslinje */}
              <div className="w-full h-1 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverAllocated ? 'bg-[var(--danger-color)]' : 'bg-[var(--accent-color)]'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((totalCategoryAllocated / (totalPoolToAllocate || 1)) * 100))}%`,
                  }}
                />
              </div>

              {/* Auto Allocate Button */}
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenAutoAllocate}
                  disabled={remainingToAllocate <= 0}
                  icon={<Sparkles size={14} className="text-[var(--accent-color)]" />}
                  className="text-secondary font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isEn ? 'Auto-allocate' : config.language === 'da' ? 'Fordel automatisk' : config.language === 'no' ? 'Fordel automatisk' : config.language === 'fi' ? 'Jaa automaattisesti' : 'Fördela automatiskt'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* 2. Utgiftskategorier */}
          <div className="space-y-[var(--card-gap)]">
            {effectiveMode !== 'budget' && (
              <div className="flex items-center justify-end px-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddCategory('expense')}
                  icon={<Plus size={14} strokeWidth={2.5} />}
                >
                  {t('newCategory')}
                </Button>
              </div>
            )}

            {/* Sammanhängande modul med avdelare precis som inställningslistor */}
            <Card variant="default" padding="none" className="divide-y divide-menu">
              {categoriesList.map((cat, index) => {
                const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
                const catBudget = Math.max(Number(cat.budget) || 0, fixedSpent);
                const isEditingThis = editingCategoryName === cat.name;
                const catColor = cat.color || getCategoryColor(cat.name, config?.categories);

                return (
                  <div
                    key={cat.id || index}
                    onClick={() => {
                      if (effectiveMode === 'budget') {
                        if (!isEditingThis) {
                          setEditingCategoryName(cat.name);
                          setInlineInputValue(catBudget > 0 ? String(catBudget) : '');
                        }
                      } else {
                        handleEditCategory('expense', index, cat.name, cat.icon, cat.color, cat.budget);
                      }
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 min-h-[60px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left group"
                  >
                    {/* Vänster: Tydlig rund ikon & kategorinamn */}
                    <div className="flex items-center gap-4 min-w-0 pr-2">
                      <CategoryIcon icon={cat.icon} color={catColor} size="sm" categoryName={cat.name} />
                      <div className="min-w-0 flex flex-col justify-center">
                        <span className="text-body-medium font-semibold text-[var(--text-primary)] tracking-tight truncate">
                          {cat.name}
                        </span>
                        {fixedSpent > 0 && effectiveMode === 'budget' && (
                          <span className="text-micro-label font-normal text-[var(--text-tertiary)] truncate mt-0.5">
                            {isEn ? 'Fixed: ' : 'Fasta: '}
                            {formatAmount(fixedSpent, config.language)} {curr}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Höger: Budgetbelopp (i budgetläge) eller pil */}
                    {effectiveMode === 'budget' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {isEditingThis ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center bg-white dark:bg-black/40 rounded-[var(--radius-sm,6px)] px-2.5 py-1 border border-[var(--accent-color)] shadow-xs"
                          >
                            <input
                              type="text"
                              autoFocus
                              inputMode="numeric"
                              pattern="[0-9]*"
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
                                  // ignore
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
                              className="w-16 bg-transparent border-none text-right text-body-medium font-semibold text-[var(--text-primary)] font-amount tabular-nums outline-none"
                              placeholder="0"
                            />
                            <span className="text-micro-label font-semibold text-[var(--text-secondary)] pl-1 select-none">
                              {curr}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryName(cat.name);
                              setInlineInputValue(catBudget > 0 ? String(catBudget) : '');
                            }}
                            className="px-3 py-1.5 rounded-[var(--radius-sm,6px)] bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors border border-subtle cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <span className="text-body-medium font-semibold font-amount tabular-nums text-[var(--text-primary)]">
                              {catBudget > 0 ? formatAmount(catBudget, config.language) : '0'}
                            </span>
                            <span className="text-micro-label font-semibold text-[var(--text-secondary)]">
                              {curr}
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-[var(--text-tertiary)] shrink-0 pl-2 group-hover:text-[var(--text-secondary)] transition-colors">
                        <ChevronRight size={16} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      ) : (
        /* Inkomstkategorier i samma layout med sammanhängande kort */
        <div className="space-y-[var(--card-gap)]">
          <div className="flex items-center justify-end px-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddCategory('income')}
              icon={<Plus size={14} strokeWidth={2.5} />}
            >
              {t('newCategory')}
            </Button>
          </div>

          <Card variant="default" padding="none" className="divide-y divide-menu">
            {incomeCategoriesList.map((cat, index) => {
              const catColor = cat.color || getCategoryColor(cat.name, config?.incomeCategories);
              return (
                <ListRow
                  key={cat.id || index}
                  variant="grouped"
                  showChevron
                  icon={<CategoryIcon icon={cat.icon} color={catColor} size="sm" categoryName={cat.name} noBackground />}
                  title={cat.name}
                  onClick={() => handleEditCategory('income', index, cat.name, cat.icon, cat.color)}
                />
              );
            })}
          </Card>
        </div>
      )}

      {/* 3. Minimal footer */}
      <div className="pt-2 space-y-[var(--card-gap)]">
        {/* Återställ-knappar */}
        <div className="flex flex-col items-center gap-2 pt-1">
          {effectiveMode !== 'categories' && (
            <button
              type="button"
              onClick={() => setShowResetBudgetConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-label font-semibold text-[var(--text-tertiary)] hover:text-[var(--danger-color)] dark:hover:text-[var(--danger-color)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw size={13} strokeWidth={2} />
              <span>{isEn ? 'Reset budget to 0' : 'Nollställ budget'}</span>
            </button>
          )}
          {effectiveMode !== 'budget' && (
            <button
              type="button"
              onClick={() => setIsResetCategoriesModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-label font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw size={13} strokeWidth={2} />
              <span>{isEn ? 'Reset categories to default' : 'Återställ kategorier'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {effectiveMode !== 'budget' && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          type={categoryModalData?.type || 'expense'}
          currency={curr}
          initialData={categoryModalData}
          onSave={handleSaveCategoryModal}
          onDelete={(index) => {
            handleDeleteCategory(categoryModalData!.type, index);
            setIsCategoryModalOpen(false);
          }}
          t={t}
          hideBudget={effectiveMode === 'categories'}
        />
      )}

      {showResetBudgetConfirm && (
        <ConfirmModal
          isOpen={showResetBudgetConfirm}
          title={isEn ? 'Reset budget?' : 'Nollställ budget?'}
          message={
            isEn
              ? 'Reset all category budgets to 0?'
              : `Vill du nollställa alla kategoribudgetar till 0 ${curr}?`
          }
          confirmText={isEn ? 'Reset' : 'Nollställ'}
          cancelText={isEn ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={handleResetCategoryBudgets}
          onCancel={() => setShowResetBudgetConfirm(false)}
          t={t}
        />
      )}

      {deleteMigrationData && (
        <Modal
          isOpen={!!deleteMigrationData}
          onClose={() => setDeleteMigrationData(null)}
          title={
            isEn
              ? `Delete ${deleteMigrationData.category.name}?`
              : `Ta bort ${deleteMigrationData.category.name}?`
          }
          showCloseButton={true}
          bodyClassName="p-5 space-y-[var(--card-gap)]"
        >
          <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
            {isEn
              ? `This category is used by ${deleteMigrationData.count} transactions. Choose which category to move them to.`
              : `Kategorin används av ${deleteMigrationData.count} transaktioner. Välj vilken kategori de ska flyttas till.`}
          </p>
          <div className="space-y-1.5">
            <Select
              value={targetMigrationId}
              onChange={(e) => setTargetMigrationId(e.target.value)}
              className="h-11 text-body-medium text-[var(--text-primary)]"
            >
              {(deleteMigrationData.type === 'income'
                ? config.incomeCategories || []
                : config.categories || []
              )
                .filter((c) => c.id !== deleteMigrationData.category.id)
                .map((c) => (
                  <option key={c.id} value={c.id} className="bg-[var(--surface-color)] text-[var(--text-primary)]">
                    {c.name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2 pt-1">
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
              {isEn ? 'Move & Delete' : 'Flytta & ta bort'}
            </Button>
            <Button
              onClick={() => setDeleteMigrationData(null)}
              variant="ghost"
              fullWidth
            >
              {isEn ? 'Cancel' : 'Avbryt'}
            </Button>
          </div>
        </Modal>
      )}

      {deleteConfirmIndex && (
        <ConfirmModal
          isOpen={!!deleteConfirmIndex}
          title={
            isEn
              ? `Delete ${deleteConfirmIndex.category.name}?`
              : `Ta bort ${deleteConfirmIndex.category.name}?`
          }
          message={
            isEn
              ? 'Are you sure you want to delete this category?'
              : 'Är du säker på att du vill ta bort denna kategori?'
          }
          confirmText={isEn ? 'Delete' : 'Ta bort'}
          cancelText={isEn ? 'Cancel' : 'Avbryt'}
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

      {isResetCategoriesModalOpen && (
        <ConfirmModal
          isOpen={isResetCategoriesModalOpen}
          title={isEn ? 'Reset categories?' : 'Återställ kategorier?'}
          message={
            isEn
              ? 'Restore standard categories?'
              : 'Vill du återställa till standardkategorierna?'
          }
          confirmText={isEn ? 'Reset' : 'Återställ'}
          cancelText={isEn ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={async () => {
            const updatedConfig = {
              ...config,
              categories: DEFAULT_EXPENSE_CATEGORIES,
              incomeCategories: DEFAULT_INCOME_CATEGORIES,
            };
            setConfig(updatedConfig);
            if (userId) {
              await dataService.saveSettings(userId, updatedConfig);
            }
            setIsResetCategoriesModalOpen(false);
          }}
          onCancel={() => setIsResetCategoriesModalOpen(false)}
          t={t}
        />
      )}

      {/* Auto Allocate Modal / Bottom Sheet */}
      <Modal
        isOpen={isAutoAllocateModalOpen}
        onClose={() => setIsAutoAllocateModalOpen(false)}
        size="md"
        title={isEn ? 'Automatic budget proposal' : config.language === 'da' ? 'Automatisk budgetforslag' : config.language === 'no' ? 'Automatisk budsjettforslag' : config.language === 'fi' ? 'Automaattinen budjettiehdotus' : 'Automatiskt budgetförslag'}
        subtitle={isEn ? 'Based on your income, fixed expenses, and recommended weights.' : config.language === 'da' ? 'Baseret på dine indtægter, faste udgifter og anbefalede vægte.' : config.language === 'no' ? 'Basert på inntekter, faste utgifter og anbefalte vekter.' : config.language === 'fi' ? 'Perustuu tuloihin, kiinteisiin kuluihin ja suositeltuihin painotuksiin.' : 'Baserat på dina inkomster, fasta kostnader och rekommenderade vikter.'}
        showCloseButton={true}
        bodyClassName="p-5 sm:p-6 space-y-4"
      >
        <div className="space-y-4">
          <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
            {isEn
              ? 'We have allocated your budget based on your fixed expenses and available funds. Adjust the amounts before saving.'
              : config.language === 'da'
              ? 'Vi har fordelt dit budget ud fra dine faste udgifter og tilgængelige penge. Juster beløbene, før du gemmer.'
              : config.language === 'no'
              ? 'Vi har fordelt budsjettet ditt basert på faste utgifter og tilgjengelige penger. Juster beløpene før du lagrer.'
              : config.language === 'fi'
              ? 'Olemme jaanut budjettisi kiinteiden kulujen ja käytettävissä olevien varojen perusteella. Säädä summia ennen tallennusta.'
              : 'Vi har fördelat din budget utifrån dina fasta utgifter och tillgängliga pengar. Justera beloppen innan du sparar.'}
          </p>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border-subtle)]">
            {(autoAllocateData?.proposed || []).map((item) => {
              const catColor = item.color || getCategoryColor(item.name, config?.categories);
              return (
                <div key={item.name} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon icon={item.icon} color={catColor} size="xs" categoryName={item.name} />
                    <span className="text-secondary font-semibold text-[var(--text-primary)] truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editableProposedBudgets[item.name] !== undefined ? editableProposedBudgets[item.name] : item.budget}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditableProposedBudgets((prev) => ({ ...prev, [item.name]: val }));
                      }}
                      className="w-24 text-right bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-input px-2.5 py-1 text-secondary font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                    />
                    <span className="text-secondary text-[var(--text-secondary)]">{curr}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="secondary"
              fullWidth
              size="md"
              onClick={() => setIsAutoAllocateModalOpen(false)}
            >
              {isEn ? 'Cancel' : config.language === 'da' ? 'Annuller' : config.language === 'no' ? 'Avbryt' : config.language === 'fi' ? 'Peruuta' : 'Avbryt'}
            </Button>
            <Button
              variant="primary"
              fullWidth
              size="md"
              onClick={handleApplyAutoAllocate}
            >
              {isEn ? 'Apply proposal' : config.language === 'da' ? 'Brug forslag' : config.language === 'no' ? 'Bruk forslag' : config.language === 'fi' ? 'Käytä ehdotusta' : 'Använd förslag'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
