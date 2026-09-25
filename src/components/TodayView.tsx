import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
  Wallet,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  Transaction,
  Config,
  Income,
  FixedExpense,
} from "../types";
import { TranslationKey } from "../i18n";
import { TransactionItem } from "./TransactionItem";
import { EmptyState } from "./EmptyState";
import { GreetingModule } from "./GreetingModule";
import { BudgetItemLogo } from "./BudgetItem";
import { QuickExpenseWidget } from "./QuickExpenseWidget";
import { ICON_MAP, getCategoryIconName, isEmojiString } from "../utils/icons";
import { formatAmount } from "../utils/format";

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
}

export function TodayView({
  stats,
  config,
  userName,
  incomes,
  fixedExpenses,
  selectedDate,
  setSelectedDate,
  onAddTransaction,
  onQuickAddExpense,
  onAddIncome,
  onViewTransaction,
  onDeleteTransaction,
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
}: TodayViewProps) {
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
    return (
      calendarDays.find(
        (d: any) =>
          d.date && d.date.getTime() === normalizedSelectedDate.getTime(),
      ) ||
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
        const amount =
          i.isVariable &&
          periodId &&
          i.periodOverrides &&
          i.periodOverrides[periodId] !== undefined
            ? i.periodOverrides[periodId]
            : i.amount;
        transactions.push({ ...i, amount, type: "income", isFixed: true, originalItem: i });
      }
    });
    fixedExpenses.forEach((e) => {
      if (e.deductionDay === day) {
        const amount =
          e.isVariable &&
          periodId &&
          e.periodOverrides &&
          e.periodOverrides[periodId] !== undefined
            ? e.periodOverrides[periodId]
            : e.amount;
        transactions.push({ ...e, amount, type: "expense", isFixed: true, originalItem: e });
      }
    });
    (config.monthlySavingsItems || []).forEach((s) => {
      if (s.deductionDay === day) {
        const amount =
          s.isVariable &&
          periodId &&
          s.periodOverrides &&
          s.periodOverrides[periodId] !== undefined
            ? s.periodOverrides[periodId]
            : s.amount;
        transactions.push({ ...s, amount, type: "saving", isFixed: true, originalItem: s });
      }
    });
    return transactions;
  }, [incomes, fixedExpenses, config.monthlySavingsItems, normalizedSelectedDate, stats?.periodId]);

  const categoryBudgetData = useMemo(() => {
    if (!stats || !config.categories || config.categories.length === 0) return [];

    const periodStart = stats.periodStart ? new Date(stats.periodStart).getTime() : 0;
    const periodEnd = stats.periodEnd ? new Date(stats.periodEnd).getTime() + 86399999 : Infinity;

    const periodExpenses = (allTransactions || _transactions || []).filter((e: Transaction) => {
      const inPeriod = e.timestamp >= periodStart && e.timestamp <= periodEnd;
      if (!inPeriod) return false;
      return e.type === "expense" || e.type === "savings";
    });

    const breakdown: Record<string, number> = {};

    periodExpenses.forEach((e: Transaction) => {
      if (e.type === "income") return;
      if (e.category === "Spargris") {
        breakdown["Spargris"] = (breakdown["Spargris"] || 0) + e.amount;
      } else {
        const transactionSplits = (e as any).splits;
        if (transactionSplits && transactionSplits.length > 0) {
          transactionSplits.forEach((split: any) => {
            const splitCat = (split.category || "").trim();
            breakdown[splitCat] = (breakdown[splitCat] || 0) + split.amount;
          });
        } else {
          const cat = (e.category || "").trim();
          breakdown[cat] = (breakdown[cat] || 0) + e.amount;
        }
      }
    });

    const disposablePot = Math.max(
      0,
      (stats?.disposablePot !== undefined && stats?.disposablePot !== null)
        ? stats.disposablePot
        : ((stats?.totalIncome || 0) - (stats?.totalFixed || 0))
    );

    return (config.categories || []).map((cat, index) => {
      const name = cat.name;
      const searchName = name.trim().toLowerCase();
      let spent = 0;
      for (const [key, val] of Object.entries(breakdown)) {
        if (key.trim().toLowerCase() === searchName) {
          spent += val;
        }
      }

      let budgetInKronor = 0;
      let hasBudget = false;

      if (cat.budget !== undefined && cat.budget > 0) {
        const pct = cat.budget > 100 && disposablePot > 0 
          ? (cat.budget / disposablePot) * 100 
          : cat.budget;
        budgetInKronor = disposablePot > 0 ? Math.round((pct / 100) * disposablePot) : 0;
        hasBudget = budgetInKronor > 0;
      }

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
      };
    });
  }, [stats, config.categories, allTransactions, _transactions, fixedExpenses]);

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 relative"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <GreetingModule
          userName={userName}
          availableForD={todayData?.availableForD || stats?.availableForD || 0}
          currency={config.currency}
          isToday={!!selectedDayData?.isToday}
          date={normalizedSelectedDate}
          language={config.language}
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
          showFixedInCalendar={config.showFixedExpensesInCalendar}
          isCurrentPeriod={isCurrentPeriod}
          currentPeriodDate={currentPeriodDate}
          config={config}
          onUpdateConfig={onUpdateConfig}
        >
          {/* Category Budgets Carousel - Seamlessly integrated inside the top hero card */}
          {categoryBudgetData.length > 0 ? (
            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
                {categoryBudgetData.map((cat, index) => {
                  const Icon = ICON_MAP[cat.iconName];
                  return (
                    <motion.button
                      key={cat.name}
                      initial={{ opacity: 0, scale: 0.95, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ delay: 0.12 + index * 0.02 }}
                      onClick={() => onNavigate("analysis")}
                      className="flex-shrink-0 flex flex-col justify-between p-3.5 rounded-[20px] bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] transition-all group text-left active:scale-[0.98] min-w-[124px] sm:min-w-[136px] max-w-[146px] cursor-pointer snap-start border border-[var(--border-color)]/60"
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--surface-color)] text-[var(--text-primary)] shrink-0 relative z-10 transition-transform group-hover:scale-105 duration-200 shadow-2xs border border-[var(--border-color)]/40">
                        {isEmojiString(cat.iconName) ? (
                          <span className="text-[24px] leading-none">{cat.iconName}</span>
                        ) : Icon ? (
                          <Icon size={22} strokeWidth={2.2} style={{ color: cat.color || 'var(--text-primary)' }} />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || 'var(--text-primary)' }} />
                        )}
                      </div>

                      <div className="flex flex-col items-start w-full min-w-0 mt-3.5">
                        <span className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight leading-tight truncate w-full transition-colors">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-medium leading-tight mt-1 truncate w-full">
                          {cat.hasBudget ? (
                            cat.isOverBudget ? (
                              <span className="text-rose-500 dark:text-rose-400 font-semibold font-amount tabular-nums">
                                +{formatAmount(Math.abs(cat.remaining), config.language)} kr
                              </span>
                            ) : (
                              <span className="text-[var(--text-secondary)]">
                                <strong className="text-[var(--text-primary)] font-bold font-amount tabular-nums">
                                  {formatAmount(cat.remaining, config.language)} kr
                                </strong>{" "}
                                {config.language === 'en' ? 'left' : 'kvar'}
                              </span>
                            )
                          ) : (
                            <span className="text-[var(--text-secondary)] font-amount tabular-nums">
                              {formatAmount(cat.spent, config.language)} kr
                            </span>
                          )}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Direct shortcut card at the end of carousel */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.95, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.12 + categoryBudgetData.length * 0.02 }}
                  onClick={() => onNavigate("budget", "category-budgets")}
                  className="flex-shrink-0 flex flex-col justify-between p-3.5 rounded-[20px] bg-[var(--surface-muted)]/40 hover:bg-[var(--surface-muted)] dark:bg-white/5 dark:hover:bg-white/10 transition-all group text-left active:scale-[0.98] min-w-[124px] sm:min-w-[136px] max-w-[146px] cursor-pointer snap-start border border-black/[0.03] dark:border-white/[0.03]"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--surface-color)] dark:bg-white/10 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-all shrink-0 shadow-2xs">
                    <SlidersHorizontal size={20} strokeWidth={2.2} />
                  </div>
                  <div className="flex flex-col items-start w-full min-w-0 mt-3.5">
                    <span className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight leading-tight truncate w-full transition-colors">
                      {config.language === "en" ? "Manage" : "Hantera"}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] leading-tight mt-1 truncate w-full">
                      {config.language === "en" ? "Allocate budget" : "Fördela budget"}
                    </span>
                  </div>
                </motion.button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate("budget", "category-budgets")}
              className="w-full p-3 rounded-[16px] border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between text-left group cursor-pointer text-white"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/80 group-hover:text-white transition-colors">
                  <SlidersHorizontal size={14} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white leading-snug">
                    {config.language === "en" ? "Allocate your budget" : "Fördela din vardagsbudget"}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {config.language === "en" ? "Set limits per category" : "Sätt gränser per kategori"}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} className="text-white/60 group-hover:text-white transition-colors" />
            </button>
          )}
        </GreetingModule>
      </motion.div>

      {/* Quick Action Buttons: Lägg till utgift & Lägg till inkomst */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
        className="grid grid-cols-2 gap-2.5 sm:gap-3"
      >
        <button
          type="button"
          onClick={() => onAddTransaction(selectedDate)}
          className="flex items-center justify-center gap-2 py-3 px-3.5 sm:py-3.5 sm:px-4 rounded-[20px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs transition-all active:scale-[0.98] cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center transition-transform group-hover:scale-105">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span className="text-[13px] sm:text-[13.5px] font-bold tracking-tight">
            {config.language === "en" ? "Add expense" : "Lägg till utgift"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onAddIncome(selectedDate)}
          className="flex items-center justify-center gap-2 py-3 px-3.5 sm:py-3.5 sm:px-4 rounded-[20px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs transition-all active:scale-[0.98] cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-transform group-hover:scale-105">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span className="text-[13px] sm:text-[13.5px] font-bold tracking-tight">
            {config.language === "en" ? "Add income" : "Lägg till inkomst"}
          </span>
        </button>
      </motion.div>

      {/* One-Tap Quick Expense Box */}
      {onQuickAddExpense && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <QuickExpenseWidget
            config={config}
            selectedDate={selectedDate}
            allTransactions={allTransactions || transactions}
            onAddExpense={onQuickAddExpense}
          />
        </motion.div>
      )}

      {/* Attention Items / Budget Actions */}
      {attentionItems.length > 0 && (
        <div className="space-y-6 pt-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between px-2 mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight">
                  {t("actionRequired")}
                </h4>
                <div className="w-5 h-5 rounded-full bg-[#FFF3E3] text-[#E58A17] dark:bg-[#E58A17]/20 dark:text-[#FFA947] text-[10px] font-bold flex items-center justify-center">
                  {attentionItems.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide px-2">
              {attentionItems.map((item, index) => {
                const isPast = item.deductionDay < new Date().getDate();
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    onClick={() => onEditAttentionItem?.(item)}
                    className="flex-shrink-0 flex flex-col gap-3 bg-[#FFF3E3]/35 dark:bg-[#161A22] border border-[#E58A17]/20 dark:border-[#E58A17]/30 p-5 rounded-[16px] hover:bg-[#FFF3E3]/65 dark:hover:bg-[#1D222C] transition-all group relative overflow-hidden active:scale-[0.98] min-w-[160px] shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 [&_div]:w-8 [&_div]:h-8 [&_div]:rounded-full [&_img]:rounded-full [&_span]:text-lg">
                        <BudgetItemLogo
                          item={item}
                          type={
                            item.budgetType === "income" ? "income" : "expense"
                          }
                          config={config}
                        />
                      </div>
                      {isPast && (
                        <div className="px-2.5 py-0.5 rounded-full bg-danger/10 text-[10px] font-semibold text-danger">
                          {t("delayed")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] tracking-tight leading-tight mb-1 truncate w-full text-left">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-normal text-[var(--text-secondary)] text-left">
                        {t("fillInAmount")}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between px-2 mb-3.5">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] sm:text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
              {stats.isPastPeriod
                ? "Periodens transaktioner"
                : selectedDate.toDateString() === new Date().toDateString()
                  ? `${t("todayLabel").charAt(0).toUpperCase() + t("todayLabel").slice(1)}, ${selectedDate.toLocaleDateString(config.language === "en" ? "en-US" : "sv-SE", { day: "numeric", month: "long" })}`
                  : selectedDate.toLocaleDateString(
                      config.language === "en" ? "en-US" : "sv-SE",
                      { day: "numeric", month: "long" },
                    )}
            </h3>
            {!isTodaySelected && (
              <button
                onClick={handleGoToToday}
                className="flex items-center gap-1 px-2.5 h-6 rounded-full bg-[var(--surface-muted)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <RotateCcw size={10} strokeWidth={2} />
                <span>{config.language === "en" ? "Today" : "Idag"}</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {(stats.isPastPeriod
              ? stats.periodTransactions
              : selectedDayData?.transactions
            )?.length > 0 ? (
              <motion.div className="space-y-2.5" key="transactions">
                {(stats.isPastPeriod
                  ? stats.periodTransactions || []
                  : selectedDayData?.transactions || []
                ).map((transaction: Transaction, index: number) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TransactionItem
                      transaction={transaction}
                      config={config}
                      onView={onViewTransaction}
                      onDelete={onDeleteTransaction}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="no-transactions"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <EmptyState
                  icon={(allTransactions?.length || 0) === 0 && (incomes?.length || 0) === 0 && (fixedExpenses?.length || 0) === 0 ? Sparkles : Wallet}
                  title={(allTransactions?.length || 0) === 0 && (incomes?.length || 0) === 0 && (fixedExpenses?.length || 0) === 0 ? t("noTransactions") : t("noTransactionsSubtle")}
                />
              </motion.div>
            )}

            {!stats.isPastPeriod &&
              (config.showFixedExpensesInCalendar ?? config.showFixedExpensesInTodayView) &&
              fixedTransactions.length > 0 && (
                <motion.div
                  key="fixed-budget"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2.5"
                >
                  {fixedTransactions.map((t: any, index: number) => (
                    <TransactionItem
                      key={`${t.id}-${index}`}
                      transaction={t}
                      config={config}
                      isFixed={true}
                      onClick={() => {
                        if (t.type === "income") {
                          onViewIncome?.(t.originalItem || t);
                        } else if (t.type === "saving") {
                          onViewMonthlySaving?.(t.originalItem || t);
                        } else {
                          onViewFixedExpense?.(t.originalItem || t);
                        }
                      }}
                    />
                  ))}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
