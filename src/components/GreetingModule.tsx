import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock } from 'lucide-react';
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
      {/* WHITE SUMMARY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-white/88 dark:bg-[#242424]/90 backdrop-blur-[2px] rounded-[20px] p-[20px] border border-[#E2DDD4]/80 dark:border-[#383838] shadow-none mb-[24px] select-none"
      >
        {/* UPPER PART: Budget Gauge */}
        <BudgetGauge
          remainingCents={stats?.remainingPeriodCents || 0}
          disposablePotCents={stats?.disposablePot || 0}
          currency={currency}
          language={language}
          label={t('totalRemaining')}
        />

        {/* THIN HORIZONTAL DIVIDER (16px below gauge) */}
        <div className="mt-[16px] border-t border-[#E2DDD4] dark:border-[#383838]" />

        {/* LOWER PART: Info row (16px below line) */}
        <div className="pt-[16px] grid grid-cols-2 divide-x divide-[#E2DDD4] dark:divide-[#383838]">
          {/* Left Column: Period */}
          <div className="flex items-center gap-[10px] pr-2.5 min-w-0">
            <div className="w-[36px] h-[36px] rounded-full bg-[#F3F0EB] dark:bg-[#2D2D2D] flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-[#6D6962] dark:text-[#A8A8A8]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-[4px] min-w-0">
              <span className="text-[10px] font-normal text-[#6D6962] dark:text-[#A8A8A8] uppercase tracking-wider leading-none">
                PERIOD
              </span>
              <span className="text-[14px] font-medium text-[#1C1917] dark:text-white truncate leading-tight">
                {periodIntervalText}
              </span>
            </div>
          </div>

          {/* Right Column: Till Lön */}
          <div className="flex items-center gap-[10px] pl-3.5 sm:pl-4 min-w-0">
            <div className="w-[36px] h-[36px] rounded-full bg-[#F3F0EB] dark:bg-[#2D2D2D] flex items-center justify-center shrink-0">
              <Clock size={18} className="text-[#6D6962] dark:text-[#A8A8A8]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-[4px] min-w-0">
              <span className="text-[10px] font-normal text-[#6D6962] dark:text-[#A8A8A8] uppercase tracking-wider leading-none">
                {isEn ? 'PAYDAY' : 'TILL LÖN'}
              </span>
              <span className="text-[14px] font-medium text-[#1C1917] dark:text-white truncate leading-tight">
                {daysValueText}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. DINA BUDGETAR CAROUSEL */}
      {categoryBudgets}

      {children}
    </div>
  );
}

