import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
  Wallet,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import {
  Transaction,
  Config,
  Income,
  FixedExpense,
  HomeWidgetConfig,
} from "../types";
import { TranslationKey } from "../i18n";
import { TransactionItem } from "./TransactionItem";
import { EmptyState } from "./EmptyState";
import { GreetingModule } from "./GreetingModule";
import { BudgetItemLogo } from "./BudgetItem";
import { PeriodTimeline } from "./PeriodTimeline";
import { MonthlyPulseWidget } from "./widgets/MonthlyPulseWidget";
import { SavingsGoalsWidget } from "./widgets/SavingsGoalsWidget";
import { DailySummaryWidget } from "./widgets/DailySummaryWidget";
import { CategoryBudgetsWidget } from "./widgets/CategoryBudgetsWidget";
import { RecentReceiptsWidget } from "./widgets/RecentReceiptsWidget";
import { WidgetManagerModal } from "./widgets/WidgetManagerModal";
import { getResolvedHomeWidgets } from "../utils/widgetRegistry";
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
  onOpenCalculator?: () => void;
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
  onOpenCalculator,
}: TodayViewProps) {
  const [isWidgetManagerOpen, setIsWidgetManagerOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const resolvedWidgets = useMemo(() => {
    return getResolvedHomeWidgets(config.homeWidgets);
  }, [config.homeWidgets]);

  const handleRemoveWidget = (widgetId: string) => {
    if (!onUpdateConfig) return;
    const current = getResolvedHomeWidgets(config.homeWidgets);
    const updated = current.map((w) => (w.id === widgetId ? { ...w, enabled: false } : w));
    onUpdateConfig({ ...config, homeWidgets: updated });
  };

  const handleSaveWidgets = (updatedWidgets: HomeWidgetConfig[]) => {
    if (!onUpdateConfig) return;
    onUpdateConfig({ ...config, homeWidgets: updatedWidgets });
  };

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
          category: i.category || (config.language === "en" ? "Fixed Income" : "Fast inkomst"),
          merchant: i.name,
          timestamp: normalizedSelectedDate.getTime(),
          isFixed: true,
          originalItem: i,
        });
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
            : Number(e.amount) || 0;

        transactions.push({
          id: `fixed-exp-${e.id}`,
          amount,
          type: "expense",
          category: e.category || (config.language === "en" ? "Fixed Expense" : "Fast utgift"),
          merchant: e.name,
          timestamp: normalizedSelectedDate.getTime(),
          isFixed: true,
          originalItem: e,
        });
      }
    });

    if (config.monthlySavingsItems) {
      config.monthlySavingsItems.forEach((s: any) => {
        if (s.deductionDay === day) {
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
            type: "saving",
            category: s.category || (config.language === "en" ? "Monthly Saving" : "Månadssparande"),
            merchant: s.name,
            timestamp: normalizedSelectedDate.getTime(),
            isFixed: true,
            originalItem: s,
          });
        }
      });
    }

    return transactions;
  }, [normalizedSelectedDate, incomes, fixedExpenses, config.monthlySavingsItems, config.language, stats?.periodId]);

  const categoryBudgetData = useMemo(() => {
    if (!stats || !config.categories || config.categories.length === 0) return [];

    const periodTransactions = stats.periodTransactions || [];
    const spendingTransactions = periodTransactions.filter(
      (t: any) => t.type !== 'income' && t.category !== 'Spargris'
    );

    const disposablePot = stats.disposablePot || 0;

    return config.categories.map((cat, index) => {
      const name = cat.name;
      const spent = spendingTransactions
        .filter((t: any) => t.category === name)
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

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
  }, [stats, config.categories]);

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 relative font-sans"
    >
      {/* Subtle atmospheric ambient glow effects behind Hem content */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none -z-10" />
      <div className="absolute top-96 -right-20 w-80 h-80 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.03),transparent_70%)] pointer-events-none -z-10" />

      {/* 1. HERO GREETING MODULE (Totalt kvar, Dagar till lön, Snabba actions, Budgetkategorier) */}
      <div className="relative">
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
          onAddExpense={() => onAddTransaction(selectedDate)}
          onAddIncome={() => onAddIncome(selectedDate)}
          onQuickAddExpense={onQuickAddExpense}
          onOpenCalculator={onOpenCalculator}
          allTransactions={allTransactions}
        >
          {/* Category Budgets - Seamlessly integrated with generous breathing room and clean monochromatic aesthetic */}
          {categoryBudgetData.length > 0 ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {config.language === 'en' ? 'Category Budgets' : 'Kategoribudgetar'}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate("budget", "category-budgets")}
                  className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{config.language === 'en' ? 'Manage' : 'Hantera'}</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
                {categoryBudgetData.map((cat, index) => {
                  const Icon = ICON_MAP[cat.iconName];
                  const spentPct = cat.budgetInKronor > 0 
                    ? Math.min(100, Math.round((cat.spent / cat.budgetInKronor) * 100))
                    : 0;

                  return (
                    <motion.button
                      key={cat.name}
                      initial={{ opacity: 0, scale: 0.96, x: 8 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.02 }}
                      onClick={() => onNavigate("analysis")}
                      className="flex-shrink-0 flex flex-col justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md transition-all group text-left active:scale-[0.98] min-w-[144px] sm:min-w-[156px] max-w-[170px] cursor-pointer snap-start border border-white/[0.07] shadow-2xs"
                    >
                      {/* Top Row: Monochrome Minimalist Icon + Category Name */}
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-7 h-7 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {isEmojiString(cat.iconName) ? (
                            <span className="text-[13px] leading-none">{cat.iconName}</span>
                          ) : Icon ? (
                            <Icon size={14} strokeWidth={1.75} className="text-slate-300" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                          )}
                        </div>

                        <span className="text-xs font-semibold text-slate-200 tracking-tight truncate flex-1">
                          {cat.name}
                        </span>
                      </div>

                      {/* Bottom Row: Amount Remaining & Progress Bar */}
                      <div className="flex flex-col w-full space-y-1">
                        <div className="flex items-baseline justify-between gap-1">
                          {cat.hasBudget ? (
                            cat.isOverBudget ? (
                              <span className="text-[13px] sm:text-[14px] font-bold text-rose-400 font-amount tabular-nums">
                                +{formatAmount(Math.abs(cat.remaining), config.language)} kr
                              </span>
                            ) : (
                              <span className="text-[13px] sm:text-[14px] font-bold text-white font-amount tabular-nums">
                                {formatAmount(cat.remaining, config.language)} kr
                              </span>
                            )
                          ) : (
                            <span className="text-[13px] sm:text-[14px] font-bold text-slate-300 font-amount tabular-nums">
                              {formatAmount(cat.spent, config.language)} kr
                            </span>
                          )}

                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            {cat.hasBudget 
                              ? (cat.isOverBudget 
                                  ? (config.language === 'en' ? 'over' : 'över') 
                                  : (config.language === 'en' ? 'left' : 'kvar')) 
                              : (config.language === 'en' ? 'spent' : 'använt')}
                          </span>
                        </div>

                        {/* Sleek 2px budget progress bar */}
                        {cat.hasBudget && (
                          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                cat.isOverBudget ? 'bg-rose-500' : 'bg-white/70'
                              }`}
                              style={{ width: `${spentPct}%` }} 
                            />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {/* Direct shortcut card at the end of carousel */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.96, x: 8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.1 + categoryBudgetData.length * 0.02 }}
                  onClick={() => onNavigate("budget", "category-budgets")}
                  className="flex-shrink-0 flex flex-col justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all group text-left active:scale-[0.98] min-w-[130px] max-w-[140px] cursor-pointer snap-start border border-dashed border-white/[0.1]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.04] text-slate-400 group-hover:text-white border border-white/[0.07] shrink-0">
                      <SlidersHorizontal size={13} strokeWidth={1.75} />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors truncate">
                      {config.language === "en" ? "Manage" : "Hantera"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <span>{config.language === "en" ? "Edit limits" : "Justera"}</span>
                    <span>→</span>
                  </div>
                </motion.button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate("budget", "category-budgets")}
              className="w-full p-3.5 rounded-2xl border border-dashed border-white/[0.12] hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-between text-left group cursor-pointer text-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                  <SlidersHorizontal size={14} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white leading-snug">
                    {config.language === "en" ? "Allocate your budget" : "Fördela din vardagsbudget"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {config.language === "en" ? "Set limits per category" : "Sätt gränser per kategori"}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>
          )}
        </GreetingModule>
      </div>

      {/* 2. CUSTOMIZABLE WIDGETS SECTION */}
      <div className="space-y-4">
        {/* Customization Bar if active */}
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-indigo-400/30 backdrop-blur-md shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14px]">🛠️</span>
              <div>
                <p className="text-xs font-bold text-white">
                  {config.language === 'en' ? 'Edit widgets mode' : 'Redigeringsläge aktivt'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {config.language === 'en' ? 'Click Remove on cards or Add to manage.' : 'Klicka på Ta bort på korten eller Lägg till fler.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsWidgetManagerOpen(true)}
                className="px-3 py-1 rounded-xl bg-white text-slate-950 text-xs font-bold shadow-xs hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                {config.language === 'en' ? '+ Add' : '+ Lägg till'}
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="px-3 py-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.14] text-xs font-medium border border-white/[0.1] active:scale-95 transition-all cursor-pointer"
              >
                {config.language === 'en' ? 'Done' : 'Klar'}
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {resolvedWidgets.map((widgetConfig) => {
            if (!widgetConfig.enabled) return null;

            if (widgetConfig.id === 'attention_items' && attentionItems.length > 0) {
              return (
                <motion.div
                  key="attention_items"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 pt-1"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
                        {t("actionRequired")}
                      </h4>
                      <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center justify-center border border-amber-500/20">
                        {attentionItems.length}
                      </div>
                    </div>

                    {isCustomizing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWidget('attention_items')}
                        className="px-2.5 py-0.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        {config.language === 'en' ? 'Remove' : 'Ta bort'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
                    {attentionItems.map((item, index) => {
                      const isPast = item.deductionDay < new Date().getDate();
                      return (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.9, x: 15 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.04 }}
                          onClick={() => onEditAttentionItem?.(item)}
                          className="flex-shrink-0 flex flex-col gap-3 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md p-4 rounded-2xl hover:bg-white/[0.06] transition-all group relative overflow-hidden active:scale-[0.98] min-w-[160px] shadow-2xs cursor-pointer text-left"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                              <BudgetItemLogo
                                item={item}
                                type={
                                  item.budgetType === "income" ? "income" : "expense"
                                }
                                config={config}
                              />
                            </div>
                            {isPast && (
                              <div className="px-2 py-0.5 rounded-full bg-rose-500/15 text-[10px] font-medium text-rose-400 border border-rose-500/20">
                                {t("delayed")}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-xs font-semibold text-slate-200 tracking-tight leading-tight mb-1 truncate w-full text-left">
                              {item.name}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400 text-left">
                              {t("fillInAmount")}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            }

            if (widgetConfig.id === 'monthly_pulse') {
              return (
                <motion.div
                  key="monthly_pulse"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <MonthlyPulseWidget
                    stats={stats}
                    config={config}
                    onNavigate={onNavigate}
                    onRemove={() => handleRemoveWidget('monthly_pulse')}
                    isCustomizing={isCustomizing}
                  />
                </motion.div>
              );
            }

            if (widgetConfig.id === 'savings_goals') {
              return (
                <motion.div
                  key="savings_goals"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <SavingsGoalsWidget
                    config={config}
                    onNavigate={onNavigate}
                    onRemove={() => handleRemoveWidget('savings_goals')}
                    isCustomizing={isCustomizing}
                  />
                </motion.div>
              );
            }

            if (widgetConfig.id === 'daily_summary') {
              return (
                <motion.div
                  key="daily_summary"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <DailySummaryWidget
                    stats={stats}
                    config={config}
                    selectedDate={selectedDate}
                    onRemove={() => handleRemoveWidget('daily_summary')}
                    isCustomizing={isCustomizing}
                  />
                </motion.div>
              );
            }

            if (widgetConfig.id === 'category_budgets') {
              return (
                <motion.div
                  key="category_budgets"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <CategoryBudgetsWidget
                    config={config}
                    allTransactions={allTransactions}
                    stats={stats}
                    onNavigate={onNavigate}
                    onRemove={() => handleRemoveWidget('category_budgets')}
                    isCustomizing={isCustomizing}
                  />
                </motion.div>
              );
            }

            if (widgetConfig.id === 'recent_receipts') {
              return (
                <motion.div
                  key="recent_receipts"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <RecentReceiptsWidget
                    config={config}
                    allTransactions={allTransactions}
                    onNavigate={onNavigate}
                    onViewTransaction={onViewTransaction}
                    onRemove={() => handleRemoveWidget('recent_receipts')}
                    isCustomizing={isCustomizing}
                  />
                </motion.div>
              );
            }

            return null;
          })}
        </AnimatePresence>

        {/* Customize Widgets Button Bar */}
        <div className="flex items-center justify-center gap-2 pt-1 pb-0.5">
          <button
            type="button"
            onClick={() => setIsWidgetManagerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white border border-white/[0.08] backdrop-blur-md text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <LayoutGrid size={13} strokeWidth={1.75} className="text-slate-400" />
            <span>{config.language === 'en' ? 'Manage widgets' : 'Hantera widgets'}</span>
          </button>

          {!isCustomizing ? (
            <button
              type="button"
              onClick={() => setIsCustomizing(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 border border-white/[0.06] text-xs font-medium transition-all active:scale-95 cursor-pointer"
            >
              <span>{config.language === 'en' ? 'Quick edit' : 'Snabbredigera'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCustomizing(false)}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-white text-slate-950 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <span>{config.language === 'en' ? 'Done' : 'Klar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. PERIOD TIMELINE */}
      {calendarDays && calendarDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
        >
          <PeriodTimeline
            calendarDays={calendarDays}
            selectedDate={normalizedSelectedDate}
            onSelectDate={setSelectedDate}
            stats={stats}
            language={config.language}
            isCurrentPeriod={isCurrentPeriod}
          />
        </motion.div>
      )}

      {/* 4. TRANSACTIONS FOR SELECTED DAY */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
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
              className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] backdrop-blur-md text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-2xs ml-auto"
            >
              <RotateCcw size={11} strokeWidth={1.75} />
              <span>{config.language === "en" ? "Today" : "Idag"}</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
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
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ delay: index * 0.04 }}
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
                  icon={Wallet}
                  title={t("noTransactionsSubtle")}
                  actionLabel={t("showAll")}
                  onAction={() => onNavigate("transactions")}
                />
              </motion.div>
            )}

            {!stats.isPastPeriod &&
              (config.showFixedExpensesInCalendar ?? config.showFixedExpensesInTodayView) &&
              fixedTransactions.length > 0 && (
                <motion.div
                  key="fixed-budget"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
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

      {/* Widget Manager Modal */}
      <WidgetManagerModal
        isOpen={isWidgetManagerOpen}
        onClose={() => setIsWidgetManagerOpen(false)}
        config={config}
        onSaveWidgets={handleSaveWidgets}
        stats={stats}
        selectedDate={selectedDate}
        allTransactions={allTransactions}
        attentionItems={attentionItems}
      />
    </motion.div>
  );
}
