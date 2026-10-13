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
import { Button, Modal } from "./ui";
import { getCategoryIconName } from "../utils/icons";
import { isExpenseCancelledAndExpired } from "../utils/cancellation";
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
  onToggleStar?: (transaction: Transaction) => void;
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
  onToggleStar,
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
      if (isExpenseCancelledAndExpired(fe, normalizedSelectedDate)) return;

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

    const savingsList = Array.isArray(config?.monthlySavingsItems)
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
    <div className="space-y-[var(--menu-content-gap)] font-sans">
      {/* 1. Unified Main Summary Module (Kvar att spendera + Period & Payday) */}
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
        periodIntervalText={periodIntervalText}
        paydayText={daysValueText}
        onOpenPeriodInfo={() => setIsPeriodInfoOpen(true)}
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

      {/* 2. Category Budgets */}
      <div className="animate-fade-in space-y-2.5 sm:space-y-3">
        {!hasSavedBudget ? (
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-section-title">
                {lang === "en" ? "Category budgets" : "Kategoribudgetar"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("profile", "budget")}
              className="w-full p-4 rounded-card hover:bg-black/[0.02] dark:hover:bg-white/5 border border-dashed border-subtle text-[var(--text-primary)] transition-all flex items-center justify-between text-left group cursor-pointer active:scale-[0.99] shadow-subtle bg-[var(--surface-color)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[var(--radius-button-sm,10px)] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0">
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
          </div>
        ) : categoryBudgetData.length > 0 ? (
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-section-title">
                {lang === "en" ? "Category budgets" : "Kategoribudgetar"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback.light === 'function') feedback.light();
                  onNavigate("profile", "budget");
                }}
                className="text-micro-label font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <span>{lang === "en" ? "Manage" : "Hantera"}</span>
                <ChevronRight size={12} strokeWidth={2} />
              </button>
            </div>

            {/* Horisontell karusell av mini-kort för kategoribudgetar (utan mätare) */}
            <div
              className="flex gap-3 overflow-x-auto py-1.5 px-0.5 no-scrollbar select-none snap-x snap-mandatory"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {categoryBudgetData.map((cat) => {
                const catColor = cat.color || getCategoryColor(cat.name, config?.categories);
                const currency = config?.currency || 'kr';
                const isOverBudget = cat.hasBudget && (cat.isOverBudget || cat.remaining < 0);
                const rem = Math.round(cat.remaining);

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      if (typeof feedback.light === 'function') feedback.light();
                      handleCategoryClick(cat.name);
                    }}
                    className="snap-start flex-shrink-0 min-w-[144px] sm:min-w-[160px] p-3 sm:p-3.5 rounded-card bg-[var(--surface-color)] border border-subtle hover:border-[var(--border-control)] transition-all cursor-pointer active:scale-[0.98] text-left flex flex-col justify-between gap-2 shadow-subtle group select-none"
                  >
                    {/* Ikon */}
                    <div className="flex items-center justify-between gap-2">
                      <CategoryIcon icon={cat.iconName} color={catColor} size="sm" categoryName={cat.name} />
                    </div>

                    {/* Kategorinamn och Belopp */}
                    <div className="min-w-0 pt-0.5">
                      <span className="text-card-title text-[var(--text-primary)] truncate block group-hover:text-[var(--accent-color)] transition-colors mb-0.5">
                        {cat.name}
                      </span>
                      <span
                        className={`text-list-amount font-amount tabular-nums block ${
                          isOverBudget ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {!cat.hasBudget
                          ? `${formatAmount(Math.round(cat.spent), lang)}`
                          : `${rem < 0 ? '−' : ''}${formatAmount(Math.abs(rem), lang)}`}
                        <span className="text-[11.5px] font-normal text-[var(--text-secondary)] ml-1 inline-flex items-baseline align-baseline">{currency}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Monthly Deductions Timeline (Betalningar) - Sparad kod */}

      {/* 3. Unified Timeline & Transactions Section */}
      <div className="space-y-3.5 sm:space-y-4">
        {/* Timeline + Connected Date Header */}
        <div className="space-y-3 sm:space-y-3.5">
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

          {/* Date Header directly connected with timeline */}
          <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-section-title truncate">
                {stats.isPastPeriod
                  ? (lang === "en" ? "Period transactions" : "Periodens transaktioner")
                  : selectedDate.toDateString() === new Date().toDateString()
                    ? `${lang === "en" ? "Today" : "Idag"}, ${selectedDate.toLocaleDateString(lang === "en" ? "en-US" : "sv-SE", { day: "numeric", month: "long" })}`
                    : selectedDate.toLocaleDateString(
                        lang === "en" ? "en-US" : "sv-SE",
                        { day: "numeric", month: "long" },
                      )}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isTodaySelected && (
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="flex items-center gap-1.5 px-2.5 h-6 rounded-[var(--radius-button-sm,10px)] bg-[var(--surface-muted)] text-micro-label font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all active:scale-95 cursor-pointer border-none shadow-none"
                >
                  <RotateCcw size={11} strokeWidth={2.5} />
                  <span>{lang === "en" ? "Today" : "Idag"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Day's Transactions List */}
        <div className="space-y-2.5 pt-0.5">
          <AnimatePresence mode="popLayout">
            {displayedVariableTransactions.length > 0 ? (
              <motion.div className="space-y-[var(--card-gap)]" key="transactions">
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
                      onToggleStar={onToggleStar}
                      config={config}
                      onClick={() => {
                        if (onViewTransaction) onViewTransaction(transaction);
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : displayedFixedTransactions.length === 0 ? (
              <EmptyState
                title={isTodaySelected ? (lang === "en" ? "No transactions today" : "Inga transaktioner idag") : (lang === "en" ? "No transactions on this date" : "Inga transaktioner detta datum")}
                description={isTodaySelected ? (lang === "en" ? "Log an expense or income with +." : "Registrera en utgift eller inkomst med +.") : (lang === "en" ? "Click below to add a transaction for this date" : "Klicka nedan för att registrera en transaktion på detta datum")}
                onAction={() => onAddTransaction(selectedDate)}
                actionLabel={`+ ${t("addExpense")}`}
              />
            ) : null}
          </AnimatePresence>

          {/* Fixed transactions for the day */}
          {displayedFixedTransactions.length > 0 && (
            <div className="space-y-[var(--card-gap)]">
              {displayedFixedTransactions.map((item) => {
                const isItemVariable = Boolean(item.isVariable || item.originalItem?.isVariable || item.originalItem?.is_variable);
                const tx: Transaction = {
                  id: item.id,
                  merchant: item.merchant,
                  category: item.category,
                  amount: item.amount,
                  type: item.type as any,
                  date: selectedDate.toISOString(),
                  isVariable: isItemVariable,
                  icon: item.icon || item.originalItem?.icon,
                  logo: item.logo || item.originalItem?.logo,
                };

                return (
                  <div key={item.id}>
                    <TransactionItem
                      transaction={tx}
                      isFixed={true}
                      isVariable={isItemVariable}
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
        <div className="space-y-[var(--card-gap)] pt-1">
          {/* Period */}
          <div className="flex items-center gap-3 p-3 rounded-card-nested bg-black/[0.04] dark:bg-white/[0.06] border border-subtle">
            <div className="w-8 h-8 rounded-[var(--radius-button-sm,10px)] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-subtle">
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
          <div className="flex items-center gap-3 p-3 rounded-card-nested bg-black/[0.04] dark:bg-white/[0.06] border border-subtle">
            <div className="w-8 h-8 rounded-[var(--radius-button-sm,10px)] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-subtle">
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
        onToggleStar={onToggleStar}
        onAddTransaction={onAddTransaction}
        onNavigate={onNavigate}
        t={t}
      />
    </div>
  );
}
