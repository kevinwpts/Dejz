import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Info, X } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { BudgetGauge } from './BudgetGauge';

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
  children,
  categoryBudgets,
}: GreetingModuleProps) {
  const isEn = language === 'en';
  const [isPeriodInfoOpen, setIsPeriodInfoOpen] = useState(false);

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

  // Days value string e.g. "23 dagar"
  const daysValueText = useMemo(() => {
    if (stats?.isPastPeriod) {
      return isEn ? 'Avslutad' : 'Avslutad';
    }
    const days = effectiveRemainingDays;
    return isEn ? `${days} ${days === 1 ? 'day' : 'days'}` : `${days} ${days === 1 ? 'dag' : 'dagar'}`;
  }, [stats?.isPastPeriod, effectiveRemainingDays, isEn]);

  return (
    <div className="flex flex-col font-sans relative">
      {/* TOP HERO SUMMARY SECTION (Sits directly on app background) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full -mt-2 sm:-mt-3 pt-0 mb-4 sm:mb-5 select-none px-1"
      >
        {/* Budget Gauge with info button */}
        <BudgetGauge
          remainingCents={stats?.remainingPeriodCents || 0}
          disposablePotCents={stats?.disposablePot || 0}
          currency={currency}
          language={language}
          label={t('totalRemaining')}
          onOpenInfo={() => setIsPeriodInfoOpen(true)}
        />
      </motion.div>

      {/* 2. DINA BUDGETAR CAROUSEL */}
      {categoryBudgets}

      {children}

      {/* Period & Payday Info Modal */}
      {isPeriodInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsPeriodInfoOpen(false)} 
          />
          <div className="relative w-full max-w-[320px] bg-white/95 dark:bg-[#181818]/95 backdrop-blur-2xl rounded-[24px] p-5 border border-[#E2DDD4] dark:border-white/[0.1] shadow-2xl space-y-4 z-10 text-left">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#E2DDD4]/60 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 text-[#1C1917] dark:text-white font-semibold text-[15px]">
                <Info size={16} className="text-[var(--accent-color)]" strokeWidth={2.2} />
                <span>{isEn ? 'Period & Payday' : 'Period & Nästa Lön'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodInfoOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#6D6962] dark:text-[#A8A8A8] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Content items */}
            <div className="space-y-2.5 pt-1">
              {/* Period */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/[0.05]">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-[#1C1917] dark:text-white shrink-0 shadow-xs">
                  <Calendar size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-semibold text-[#8C867C] dark:text-[#A8A8A8] uppercase tracking-wider">
                    {isEn ? 'CURRENT PERIOD' : 'AKTUELL PERIOD'}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#1C1917] dark:text-white truncate">
                    {periodIntervalText}
                  </span>
                </div>
              </div>

              {/* Payday / Next Salary */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/[0.05]">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-[#1C1917] dark:text-white shrink-0 shadow-xs">
                  <Clock size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-semibold text-[#8C867C] dark:text-[#A8A8A8] uppercase tracking-wider">
                    {isEn ? 'NEXT PAYDAY' : 'NÄSTA LÖN'}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#1C1917] dark:text-white truncate">
                    {daysValueText} {isEn ? 'until payday' : 'kvar till lön'}
                  </span>
                </div>
              </div>
            </div>

            {/* Close action */}
            <button
              type="button"
              onClick={() => setIsPeriodInfoOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[var(--accent-color)] text-white font-semibold text-xs transition-opacity hover:opacity-90 active:scale-95 cursor-pointer"
            >
              {isEn ? 'Close' : 'Stäng'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
