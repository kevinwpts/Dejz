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
      {/* TOP HERO SUMMARY SECTION (Sits directly on app background - no card wrapper/border) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full -mt-3 sm:-mt-5 pt-0 mb-[12px] select-none px-1"
      >
        {/* UPPER PART: Budget Gauge */}
        <BudgetGauge
          remainingCents={stats?.remainingPeriodCents || 0}
          disposablePotCents={stats?.disposablePot || 0}
          currency={currency}
          language={language}
          label={t('totalRemaining')}
        />

        {/* THIN HORIZONTAL DIVIDER */}
        <div className="mt-[6px] border-t border-[#E2DDD4]/60 dark:border-white/[0.08]" />

        {/* LOWER PART: Compact Info row */}
        <div className="pt-2 grid grid-cols-2 divide-x divide-[#E2DDD4]/60 dark:divide-white/[0.08]">
          {/* Left Column: Period */}
          <div className="flex items-center gap-1.5 pr-2 justify-center sm:justify-start min-w-0">
            <Calendar size={13} className="text-[#6D6962] dark:text-[#A8A8A8] shrink-0" strokeWidth={2} />
            <span className="text-[11.5px] font-medium text-[#6D6962] dark:text-[#A8A8A8] truncate">
              {periodIntervalText}
            </span>
          </div>

          {/* Right Column: Till Lön */}
          <div className="flex items-center gap-1.5 pl-2 justify-center sm:justify-start min-w-0">
            <Clock size={13} className="text-[#6D6962] dark:text-[#A8A8A8] shrink-0" strokeWidth={2} />
            <span className="text-[11.5px] font-medium text-[#6D6962] dark:text-[#A8A8A8] truncate">
              {daysValueText} {isEn ? 'to payday' : 'till lön'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. DINA BUDGETAR CAROUSEL */}
      {categoryBudgets}

      {children}
    </div>
  );
}
