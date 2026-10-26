import React, { useState } from 'react';
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
} from '../utils/appCache';
import { CategoryIcon, AVAILABLE_CATEGORY_ICONS } from './CategoryIcon';

export const CategorySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(() =>
    getStoredExpenseCategories()
  );
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(() =>
    getStoredIncomeCategories()
  );

  // Lägg till ny kategori
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('tag');

  // Redigera befintlig kategori
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('tag');

  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'tag');
    setIsAdding(false);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    if (activeTab === 'expense') {
      const next = expenseCategories.map((c) =>
        c.id === id ? { ...c, name: trimmed, icon: editIcon } : c
      );
      setExpenseCategories(next);
      saveStoredExpenseCategories(next);
    } else {
      const next = incomeCategories.map((c) =>
        c.id === id ? { ...c, name: trimmed, icon: editIcon } : c
      );
      setIncomeCategories(next);
      saveStoredIncomeCategories(next);
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
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
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const newId = `custom-${Date.now()}-${trimmed.toLowerCase().replace(/\s+/g, '-')}`;
    const newCat: Category = {
      id: newId,
      name: trimmed,
      icon: newCatIcon || 'tag',
    };

    if (activeTab === 'expense') {
      const next = [...expenseCategories, newCat];
      setExpenseCategories(next);
      saveStoredExpenseCategories(next);
    } else {
      const next = [...incomeCategories, newCat];
      setIncomeCategories(next);
      saveStoredIncomeCategories(next);
    }

    setNewCatName('');
    setNewCatIcon('tag');
    setIsAdding(false);
  };

  const handleResetToDefaults = () => {
    if (activeTab === 'expense') {
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
      saveStoredExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    } else {
      setIncomeCategories(DEFAULT_INCOME_CATEGORIES);
      saveStoredIncomeCategories(DEFAULT_INCOME_CATEGORIES);
    }
    setEditingId(null);
    setIsAdding(false);
  };

  return (
    <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 flex items-center justify-between">
        <span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
          <Tag size={15} className="text-[var(--text-primary)]" />
          <span>Kategorier</span>
        </span>
        <button
          type="button"
          onClick={handleResetToDefaults}
          className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
          title="Återställ till förvalda kategorier"
        >
          <ArrowCounterClockwise size={12} />
          <span>Återställ</span>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Sub-tabs: Utgifter vs Inkomster */}
        <div className="flex rounded-xl bg-[var(--surface-raised)] p-1 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('expense');
              setEditingId(null);
              setIsAdding(false);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Utgiftskategorier ({expenseCategories.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('income');
              setEditingId(null);
              setIsAdding(false);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'income'
                ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Inkomstkategorier ({incomeCategories.length})
          </button>
        </div>

        {/* Categories List */}
        <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-color)] overflow-hidden">
          {currentList.map((cat) => {
            const isEditingThis = editingId === cat.id;

            if (isEditingThis) {
              return (
                <div key={cat.id} className="p-4 space-y-3 bg-[var(--surface-raised)]/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Kategorinamn"
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] hover:opacity-90 cursor-pointer"
                      title="Spara"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="Avbryt"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Icon Picker */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">Välj ikon</span>
                    <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto p-1 bg-[var(--surface-color)] rounded-xl border border-[var(--border-subtle)] scrollbar-thin">
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
                                ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xs scale-105'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
                            }`}
                            title={item.label}
                          >
                            <IconComponent size={16} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cat.id}
                className="px-3.5 py-3 flex items-center justify-between text-xs hover:bg-[var(--surface-raised)]/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <CategoryIcon category={cat.name} iconId={cat.icon} size={15} badge={true} />
                  <span className="font-semibold text-[var(--text-primary)] truncate">
                    {cat.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    title="Redigera kategori"
                  >
                    <PencilSimple size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Ta bort kategori"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Category Form / Button */}
        {isAdding ? (
          <form
            onSubmit={handleAddCategory}
            className="p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Ny {activeTab === 'expense' ? 'utgiftskategori' : 'inkomstkategori'}
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Kategorinamn (t.ex. Streaming)"
                autoFocus
                className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 cursor-pointer shadow-xs"
              >
                Lägg till
              </button>
            </div>

            {/* Icon Picker for New Category */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">Välj ikon</span>
              <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto p-1 bg-[var(--surface-color)] rounded-xl border border-[var(--border-subtle)] scrollbar-thin">
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
                          ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xs scale-105'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
                      }`}
                      title={item.label}
                    >
                      <IconComponent size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={15} weight="bold" />
            <span>Skapa ny {activeTab === 'expense' ? 'utgiftskategori' : 'inkomstkategori'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
