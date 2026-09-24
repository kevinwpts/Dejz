import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
  Wallet,
  Sparkles,
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
import { BudgetItemLogo } from "./BudgetItem";
import { ICON_MAP, getCategoryIconName, isEmojiString } from "../utils/icons";
import { getEmojiSolidColor } from "../utils/ui";
import { formatAmount } from "../utils/format";

const COLORS = ['#2A2A2A', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#333333', '#222222', '#555555', '#444444'];

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
  _onAddTransaction,
  _onAddIncome,
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

  const categoryBudgetData = useMemo(() => {
    if (!stats || !config.categories || config.categories.length === 0) return [];

    const periodStart = stats.periodStart ? new Date(stats.periodStart).getTime() : 0;
    const periodEnd = stats.periodEnd ? new Date(stats.periodEnd).getTime() + 86399999 : Infinity;
    const totalIncome = stats.totalIncome || 0;

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

    (fixedExpenses || []).forEach((e: FixedExpense) => {
      const category = (e.category || "").trim();
      if (!category) return;
      let amount = Number(e.amount) || 0;
      switch (e.frequency) {
        case Frequency.QUARTERLY: amount = amount / 3; break;
        case Frequency.SEMI_ANNUALLY: amount = amount / 6; break;
        case Frequency.ANNUALLY: amount = amount / 12; break;
        default: break;
      }
      breakdown[category] = (breakdown[category] || 0) + amount;
    });

    return (config.categories || []).map((cat, index) => {
      const name = cat.name;
      const searchName = name.trim().toLowerCase();
      let spent = 0;
      for (const [key, val] of Object.entries(breakdown)) {
        if (key.trim().toLowerCase() === searchName) {
          spent += val;
        }
      }

      // Exact fixed expenses for this category
      const periodId = stats?.periodId || '';
      const catFixed = (fixedExpenses || [])
        .filter((e: any) => e.category?.trim().toLowerCase() === searchName)
        .reduce((sum: number, e: any) => {
          const amount = (e.isVariable && e.periodOverrides && periodId && e.periodOverrides[periodId] !== undefined)
            ? e.periodOverrides[periodId]
            : (Number(e.amount) || 0);
          switch (e.frequency) {
            case 'quarterly': return sum + amount / 3;
            case 'semi-annually': return sum + amount / 6;
            case 'annually': return sum + amount / 12;
            default: return sum + amount;
          }
        }, 0);

      let budgetInKronor = 0;
      let hasBudget = false;

      if (cat.budget !== undefined && cat.budget > 0) {
        budgetInKronor = cat.budget > 100 
          ? Math.round(cat.budget) 
          : (totalIncome > 0 ? Math.round((cat.budget / 100) * totalIncome) : 0);
        hasBudget = budgetInKronor > 0;
      } else if (catFixed > 0) {
        budgetInKronor = Math.round(catFixed);
        hasBudget = true;
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
            <div className="space-y-2">
              {/* Header with direct shortcut to Budget view */}
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-semibold text-white/80 tracking-tight">
                  {config.language === "en" ? "Category Budgets" : "Kategoribudget"}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate("budget", "category-budgets")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white/90 hover:text-white hover:bg-white/10 transition-all cursor-pointer py-0.5 px-2 rounded-lg active:scale-95 group"
                >
                  <SlidersHorizontal size={11} className="transition-transform group-hover:rotate-45 text-white" />
                  <span>{config.language === "en" ? "Allocate budget" : "Fördela budget"}</span>
                  <ChevronRight size={11} className="text-white" />
                </button>
              </div>

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
                      className="flex-shrink-0 flex flex-col justify-between p-2.5 rounded-[16px] bg-white/10 dark:bg-black/25 border border-white/10 hover:border-white/30 hover:bg-white/15 transition-all group text-left active:scale-[0.98] min-w-[104px] max-w-[118px] shadow-2xs cursor-pointer snap-start"
                    >
                      <div className="flex items-center justify-start w-full mb-1.5">
                        {/* Circular Progress Ring with Icon */}
                        <div className="relative w-[32px] h-[32px] flex items-center justify-center shrink-0">
                          <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
                            <circle
                              cx="16"
                              cy="16"
                              r="13.5"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.2)"
                              strokeWidth="2"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="13.5"
                              fill="none"
                              stroke={cat.isOverBudget ? "#f59e0b" : (cat.color || "rgba(255, 255, 255, 0.8)")}
                              strokeWidth="2"
                              strokeDasharray={84.82}
                              strokeDashoffset={
                                cat.hasBudget
                                  ? 84.82 * (1 - Math.min(cat.spent / cat.budgetInKronor, 1))
                                  : 84.82
                              }
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div
                            className="w-[23px] h-[23px] rounded-full flex items-center justify-center shadow-2xs shrink-0 relative z-10"
                            style={{
                              backgroundColor:
                                cat.color ||
                                (isEmojiString(cat.iconName)
                                  ? getEmojiSolidColor(cat.iconName)
                                  : COLORS[index % COLORS.length]),
                              color: "#fff",
                            }}
                          >
                            {isEmojiString(cat.iconName) ? (
                              <span className="text-[11px] leading-none">{cat.iconName}</span>
                            ) : Icon ? (
                              <Icon size={11} strokeWidth={1.75} />
                            ) : (
                              <div className="w-1 h-1 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start w-full min-w-0">
                        <span className="text-[11.5px] font-semibold text-white tracking-tight leading-tight truncate w-full group-hover:text-white/90 transition-colors">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-medium leading-tight mt-0.5 truncate w-full text-white/85">
                          {cat.hasBudget ? (
                            cat.isOverBudget ? (
                              <span className="text-amber-300 font-semibold font-amount tabular-nums">
                                +{formatAmount(Math.abs(cat.remaining), config.language)} kr
                              </span>
                            ) : (
                              <span className="text-white/60">
                                <strong className="text-white font-bold font-amount tabular-nums">
                                  {formatAmount(cat.remaining, config.language)} kr
                                </strong>{" "}
                                kvar
                              </span>
                            )
                          ) : (
                            <span className="text-white/60 font-amount tabular-nums">
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
                  className="flex-shrink-0 flex flex-col justify-between p-2.5 rounded-[16px] bg-white/5 border border-dashed border-white/20 hover:border-white/40 hover:bg-white/10 transition-all group text-left active:scale-[0.98] min-w-[104px] max-w-[118px] shadow-2xs cursor-pointer snap-start"
                >
                  <div className="flex items-center justify-start w-full mb-1.5">
                    <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center bg-white/10 border border-white/10 text-white/80 group-hover:text-white group-hover:border-white/30 transition-colors">
                      <SlidersHorizontal size={13} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="flex flex-col items-start w-full min-w-0">
                    <span className="text-[11.5px] font-semibold text-white tracking-tight leading-tight truncate w-full">
                      {config.language === "en" ? "Allocate" : "Fördela"}
                    </span>
                    <span className="text-[10px] text-white/60 leading-tight mt-0.5 flex items-center gap-0.5 truncate w-full">
                      <span>{config.language === "en" ? "Adjust" : "Justera budget"}</span>
                      <ChevronRight size={10} />
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
