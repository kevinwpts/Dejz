import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';

import { Zap, TrendingDown, Target, Calendar as CalendarIcon, X } from 'lucide-react';
import { TranslationKey, Language } from '../i18n';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';
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
  setSelectedDate: _setSelectedDate,
  setCurrentPeriodDate,
  periodStart: _periodStart,
  periodEnd: _periodEnd,
  isFuturePeriod,
  isPastPeriod,
  periods,
  variant: _variant = 'default',
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

  const totalSpent = stats.totalSpentInPeriod || 0;
  const originalBudget = stats.disposablePot || 0;
  const result = originalBudget - totalSpent;
  const isPositive = result >= 0;

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

  // Calculate daily budget remaining percentage & rainbow gradient
  const baseDailyTarget = stats?.baseDailyBudgetCents || (stats?.disposablePot ? Math.round(stats.disposablePot / (stats.totalDaysInPeriod || 30)) : 0);
  const rawPct = baseDailyTarget > 0 ? (displayAmount / baseDailyTarget) * 100 : (displayAmount > 0 ? 100 : 0);
  const dailyPercentage = Math.max(0, Math.min(100, rawPct));

  const _isPayday = useMemo(() => {
    if (!isToday || !stats) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodStart = new Date(stats.periodStart);
    periodStart.setHours(0, 0, 0, 0);
    return today.getTime() === periodStart.getTime();
  }, [isToday, stats]);

  if (isPastPeriod) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* 1. Period Selector */}
        {periods && setCurrentPeriodDate && currentPeriodDate && (
          <UniversalPeriodSelector
            periods={periods}
            currentDate={currentPeriodDate}
            onChange={setCurrentPeriodDate}
            periodName={stats.periodName}
            isCurrentPeriod={isCurrentPeriod}
            onOpenPicker={() => setIsCalendarModalOpen(true)}
          />
        )}

        {/* Main Summary Card */}
        <div className="bg-[var(--surface-color)] border border-[var(--border-color)] dark:border-white/10 p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between min-h-[300px] rounded-[28px] shadow-sm">
          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="flex flex-col items-center mb-7">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--accent-color)] mb-4">
                <Target size={24} strokeWidth={1.75} />
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)] opacity-75">
                {t('periodClosing')}
              </span>
              <div className={`mt-3 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
                isPositive 
                  ? 'bg-success/10 text-success' 
                  : 'bg-danger/10 text-danger'
              }`}>
                {isPositive ? t('surplus') : t('deficit')}
              </div>
            </div>

            <div className="flex items-baseline justify-center gap-2 mb-2">
              <AnimatedNumber 
                value={totalSpent} 
                className="text-5xl sm:text-6xl md:text-7xl leading-none font-bold tracking-tight font-amount tabular-nums text-[var(--text-primary)]"
                formatter={(val) => formatAmount(val, language)}
              />
              <span className="text-xl sm:text-2xl font-light text-[var(--text-secondary)] opacity-40">
                {currency}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] opacity-60 mb-8">
              {t('totalSpent')}
            </p>

            <div className="flex flex-col items-center justify-center w-full max-w-[340px] bg-[var(--surface-muted)] rounded-[16px] p-5 transition-colors border border-[var(--border-color)]/50">
                <span className="text-xs font-medium text-[var(--text-secondary)] opacity-70 mb-1">
                  {t('result')}
                </span>
                <span className={`text-2xl font-bold font-amount tabular-nums tracking-tight ${isPositive ? 'text-success' : 'text-danger'}`}>
                  {isPositive ? '+' : ''}{formatAmount(result, language)} <span className="text-sm font-semibold opacity-40 ml-1 font-sans">{currency}</span>
                </span>
            </div>
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: t('income'), value: stats.totalIncome, icon: Zap, color: 'text-[var(--accent-color)]' },
            { label: t('fixed'), value: stats.totalFixed, icon: TrendingDown, color: 'text-danger' },
            { label: t('days'), value: stats.totalDaysInPeriod, icon: CalendarIcon, color: 'text-success', isRaw: true }
          ].map((item, i) => (
            <div key={i} className="bg-[var(--surface-color)] p-3.5 sm:p-4 rounded-[16px] border border-[var(--border-color)] dark:border-white/10 flex flex-col items-center justify-center hover:bg-[var(--surface-muted)]/50 transition-colors shadow-xs">
              <div className={`w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center ${item.color} opacity-90 mb-2`}>
                <item.icon size={15} strokeWidth={1.75} />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-75 mb-0.5 text-center">{item.label}</span>
              <span className={`text-[15px] font-bold text-[var(--text-primary)] tracking-tight ${!item.isRaw ? 'font-amount tabular-nums' : ''}`}>
                {item.isRaw ? item.value : formatAmount(item.value || 0, language)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 font-sans relative">
      {/* 1. Period Selector */}
      {periods && setCurrentPeriodDate && currentPeriodDate && (
        <UniversalPeriodSelector
          periods={periods}
          currentDate={currentPeriodDate}
          onChange={setCurrentPeriodDate}
          periodName={stats.periodName}
          isCurrentPeriod={isCurrentPeriod}
          onOpenPicker={() => setIsCalendarModalOpen(true)}
        />
      )}

      {/* 2. Dagsbudget Hero Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-[28px] overflow-hidden border border-[var(--border-color)] dark:border-white/10 shadow-sm transition-all duration-500 flex flex-col ${
          diffDays === 0 ? 'bg-[#F4F7FF] dark:bg-[#161B26]' : 'bg-[var(--surface-color)]'
        }`}
      >
        <div className="relative overflow-hidden flex flex-col">
          <div className="pt-6 pb-5 sm:pt-7 sm:pb-6 px-6 sm:px-8 flex flex-col items-start text-left relative z-10">
            {/* Header-rad med etikett */}
            <div className="w-full flex items-center justify-between gap-3 mb-1">
              <span className="text-[12px] sm:text-[14px] font-semibold tracking-tight text-[var(--text-secondary)]">
                {topLabel}
              </span>
            </div>
            
            {/* Beloppet */}
            <div className="flex items-baseline justify-start gap-2 whitespace-nowrap my-0.5">
              <AnimatedNumber 
                value={displayAmount} 
                className={`text-3xl sm:text-4xl md:text-5xl leading-none font-extrabold font-amount tabular-nums tracking-tighter ${
                  isNegative ? 'text-danger' : 'text-[var(--text-primary)]'
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span className={`text-lg sm:text-xl font-bold ${
                isNegative ? 'text-danger' : 'text-[var(--text-secondary)]'
              } opacity-80`}>
                {currency}
              </span>
            </div>

            {/* Progressbar för dagsbudgeten */}
            <div className="w-full mt-4">
              <div className="w-full h-5 sm:h-6 bg-[var(--surface-muted)] rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyPercentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${isNegative ? 'bg-danger' : 'bg-[#356BFF]'}`}
                />
              </div>
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
          </div>
        </div>
      </motion.div>

      {/* 3. Egen Modul: Totalt kvar & Nästa lön */}
      {effectiveRemainingDays !== undefined && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[24px] border border-[var(--border-color)] dark:border-white/10 p-5 sm:p-6 bg-[var(--surface-color)] shadow-sm transition-all duration-500"
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
                ((stats?.remainingPeriodCents || 0) / Math.max(1, (stats?.disposablePot || 1) + (stats?.totalExtraIncomeUpToToday || 0))) < 0.1 ? 'bg-danger' : 'bg-[#0B3DA5] dark:bg-[#5B82FF]'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, ((stats?.remainingPeriodCents || 0) / Math.max(1, (stats?.disposablePot || 1) + (stats?.totalExtraIncomeUpToToday || 0))) * 100))}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-2.5 text-[10px] font-semibold text-[var(--text-secondary)] opacity-40 px-0.5">
            <span>0</span>
            <span>{formatAmount((stats?.disposablePot || 0) + (stats?.totalExtraIncomeUpToToday || 0), language)} {currency}</span>
          </div>
        </motion.div>
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
