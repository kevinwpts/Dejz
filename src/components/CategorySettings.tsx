import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash,
  Check,
  X,
  ArrowCounterClockwise,
  CaretRight,
} from '@phosphor-icons/react';
import { Category } from '../types';
import { BottomSheet } from './ui/BottomSheet';
import { ConfirmDialog } from './ui/ConfirmDialog';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../constants';
import {
  getStoredExpenseCategories,
  saveStoredExpenseCategories,
  getStoredIncomeCategories,
  saveStoredIncomeCategories,
  propagateCategoryChangeInCache,
  clearCategoryRemap,
} from '../utils/appCache';
import { CategoryIcon, AVAILABLE_CATEGORY_ICONS } from './CategoryIcon';
import { TransactionItem, FixedExpenseItem, IncomeItem } from './HomeTab';

interface CategorySettingsProps {
  transactions?: TransactionItem[];
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  onCategoryMutated?: (
    oldName: string,
    newName: string,
    kind: 'expense' | 'income'
  ) => void;
}

export const CategorySettings: React.FC<CategorySettingsProps> = ({
  transactions = [],
  fixedExpenses = [],
  incomes = [],
  onCategoryMutated,
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(() =>
    getStoredExpenseCategories()
  );
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(() =>
    getStoredIncomeCategories()
  );

  // Sheet modal state
  const [sheetMode, setSheetMode] = useState<'new' | 'edit' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('tag');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;

  // Count how many items use each category
  const usageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (activeTab === 'expense') {
      for (const tx of transactions) {
        if (tx.type !== 'income') {
          const k = (tx.category || 'Övrigt').toLowerCase().trim();
          counts[k] = (counts[k] || 0) + 1;
        }
      }
      for (const f of fixedExpenses) {
        const k = (f.category || 'Räkningar').toLowerCase().trim();
        counts[k] = (counts[k] || 0) + 1;
      }
    } else {
      for (const inc of incomes) {
        const k = (inc.category || 'Lön').toLowerCase().trim();
        counts[k] = (counts[k] || 0) + 1;
      }
      for (const tx of transactions) {
        if (tx.type === 'income') {
          const k = (tx.category || 'Lön').toLowerCase().trim();
          counts[k] = (counts[k] || 0) + 1;
        }
      }
    }
    return counts;
  }, [activeTab, transactions, fixedExpenses, incomes]);

  const openEditSheet = (cat: Category) => {
    setSelectedCategory(cat);
    setFormName(cat.name);
    setFormIcon(cat.icon || 'tag');
    setShowDeleteConfirm(false);
    setSheetMode('edit');
  };

  const openNewSheet = () => {
    setSelectedCategory(null);
    setFormName('');
    setFormIcon('tag');
    setShowDeleteConfirm(false);
    setSheetMode('new');
  };

  const closeSheet = () => {
    setSheetMode(null);
    setSelectedCategory(null);
    setShowDeleteConfirm(false);
  };

  const handleSaveSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) return;

    if (sheetMode === 'edit' && selectedCategory) {
      const oldName = selectedCategory.name || trimmed;
      const isProtectedOvrigt = oldName.toLowerCase().trim() === 'övrigt';
      const finalName = isProtectedOvrigt ? 'Övrigt' : trimmed;

      if (activeTab === 'expense') {
        const next = expenseCategories.map((c) =>
          c.id === selectedCategory.id ? { ...c, name: finalName, icon: formIcon } : c
        );
        setExpenseCategories(next);
        saveStoredExpenseCategories(next);
      } else {
        const next = incomeCategories.map((c) =>
          c.id === selectedCategory.id ? { ...c, name: finalName, icon: formIcon } : c
        );
        setIncomeCategories(next);
        saveStoredIncomeCategories(next);
      }

      if (oldName.toLowerCase().trim() !== finalName.toLowerCase().trim()) {
        propagateCategoryChangeInCache(oldName, finalName);
        if (onCategoryMutated) {
          onCategoryMutated(oldName, finalName, activeTab);
        }
      } else if (onCategoryMutated) {
        onCategoryMutated(finalName, finalName, activeTab);
      }
      closeSheet();
      return;
    }

    if (sheetMode === 'new') {
      if (currentList.some((c) => c.name.toLowerCase().trim() === trimmed.toLowerCase())) {
        closeSheet();
        return;
      }

      const newId = `custom-${Date.now()}-${trimmed.toLowerCase().replace(/\s+/g, '-')}`;
      const newCat: Category = {
        id: newId,
        name: trimmed,
        icon: formIcon || 'tag',
      };

      if (activeTab === 'expense') {
        const ovrigtIdx = expenseCategories.findIndex(
          (c) => c.name.toLowerCase().trim() === 'övrigt'
        );
        const next =
          ovrigtIdx >= 0
            ? [
                ...expenseCategories.slice(0, ovrigtIdx),
                newCat,
                ...expenseCategories.slice(ovrigtIdx),
              ]
            : [...expenseCategories, newCat];
        setExpenseCategories(next);
        saveStoredExpenseCategories(next);
      } else {
        const ovrigtIdx = incomeCategories.findIndex(
          (c) => c.name.toLowerCase().trim() === 'övrigt'
        );
        const next =
          ovrigtIdx >= 0
            ? [
                ...incomeCategories.slice(0, ovrigtIdx),
                newCat,
                ...incomeCategories.slice(ovrigtIdx),
              ]
            : [...incomeCategories, newCat];
        setIncomeCategories(next);
        saveStoredIncomeCategories(next);
      }

      closeSheet();
    }
  };

  const handleDelete = () => {
    if (!selectedCategory) return;
    if (selectedCategory.name.toLowerCase().trim() === 'övrigt') return;

    if (activeTab === 'expense') {
      if (expenseCategories.length <= 1) return;
      const next = expenseCategories.filter((c) => c.id !== selectedCategory.id);
      setExpenseCategories(next);
      saveStoredExpenseCategories(next);
    } else {
      if (incomeCategories.length <= 1) return;
      const next = incomeCategories.filter((c) => c.id !== selectedCategory.id);
      setIncomeCategories(next);
      saveStoredIncomeCategories(next);
    }

    propagateCategoryChangeInCache(selectedCategory.name, 'Övrigt');
    if (onCategoryMutated) {
      onCategoryMutated(selectedCategory.name, 'Övrigt', activeTab);
    }
    closeSheet();
  };

  const handleResetToDefaults = () => {
    clearCategoryRemap();
    if (activeTab === 'expense') {
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
      saveStoredExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
      if (onCategoryMutated) {
        onCategoryMutated('', '', 'expense');
      }
    } else {
      setIncomeCategories(DEFAULT_INCOME_CATEGORIES);
      saveStoredIncomeCategories(DEFAULT_INCOME_CATEGORIES);
      if (onCategoryMutated) {
        onCategoryMutated('', '', 'income');
      }
    }
    setShowResetConfirm(false);
  };

  const isProtectedOvrigt =
    sheetMode === 'edit' &&
    selectedCategory?.name.toLowerCase().trim() === 'övrigt';
  const selectedUsageCount = selectedCategory
    ? usageCounts[selectedCategory.name.toLowerCase().trim()] || 0
    : 0;

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Utgifter vs Inkomster */}
      <div className="ui-segmented-surface grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          className={`ui-segmented-tab py-2 ${
            activeTab === 'expense' ? 'ui-segmented-tab-active' : ''
          }`}
        >
          Utgifter
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`ui-segmented-tab py-2 ${
            activeTab === 'income' ? 'ui-segmented-tab-active' : ''
          }`}
        >
          Inkomster
        </button>
      </div>

      {/* Spacious Divided List of Categories with Inset Dividers */}
      <div className="ui-admin-card">
        {currentList.map((cat) => {
          const count = usageCounts[cat.name.toLowerCase().trim()] || 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => openEditSheet(cat)}
              className="ui-admin-row"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <CategoryIcon category={cat.name} iconId={cat.icon} size={17} badge={false} />
                </span>
                <span className="font-medium text-[13px] sm:text-[13.5px] text-[var(--text-primary)] truncate">
                  {cat.name}
                </span>
              </div>
              <div className="ui-admin-right">
                <span className="ui-admin-value">
                  {count > 0 ? count : ''}
                </span>
                <span className="ui-admin-chevron">
                  <CaretRight size={13} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Action Bar: Ny kategori + Diskret återställning */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={openNewSheet}
          className="w-full ui-btn-primary"
        >
          <Plus size={15} weight="bold" />
          <span>Ny kategori</span>
        </button>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="ui-reset-btn"
          >
            <ArrowCounterClockwise size={13} />
            <span>Återställ standardkategorier</span>
          </button>
        </div>

        <ConfirmDialog
          isOpen={showResetConfirm}
          title="Återställ standardkategorier?"
          description="Dina egna kategorier ersätts med standarduppsättningen."
          confirmLabel="Återställ"
          variant="primary"
          onConfirm={handleResetToDefaults}
          onCancel={() => setShowResetConfirm(false)}
        />
      </div>

      {/* ============================================================== */}
      {/* DEDICATED CATEGORY SHEET MODAL (Redigera eller Ny kategori)    */}
      {/* ============================================================== */}
      <BottomSheet isOpen={sheetMode !== null} onClose={closeSheet}>
        {/* Top Header */}
        <div className="ui-sheet-header mb-4">
          <span className="ui-sheet-title">
            {sheetMode === 'new' ? 'Ny kategori' : 'Redigera kategori'}
          </span>
          <button
            type="button"
            onClick={closeSheet}
            className="ui-icon-btn"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSaveSheet} className="space-y-4">
          {/* Stort och tydligt inmatningskort med live-ikon */}
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4">
            <label className="flex items-center gap-3.5 cursor-text">
              <div className="w-11 h-11 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                <CategoryIcon
                  category={formName || 'Kategori'}
                  iconId={formIcon}
                  size={22}
                  badge={false}
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                  Namn på kategori
                </span>
                {isProtectedOvrigt ? (
                  <span className="font-display font-semibold text-lg sm:text-xl text-[var(--text-secondary)] block">
                    {formName} (standard)
                  </span>
                ) : (
                  <input
                    type="text"
                    autoFocus={sheetMode === 'new'}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="t.ex. Uteliv eller Husdjur"
                    required
                    className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                  />
                )}
              </div>
            </label>
          </div>

          {/* Ikonväljare */}
          <div className="space-y-1.5">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              Välj ikon
            </span>
            <div className="grid grid-cols-6 gap-2 p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] max-h-56 overflow-y-auto">
              {AVAILABLE_CATEGORY_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = formIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormIcon(item.id)}
                    className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] scale-[1.03]'
                        : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-color)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <IconComponent size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="submit"
              className="ui-btn-primary"
            >
              <Check size={14} weight="bold" />
              <span>Spara kategori</span>
            </button>

            {sheetMode === 'edit' && !isProtectedOvrigt && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="ui-btn-danger"
              >
                <Trash size={14} />
                <span>Ta bort kategori</span>
              </button>
            )}
          </div>

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            title="Ta bort kategori?"
            description={
              selectedUsageCount > 0
                ? `${selectedUsageCount} poster flyttas till Övrigt.`
                : `${formName} tas bort.`
            }
            confirmLabel="Ta bort"
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </form>
      </BottomSheet>
    </div>
  );
};
