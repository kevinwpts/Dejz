import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  SlidersHorizontal,
  Layers, 
  RotateCcw
} from 'lucide-react';
import { Transaction, Config, FixedExpense, Income, Frequency } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';
import { Input, BottomSheet, SegmentedControl, Button, FilterButtonGroup } from './ui';
import { CategoryIcon } from './CategoryIcon';
import { PeriodSelectorModal } from './PeriodSelectorModal';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatFullDate } from '../utils/date';
import { formatAmount } from '../utils/format';
import { getCategoryIconName } from '../utils/icons';
import { feedback } from '../utils/feedback';

interface LogViewProps {
  transactions: Transaction[];
  fixedExpenses?: FixedExpense[];
  incomes?: Income[];
  stats?: any;
  config: Config;
  periods?: any[];
  onAddTransaction: () => void;
  onAddIncome: () => void;
  onViewTransaction: (t: Transaction) => void;
  onViewFixedExpense?: (expense: FixedExpense) => void;
  onViewIncome?: (income: Income) => void;
  onViewMonthlySaving?: (saving: any) => void;
  onDeleteTransaction: (id: string) => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
}

export function LogView({ 
  transactions, 
  fixedExpenses = [], 
  incomes = [], 
  stats, 
  config, 
  onAddTransaction, 
  _onAddIncome, 
  onViewTransaction, 
  onViewFixedExpense, 
  onViewIncome, 
  onViewMonthlySaving, 
  onDeleteTransaction, 
  t, 
  currentLang, 
  periods 
}: LogViewProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [modalPeriod, setModalPeriod] = useState<any | null>(null);
  const [isFilterBottomSheetOpen, setIsFilterBottomSheetOpen] = useState(false);

  useScrollLock(isPeriodPickerOpen || isFilterBottomSheetOpen);

  const getLocale = () => {
    const lang = currentLang || 'sv';
    const mapping: Record<string, string> = {
      sv: 'sv-SE',
      en: 'en-US',
      no: 'no-NO',
      da: 'da-DK',
      fi: 'fi-FI'
    };
    return mapping[lang] || 'sv-SE';
  };

  const getL10n = (sv: string, en: string, no?: string, da?: string, fi?: string) => {
    const lang = currentLang || 'sv';
    if (lang === 'sv') return sv;
    if (lang === 'no') return no || sv;
    if (lang === 'da') return da || sv;
    if (lang === 'fi') return fi || sv;
    return en;
  };

  // Chronological list of past and current periods (earliest to latest)
  const chronologicalPeriods = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    return periods.filter(p => !p.isFuture || p.isCurrent);
  }, [periods]);

  // Generate virtual transactions for fixed expenses, incomes, and savings goals if option enabled
  const fixedItemsAsTransactions = useMemo(() => {
    if (!config?.showFixedExpensesInHistory) return [];
    const items: (Transaction & { isFixed: boolean; originalItem: any })[] = [];
    const isEn = currentLang === 'en';

    // Helper to check if a recurring item is active in a given month (0-11)
    const isItemActiveInMonth = (item: { frequency?: Frequency; startMonth?: number }, monthIndex: number) => {
      if (!item.frequency || item.frequency === Frequency.MONTHLY) return true;
      if (item.startMonth === undefined) return true;
      const startM = item.startMonth;
      if (item.frequency === Frequency.QUARTERLY) return (monthIndex - startM + 12) % 3 === 0;
      if (item.frequency === Frequency.SEMI_ANNUALLY) return (monthIndex - startM + 12) % 6 === 0;
      if (item.frequency === Frequency.ANNUALLY) return monthIndex === startM;
      return true;
    };

    // Determine the month range to generate for
    const targetMonths: { year: number; month: number; periodId?: string }[] = [];
    const seenYearMonths = new Set<string>();

    if (chronologicalPeriods.length > 0) {
      chronologicalPeriods.forEach(p => {
        const pStart = new Date(p.start);
        const pEnd = new Date(p.end);
        
        let curr = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
        const endMonthDate = new Date(pEnd.getFullYear(), pEnd.getMonth(), 1);
        
        while (curr <= endMonthDate) {
          const ymKey = `${curr.getFullYear()}-${curr.getMonth()}`;
          if (!seenYearMonths.has(ymKey)) {
            seenYearMonths.add(ymKey);
            targetMonths.push({ year: curr.getFullYear(), month: curr.getMonth(), periodId: p.id });
          }
          curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
        }
      });
    } else {
      // Fallback: past 12 months up to current month
      const now = new Date();
      for (let i = -12; i <= 1; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const ymKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!seenYearMonths.has(ymKey)) {
          seenYearMonths.add(ymKey);
          targetMonths.push({ year: d.getFullYear(), month: d.getMonth() });
        }
      }
    }

    // Generate entries for each target month
    targetMonths.forEach(({ year, month, periodId }) => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // 1. Incomes
      (incomes || []).forEach(inc => {
        if (!isItemActiveInMonth(inc, month)) return;
        const rawDay = inc.deductionDay || config?.payday || 25;
        const day = Math.min(rawDay, daysInMonth);
        const itemDate = new Date(year, month, day, 12, 0, 0);

        const amount = inc.isVariable && periodId && inc.periodOverrides && inc.periodOverrides[periodId] !== undefined
          ? inc.periodOverrides[periodId]
          : inc.amount;

        items.push({
          id: `fixed-income-${inc.id}-${year}-${month}-${day}`,
          merchant: inc.name,
          category: inc.category || (isEn ? 'Income' : 'Inkomst'),
          amount: amount || 0,
          type: 'income',
          timestamp: itemDate.getTime(),
          date: itemDate.toISOString(),
          isFixed: true,
          originalItem: inc,
          icon: inc.icon,
          logo: inc.logo,
        } as any);
      });

      // 2. Fixed Expenses
      (fixedExpenses || []).forEach(fe => {
        if (!isItemActiveInMonth(fe, month)) return;
        const rawDay = fe.deductionDay || config?.payday || 25;
        const day = Math.min(rawDay, daysInMonth);
        const itemDate = new Date(year, month, day, 12, 0, 0);

        const amount = fe.isVariable && periodId && fe.periodOverrides && fe.periodOverrides[periodId] !== undefined
          ? fe.periodOverrides[periodId]
          : fe.amount;

        items.push({
          id: `fixed-expense-${fe.id}-${year}-${month}-${day}`,
          merchant: fe.name,
          category: fe.category || (isEn ? 'Fixed Expense' : 'Fast utgift'),
          amount: amount || 0,
          type: 'expense',
          timestamp: itemDate.getTime(),
          date: itemDate.toISOString(),
          isFixed: true,
          originalItem: fe,
          icon: fe.icon,
          logo: fe.logo,
        } as any);
      });

      // 3. Monthly Savings
      const savingsList = config?.monthlySavingsItems && config.monthlySavingsItems.length > 0
        ? config.monthlySavingsItems
        : (stats?.savingsGoals || []).filter((g: any) => Number(g.targetAmount) > 0);

      savingsList.forEach((ms: any) => {
        if (!isItemActiveInMonth(ms, month)) return;
        const rawDay = ms.deductionDay || config?.payday || 25;
        const day = Math.min(rawDay, daysInMonth);
        const itemDate = new Date(year, month, day, 12, 0, 0);

        const amount = ms.isVariable && periodId && ms.periodOverrides && ms.periodOverrides[periodId] !== undefined
          ? ms.periodOverrides[periodId]
          : (ms.amount !== undefined ? ms.amount : (ms.targetAmount || 0));

        items.push({
          id: `fixed-saving-${ms.id}-${year}-${month}-${day}`,
          merchant: ms.name || (isEn ? 'Monthly Saving' : 'Månadssparande'),
          category: isEn ? 'Monthly Saving' : 'Månadssparande',
          amount: Number(amount) || 0,
          type: 'expense',
          timestamp: itemDate.getTime(),
          date: itemDate.toISOString(),
          isFixed: true,
          originalItem: ms,
          icon: ms.icon || 'PiggyBank',
          logo: ms.logo,
        } as any);
      });
    });

    return items;
  }, [config?.showFixedExpensesInHistory, config?.monthlySavingsItems, config?.payday, chronologicalPeriods, incomes, fixedExpenses, stats?.savingsGoals, currentLang]);

  // Combined transactions list (regular + fixed if option enabled)
  const allCombinedTransactions = useMemo(() => {
    if (!transactions) return fixedItemsAsTransactions;
    if (fixedItemsAsTransactions.length === 0) return transactions;
    return [...transactions, ...fixedItemsAsTransactions];
  }, [transactions, fixedItemsAsTransactions]);

  const selectedMonthName = useMemo(() => {
    if (!selectedPeriod?.name) return '';
    return selectedPeriod.name.includes('(')
      ? selectedPeriod.name.split('(')[0].trim()
      : selectedPeriod.name;
  }, [selectedPeriod]);

  const activeFilterLabel = useMemo(() => {
    if (selectedDate) {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      if (selectedDate.toDateString() === today.toDateString()) {
        return getL10n('Idag', 'Today', 'I dag', 'I dag', 'Tänään');
      }
      if (selectedDate.toDateString() === yesterday.toDateString()) {
        return getL10n('Igår', 'Yesterday', 'I går', 'I går', 'Eilen');
      }
      
      return selectedDate.toLocaleDateString(getLocale(), {
        day: 'numeric',
        month: 'short',
        year: selectedDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }

    if (selectedPeriod) {
      return selectedMonthName;
    }

    return getL10n('Alla perioder', 'All periods', 'Alle perioder', 'Alle perioder', 'Kaikki jaksot');
  }, [selectedDate, selectedPeriod, selectedMonthName, currentLang]);

  // Available categories in the current filtered period / data set for quick pills
  const availableCategories = useMemo(() => {
    if (!allCombinedTransactions) return [];
    const catMap = new Map<string, number>();

    allCombinedTransactions.forEach((tx: any) => {
      // Respect period / date bounds for category counts
      if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (tx.timestamp < startOfDay.getTime() || tx.timestamp > endOfDay.getTime()) return;
      } else if (selectedPeriod?.start && selectedPeriod?.end) {
        const startTime = new Date(selectedPeriod.start).getTime();
        const endTime = new Date(selectedPeriod.end).getTime() + 86399999;
        if (tx.timestamp < startTime || tx.timestamp > endTime) return;
      }

      if (typeFilter !== 'all' && tx.type !== typeFilter) return;

      const catName = tx.category?.trim();
      if (catName) {
        catMap.set(catName, (catMap.get(catName) || 0) + 1);
      }
    });

    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allCombinedTransactions, selectedPeriod, selectedDate, typeFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== null) count++;
    return count;
  }, [categoryFilter]);

  const allCategoryOptions = useMemo(() => {
    const map = new Map<string, { name: string; count?: number }>();

    availableCategories.forEach(c => {
      map.set(c.name.toLowerCase(), { name: c.name, count: c.count });
    });

    const configured = [
      ...(config.categories || []),
      ...(config.incomeCategories || [])
    ];
    configured.forEach(c => {
      if (c.name && !map.has(c.name.toLowerCase())) {
        map.set(c.name.toLowerCase(), { name: c.name, count: 0 });
      }
    });

    return Array.from(map.values());
  }, [availableCategories, config.categories, config.incomeCategories]);

  // Filter transactions by search query / category / date / period / type
  const filteredExpenses = useMemo(() => {
    if (!allCombinedTransactions) return [];
    const q = searchQuery.trim().toLowerCase();

    return allCombinedTransactions
      .filter((e: any) => {
        // 1. Text Search Filter
        if (q) {
          const matchMerchant = e.merchant?.toLowerCase().includes(q);
          const matchCategory = e.category?.toLowerCase().includes(q);
          const matchNote = e.note?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
          const matchAmount = String(e.amount).includes(q);
          if (!matchMerchant && !matchCategory && !matchNote && !matchAmount) {
            return false;
          }
        }

        // 2. Category Filter
        if (categoryFilter) {
          if (e.category?.trim().toLowerCase() !== categoryFilter.toLowerCase()) {
            return false;
          }
        }

        // 3. Day filter has top priority if user chose a specific day
        if (selectedDate) {
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (e.timestamp < startOfDay.getTime() || e.timestamp > endOfDay.getTime()) {
            return false;
          }
        } 
        // 4. Period filter if selected
        else if (selectedPeriod?.start && selectedPeriod?.end) {
          const startTime = new Date(selectedPeriod.start).getTime();
          const endTime = new Date(selectedPeriod.end).getTime() + 86399999;
          if (e.timestamp < startTime || e.timestamp > endTime) {
            return false;
          }
        }

        // 5. Type filter
        if (typeFilter !== 'all') {
          if (e.type !== typeFilter) return false;
        }
        
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allCombinedTransactions, searchQuery, categoryFilter, selectedDate, selectedPeriod, typeFilter]);

  // Aggregate stats for currently filtered view (expenses, income, net, count)
  const _summaryStats = useMemo(() => {
    let totalExpenses = 0;
    let totalIncome = 0;

    filteredExpenses.forEach((tx: any) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'expense') {
        totalExpenses += amt;
      } else if (tx.type === 'income') {
        totalIncome += amt;
      }
    });

    const net = totalIncome - totalExpenses;
    return {
      totalExpenses,
      totalIncome,
      net,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses]);

  // Group transactions by day and calculate each day's net sum
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { items: (Transaction & { isFixed?: boolean; originalItem?: any })[]; dayNet: number }> = {};
    filteredExpenses.forEach((e: any) => {
      const dateKey = new Date(e.timestamp).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { items: [], dayNet: 0 };
      }
      groups[dateKey].items.push(e);
      const amt = Number(e.amount) || 0;
      if (e.type === 'income') {
        groups[dateKey].dayNet += amt;
      } else {
        groups[dateKey].dayNet -= amt;
      }
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  const hasActiveSearch = Boolean(searchQuery.trim());
  const hasActiveFilters = Boolean(categoryFilter !== null || typeFilter !== 'all');

  const handleClearResultRow = () => {
    if (typeof feedback?.tap === 'function') feedback.tap();
    if (hasActiveSearch && hasActiveFilters) {
      setSearchQuery('');
      setTypeFilter('all');
      setCategoryFilter(null);
    } else if (hasActiveSearch) {
      setSearchQuery('');
    } else if (hasActiveFilters) {
      setTypeFilter('all');
      setCategoryFilter(null);
    }
  };

  // Modal Calendar logic
  const modalIndex = useMemo(() => {
    if (!modalPeriod || chronologicalPeriods.length === 0) return -1;
    return chronologicalPeriods.findIndex(p => p.name === modalPeriod.name);
  }, [modalPeriod, chronologicalPeriods]);

  const canModalGoPrev = modalIndex > 0;
  const canModalGoNext = modalIndex >= 0 && modalIndex < chronologicalPeriods.length - 1;

  const handleModalPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canModalGoPrev) {
      const prevP = chronologicalPeriods[modalIndex - 1];
      setModalPeriod(prevP);
      setSelectedPeriod(prevP);
      setSelectedDate(null);
    }
  };

  const handleModalNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canModalGoNext) {
      const nextP = chronologicalPeriods[modalIndex + 1];
      setModalPeriod(nextP);
      setSelectedPeriod(nextP);
      setSelectedDate(null);
    }
  };

  const modalPeriodDate = useMemo(() => {
    if (modalPeriod?.date) return new Date(modalPeriod.date);
    if (modalPeriod?.start) return new Date(modalPeriod.start);
    return new Date();
  }, [modalPeriod]);

  const calendarMonthData = useMemo(() => {
    const year = modalPeriodDate.getFullYear();
    const month = modalPeriodDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    // Pre-calculate transactions per day in this month
    const txByDay: Record<number, { hasIncome: boolean; hasExpense: boolean; count: number }> = {};
    if (allCombinedTransactions) {
      allCombinedTransactions.forEach((tx: any) => {
        const d = new Date(tx.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayNum = d.getDate();
          if (!txByDay[dayNum]) {
            txByDay[dayNum] = { hasIncome: false, hasExpense: false, count: 0 };
          }
          txByDay[dayNum].count++;
          if (tx.type === 'income') txByDay[dayNum].hasIncome = true;
          if (tx.type === 'expense') txByDay[dayNum].hasExpense = true;
        }
      });
    }

    return {
      year,
      month,
      daysInMonth,
      firstDayWeekday,
      txByDay
    };
  }, [modalPeriodDate, allCombinedTransactions]);

  const weekdayNames = useMemo(() => {
    if (currentLang === 'en') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (currentLang === 'no' || currentLang === 'da') return ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
    if (currentLang === 'fi') return ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
    return ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
  }, [currentLang]);

  const today = useMemo(() => new Date(), []);

  if (!transactions && (!fixedExpenses || fixedExpenses.length === 0)) return null;

  return (
    <div className="space-y-[var(--menu-content-gap)] font-sans">
      {/* 1. Standalone Search Bar (Sökrutan ligger fritt) */}
      <div className="w-full">
        <Input
          variant="search"
          placeholder={getL10n(
            'Sök butik, kategori, anteckning...',
            'Search merchant, category, note...',
            'Søk butikk, kategori, notat...',
            'Søg butik, kategori, note...',
            'Etsi kauppaa, kategoriaa, muistiinpanoa...'
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          className="h-[42px] sm:h-[44px] text-xs sm:text-sm bg-[var(--surface-color)] shadow-subtle border-none"
        />
      </div>

      {/* 2. Top Controls: Compact Inline Row (Period button + Transaction type filters + Icon-only Filter button) - Samma upplägg som Analysfliken */}
      <div className="flex items-center justify-between gap-2 py-0.5 px-0.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          {/* Period Button */}
          <button
            type="button"
            onClick={() => {
              const initial = selectedPeriod || chronologicalPeriods.find(p => p.isCurrent) || chronologicalPeriods[chronologicalPeriods.length - 1] || null;
              setModalPeriod(initial);
              setIsPeriodPickerOpen(true);
            }}
            className="flex-shrink-0 h-[38px] sm:h-[40px] px-3.5 sm:px-4 rounded-full inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer active:scale-[0.98] transition-all"
          >
            <CalendarIcon size={15} className="text-[var(--text-secondary)] shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-none">{activeFilterLabel || getL10n('Alla perioder', 'All periods')}</span>
            {selectedPeriod?.isCurrent && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)]">
                {getL10n('Nu', 'Current', 'Nå', 'Nu', 'Nyt')}
              </span>
            )}
            <ChevronDown size={14} className="text-[var(--text-secondary)] shrink-0 ml-0.5" />
          </button>

          {/* Inline Transaction Type Filters */}
          <div className="flex-shrink-0">
            <FilterButtonGroup
              options={[
                {
                  id: 'all',
                  label: getL10n('Alla', 'All', 'Alle', 'Alle', 'Kaikki'),
                },
                {
                  id: 'expense',
                  label: getL10n('Utgifter', 'Expenses', 'Utgifter', 'Udgifter', 'Menot'),
                },
                {
                  id: 'income',
                  label: getL10n('Inkomster', 'Income', 'Inntekt', 'Indkomst', 'Tulot'),
                },
              ]}
              selectedId={typeFilter}
              onSelect={(id) => {
                if (typeof feedback?.selection === 'function') feedback.selection();
                setTypeFilter(id as 'all' | 'income' | 'expense');
              }}
              ariaLabel={getL10n('Filtrera typ', 'Filter type')}
            />
          </div>
        </div>

        {/* Filter Toggle Button (Icon only) */}
        <button
          type="button"
          onClick={() => {
            if (typeof feedback?.light === 'function') feedback.light();
            setIsFilterBottomSheetOpen(true);
          }}
          className={`flex-shrink-0 w-[38px] sm:w-[40px] h-[38px] sm:h-[40px] rounded-full inline-flex items-center justify-center relative transition-all cursor-pointer active:scale-95 shrink-0 ${
            activeFiltersCount > 0
              ? 'bg-[var(--text-primary)] text-[var(--surface-color)] shadow-xs font-semibold'
              : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
          }`}
          title={getL10n('Filter', 'Filter')}
          aria-label={getL10n('Filter', 'Filter')}
        >
          <SlidersHorizontal size={15} strokeWidth={2} />
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-[11px] font-bold inline-flex items-center justify-center shrink-0 ml-0.5">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Discrete Results & Clear Row */}
      {(hasActiveSearch || hasActiveFilters) && (
        <div className="flex items-center justify-between px-1 py-0.5 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-[11px] truncate">
              {filteredExpenses.length === 0 ? (
                hasActiveSearch ? (
                  <>
                    <strong className="font-semibold text-[var(--text-primary)]">0</strong>{' '}
                    {getL10n('träffar', 'matches', 'treff', 'fund', 'osumaa')}
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-[var(--text-primary)]">0</strong>{' '}
                    {getL10n('transaktioner', 'transactions', 'transaksjoner', 'transaktioner', 'tapahtumaa')}
                  </>
                )
              ) : (
                hasActiveSearch ? (
                  <>
                    <strong className="font-semibold text-[var(--text-primary)]">{filteredExpenses.length}</strong>{' '}
                    {getL10n(
                      filteredExpenses.length === 1 ? 'träff' : 'träffar',
                      filteredExpenses.length === 1 ? 'match' : 'matches',
                      filteredExpenses.length === 1 ? 'treff' : 'treff',
                      filteredExpenses.length === 1 ? 'fund' : 'fund',
                      filteredExpenses.length === 1 ? 'osuma' : 'osumaa'
                    )}
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-[var(--text-primary)]">{filteredExpenses.length}</strong>{' '}
                    {getL10n(
                      filteredExpenses.length === 1 ? 'transaktion' : 'transaktioner',
                      filteredExpenses.length === 1 ? 'transaction' : 'transactions',
                      filteredExpenses.length === 1 ? 'transaksjon' : 'transaksjoner',
                      filteredExpenses.length === 1 ? 'transaktion' : 'transaktioner',
                      filteredExpenses.length === 1 ? 'tapahtuma' : 'tapahtumaa'
                    )}
                  </>
                )
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClearResultRow}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent-color)] hover:underline cursor-pointer shrink-0 ml-2"
          >
            <RotateCcw size={11} />
            <span>
              {hasActiveSearch && hasActiveFilters
                ? getL10n('Rensa allt', 'Clear all', 'Nullstill alt', 'Nulstil alt', 'Tyhjennä kaikki')
                : hasActiveSearch
                ? getL10n('Rensa sökning', 'Clear search', 'Nullstill søk', 'Nulstil søgning', 'Tyhjennä haku')
                : getL10n('Rensa filter', 'Clear filters', 'Nullstill filter', 'Nulstil filter', 'Tyhjennä suodattimet')}
            </span>
          </button>
        </div>
      )}

      {/* 6. Transactions List Grouped by Day */}
      <div className="space-y-[var(--card-gap)]">
        <div className="space-y-4 sm:space-y-4.5">
          {groupedExpenses.map(([date, dayData], index) => (
            <motion.div 
              key={date} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="space-y-1.5"
            >
              {/* Day Header with Date and Day Total Net */}
              <div className="px-1 flex items-center justify-between pb-0.5">
                <span className="text-label font-medium text-[var(--text-secondary)]">
                  {formatFullDate(date, currentLang)}
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-micro-label font-medium text-[var(--text-tertiary)] tabular-nums font-amount">
                    {dayData.items.length} {getL10n(
                      dayData.items.length === 1 ? 'transaktion' : 'transaktioner',
                      dayData.items.length === 1 ? 'tx' : 'txs',
                      dayData.items.length === 1 ? 'transaksjon' : 'transaksjoner',
                      dayData.items.length === 1 ? 'transaktion' : 'transaktioner',
                      dayData.items.length === 1 ? 'tapahtuma' : 'tapahtumaa'
                    )}
                  </span>
                  <span className="text-[var(--text-tertiary)]/40 text-[10px]">·</span>
                  <span className={`text-micro-label font-semibold tabular-nums font-amount ${
                    dayData.dayNet > 0 
                      ? 'text-[var(--success-color)]' 
                      : 'text-[var(--text-primary)]'
                  }`}>
                    {dayData.dayNet > 0 ? `+${formatAmount(dayData.dayNet, getLocale())}` : formatAmount(dayData.dayNet, getLocale())} {config.currency || 'kr'}
                  </span>
                </div>
              </div>

              {/* Transactions for this Day */}
              <div className="space-y-1.5">
                {dayData.items.map((transaction: any) => (
                  <TransactionItem 
                    key={transaction.id}
                    transaction={transaction}
                    isFixed={Boolean(transaction.isFixed)}
                    config={config}
                    onView={transaction.isFixed ? undefined : onViewTransaction}
                    onDelete={transaction.isFixed ? undefined : onDeleteTransaction}
                    onClick={() => {
                      if (transaction.isFixed) {
                        if (transaction.type === 'income' && onViewIncome) {
                          onViewIncome(transaction.originalItem);
                        } else if (transaction.originalItem?.targetAmount && onViewMonthlySaving) {
                          onViewMonthlySaving(transaction.originalItem);
                        } else if (onViewFixedExpense) {
                          onViewFixedExpense(transaction.originalItem);
                        }
                      } else if (onViewTransaction) {
                        onViewTransaction(transaction);
                      }
                    }}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {(filteredExpenses?.length || 0) === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-2 sm:py-3"
          >
            <EmptyState
              icon={
                hasActiveSearch
                  ? 'search'
                  : hasActiveFilters
                  ? 'filter'
                  : 'wallet'
              }
              title={
                hasActiveSearch
                  ? getL10n(
                      'Inga sökresultat',
                      'No search results',
                      'Ingen søkeresultater',
                      'Ingen søgeresultater',
                      'Ei hakutuloksia'
                    )
                  : hasActiveFilters
                  ? getL10n(
                      'Inga matchande transaktioner',
                      'No matching transactions',
                      'Ingen matchende transaksjoner',
                      'Ingen matchende transaktioner',
                      'Ei täsmääviä tapahtumia'
                    )
                  : selectedDate 
                  ? getL10n(
                      `Inga transaktioner för ${activeFilterLabel}`, 
                      `No transactions for ${activeFilterLabel}`,
                      `Ingen transaksjoner for ${activeFilterLabel}`,
                      `Ingen transaktioner for ${activeFilterLabel}`,
                      `Ei tapahtumia päivälle ${activeFilterLabel}`
                    )
                  : selectedPeriod 
                  ? getL10n(
                      `Inga transaktioner för ${selectedMonthName}`, 
                      `No transactions for ${selectedMonthName}`,
                      `Ingen transaksjoner for ${selectedMonthName}`,
                      `Ingen transaktioner for ${selectedMonthName}`,
                      `Ei tapahtumia kaudelle ${selectedMonthName}`
                    )
                  : (transactions?.length || 0) === 0 ? t('noTransactions') : t('noTransactionsSubtle')
              }
              description={
                hasActiveSearch && hasActiveFilters
                  ? getL10n(
                      'Prova ett annat sökord eller ändra dina filter.',
                      'Try another search term or change your filters.',
                      'Prøv et annet søkeord eller endre filtrene dine.',
                      'Prøv et andet søgeord eller ændre dine filtre.',
                      'Kokeile toista hakusanaa tai muuta suodattimiasi.'
                    )
                  : hasActiveSearch
                  ? getL10n(
                      'Prova ett annat sökord.',
                      'Try another search term.',
                      'Prøv et annet søkeord.',
                      'Prøv et andet søgeord.',
                      'Kokeile toista hakusanaa.'
                    )
                  : hasActiveFilters
                  ? getL10n(
                      'Prova att ändra dina filter.',
                      'Try changing your filters.',
                      'Prøv å endre filtrene dine.',
                      'Prøv at ændre dine filtre.',
                      'Kokeile muuttaa suodattimiasi.'
                    )
                  : undefined
              }
              actionLabel={
                !hasActiveSearch && !hasActiveFilters && (transactions?.length || 0) === 0
                  ? t('addExpense')
                  : undefined
              }
              onAction={
                !hasActiveSearch && !hasActiveFilters && (transactions?.length || 0) === 0
                  ? onAddTransaction
                  : undefined
              }
            />
          </motion.div>
        )}
      </div>

      {/* Calendar & Period Modal */}
      <PeriodSelectorModal
        isOpen={isPeriodPickerOpen}
        onClose={() => setIsPeriodPickerOpen(false)}
        periods={chronologicalPeriods}
        selectedPeriod={selectedPeriod}
        selectedDate={selectedDate}
        onSelectPeriod={(p) => {
          setSelectedPeriod(p);
          setSelectedDate(null);
          setModalPeriod(p);
        }}
        onSelectDate={(d) => {
          setSelectedDate(d);
        }}
        showCalendarOption={true}
        currentLang={currentLang}
        calendarContent={
          <div className="space-y-[var(--card-gap)]">
            {/* Period Stepper (Left / Right) */}
            <div className="flex items-center justify-between bg-[var(--surface-color)] border-none shadow-none rounded-card p-1.5">
              <button
                type="button"
                onClick={handleModalPrev}
                disabled={!canModalGoPrev}
                className={`w-8 h-8 rounded-[var(--radius-button-sm,10px)] flex items-center justify-center transition-all cursor-pointer ${
                  canModalGoPrev
                    ? 'text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 active:scale-90'
                    : 'text-[var(--text-tertiary)]/30 cursor-not-allowed'
                }`}
                aria-label="Föregående period"
                title="Föregående period"
              >
                <ChevronLeft size={17} strokeWidth={2} />
              </button>

              <div className="flex flex-col items-center text-center px-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight truncate capitalize">
                    {modalPeriod?.name?.split('(')[0]?.trim() || modalPeriodDate.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })}
                  </span>
                  {modalPeriod?.isCurrent && (
                    <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] border-none">
                      {getL10n('Nu', 'Now', 'Nå', 'Nu', 'Nyt')}
                    </span>
                  )}
                </div>
                {modalPeriod?.name?.includes('(') && (
                  <span className="text-[10.5px] text-[var(--text-tertiary)] font-normal truncate mt-0.5">
                    {modalPeriod.name.split('(')[1]?.replace(')', '').trim()}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleModalNext}
                disabled={!canModalGoNext}
                className={`w-8 h-8 rounded-[var(--radius-button-sm,10px)] flex items-center justify-center transition-all cursor-pointer ${
                  canModalGoNext
                    ? 'text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 active:scale-90'
                    : 'text-[var(--text-tertiary)]/30 cursor-not-allowed'
                }`}
                aria-label="Nästa period"
                title="Nästa period"
              >
                <ChevronRight size={17} strokeWidth={2} />
              </button>
            </div>

            {/* Quick Action: View whole period */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.selection === 'function') feedback.selection();
                  else if (typeof feedback?.tap === 'function') feedback.tap();
                  setSelectedPeriod(modalPeriod);
                  setSelectedDate(null);
                  setIsPeriodPickerOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-none active:scale-95 ${
                  selectedPeriod?.name === modalPeriod?.name && !selectedDate
                    ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-xs'
                    : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Layers size={13} strokeWidth={2} />
                <span>{getL10n('Visa hela perioden', 'View full period', 'Vis hele perioden', 'Vis hele perioden', 'Koko jakso')}</span>
              </button>
            </div>

            {/* Interactive Calendar Days Grid */}
            <div className="select-none pt-1">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                {weekdayNames.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-[var(--text-tertiary)] tracking-wider py-0.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calendarMonthData.firstDayWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
                ))}
                
                {Array.from({ length: calendarMonthData.daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayDate = new Date(calendarMonthData.year, calendarMonthData.month, dayNum);
                  const isSelected = selectedDate && dayDate.toDateString() === selectedDate.toDateString();
                  const isToday = dayDate.toDateString() === today.toDateString();
                  const dayTx = calendarMonthData.txByDay[dayNum];

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => {
                        if (typeof feedback?.selection === 'function') feedback.selection();
                        else if (typeof feedback?.tap === 'function') feedback.tap();
                        setSelectedDate(dayDate);
                        setSelectedPeriod(modalPeriod);
                        setIsPeriodPickerOpen(false);
                      }}
                      className={`aspect-square w-full rounded-[var(--radius-button-sm,10px)] flex flex-col items-center justify-center gap-0.5 transition-all relative active:scale-95 cursor-pointer text-center ${
                        isSelected 
                          ? 'bg-[var(--accent-color)] text-[var(--on-accent)] font-bold shadow-xs z-10' 
                          : isToday
                          ? 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)] border-none font-bold'
                          : 'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.06] font-medium'
                      }`}
                    >
                      <span className={`text-xs sm:text-[13px] leading-none tabular-nums ${
                        isSelected ? 'text-[var(--on-accent)]' : 'text-[var(--text-primary)]'
                      }`}>
                        {dayNum}
                      </span>
                      
                      {/* Transaction Dots */}
                      <div className="flex items-center justify-center gap-0.5 pointer-events-none h-1 w-full">
                        {dayTx?.hasIncome && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--on-accent)]' : 'bg-[var(--success-color)]'}`} />
                        )}
                        {dayTx?.hasExpense && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--on-accent)]' : 'bg-[var(--danger-color)]'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        }
      />

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={isFilterBottomSheetOpen}
        onClose={() => setIsFilterBottomSheetOpen(false)}
        title={getL10n('Filtrera transaktioner', 'Filter transactions', 'Filtrer transaksjoner', 'Filtrer transaktioner', 'Suodata tapahtumia')}
        subtitle={getL10n('Välj transaktionstyp och kategori', 'Select transaction type and category')}
        size="md"
        bodyClassName="p-4 sm:p-5 space-y-5 overflow-y-auto custom-scrollbar"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            {activeFiltersCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  if (typeof feedback?.tap === 'function') feedback.tap();
                  setTypeFilter('all');
                  setCategoryFilter(null);
                }}
                icon={<RotateCcw size={14} />}
                className="text-[var(--danger-color)] hover:text-[var(--danger-color)]"
              >
                {getL10n('Rensa filter', 'Clear filters')}
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                if (typeof feedback?.tap === 'function') feedback.tap();
                setIsFilterBottomSheetOpen(false);
              }}
              className="min-w-[120px]"
            >
              {getL10n('Visa resultat', 'Show results')}
            </Button>
          </div>
        }
      >
        {/* Categories Pills */}
        <div className="space-y-2.5">
          {categoryFilter && (
            <div className="flex justify-end px-0.5">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className="text-xs font-medium text-[var(--accent-color)] hover:underline cursor-pointer"
              >
                {getL10n('Återställ', 'Reset')}
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 py-0.5">
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.selection === 'function') feedback.selection();
                setCategoryFilter(null);
              }}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                categoryFilter === null
                  ? 'bg-[var(--text-primary)] text-[var(--surface-color)] border-transparent shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid size={13} strokeWidth={2} />
              <span>{getL10n('Alla kategorier', 'All categories', 'Alle kategorier', 'Alle kategorier', 'Kaikki katekoriat')}</span>
            </button>

            {allCategoryOptions.map((cat) => {
              const isSelected = categoryFilter?.toLowerCase() === cat.name.toLowerCase();
              const matchedCat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
                c => (c.name || '').trim().toLowerCase() === cat.name.toLowerCase() || c.id === cat.name
              );
              const iconKey = matchedCat?.icon || getCategoryIconName(cat.name);

              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.selection === 'function') feedback.selection();
                    setCategoryFilter(isSelected ? null : cat.name);
                  }}
                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-[var(--text-primary)] text-[var(--surface-color)] font-semibold border-transparent shadow-xs'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <CategoryIcon
                    icon={iconKey}
                    categoryName={cat.name}
                    variant="minimal"
                    size="2xs"
                    className="w-3.5 h-3.5"
                  />
                  <span>{cat.name}</span>
                  {cat.count !== undefined && cat.count > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[var(--text-tertiary)]'
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
