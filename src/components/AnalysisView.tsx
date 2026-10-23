import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Calendar, Info } from 'lucide-react';
import { Transaction, FixedExpense, Config } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';
import { FilterButtonGroup, Card, Modal } from './ui';
import { PeriodSelectorModal } from './PeriodSelectorModal';
import { formatAmount } from '../utils/format';
import { isFixedItemDueInPeriod, getPeriodBoundaries } from '../utils/date';
import { isExpenseActiveForPeriod } from '../utils/cancellation';
import { getCategoryIconName } from '../utils/icons';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryColor } from '../utils/categoryColors';

interface AnalysisViewProps {
  transactions: Transaction[];
  stats: any;
  config: Config;
  t: (key: TranslationKey) => string;
  fixedExpenses: FixedExpense[];
  currentLang: Language;
  onViewTransaction?: (t: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onViewFixedExpense?: (expense: FixedExpense) => void;
  periods?: any[];
  currentPeriodDate?: Date;
  onPeriodChange?: (date: Date) => void;
  onOpenCalendarPicker?: () => void;
}

export function AnalysisView({ 
  transactions, 
  stats, 
  config, 
  t, 
  fixedExpenses, 
  _currentLang,
  onViewTransaction,
  onDeleteTransaction,
  onViewFixedExpense,
  periods,
  currentPeriodDate,
  onPeriodChange,
  _onOpenCalendarPicker
}: AnalysisViewProps) {
  const currentPeriod = useMemo(() => {
    if (!periods || periods.length === 0) return null;
    const refTime = currentPeriodDate ? new Date(currentPeriodDate).getTime() : Date.now();
    return periods.find(p => {
      if (!p.start || !p.end) return false;
      const start = new Date(p.start).getTime();
      const end = new Date(p.end).getTime() + 86399999;
      return refTime >= start && refTime <= end;
    }) || periods.find(p => p.isCurrent) || null;
  }, [periods, currentPeriodDate]);

  const availablePeriods = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    return periods.filter(p => !p.isFuture || p.isCurrent);
  }, [periods]);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'variable' | 'fixed'>('all');
  const [_showAllCategories, setShowAllCategories] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isRemainingInfoOpen, setIsRemainingInfoOpen] = useState(false);
  const expandedCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (expandedCategory && expandedCardRef.current) {
      const timer = setTimeout(() => {
        expandedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [expandedCategory]);

  // Robust category matching for strings, objects, category IDs, and Swedish renames
  const isCategoryMatch = useCallback((rawCat: any, catId?: string, targetName?: string) => {
    const target = (targetName || '').trim().toLowerCase();
    if (!target) return false;
    
    const catStr = typeof rawCat === 'object' && rawCat !== null 
      ? (rawCat.name || rawCat.id || '') 
      : (typeof rawCat === 'string' ? rawCat : '');
    const catTrimmed = catStr.trim().toLowerCase();
    
    if (catTrimmed === target) return true;
    
    const allCats = [...(config.categories || []), ...(config.incomeCategories || [])];
    const matched = allCats.find(c => 
      (c?.name || '').trim().toLowerCase() === target || 
      (c?.id && (c.id.toLowerCase() === target || c.id === targetName))
    );
    if (matched) {
      if (matched.name && catTrimmed === matched.name.trim().toLowerCase()) return true;
      if (matched.id && (catTrimmed === matched.id.toLowerCase() || (catId && catId === matched.id))) return true;
    }
    if (catId && (catId.toLowerCase() === target || (matched?.id && catId === matched.id))) return true;
    return false;
  }, [config.categories, config.incomeCategories]);

  const isEn = config.language === 'en';
  const effectiveStats = stats;

  // Display period name + payday date interval (e.g. "Oktober · 25 sep–24 okt") so it is never confused with a calendar month
  const periodDisplayName = useMemo(() => {
    const rawName = effectiveStats?.periodName || currentPeriod?.name;
    let baseName = isEn ? 'Period' : 'Period';
    if (rawName) {
      const cleanName = rawName.includes('(') ? rawName.split('(')[0].trim() : rawName.trim();
      if (cleanName) baseName = cleanName;
    } else {
      const targetDate = stats?.periodEnd || stats?.periodStart || currentPeriod?.end || currentPeriod?.start;
      if (targetDate) {
        const d = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
        if (!isNaN(d.getTime())) {
          const monthName = d.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', { month: 'long' });
          baseName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        }
      }
    }
    return baseName;
  }, [effectiveStats?.periodName, currentPeriod?.name, stats?.periodEnd, stats?.periodStart, currentPeriod?.end, currentPeriod?.start, isEn]);

  const periodIntervalLabel = useMemo(() => {
    const startRaw = stats?.periodStart || currentPeriod?.start;
    const endRaw = stats?.periodEnd || currentPeriod?.end;
    if (startRaw && endRaw) {
      const s = typeof startRaw === 'string' ? new Date(startRaw) : startRaw;
      const e = typeof endRaw === 'string' ? new Date(endRaw) : endRaw;
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const locale = isEn ? 'en-US' : 'sv-SE';
        const sStr = s.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '');
        const eStr = e.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '');
        return `${sStr}–${eStr}`;
      }
    }
    const rawName = effectiveStats?.periodName || currentPeriod?.name;
    if (rawName && rawName.includes('(')) {
      return rawName.split('(')[1]?.replace(')', '').trim() || '';
    }
    return '';
  }, [stats?.periodStart, stats?.periodEnd, currentPeriod?.start, currentPeriod?.end, effectiveStats?.periodName, currentPeriod?.name, isEn]);

  const isPastPeriod = useMemo(() => {
    if (!stats) return false;
    if (stats.isPastPeriod) return true;
    if (stats.periodEnd) {
      const now = new Date();
      const endMidnight = new Date(
        stats.periodEnd.getFullYear(),
        stats.periodEnd.getMonth(),
        stats.periodEnd.getDate(),
        23, 59, 59, 999
      ).getTime();
      return now.getTime() > endMidnight;
    }
    return false;
  }, [stats]);

  const filteredExpenses = useMemo(() => {
    if (!transactions || !stats) return [];
    return transactions.filter(e => {
      const inPeriod = e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime() + 86399999;
      if (!inPeriod) return false;
      if (e.type !== 'expense') return false;
      if ((e.category || '').trim().toLowerCase() === 'spargris') return false;
      return true;
    });
  }, [transactions, stats?.periodStart, stats?.periodEnd]);

  const { categoryData, totalFixed, totalSpentInPeriod } = useMemo(() => {
    const breakdown: Record<string, number> = {};
    const variableBreakdown: Record<string, number> = {};
    let fixedSum = 0;
    let spentSum = 0;

    const includeVariable = analysisFilter === 'all' || analysisFilter === 'variable';
    const includeFixed = analysisFilter === 'all' || analysisFilter === 'fixed';

    filteredExpenses.forEach((e: Transaction) => {
      if (e.type === 'income' || e.type === 'savings') return;
      if ((e.category || '').trim().toLowerCase() === 'spargris') return;

      const transactionSplits = (e as any).splits;
      if (transactionSplits && transactionSplits.length > 0) {
        transactionSplits.forEach((split: any) => {
          const splitCat = (split.category || '').trim();
          if (splitCat.toLowerCase() === 'spargris') return;
          const splitAmt = Number(split.amount) || 0;
          variableBreakdown[splitCat] = (variableBreakdown[splitCat] || 0) + splitAmt;
          if (includeVariable) {
            breakdown[splitCat] = (breakdown[splitCat] || 0) + splitAmt;
            spentSum += splitAmt;
          }
        });
      } else {
        const cat = (e.category || '').trim();
        const amt = Number(e.amount) || 0;
        variableBreakdown[cat] = (variableBreakdown[cat] || 0) + amt;
        if (includeVariable) {
          breakdown[cat] = (breakdown[cat] || 0) + amt;
          spentSum += amt;
        }
      }
    });

    if (includeFixed && stats?.periodStart && stats?.periodEnd) {
      const activeFixed = (fixedExpenses || []).filter((e: any) => !e.isArchived && !e.archived);
      activeFixed.forEach((e: FixedExpense) => {
        if (!isExpenseActiveForPeriod(e, stats.periodStart, stats.periodEnd)) return;
        const isDue = isFixedItemDueInPeriod(e, stats.periodStart, stats.periodEnd);
        if (!isDue) return;

        const category = e.category || t('fixedExpenses');
        let amount = Number(e.amount) || 0;
        if (e.isVariable && e.periodOverrides && stats?.periodId && e.periodOverrides[stats.periodId] !== undefined) {
          amount = Number(e.periodOverrides[stats.periodId]) || 0;
        }
        
        if (analysisFilter !== 'variable') {
          fixedSum += amount;
          breakdown[category] = (breakdown[category] || 0) + amount;
        }
      });
    }

    if (includeVariable) {
      (config.categories || []).forEach(c => {
        const nameTrimmed = (c?.name || '').trim();
        if (nameTrimmed && !(nameTrimmed in breakdown)) {
          breakdown[nameTrimmed] = 0;
        }
      });
    }

    const allCats = [...(config.categories || []), ...(config.incomeCategories || [])];

    const data = Object.entries(breakdown)
      .map(([name, value], index) => {
        const searchName = (name || '').trim().toLowerCase();
        const cat = allCats.find(
          c => (c?.name || '').trim().toLowerCase() === searchName || c?.id === searchName || (c?.id || '').toLowerCase() === searchName
        );
        
        const icon = cat?.icon || getCategoryIconName(name);
        const color = cat?.color || getCategoryColor(name, config.categories, index);
        const budgetValue = cat?.budget !== undefined && cat?.budget !== null 
          ? Number(String(cat.budget).replace(/[^0-9.]/g, "")) 
          : 0;
        const budgetInKronor = !isNaN(budgetValue) && budgetValue > 0 ? Math.round(budgetValue) : 0;
        const variableValue = variableBreakdown[name] || 0;

        return { name, value, variableValue, color, icon, budget: cat?.budget, budgetInKronor };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    
    return { 
      categoryData: data, 
      totalFixed: fixedSum, 
      totalSpentInPeriod: spentSum,
    };
  }, [filteredExpenses, fixedExpenses, t, analysisFilter, config.categories, config.incomeCategories, stats?.periodStart, stats?.periodEnd, stats?.periodId]);

  // Total spent based on filter
  const totalSpent = useMemo(() => {
    if (analysisFilter === 'variable') {
      return totalSpentInPeriod;
    }
    if (analysisFilter === 'fixed') {
      return totalFixed;
    }
    return totalSpentInPeriod + totalFixed;
  }, [analysisFilter, totalSpentInPeriod, totalFixed]);

  // Disposable budget
  const disposableBudget = useMemo(() => {
    if (!stats) return 0;
    const basePot = stats.disposablePot || 0;
    const extraInc = stats.isPastPeriod
      ? (stats.totalExtraIncomeInPeriod || 0)
      : (stats.totalExtraIncomeUpToToday || 0);
    return basePot + extraInc;
  }, [stats]);

  // Remaining budget
  const remainingBudget = useMemo(() => {
    if (!stats) return 0;
    if (stats.remainingPeriodCents !== undefined) {
      return Math.round(stats.remainingPeriodCents);
    }
    return Math.round(disposableBudget - totalSpentInPeriod);
  }, [stats, disposableBudget, totalSpentInPeriod]);

  // Budget percentage used
  const budgetUsedPct = useMemo(() => {
    if (disposableBudget <= 0) {
      return totalSpentInPeriod > 0 ? 100 : 0;
    }
    return Math.max(0, Math.round((totalSpentInPeriod / disposableBudget) * 100));
  }, [disposableBudget, totalSpentInPeriod]);

  // Previous Period Comparison Logic with reliable fallback
  const previousPeriod = useMemo(() => {
    if (!stats?.periodStart) return null;
    const currentStartMs = new Date(stats.periodStart).getTime();
    if (periods && periods.length > 0) {
      const sorted = [...periods]
        .filter(p => p.start && new Date(p.start).getTime() < currentStartMs)
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
      if (sorted.length > 0 && sorted[0]) {
        return sorted[0];
      }
    }
    // Calculate previous period mathematically using user's payday configuration
    const oneDayPrior = new Date(currentStartMs - 86400000);
    const bounds = getPeriodBoundaries(
      oneDayPrior,
      config.paydayType,
      config.payday,
      config.paydayBeforeWeekend
    );
    return {
      periodId: `prev-${bounds.start.getTime()}`,
      start: bounds.start,
      end: bounds.end,
      name: isEn ? 'Previous period' : 'Föregående period',
    };
  }, [periods, stats?.periodStart, config.paydayType, config.payday, config.paydayBeforeWeekend, isEn]);

  // Precise previous period timestamp boundaries (never bleeds into current period)
  const previousPeriodBounds = useMemo(() => {
    if (!previousPeriod || !stats?.periodStart) return null;
    const pStartMs = new Date(previousPeriod.start).getTime();
    const pEndDate = new Date(previousPeriod.end);
    const curStartMs = new Date(stats.periodStart).getTime();
    const rawEndMs = pEndDate.getHours() === 23 ? pEndDate.getTime() : pEndDate.getTime() + 86399999;
    const pEndMs = Math.min(curStartMs - 1, rawEndMs);
    return { pStartMs, pEndMs };
  }, [previousPeriod, stats?.periodStart]);

  const previousPeriodSpent = useMemo(() => {
    if (!previousPeriodBounds || !transactions) return null;
    const { pStartMs, pEndMs } = previousPeriodBounds;
    const includeVariable = analysisFilter === 'all' || analysisFilter === 'variable';
    const includeFixed = analysisFilter === 'all' || analysisFilter === 'fixed';

    let prevSpent = 0;

    if (includeVariable) {
      transactions.forEach(e => {
        if (e.timestamp >= pStartMs && e.timestamp <= pEndMs) {
          if (e.type === 'expense' && (e.category || '').trim().toLowerCase() !== 'spargris') {
            prevSpent += Number(e.amount) || 0;
          }
        }
      });
    }

    if (includeFixed && fixedExpenses && previousPeriod) {
      const pStartDate = new Date(previousPeriod.start);
      const pEndDate = new Date(previousPeriod.end);
      const activeFixed = (fixedExpenses || []).filter((e: any) => !e.isArchived && !e.archived);
      activeFixed.forEach((e: FixedExpense) => {
        if (!isExpenseActiveForPeriod(e, pStartDate, pEndDate)) return;
        const isDue = isFixedItemDueInPeriod(e, pStartDate, pEndDate);
        if (!isDue) return;

        let amount = Number(e.amount) || 0;
        if (e.isVariable && e.periodOverrides && previousPeriod.periodId && e.periodOverrides[previousPeriod.periodId] !== undefined) {
          amount = Number(e.periodOverrides[previousPeriod.periodId]) || 0;
        }
        prevSpent += amount;
      });
    }

    return prevSpent;
  }, [previousPeriodBounds, previousPeriod, transactions, fixedExpenses, analysisFilter]);

  // Previous period spending map per category
  const previousPeriodCategorySpending = useMemo(() => {
    if (!previousPeriodBounds || !transactions) return {};
    const { pStartMs, pEndMs } = previousPeriodBounds;
    const map: Record<string, number> = {};

    const includeVariable = analysisFilter === "all" || analysisFilter === "variable";
    const includeFixed = analysisFilter === "all" || analysisFilter === "fixed";

    if (includeVariable) {
      transactions.forEach(e => {
        if (
          e.timestamp >= pStartMs &&
          e.timestamp <= pEndMs &&
          e.type === "expense" &&
          (e.category || "").trim().toLowerCase() !== "spargris"
        ) {
          const splits = (e as any).splits;
          if (splits && splits.length > 0) {
            splits.forEach((s: any) => {
              const cat = (s.category || "").trim().toLowerCase();
              if (cat === "spargris") return;
              map[cat] = (map[cat] || 0) + (Number(s.amount) || 0);
            });
          } else {
            const cat = (e.category || "").trim().toLowerCase();
            map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
          }
        }
      });
    }

    if (includeFixed && fixedExpenses && previousPeriod) {
      const pStartDate = new Date(previousPeriod.start);
      const pEndDate = new Date(previousPeriod.end);
      fixedExpenses.forEach(fe => {
        if ((fe as any).isArchived || (fe as any).archived) return;
        if (!isExpenseActiveForPeriod(fe, pStartDate, pEndDate)) return;
        const isDue = isFixedItemDueInPeriod(fe, pStartDate, pEndDate);
        if (!isDue) return;

        const cat = (fe.category || t("fixedExpenses")).trim().toLowerCase();
        let amount = Number(fe.amount) || 0;
        if (fe.isVariable && fe.periodOverrides && previousPeriod.periodId && fe.periodOverrides[previousPeriod.periodId] !== undefined) {
          amount = Number(fe.periodOverrides[previousPeriod.periodId]) || 0;
        }
        map[cat] = (map[cat] || 0) + amount;
      });
    }

    return map;
  }, [previousPeriodBounds, previousPeriod, transactions, fixedExpenses, analysisFilter, t]);

  const hasPreviousPeriodData = useMemo(() => {
    return previousPeriodSpent !== null && previousPeriodSpent > 0;
  }, [previousPeriodSpent]);

  // Helper to get historical trend for a category
  const getCategoryTrend = useCallback((categoryName: string, currentValue: number) => {
    if (!previousPeriodBounds) return null;
    const key = (categoryName || '').trim().toLowerCase();
    const prevValue = previousPeriodCategorySpending[key];

    // If there is no previous period transaction data at all
    if (!hasPreviousPeriodData) {
      return { type: 'new' as const, label: isEn ? 'New' : 'Ny' };
    }

    if (prevValue === undefined || prevValue === null || prevValue === 0) {
      if (currentValue > 0) {
        return { type: 'new' as const, label: isEn ? 'New' : 'Ny' };
      }
      return null;
    }

    const diff = currentValue - prevValue;
    const pct = Math.round((diff / prevValue) * 100);
    if (diff === 0) {
      return { type: 'same' as const, label: '0%', diff: 0, pct: 0 };
    }
    if (diff > 0) {
      return { type: 'up' as const, label: `+${pct}%`, diff, pct };
    }
    return { type: 'down' as const, label: `${pct}%`, diff, pct };
  }, [previousPeriodBounds, previousPeriodCategorySpending, hasPreviousPeriodData, isEn]);

  const spentLabel = useMemo(() => {
    if (analysisFilter === 'variable') {
      return isEn ? 'Variable expenses' : 'Rörliga utgifter';
    }
    if (analysisFilter === 'fixed') {
      return isEn ? 'Fixed expenses' : 'Fasta utgifter';
    }
    return isEn ? 'Total expenses' : 'Totala utgifter';
  }, [analysisFilter, isEn]);

  const remainingLabel = useMemo(() => {
    return isPastPeriod
      ? (isEn ? 'Left at period end' : 'Kvar vid periodens slut')
      : (isEn ? 'Remaining to spend' : 'Kvar att spendera');
  }, [isPastPeriod, isEn]);

  // Donut chart items: 1:1 with categoryData so every category uses the exact same color in the chart and list
  const chartItems = useMemo(() => {
    return categoryData.map(c => ({
      name: c.name,
      value: c.value,
      color: c.color,
      icon: c.icon,
      pct: totalSpent > 0 ? Math.round((c.value / totalSpent) * 100) : 0,
      isOther: false,
    }));
  }, [categoryData, totalSpent]);

  const hoveredItem = useMemo(() => chartItems.find(i => i.name === hoveredCategory) || null, [chartItems, hoveredCategory]);

  const previousPeriodIntervalLabel = useMemo(() => {
    if (!previousPeriodBounds) return '';
    const locale = isEn ? 'en-US' : 'sv-SE';
    const sStr = previousPeriodBounds.start.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '');
    const eStr = previousPeriodBounds.end.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '');
    return `${sStr}–${eStr}`;
  }, [previousPeriodBounds, isEn]);

  if (!stats) return null;

  return (
    <div className="space-y-[var(--menu-content-gap)] font-sans">
      {/* 1. Top Controls: Inline Period Selector (with payday interval) + Filter Options */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Period Button */}
        <button
          type="button"
          onClick={() => setIsPeriodModalOpen(true)}
          className="flex-shrink-0 h-[38px] sm:h-[40px] px-3.5 sm:px-4 rounded-full inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium bg-[var(--surface-color)] text-[var(--text-primary)] border border-subtle shadow-2xs hover:bg-black/[0.02] dark:hover:bg-white/[0.04] cursor-pointer active:scale-[0.98] transition-all select-none"
        >
          <Calendar size={14} className="text-[var(--text-secondary)] shrink-0" />
          <span className="font-semibold text-[var(--text-primary)] truncate">
            {periodDisplayName}
          </span>
          {periodIntervalLabel && (
            <span className="text-[var(--text-secondary)] font-normal tabular-nums whitespace-nowrap">
              · {periodIntervalLabel}
            </span>
          )}
          <ChevronDown size={13} className="text-[var(--text-secondary)] shrink-0 ml-0.5" />
        </button>

        {/* Inline Filter Options ("Alla", "Rörliga", "Fasta") */}
        <div className="flex-shrink-0">
          <FilterButtonGroup
            options={[
              {
                id: 'all',
                label: t('all' as TranslationKey) || (isEn ? 'All' : 'Alla'),
              },
              {
                id: 'variable',
                label: isEn ? 'Variable' : 'Rörliga',
              },
              {
                id: 'fixed',
                label: isEn ? 'Fixed' : 'Fasta',
              },
            ]}
            selectedId={analysisFilter}
            onSelect={(id) => {
              setAnalysisFilter(id as 'all' | 'variable' | 'fixed');
              setExpandedCategory(null);
            }}
            ariaLabel={isEn ? 'Filter spending' : 'Filtrera utgifter'}
          />
        </div>
      </div>

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        periods={availablePeriods}
        selectedPeriod={currentPeriod}
        selectedDate={null}
        onSelectPeriod={(p) => {
          if (p) {
            const targetDate = p.date ? new Date(p.date) : (p.start ? new Date(p.start) : null);
            if (targetDate && onPeriodChange) {
              onPeriodChange(targetDate);
            }
          }
        }}
        onSelectDate={() => {}}
        showCalendarOption={false}
        showAllPeriodsOption={false}
        currentLang={config.language}
      />

      {/* 2. Sammanfattningskort med samma stil och proportioner som övriga appen */}
      <div className="grid grid-cols-2 gap-2.5 select-none">
        {/* Kvar att spendera / Kvar vid periodens slut */}
        <Card variant="default" padding="sm" className="select-none flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
              {remainingLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsRemainingInfoOpen(true)}
              className="w-4 h-4 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title={isEn ? 'Explanation' : 'Förklaring'}
              aria-label={isEn ? 'Explanation' : 'Förklaring'}
            >
              <Info size={13} />
            </button>
          </div>
          <div className="flex items-baseline gap-1 pt-1.5">
            <span
              className={`text-large-amount font-bold tabular-nums tracking-tight ${
                remainingBudget < 0
                  ? 'text-[var(--danger-color)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {remainingBudget < 0 ? '−' : ''}
              {formatAmount(Math.abs(remainingBudget), config.language)}
            </span>
            <span className="text-label font-medium text-[var(--text-secondary)]">
              {config.currency || 'kr'}
            </span>
          </div>
          <div className="pt-1">
            <span className="text-micro-label text-[var(--text-tertiary)] tabular-nums block truncate">
              {periodIntervalLabel
                ? (isPastPeriod
                    ? (isEn ? `Completed period (${periodIntervalLabel})` : `Avslutad löneperiod (${periodIntervalLabel})`)
                    : (isEn ? `Ongoing period (${periodIntervalLabel})` : `Pågående löneperiod (${periodIntervalLabel})`))
                : ''}
            </span>
          </div>
        </Card>

        {/* Jämförelse mot föregående period / Budgetförbrukning */}
        <Card variant="default" padding="sm" className="select-none flex flex-col justify-between">
          {hasPreviousPeriodData && previousPeriodSpent !== null ? (
            (() => {
              const diff = Math.round(totalSpent) - Math.round(previousPeriodSpent);
              const absDiff = Math.abs(diff);
              const isLess = diff < 0;
              const isMore = diff > 0;
              return (
                <>
                  <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
                    {isPastPeriod
                      ? (isEn ? 'Compared to previous period' : 'Jämfört med förra perioden')
                      : (isEn ? 'So far vs full previous period' : 'Hittills mot hela förra perioden')}
                  </span>
                  <div className="pt-1.5">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span
                        className={`text-large-amount font-bold tabular-nums tracking-tight ${
                          isLess
                            ? 'text-[var(--success-color)]'
                            : isMore
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {formatAmount(absDiff, config.language)}
                      </span>
                      <span className="text-label font-medium text-[var(--text-secondary)]">
                        {config.currency || 'kr'}{' '}
                        {isLess
                          ? (isEn ? 'less spent' : 'mindre spenderat')
                          : isMore
                          ? (isEn ? 'more spent' : 'mer spenderat')
                          : (isEn ? 'difference' : 'skillnad')}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-micro-label text-[var(--text-tertiary)] tabular-nums block truncate">
                      {previousPeriodIntervalLabel
                        ? (isEn
                            ? `Previous full period: ${formatAmount(Math.round(previousPeriodSpent), config.language)} ${config.currency || 'kr'} (${previousPeriodIntervalLabel})`
                            : `Förra hela perioden: ${formatAmount(Math.round(previousPeriodSpent), config.language)} ${config.currency || 'kr'} (${previousPeriodIntervalLabel})`)
                        : (isEn
                            ? `Previous full period: ${formatAmount(Math.round(previousPeriodSpent), config.language)} ${config.currency || 'kr'}`
                            : `Förra hela perioden: ${formatAmount(Math.round(previousPeriodSpent), config.language)} ${config.currency || 'kr'}`)}
                    </span>
                  </div>
                </>
              );
            })()
          ) : (
            <>
              <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Period budget used' : 'Periodbudget förbrukad'}
              </span>
              <div className="flex items-baseline gap-1 pt-1.5">
                <span className="text-large-amount font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
                  {budgetUsedPct} %
                </span>
                <span className="text-label font-medium text-[var(--text-secondary)]">
                  {isEn ? 'used' : 'använt'}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-micro-label text-[var(--text-tertiary)] block truncate">
                  {isEn ? 'No previous period to compare' : 'Ingen tidigare period att jämföra med'}
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Info Modal för Kvar att spendera */}
      {isRemainingInfoOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsRemainingInfoOpen(false)}
          title={isPastPeriod 
            ? (isEn ? 'Left at period end' : 'Kvar vid periodens slut')
            : (isEn ? 'Remaining to spend' : 'Kvar att spendera')}
          size="sm"
        >
          <div className="space-y-3.5 text-body text-[var(--text-secondary)]">
            <p>
              {isEn 
                ? (isPastPeriod
                    ? 'Remaining at period end reflects the financial result for the entire period (income minus fixed expenses due in the period, planned savings, and variable expenses). This amount applies to your overall finances for the period, regardless of which expense filter is selected in the analysis.'
                    : 'Remaining to spend reflects how much money is available for your entire finances until next payday (income minus fixed expenses due in the period, planned savings, and variable expenses spent so far). This amount applies to your overall finances for the period, regardless of which expense filter is selected in the analysis.')
                : (isPastPeriod
                    ? 'Kvar vid periodens slut visar det faktiska kvarvarande beloppet för hela periodens ekonomi (inkomster minus fasta utgifter som hör till perioden, planerat sparande och rörliga utgifter). Beloppet gäller hela din ekonomi för perioden, oavsett vilket utgiftsfilter du har valt i analysen.'
                    : 'Kvar att spendera visar hur mycket pengar som finns kvar för hela din ekonomi fram till nästa lön (inkomster minus fasta utgifter som hör till perioden, planerat sparande och rörliga utgifter som redan spenderats). Beloppet gäller hela din ekonomi för perioden, oavsett vilket utgiftsfilter du har valt i analysen.')}
            </p>
          </div>
        </Modal>
      )}

      {/* 3. CIRKELDIAGRAM & FÖRDELNING - Sammanhängande kortmodul */}
      {categoryData.length > 0 && totalSpent > 0 && (
        <Card variant="default" padding="sm" className="py-3.5 px-4 select-none">
          {/* Donut Chart Visual & Center Display */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-[192px] h-[192px] sm:w-[212px] sm:h-[212px] flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Background track ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={41}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9.5"
                  className="text-black/[0.04] dark:text-white/[0.06]"
                />
                {(() => {
                  const radius = 41;
                  const circumference = 2 * Math.PI * radius;
                  let accumulatedPercent = 0;
                  const validItems = chartItems.filter(i => i.value > 0);
                  const hasMultiple = validItems.length > 1;

                  return validItems.map((item) => {
                    const fraction = item.value / totalSpent;
                    const strokeLength = fraction * circumference;
                    const gap = hasMultiple ? 1.1 : 0;
                    const visibleLength = Math.max(0.6, strokeLength - gap);
                    const dashArray = `${visibleLength} ${circumference - visibleLength}`;
                    const dashOffset = -accumulatedPercent * circumference;
                    accumulatedPercent += fraction;

                    const isHovered = hoveredCategory === item.name;

                    return (
                      <circle
                        key={item.name}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={isHovered ? 11.5 : 9.5}
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="butt"
                        className="transition-all duration-200 cursor-pointer"
                        style={{
                          opacity: hoveredCategory && !isHovered ? 0.45 : 1,
                          filter: isHovered ? "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" : "none",
                        }}
                        onMouseEnter={() => setHoveredCategory(item.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => {
                          setHoveredCategory(hoveredCategory === item.name ? null : item.name);
                          if (!item.isOther) {
                            setShowAllCategories(true);
                            setExpandedCategory(expandedCategory === item.name ? null : item.name);
                          }
                        }}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Airy Center: Shows Total or Active Category on Hover/Tap */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                {hoveredItem ? (
                  <div className="flex flex-col items-center max-w-[140px] sm:max-w-[160px]">
                    <span className="text-secondary font-medium text-[var(--text-secondary)] truncate max-w-full">
                      {hoveredItem.name}
                    </span>
                    <span className="text-large-amount font-bold text-[var(--text-primary)] font-amount tabular-nums tracking-tight mt-0.5">
                      {formatAmount(Math.round(hoveredItem.value), config.language)}
                      <span className="text-unit ml-1">{config.currency || "kr"}</span>
                    </span>
                    <span className="text-secondary font-medium text-[var(--text-secondary)] tabular-nums mt-0.5">
                      {hoveredItem.pct} %
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-[140px] sm:max-w-[160px]">
                    <span className="text-metric-label font-medium text-[var(--text-secondary)]">
                      {spentLabel}
                    </span>
                    <span className="text-large-amount font-bold text-[var(--text-primary)] font-amount tabular-nums tracking-tight mt-0.5">
                      {formatAmount(Math.round(totalSpent), config.language)}
                      <span className="text-unit ml-1 select-none">{config.currency || "kr"}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 4. KATEGORILISTA MED PRIORITERING, HISTORISK TREND & BUDGETSPÅRNING */}
      {categoryData.length > 0 ? (
        <div className="space-y-[var(--card-gap)] pb-8 select-none">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-section-title">
              {t('categories')}
            </h3>
          </div>

          <Card variant="default" padding="none" className="divide-y divide-subtle overflow-hidden">
            {categoryData.map((item) => {
              const isExpanded = expandedCategory === item.name;
              
              const catNameTrimmed = (item.name || '').trim().toLowerCase();
              
              const categoryTransactions = filteredExpenses
                .filter(t => {
                  if (t.type === 'income') {
                    if (t.category === 'Budgetökning' && (catNameTrimmed === 'spargris' || catNameTrimmed === 'sparande')) return true;
                    return false;
                  }
                  
                  const transactionSplits = (t as any).splits;
                  if (transactionSplits && transactionSplits.length > 0) {
                    return transactionSplits.some((s: any) => isCategoryMatch(s.category, s.categoryId, item.name));
                  }
                  
                  return isCategoryMatch(t.category, (t as any).categoryId, item.name);
                })
                .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
              
              const pStart = stats?.periodStart ? new Date(stats.periodStart) : null;
              const pEnd = stats?.periodEnd ? new Date(stats.periodEnd) : null;

              const categoryFixedExpenses = (fixedExpenses || [])
                .filter(e => {
                  if ((e as any).isArchived || (e as any).archived) return false;
                  if (pStart && pEnd && (!isFixedItemDueInPeriod(e, pStart, pEnd) || !isExpenseActiveForPeriod(e, pStart, pEnd))) return false;
                  const catName = e.category || t('fixedExpenses');
                  return isCategoryMatch(catName, (e as any).categoryId, item.name);
                });

              // Visning: måste avse exakt samma valda period och filter som diagrammet och kategorisumman
              const displayTransactions = analysisFilter === 'fixed'
                ? []
                : categoryTransactions;

              const displayFixedExpenses = analysisFilter === 'variable'
                ? []
                : categoryFixedExpenses;

              const totalItemCount = displayTransactions.length + displayFixedExpenses.length;
              const categoryPct = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0;
              const _catTrend = getCategoryTrend(item.name, item.value);

              // Budgetspårning per kategori (avser kategoribudget för rörliga utgifter)
              const budget = item.budgetInKronor;
              const hasBudget = budget > 0 && analysisFilter !== 'fixed';
              const spentRound = Math.round(item.value);
              const variableSpentRound = Math.round((item as any).variableValue ?? item.value);
              const isOverBudget = hasBudget && variableSpentRound > budget;
              const _budgetUsedPercent = hasBudget ? Math.round((variableSpentRound / budget) * 100) : 0;

              // Föregående period spenderande
              const _prevSpent = previousPeriodCategorySpending[catNameTrimmed];
              const _hasPrevSpent = previousPeriodBounds && hasPreviousPeriodData && _prevSpent !== undefined && _prevSpent !== null && _prevSpent > 0;

              return (
                <div key={item.name} ref={isExpanded ? expandedCardRef : null} className="transition-colors">
                  {/* Kompakt standardläge (hopfällt) */}
                  <div 
                    className="px-3.5 sm:px-4 py-2.5 sm:py-3 min-h-[54px] flex items-center justify-between gap-3 group hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer select-none"
                    onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                  >
                    {/* Vänster: Ikon, Kategorinamn + Färgmarkör (samma som i diagrammet), Tydlig kategoribudgetstatus */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <CategoryIcon icon={item.icon} color={item.color || '#6366f1'} size="md" categoryName={item.name} />
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color || '#6366f1' }}
                            aria-hidden="true"
                          />
                          <p className="text-list-name truncate text-[var(--text-primary)]">
                            {item.name}
                          </p>
                        </div>
                        {analysisFilter !== 'fixed' && (
                          hasBudget ? (
                            <p className={`text-secondary leading-tight mt-0.5 truncate ${
                              isOverBudget
                                ? 'text-[var(--danger-color)] font-medium'
                                : 'text-[var(--text-secondary)]'
                            }`}>
                              {isOverBudget
                                ? (isEn 
                                    ? `${formatAmount(variableSpentRound - budget, config.language)} ${config.currency || 'kr'} over category budget` 
                                    : `${formatAmount(variableSpentRound - budget, config.language)} ${config.currency || 'kr'} över kategoribudget`)
                                : (isEn 
                                    ? `${formatAmount(budget - variableSpentRound, config.language)} ${config.currency || 'kr'} left of category budget` 
                                    : `${formatAmount(budget - variableSpentRound, config.language)} ${config.currency || 'kr'} kvar av kategoribudget`)}
                            </p>
                          ) : (
                            <p className="text-secondary leading-tight mt-0.5 truncate text-[var(--text-tertiary)]">
                              {isEn ? 'No category budget' : 'Ingen kategoribudget'}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    {/* Höger: Tydlig högerkolumn för belopp + procent + chevron */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 whitespace-nowrap pl-2">
                      <div className="w-[110px] sm:w-[130px] text-right flex flex-col items-end justify-center shrink-0">
                        <p className="text-list-amount text-[var(--text-primary)] font-semibold leading-tight tabular-nums">
                          {formatAmount(spentRound, config.language)}
                          <span className="text-unit ml-1 select-none">{config.currency || 'kr'}</span>
                        </p>
                        <span className="text-secondary text-[var(--text-secondary)] tabular-nums mt-0.5 leading-tight font-normal">
                          {categoryPct} %
                        </span>
                      </div>
                      <div className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-60'}`}>
                        <ChevronDown size={16} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanderat detaljläge (underordnade rader med indrag och utan kategoridubblering) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-[var(--card-nested-bg)] border-t border-subtle"
                      >
                        <div className="divide-subtle">
                          {displayTransactions.map((t) => {
                            // Om transaktionen är uppdelad på flera kategorier, visa den del som ingår i kategorins summa
                            let txPeriodAmount = t.amount;
                            const txSplits = (t as any).splits;
                            if (Array.isArray(txSplits) && txSplits.length > 0) {
                              const matchingSplitSum = txSplits
                                .filter((s: any) => isCategoryMatch(s.category, s.categoryId, item.name))
                                .reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);
                              if (matchingSplitSum > 0) {
                                txPeriodAmount = matchingSplitSum;
                              }
                            }
                            return (
                              <TransactionItem 
                                key={t.id}
                                transaction={t}
                                displayAmount={txPeriodAmount}
                                config={config}
                                onView={onViewTransaction}
                                onDelete={onDeleteTransaction}
                                variant="transparent"
                                showDate={true}
                                hideCategoryBadge={true}
                                compact={true}
                              />
                            );
                          })}

                          {displayFixedExpenses.map((fe) => {
                            const effectiveFeAmount =
                              fe.isVariable &&
                              fe.periodOverrides &&
                              stats?.periodId &&
                              fe.periodOverrides[stats.periodId] !== undefined
                                ? Number(fe.periodOverrides[stats.periodId]) || 0
                                : fe.amount;
                            // Present the actual period expense amount included in the chart sum (no /mo or /yr contract suffix)
                            const feTransaction: any = {
                              id: fe.id,
                              merchant: fe.name,
                              category: fe.category,
                              amount: effectiveFeAmount,
                              type: 'expense',
                              deductionDay: fe.deductionDay,
                              paymentMethod: fe.paymentMethod,
                              icon: fe.icon,
                              logo: fe.logo,
                            };
                            return (
                              <TransactionItem
                                key={fe.id}
                                transaction={feTransaction}
                                isFixed={true}
                                config={config}
                                onClick={() => onViewFixedExpense?.(fe)}
                                onView={() => onViewFixedExpense?.(fe)}
                                variant="transparent"
                                hideCategoryBadge={true}
                                compact={true}
                              />
                            );
                          })}

                          {totalItemCount === 0 && (
                            <div className="py-4 px-4 text-center text-[var(--text-tertiary)] text-secondary">
                              {isEn ? 'No transactions in this category' : 'Inga transaktioner i denna kategori'}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </Card>
        </div>
      ) : (
        <div className="pb-8">
          <EmptyState
            title={isEn ? 'No expenses yet' : 'Inga utgifter ännu'}
            description={
              isEn
                ? 'There are no expenses to show for this selection.'
                : 'Det finns inga utgifter att visa för det här urvalet.'
            }
          />
        </div>
      )}
    </div>
  );
}
