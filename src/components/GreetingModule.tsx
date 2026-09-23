import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';

import { X } from 'lucide-react';
import { TranslationKey, Language } from '../i18n';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';
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
  userName: _userName,
  availableForD,
  currency,
  isToday,
  date,
  language,
  stats,
  t,
  calendarDays,
  setSelectedDate,
  setCurrentPeriodDate,
  periodStart: _periodStart,
  periodEnd: _periodEnd,
  isFuturePeriod: _isFuturePeriod,
  isPastPeriod: _isPastPeriod,
  periods,
  variant: _variant = 'default',
  showPeriodSelector = false,
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

  // Calculate daily budget
  const _isPayday = useMemo(() => {
    if (!isToday || !stats) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodStart = new Date(stats.periodStart);
    periodStart.setHours(0, 0, 0, 0);
    return today.getTime() === periodStart.getTime();
  }, [isToday, stats]);

  return (
    <div className="space-y-4 sm:space-y-5 font-sans relative">
      {/* 1. Period Selector */}
      {showPeriodSelector && periods && setCurrentPeriodDate && currentPeriodDate && (
        <UniversalPeriodSelector
          periods={periods}
          currentDate={currentPeriodDate}
          onChange={setCurrentPeriodDate}
          periodName={stats.periodName}
          isCurrentPeriod={isCurrentPeriod}
          onOpenPicker={() => setIsCalendarModalOpen(true)}
        />
      )}

      {/* 2. Dagsbudget Hero Card - Identical aesthetic to "Kvar varje månad" in Budget */}
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
      </motion.div>

      {/* 3. Egen Modul: Totalt kvar & Nästa lön */}
      {effectiveRemainingDays !== undefined && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[24px] border border-[var(--border-color)] p-5 sm:p-6 bg-[var(--surface-color)] shadow-sm transition-all duration-500"
        >
          <div className="flex justify-between items-end mb-4">
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
                {effectiveRemainingDays} <span className="opacity-40 text-sm font-normal font-sans">{effectiveRemainingDays === 1 ? t('oneDay' as any) : t('days' as any)}</span>
              </div>
            </div>
          </div>
          
          <div className="w-full h-2.5 bg-[var(--surface-muted)] rounded-full overflow-hidden relative">
            <div 
              className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${
                ((stats?.remainingPeriodCents || 0) / Math.max(1, (stats?.disposablePot || 1) + (stats?.totalExtraIncomeUpToToday || 0))) < 0.1 ? 'bg-danger' : 'bg-[var(--accent-color)]'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, ((stats?.remainingPeriodCents || 0) / Math.max(1, (stats?.disposablePot || 1) + (stats?.totalExtraIncomeUpToToday || 0))) * 100))}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-2.5 text-[10px] font-semibold text-[var(--text-secondary)] opacity-40 px-0.5">
            <span className="font-amount tabular-nums">0</span>
            <span className="font-amount tabular-nums">{formatAmount((stats?.disposablePot || 0) + (stats?.totalExtraIncomeUpToToday || 0), language)} {currency}</span>
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
