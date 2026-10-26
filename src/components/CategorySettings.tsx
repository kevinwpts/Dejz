import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { Category } from '../types';
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

  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('tag');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('tag');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'tag');
    setIsAdding(false);
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    const targetCat = currentList.find((c) => c.id === id);
    const oldName = targetCat?.name || trimmed;
    const isProtectedOvrigt = oldName.toLowerCase().trim() === 'övrigt';
    const finalName = isProtectedOvrigt ? 'Övrigt' : trimmed;

    if (activeTab === 'expense') {
      const next = expenseCategories.map((c) =>
        c.id === id ? { ...c, name: finalName, icon: editIcon } : c
      );
      setExpenseCategories(next);
      saveStoredExpenseCategories(next);
    } else {
      const next = incomeCategories.map((c) =>
        c.id === id ? { ...c, name: finalName, icon: editIcon } : c
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
      // Trigger re-render for icon updates
      onCategoryMutated(finalName, finalName, activeTab);
    }

    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const targetCat = currentList.find((c) => c.id === id);
    if (!targetCat) return;
    if (targetCat.name.toLowerCase().trim() === 'övrigt') return;

    if (activeTab === 'expense') {
      if (expenseCategories.length <= 1) return;
      const next = expenseCategories.filter((c) => c.id !== id);
      setExpenseCategories(next);
      saveStoredExpenseCategories(next);
    } else {
      if (incomeCategories.length <= 1) return;
      const next = incomeCategories.filter((c) => c.id !== id);
      setIncomeCategories(next);
      saveStoredIncomeCategories(next);
    }

    propagateCategoryChangeInCache(targetCat.name, 'Övrigt');
    if (onCategoryMutated) {
      onCategoryMutated(targetCat.name, 'Övrigt', activeTab);
    }
    setConfirmDeleteId(null);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // Prevent exact duplicate category names
    if (currentList.some((c) => c.name.toLowerCase().trim() === trimmed.toLowerCase())) {
      setNewCatName('');
      setIsAdding(false);
      return;
    }

    const newId = `custom-${Date.now()}-${trimmed.toLowerCase().replace(/\s+/g, '-')}`;
    const newCat: Category = {
      id: newId,
      name: trimmed,
      icon: newCatIcon || 'tag',
    };

    if (activeTab === 'expense') {
      // Insert right before 'Övrigt'
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

    setNewCatName('');
    setNewCatIcon('tag');
    setIsAdding(false);
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
    setEditingId(null);
    setIsAdding(false);
    setConfirmDeleteId(null);
  };

  return (
    <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <span className="font-display font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
          <Tag size={14} />
          <span>Hantera kategorier</span>
        </span>
        <button
          type="button"
          onClick={handleResetToDefaults}
          className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ArrowCounterClockwise size={12} />
          <span>Återställ</span>
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Sub-tabs: Utgifter vs Inkomster */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--bg-color)] p-1 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('expense');
              setEditingId(null);
              setIsAdding(false);
              setConfirmDeleteId(null);
            }}
            className={`py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Utgifter ({expenseCategories.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('income');
              setEditingId(null);
              setIsAdding(false);
              setConfirmDeleteId(null);
            }}
            className={`py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'income'
                ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Inkomster ({incomeCategories.length})
          </button>
        </div>

        {/* Categories List */}
        <div className="divide-y divide-[var(--border-subtle)]">
          {currentList.map((cat) => {
            const isEditingThis = editingId === cat.id;
            const isConfirmingDelete = confirmDeleteId === cat.id;
            const isProtectedOvrigt = cat.name.toLowerCase().trim() === 'övrigt';
            const count = usageCounts[cat.name.toLowerCase().trim()] || 0;

            if (isEditingThis) {
              return (
                <div key={cat.id} className="py-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      disabled={isProtectedOvrigt}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Namn"
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] hover:opacity-90 cursor-pointer"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Icon Picker */}
                  <div className="grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-[var(--bg-color)] rounded-xl border border-[var(--border-subtle)]">
                    {AVAILABLE_CATEGORY_ICONS.map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = editIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEditIcon(item.id)}
                          className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                          }`}
                        >
                          <IconComponent size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={cat.id} className="py-2.5 first:pt-1 last:pb-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <CategoryIcon category={cat.name} iconId={cat.icon} size={14} badge={true} />
                    <div className="min-w-0">
                      <span className="font-semibold text-[var(--text-primary)] block truncate">
                        {cat.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        {count} {count === 1 ? 'post' : 'poster'}
                        {isProtectedOvrigt ? ' · Standard' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title="Redigera"
                    >
                      <PencilSimple size={14} />
                    </button>
                    {!isProtectedOvrigt && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId(isConfirmingDelete ? null : cat.id)
                        }
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                        title="Ta bort"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {isConfirmingDelete && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2 animate-fade-in">
                    <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                      {count > 0
                        ? `Flytta ${count} st till "Övrigt" och ta bort?`
                        : 'Ta bort kategorin?'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-[11px] font-semibold cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Category Form / Button */}
        {isAdding ? (
          <form
            onSubmit={handleAddCategory}
            className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-3 animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Kategorinamn..."
                autoFocus
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Spara
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1 bg-[var(--surface-color)] rounded-xl border border-[var(--border-subtle)]">
              {AVAILABLE_CATEGORY_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = newCatIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNewCatIcon(item.id)}
                    className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    <IconComponent size={15} />
                  </button>
                );
              })}
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setConfirmDeleteId(null);
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Ny kategori</span>
          </button>
        )}
      </div>
    </div>
  );
};
