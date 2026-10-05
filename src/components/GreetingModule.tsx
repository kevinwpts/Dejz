import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { TranslationKey } from '../i18n';
import { BudgetGauge } from './BudgetGauge';
import { feedback } from '../utils/feedback';
import { formatOrdinalDay } from '../utils/format';

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
  allTransactions?: any[];
  children?: React.ReactNode;
  categoryBudgets?: React.ReactNode;
}

export function GreetingModule({
  currency,
  language,
  stats,
  t,
  calendarDays,
  periodStart,
  periodEnd,
  config,
  children,
  categoryBudgets,
}: GreetingModuleProps) {
  const isEn = language === 'en';
  const [activeSlide, setActiveSlide] = useState(0);

  const effectiveRemainingDays = useMemo(() => {
    if (!stats) return 1;
    const normDate = new Date();
    normDate.setHours(0, 0, 0, 0);
    const index = calendarDays.findIndex((d: any) => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === normDate.getTime();
    });
    if (index !== -1) {
      return Math.max(1, calendarDays.length - index);
    }
    return stats?.remainingDays || 1;
  }, [calendarDays, stats?.remainingDays]);

  // Period interval string e.g. "24 sep – 22 okt"
  const periodIntervalText = useMemo(() => {
    const start = stats?.periodStart || periodStart;
    const end = stats?.periodEnd || periodEnd;
    if (!start || !end) return '—';
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '—';

    const formatDate = (d: Date) => {
      const formatted = d.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
        day: 'numeric',
        month: 'short',
      });
      return formatted.replace(/\.$/, '');
    };

    return `${formatDate(startDate)} \u2013 ${formatDate(endDate)}`;
  }, [stats?.periodStart, stats?.periodEnd, periodStart, periodEnd, isEn]);

  // Payday text format e.g. "Den 25:e varje månad"
  const paydayDayNumber = config?.payday || 25;
  const paydayOrdinal = formatOrdinalDay(paydayDayNumber, language);

  // Period Progress calculation
  const periodProgress = useMemo(() => {
    const start = stats?.periodStart || periodStart;
    const end = stats?.periodEnd || periodEnd;
    if (!start || !end) return { percent: 50, daysElapsed: 1, totalDays: 30 };

    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const totalTime = Math.max(1, endDate.getTime() - startDate.getTime());
    const totalDays = Math.max(1, Math.round(totalTime / (1000 * 60 * 60 * 24)));

    const elapsedTime = Math.max(0, Math.min(totalTime, today.getTime() - startDate.getTime()));
    const daysElapsed = Math.min(totalDays, Math.max(1, Math.ceil(elapsedTime / (1000 * 60 * 60 * 24))));

    const percent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

    return { percent, daysElapsed, totalDays };
  }, [stats?.periodStart, stats?.periodEnd, periodStart, periodEnd]);

  // Swipe handler for motion drag
  const handleDragEnd = (_e: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 35;
    if (info.offset.x < -swipeThreshold && activeSlide === 0) {
      setActiveSlide(1);
      if (typeof feedback?.light === 'function') feedback.light();
    } else if (info.offset.x > swipeThreshold && activeSlide === 1) {
      setActiveSlide(0);
      if (typeof feedback?.light === 'function') feedback.light();
    }
  };

  const handleDotClick = (index: number) => {
    if (activeSlide !== index) {
      setActiveSlide(index);
      if (typeof feedback?.selection === 'function') {
        feedback.selection();
      } else if (typeof feedback?.light === 'function') {
        feedback.light();
      }
    }
  };

  return (
    <div className="flex flex-col font-sans relative">
      {/* TOP HERO SUMMARY SECTION WITH SWIPEABLE CAROUSEL */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full -mt-2 sm:-mt-3 pt-0 mb-3 sm:mb-4 select-none px-1"
      >
        <div className="w-full max-w-[380px] mx-auto overflow-hidden touch-pan-y">
          <motion.div
            className="flex w-full cursor-grab active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            animate={{ x: activeSlide === 0 ? '0%' : '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Slide 1: Budget Gauge */}
            <div className="w-full shrink-0 flex items-center justify-center">
              <BudgetGauge
                remainingCents={stats?.remainingPeriodCents || 0}
                disposablePotCents={stats?.disposablePot || 0}
                currency={currency}
                language={language}
                label={t('totalRemaining')}
                onOpenInfo={() => {
                  setActiveSlide(1);
                  if (typeof feedback?.light === 'function') feedback.light();
                }}
              />
            </div>

            {/* Slide 2: Period & Payday Card (matches BudgetSummaryModule / AnalysisView aesthetic) */}
            <div className="w-full shrink-0 px-2 sm:px-4 py-1 flex items-center justify-center">
              <div className="w-full aspect-[360/200] max-h-[220px] rounded-[22px] bg-[var(--surface-color)] p-5 sm:p-6 border-none shadow-none flex flex-col justify-between">
                {/* Top Split: Dagar till lön (Large on Left) vs Aktuell period (Right) */}
                <div className="grid grid-cols-2 gap-4 items-start">
                  {/* Left Column: Dagar till lön */}
                  <div className="space-y-1">
                    <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] tracking-wider block">
                      {isEn ? 'Days until payday' : 'Dagar till lön'}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[26px] sm:text-[32px] font-bold font-amount tabular-nums text-[var(--text-primary)] tracking-tight">
                        {effectiveRemainingDays}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-secondary)]">
                        {isEn ? (effectiveRemainingDays === 1 ? 'day' : 'days') : (effectiveRemainingDays === 1 ? 'dag' : 'dagar')}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Aktuell period */}
                  <div className="space-y-1 text-right">
                    <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] tracking-wider block">
                      {isEn ? 'Current period' : 'Aktuell period'}
                    </span>
                    <span className="text-[14px] sm:text-[15px] font-bold font-amount text-[var(--text-primary)] block tabular-nums leading-snug mt-1 truncate">
                      {periodIntervalText}
                    </span>
                  </div>
                </div>

                {/* Bottom: Period progress bar & detail matching BudgetSummaryModule */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                    <span>
                      {isEn 
                        ? `Day ${periodProgress.daysElapsed} of ${periodProgress.totalDays}` 
                        : `Dag ${periodProgress.daysElapsed} av ${periodProgress.totalDays}`}
                    </span>
                    <span className="text-[var(--text-primary)]">
                      {isEn ? `Payday: ${paydayOrdinal}` : `Lönedag: ${paydayOrdinal}`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-500 ease-out"
                      style={{ width: `${periodProgress.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pagination dots under the module */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <button
              type="button"
              onClick={() => handleDotClick(0)}
              aria-label={isEn ? 'Show budget gauge' : 'Visa kvar att spendera'}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeSlide === 0
                  ? 'w-5 bg-[var(--text-primary)]'
                  : 'w-1.5 bg-black/20 dark:bg-white/20 hover:bg-black/40 dark:hover:bg-white/40'
              }`}
            />
            <button
              type="button"
              onClick={() => handleDotClick(1)}
              aria-label={isEn ? 'Show period & payday' : 'Visa period och lönedag'}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeSlide === 1
                  ? 'w-5 bg-[var(--text-primary)]'
                  : 'w-1.5 bg-black/20 dark:bg-white/20 hover:bg-black/40 dark:hover:bg-white/40'
              }`}
            />
          </div>
        </div>
      </motion.div>

      {/* 2. DINA BUDGETAR CAROUSEL */}
      {categoryBudgets}

      {children}
    </div>
  );
}
