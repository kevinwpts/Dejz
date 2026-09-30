import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

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

  const isNegative = (stats?.remainingPeriodCents || 0) < 0;

  // Period interval using Dejz existing period dates (e.g. "24 sep – 22 okt")
  const periodIntervalText = useMemo(() => {
    const start = stats?.periodStart || periodStart;
    const end = stats?.periodEnd || periodEnd;
    if (!start || !end) return null;
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

    const formatDate = (d: Date) => {
      const formatted = d.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
        day: 'numeric',
        month: 'short',
      });
      return formatted.replace(/\.$/, '');
    };

    return `${formatDate(startDate)} \u2013 ${formatDate(endDate)}`;
  }, [stats?.periodStart, stats?.periodEnd, periodStart, periodEnd, isEn]);

  // Days remaining: always "X dagar kvar till lön" / "X days left until payday"
  const daysRemainingText = useMemo(() => {
    if (stats?.isPastPeriod) {
      return isEn ? 'Period ended' : 'Perioden avslutad';
    }
    const days = effectiveRemainingDays;
    if (days === 1) {
      return isEn ? '1 day left until payday' : '1 dag kvar till lön';
    }
    return isEn ? `${days} days left until payday` : `${days} dagar kvar till lön`;
  }, [stats?.isPastPeriod, effectiveRemainingDays, isEn]);

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 font-sans relative">
      {/* 1. HERO OVERVIEW: Minimalist, clear visual hierarchy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pt-2 sm:pt-4 text-center flex flex-col items-center"
      >
        {/* Information label: Kvar att spendera (standard capitalization) */}
        <span className="text-[13px] sm:text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block select-none">
          {t('totalRemaining')}
        </span>

        {/* Primary Hero Amount: refined 36-42px, weight 600 */}
        <div className="flex items-baseline justify-center gap-1.5 mt-0.5">
          <AnimatedNumber 
            value={stats?.remainingPeriodCents || 0} 
            className={`text-[34px] sm:text-[38px] md:text-[42px] leading-tight font-semibold font-amount tabular-nums tracking-tight ${
              isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-[#211F1C] dark:text-white'
            }`}
            formatter={(val) => formatAmount(val, language)}
          />
          {/* Currency label */}
          <span className={`text-sm sm:text-base font-normal tracking-tight ${
            isNegative ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-[#6D6962] dark:text-[#A8A8A8]'
          }`}>
            {currency}
          </span>
        </div>

        {/* Cohesive Secondary Metadata Directly Under Amount:
            24 sep – 22 okt
            23 dagar kvar till lön
        */}
        <div className="flex flex-col items-center gap-0.5 mt-1.5 select-none">
          {periodIntervalText && (
            <p className="text-[14px] font-normal text-[#211F1C] dark:text-[#E7E5E4] tracking-tight">
              {periodIntervalText}
            </p>
          )}
          <p className="text-[13px] sm:text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] tabular-nums tracking-tight">
            {daysRemainingText}
          </p>
        </div>
      </motion.div>

      {/* 2. DINA BUDGETAR CAROUSEL */}
      {categoryBudgets}

      {children}
    </div>
  );
}
