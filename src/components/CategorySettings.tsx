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
            activeTab === 'expense' ? 'ui-segmented-tab-active font-bold' : ''
          }`}
        >
          Utgifter
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`ui-segmented-tab py-2 ${
            activeTab === 'income' ? 'ui-segmented-tab-active font-bold' : ''
          }`}
        >
          Inkomster
        </button>
      </div>

      {/* Clean Divided List of Categories */}
      <div className="ui-group-card">
        {currentList.map((cat) => {
          const count = usageCounts[cat.name.toLowerCase().trim()] || 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => openEditSheet(cat)}
              className="ui-row-btn"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <CategoryIcon category={cat.name} iconId={cat.icon} size={15} badge={true} />
                <span className="ui-row-title">
                  {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {count > 0 && (
                  <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums">
                    {count}
                  </span>
                )}
                <CaretRight size={14} className="text-[var(--text-muted)]" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Action Bar: Ny kategori + Återställ */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={openNewSheet}
          className="w-full ui-btn-primary"
        >
          <Plus size={15} weight="bold" />
          <span>Ny kategori</span>
        </button>

        {showResetConfirm ? (
          <div className="ui-confirm-neutral">
            <span className="font-medium text-[var(--text-secondary)]">
              Återställa standardkategorier?
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="ui-btn-sm"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="ui-btn-sm-primary"
              >
                Återställ
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="py-1.5 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowCounterClockwise size={13} />
              <span>Återställ standardkategorier</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DEDICATED CATEGORY SHEET MODAL (Redigera eller Ny kategori)    */}
      {/* ============================================================== */}
      <BottomSheet isOpen={sheetMode !== null} onClose={closeSheet}>
        {/* Top Header */}
        <div className="ui-sheet-header mb-5">
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

        {/* Hero 64x64 Live Preview */}
        <div className="ui-hero-header">
          <div className="ui-hero-icon">
            <CategoryIcon
              category={formName || 'Kategori'}
              iconId={formIcon}
              size={28}
              badge={false}
            />
          </div>
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)] truncate px-4">
            {formName.trim() || 'Namnlös kategori'}
          </h2>
        </div>

        <form onSubmit={handleSaveSheet} className="space-y-4">
          <div className="ui-sheet-group">
            <label className="ui-input-row">
              <span className="text-[var(--text-muted)] shrink-0">Namn</span>
              <input
                type="text"
                value={formName}
                disabled={isProtectedOvrigt}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ange namn..."
                required
                className="ui-inline-input disabled:opacity-60"
              />
            </label>
          </div>

          {/* Ikonväljare */}
          <div className="space-y-1.5">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
              Ikon
            </span>
            <div className="grid grid-cols-6 gap-2 p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] max-h-52 overflow-y-auto">
              {AVAILABLE_CATEGORY_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = formIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormIcon(item.id)}
                    className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                        : 'bg-[var(--surface-color)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <IconComponent size={17} />
                  </button>
                );
              })}
            </div>
          </div>

          {showDeleteConfirm ? (
            <div className="ui-confirm-danger">
              <span className="font-medium text-rose-700 dark:text-rose-300">
                {selectedUsageCount > 0
                  ? `Flytta ${selectedUsageCount} poster till Övrigt?`
                  : 'Ta bort kategorin?'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                >
                  Ta bort
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-2 ${
                sheetMode === 'edit' && !isProtectedOvrigt ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {sheetMode === 'edit' && !isProtectedOvrigt && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="ui-btn-danger"
                >
                  <Trash size={14} />
                  <span>Ta bort</span>
                </button>
              )}

              <button
                type="submit"
                className="ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>Spara</span>
              </button>
            </div>
          )}
        </form>
      </BottomSheet>
    </div>
  );
};
