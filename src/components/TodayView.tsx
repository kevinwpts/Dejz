import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
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

  const lang = config?.language || 'sv';

  const resolvedWidgets = useMemo(() => {
    return getResolvedHomeWidgets(config?.homeWidgets);
  }, [config?.homeWidgets]);

  const handleRemoveWidget = (widgetId: string) => {
    if (!onUpdateConfig) return;
    const current = getResolvedHomeWidgets(config?.homeWidgets);
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
          category: i.category || (lang === "en" ? "Fixed Income" : "Fast inkomst"),
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
          category: e.category || (lang === "en" ? "Fixed Expense" : "Fast utgift"),
          merchant: e.name,
          timestamp: normalizedSelectedDate.getTime(),
          isFixed: true,
          originalItem: e,
        });
      }
    });

    if (config?.monthlySavingsItems) {
      config.monthlySavingsItems.forEach((s) => {
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
            type: "expense",
            category: lang === "en" ? "Savings" : "Sparande",
            merchant: s.name,
            timestamp: normalizedSelectedDate.getTime(),
            isFixed: true,
            originalItem: s,
          });
        }
      });
    }

    return transactions;
  }, [normalizedSelectedDate, incomes, fixedExpenses, config?.monthlySavingsItems, lang, stats?.periodId]);

  const categoryBudgetData = useMemo(() => {
    if (!stats || !config?.categories || config.categories.length === 0) return [];

    const categoriesWithBudget = config.categories.filter((c: any) => c.budget && Number(c.budget) > 0);
    const pool = categoriesWithBudget.length > 0 ? categoriesWithBudget : config.categories;

    return pool.map((cat: any, index: number) => {
      const name = cat.name;
      const spent = stats.periodTransactions
        ? stats.periodTransactions
            .filter((t: any) => t.category === name && t.type !== "income")
            .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)
        : 0;

      const hasBudget = cat.budget !== undefined && cat.budget !== null && cat.budget !== "" && Number(cat.budget) > 0;
      let budgetInKronor = 0;

      if (hasBudget) {
        const rawBudget = Number(cat.budget);
        budgetInKronor = Math.round(rawBudget);
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
  }, [stats, config?.categories]);

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 relative font-sans pb-16"
    >
      {/* 1. Deep ambient midnight background with the 3 large diffuse radial gradients */}
      <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#080A14]">
        {/* 1. Uppe till höger: mörk indigo/blå rgba(67, 56, 202, 0.16) */}
        <div className="absolute -top-24 right-[-10%] w-[650px] sm:w-[750px] h-[650px] sm:h-[750px] rounded-full bg-[radial-gradient(circle,rgba(67,56,202,0.16)_0%,rgba(8,10,20,0)_70%)] blur-[90px]" />

        {/* 2. Bakom/under saldoområdet: mörk blå rgba(37, 99, 235, 0.10) */}
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[700px] sm:w-[800px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10)_0%,rgba(8,10,20,0)_70%)] blur-[100px]" />

        {/* 3. Längre ned till vänster: mörk violett rgba(109, 40, 217, 0.08) */}
        <div className="absolute top-[52%] left-[-15%] w-[600px] sm:w-[700px] h-[600px] sm:h-[700px] rounded-full bg-[radial-gradient(circle,rgba(109,40,217,0.08)_0%,rgba(8,10,20,0)_70%)] blur-[100px]" />
      </div>

      {/* 1. HERO AREA & ACTIONS (Directly on canvas) */}
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

      {/* 2. BUDGETKATEGORIER (Glass cards: rgba(255,255,255,0.045), blur 20px, border 0.07, top highlight) */}
      <div className="space-y-3.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] select-none">
            {lang === 'en' ? 'Category Budgets' : 'Budgetkategorier'}
          </span>
          <button
            type="button"
            onClick={() => onNavigate("budget", "category-budgets")}
            className="text-xs font-medium text-[#9CA6BC] hover:text-white transition-colors cursor-pointer flex items-center gap-1 group"
          >
            <span>{lang === 'en' ? 'Manage' : 'Hantera'}</span>
            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform text-[#9CA6BC] group-hover:text-white" />
          </button>
        </div>

        {categoryBudgetData.length > 0 ? (
          <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
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
                  transition={{ delay: 0.08 + index * 0.02 }}
                  onClick={() => onNavigate("analysis")}
                  className="flex-shrink-0 flex flex-col justify-between p-4 rounded-2xl bg-white/[0.045] hover:bg-white/[0.065] backdrop-blur-[20px] transition-all group text-left active:scale-[0.98] min-w-[155px] sm:min-w-[170px] max-w-[185px] cursor-pointer snap-start border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.15)]"
                >
                  {/* Top Row: Minimalist Monochrome Icon (#C7CDDC, stroke 1.75, bg-white/[0.05]) + Category Name (Medium 500) */}
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.06] text-[#C7CDDC] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {isEmojiString(cat.iconName) ? (
                        <span className="text-[14px] leading-none">{cat.iconName}</span>
                      ) : Icon ? (
                        <Icon size={15} strokeWidth={1.75} className="text-[#C7CDDC]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#C7CDDC]" />
                      )}
                    </div>

                    <span className="text-xs sm:text-[13px] font-medium text-[#C7CDDC] group-hover:text-white transition-colors tracking-tight truncate flex-1">
                      {cat.name}
                    </span>
                  </div>

                  {/* Bottom Row: Amount Remaining (Semibold 600) & Progress Bar */}
                  <div className="flex flex-col w-full space-y-1.5">
                    <div className="flex items-baseline justify-between gap-1">
                      {cat.hasBudget ? (
                        cat.isOverBudget ? (
                          <span className="text-[14px] sm:text-[15px] font-semibold text-rose-400 font-amount tabular-nums">
                            +{formatAmount(Math.abs(cat.remaining), lang)} kr
                          </span>
                        ) : (
                          <span className="text-[14px] sm:text-[15px] font-semibold text-white font-amount tabular-nums">
                            {formatAmount(cat.remaining, lang)} kr
                          </span>
                        )
                      ) : (
                        <span className="text-[14px] sm:text-[15px] font-semibold text-[#C7CDDC] font-amount tabular-nums">
                          {formatAmount(cat.spent, lang)} kr
                        </span>
                      )}

                      <span className="text-[11px] font-normal text-[#9CA6BC] shrink-0">
                        {cat.hasBudget 
                          ? (cat.isOverBudget 
                              ? (lang === 'en' ? 'over' : 'över') 
                              : (lang === 'en' ? 'left' : 'kvar')) 
                          : (lang === 'en' ? 'spent' : 'använt')}
                      </span>
                    </div>

                    {cat.hasBudget && (
                      <div className="w-full h-1 bg-white/[0.07] rounded-full overflow-hidden mt-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            cat.isOverBudget ? 'bg-rose-500' : 'bg-[#8B9CFF]'
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
              transition={{ delay: 0.08 + categoryBudgetData.length * 0.02 }}
              onClick={() => onNavigate("budget", "category-budgets")}
              className="flex-shrink-0 flex flex-col justify-between p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.05] transition-all group text-left active:scale-[0.98] min-w-[135px] max-w-[145px] cursor-pointer snap-start border border-dashed border-white/[0.08]"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] text-[#C7CDDC] group-hover:text-white border border-white/[0.06] shrink-0">
                  <SlidersHorizontal size={14} strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium text-[#C7CDDC] group-hover:text-white transition-colors truncate">
                  {lang === "en" ? "Manage" : "Hantera"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-normal text-[#9CA6BC]">
                <span>{lang === "en" ? "Edit limits" : "Justera"}</span>
                <span>→</span>
              </div>
            </motion.button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("budget", "category-budgets")}
            className="w-full p-4 rounded-2xl border border-dashed border-white/[0.1] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.045] transition-all flex items-center justify-between text-left group cursor-pointer text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[#C7CDDC] group-hover:text-white transition-colors">
                <SlidersHorizontal size={15} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white leading-snug">
                  {lang === "en" ? "Allocate your budget" : "Fördela din vardagsbudget"}
                </p>
                <p className="text-[11px] font-normal text-[#9CA6BC]">
                  {lang === "en" ? "Set limits per category" : "Sätt gränser per kategori"}
                </p>
              </div>
            </div>
            <ChevronRight size={15} className="text-[#9CA6BC] group-hover:text-white transition-colors" />
          </button>
        )}
      </div>

      {/* 3. PERIOD TIMELINE */}
      {calendarDays && calendarDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="pt-2"
        >
          <PeriodTimeline
            calendarDays={calendarDays}
            selectedDate={normalizedSelectedDate}
            onSelectDate={setSelectedDate}
            stats={stats}
            language={lang}
            isCurrentPeriod={isCurrentPeriod}
          />
        </motion.div>
      )}

      {/* 4. SELECTED DAY'S TRANSACTIONS (Natural Swedish casing: Idag, 26 september) */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-white tracking-tight">
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
              className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-white/[0.045] hover:bg-white/[0.07] border border-white/[0.07] backdrop-blur-[18px] text-xs font-medium text-[#C7CDDC] hover:text-white transition-all active:scale-95 cursor-pointer shadow-2xs ml-auto"
            >
              <RotateCcw size={11} strokeWidth={1.75} />
              <span>{lang === "en" ? "Today" : "Idag"}</span>
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
            ) : fixedTransactions.length === 0 ? (
              <EmptyState
                title={t("noTransactionsToday")}
                description={t("addFirstTransaction")}
                onAction={() => onAddTransaction(selectedDate)}
                actionLabel={t("addExpense")}
              />
            ) : null}
          </AnimatePresence>

          {/* Fixed transactions for the day (Natural Swedish casing) */}
          {fixedTransactions.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-medium text-[#9CA6BC] px-1">
                {lang === "en" ? "Fixed transactions" : "Fasta transaktioner"}
              </h4>
              <div className="space-y-2">
                {fixedTransactions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.type === "income" && onViewIncome) {
                        onViewIncome(item.originalItem);
                      } else if (item.originalItem?.targetAmount && onViewMonthlySaving) {
                        onViewMonthlySaving(item.originalItem);
                      } else if (onViewFixedExpense) {
                        onViewFixedExpense(item.originalItem);
                      }
                    }}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-[18px] bg-white/[0.04] hover:bg-white/[0.065] border border-white/[0.07] backdrop-blur-[18px] transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.12)] group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center shrink-0">
                        <BudgetItemLogo item={item.originalItem} size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13.5px] font-semibold text-white truncate">
                          {item.merchant}
                        </p>
                        <p className="text-[11px] font-normal text-[#9CA6BC] truncate mt-0.5">
                          {item.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs sm:text-sm font-semibold font-amount tabular-nums ${
                        item.type === "income" ? "text-emerald-400" : "text-white"
                      }`}>
                        {item.type === "income" ? "+" : "−"}{formatAmount(item.amount, lang)} {config?.currency || 'kr'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. LOWER SECTION: WIDGETS & MÅNADSPULS (Deep scrollable feed) */}
      <div className="space-y-4 pt-6 border-t border-white/[0.06]">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] select-none">
            {lang === 'en' ? 'Widgets & Insights' : 'Widgets & insikter'}
          </span>
          <button
            type="button"
            onClick={() => setIsWidgetManagerOpen(true)}
            className="text-xs font-medium text-[#9CA6BC] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{lang === 'en' ? 'Customize' : 'Anpassa'}</span>
            <LayoutGrid size={13} />
          </button>
        </div>

        {/* Customization Bar if active */}
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.045] border border-white/[0.08] backdrop-blur-[20px] shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14px]">🛠️</span>
              <div>
                <p className="text-xs font-bold text-white">
                  {lang === 'en' ? 'Edit widgets mode' : 'Redigeringsläge aktivt'}
                </p>
                <p className="text-[11px] text-[#C7CDDC]/80">
                  {lang === 'en' ? 'Click Remove on cards or Add to manage.' : 'Klicka på Ta bort på korten eller Lägg till fler.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsWidgetManagerOpen(true)}
                className="px-3 py-1 rounded-xl bg-white text-slate-950 text-xs font-bold shadow-xs hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                {lang === 'en' ? '+ Add' : '+ Lägg till'}
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="px-3 py-1 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.14] text-xs font-medium border border-white/[0.08] active:scale-95 transition-all cursor-pointer"
              >
                {lang === 'en' ? 'Done' : 'Klar'}
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
                >
                  <div className="p-4 rounded-2xl bg-white/[0.045] border border-white/[0.07] backdrop-blur-[20px] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {lang === 'en' ? 'Attention required' : 'Kräver åtgärd'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                        {attentionItems.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {attentionItems.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => onEditAttentionItem?.(item)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer border border-white/[0.04]"
                        >
                          <span className="text-xs text-[#C7CDDC]">{item.name}</span>
                          <span className="text-xs font-bold text-amber-400 font-amount tabular-nums">
                            {formatAmount(item.amount, lang)} {config?.currency || 'kr'}
                          </span>
                        </div>
                      ))}
                    </div>
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
                    language={lang}
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
                    config={config}
                    stats={stats}
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

        {/* Manage Widgets Footer Bar */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsWidgetManagerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.045] hover:bg-white/[0.07] text-[#C7CDDC] hover:text-white border border-white/[0.07] backdrop-blur-[20px] text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <LayoutGrid size={13} strokeWidth={1.75} className="text-[#C7CDDC]" />
            <span>{lang === 'en' ? 'Manage widgets' : 'Hantera widgets'}</span>
          </button>
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
