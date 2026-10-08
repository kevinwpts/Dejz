import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Check } from 'lucide-react';
import { Config, Income, FixedExpense, Frequency, Category } from '../types';
import { TranslationKey } from '../i18n';
import { CategoryIcon } from './CategoryIcon';
import { CategoryModal } from './CategoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Button, Modal } from './ui';
import { formatAmount } from '../utils/format';
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

  // --- Calculations ---
  const activeExpenses = getActiveFixedExpenses(fixedExpenses);

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
  const handleEditCategory = (
    type: 'income' | 'expense',
    index: number,
    name: string,
    icon: string,
    color?: string,
    budget?: number | null
  ) => {
    setCategoryModalData({ type, index, name, icon, color, budget });
    setIsCategoryModalOpen(true);
  };

  const handleAddCategory = (type: 'income' | 'expense') => {
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
    <div className="space-y-5 font-sans pb-10 max-w-2xl mx-auto w-full">
      {/* 0. Flikväljare: Utgifter / Inkomster (döljs i rent budgetläge) */}
      {effectiveMode !== 'budget' && (
        <div className="flex bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-[16px] gap-1">
          <button
            type="button"
            onClick={() => setActiveCategoryType('expense')}
            className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer border-none ${
              activeCategoryType === 'expense'
                ? 'bg-white dark:bg-[#1C1C1E] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isEn ? 'Expenses' : 'Utgifter'}
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryType('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer border-none ${
              activeCategoryType === 'income'
                ? 'bg-white dark:bg-[#1C1C1E] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isEn ? 'Income' : 'Inkomster'}
          </button>
        </div>
      )}

      {activeCategoryType === 'expense' ? (
        <>
          {/* 1. Toppmodul (visas endast vid budgetfördelning) */}
          {effectiveMode !== 'categories' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--surface-color)] rounded-[20px] p-4 space-y-2.5"
            >
              <div className="flex items-baseline justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {isEn ? 'Left to allocate' : 'Kvar att fördela'}
                  </span>
                  <div
                    className={`text-2xl font-extrabold tracking-tight font-amount tabular-nums ${
                      isOverAllocated
                        ? 'text-rose-600 dark:text-rose-400'
                        : remainingToAllocate === 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {remainingToAllocate === 0
                      ? '0 kr'
                      : `${formatAmount(remainingToAllocate, config.language)} ${curr}`}
                  </div>
                </div>

                <div className="text-right text-xs font-semibold text-[var(--text-secondary)] font-amount tabular-nums">
                  {formatAmount(totalCategoryAllocated, config.language)} / {formatAmount(totalPoolToAllocate, config.language)} {curr}
                </div>
              </div>

              {/* Diskret förloppslinje */}
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
            </motion.div>
          )}

          {/* 2. Utgiftskategorier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {effectiveMode === 'budget' 
                  ? (isEn ? 'Category Budgets' : 'Kategoribudgetar')
                  : (isEn ? 'Expense Categories' : 'Utgiftskategorier')}
              </span>
              {effectiveMode !== 'budget' && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Plus size={14} strokeWidth={2.5} />}
                  onClick={() => handleAddCategory('expense')}
                >
                  {t('newCategory')}
                </Button>
              )}
            </div>

            {effectiveMode === 'categories' ? (
              /* Rent kategoriläge: enhetliga kort för namn, ikon och färg */
              <div className="grid grid-cols-2 gap-3">
                {categoriesList.map((cat, index) => {
                  const catColor = cat.color || getCategoryColor(cat.name, config?.categories);
                  return (
                    <div
                      key={cat.id || index}
                      onClick={() => handleEditCategory('expense', index, cat.name, cat.icon, cat.color, cat.budget)}
                      style={{
                        backgroundColor: `${catColor}18`,
                        borderColor: `${catColor}35`,
                      }}
                      className="relative p-3.5 rounded-[18px] border flex flex-col justify-between h-[105px] transition-all cursor-pointer active:scale-[0.98] shadow-xs overflow-hidden group hover:border-black/20 dark:hover:border-white/30"
                    >
                      <div className="flex items-center justify-between">
                        <CategoryIcon icon={cat.icon} color={catColor} solidBackground whiteIcon size="md" />
                      </div>

                      <span className="text-xs font-bold text-[var(--text-primary)] block truncate leading-tight">
                        {cat.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Budgetläge: kort med inline budgetfördelning */
              <div className="grid grid-cols-2 gap-3">
              {categoriesList.map((cat, index) => {
                const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
                const catBudget = Math.max(Number(cat.budget) || 0, fixedSpent);
                const isEditingThis = editingCategoryName === cat.name;
                const catColor = cat.color || getCategoryColor(cat.name, config?.categories);

                return (
                  <div
                    key={cat.id || index}
                    onClick={(e) => {
                      if (!isEditingThis && !(e.target as HTMLElement).closest('input')) {
                        if (effectiveMode === 'budget') {
                          setEditingCategoryName(cat.name);
                          setInlineInputValue(catBudget > 0 ? String(catBudget) : '');
                        } else {
                          handleEditCategory('expense', index, cat.name, cat.icon, cat.color, cat.budget);
                        }
                      }
                    }}
                    style={{
                      backgroundColor: `${catColor}18`,
                      borderColor: `${catColor}35`,
                    }}
                    className="relative p-3.5 rounded-[18px] border flex flex-col justify-between h-[125px] transition-all cursor-pointer active:scale-[0.98] shadow-xs overflow-hidden group hover:border-black/20 dark:hover:border-white/30"
                  >
                    <div className="flex items-center justify-between">
                      <CategoryIcon icon={cat.icon} color={catColor} solidBackground whiteIcon size="md" />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-[var(--text-primary)] block truncate leading-tight">
                        {cat.name}
                      </span>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full"
                      >
                        {isEditingThis ? (
                          <div className="flex items-center justify-between bg-white/80 dark:bg-black/40 rounded-[10px] px-2 py-1 border border-[var(--accent-color)]">
                            <input
                              type="text"
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
                              className="w-full bg-transparent border-none text-left text-xs font-bold text-[var(--text-primary)] font-amount tabular-nums outline-none placeholder-[var(--text-tertiary)]"
                              placeholder="0"
                            />
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] select-none pl-1">
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
                            className="w-full py-1 px-2 rounded-[10px] bg-white/60 dark:bg-black/30 hover:bg-white/90 dark:hover:bg-black/50 transition-colors flex items-center justify-between border border-black/5 dark:border-white/10 cursor-pointer backdrop-blur-xs"
                          >
                            <span className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)]">
                              {catBudget > 0 ? `${formatAmount(catBudget, config.language)} ${curr}` : `0 ${curr}`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Inkomstkategorier */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {isEn ? 'Income Categories' : 'Inkomstkategorier'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={14} strokeWidth={2.5} />}
              onClick={() => handleAddCategory('income')}
            >
              {t('newCategory')}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {incomeCategoriesList.map((cat, index) => {
              const catColor = cat.color || getCategoryColor(cat.name, config?.incomeCategories);
              return (
                <div
                  key={cat.id || index}
                  onClick={() => handleEditCategory('income', index, cat.name, cat.icon, cat.color)}
                  style={{
                    backgroundColor: `${catColor}18`,
                    borderColor: `${catColor}35`,
                  }}
                  className="relative p-3.5 rounded-[18px] border flex flex-col justify-between h-[105px] transition-all cursor-pointer active:scale-[0.98] shadow-xs overflow-hidden group hover:border-black/20 dark:hover:border-white/30"
                >
                  <div className="flex items-center justify-between">
                    <CategoryIcon icon={cat.icon} color={catColor} solidBackground whiteIcon size="md" />
                  </div>

                  <span className="text-xs font-bold text-[var(--text-primary)] block truncate leading-tight">
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Minimal footer */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={handleSaveBudgetDone}
          className="w-full h-11 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-none"
        >
          <Check size={16} strokeWidth={2.5} />
          {isEn ? 'Done' : 'Klar'}
        </button>

        <div className="flex items-center justify-center gap-3 pt-1">
          {effectiveMode !== 'categories' && (
            <button
              type="button"
              onClick={() => setShowResetBudgetConfirm(true)}
              className="py-1 px-2 text-xs font-medium text-[var(--text-tertiary)] hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              {isEn ? 'Reset budget' : 'Nollställ budget'}
            </button>
          )}
          {effectiveMode === 'all' && (
            <span className="text-[var(--text-tertiary)] opacity-30">•</span>
          )}
          {effectiveMode !== 'budget' && (
            <button
              type="button"
              onClick={() => setIsResetCategoriesModalOpen(true)}
              className="py-1 px-2 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {isEn ? 'Reset categories' : 'Återställ kategorier'}
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
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

      {showResetBudgetConfirm && (
        <ConfirmModal
          isOpen={showResetBudgetConfirm}
          title={isEn ? 'Reset budget?' : 'Nollställ budget?'}
          message={
            isEn
              ? 'Reset all category budgets to 0?'
              : 'Vill du nollställa alla kategoribudgetar till 0 kr?'
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
          bodyClassName="p-5 space-y-4"
        >
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
            {isEn
              ? `This category is used by ${deleteMigrationData.count} transactions. Choose which category to move them to.`
              : `Kategorin används av ${deleteMigrationData.count} transaktioner. Välj vilken kategori de ska flyttas till.`}
          </p>
          <div className="space-y-1.5">
            <select
              value={targetMigrationId}
              onChange={(e) => setTargetMigrationId(e.target.value)}
              className="w-full h-11 bg-[var(--surface-muted)] border border-black/[0.06] dark:border-white/[0.08] rounded-[14px] px-3 text-sm font-medium text-[var(--text-primary)] outline-none"
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
    </div>
  );
}
