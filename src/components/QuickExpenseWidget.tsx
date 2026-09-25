import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, Plus, Tag, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Config, Transaction, Category } from '../types';
import { supabase } from '../supabaseClient';
import { suggestCategory } from '../utils/icons';

interface QuickExpenseWidgetProps {
  config: Config;
  selectedDate: Date;
  allTransactions?: Transaction[];
  onAddExpense: (amount: number, note?: string, category?: string) => Promise<void> | void;
}

export function QuickExpenseWidget({
  config,
  selectedDate,
  allTransactions = [],
  onAddExpense,
}: QuickExpenseWidgetProps) {
  const [rawAmount, setRawAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentSuccess, setRecentSuccess] = useState<number | null>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [categorySource, setCategorySource] = useState<'history' | 'ai' | 'manual' | null>(null);

  const lang = config.language || 'sv';
  const isEn = lang === 'en';
  const defaultCategory = isEn ? 'Uncategorized' : 'Okategoriserat';

  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const hasManuallySelectedCategoryRef = useRef(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const isToday = useMemo(() => {
    return new Date(selectedDate).toDateString() === new Date().toDateString();
  }, [selectedDate]);

  // Clean numeric string into a float
  const numericAmount = useMemo(() => {
    if (!rawAmount) return 0;
    const clean = rawAmount.replace(/\s+/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [rawAmount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^0-9.,]/g, '');
    const parts = val.split(/[.,]/);
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setRawAmount(val);
  };

  const handlePresetClick = (addValue: number) => {
    if (numericAmount > 0) {
      setRawAmount(String(Math.round((numericAmount + addValue) * 100) / 100));
    } else {
      setRawAmount(String(addValue));
    }
    amountInputRef.current?.focus();
  };

  // Close category picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsCategoryPickerOpen(false);
      }
    };
    if (isCategoryPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryPickerOpen]);

  // Reset category when note is completely cleared
  useEffect(() => {
    if (!note.trim()) {
      hasManuallySelectedCategoryRef.current = false;
      setSelectedCategory(defaultCategory);
      setCategorySource(null);
      setIsAiLoading(false);
    }
  }, [note, defaultCategory]);

  // Auto-categorize: 1. Previous transactions first -> 2. AI Edge Function fallback
  useEffect(() => {
    const cleanNote = note.trim();
    if (!cleanNote || cleanNote.length < 2) return;
    if (hasManuallySelectedCategoryRef.current) return;

    const normalize = (text?: string | null): string => {
      if (!text) return '';
      return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
    };

    const normQuery = normalize(cleanNote);
    const availableCategories: Category[] = config.categories || [];

    // 1. Try to find match in previous transactions first
    if (allTransactions && allTransactions.length > 0) {
      const candidates = allTransactions.filter((t) => {
        if (!t.category) return false;
        const catNorm = normalize(t.category);
        if (catNorm === 'okategoriserat' || catNorm === 'uncategorized') return false;

        const categoryExists = availableCategories.some((c) => normalize(c.name) === catNorm);
        if (!categoryExists) return false;

        const tMerchant = normalize(t.merchant);
        const tNote = normalize(t.note);

        return tMerchant === normQuery || tNote === normQuery;
      });

      if (candidates.length > 0) {
        // Sort by type === 'expense' and latest timestamp descending
        candidates.sort((a, b) => {
          const aTypeScore = a.type === 'expense' ? 1 : 0;
          const bTypeScore = b.type === 'expense' ? 1 : 0;
          if (aTypeScore !== bTypeScore) return bTypeScore - aTypeScore;
          return (b.timestamp || 0) - (a.timestamp || 0);
        });

        const latestMatch = candidates[0];
        const matchedCategory = availableCategories.find(
          (c) => normalize(c.name) === normalize(latestMatch.category)
        );

        if (matchedCategory && !hasManuallySelectedCategoryRef.current) {
          setSelectedCategory(matchedCategory.name);
          setCategorySource('history');
          setIsAiLoading(false);
          return;
        }
      }
    }

    // 2. If NO previous match found: Call AI Edge Function "categorize-transaction" with debounce
    if (availableCategories.length === 0) return;

    let isCancelled = false;
    setIsAiLoading(true);

    const timer = setTimeout(async () => {
      if (isCancelled || hasManuallySelectedCategoryRef.current) {
        setIsAiLoading(false);
        return;
      }

      try {
        if (!supabase) {
          setIsAiLoading(false);
          return;
        }

        const categoryNames = availableCategories.map((c) => c.name);
        console.log('[QuickExpense AI] Calling categorize-transaction with:', {
          merchant: cleanNote,
          categories: categoryNames,
        });

        const { data, error } = await supabase.functions.invoke('categorize-transaction', {
          body: {
            merchant: cleanNote,
            categories: categoryNames,
          },
        });

        if (isCancelled || hasManuallySelectedCategoryRef.current) {
          setIsAiLoading(false);
          return;
        }

        if (error) {
          console.warn('[QuickExpense AI] Edge Function error:', error);
          const fallback = suggestCategory(cleanNote, availableCategories);
          if (fallback && !hasManuallySelectedCategoryRef.current) {
            setSelectedCategory(fallback);
            setCategorySource('ai');
          }
          setIsAiLoading(false);
          return;
        }

        if (data && typeof data.category === 'string' && data.category.trim()) {
          const suggestedCatName = data.category.trim();
          const matchedCategory = availableCategories.find(
            (c) => normalize(c.name) === normalize(suggestedCatName)
          );

          if (matchedCategory && !hasManuallySelectedCategoryRef.current) {
            console.log('[QuickExpense AI] AI found category:', matchedCategory.name);
            setSelectedCategory(matchedCategory.name);
            setCategorySource('ai');
            setIsAiLoading(false);
            return;
          }
        }

        // Fall back to rule-based suggestion if AI returns null
        const fallback = suggestCategory(cleanNote, availableCategories);
        if (fallback && !hasManuallySelectedCategoryRef.current) {
          setSelectedCategory(fallback);
          setCategorySource('ai');
        }
      } catch (err) {
        console.warn('[QuickExpense AI] Invocation failed silently:', err);
      } finally {
        if (!isCancelled) {
          setIsAiLoading(false);
        }
      }
    }, 550);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [note, allTransactions, config.categories]);

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    hasManuallySelectedCategoryRef.current = true;
    setCategorySource('manual');
    setIsCategoryPickerOpen(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (numericAmount <= 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const amountToSave = numericAmount;
      const cleanNote = note.trim();

      await onAddExpense(amountToSave, cleanNote, selectedCategory);

      // Trigger temporary success state
      setRecentSuccess(amountToSave);
      setRawAmount('');
      setNote('');
      setSelectedCategory(defaultCategory);
      setCategorySource(null);
      hasManuallySelectedCategoryRef.current = false;

      // Auto-hide success feedback after 2.5 seconds
      setTimeout(() => {
        setRecentSuccess(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to quick-add expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formattedDateStr = useMemo(() => {
    if (isToday) return null;
    return selectedDate.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
      day: 'numeric',
      month: 'short',
    });
  }, [isToday, selectedDate, isEn]);

  const isDefaultCategory = selectedCategory === defaultCategory;

  return (
    <div
      className="bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-[20px] p-3.5 sm:p-4 shadow-2xs transition-all relative"
      id="quick_expense_widget"
    >
      {/* Header with Title & Category Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Zap size={15} strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight truncate">
              {isEn ? 'Quick expense' : 'Snabb utgift'}
            </h4>

            {/* Interactive Category Badge / Picker Button */}
            <div className="relative shrink-0" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen((prev) => !prev)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isAiLoading
                    ? 'bg-accent/10 text-accent border-accent/30 animate-pulse'
                    : !isDefaultCategory
                      ? 'bg-accent/10 text-accent border-accent/30 font-semibold'
                      : 'bg-[var(--surface-muted)]/70 hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)]/60'
                }`}
                title={isEn ? 'Click to change category' : 'Klicka för att byta kategori'}
              >
                {isAiLoading ? (
                  <Sparkles size={11} className="animate-spin text-accent" />
                ) : categorySource === 'ai' ? (
                  <Sparkles size={11} className="text-accent" />
                ) : (
                  <Tag size={11} strokeWidth={2} />
                )}
                <span className="truncate max-w-[120px] sm:max-w-[150px]">
                  {isAiLoading && isDefaultCategory
                    ? isEn
                      ? 'Categorizing...'
                      : 'Kategoriserar...'
                    : selectedCategory}
                </span>
                <ChevronDown
                  size={10}
                  strokeWidth={2.5}
                  className={`opacity-60 transition-transform ${isCategoryPickerOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Category Picker Popover */}
              <AnimatePresence>
                {isCategoryPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 z-50 w-52 sm:w-60 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-xl p-1.5 max-h-60 overflow-y-auto"
                  >
                    <div className="text-[10px] font-bold text-[var(--text-secondary)] px-2 py-1 uppercase tracking-wider">
                      {isEn ? 'Select category' : 'Välj kategori'}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCategory(defaultCategory)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        selectedCategory === defaultCategory
                          ? 'bg-accent/10 text-accent font-semibold'
                          : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Tag size={12} />
                        <span>{defaultCategory}</span>
                      </span>
                      {selectedCategory === defaultCategory && <CheckCircle2 size={13} />}
                    </button>

                    {(config.categories || []).map((cat) => {
                      const isSelected = selectedCategory === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => handleSelectCategory(cat.name)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                            isSelected
                              ? 'bg-accent/10 text-accent font-semibold'
                              : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || 'var(--accent-color)' }} />
                            <span>{cat.name}</span>
                          </span>
                          {isSelected && <CheckCircle2 size={13} />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Date Context or Success Feedback */}
        <AnimatePresence mode="wait">
          {recentSuccess !== null ? (
            <motion.div
              key="success-toast"
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shrink-0"
            >
              <Check size={12} strokeWidth={2.5} />
              <span>
                {recentSuccess} {config.currency || 'kr'} {isEn ? 'registered!' : 'registrerad!'}
              </span>
            </motion.div>
          ) : formattedDateStr ? (
            <motion.span
              key="date-badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0"
            >
              {isEn ? `For ${formattedDateStr}` : `På ${formattedDateStr}`}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Amount Field */}
          <div className="relative flex-1 flex items-center bg-[var(--surface-muted)]/70 dark:bg-white/5 border border-[var(--border-color)]/70 hover:border-[var(--border-color)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 rounded-xl px-3 py-2 transition-all">
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={rawAmount}
              onChange={handleAmountChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[var(--text-primary)] font-bold text-lg sm:text-xl font-amount tabular-nums outline-none placeholder:text-[var(--text-secondary)]/35"
              id="quick_expense_amount_input"
              autoComplete="off"
            />
            <span className="text-xs font-bold text-[var(--text-secondary)] ml-1 select-none shrink-0 font-amount">
              {config.currency || 'kr'}
            </span>
          </div>

          {/* Where did you shop / Vart handlade du? */}
          <div className="relative flex-[1.2] flex items-center bg-[var(--surface-muted)]/70 dark:bg-white/5 border border-[var(--border-color)]/70 hover:border-[var(--border-color)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 rounded-xl px-3 py-2 transition-all">
            <input
              type="text"
              placeholder={isEn ? 'Where did you shop?' : 'vart handlade du'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[var(--text-primary)] text-sm font-medium outline-none placeholder:text-[var(--text-secondary)]/40"
              id="quick_expense_note_input"
              autoComplete="off"
            />
            {isAiLoading && (
              <span className="mr-1 text-accent animate-spin shrink-0">
                <Sparkles size={14} />
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={numericAmount <= 0 || isSubmitting}
            className={`h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shrink-0 transition-all select-none ${
              numericAmount > 0
                ? 'bg-accent text-white shadow-xs hover:opacity-90 active:scale-95 cursor-pointer'
                : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]/40 cursor-not-allowed border border-[var(--border-color)]/40'
            }`}
            id="quick_expense_submit_btn"
          >
            {isSubmitting ? (
              <span className="text-xs">{isEn ? 'Saving...' : 'Sparar...'}</span>
            ) : recentSuccess !== null ? (
              <>
                <Check size={16} strokeWidth={2.5} />
                <span>{isEn ? 'Done' : 'Klar'}</span>
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={2.5} />
                <span>{isEn ? 'Register' : 'Registrera'}</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Amount Preset Chips */}
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] opacity-50 uppercase tracking-wider select-none shrink-0 mr-1">
            {isEn ? 'Quick:' : 'Snabbt:'}
          </span>
          {[20, 50, 100, 200, 500].map((presetVal) => (
            <button
              key={presetVal}
              type="button"
              onClick={() => handlePresetClick(presetVal)}
              className="text-[11px] font-semibold font-amount tabular-nums text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/40 hover:border-[var(--border-color)] px-2.5 py-0.5 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
            >
              +{presetVal}
            </button>
          ))}
          {rawAmount && (
            <button
              type="button"
              onClick={() => {
                setRawAmount('');
                setNote('');
                setSelectedCategory(defaultCategory);
                setCategorySource(null);
                hasManuallySelectedCategoryRef.current = false;
              }}
              className="text-[10px] font-medium text-[var(--text-secondary)]/70 hover:text-rose-500 ml-auto transition-colors cursor-pointer select-none px-1"
            >
              {isEn ? 'Clear' : 'Rensa'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
