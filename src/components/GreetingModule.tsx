import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

interface DynamicInsight {
  type: 'positive' | 'warning' | 'neutral';
  text: string;
}

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
  dynamicInsight?: DynamicInsight | null;
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
  dynamicInsight
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

  // Period interval using Dejz existing period dates (e.g. "25 sep – 24 okt")
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

  // Days remaining (e.g. "23 dagar kvar")
  const daysRemainingText = useMemo(() => {
    if (stats?.isPastPeriod) {
      return isEn ? 'Period ended' : 'Perioden avslutad';
    }
    const days = effectiveRemainingDays;
    if (days === 1) {
      return isEn ? '1 day left' : '1 dag kvar';
    }
    return isEn ? `${days} days left` : `${days} dagar kvar`;
  }, [stats?.isPastPeriod, effectiveRemainingDays, isEn]);

  // Daily rate based on kvar att spendera / remaining days (e.g. "305 kr/dag")
  const dailyRateText = useMemo(() => {
    const remainingCents = stats?.remainingPeriodCents || 0;
    const days = Math.max(1, effectiveRemainingDays);
    const dailyAmount = remainingCents > 0 ? Math.round(remainingCents / days) : 0;
    return `${formatAmount(dailyAmount, language)} ${currency}/${isEn ? 'day' : 'dag'}`;
  }, [stats?.remainingPeriodCents, effectiveRemainingDays, language, currency, isEn]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4 font-sans relative">
      {/* 1. HERO OVERVIEW: Minimalist, clear visual hierarchy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pt-2 sm:pt-4 text-center flex flex-col items-center"
      >
        {/* Tracked Minimalist Uppercase Structural Label: KVAR ATT SPENDERA */}
        <span className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.08em] text-[#8C867C] dark:text-[#A8A8A8] block select-none font-display">
          {t('totalRemaining')}
        </span>

        {/* Primary Dominant Hero Amount: e.g. 7 018 kr */}
        <div className="flex items-baseline justify-center gap-1.5 mt-0.5">
          <AnimatedNumber 
            value={stats?.remainingPeriodCents || 0} 
            className={`text-[54px] sm:text-[66px] leading-[0.95] font-bold font-amount tabular-nums tracking-tight ${
              isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-[#1C1917] dark:text-white'
            }`}
            formatter={(val) => formatAmount(val, language)}
          />
          {/* Currency label */}
          <span className={`text-[20px] sm:text-[24px] font-semibold tracking-tight ${
            isNegative ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-[#6E6961] dark:text-[#A8A8A8]'
          }`}>
            {currency}
          </span>
        </div>

        {/* Cohesive Secondary Metadata Directly Under Amount:
            25 sep – 24 okt
            23 dagar kvar · 305 kr/dag
        */}
        <div className="flex flex-col items-center gap-0.5 mt-2 select-none">
          {periodIntervalText && (
            <p className="text-sm font-medium text-[#1C1917] dark:text-[#E7E5E4] tracking-tight">
              {periodIntervalText}
            </p>
          )}
          <p className="text-xs sm:text-[13px] font-medium text-[#8C867C] dark:text-[#A8A8A8] tabular-nums tracking-tight">
            {daysRemainingText} <span aria-hidden="true" className="mx-1 opacity-70">·</span> {dailyRateText}
          </p>
        </div>
      </motion.div>

      {/* 2. DYNAMIC INSIGHT: Single concise insight when relevant data exists */}
      {dynamicInsight && (
        <div className="flex items-center justify-center -mt-0.5 mb-0.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.035] dark:bg-white/[0.045] text-[12px] sm:text-[13px] font-medium text-[#57534E] dark:text-[#C7CDDC]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              dynamicInsight.type === 'positive' 
                ? 'bg-emerald-500 dark:bg-emerald-400' 
                : 'bg-amber-500 dark:bg-amber-400'
            }`} />
            <span>{dynamicInsight.text}</span>
          </div>
        </div>
      )}

      {/* 3. DINA BUDGETAR CAROUSEL */}
      {categoryBudgets}

      {children}
    </div>
  );
}
