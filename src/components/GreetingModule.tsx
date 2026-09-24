import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { isDemoMode } from '../utils/demoUtils';

import { X } from 'lucide-react';
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
  children?: React.ReactNode;
}

export function GreetingModule({
  userName: _userName,
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
  avatarUrl: _avatarUrl,
  onNavigate: _onNavigate,
  showFixedInCalendar: _showFixedInCalendar,
  isCurrentPeriod,
  currentPeriodDate,
  config,
  onUpdateConfig: _onUpdateConfig,
  children
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

  if (isFuturePeriod) {
    topLabel = t('plannedDailyBudget');
    displayAmount = stats?.baseDailyBudgetCents || 0;
  } else {
    topLabel = t('leftToday');
    displayAmount = Math.round(availableForD || 0);
  }

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
          ? `Payday tomorrow! Hold tight.`
          : `Lön imorgon! Håll ut.`;
      } else if (futureDaysLeft === 1) {
        const perDayDecrease = Math.round(overAmount / 1);
        detailStr = language === 'en'
          ? `Tomorrow's allowance down by ${formatAmount(perDayDecrease, language)} ${currency}.`
          : `Minskar morgondagen med ${formatAmount(perDayDecrease, language)} ${currency}.`;
      } else {
        const perDayDecrease = Math.round(overAmount / futureDaysLeft);
        detailStr = language === 'en'
          ? `Reduces daily allowance by ${formatAmount(perDayDecrease, language)} ${currency}/day.`
          : `Dra ner med ${formatAmount(perDayDecrease, language)} ${currency}/dag framöver.`;
      }

      return {
        message: language === 'en'
          ? `${formatAmount(overAmount, language)} ${currency} over today's budget.`
          : `${formatAmount(overAmount, language)} ${currency} över dagens budget.`,
        detail: detailStr,
        type: 'warning'
      };
    }

    let msg = '';
    if (spentTodayRound === 0) {
      msg = language === 'en'
        ? `No spending yet! ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Inget spenderat än! ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    } else {
      msg = language === 'en'
        ? `Spent ${formatAmount(spentTodayRound, language)} ${currency} today. ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Spenderat ${formatAmount(spentTodayRound, language)} ${currency} idag. ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    }

    let detail = null;
    if (remainingToday > 0) {
      if (futureDaysLeft === 0) {
        detail = language === 'en'
          ? `Klarar dagen to get +${formatAmount(remainingToday, language)} ${currency} surplus! 🎉`
          : `Klarar du dagen får du +${formatAmount(remainingToday, language)} ${currency} i överskott! 🎉`;
      } else if (futureDaysLeft === 1) {
        const perDayBonus = Math.round(remainingToday / 1);
        detail = language === 'en'
          ? `No more spending means +${formatAmount(perDayBonus, language)} ${currency} tomorrow!`
          : `Spara resten och få +${formatAmount(perDayBonus, language)} ${currency} imorgon!`;
      } else {
        const perDayBonus = Math.round(remainingToday / futureDaysLeft);
        detail = language === 'en'
          ? `No more spending adds +${formatAmount(perDayBonus, language)} ${currency}/day ahead.`
          : `Spara resten och få +${formatAmount(perDayBonus, language)} ${currency}/dag framöver.`;
      }
    }

    return {
      message: msg,
      detail: detail,
      type: 'success'
    };
  }, [stats, todayDayData, availableForD, language, currency]);

  const isDemo = isDemoMode();
  const negativeMarginClass = isDemo 
    ? "-mt-[calc(7.2rem+env(safe-area-inset-top))]" 
    : "-mt-[calc(5rem+env(safe-area-inset-top))]";
  const topPaddingClass = isDemo
    ? "pt-[calc(8.7rem+env(safe-area-inset-top))]"
    : "pt-[calc(6.5rem+env(safe-area-inset-top))]";

  const spentToday = todayDayData ? Math.round(todayDayData.daySpent || 0) : 0;
  const spentPct = Math.max(16, Math.min(85, (spentToday / Math.max(1, stats?.baseDailyBudgetCents || 450)) * 100));

  return (
    <div className="space-y-4 sm:space-y-5 font-sans relative">
      {/* 1. Seamless Integrated Grand Hero Area with negative margins */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`-mx-4 sm:-mx-6 ${negativeMarginClass} ${topPaddingClass} pb-4 px-4 sm:px-6 text-[var(--text-primary)] relative overflow-hidden flex flex-col`}
      >
        {/* The Aqua-Inspired Premium Main Rounded Card */}
        <div className="w-full bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.04] rounded-[32px] p-6 shadow-xs relative overflow-hidden flex flex-col mt-4">
          {/* Card Header */}
          <div className="flex items-center justify-end mb-4">
            <button 
              onClick={() => setIsCalculationModalOpen(true)}
              className="w-8 h-8 rounded-full border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all cursor-pointer"
              title={t('periodBudget')}
            >
              <span className="text-xs font-semibold">⟨ ⟩</span>
            </button>
          </div>

          {/* Clean Stats Row with Totalt kvar and Dagar till lön */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex flex-col text-left justify-center">
              <span className="text-xs font-bold text-[var(--text-secondary)] tracking-wider mb-1.5 block uppercase">
                {t('totalRemaining')}
              </span>
              <div className="flex items-baseline gap-1">
                <AnimatedNumber 
                  value={stats?.remainingPeriodCents || 0} 
                  className={`text-[40px] sm:text-[44px] md:text-[48px] leading-none font-black text-[var(--text-primary)] font-amount tabular-nums tracking-tight ${
                    (stats?.remainingPeriodCents || 0) < 0 ? 'text-rose-500' : ''
                  }`}
                  formatter={(val) => formatAmount(val, language)}
                />
                <span className={`text-[18px] font-bold ${
                  (stats?.remainingPeriodCents || 0) < 0 ? 'text-rose-500' : 'text-[var(--text-secondary)]'
                }`}>
                  {currency}
                </span>
              </div>
            </div>

            {/* Elegant Right Side: Dagar till nästa lön Badge */}
            <div className="flex items-center gap-2.5 bg-sky-50/50 dark:bg-sky-950/20 px-4 py-2.5 rounded-2xl border border-sky-100/30 dark:border-sky-950/10 self-start sm:self-center">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 shadow-2xs" />
              <span className="text-xs font-semibold text-sky-800 dark:text-sky-400">
                {stats?.remainingDays || 1} { (stats?.remainingDays || 1) === 1 ? t('oneDay') : t('days') } {language === 'en' ? 'to salary' : 'till lön'}
              </span>
            </div>
          </div>

          {/* High-Fidelity Aqua Style Segmented Progress Bar */}
          <div className="w-full mt-6">
            <div className="w-full flex items-center h-[34px] bg-black/[0.03] dark:bg-white/[0.03] rounded-full overflow-hidden p-1 relative">
              {/* Left: Beautiful Sunset Gradient pill representing Spent Today */}
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#4E83FD] via-[#F43F5E] to-[#F59E0B] flex items-center justify-between px-3 text-[11px] font-bold text-white shadow-xs transition-all duration-500 whitespace-nowrap overflow-hidden"
                style={{ width: `${spentPct}%` }}
              >
                <span>{formatAmount(spentToday, language)} {currency}</span>
                <span className="text-[9px] opacity-90 font-medium font-sans uppercase tracking-wider ml-1.5 hidden xs:inline">
                  {language === 'en' ? 'spent' : 'använt'}
                </span>
              </div>

              {/* Right: Subtly textured pastel decorative remaining blocks */}
              <div className="flex-1 flex items-center gap-1 h-full pl-1.5">
                <div className="h-full w-1/4 bg-violet-400/15 dark:bg-violet-400/25 rounded-md border border-dashed border-violet-400/20" />
                <div className="h-full w-1/5 bg-fuchsia-400/15 dark:bg-fuchsia-400/25 rounded-md border border-dashed border-fuchsia-400/20" />
                <div className="h-full w-1/3 bg-sky-400/15 dark:bg-sky-400/25 rounded-md border border-dashed border-sky-400/20" />
              </div>
            </div>
          </div>

          {/* Outline Action Button */}
          <button 
            onClick={() => setIsCalculationModalOpen(true)}
            className="w-full mt-6 py-2.5 px-4 border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-2xl text-[10px] font-bold tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center uppercase active:scale-[0.98]"
          >
            {language === 'en' ? 'See more insights' : 'Visa budgetdetaljer'}
          </button>

          {/* Integrated Category Budgets Carousel as the Bottom Section inside the Card */}
          {children && (
            <div className="w-full pt-4 mt-6 text-left border-t border-black/[0.05] dark:border-white/[0.05]">
              {children}
            </div>
          )}
        </div>
      </motion.div>

      {/* Dejzi Mascot Card */}
      {dejziInfo && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-[22px] border border-[var(--border-color)] p-4 bg-gradient-to-br from-[var(--surface-color)] via-[var(--surface-color)] to-[var(--surface-muted)]/50 shadow-sm relative overflow-hidden flex items-center gap-4"
        >
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400/20 via-emerald-400/20 to-sky-400/20 border border-[var(--accent-color)]/20 flex items-center justify-center text-xl shadow-xs">
              🌼
            </div>
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] opacity-80">
              Dejzi
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-snug">
              {dejziInfo.message}
            </p>

            {dejziInfo.detail && (
              <p className="text-xs text-[var(--text-secondary)] opacity-85 mt-0.5 leading-normal">
                {dejziInfo.detail}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Period Timeline */}
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
