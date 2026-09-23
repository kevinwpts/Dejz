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
  onUpdateConfig: _onUpdateConfig
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

  const selectedDayData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return null;
    return calendarDays.find((d: any) => d.date && d.date.getTime() === selected.getTime());
  }, [calendarDays, selected]);

  let topLabel: React.ReactNode = '';
  let displayAmount = 0;
  let isNegative = false;

  if (isFuturePeriod) {
    topLabel = t('plannedDailyBudget');
    displayAmount = stats?.baseDailyBudgetCents || 0;
    isNegative = false;
  } else if (diffDays === 0) {
    topLabel = t('leftToday');
    displayAmount = Math.round(availableForD || 0);
    isNegative = availableForD < 0;
  } else if (diffDays === -1) {
    topLabel = t('yesterdayYouSpent');
    displayAmount = selectedDayData ? selectedDayData.daySpent : 0;
    isNegative = false;
  } else if (diffDays < -1) {
    topLabel = t('onDateYouSpent', { date: selected.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', { month: 'short', day: 'numeric' }) });
    displayAmount = selectedDayData ? selectedDayData.daySpent : 0;
    isNegative = false;
  } else if (diffDays === 1) {
    topLabel = t('tomorrowYouCanSpend');
    displayAmount = selectedDayData ? selectedDayData.availableForD : 0;
    isNegative = displayAmount < 0;
  } else {
    topLabel = t('onDateYouCanSpend', { date: selected.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', { month: 'short', day: 'numeric' }) });
    displayAmount = selectedDayData ? selectedDayData.availableForD : 0;
    isNegative = displayAmount < 0;
  }

  // Calculate daily progress bar values
  const spentToday = selectedDayData ? selectedDayData.daySpent : 0;
  const dayBudgetTotal = Math.max(1, spentToday + Math.max(0, displayAmount));
  const dayProgressPct = isNegative 
    ? 0 
    : Math.max(0, Math.min(100, (Math.max(0, displayAmount) / dayBudgetTotal) * 100));

  // Dejzi mascot advice calculation
  const dejziInfo = useMemo(() => {
    if (!stats) return null;

    const baseDaily = Math.round(stats.baseDailyBudgetCents || 0);
    const spentTodayRound = selectedDayData ? Math.round(selectedDayData.daySpent || 0) : 0;
    const remainingToday = Math.round(availableForD || 0);
    const daysLeft = Math.max(1, (stats.remainingDays || 1) - 1);

    if (diffDays !== 0) {
      return {
        message: language === 'en' 
          ? `You are viewing ${selected.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}.`
          : `Du tittar på ${selected.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}.`,
        detail: null
      };
    }

    if (remainingToday < 0) {
      const overAmount = Math.abs(remainingToday);
      const perDayDecrease = Math.round(overAmount / daysLeft);
      return {
        message: language === 'en'
          ? `You are ${formatAmount(overAmount, language)} ${currency} over today's budget.`
          : `Du ligger ${formatAmount(overAmount, language)} ${currency} över dagens plan.`,
        detail: daysLeft > 0 
          ? (language === 'en'
              ? `This reduces your daily allowance by approx. ${formatAmount(perDayDecrease, language)} ${currency}/day over the next ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`
              : `Det gör att ditt utrymme minskar med cirka ${formatAmount(perDayDecrease, language)} ${currency}/dag de kommande ${daysLeft} ${daysLeft === 1 ? 'dagen' : 'dagarna'}.`)
          : null,
        type: 'warning'
      };
    }

    const diffFromBase = baseDaily - spentTodayRound;
    const perDayBonus = Math.round(remainingToday / daysLeft);

    let msg = '';
    if (spentTodayRound === 0) {
      msg = language === 'en'
        ? `You haven't spent anything yet today! You have ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Du har inte spenderat något än idag! Du har ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    } else if (diffFromBase > 0) {
      msg = language === 'en'
        ? `You are ${formatAmount(diffFromBase, language)} ${currency} under today's plan.`
        : `Du ligger ${formatAmount(diffFromBase, language)} ${currency} under dagens plan.`;
    } else {
      msg = language === 'en'
        ? `You are right on track with today's plan!`
        : `Du håller dig precis inom dagens plan!`;
    }

    let detail = null;
    if (remainingToday > 0 && daysLeft > 0) {
      detail = language === 'en'
        ? `If you don't spend more today, you get approx. ${formatAmount(perDayBonus, language)} ${currency} more per day for the next ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`
        : `Om du inte spenderar mer idag får du cirka ${formatAmount(perDayBonus, language)} ${currency} mer per dag de kommande ${daysLeft} ${daysLeft === 1 ? 'dagen' : 'dagarna'}.`;
    }

    return {
      message: msg,
      detail: detail,
      type: 'success'
    };
  }, [stats, selectedDayData, availableForD, diffDays, selected, language, currency]);

  return (
    <div className="space-y-4 sm:space-y-5 font-sans relative">
      {/* Personal Greeting & Date Header */}
      <div className="flex flex-col gap-0.5 px-1 pt-0.5 pb-0.5 select-none">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <span>{userName ? `Hej ${userName}` : 'Hej'}</span>
          <span className="inline-block origin-bottom-right hover:rotate-12 transition-transform duration-200">👋</span>
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] opacity-70 capitalize">
          {formattedDate}
        </p>
      </div>

      {/* 1. Dagsbudget Hero Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="p-6 sm:p-7 rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-sm flex flex-col items-center text-center"
      >
        <span className="text-xs font-semibold text-[var(--text-secondary)] opacity-85 mb-2.5 block">
          {topLabel}
        </span>
        <div className="flex items-baseline justify-center gap-1.5">
          <AnimatedNumber 
            value={displayAmount} 
            className={`text-3xl sm:text-4xl md:text-5xl leading-none font-bold text-[var(--text-primary)] font-amount tabular-nums tracking-tight ${
              isNegative ? 'text-danger' : ''
            }`}
            formatter={(val) => formatAmount(val, language)}
          />
          <span className={`text-base sm:text-lg font-light opacity-60 ${
            isNegative ? 'text-danger' : 'text-[var(--text-secondary)]'
          }`}>
            {currency}
          </span>
        </div>

        {/* Dagsstatus vid underskott */}
        {isNegative && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              {language === 'en' ? 'Over daily budget by' : 'Över dagsbudget med'} {formatAmount(Math.round(Math.abs(displayAmount)), language)} {currency}
            </span>
          </div>
        )}

        {/* Progress bar under Kvar idag */}
        <div className="w-full mt-5">
          <div className="w-full h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden relative">
            <div 
              className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${
                isNegative || dayProgressPct < 10 ? 'bg-danger' : 'bg-[var(--accent-color)]'
              }`}
              style={{ width: `${dayProgressPct}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-2 text-[10px] font-semibold text-[var(--text-secondary)] opacity-50 px-0.5">
            <span className="font-amount tabular-nums">0</span>
            <span className="font-amount tabular-nums">{formatAmount(dayBudgetTotal, language)} {currency}</span>
          </div>
        </div>
      </motion.div>

      {/* Dejzi Mascot Card */}
      {dejziInfo && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-[22px] border border-[var(--border-color)] p-4 sm:p-5 bg-gradient-to-br from-[var(--surface-color)] via-[var(--surface-color)] to-[var(--surface-muted)]/50 shadow-sm relative overflow-hidden flex items-start gap-3.5"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-400/25 via-emerald-400/25 to-sky-400/25 border border-[var(--accent-color)]/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
            🌼
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="mb-1">
              <span className="text-xs font-bold tracking-tight text-[var(--text-primary)]">
                Dejzi
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
