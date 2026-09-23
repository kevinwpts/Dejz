import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';

import { X, Plus, Wallet, Sparkles, WalletCards, Bell, User, Search } from 'lucide-react';
import { TranslationKey, Language } from '../i18n';
import { PeriodTimeline } from './PeriodTimeline';
import { CalendarModal } from './CalendarModal';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { AmountSelector } from './AmountSelector';

interface GreetingModuleProps {
  userName?: string;
  availableForD: number;
  currency: string;
  isToday: boolean;
  date: Date;
  language: string;
  stats: any;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  calendarDays: any[];
  setSelectedDate: (date: Date) => void;
  setCurrentPeriodDate?: (date: Date) => void;
  periodStart: Date;
  periodEnd: Date;
  isFuturePeriod: boolean;
  isPastPeriod: boolean;
  periods?: any[];
  variant?: 'default' | 'compact';
  showPeriodSelector?: boolean;
  avatarUrl?: string | null;
  onNavigate: (tab: string, section?: string) => void;
  showFixedInCalendar?: boolean;
  isCurrentPeriod?: boolean;
  currentPeriodDate?: Date;
  config: any;
  onUpdateConfig?: (newConfig: any) => void;
  onAddTransaction?: (type: "income" | "expense") => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
}

export function GreetingModule({
  userName,
  availableForD,
  currency,
  isToday: _isToday,
  date,
  language,
  stats,
  t,
  calendarDays,
  setSelectedDate,
  setCurrentPeriodDate,
  periodStart: _periodStart,
  periodEnd: _periodEnd,
  isFuturePeriod,
  isPastPeriod: _isPastPeriod,
  periods,
  variant: _variant = 'default',
  showPeriodSelector: _showPeriodSelector = false,
  avatarUrl,
  onNavigate,
  showFixedInCalendar: _showFixedInCalendar,
  isCurrentPeriod,
  currentPeriodDate,
  config,
  onUpdateConfig: _onUpdateConfig,
  onAddTransaction,
  onOpenNotifications,
  notificationCount = 0,
}: GreetingModuleProps) {
  const [isCalculationModalOpen, setIsCalculationModalOpen] = useState(false);
  const [isSaveToPotOpen, setIsSaveToPotOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const effectiveRemainingDays = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return stats.remainingDays || 1;
    const normDate = new Date(date || new Date());
    normDate.setHours(0, 0, 0, 0);
    const index = calendarDays.findIndex((d: any) => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === normDate.getTime();
    });
    if (index !== -1) {
      return Math.max(1, calendarDays.length - index);
    }
    return stats.remainingDays || 1;
  }, [calendarDays, date, stats.remainingDays]);

  const futureDays = Math.max(1, effectiveRemainingDays - 1);
  const _impact = Math.round(Math.abs(availableForD) / futureDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date || new Date());
  selected.setHours(0, 0, 0, 0);
  const diffDays = Math.round((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const greetingPhrase = useMemo(() => {
    const hour = new Date().getHours();
    if (language === 'en') {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    } else {
      if (hour < 10) return 'God morgon';
      if (hour < 18) return 'God dag';
      return 'God kväll';
    }
  }, [language]);

  const _formattedDate = useMemo(() => {
    const d = new Date();
    const str = d.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [language]);

  const _selectedDayData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return null;
    return calendarDays.find((d: any) => d.date && d.date.getTime() === selected.getTime());
  }, [calendarDays, selected]);

  const todayDayData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return null;
    return calendarDays.find((d: any) => d.isToday) || calendarDays[0];
  }, [calendarDays]);

  let topLabel: React.ReactNode = '';
  let displayAmount = 0;
  let isNegative = false;

  if (isFuturePeriod) {
    topLabel = t('plannedDailyBudget');
    displayAmount = stats?.baseDailyBudgetCents || 0;
    isNegative = false;
  } else {
    topLabel = t('leftToday');
    displayAmount = Math.round(availableForD || 0);
    isNegative = availableForD < 0;
  }

  // Calculate daily progress bar values
  const spentToday = todayDayData ? todayDayData.daySpent : 0;
  const dayBudgetTotal = Math.max(1, spentToday + Math.max(0, displayAmount));
  const dayProgressPct = isNegative 
    ? 0 
    : Math.max(0, Math.min(100, (Math.max(0, displayAmount) / dayBudgetTotal) * 100));

  // Dejzi mascot advice calculation
  const dejziInfo = useMemo(() => {
    if (!stats) return null;

    const spentTodayRound = todayDayData ? Math.round(todayDayData.daySpent || 0) : 0;
    const remainingToday = Math.round(availableForD || 0);
    const remainingDaysTotal = stats.remainingDays || 1;
    const futureDaysLeft = Math.max(0, remainingDaysTotal - 1);

    if (remainingToday < 0) {
      const overAmount = Math.abs(remainingToday);
      
      let detailStr = null;
      if (futureDaysLeft === 0) {
        detailStr = language === 'en'
          ? `Tomorrow is payday! Try to hold tight until then.`
          : `Imorgon är det lön! Försök att hålla i pengarna tills dess.`;
      } else if (futureDaysLeft === 1) {
        const perDayDecrease = Math.round(overAmount / 1);
        detailStr = language === 'en'
          ? `This reduces your allowance for tomorrow by approx. ${formatAmount(perDayDecrease, language)} ${currency}.`
          : `Det gör att ditt utrymme imorgon minskar med cirka ${formatAmount(perDayDecrease, language)} ${currency}.`;
      } else {
        const perDayDecrease = Math.round(overAmount / futureDaysLeft);
        detailStr = language === 'en'
          ? `This reduces your daily allowance by approx. ${formatAmount(perDayDecrease, language)} ${currency}/day over the next ${futureDaysLeft} days.`
          : `Det gör att ditt utrymme minskar med cirka ${formatAmount(perDayDecrease, language)} ${currency}/dag de kommande ${futureDaysLeft} dagarna.`;
      }

      return {
        message: language === 'en'
          ? `You are ${formatAmount(overAmount, language)} ${currency} over today's budget.`
          : `Du ligger ${formatAmount(overAmount, language)} ${currency} över dagens plan.`,
        detail: detailStr,
        type: 'warning'
      };
    }

    let msg = '';
    if (spentTodayRound === 0) {
      msg = language === 'en'
        ? `You haven't spent anything yet today! You have ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Du har inte spenderat något än idag! Du har ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    } else {
      msg = language === 'en'
        ? `You have spent ${formatAmount(spentTodayRound, language)} ${currency} today and have ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Du har spenderat ${formatAmount(spentTodayRound, language)} ${currency} idag och har ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    }

    let detail = null;
    if (remainingToday > 0) {
      if (futureDaysLeft === 0) {
        detail = language === 'en'
          ? `If you don't spend more today, you finish the period with ${formatAmount(remainingToday, language)} ${currency} in surplus! 🎉`
          : `Om du inte spenderar mer idag klarar du perioden med ${formatAmount(remainingToday, language)} ${currency} i överskott! 🎉`;
      } else if (futureDaysLeft === 1) {
        const perDayBonus = Math.round(remainingToday / 1);
        detail = language === 'en'
          ? `If you don't spend more today, you get approx. ${formatAmount(perDayBonus, language)} ${currency} more tomorrow!`
          : `Om du inte spenderar mer idag får du cirka ${formatAmount(perDayBonus, language)} ${currency} mer imorgon!`;
      } else {
        const perDayBonus = Math.round(remainingToday / futureDaysLeft);
        detail = language === 'en'
          ? `If you don't spend more today, you get approx. ${formatAmount(perDayBonus, language)} ${currency} more per day for the next ${futureDaysLeft} days.`
          : `Om du inte spenderar mer idag får du cirka ${formatAmount(perDayBonus, language)} ${currency} mer per dag de kommande ${futureDaysLeft} dagarna.`;
      }
    }

    return {
      message: msg,
      detail: detail,
      type: 'success'
    };
  }, [stats, todayDayData, availableForD, language, currency]);

  return (
    <div className="font-sans relative">
      {/* Sticky Top Header Bar (Never disappears when scrolling) */}
      <div className="sticky top-0 z-40 w-full bg-[#0EA5E9]/95 backdrop-blur-md pt-[calc(0.85rem+env(safe-area-inset-top))] pb-3 border-b border-white/10 shadow-sm text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("profile")}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-white overflow-hidden shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User size={20} strokeWidth={2.2} />
              )}
            </button>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-medium text-white/80 leading-none mb-1">
                {greetingPhrase} 👋
              </span>
              <span className="text-sm font-bold text-white tracking-tight leading-none">
                {userName || 'Användare'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("search")}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              aria-label="Sök"
            >
              <Search size={18} strokeWidth={2.2} />
            </button>
            <button
              onClick={onOpenNotifications || (() => onNavigate("notifications"))}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer relative"
              aria-label="Notiser"
            >
              <Bell size={18} strokeWidth={2.2} fill="currentColor" className="opacity-90" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-sky-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Soft Fintech Cyan-Blue Hero Card Body */}
      <div className="w-full relative overflow-hidden rounded-b-[36px] bg-gradient-to-br from-[#0EA5E9] via-[#0284C7] to-[#2563EB] text-white pt-3 pb-8 shadow-xl shadow-sky-500/15 border-b border-sky-400/30">
        {/* Soft Ambient Light Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-sky-300/20 rounded-full blur-xl pointer-events-none" />

        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Center Balance Display */}
          <div className="flex flex-col items-center text-center my-2 relative z-10">
            <span className="text-[11px] font-bold tracking-wider text-white/80 uppercase mb-1">
              {topLabel}
            </span>
            <div className="flex items-baseline justify-center gap-1.5 my-1">
              <AnimatedNumber
                value={displayAmount}
                className={`text-4xl sm:text-5xl font-black text-white font-amount tabular-nums tracking-tight ${
                  isNegative ? 'text-rose-200' : ''
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span className="text-lg font-semibold text-white/80 font-sans">
                {currency}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs mt-3">
              <div className="w-full h-2 bg-white/25 backdrop-blur-md rounded-full overflow-hidden relative">
                <div
                  className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${
                    isNegative ? 'bg-rose-300' : 'bg-white shadow-sm'
                  }`}
                  style={{ width: `${dayProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Action Grid (4 Soft Translucent Glass Buttons) */}
          <div className="grid grid-cols-4 gap-2 pt-4 relative z-10">
            <button
              onClick={() => onAddTransaction?.("expense")}
              className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all backdrop-blur-md border border-white/25 rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 text-white shadow-xs cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={18} strokeWidth={2.8} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                {language === 'en' ? 'Expense' : 'Utgift'}
              </span>
            </button>

            <button
              onClick={() => onAddTransaction?.("income")}
              className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all backdrop-blur-md border border-white/25 rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 text-white shadow-xs cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet size={18} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                {language === 'en' ? 'Income' : 'Inkomst'}
              </span>
            </button>

            <button
              onClick={() => onNavigate("budget")}
              className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all backdrop-blur-md border border-white/25 rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 text-white shadow-xs cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles size={18} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                {language === 'en' ? 'Save' : 'Spara'}
              </span>
            </button>

            <button
              onClick={() => onNavigate("budget")}
              className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all backdrop-blur-md border border-white/25 rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 text-white shadow-xs cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <WalletCards size={18} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                {language === 'en' ? 'Budget' : 'Budget'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content below hero card centered in max-w-2xl */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-5 pt-4">

      {/* Dejzi Mascot Card (2026 Adaptive Personalization & Organic Shapes) */}
      {dejziInfo && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.12 }}
          className="rounded-[24px] border border-[var(--border-color)] p-4 sm:p-5 bg-[var(--surface-color)] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex items-start gap-3.5 group cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40 border border-sky-200/50 dark:border-sky-800/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
            🌼
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-tight text-[var(--text-primary)]">
                Dejzi
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {language === 'en' ? 'Smart Insight' : 'Dagens Insikt'}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-snug">
              {dejziInfo.message}
            </p>

            {dejziInfo.detail && (
              <p className="text-xs text-[var(--text-secondary)] opacity-85 mt-1 leading-relaxed">
                {dejziInfo.detail}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* 3. Egen Modul: Totalt kvar & Nästa lön */}
      {effectiveRemainingDays !== undefined && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[24px] border border-[var(--border-color)] p-5 sm:p-6 bg-[var(--surface-color)] shadow-sm transition-all duration-500"
        >
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                {t('totalRemaining' as any)}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-amount leading-none">
                {formatAmount(stats?.remainingPeriodCents || 0, language)} <span className="opacity-40 text-lg font-normal">{currency}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                {t('daysToNextSalary' as any)}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] font-amount leading-none">
                {stats?.remainingDays || 1} <span className="opacity-40 text-sm font-normal font-sans">{(stats?.remainingDays || 1) === 1 ? t('oneDay' as any) : t('days' as any)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. Timeline of Period (Placed under Totalt kvar & Nästa lön) */}
      {calendarDays && calendarDays.length > 0 && (
        <PeriodTimeline
          calendarDays={calendarDays}
          selectedDate={date}
          onSelectDate={setSelectedDate}
          stats={stats}
          language={language}
          isCurrentPeriod={isCurrentPeriod}
        />
      )}
      </div>

      {/* Calculation Modal */}
      <div>
        {isCalculationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
            <div
              
              className="bg-[var(--surface-color)] rounded-[28px] p-6 w-full max-w-sm relative border border-[var(--border-color)] shadow-xl"
            >
              <button
                onClick={() => setIsCalculationModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-color)] rounded-full"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
              
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">{t('periodBudget')}</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">{t('totalIncome')}</span>
                    <span className="font-semibold text-[var(--text-primary)] font-amount">{formatAmount(stats.totalIncome, language)} <span className="font-sans">{currency}</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">{t('fixedExpenses')}</span>
                    <span className="font-semibold text-danger font-amount">-{formatAmount(stats.totalFixed, language)} <span className="font-sans">{currency}</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">{t('savingsGoal')}</span>
                    <span className="font-semibold text-danger font-amount">-{formatAmount(stats.totalSavings, language)} <span className="font-sans">{currency}</span></span>
                  </div>
                </div>

                <div className="h-[0.5px] bg-[var(--border-color)]" />

                <div className="space-y-2">
                  {stats.totalExtraIncomeUpToToday > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)]">{t('extraIncomes')}</span>
                      <span className="font-semibold text-success font-amount">+{formatAmount(stats.totalExtraIncomeUpToToday, language)} <span className="font-sans">{currency}</span></span>
                    </div>
                  )}

                  {stats.totalFutureExtraIncome > 0 && (
                    <div className="flex justify-between items-center text-sm opacity-70">
                      <span className="text-[var(--text-secondary)]">{t('futureExtraIncomes')}</span>
                      <span className="font-semibold text-success font-amount">+{formatAmount(stats.totalFutureExtraIncome, language)} <span className="font-sans">{currency}</span></span>
                    </div>
                  )}

                  {stats.totalDistributedSurplusInPeriod > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)]">{t('distributedSurplus')}</span>
                      <span className="font-semibold text-success font-amount">+{formatAmount(stats.totalDistributedSurplusInPeriod, language)} <span className="font-sans">{currency}</span></span>
                    </div>
                  )}
                  
                  {stats.totalSpentInPeriod > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)]">{t('variableExpenses')}</span>
                      <span className="font-semibold text-danger font-amount">-{formatAmount(stats.totalSpentInPeriod - (stats.totalSavedInPot || 0), language)} <span className="font-sans">{currency}</span></span>
                    </div>
                  )}

                  {stats.totalSavedInPot > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)]">{t('piggyBank')}</span>
                      <span className="font-semibold text-accent font-amount">-{formatAmount(stats.totalSavedInPot, language)} <span className="font-sans">{currency}</span></span>
                    </div>
                  )}
                </div>
                
                <div className="h-[0.5px] bg-[var(--border-color)] my-2" />
                
                <div className="flex justify-between items-center p-3 bg-accent/5 rounded-t-[16px]">
                  <span className="font-semibold text-[var(--text-primary)]">{t('totalRemaining')}</span>
                  <span className="font-semibold text-[var(--text-primary)] text-base font-amount">{formatAmount(stats.remainingPeriodCents, language)} <span className="font-sans">{currency}</span></span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[var(--bg-color)]">
                  <span className="text-[var(--text-secondary)] text-sm">{t('salaryIn')}</span>
                  <span className="text-[var(--text-secondary)] text-sm">/ {effectiveRemainingDays} {effectiveRemainingDays === 1 ? t('oneDay') : t('days')}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent/10 rounded-b-[16px]">
                  <span className="font-semibold text-[var(--text-primary)]">{diffDays === 0 ? t('leftToday') : topLabel}</span>
                  <span className="font-semibold text-accent text-xl font-amount">{formatAmount(displayAmount, language)} <span className="font-sans">{currency}</span></span>
                </div>
              </div>
              
              <button
                onClick={() => setIsCalculationModalOpen(false)}
                className="w-full mt-8 py-3 rounded-full bg-[var(--bg-color)] text-[var(--text-primary)] font-semibold text-sm active:scale-[0.98] transition-all"
              >
                {t('closeBtn')}
              </button>
            </div>
          </div>
        )}
      </div>

      <AmountSelector
        isOpen={isSaveToPotOpen}
        onClose={() => setIsSaveToPotOpen(false)}
        onConfirm={(_amount) => {
          setIsSaveToPotOpen(false);
        }}
        maxAmount={stats.remainingPeriodCents}
        title={t('saveInPiggyBank')}
        t={t}
        currency={currency}
        remainingDays={effectiveRemainingDays}
        theme="default"
      />

      <CalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        calendarDays={calendarDays}
        selectedDate={date}
        onSelectDate={(selected) => {
          setSelectedDate(selected);
          if (setCurrentPeriodDate) {
            setCurrentPeriodDate(selected);
          }
        }}
        periods={periods}
        currentPeriodDate={currentPeriodDate}
        onPeriodChange={setCurrentPeriodDate}
        periodName={stats?.periodName}
        isCurrentPeriod={isCurrentPeriod}
        t={t}
        language={language as Language}
        showFixedInCalendar={config?.showFixedExpensesInCalendar}
      />
    </div>
  );
}
