import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import {
  Transaction,
  Config,
  Income,
  FixedExpense,
  Frequency,
} from "../types";
import { TranslationKey } from "../i18n";
import { TransactionItem } from "./TransactionItem";
import { EmptyState } from "./EmptyState";
import { GreetingModule } from "./GreetingModule";
import { PeriodTimeline } from "./PeriodTimeline";
import { ICON_MAP, getCategoryIconName, isEmojiString } from "../utils/icons";
import { formatAmount } from "../utils/format";
import { CategoryBottomSheetModal } from "./CategoryBottomSheetModal";
import { feedback } from "../utils/feedback";
import { designSystem } from "../constants/designSystem";

interface TodayViewProps {
  stats: any;
  config: Config;
  userName?: string;
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onAddTransaction: (date?: Date) => void;
  onQuickAddExpense?: (amount: number, note?: string, category?: string) => Promise<void> | void;
  onAddIncome: (date?: Date) => void;
  onViewTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigate: (tab: string, section?: string) => void;
  attentionItems?: any[];
  onEditAttentionItem?: (item: any) => void;
  transactions: Transaction[];
  allTransactions: Transaction[];
  t: (key: TranslationKey) => string;
  currentPeriodDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  isCurrentPeriod: boolean;
  periods: any[];
  setCurrentPeriodDate: (date: Date) => void;
  avatarUrl?: string | null;
  onViewFixedExpense?: (expense: FixedExpense) => void;
  onViewIncome?: (income: Income) => void;
  onViewMonthlySaving?: (saving: any) => void;
  onUpdateConfig?: (config: Config) => void;
  onOpenCalculator?: () => void;
  isDemoMode?: boolean;
}

export function TodayView({
  stats,
  config,
  userName,
  incomes,
  fixedExpenses,
  isDemoMode,
  selectedDate,
  setSelectedDate,
  onAddTransaction,
  onQuickAddExpense,
  onAddIncome,
  onViewTransaction,
  onDeleteTransaction,
  onNavigate,
  attentionItems: _attentionItems = [],
  onEditAttentionItem: _onEditAttentionItem,
  _transactions,
  allTransactions = [],
  t,
  currentPeriodDate,
  _currentPeriodStart,
  _currentPeriodEnd,
  isCurrentPeriod,
  periods,
  setCurrentPeriodDate,
  avatarUrl,
  onViewFixedExpense,
  onViewIncome,
  onViewMonthlySaving,
  onUpdateConfig,
  onOpenCalculator,
}: TodayViewProps) {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [heroHeight, setHeroHeight] = useState(300);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryModalName, setSelectedCategoryModalName] = useState<string | null>(null);

  const handleCategoryClick = useCallback((catName: string) => {
    if (typeof feedback.light === 'function') feedback.light();
    setSelectedCategoryModalName(catName);
    setIsCategoryModalOpen(true);
  }, []);

  const lang = config?.language || 'sv';


  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const _handleToggleExpand = useCallback(() => {
    const threshold = Math.max(60, (heroHeight || 300) * 0.4);
    if (window.scrollY > threshold) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const target = heroRef.current ? heroRef.current.offsetHeight : 300;
      window.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [heroHeight]);

  const progress = Math.min(1, Math.max(0, scrollY / Math.max(1, heroHeight || 300)));
  const _heroOpacity = Math.max(0.25, 1 - progress * 0.75);
  const _heroScale = Math.max(0.96, 1 - progress * 0.04);

  const normalizedSelectedDate = useMemo(() => {
    const d = new Date(selectedDate || new Date());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const calendarDays = stats?.days || [];

  const isTodaySelected = useMemo(() => {
    return normalizedSelectedDate.toDateString() === new Date().toDateString();
  }, [normalizedSelectedDate]);

  const handleGoToToday = () => {
    const now = new Date();
    setSelectedDate(now);
    if (setCurrentPeriodDate) setCurrentPeriodDate(now);
  };

  const todayData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return null;
    return calendarDays.find((d: any) => d.isToday) || calendarDays[0];
  }, [calendarDays]);

  const selectedDayData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return null;
    const selectedTime = normalizedSelectedDate.getTime();
    return (
      calendarDays.find((d: any) => {
        if (!d.date) return false;
        const dDate = new Date(d.date);
        dDate.setHours(0, 0, 0, 0);
        return dDate.getTime() === selectedTime;
      }) ||
      calendarDays.find((d: any) => d.isToday) ||
      calendarDays[0]
    );
  }, [calendarDays, normalizedSelectedDate]);

  const fixedTransactions = useMemo(() => {
    const day = normalizedSelectedDate.getDate();
    const transactions: any[] = [];
    const periodId = stats?.periodId;

    incomes.forEach((i) => {
      if (i.deductionDay === day) {
        // Frequency check
        let isActiveThisMonth = true;
        const currentMonth = normalizedSelectedDate.getMonth();
        
        if (i.frequency && i.startMonth !== undefined && i.frequency !== Frequency.MONTHLY) {
          const startM = i.startMonth;
          if (i.frequency === Frequency.QUARTERLY) isActiveThisMonth = (currentMonth - startM) % 3 === 0;
          else if (i.frequency === Frequency.SEMI_ANNUALLY) isActiveThisMonth = (currentMonth - startM) % 6 === 0;
          else if (i.frequency === Frequency.ANNUALLY) isActiveThisMonth = currentMonth === startM;
        }

        if (isActiveThisMonth) {
          const amount =
            i.isVariable &&
            periodId &&
            i.periodOverrides &&
            i.periodOverrides[periodId] !== undefined
              ? i.periodOverrides[periodId]
              : Number(i.amount) || 0;

          transactions.push({
            id: `fixed-inc-${i.id}`,
            amount,
            type: "income",
            category: i.category || (lang === "en" ? "Fixed Income" : "Fast inkomst"),
            merchant: i.name,
            timestamp: normalizedSelectedDate.getTime(),
            isFixed: true,
            originalItem: i,
          });
        }
      }
    });

    fixedExpenses.forEach((e) => {
      if (e.deductionDay === day) {
        // Frequency check
        let isActiveThisMonth = true;
        const currentMonth = normalizedSelectedDate.getMonth();
        
        if (e.frequency && e.startMonth !== undefined) {
          const startM = e.startMonth;
          if (e.frequency === Frequency.QUARTERLY) {
            isActiveThisMonth = (currentMonth - startM) % 3 === 0;
          } else if (e.frequency === Frequency.SEMI_ANNUALLY) {
            isActiveThisMonth = (currentMonth - startM) % 6 === 0;
          } else if (e.frequency === Frequency.ANNUALLY) {
            isActiveThisMonth = currentMonth === startM;
          }
        }

        if (isActiveThisMonth) {
          const amount =
            e.isVariable &&
            periodId &&
            e.periodOverrides &&
            e.periodOverrides[periodId] !== undefined
              ? e.periodOverrides[periodId]
              : Number(e.amount) || 0;

          transactions.push({
            id: `fixed-exp-${e.id}`,
            amount,
            type: "expense",
            category: e.category || (lang === "en" ? "Fixed Expense" : "Fast utgift"),
            merchant: e.name,
            timestamp: normalizedSelectedDate.getTime(),
            isFixed: true,
            originalItem: e,
          });
        }
      }
    });

    if (config?.monthlySavingsItems) {
      config.monthlySavingsItems.forEach((s) => {
        if (s.deductionDay === day) {
          // Frequency check
          let isActiveThisMonth = true;
          const currentMonth = normalizedSelectedDate.getMonth();
          
          if (s.frequency && s.startMonth !== undefined && s.frequency !== Frequency.MONTHLY) {
            const startM = s.startMonth;
            if (s.frequency === Frequency.QUARTERLY) isActiveThisMonth = (currentMonth - startM) % 3 === 0;
            else if (s.frequency === Frequency.SEMI_ANNUALLY) isActiveThisMonth = (currentMonth - startM) % 6 === 0;
            else if (s.frequency === Frequency.ANNUALLY) isActiveThisMonth = currentMonth === startM;
          }

          if (isActiveThisMonth) {
            const amount =
              s.isVariable &&
              periodId &&
              s.periodOverrides &&
              s.periodOverrides[periodId] !== undefined
                ? s.periodOverrides[periodId]
                : Number(s.amount) || 0;

            transactions.push({
              id: `fixed-sav-${s.id}`,
              amount,
              type: "expense",
              category: lang === "en" ? "Savings" : "Sparande",
              merchant: s.name,
              timestamp: normalizedSelectedDate.getTime(),
              isFixed: true,
              originalItem: s,
            });
          }
        }
      });
    }

    return transactions;
  }, [normalizedSelectedDate, incomes, fixedExpenses, config?.monthlySavingsItems, lang, stats?.periodId]);

  const categoryBudgetData = useMemo(() => {
    if (!stats || !config?.categories || config.categories.length === 0) return [];

    const periodStartMs = stats?.periodStart ? new Date(stats.periodStart).getTime() : 0;
    const periodEndMs = stats?.periodEnd ? new Date(stats.periodEnd).getTime() + 86399999 : Infinity;

    // Filter transactions strictly within the current period
    const currentPeriodTransactions = (stats.periodTransactions || (allTransactions || []).filter((t: any) => {
      if (!t.timestamp) return false;
      return t.timestamp >= periodStartMs && t.timestamp <= periodEndMs;
    }));

    const pool = config.categories;

    return pool
      .map((cat: any, index: number) => {
        const name = cat.name;
        const normName = name.trim().toLowerCase();

        // Calculate variable spent with splits support (identical to AnalysisView)
        const spent = currentPeriodTransactions
          .filter((t: any) => {
            if (t.type === "income" || t.isExcludedFromBudget || t.isInternalTransfer || t.isTransfer) return false;
            if ((t.category || "").trim().toLowerCase() === normName) return true;
            const splits = (t as any).splits;
            if (splits && Array.isArray(splits) && splits.length > 0) {
              return splits.some((s: any) => (s.category || "").trim().toLowerCase() === normName);
            }
            return false;
          })
          .reduce((sum: number, t: any) => {
            const splits = (t as any).splits;
            if (splits && Array.isArray(splits) && splits.length > 0) {
              const splitSum = splits
                .filter((s: any) => (s.category || "").trim().toLowerCase() === normName)
                .reduce((sSum: number, s: any) => sSum + (Number(s.amount) || 0), 0);
              return sum + splitSum;
            }
            return sum + (Number(t.amount) || 0);
          }, 0);

        const budgetValue = cat.budget !== undefined && cat.budget !== null 
          ? Number(String(cat.budget).replace(/[^0-9.]/g, "")) 
          : 0;
        
        const fixedSpent = (fixedExpenses || [])
          .filter((e) => e.category?.trim().toLowerCase() === normName)
          .reduce((sum, e) => {
            const amount = (e.isVariable && e.periodOverrides && stats?.periodId && e.periodOverrides[stats.periodId] !== undefined)
              ? e.periodOverrides[stats.periodId]
              : (Number(e.amount) || 0);
            switch (e.frequency) {
              case "quarterly": return sum + amount / 3;
              case "semi-annually": return sum + amount / 6;
              case "annually": return sum + amount / 12;
              default: return sum + amount;
            }
          }, 0);

        const rawBudgetInKronor = !isNaN(budgetValue) && budgetValue > 0 ? Math.round(budgetValue) : 0;
        const budgetInKronor = Math.max(rawBudgetInKronor, Math.round(fixedSpent));
        const hasBudget = budgetInKronor > 0;
        const remaining = budgetInKronor - Math.round(spent);
        const iconName = cat.icon || getCategoryIconName(name);
        const isOverBudget = hasBudget && remaining < 0;

        return {
          name,
          spent: Math.round(spent),
          budget: cat.budget,
          budgetInKronor,
          hasBudget,
          remaining,
          isOverBudget,
          color: cat.color,
          iconName,
          index,
          pinned: !!cat.pinned,
          pinOrder: cat.pinOrder !== undefined ? Number(cat.pinOrder) : 9999,
        };
      })
      .filter((cat) => cat.budgetInKronor > 0)
      .sort((a, b) => {
        // 1. PINNED CATEGORIES FIRST
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.pinned && b.pinned) {
          return a.pinOrder - b.pinOrder;
        }

        // Neither is pinned - compare percentages spent
        const aPct = a.budgetInKronor > 0 ? a.spent / a.budgetInKronor : 0;
        const bPct = b.budgetInKronor > 0 ? b.spent / b.budgetInKronor : 0;

        // 2. OVER BUDGET
        const aOver = a.isOverBudget;
        const bOver = b.isOverBudget;
        if (aOver && !bOver) return -1;
        if (!aOver && bOver) return 1;
        if (aOver && bOver) {
          // Both are over - sort by percentage over budget descending
          return bPct - aPct;
        }

        // 3. HIGHEST PERCENT SPENT DESCENDING (e.g. 93% before 10%)
        return bPct - aPct;
      });
  }, [stats, config?.categories, fixedExpenses]);

  const displayedVariableTransactions = useMemo(() => {
    return stats?.isPastPeriod
      ? (stats.periodTransactions || [])
      : (selectedDayData?.transactions || []);
  }, [stats?.isPastPeriod, stats?.periodTransactions, selectedDayData?.transactions]);

  const displayedFixedTransactions = (config?.showFixedExpensesInCalendar ?? true) ? fixedTransactions : [];

  useEffect(() => {
    const updateHeight = () => {
      if (heroRef.current) {
        const h = heroRef.current.offsetHeight;
        if (h > 0) setHeroHeight(h);
      }
    };
    updateHeight();
    
    let ro: ResizeObserver | null = null;
    if (heroRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h = (entry.target as HTMLElement).offsetHeight || entry.contentRect.height;
          if (h > 0) setHeroHeight(h);
        }
      });
      ro.observe(heroRef.current);
    }
    
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      if (ro) ro.disconnect();
    };
  }, [categoryBudgetData.length, todayData]);

  if (!stats) return null;

  const _heroStickyTop = isDemoMode
    ? 'top-[calc(7.2rem+env(safe-area-inset-top,0px))]'
    : 'top-[calc(4.75rem+env(safe-area-inset-top,0px))]';

  const _timelineStickyTop = isDemoMode
    ? 'top-[calc(6.8rem+env(safe-area-inset-top,0px))]'
    : 'top-[calc(4.25rem+env(safe-area-inset-top,0px))]';

  return (
    <div className="relative font-sans">

      {/* 1. FIXED STATIC HERO LAYER (Kvar att spendera + Dina budgetar) */}
      <div
        ref={heroRef}
        className="fixed left-0 right-0 z-10 pointer-events-auto"
        style={{
          top: isDemoMode 
            ? 'calc(7.2rem + env(safe-area-inset-top, 0px))' 
            : 'calc(4.25rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="max-w-2xl mx-auto px-3">
          <GreetingModule
            userName={userName}
            availableForD={todayData?.availableForD || stats?.availableForD || 0}
            currency={config?.currency || 'kr'}
            isToday={!!selectedDayData?.isToday}
            date={normalizedSelectedDate}
            language={lang}
            stats={stats}
            t={t}
            calendarDays={calendarDays}
            setSelectedDate={setSelectedDate}
            setCurrentPeriodDate={setCurrentPeriodDate}
            periodStart={stats.periodStart}
            periodEnd={stats.periodEnd}
            isFuturePeriod={stats.isFuturePeriod}
            isPastPeriod={stats.isPastPeriod}
            periods={periods}
            avatarUrl={avatarUrl}
            onNavigate={onNavigate}
            showFixedInCalendar={config?.showFixedExpensesInCalendar}
            isCurrentPeriod={isCurrentPeriod}
            currentPeriodDate={currentPeriodDate}
            config={config}
            onUpdateConfig={onUpdateConfig}
            onAddExpense={() => onAddTransaction(selectedDate)}
            onAddIncome={() => onAddIncome(selectedDate)}
            onQuickAddExpense={onQuickAddExpense}
            onOpenCalculator={onOpenCalculator}
            allTransactions={allTransactions}
            categoryBudgets={
              <div className="mt-1 sm:mt-2 pb-1">
                {categoryBudgetData.length > 0 ? (
                  <div className="flex items-center gap-3.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                    {categoryBudgetData.map((cat, index) => {
                      const Icon = ICON_MAP[cat.iconName];

                      return (
                        <motion.button
                          key={cat.name}
                          initial={{ opacity: 0, scale: 0.97, x: 6 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          transition={{ delay: 0.04 + index * 0.015, type: 'spring', stiffness: 400, damping: 30 }}
                          onClick={() => handleCategoryClick(cat.name)}
                          style={{ backgroundColor: cat.color || '#6E6961' }}
                          className="flex-shrink-0 w-[100px] sm:w-[110px] h-[100px] sm:h-[110px] p-3 rounded-[22px] flex flex-col items-center justify-between text-center group cursor-pointer border-none shadow-sm transition-transform active:scale-95"
                        >
                          {/* Icon without circle, white */}
                          <div className="flex items-center justify-center pt-1 text-white">
                            {isEmojiString(cat.iconName) ? (
                              <span className="text-[20px] leading-none">{cat.iconName}</span>
                            ) : Icon ? (
                              <Icon size={22} strokeWidth={1.8} />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>

                          {/* Category Name */}
                          <span className="text-[12px] font-bold text-white tracking-tight max-w-[90px] truncate px-0.5 drop-shadow-xs">
                            {cat.name}
                          </span>

                          {/* Remaining / Spent Amount */}
                          <span className="text-[10px] font-medium text-white/95 tabular-nums tracking-tight whitespace-nowrap bg-black/15 px-2 py-0.5 rounded-full">
                            {cat.hasBudget ? `${formatAmount(cat.remaining, lang)} ${config?.currency || 'kr'} ${lang === 'en' ? 'left' : 'kvar'}` : `${formatAmount(cat.spent, lang)} ${config?.currency || 'kr'}`}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate("budget", "category-budgets")}
                    className="w-full p-4 rounded-[20px] bg-white dark:bg-[#1C1C1C] hover:bg-black/[0.02] dark:hover:bg-[#222222] border-none text-[#1C1917] dark:text-white shadow-none transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-[#222222] border-none flex items-center justify-center text-[#6E6961] dark:text-[#A8A8A8] transition-colors">
                        <SlidersHorizontal size={15} strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-[#1C1917] dark:text-white leading-snug">
                          {lang === "en" ? "Allocate your budget" : "Fördela din vardagsbudget"}
                        </p>
                        <p className="text-[11px] font-normal text-[#8C867C] dark:text-[#A8A8A8]">
                          {lang === "en" ? "Set limits per category" : "Sätt gränser per kategori"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#8C867C] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors" />
                  </button>
                )}
              </div>
            }
          />
        </div>
      </div>

      {/* Spacer matching heroHeight so bottom sheet starts cleanly below the static hero */}
      <div
        style={{ height: heroHeight > 0 ? `${heroHeight + 6}px` : '320px' }}
        className="w-full shrink-0 pointer-events-none"
      />

      {/* 2. SCROLL CONTAINER / SHEET MODULE */}
      <div
        ref={sheetRef}
        className="relative z-20 -mx-4 sm:-mx-6 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] bg-[var(--surface-color)] rounded-t-[32px] sm:rounded-t-[32px] shadow-sm flex flex-col h-auto pb-28"
      >
        <div className="p-5 sm:p-6 space-y-5 pb-6 sm:pb-8">

        {/* 3. PERIOD TIMELINE */}
        {calendarDays && calendarDays.length > 0 && (
          <div className="sticky top-0 z-20 bg-[var(--surface-color)] pt-0 pb-2.5 transition-all">
            <PeriodTimeline
              calendarDays={calendarDays}
              selectedDate={normalizedSelectedDate}
              onSelectDate={setSelectedDate}
              stats={stats}
              language={lang}
              isCurrentPeriod={isCurrentPeriod}
              showFixedInCalendar={config?.showFixedExpensesInCalendar}
            />
          </div>
        )}

      {/* 4. SELECTED DAY'S TRANSACTIONS (Natural Swedish casing: Idag, 26 september) */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className={designSystem.typography.contentSectionTitle}>
            {stats.isPastPeriod
              ? (lang === "en" ? "Period transactions" : "Periodens transaktioner")
              : selectedDate.toDateString() === new Date().toDateString()
                ? `${lang === "en" ? "Today" : "Idag"}, ${selectedDate.toLocaleDateString(lang === "en" ? "en-US" : "sv-SE", { day: "numeric", month: "long" })}`
                : selectedDate.toLocaleDateString(
                    lang === "en" ? "en-US" : "sv-SE",
                    { day: "numeric", month: "long" },
                  )}
          </h3>
          {!isTodaySelected && (
            <button
              onClick={handleGoToToday}
              className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-white dark:bg-white/[0.04] hover:bg-[var(--bg-hover)] dark:hover:bg-white/[0.07] border border-[var(--border-color)] dark:border-white/[0.045] backdrop-blur-[18px] text-xs font-medium text-[#1C1917] dark:text-[#C7CDDC] hover:text-black dark:hover:text-white transition-all active:scale-95 cursor-pointer shadow-none ml-auto"
            >
              <RotateCcw size={11} strokeWidth={1.75} />
              <span>{lang === "en" ? "Today" : "Idag"}</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {displayedVariableTransactions.length > 0 ? (
              <motion.div className="space-y-2.5" key="transactions">
                {displayedVariableTransactions.map((transaction: Transaction, index: number) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <TransactionItem
                      transaction={transaction}
                      onView={onViewTransaction}
                      onDelete={onDeleteTransaction}
                      language={lang}
                      currency={config?.currency || 'kr'}
                      config={config}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : displayedFixedTransactions.length === 0 ? (
              <EmptyState
                title={isTodaySelected ? (lang === "en" ? "No transactions recorded yet" : "Inga transaktioner registrerade än") : (lang === "en" ? "No transactions on this date" : "Inga transaktioner detta datum")}
                description={isTodaySelected ? (lang === "en" ? "Add an expense or income to track today's spending." : "Lägg till en utgift eller inkomst för att hålla koll på dagsbudgeten.") : (lang === "en" ? "Click below to add a transaction for this date" : "Klicka nedan för att registrera en transaktion på detta datum")}
                onAction={() => onAddTransaction(selectedDate)}
                actionLabel={`+ ${t("addExpense")}`}
              />
            ) : null}
          </AnimatePresence>

          {/* Fixed transactions for the day (Natural Swedish casing) */}
          {displayedFixedTransactions.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs sm:text-[13px] font-bold font-display uppercase tracking-wider text-[#6E6961] dark:text-[#A8A8A8] px-1">
                {lang === "en" ? "Fixed transactions" : "Fasta transaktioner"}
              </h4>
              <div className="space-y-2.5">
                {displayedFixedTransactions.map((item) => {
                  const tx: Transaction = {
                    id: item.id,
                    merchant: item.merchant,
                    category: item.category,
                    amount: item.amount,
                    type: item.type as any,
                    date: selectedDate.toISOString(),
                  };

                  return (
                    <TransactionItem
                      key={item.id}
                      transaction={tx}
                      isFixed={true}
                      config={config}
                      onClick={() => {
                        if (item.type === "income" && onViewIncome) {
                          onViewIncome(item.originalItem);
                        } else if (item.originalItem?.targetAmount && onViewMonthlySaving) {
                          onViewMonthlySaving(item.originalItem);
                        } else if (onViewFixedExpense) {
                          onViewFixedExpense(item.originalItem);
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      </div>

      {/* Category Quick View Bottom Sheet Modal */}
      <CategoryBottomSheetModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategoryModalName(null);
        }}
        categoryName={selectedCategoryModalName}
        categoryData={categoryBudgetData.find(c => c.name.toLowerCase() === selectedCategoryModalName?.toLowerCase()) || null}
        selectedDate={selectedDate}
        allTransactions={allTransactions}
        stats={stats}
        config={config}
        language={lang}
        onViewTransaction={onViewTransaction}
        onDeleteTransaction={onDeleteTransaction}
        onAddTransaction={onAddTransaction}
        onNavigate={onNavigate}
      />
    </div>
  );
}
