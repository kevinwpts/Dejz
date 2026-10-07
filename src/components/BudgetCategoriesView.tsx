import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Check, RotateCcw, Pencil } from 'lucide-react';
import { Config, Income, FixedExpense, Frequency, Category } from '../types';
import { TranslationKey } from '../i18n';
import { CategoryIcon } from './CategoryIcon';
import { CategoryModal } from './CategoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Button, Modal } from './ui';
import { formatAmount } from '../utils/format';
import { getCategoryColor } from '../utils/categoryColors';
import { DEFAULT_EXPENSE_CATEGORIES } from '../constants';

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
  onDone,
}: BudgetCategoriesViewProps) {
  const curr = config?.currency || 'kr';

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

  const categoriesList = (config.categories as Category[]) || [];

  return (
    <div className="space-y-6 font-sans pb-12 max-w-md mx-auto">
      {/* 1. Tydlig budgetöversikt i en toppmodul */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-[var(--surface-color)] rounded-[22px] p-5 sm:p-6 border-none shadow-none space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[var(--text-secondary)] tracking-tight">
            {config.language === 'en' ? 'Budget overview' : 'Budgetöversikt'}
          </span>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {categoriesList.length} {config.language === 'en' ? 'categories' : 'kategorier'}
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
      </motion.div>

      {/* 2. Kategorikorten med direkt budget och redigering */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
            {config.language === 'en' ? 'Expense Categories & Budget' : 'Utgiftskategorier & Budget'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} strokeWidth={2} />}
            onClick={() => handleAddCategory('expense')}
          >
            {t('newCategory')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {categoriesList.map((cat, index) => {
            const fixedSpent = Math.round(getFixedSpentForCategory(cat.name));
            const catBudget = Math.max(Number(cat.budget) || 0, fixedSpent);
            const isEditingThis = editingCategoryName === cat.name;

            return (
              <div
                key={cat.id || index}
                style={{ backgroundColor: cat.color || getCategoryColor(cat.name, config?.categories) }}
                className="relative p-3.5 sm:p-4 rounded-[22px] flex flex-col justify-between h-[155px] sm:h-[165px] transition-all shadow-sm overflow-hidden text-white"
              >
                {/* Top: Icon & Edit button */}
                <div className="flex items-start justify-between w-full">
                  <div
                    onClick={() => handleEditCategory('expense', index, cat.name, cat.icon, cat.color, cat.budget)}
                    className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    title={config.language === 'en' ? 'Edit icon & color' : 'Ändra ikon och färg'}
                  >
                    <CategoryIcon icon={cat.icon} size="md" noBackground whiteIcon />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditCategory('expense', index, cat.name, cat.icon, cat.color, cat.budget)}
                    className="w-7 h-7 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer active:scale-90"
                    title={config.language === 'en' ? 'Edit name, icon, color & budget' : 'Ändra namn, ikon, färg & budget'}
                  >
                    <Pencil size={13} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Middle: Category Name & Fixed expense info if any */}
                <div
                  onClick={() => handleEditCategory('expense', index, cat.name, cat.icon, cat.color, cat.budget)}
                  className="cursor-pointer min-w-0"
                >
                  <span className="text-[14px] sm:text-[15px] font-bold text-white block truncate drop-shadow-xs">
                    {cat.name}
                  </span>
                  {fixedSpent > 0 ? (
                    <span className="text-[10.5px] sm:text-[11px] font-medium text-white/85 block truncate mt-0.5">
                      {formatAmount(fixedSpent, config.language)} {curr} {config.language === 'en' ? 'fixed' : 'fast'}
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-normal text-white/70 block truncate mt-0.5">
                      {config.language === 'en' ? 'Budget' : 'Budget'}
                    </span>
                  )}
                </div>

                {/* Bottom: Budget Input Pill */}
                <div className="w-full pt-1">
                  {isEditingThis ? (
                    <div className="flex items-center justify-between bg-black/35 backdrop-blur-md rounded-[12px] px-2.5 py-1.5 border border-white/40">
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
                            // ignore localStorage error
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
                        className="w-full bg-transparent border-none text-left text-xs sm:text-sm font-bold text-white font-amount tabular-nums outline-none placeholder-white/50"
                        placeholder="0"
                      />
                      <span className="text-[11px] font-bold text-white/80 select-none pl-1">
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
                      className="w-full py-1.5 px-2.5 rounded-[12px] bg-black/20 hover:bg-black/30 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-between border border-white/10"
                    >
                      <span className="text-[12px] sm:text-[13px] font-bold font-amount tabular-nums text-white">
                        {catBudget > 0 ? `${formatAmount(catBudget, config.language)} ${curr}` : `0 ${curr}`}
                      </span>
                      <span className="text-[10px] font-semibold text-white/80">
                        {catBudget > 0 ? (config.language === 'en' ? 'Edit' : 'Ändra') : (config.language === 'en' ? 'Set' : 'Sätt')}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Dashed Add New Category Card */}
          <button
            type="button"
            onClick={() => handleAddCategory('expense')}
            className="h-[155px] sm:h-[165px] p-4 rounded-[22px] border-2 border-dashed border-black/10 dark:border-white/15 hover:border-[var(--accent-color)] dark:hover:border-[var(--accent-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] group-hover:bg-[var(--accent-color)]/10 transition-colors">
              <Plus size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors text-center">
              {t('newCategory')}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Spara & Nollställ / Återställ */}
      <div className="pt-2 space-y-2.5">
        <button
          type="button"
          onClick={handleSaveBudgetDone}
          className="w-full h-12 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-none"
        >
          <Check size={16} strokeWidth={2.5} />
          {config.language === 'en' ? 'Done, save budget' : 'Klar, spara budgeten'}
        </button>

        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => setShowResetBudgetConfirm(true)}
            className="py-2 px-3 text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={13} strokeWidth={2} />
            <span>{config.language === 'en' ? 'Reset budget' : 'Nollställ budgeten'}</span>
          </button>

          <span className="text-[var(--text-tertiary)] opacity-40">•</span>

          <button
            type="button"
            onClick={() => setIsResetCategoriesModalOpen(true)}
            className="py-2 px-3 text-center text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={13} strokeWidth={2} />
            <span>
              {config.language === 'en'
                ? 'Reset categories'
                : 'Återställ kategorier'}
            </span>
          </button>
        </div>
      </div>

      {/* --- Modals --- */}
      {/* 1. Category Modal (Create / Edit name, icon, color, budget, delete) */}
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
              ? 'This will restore all standard expense categories with their original colors and icons.'
              : 'Detta återställer alla utgiftskategorier till standardlistan med ursprungliga ikoner och färger.'
          }
          confirmText={config.language === 'en' ? 'Reset' : 'Återställ'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={() => {
            setConfig({
              ...config,
              categories: DEFAULT_EXPENSE_CATEGORIES,
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
