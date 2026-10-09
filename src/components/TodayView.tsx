import React, { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  Clock,
  Info,
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
import { CategoryIcon } from "./CategoryIcon";
import { EmptyState } from "./EmptyState";
import { GreetingModule } from "./GreetingModule";
import { PeriodTimeline } from "./PeriodTimeline";
import { Card, Button, Modal } from "./ui";
import { getCategoryIconName } from "../utils/icons";
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

      {/* 2. Compact Period & Payday Status Module (Placed under kvar att spendera) */}
      <Card variant="default" padding="none" className="p-3.5 sm:p-4 shadow-2xs animate-fade-in">
        <button
          type="button"
          onClick={() => {
            if (typeof feedback?.tap === 'function') feedback.tap();
            setIsPeriodInfoOpen(true);
          }}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-all bg-transparent border-none p-0"
        >
          {/* Left: Current Period */}
          <div className="flex flex-col min-w-0">
            <span className="text-label text-[var(--text-secondary)] leading-tight">
              {lang === 'en' ? 'Current period' : 'Aktuell period'}
            </span>
            <span className="text-card-title text-[var(--text-primary)] truncate mt-1">
              {periodIntervalText}
            </span>
          </div>

          <div className="h-7 w-[1px] bg-black/[0.06] dark:bg-white/[0.08] shrink-0" />

          {/* Right: Days Remaining */}
          <div className="flex flex-col items-end shrink-0 text-right">
            <span className="text-label text-[var(--text-secondary)] leading-tight">
              {lang === 'en' ? 'Next payday' : 'Nästa lön'}
            </span>
            <span className="text-card-title text-[var(--text-primary)] font-amount tabular-nums truncate mt-1">
              {stats?.isPastPeriod
                ? (lang === 'en' ? 'Ended' : 'Avslutad')
                : (lang === 'en'
                    ? `${effectiveRemainingDays} ${effectiveRemainingDays === 1 ? 'day left' : 'days left'}`
                    : `${effectiveRemainingDays} ${effectiveRemainingDays === 1 ? 'dag kvar' : 'dagar kvar'}`)}
            </span>
          </div>
        </button>
      </Card>

      {/* 3. Category Budgets (No module card wrapper) */}
      <div className="animate-fade-in">
        {!hasSavedBudget ? (
          <button
            type="button"
            onClick={() => onNavigate("profile", "budget")}
            className="w-full p-4 rounded-[var(--radius-card)] hover:bg-black/[0.02] dark:hover:bg-white/5 border border-dashed border-subtle text-[var(--text-primary)] transition-all flex items-center justify-between text-left group cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[var(--radius-btn,10px)] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0">
                <SlidersHorizontal size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="text-card-title text-[var(--text-primary)] leading-snug">
                  {lang === "en" ? "Set up your budget" : "Sätt upp din budget"}
                </p>
                <p className="text-micro-label text-[var(--text-secondary)] mt-0.5">
                  {lang === "en" ? "Set limits per category to track spending" : "Fördela din budget på dina kategorier"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>
        ) : categoryBudgetData.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-label font-semibold text-[var(--text-secondary)]">
                {lang === "en" ? "Category budgets" : "Kategoribudgetar"}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback.light === 'function') feedback.light();
                  onNavigate("profile", "budget");
                }}
                className="text-label text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {lang === "en" ? "Manage" : "Hantera"}
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {categoryBudgetData.map((cat, index) => {
                const catColor = cat.color || getCategoryColor(cat.name, config?.categories);

                return (
                  <motion.button
                    key={cat.name}
                    initial={{ opacity: 0, scale: 0.97, x: 6 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.04 + index * 0.015, type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={() => handleCategoryClick(cat.name)}
                    className="flex-shrink-0 w-[138px] sm:w-[148px] h-[88px] sm:h-[92px] p-3 rounded-[var(--radius-card,12px)] bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border border-subtle flex flex-col justify-between text-left group cursor-pointer shadow-none transition-all active:scale-95"
                  >
                    {/* Top: Icon + Name */}
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      <CategoryIcon icon={cat.iconName} color={catColor} size="xs" />
                      <span className="text-label text-[var(--text-primary)] truncate flex-1 min-w-0">
                        {cat.name}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="space-y-0.5">
                      <p className={`text-secondary font-semibold font-amount tabular-nums truncate ${
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
                      <p className="text-micro-label text-[var(--text-secondary)] leading-none">
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
                className="flex-shrink-0 w-[96px] sm:w-[104px] h-[88px] sm:h-[92px] p-3 rounded-[var(--radius-card,12px)] bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-dashed border-subtle flex flex-col items-center justify-center gap-1.5 text-center group cursor-pointer transition-all active:scale-95 shadow-none"
                aria-label={lang === 'en' ? 'Manage budget & categories' : 'Hantera budget & kategorier'}
              >
                <div className="w-7 h-7 rounded-[var(--radius-btn,8px)] bg-black/[0.04] dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  <SlidersHorizontal size={14} strokeWidth={2} />
                </div>

                <span className="text-label text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                  {lang === 'en' ? 'Manage' : 'Hantera'}
                </span>
              </motion.button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Period Timeline directly on beige background (no wrapping card or dividing lines) */}
      {calendarDays && calendarDays.length > 0 && (
        <div className="animate-fade-in -mx-1 px-1">
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

      {/* Date Header directly under the timeline */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-label font-medium text-[var(--text-secondary)]">
            {stats.isPastPeriod
              ? (lang === "en" ? "Period transactions" : "Periodens transaktioner")
              : selectedDate.toDateString() === new Date().toDateString()
                ? `${lang === "en" ? "Today" : "Idag"}, ${selectedDate.toLocaleDateString(lang === "en" ? "en-US" : "sv-SE", { day: "numeric", month: "long" })}`
                : selectedDate.toLocaleDateString(
                    lang === "en" ? "en-US" : "sv-SE",
                    { day: "numeric", month: "long" },
                  )}
          </span>
          {(displayedVariableTransactions.length > 0 || displayedFixedTransactions.length > 0) && (
            <span className="text-micro-label font-medium text-[var(--text-tertiary)] tabular-nums font-amount">
              {(displayedVariableTransactions.length + displayedFixedTransactions.length)} {
                (displayedVariableTransactions.length + displayedFixedTransactions.length) === 1
                  ? (lang === 'en' ? 'transaktion' : 'transaktion')
                  : (lang === 'en' ? 'transaktioner' : 'transaktioner')
              }
            </span>
          )}
        </div>
        {!isTodaySelected && (
          <button
            onClick={handleGoToToday}
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-[var(--radius-btn,10px)] bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-subtle text-label font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-none ml-auto"
          >
            <RotateCcw size={11} strokeWidth={2.5} />
            <span>{lang === "en" ? "Today" : "Idag"}</span>
          </button>
        )}
      </div>

      {/* Selected Day's Transactions - Separate White Cards */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {displayedVariableTransactions.length > 0 ? (
            <motion.div className="space-y-2.5" key="transactions">
              {displayedVariableTransactions.map((transaction: Transaction, index: number) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
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

        {/* Fixed transactions for the day in separate white cards */}
        {displayedFixedTransactions.length > 0 && (
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
                <div key={item.id}>
                  <TransactionItem
                    transaction={tx}
                    isFixed={true}
                    config={config}
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

      {/* Period & Payday Info Modal */}
      <Modal
        isOpen={isPeriodInfoOpen}
        onClose={() => setIsPeriodInfoOpen(false)}
        size="xs"
        title={
          <div className="flex items-center gap-2">
            <Info size={16} className="text-[var(--accent-color)]" strokeWidth={2} />
            <span>{lang === 'en' ? 'Period & Payday' : 'Period & nästa lön'}</span>
          </div>
        }
      >
        <div className="space-y-2.5 pt-1">
          {/* Period */}
          <div className="flex items-center gap-3 p-3 rounded-[var(--radius-card,12px)] bg-black/[0.04] dark:bg-white/[0.06] border border-subtle">
            <div className="w-8 h-8 rounded-[var(--radius-btn,8px)] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-subtle">
              <Calendar size={16} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label text-[var(--text-secondary)]">
                {lang === 'en' ? 'Current period' : 'Aktuell period'}
              </span>
              <span className="text-card-title text-[var(--text-primary)] truncate mt-0.5">
                {periodIntervalText}
              </span>
            </div>
          </div>

          {/* Payday / Next Salary */}
          <div className="flex items-center gap-3 p-3 rounded-[var(--radius-card,12px)] bg-black/[0.04] dark:bg-white/[0.06] border border-subtle">
            <div className="w-8 h-8 rounded-[var(--radius-btn,8px)] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-subtle">
              <Clock size={16} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label text-[var(--text-secondary)]">
                {lang === 'en' ? 'Next payday' : 'Nästa lön'}
              </span>
              <span className="text-card-title text-[var(--text-primary)] font-amount tabular-nums truncate mt-0.5">
                {daysValueText} {lang === 'en' ? 'until payday' : 'kvar till lön'}
              </span>
            </div>
          </div>

          {/* Close action */}
          <Button
            variant="primary"
            fullWidth
            onClick={() => setIsPeriodInfoOpen(false)}
            className="mt-2"
          >
            {lang === 'en' ? 'Close' : 'Stäng'}
          </Button>
        </div>
      </Modal>

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
