import React, { useMemo, useState, useCallback } from "react";
import {
  RotateCcw,
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
} from "../types";
import { TranslationKey } from "../i18n";
import { TransactionItem } from "./TransactionItem";
import { TransactionLogo } from "./TransactionLogo";
import { CategoryIcon } from "./CategoryIcon";
import { EmptyState } from "./EmptyState";
import { GreetingModule } from "./GreetingModule";
import { PeriodTimeline } from "./PeriodTimeline";
import { Button, Modal } from "./ui";
import { getCategoryIconName } from "../utils/icons";
import { isFixedPaymentScheduledOnDate } from "../utils/cancellation";
import { isFixedItemScheduledOnDay } from "../utils/date";
import { formatAmount } from "../utils/format";
import { CategoryBottomSheetModal } from "./CategoryBottomSheetModal";
import { feedback } from "../utils/feedback";
import { getCategoryColor } from "../utils/categoryColors";
import { BankAccount } from "../services/bankService";

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
  bankAccounts?: BankAccount[];
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
  attentionItems = [],
  onEditAttentionItem,
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
  bankAccounts = [],
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
    const transactions: any[] = [];
    const periodId = stats?.periodId;

    incomes.forEach((i) => {
      if (isFixedItemScheduledOnDay(i, normalizedSelectedDate)) {
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
    });

    fixedExpenses.forEach((fe) => {
      if (!isFixedPaymentScheduledOnDate(fe, normalizedSelectedDate)) return;

      if (isFixedItemScheduledOnDay(fe, normalizedSelectedDate)) {
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
    });

    const savingsList = Array.isArray(config?.monthlySavingsItems)
      ? config.monthlySavingsItems 
      : (stats?.savingsGoals || []);

    savingsList.forEach((goal: any) => {
      if (isFixedItemScheduledOnDay(goal, normalizedSelectedDate)) {
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
    if (config?.hasSavedInitialBudget === false) {
      return false;
    }
    const hasCategoryWithBudget = Boolean(
      (config?.categories && config.categories.some((c: any) => typeof c.budget === 'number' && c.budget > 0)) ||
      (stats?.categories && Object.values(stats.categories).some((c: any) => typeof c.userBudget === 'number' && c.userBudget > 0))
    );
    return hasCategoryWithBudget;
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
        const getTier = (c: any) => {
          if (c.hasBudget && c.isOverBudget) return 0; // 1. Överskridna först
          if (c.hasBudget && c.remaining > 0) return 1; // 2. Kategorier med pengar kvar att handla för
          if (c.hasBudget && c.remaining === 0) return 2; // 3. Förbrukade / rena fasta utgifter (0 kr kvar)
          return 3; // 4. Utan satt budget
        };
        const tierA = getTier(a);
        const tierB = getTier(b);
        if (tierA !== tierB) return tierA - tierB;

        if (tierA === 0) {
          return a.remaining - b.remaining; // Störst underskott först
        }
        if (tierA === 1) {
          // Bland kategorier med pengar kvar: de med rörliga utgifter eller störst rörlig pott först
          const aVarBudget = Math.max(0, a.budget - a.fixedSpent);
          const bVarBudget = Math.max(0, b.budget - b.fixedSpent);
          if (bVarBudget !== aVarBudget) return bVarBudget - aVarBudget;
          return b.remaining - a.remaining;
        }
        if (tierA === 2) {
          return b.variableSpent - a.variableSpent;
        }
        return b.spent - a.spent;
      });
  }, [stats?.categories, config?.hideEmptyCategories, config?.categories]);

  const displayedVariableTransactions = useMemo(() => {
    return stats?.isPastPeriod
      ? (stats.periodTransactions || [])
      : (selectedDayData?.transactions || []);
  }, [stats?.isPastPeriod, stats?.periodTransactions, selectedDayData?.transactions]);

  const displayedFixedTransactions = config?.showFixedExpensesInCalendar ? fixedTransactions : [];

  const recentPeriodTransactions = useMemo(() => {
    if (!stats?.periodTransactions || !Array.isArray(stats.periodTransactions)) return [];
    const todayIds = new Set((displayedVariableTransactions || []).map((tx: Transaction) => tx.id));
    return stats.periodTransactions.filter((tx: Transaction) => !todayIds.has(tx.id)).slice(0, 8);
  }, [stats?.periodTransactions, displayedVariableTransactions]);

  const selectedDayNetTotal = useMemo(() => {
    const varSum = displayedVariableTransactions.reduce((acc: number, tx: Transaction) => {
      const amt = Number(tx.amount) || 0;
      return tx.type === 'income' ? acc + amt : acc - amt;
    }, 0);
    const fixSum = displayedFixedTransactions.reduce((acc: number, tx: any) => {
      const amt = Number(tx.amount) || 0;
      return tx.type === 'income' ? acc + amt : acc - amt;
    }, 0);
    return Math.round(varSum + fixSum);
  }, [displayedVariableTransactions, displayedFixedTransactions]);

  if (!stats) return null;

  return (
    <div className="space-y-[var(--menu-content-gap)] font-sans">
      {/* 1. Unified Main Summary Module (Kvar denna perioden + Hela ekonomin) */}
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
        bankAccounts={bankAccounts}
      />

      {/* 1b. Variable Amounts Awaiting Confirmation (endast om det finns poster att bekräfta) */}
      {isCurrentPeriod && attentionItems.length > 0 && onEditAttentionItem && (
        <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle divide-y divide-menu overflow-hidden">
          {attentionItems.slice(0, 3).map((item: any) => (
            <button
              key={`${item.budgetType}-${item.id}`}
              type="button"
              onClick={() => {
                if (typeof feedback.light === 'function') feedback.light();
                onEditAttentionItem(item);
              }}
              className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors cursor-pointer bg-transparent border-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <TransactionLogo
                  transaction={{
                    ...item,
                    merchant: item.name,
                    type: item.budgetType === 'income' ? 'income' : 'expense',
                  } as any}
                  config={config}
                  size="sm"
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-body-medium font-medium text-[var(--text-primary)] truncate">
                    {item.name}
                  </span>
                  <span className="text-micro-label text-[var(--text-secondary)] shrink-0">
                    · {lang === 'en' ? 'Confirm amount' : 'Bekräfta belopp'}
                  </span>
                </div>
              </div>
              <div
                className={`flex items-center gap-1 shrink-0 text-micro-label font-semibold font-amount tabular-nums ${
                  item.budgetType === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
                }`}
              >
                <span>~{formatAmount(Math.abs(Math.round(Number(item.amount) || 0)), lang)} {config?.currency || 'kr'}</span>
                <ChevronRight size={13} strokeWidth={2} className="text-[var(--text-tertiary)]" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 2. Category Budgets (visas endast när användaren har sparat kategoribudgetar) */}
      {!(config?.hideBudgetOnHome ?? (typeof window !== 'undefined' && localStorage.getItem('dejz_hide_budget_on_home') === 'true')) && hasSavedBudget && categoryBudgetData.length > 0 && (
        <div className="animate-fade-in space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-section-title">
              {lang === "en" ? "Category budgets" : "Kategoribudgetar"}
            </h2>
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback.light === 'function') feedback.light();
                  onNavigate("budget", "category-budgets");
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
                const isFixedOnlyExhausted = cat.hasBudget && rem === 0 && cat.variableSpent === 0 && cat.fixedSpent > 0;
                const remainingRatio = cat.hasBudget && cat.budget > 0
                  ? Math.max(0, Math.min(100, Math.round((cat.remaining / cat.budget) * 100)))
                  : 0;

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      if (typeof feedback.light === 'function') feedback.light();
                      handleCategoryClick(cat.name);
                    }}
                    className="snap-start flex-shrink-0 min-w-[148px] sm:min-w-[164px] p-3 sm:p-3.5 rounded-card bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer active:scale-[0.98] text-left flex flex-col justify-between gap-2 shadow-subtle group select-none"
                  >
                    {/* Ikon + Totalbudget */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <CategoryIcon icon={cat.iconName} color={catColor} size="sm" categoryName={cat.name} />
                      {cat.hasBudget && cat.budget > 0 && (
                        <span className="text-micro-label text-[var(--text-tertiary)] font-amount tabular-nums truncate">
                          {lang === 'en' ? 'of' : 'av'} {formatAmount(Math.round(cat.budget), lang)}
                        </span>
                      )}
                    </div>

                    {/* Kategorinamn, Belopp + Tunn progress-linje */}
                    <div className="min-w-0 pt-0.5 space-y-1.5 w-full">
                      <div>
                        <span className="text-card-title text-[var(--text-primary)] truncate block group-hover:text-[var(--accent-color)] transition-colors mb-0.5">
                          {cat.name}
                        </span>
                        <span
                          className={`text-list-amount font-amount tabular-nums block truncate ${
                            isOverBudget ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {!cat.hasBudget
                            ? `${formatAmount(Math.round(cat.spent), lang)}`
                            : `${formatAmount(Math.abs(rem), lang)}`}
                          <span className="text-[11px] font-normal text-[var(--text-secondary)] ml-1 inline-flex items-baseline align-baseline">
                            {currency}{' '}
                            {!cat.hasBudget
                              ? (lang === 'en' ? 'spent' : 'spenderat')
                              : rem < 0
                              ? (lang === 'en' ? 'over' : 'över')
                              : (lang === 'en' ? 'left' : 'kvar')}
                          </span>
                        </span>
                      </div>

                      {cat.hasBudget && (
                        <div className="w-full h-[3px] bg-[var(--surface-muted)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverBudget
                                ? 'bg-[var(--danger-color)]'
                                : isFixedOnlyExhausted || rem === 0
                                ? 'bg-[var(--text-tertiary)]/50'
                                : remainingRatio <= 20
                                ? 'bg-[var(--warning-color)]'
                                : 'bg-[var(--success-color)]'
                            }`}
                            style={{
                              width: `${isOverBudget ? 100 : remainingRatio}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
      )}

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

            <div className="flex items-center gap-2.5 shrink-0">
              {(displayedVariableTransactions.length > 0 || displayedFixedTransactions.length > 0) && selectedDayNetTotal !== 0 && (
                <span
                  className={`text-label font-semibold font-amount tabular-nums ${
                    selectedDayNetTotal > 0 ? 'text-[var(--success-color)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {selectedDayNetTotal > 0 ? '+' : '−'}
                  {formatAmount(Math.abs(selectedDayNetTotal), lang)} {config?.currency || 'kr'}
                </span>
              )}
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
        <div className="pt-0.5">
          {displayedVariableTransactions.length > 0 || displayedFixedTransactions.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-card bg-[var(--surface-color)] shadow-subtle overflow-hidden divide-subtle">
                {displayedVariableTransactions.map((transaction: Transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    isGrouped={true}
                    onView={onViewTransaction}
                    onDelete={onDeleteTransaction}
                    onToggleStar={onToggleStar}
                    config={config}
                    onClick={() => {
                      if (onViewTransaction) onViewTransaction(transaction);
                    }}
                  />
                ))}

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
                    <TransactionItem
                      key={item.id}
                      transaction={tx}
                      isFixed={true}
                      isGrouped={true}
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
                  );
                })}
              </div>
              {isTodaySelected && recentPeriodTransactions.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between px-0.5">
                    <h3 className="text-section-title">
                      {lang === "en" ? "Earlier in period" : "Tidigare i perioden"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof feedback.light === 'function') feedback.light();
                        onNavigate("transactions");
                      }}
                      className="text-micro-label font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-0.5 bg-transparent border-none p-0"
                    >
                      <span>{lang === "en" ? "See all" : "Visa alla"}</span>
                      <ChevronRight size={12} strokeWidth={2} />
                    </button>
                  </div>

                  <div className="rounded-card bg-[var(--surface-color)] shadow-subtle overflow-hidden divide-subtle">
                    {recentPeriodTransactions.map((transaction: Transaction) => (
                      <TransactionItem
                        key={transaction.id}
                        transaction={transaction}
                        isGrouped={true}
                        showDate={true}
                        onView={onViewTransaction}
                        onDelete={onDeleteTransaction}
                        onToggleStar={onToggleStar}
                        config={config}
                        onClick={() => {
                          if (onViewTransaction) onViewTransaction(transaction);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : isTodaySelected && recentPeriodTransactions.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-card bg-[var(--surface-color)] px-4 py-3 flex items-center justify-between gap-2 shadow-subtle">
                <span className="text-label text-[var(--text-secondary)]">
                  {lang === "en" ? "No purchases today yet" : "Inga köp registrerade idag"}
                </span>
                <button
                  type="button"
                  onClick={() => onAddTransaction(selectedDate)}
                  className="text-micro-label font-semibold text-[var(--accent-color)] hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 shrink-0"
                >
                  + {t("addExpense")}
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <h3 className="text-section-title">
                    {lang === "en" ? "Recent in period" : "Senaste i perioden"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback.light === 'function') feedback.light();
                      onNavigate("transactions");
                    }}
                    className="text-micro-label font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-0.5 bg-transparent border-none p-0"
                  >
                    <span>{lang === "en" ? "See all" : "Visa alla"}</span>
                    <ChevronRight size={12} strokeWidth={2} />
                  </button>
                </div>

                <div className="rounded-card bg-[var(--surface-color)] shadow-subtle overflow-hidden divide-subtle">
                  {recentPeriodTransactions.map((transaction: Transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      isGrouped={true}
                      showDate={true}
                      onView={onViewTransaction}
                      onDelete={onDeleteTransaction}
                      onToggleStar={onToggleStar}
                      config={config}
                      onClick={() => {
                        if (onViewTransaction) onViewTransaction(transaction);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title={isTodaySelected ? (lang === "en" ? "No transactions today" : "Inga transaktioner idag") : (lang === "en" ? "No transactions on this date" : "Inga transaktioner detta datum")}
              description={isTodaySelected ? (lang === "en" ? "No expenses or income recorded for today yet." : "Inga utgifter eller inkomster registrerade för idag ännu.") : (lang === "en" ? "No expenses or income recorded on this date." : "Inga utgifter eller inkomster registrerade på detta datum.")}
              onAction={() => onAddTransaction(selectedDate)}
              actionLabel={t("addExpense")}
            />
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
            <Info size={16} className="text-[var(--text-secondary)]" strokeWidth={2} />
            <span>{lang === 'en' ? 'Period & Payday' : 'Period & nästa lön'}</span>
          </div>
        }
      >
        <div className="space-y-3 pt-1">
          <div className="rounded-card bg-[var(--surface-color)] divide-y divide-menu overflow-hidden">
            {/* Period */}
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-8 h-8 rounded-btn-sm bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
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
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-8 h-8 rounded-[var(--radius-button-sm,10px)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
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
        onUpdateConfig={onUpdateConfig}
        t={t}
      />
    </div>
  );
}
