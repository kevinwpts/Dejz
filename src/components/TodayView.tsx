import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
  Wallet,
  Sparkles,
  RotateCcw,
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

interface TodayViewProps {
  stats: any;
  config: Config;
  userName?: string;
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onAddTransaction: (date?: Date) => void;
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
  if (!stats) return null;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 relative min-h-screen bg-[#080A10] text-[var(--text-primary)] pb-12 overflow-x-hidden"
    >
      {/* Top subtle ~10% lighter dark background gradient (smooth transition into bottom #080A10) */}
      <div className="absolute -top-[env(safe-area-inset-top,44px)] sm:-top-12 left-0 right-0 h-[300px] sm:h-[320px] bg-gradient-to-b from-[#121626] to-transparent pointer-events-none z-0" />
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
          onAddTransaction={(type) => {
            if (type === 'income' && onAddIncome) {
              onAddIncome(normalizedSelectedDate);
            } else if (onAddTransaction) {
              onAddTransaction(normalizedSelectedDate);
            }
          }}
        />
      </motion.div>

      {/* Lower sections wrapped in max-w-2xl mx-auto px-4 sm:px-6 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
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
          <button
            onClick={() => onNavigate("overview", "transactions")}
            className="h-7 px-2.5 rounded-full bg-[var(--surface-muted)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] transition-all cursor-pointer flex items-center justify-center"
          >
            {t("seeAll")}
          </button>
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
      </div>
    </motion.div>
  );
}
