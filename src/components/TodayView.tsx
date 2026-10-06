import React, { useMemo, useState, useCallback } from "react";
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
      {/* 1. Greeting & Hero Module */}
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
                      style={{ backgroundColor: cat.color || getCategoryColor(cat.name, config?.categories) }}
                      className="flex-shrink-0 w-[100px] sm:w-[110px] h-[100px] sm:h-[110px] p-3 rounded-[22px] flex flex-col items-center justify-between text-center group cursor-pointer border-none shadow-sm transition-transform active:scale-95"
                    >
                      <div className="flex items-center justify-center pt-1 text-white">
                        {isEmojiString(cat.iconName) ? (
                          <span className="text-[20px] leading-none">{cat.iconName}</span>
                        ) : Icon ? (
                          <Icon size={22} strokeWidth={2} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      <span className="text-[12px] font-bold text-white tracking-tight max-w-[90px] truncate px-0.5 drop-shadow-xs">
                        {cat.name}
                      </span>

                      <span className="text-[10px] font-medium text-white/95 tabular-nums tracking-tight whitespace-nowrap bg-black/15 px-2 py-0.5 rounded-full">
                        {cat.hasBudget ? `${formatAmount(Math.round(cat.remaining), lang)} ${config?.currency || 'kr'} ${lang === 'en' ? 'left' : 'kvar'}` : `${formatAmount(Math.round(cat.spent), lang)} ${config?.currency || 'kr'}`}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate("budget", "category-budgets")}
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
        }
      />

      {/* 2. Period Timeline */}
      {calendarDays && calendarDays.length > 0 && (
        <div className="pt-2">
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

      {/* 3. Selected Day's Transactions */}
      <div className="space-y-4 pt-2">
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
              className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-white dark:bg-white/[0.04] hover:bg-[var(--bg-hover)] dark:hover:bg-white/[0.07] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-[18px] text-xs font-medium text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-none ml-auto"
            >
              <RotateCcw size={11} strokeWidth={2.5} />
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

          {/* Fixed transactions for the day */}
          {displayedFixedTransactions.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-[11px] font-bold tracking-wider text-[var(--text-tertiary)] px-1">
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
            </div>
          )}
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
