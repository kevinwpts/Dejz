import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, RotateCcw, ChevronRight, Sparkles, Check, PieChart } from 'lucide-react';
import { Config, Income, FixedExpense, Category } from '../types';
import { TranslationKey } from '../i18n';
import { CategoryIcon } from './CategoryIcon';
import { CategoryModal } from './CategoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Button, Modal, Select, Card, FilterButtonGroup, ListRow, Switch } from './ui';
import { formatAmount, formatCurrency } from '../utils/format';
import { getCategoryColor } from '../utils/categoryColors';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';
import { getActiveFixedExpenses } from '../utils/cancellation';
import { isFixedItemDueInPeriod } from '../utils/date';
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

  // --- Inline Auto Allocate Undo State ---
  const [previousBudgetsSnapshot, setPreviousBudgetsSnapshot] = useState<Record<string, number | null | undefined> | null>(null);

  const handleAutoAllocateInline = async () => {
    const categories = config.categories || DEFAULT_EXPENSE_CATEGORIES;
    const pool = Math.round(totalPoolToAllocate);

    // Save snapshot of current budgets before auto-allocating so the user can undo with 1 tap
    const snapshot: Record<string, number | null | undefined> = {};
    categories.forEach((c) => {
      snapshot[c.name] = c.budget;
    });
    setPreviousBudgetsSnapshot(snapshot);

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

    const getVariableWeight = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('mat') || lower.includes('dagligvaror') || lower.includes('livsmedel') || lower.includes('mad') || lower.includes('ruoka') || lower.includes('groceries')) return 0.50;
      if (lower.includes('transport') || lower.includes('bensin') || lower.includes('bil') || lower.includes('liikenne')) return 0.20;
      if (lower.includes('restaurang') || lower.includes('fika') || lower.includes('cafe') || lower.includes('ravintola')) return 0.15;
      if (lower.includes('shopping') || lower.includes('kläder') || lower.includes('ostokset')) return 0.10;
      return 0.05;
    };

    const unallocatedWithManuals = pool - catData.reduce((sum, c) => sum + Math.max(c.fixedSpent, c.hasManual ? c.manualBudget : c.fixedSpent), 0);
    const openEligibleCats = catData.filter((c) => !c.hasManual && c.fixedSpent <= 2000);
    const shouldRedistributeAllVariable = unallocatedWithManuals <= 0 || openEligibleCats.length === 0;

    const lockedSum = catData.reduce((sum, c) => {
      if (shouldRedistributeAllVariable) return sum + c.fixedSpent;
      return sum + Math.max(c.fixedSpent, c.hasManual ? c.manualBudget : c.fixedSpent);
    }, 0);

    const unallocatedPool = Math.max(0, pool - lockedSum);
    const eligibleCats = shouldRedistributeAllVariable
      ? catData.filter((c) => c.fixedSpent <= 2000)
      : openEligibleCats;
    const finalEligibleCats = eligibleCats.length > 0 ? eligibleCats : catData;

    const totalWeight = finalEligibleCats.reduce((sum, c) => sum + getVariableWeight(c.name), 0) || 1;

    const proposed = catData.map((c) => {
      const isEligible = finalEligibleCats.some((ec) => ec.name === c.name);
      if (!isEligible) {
        const baseVal = shouldRedistributeAllVariable ? c.fixedSpent : Math.max(c.fixedSpent, c.manualBudget);
        return { name: c.name, budget: baseVal, fixedSpent: c.fixedSpent };
      }
      const weight = getVariableWeight(c.name);
      const rawShare = (weight / totalWeight) * unallocatedPool;
      const roundedShare = Math.round(rawShare / 100) * 100;
      const finalVal = Math.max(c.fixedSpent, c.fixedSpent + roundedShare);
      return { name: c.name, budget: finalVal, fixedSpent: c.fixedSpent };
    });

    // Adjust rounding remainder onto the highest-weighted eligible category so the proposal sums to 100% of pool
    if (unallocatedPool > 0 && proposed.length > 0) {
      const currentProposedSum = proposed.reduce((sum, p) => sum + p.budget, 0);
      const remainder = pool - currentProposedSum;
      if (remainder !== 0) {
        let bestIdx = -1;
        let bestWeight = -1;
        proposed.forEach((p, idx) => {
          const isEligible = finalEligibleCats.some((ec) => ec.name === p.name);
          if (isEligible) {
            const w = getVariableWeight(p.name);
            if (w > bestWeight && p.budget + remainder >= p.fixedSpent) {
              bestWeight = w;
              bestIdx = idx;
            }
          }
        });
        if (bestIdx !== -1) {
          proposed[bestIdx] = {
            ...proposed[bestIdx],
            budget: Math.max(proposed[bestIdx].fixedSpent, proposed[bestIdx].budget + remainder),
          };
        }
      }
    }

    const proposedMap: Record<string, number> = {};
    proposed.forEach((p) => {
      proposedMap[p.name] = p.budget;
    });

    const updatedCategories = categories.map((c) => {
      const val = proposedMap[c.name] ?? (Number(c.budget) || 0);
      return {
        ...c,
        budget: val > 0 ? val : null,
      };
    });

    if (userId) {
      try {
        localStorage.setItem(`dejz_has_saved_initial_budget_${userId}`, 'true');
      } catch (_e) {
        // ignore
      }
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
  };

  const handleUndoAutoAllocate = async () => {
    if (!previousBudgetsSnapshot) return;
    const categories = config.categories || DEFAULT_EXPENSE_CATEGORIES;
    const restoredCategories = categories.map((c) => ({
      ...c,
      budget: previousBudgetsSnapshot[c.name] !== undefined ? previousBudgetsSnapshot[c.name] : c.budget,
    }));
    const hasAnyBudget = restoredCategories.some((c) => typeof c.budget === 'number' && c.budget > 0);

    const updatedConfig = {
      ...config,
      categories: restoredCategories,
      hasSavedInitialBudget: hasAnyBudget,
    };
    setPreviousBudgetsSnapshot(null);
    setConfig(updatedConfig);
    if (userId) {
      try {
        await dataService.saveSettings(userId, updatedConfig);
      } catch (err) {
        console.warn('Could not undo auto-allocated budget:', err);
      }
    }
  };
  const activeExpenses = getActiveFixedExpenses(fixedExpenses, new Date(), stats?.periodStart, stats?.periodEnd);

  const getFixedSpentForCategory = (catName: string) => {
    return (activeExpenses || [])
      .filter((e) => (e.category || '').trim().toLowerCase() === (catName || '').trim().toLowerCase())
      .reduce((sum, e) => {
        if (stats?.periodStart && stats?.periodEnd && !isFixedItemDueInPeriod(e, stats.periodStart, stats.periodEnd)) {
          return sum;
        }
        const amount =
          e.isVariable && e.periodOverrides && currentPeriodId && e.periodOverrides[currentPeriodId] !== undefined
            ? e.periodOverrides[currentPeriodId]
            : Number(e.amount) || 0;
        return sum + amount;
      }, 0);
  };

  const totalIncomeSum =
    stats?.totalIncome !== undefined
      ? stats.totalIncome
      : (incomes || []).reduce((sum, i) => {
          if (stats?.periodStart && stats?.periodEnd && !isFixedItemDueInPeriod(i, stats.periodStart, stats.periodEnd)) {
            return sum;
          }
          const amount =
            i.isVariable && i.periodOverrides && currentPeriodId && i.periodOverrides[currentPeriodId] !== undefined
              ? i.periodOverrides[currentPeriodId]
              : Number(i.amount) || 0;
          return sum + amount;
        }, 0);

  const totalFixedSum =
    stats?.totalFixed !== undefined
      ? stats.totalFixed
      : (activeExpenses || []).reduce((sum, e) => {
          if (stats?.periodStart && stats?.periodEnd && !isFixedItemDueInPeriod(e, stats.periodStart, stats.periodEnd)) {
            return sum;
          }
          const amount =
            e.isVariable && e.periodOverrides && currentPeriodId && e.periodOverrides[currentPeriodId] !== undefined
              ? e.periodOverrides[currentPeriodId]
              : Number(e.amount) || 0;
          return sum + amount;
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
  const _everydayBudget = stats?.disposablePot !== undefined ? Math.round(stats.disposablePot) : calculatedEverydayBudget;

  // Legacy Percentage Normalization on Open
  // Strip legacy percentage defaults (<= 100) from categories if present so they never turn into pre-made budgets
  useEffect(() => {
    if (config.categories && config.categories.length > 0) {
      const budgetValues = config.categories.map((c) => Number(c.budget) || 0);
      const totalSum = budgetValues.reduce((a, b) => a + b, 0);
      const maxVal = Math.max(...budgetValues, 0);

      if (maxVal <= 100 && totalSum <= 100 && totalSum > 0) {
        const cleaned = config.categories.map((c) => ({ ...c, budget: null }));
        setConfig({ ...config, categories: cleaned, hasSavedInitialBudget: false });
      }
    }
  }, []);

  const totalPoolToAllocate = Math.max(0, totalIncomeSum - totalSavingsSum);

  const totalCategoryAllocated = (config.categories || []).reduce((sum, c) => {
    const fixedSpent = Math.round(getFixedSpentForCategory(c.name));
    const val = Math.max(Number(c.budget) || 0, fixedSpent);
    return sum + (val > 0 ? val : 0);
  }, 0);

  const remainingToAllocate = totalPoolToAllocate - totalCategoryAllocated;
  const isOverAllocated = remainingToAllocate < 0;

  const handleResetCategoryBudgets = async () => {
    const resetCategories = (config.categories || []).map((c) => ({
      ...c,
      budget: null,
    }));
    if (userId && userId !== 'sandbox') {
      try {
        localStorage.removeItem('dejz_has_saved_initial_budget');
        localStorage.removeItem('dejz_has_saved_budget');
        localStorage.removeItem(`dejz_has_saved_initial_budget_${userId}`);
      } catch (_e) {
        // ignore
      }
    }
    setPreviousBudgetsSnapshot(null);
    const updatedConfig = { ...config, categories: resetCategories, hasSavedInitialBudget: false };
    setConfig(updatedConfig);
    if (userId) {
      try {
        await dataService.saveSettings(userId, updatedConfig);
      } catch (err) {
        console.warn('Could not save reset category budgets:', err);
      }
    }
    setShowResetBudgetConfirm(false);
  };

  const _handleSaveBudgetDone = () => {
    const hasAnyBudget = Boolean(
      config.categories && config.categories.some((c: any) => typeof c.budget === 'number' && c.budget > 0)
    );
    if (hasAnyBudget) {
      const updatedConfig = {
        ...config,
        hasSavedInitialBudget: true,
      };
      setConfig(updatedConfig);
    }
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

    const nextExpenseCats = field === 'categories' ? currentCategories : (config.categories || []);
    const hasAnyBudget = nextExpenseCats.some((c: any) => typeof c.budget === 'number' && c.budget > 0);
    if (hasAnyBudget && userId) {
      try {
        localStorage.setItem(`dejz_has_saved_initial_budget_${userId}`, 'true');
      } catch (_e) {
        // ignore
      }
    }

    setConfig({ ...config, [field]: currentCategories, hasSavedInitialBudget: hasAnyBudget });
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

    const catNameLower = (cat.name || '').trim().toLowerCase();

    const affectedTxCount = transactions.filter((t) => {
      const isMatchingType = type === 'income' ? t.type === 'income' : t.type !== 'income';
      if (!isMatchingType) return false;
      if (t.categoryId === cat.id) return true;
      if (t.category && t.category.trim().toLowerCase() === catNameLower) return true;
      if (Array.isArray(t.splits) && t.splits.some((s: any) => (s.category || '').trim().toLowerCase() === catNameLower)) {
        return true;
      }
      return false;
    }).length;

    const affectedFixedCount =
      type === 'expense'
        ? (fixedExpenses || []).filter((fe) => (fe.category || '').trim().toLowerCase() === catNameLower).length
        : 0;

    const affectedIncomeCount =
      type === 'income'
        ? (incomes || []).filter((inc) => (inc.category || '').trim().toLowerCase() === catNameLower).length
        : 0;

    const totalAffected = affectedTxCount + affectedFixedCount + affectedIncomeCount;

    if (totalAffected > 0) {
      const otherCats = currentCategories.filter((c) => c.id !== cat.id);
      const ovrigt =
        otherCats.find(
          (c) =>
            c.id === 'ovrigt' ||
            c.name.toLowerCase() === 'övrigt' ||
            c.id === 'inc_other' ||
            c.name.toLowerCase() === 'övrig inkomst'
        ) || otherCats[0];
      setTargetMigrationId(ovrigt?.id || otherCats[0]?.id || '');
      setDeleteMigrationData({ type, category: cat, count: totalAffected });
    } else {
      setDeleteConfirmIndex({ type, index, category: cat });
    }
  };

  const categoriesList = (config.categories as Category[]) || DEFAULT_EXPENSE_CATEGORIES;
  const incomeCategoriesList = (config.incomeCategories as Category[]) || DEFAULT_INCOME_CATEGORIES;

  return (
    <div className="flex flex-col gap-section font-sans w-full">
      {/* 0. Flikväljare + Ny kategori-knapp (döljs i rent budgetläge) */}
      {effectiveMode !== 'budget' && (
        <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
          <div className="flex-1 min-w-0">
            <FilterButtonGroup
              options={[
                { id: 'expense', label: isEn ? 'Expenses' : 'Utgifter' },
                { id: 'income', label: isEn ? 'Income' : 'Inkomster' },
              ]}
              selectedId={activeCategoryType}
              onSelect={(id) => setActiveCategoryType(id as 'expense' | 'income')}
              ariaLabel={isEn ? 'Category type' : 'Kategorityp'}
            />
          </div>

          <Button
            type="button"
            variant="tonal"
            size="sm"
            onClick={() => handleAddCategory(activeCategoryType)}
            className="shrink-0"
          >
            {t('newCategory')}
          </Button>
        </div>
      )}

      {activeCategoryType === 'expense' ? (
        <div className="flex flex-col gap-section">
          {/* 1. Toppmodul (visas endast vid budgetfördelning) */}
          {effectiveMode !== 'categories' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="sticky top-0 z-20 bg-[var(--surface-color)] rounded-card card-p shadow-subtle space-y-3"
            >
              <div className="flex items-end justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-metric-label font-medium text-[var(--text-secondary)] block">
                    {isEn ? 'Left to allocate (optional)' : 'Kvar att fördela (valfritt)'}
                  </span>
                  <div
                    className={`text-large-amount font-bold font-amount tabular-nums leading-tight ${
                      isOverAllocated
                        ? 'text-[var(--danger-color)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {formatCurrency(remainingToAllocate, curr, config.language)}
                  </div>
                </div>

                <div className="text-right text-secondary font-medium text-[var(--text-secondary)] font-amount tabular-nums shrink-0 pb-0.5">
                  {formatAmount(totalCategoryAllocated, config.language)} / {formatAmount(totalPoolToAllocate, config.language)} {curr}
                </div>
              </div>

              {/* Diskret förloppslinje */}
              <div className="w-full h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverAllocated ? 'bg-[var(--danger-color)]' : 'bg-[var(--brand-signature,var(--accent-color))]'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((totalCategoryAllocated / (totalPoolToAllocate || 1)) * 100))}%`,
                  }}
                />
              </div>

              <p className="text-micro-label text-[var(--text-secondary)] leading-relaxed">
                {isEn
                  ? 'You do not need to allocate everything. Any unassigned amount stays safely in your general "Available to spend" pot.'
                  : 'Du behöver inte fördela allt. Allt du inte låser till en kategori ingår automatiskt i din allmänna pott "Kvar att spendera".'}
              </p>

              {/* Auto Allocate / Undo + Confirm Buttons */}
              <div className="flex items-center justify-end gap-2 pt-0.5">
                {previousBudgetsSnapshot ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleUndoAutoAllocate}
                    >
                      {isEn ? 'Undo' : config.language === 'da' ? 'Fortryd' : config.language === 'no' ? 'Angre' : config.language === 'fi' ? 'Kumoa' : 'Ångra'}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setPreviousBudgetsSnapshot(null)}
                    >
                      {isEn ? 'Approve' : config.language === 'da' ? 'Godkend' : config.language === 'no' ? 'Godkjenn' : config.language === 'fi' ? 'Hyväksy' : 'Godkänn'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="tonal"
                    size="sm"
                    onClick={handleAutoAllocateInline}
                    disabled={totalPoolToAllocate <= 0}
                  >
                    {isEn ? 'Auto-allocate' : config.language === 'da' ? 'Fordel automatisk' : config.language === 'no' ? 'Fordel automatisk' : config.language === 'fi' ? 'Jaa automaattisesti' : 'Fördela automatiskt'}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Inställning för att visa/dölja budget på hemfliken */}
          {effectiveMode !== 'categories' && (
            <div className="flex items-center justify-between p-3.5 bg-[var(--surface-color)] rounded-card">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center shrink-0 text-[var(--text-secondary)]">
                  <PieChart size={17} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-label font-semibold text-[var(--text-primary)] truncate">
                    {isEn ? 'Show budget on Home' : 'Visa budget på hemfliken'}
                  </p>
                  <p className="text-micro-label text-[var(--text-secondary)] truncate">
                    {isEn ? 'Display category budgets under Available to spend' : 'Visas under Kvar att spendera på hemskärmen'}
                  </p>
                </div>
              </div>
              <Switch
                checked={!(
                  config.hideBudgetOnHome ??
                    (typeof window !== 'undefined' && localStorage.getItem('dejz_hide_budget_on_home') === 'true')
                )}
                onChange={() => {
                  const currentHide = Boolean(
                    config.hideBudgetOnHome ??
                      (typeof window !== 'undefined' && localStorage.getItem('dejz_hide_budget_on_home') === 'true')
                  );
                  const nextHide = !currentHide;
                  try {
                    localStorage.setItem('dejz_hide_budget_on_home', nextHide ? 'true' : 'false');
                  } catch (err) {
                    void err;
                  }
                  setConfig({ ...config, hideBudgetOnHome: nextHide });
                }}
                aria-label={isEn ? 'Show budget on Home' : 'Visa budget på hemfliken'}
              />
            </div>
          )}

          {/* 2. Utgiftskategorier */}
          <div className="space-y-[var(--card-gap)]">

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
                    className="w-full flex items-center justify-between px-4 py-3.5 min-h-[64px] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer text-left group"
                  >
                    {/* Vänster: Tydlig rund ikon & kategorinamn */}
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <CategoryIcon icon={cat.icon} color={catColor} size="sm" categoryName={cat.name} />
                      <div className="min-w-0 flex flex-col justify-center">
                        <span className="text-card-title text-[var(--text-primary)] truncate">
                          {cat.name}
                        </span>
                        {fixedSpent > 0 && effectiveMode === 'budget' && (
                          <span className="text-xs text-[var(--text-tertiary)] truncate mt-0.5 font-amount tabular-nums">
                            {isEn
                              ? `incl. ${formatAmount(fixedSpent, config.language)} ${curr} fixed`
                              : `varav ${formatAmount(fixedSpent, config.language)} ${curr} fast`}
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
                            className="flex items-center bg-[var(--surface-input)] rounded-[var(--radius-button-sm,10px)] px-3 py-1.5 min-h-[40px] border border-[var(--accent-color)] shadow-none"
                          >
                            <input
                              type="text"
                              autoFocus
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={inlineInputValue}
                              onBlur={() => {
                                const enteredVal = Number(inlineInputValue) || 0;
                                const finalVal = enteredVal > 0 ? Math.max(fixedSpent, enteredVal) : 0;
                                const updatedCategories = (config.categories || []).map((c) => {
                                  if (c.name === cat.name) {
                                    return { ...c, budget: finalVal > 0 ? finalVal : null };
                                  }
                                  return c;
                                });
                                const hasAnyBudget = updatedCategories.some(
                                  (c) => typeof c.budget === 'number' && c.budget > 0
                                );
                                if (hasAnyBudget && userId) {
                                  try {
                                    localStorage.setItem(`dejz_has_saved_initial_budget_${userId}`, 'true');
                                  } catch (_e) {
                                    // ignore
                                  }
                                }
                                setConfig({ ...config, categories: updatedCategories, hasSavedInitialBudget: hasAnyBudget });
                                setEditingCategoryName(null);
                              }}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setInlineInputValue(val);
                                const enteredVal = Number(val) || 0;
                                const updatedCategories = (config.categories || []).map((c) => {
                                  if (c.name === cat.name) {
                                    return { ...c, budget: enteredVal > 0 ? enteredVal : null };
                                  }
                                  return c;
                                });
                                const hasAnyBudget = updatedCategories.some(
                                  (c) => typeof c.budget === 'number' && c.budget > 0
                                );
                                if (hasAnyBudget && userId) {
                                  try {
                                    localStorage.setItem(`dejz_has_saved_initial_budget_${userId}`, 'true');
                                  } catch (_e) {
                                    // ignore
                                  }
                                }
                                setConfig({ ...config, categories: updatedCategories, hasSavedInitialBudget: hasAnyBudget });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-20 bg-transparent border-none text-right text-list-amount text-[var(--text-primary)] font-amount tabular-nums outline-none"
                              placeholder="0"
                            />
                            <span className="text-secondary text-[var(--text-secondary)] pl-1 select-none">
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
                            className="px-3 py-1.5 min-h-[40px] rounded-[var(--radius-button-sm,10px)] bg-[var(--surface-input)] hover:bg-[var(--surface-hover)] transition-colors border-none cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <span className="text-list-amount font-amount tabular-nums text-[var(--text-primary)]">
                              {catBudget > 0 ? formatAmount(catBudget, config.language) : '0'}
                            </span>
                            <span className="text-secondary text-[var(--text-secondary)]">
                              {curr}
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-[var(--text-tertiary)] shrink-0 pl-2 group-hover:text-[var(--text-secondary)] transition-colors">
                        <ChevronRight size={18} strokeWidth={2} />
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
                  titleWeight="semibold"
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
        <div className="flex flex-col items-center gap-1.5 pt-1">
          {effectiveMode !== 'categories' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowResetBudgetConfirm(true)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
            >
              {isEn ? 'Reset budget to 0' : 'Nollställ budget'}
            </Button>
          )}
          {effectiveMode !== 'budget' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsResetCategoriesModalOpen(true)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              {isEn ? 'Reset categories to default' : 'Återställ kategorier'}
            </Button>
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
              ? `This category is used by ${deleteMigrationData.count} items. Choose which category to move them to.`
              : `Kategorin används av ${deleteMigrationData.count} poster. Välj vilken kategori de ska flyttas till.`}
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
              ? 'Restore standard categories? Items using custom categories will be moved to Other.'
              : 'Vill du återställa till standardkategorierna? Utgifter och fasta kostnader med egna kategorier flyttas automatiskt till Övrigt.'
          }
          confirmText={isEn ? 'Reset' : 'Återställ'}
          cancelText={isEn ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={async () => {
            const defaultExpenseNames = new Set(
              DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name.trim().toLowerCase())
            );
            const defaultIncomeNames = new Set(
              DEFAULT_INCOME_CATEGORIES.map((c) => c.name.trim().toLowerCase())
            );

            // Find all custom / orphaned expense category names across categories, fixedExpenses, and transactions
            const customExpenseNames = new Set<string>();
            (config.categories || []).forEach((c) => {
              const n = (c.name || '').trim();
              if (n && !defaultExpenseNames.has(n.toLowerCase())) customExpenseNames.add(n);
            });
            (fixedExpenses || []).forEach((fe) => {
              const n = (fe.category || '').trim();
              if (n && !defaultExpenseNames.has(n.toLowerCase())) customExpenseNames.add(n);
            });
            (transactions || []).forEach((tx) => {
              if (tx.type !== 'income') {
                const n = (tx.category || '').trim();
                if (n && !defaultExpenseNames.has(n.toLowerCase())) customExpenseNames.add(n);
              }
              if (Array.isArray(tx.splits)) {
                tx.splits.forEach((s: any) => {
                  const sn = (s.category || '').trim();
                  if (sn && !defaultExpenseNames.has(sn.toLowerCase())) customExpenseNames.add(sn);
                });
              }
            });

            // Find all custom / orphaned income category names
            const customIncomeNames = new Set<string>();
            (config.incomeCategories || []).forEach((c) => {
              const n = (c.name || '').trim();
              if (n && !defaultIncomeNames.has(n.toLowerCase())) customIncomeNames.add(n);
            });
            (incomes || []).forEach((inc) => {
              const n = (inc.category || '').trim();
              if (n && !defaultIncomeNames.has(n.toLowerCase())) customIncomeNames.add(n);
            });
            (transactions || []).forEach((tx) => {
              if (tx.type === 'income') {
                const n = (tx.category || '').trim();
                if (n && !defaultIncomeNames.has(n.toLowerCase())) customIncomeNames.add(n);
              }
            });

            for (const oldExpName of customExpenseNames) {
              await onRenameCategory?.('expense', oldExpName, 'Övrigt');
            }
            for (const oldIncName of customIncomeNames) {
              await onRenameCategory?.('income', oldIncName, 'Övrig inkomst');
            }

            const updatedConfig = {
              ...config,
              categories: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, budget: null })),
              incomeCategories: DEFAULT_INCOME_CATEGORIES,
              hasSavedInitialBudget: false,
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

    </div>
  );
}
