import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';

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

  const formattedDate = useMemo(() => {
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

  return (
    <div className="space-y-4 sm:space-y-5 font-sans relative">
      {/* 1. Seamless Integrated Grand Hero Gradient Card (Edge-to-edge, full status-bar touching height) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="-mx-4 sm:-mx-6 -mt-[calc(5rem+env(safe-area-inset-top))] pt-[calc(6.5rem+env(safe-area-inset-top))] pb-8 px-5 sm:px-7 rounded-b-[40px] bg-gradient-to-tr from-[#ff3860] via-[#ff4c4c] to-[#ff7a45] dark:from-[#400e12]/85 dark:via-[#2b080a]/80 dark:to-[#1c0204]/80 text-white shadow-[0_12px_40px_rgba(255,76,76,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] relative overflow-hidden flex flex-col"
      >
        {/* Decorative premium light bubbles */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-white/15 rounded-full blur-3xl pointer-events-none" />

        {/* Unified greeting & date header inside the card, spaced perfectly below floating transparent header buttons */}
        <div className="hidden">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 leading-none">
            <span>{userName ? `Hej ${userName}` : 'Hej'}</span>
            <span className="inline-block origin-bottom-right hover:rotate-12 transition-transform duration-200">👋</span>
          </h1>
          <p className="text-xs font-semibold text-white/70 tracking-wide uppercase leading-none mt-1">
            {formattedDate}
          </p>
        </div>

        {/* Content of the Hero card */}
        <div className="flex flex-col items-center text-center relative z-10">
          <span className="text-xs font-semibold text-white/80 tracking-wide uppercase mb-2 block">
            {topLabel}
          </span>
          <div className="flex items-baseline justify-center gap-1.5">
            <AnimatedNumber 
              value={displayAmount} 
              className={`text-3xl sm:text-4xl md:text-5xl leading-none font-bold text-white font-amount tabular-nums tracking-tight ${
                isNegative ? 'text-rose-200' : ''
              }`}
              formatter={(val) => formatAmount(val, language)}
            />
            <span className={`text-base sm:text-lg font-light ${
              isNegative ? 'text-rose-200' : 'text-white/80'
            }`}>
              {currency}
            </span>
          </div>

          {/* Progress bar under Kvar idag */}
          <div className="w-full mt-4">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden relative backdrop-blur-xs">
              <div 
                className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${
                  isNegative || dayProgressPct < 10 ? 'bg-rose-300' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                }`}
                style={{ width: `${dayProgressPct}%` }}
              />
            </div>
          </div>

          {/* Integrated Totalt kvar & Nästa lön */}
          {effectiveRemainingDays !== undefined && (
            <div className="w-full grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-white/15">
              <div className="text-left flex flex-col justify-center">
                <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider mb-1 block">
                  {t('totalRemaining' as any)}
                </span>
                <div className="text-base sm:text-lg font-bold text-white font-amount leading-tight tabular-nums">
                  {formatAmount(stats?.remainingPeriodCents || 0, language)}{' '}
                  <span className="text-xs font-normal opacity-70 ml-0.5">{currency}</span>
                </div>
              </div>
              
              <div className="text-right flex flex-col justify-center items-end">
                <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider mb-1 block">
                  {t('daysToNextSalary' as any)}
                </span>
                <div className="text-base sm:text-lg font-bold text-white font-amount leading-tight tabular-nums">
                  {stats?.remainingDays || 1}{' '}
                  <span className="text-xs font-normal opacity-70 ml-0.5 font-sans">
                    {(stats?.remainingDays || 1) === 1 ? t('oneDay' as any) : t('days' as any)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Integrated Category Budgets / Children */}
          {children && (
            <div className="w-full pt-4 mt-4 border-t border-white/15 text-left">
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
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] opacity-80 uppercase">
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
