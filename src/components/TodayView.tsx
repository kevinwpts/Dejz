import React, { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  Clock,
  Info,
  X,
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
import { getCategoryColor } from "../utils/categoryColors";

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
  isDemoMode: _isDemoMode,
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryModalName, setSelectedCategoryModalName] = useState<string | null>(null);

  const handleCategoryClick = useCallback((catName: string) => {
    if (typeof feedback.light === 'function') feedback.light();
    setSelectedCategoryModalName(catName);
    setIsCategoryModalOpen(true);
  }, []);

  const lang = config?.language || 'sv';

  const normalizedSelectedDate = useMemo(() => {
    const d = new Date(selectedDate || new Date());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const calendarDays = stats?.days || [];

  const [isPeriodInfoOpen, setIsPeriodInfoOpen] = useState(false);

  const effectiveRemainingDays = useMemo(() => {
    if (!stats) return 1;
    const normDate = new Date();
    normDate.setHours(0, 0, 0, 0);
    const index = calendarDays.findIndex((d: any) => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === normDate.getTime();
    });
    if (index !== -1) {
      return Math.max(1, calendarDays.length - index);
    }
    return stats?.remainingDays || 1;
  }, [calendarDays, stats?.remainingDays]);

  const periodIntervalText = useMemo(() => {
    const start = stats?.periodStart;
    const end = stats?.periodEnd;
    if (!start || !end) return '—';
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '—';

    const formatDate = (d: Date) => {
      const formatted = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'sv-SE', {
        day: 'numeric',
        month: 'short',
      });
      return formatted.replace(/\.$/, '');
    };

    return `${formatDate(startDate)} \u2013 ${formatDate(endDate)}`;
  }, [stats?.periodStart, stats?.periodEnd, lang]);

  const daysValueText = useMemo(() => {
    if (stats?.isPastPeriod) {
      return lang === 'en' ? 'Ended' : 'Avslutad';
    }
    const days = effectiveRemainingDays;
    return lang === 'en' ? `${days} ${days === 1 ? 'day' : 'days'}` : `${days} ${days === 1 ? 'dag' : 'dagar'}`;
  }, [stats?.isPastPeriod, effectiveRemainingDays, lang]);

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
              : i.amount;

          transactions.push({
            id: `income-${i.id}`,
            merchant: i.name,
            category: i.category || (lang === "en" ? "Income" : "Inkomst"),
            amount: amount,
            type: "income",
            originalItem: i,
          });
        }
      }
    });

    fixedExpenses.forEach((fe) => {
      if (fe.deductionDay === day) {
        let isActiveThisMonth = true;
        const currentMonth = normalizedSelectedDate.getMonth();
        
        if (fe.frequency && fe.startMonth !== undefined && fe.frequency !== Frequency.MONTHLY) {
          const startM = fe.startMonth;
          if (fe.frequency === Frequency.QUARTERLY) isActiveThisMonth = (currentMonth - startM) % 3 === 0;
          else if (fe.frequency === Frequency.SEMI_ANNUALLY) isActiveThisMonth = (currentMonth - startM) % 6 === 0;
          else if (fe.frequency === Frequency.ANNUALLY) isActiveThisMonth = currentMonth === startM;
        }

        if (isActiveThisMonth) {
          const amount =
            fe.isVariable &&
            periodId &&
            fe.periodOverrides &&
            fe.periodOverrides[periodId] !== undefined
              ? fe.periodOverrides[periodId]
              : fe.amount;

          transactions.push({
            id: `fixed-${fe.id}`,
            merchant: fe.name,
            category: fe.category || (lang === "en" ? "Fixed Expense" : "Fast utgift"),
            amount: amount,
            type: "expense",
            originalItem: fe,
          });
        }
      }
    });

    const savingsList = config?.monthlySavingsItems && config.monthlySavingsItems.length > 0 
      ? config.monthlySavingsItems 
      : (stats?.savingsGoals || []);

    savingsList.forEach((goal: any) => {
      if (goal.deductionDay === day) {
        const itemAmount = goal.amount !== undefined && goal.amount !== null ? goal.amount : goal.targetAmount;
        transactions.push({
          id: goal.id ? (goal.id.startsWith('saving-') ? goal.id : `saving-${goal.id}`) : `saving-${Math.random()}`,
          merchant: goal.name,
          category: lang === "en" ? "Monthly Saving" : "Månadssparande",
          amount: itemAmount,
          type: "expense",
          originalItem: {
            ...goal,
            amount: itemAmount,
          },
        });
      }
    });

    return transactions;
  }, [normalizedSelectedDate, incomes, fixedExpenses, config?.monthlySavingsItems, stats?.savingsGoals, stats?.periodId, lang]);

  const hasSavedBudget = useMemo(() => {
    return Boolean(
      config?.hasSavedInitialBudget ||
      (config?.categories && config.categories.some((c: any) => typeof c.budget === 'number' && c.budget > 0)) ||
      (stats?.categories && Object.values(stats.categories).some((c: any) => typeof c.userBudget === 'number' && c.userBudget > 0)) ||
      (typeof window !== 'undefined' && (
        localStorage.getItem('dejz_has_saved_initial_budget') === 'true' ||
        localStorage.getItem('dejz_has_saved_budget') === 'true'
      ))
    );
  }, [config?.hasSavedInitialBudget, config?.categories, stats?.categories]);

  const categoryBudgetData = useMemo(() => {
    if (!stats?.categories) return [];
    return Object.values(stats.categories)
      .map((cat: any) => {
        const spent = cat.spent || 0;
        const budget = cat.budget || 0;
        const variableSpent = cat.variableSpent !== undefined ? cat.variableSpent : Math.max(0, spent - (cat.fixedSpent || 0));
        const remaining = budget - spent;
        const hasBudget = budget > 0;
        const percentage = hasBudget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
        const isOverBudget = hasBudget && spent > budget;

        return {
          name: cat.name,
          spent,
          budget,
          variableSpent,
          fixedSpent: cat.fixedSpent || 0,
          remaining,
          hasBudget,
          percentage,
          isOverBudget,
          iconName: cat.icon || getCategoryIconName(cat.name),
          color: cat.color || getCategoryColor(cat.name, config?.categories),
        };
      })
      .filter((cat: any) => {
        const shouldHide = config?.hideEmptyCategories !== undefined
          ? config.hideEmptyCategories
          : (localStorage.getItem('dejz_hide_empty_categories') === 'true');
        if (!shouldHide) return true;
        // Inaktiv om den varken har några rörliga utgifter eller någon kvarvarande budget att spendera
        return cat.variableSpent > 0 || cat.remaining > 0;
      })
      .sort((a: any, b: any) => {
        const aOver = a.hasBudget && a.isOverBudget;
        const bOver = b.hasBudget && b.isOverBudget;
        if (aOver && !bOver) return -1;
        if (!aOver && bOver) return 1;
        const aPct = a.hasBudget ? a.percentage : 0;
        const bPct = b.hasBudget ? b.percentage : 0;
        return bPct - aPct;
      });
  }, [stats?.categories, config?.hideEmptyCategories]);

  const displayedVariableTransactions = useMemo(() => {
    return stats?.isPastPeriod
      ? (stats.periodTransactions || [])
      : (selectedDayData?.transactions || []);
  }, [stats?.isPastPeriod, stats?.periodTransactions, selectedDayData?.transactions]);

  const displayedFixedTransactions = (config?.showFixedExpensesInCalendar ?? true) ? fixedTransactions : [];

  if (!stats) return null;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Free-floating Hero Gauge & Kvar att Spendera */}
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
      />

      {/* Module 1: Category Budgets Widget */}
      <div className="animate-fade-in">
        {!hasSavedBudget ? (
          <button
            type="button"
            onClick={() => onNavigate("profile", "budget")}
            className="w-full p-4 rounded-[22px] bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/5 border border-black/[0.06] dark:border-white/[0.08] text-[var(--text-primary)] shadow-none transition-all flex items-center justify-between text-left group cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0">
                <SlidersHorizontal size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-snug">
                  {lang === "en" ? "Set up your budget" : "Sätt upp din budget"}
                </p>
                <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">
                  {lang === "en" ? "Set limits per category to track spending" : "Fördela din budget på dina kategorier"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>
        ) : categoryBudgetData.length > 0 ? (
          <div className="bg-[var(--surface-color)] border border-black/[0.04] dark:border-white/[0.06] rounded-[24px] p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight uppercase">
                {lang === "en" ? "Category budgets" : "Kategoribudgetar"}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback.light === 'function') feedback.light();
                  onNavigate("profile", "budget");
                }}
                className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {lang === "en" ? "Manage" : "Hantera"}
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {categoryBudgetData.map((cat, index) => {
                const Icon = ICON_MAP[cat.iconName];
                const catColor = cat.color || getCategoryColor(cat.name, config?.categories);

                return (
                  <motion.button
                    key={cat.name}
                    initial={{ opacity: 0, scale: 0.97, x: 6 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.04 + index * 0.015, type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={() => handleCategoryClick(cat.name)}
                    className="flex-shrink-0 w-[138px] sm:w-[148px] h-[88px] sm:h-[92px] p-3 rounded-[18px] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between text-left group cursor-pointer shadow-none transition-all active:scale-95"
                  >
                    {/* Top: Icon + Name */}
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      <div 
                        className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ 
                          backgroundColor: `${catColor}18`, 
                          color: catColor 
                        }}
                      >
                        {isEmojiString(cat.iconName) ? (
                          <span className="text-[15px] leading-none">{cat.iconName}</span>
                        ) : Icon ? (
                          <Icon size={14} strokeWidth={2.2} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>
                      <span className="text-[12px] font-semibold text-[var(--text-primary)] tracking-tight truncate flex-1 min-w-0">
                        {cat.name}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="space-y-0.5">
                      <p className={`text-[12px] sm:text-[13px] font-bold font-amount tabular-nums tracking-tight truncate ${
                        cat.isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
                      }`}>
                        {(() => {
                          const currency = config?.currency || 'kr';
                          if (!cat.hasBudget) {
                            return `${formatAmount(Math.round(cat.spent), lang)} ${currency}`;
                          }
                          const rem = Math.round(cat.remaining);
                          return `${formatAmount(rem, lang)} ${currency}`;
                        })()}
                      </p>
                      <p className="text-[10px] font-normal text-[var(--text-tertiary)] tracking-tight leading-none">
                        {cat.hasBudget 
                          ? (cat.remaining < 0 ? (lang === 'en' ? 'over budget' : 'över budget') : (lang === 'en' ? 'left to spend' : 'kvar att spendera'))
                          : (lang === 'en' ? 'spent' : 'spenderat')}
                      </p>
                    </div>
                  </motion.button>
                );
              })}

              {/* Manage Button at the end of the category carousel */}
              <motion.button
                key="manage-categories"
                initial={{ opacity: 0, scale: 0.97, x: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.04 + categoryBudgetData.length * 0.015, type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => {
                  if (typeof feedback.light === 'function') feedback.light();
                  onNavigate("profile", "budget");
                }}
                className="flex-shrink-0 w-[96px] sm:w-[104px] h-[88px] sm:h-[92px] p-3 rounded-[18px] bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-dashed border-black/[0.08] dark:border-white/[0.1] flex flex-col items-center justify-center gap-1.5 text-center group cursor-pointer transition-all active:scale-95 shadow-none"
                aria-label={lang === 'en' ? 'Manage budget & categories' : 'Hantera budget & kategorier'}
              >
                <div className="w-7 h-7 rounded-[9px] bg-black/[0.04] dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  <SlidersHorizontal size={14} strokeWidth={2} />
                </div>

                <span className="text-[11px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] tracking-tight">
                  {lang === 'en' ? 'Manage' : 'Hantera'}
                </span>
              </motion.button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("profile", "budget")}
            className="w-full p-4 rounded-[22px] bg-white dark:bg-[#1C1C1C] hover:bg-black/[0.02] dark:hover:bg-white/5 border border-black/[0.06] dark:border-white/[0.08] text-[var(--text-primary)] shadow-none transition-all flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[14px] bg-black/[0.04] dark:bg-white/5 border-none flex items-center justify-center text-[var(--text-secondary)] transition-colors">
                <SlidersHorizontal size={15} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-snug">
                  {lang === "en" ? "Allocate your budget" : "Fördela din vardagsbudget"}
                </p>
                <p className="text-[11px] font-normal text-[var(--text-secondary)]">
                  {lang === "en" ? "Set limits per category" : "Sätt gränser per kategori"}
                </p>
              </div>
            </div>
            <ChevronRight size={15} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
          </button>
        )}
      </div>

      {/* Module 2: Unified Timeline & Transactions Module */}
      <div className="bg-[var(--surface-color)] border border-black/[0.04] dark:border-white/[0.06] rounded-[24px] p-4 sm:p-5 space-y-4 shadow-sm animate-fade-in">
        {/* Period & Payday Status Bar */}
        <button
          type="button"
          onClick={() => {
            if (typeof feedback?.tap === 'function') feedback.tap();
            setIsPeriodInfoOpen(true);
          }}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-all bg-transparent border-none p-0"
        >
          {/* Left: Current Period */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[10px] bg-black/[0.04] dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] shrink-0">
              <Calendar size={14} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider leading-none">
                {lang === 'en' ? 'Current period' : 'Aktuell period'}
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight truncate mt-1">
                {periodIntervalText}
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-black/[0.06] dark:border-white/[0.08] shrink-0" />

          {/* Right: Days Remaining */}
          <div className="flex items-center gap-2.5 shrink-0 text-right">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider leading-none">
                {lang === 'en' ? 'Next payday' : 'Nästa lön'}
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-primary)] font-amount tabular-nums tracking-tight mt-1">
                {stats?.isPastPeriod
                  ? (lang === 'en' ? 'Ended' : 'Avslutad')
                  : (lang === 'en'
                      ? `${effectiveRemainingDays} ${effectiveRemainingDays === 1 ? 'day left' : 'days left'}`
                      : `${effectiveRemainingDays} ${effectiveRemainingDays === 1 ? 'dag kvar' : 'dagar kvar'}`)}
              </span>
            </div>
            <div className="w-7 h-7 rounded-[10px] bg-black/[0.04] dark:bg-white/5 text-[var(--text-secondary)] flex items-center justify-center shrink-0">
              <Clock size={14} strokeWidth={2} />
            </div>
          </div>
        </button>

        {/* Divider inside Card */}
        <div className="h-[1px] bg-black/[0.04] dark:bg-white/[0.04]" />

        {/* PeriodTimeline calendar */}
        {calendarDays && calendarDays.length > 0 && (
          <PeriodTimeline
            calendarDays={calendarDays}
            selectedDate={normalizedSelectedDate}
            onSelectDate={setSelectedDate}
            stats={stats}
            language={lang}
            isCurrentPeriod={isCurrentPeriod}
            showFixedInCalendar={config?.showFixedExpensesInCalendar}
          />
        )}

        {/* Divider between Timeline and Transactions */}
        <div className="h-[1px] bg-black/[0.04] dark:bg-white/[0.04]" />

        {/* Selected Day's Transactions Section (under the timeline) */}
        <div className="space-y-3 pt-0.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight uppercase">
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
                className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-none ml-auto"
              >
                <RotateCcw size={11} strokeWidth={2.5} />
                <span>{lang === "en" ? "Today" : "Idag"}</span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {displayedVariableTransactions.length > 0 ? (
                <motion.div className="space-y-0" key="transactions">
                  {displayedVariableTransactions.map((transaction: Transaction, index: number) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-none"
                    >
                      <TransactionItem
                        transaction={transaction}
                        onView={onViewTransaction}
                        onDelete={onDeleteTransaction}
                        language={lang}
                        currency={config?.currency || 'kr'}
                        config={config}
                        variant="transparent"
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

            {/* Fixed transactions for the day */}
            {displayedFixedTransactions.length > 0 && (
              <div className="space-y-0">
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
                    <div key={item.id} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-none">
                      <TransactionItem
                        transaction={tx}
                        isFixed={true}
                        config={config}
                        variant="transparent"
                        onClick={() => {
                          if (item.type === "income" && onViewIncome) {
                            onViewIncome(item.originalItem);
                          } else if ((item.id?.startsWith('saving-') || item.category === (lang === "en" ? "Monthly Saving" : "Månadssparande") || item.originalItem?.targetAmount) && onViewMonthlySaving) {
                            onViewMonthlySaving(item.originalItem);
                          } else if (onViewFixedExpense) {
                            onViewFixedExpense(item.originalItem);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Period & Payday Info Modal */}
      {isPeriodInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsPeriodInfoOpen(false)} 
          />
          <div className="relative w-full max-w-[320px] bg-white dark:bg-[#1C1C1C] rounded-[28px] p-5 border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-4 z-10 text-left font-sans animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold font-display tracking-wider text-sm">
                <Info size={16} className="text-[var(--accent-color)]" strokeWidth={2} />
                <span>{lang === 'en' ? 'Period & Payday' : 'Period & Nästa Lön'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodInfoOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-none"
                aria-label="Stäng"
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>

            {/* Content items */}
            <div className="space-y-2.5 pt-1">
              {/* Period */}
              <div className="flex items-center gap-3 p-3 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10">
                <div className="w-8 h-8 rounded-[14px] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-black/5 dark:border-white/5">
                  <Calendar size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] tracking-wider">
                    {lang === 'en' ? 'Current period' : 'Aktuell period'}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                    {periodIntervalText}
                  </span>
                </div>
              </div>

              {/* Payday / Next Salary */}
              <div className="flex items-center gap-3 p-3 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10">
                <div className="w-8 h-8 rounded-[14px] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-black/5 dark:border-white/5">
                  <Clock size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] tracking-wider">
                    {lang === 'en' ? 'Next payday' : 'Nästa lön'}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                    {daysValueText} {lang === 'en' ? 'until payday' : 'kvar till lön'}
                  </span>
                </div>
              </div>
            </div>

            {/* Close action */}
            <button
              type="button"
              onClick={() => setIsPeriodInfoOpen(false)}
              className="w-full h-11 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-xs flex items-center justify-center border-none mt-2"
            >
              {lang === 'en' ? 'Close' : 'Stäng'}
            </button>
          </div>
        </div>
      )}

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
        fixedExpenses={fixedExpenses}
        onViewFixedExpense={onViewFixedExpense}
        stats={stats}
        config={config}
        language={lang}
        onViewTransaction={onViewTransaction}
        onDeleteTransaction={onDeleteTransaction}
        onAddTransaction={onAddTransaction}
        onNavigate={onNavigate}
        t={t}
      />
    </div>
  );
}
