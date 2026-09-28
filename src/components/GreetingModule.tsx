import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';
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
  children,
  categoryBudgets
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

  return (
    <div className="space-y-7 font-sans relative">
      {/* 1. HERO AREA: Pure typography & space resting directly on the ambient background */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pt-3 sm:pt-5 pb-1 text-center flex flex-col items-center space-y-2"
      >
        {/* Tracked Minimalist Uppercase Structural Label */}
        <span className="text-[13px] sm:text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] dark:text-[#9CA6BC] block select-none font-display">
          {t('totalRemaining')}
        </span>

        <div className="flex flex-col items-center w-full">
          {/* Primary Hero Amount */}
          <div className="flex items-baseline gap-2">
            <AnimatedNumber 
              value={stats?.remainingPeriodCents || 0} 
              className={`text-[72px] sm:text-[84px] leading-[0.9] font-black font-amount tabular-nums tracking-normal ${
                isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-[var(--text-primary)] dark:text-white'
              }`}
              formatter={(val) => formatAmount(val, language)}
            />
            {/* Currency label */}
            <span className={`text-[24px] sm:text-[28px] font-bold tracking-normal ${
              isNegative ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-[var(--text-secondary)] dark:text-white/80'
            }`}>
              {currency}
            </span>
          </div>

          {/* Days to salary */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] dark:text-[#C7CDDC] font-medium mt-3 bg-[var(--surface-color)] dark:bg-white/[0.045] px-3.5 py-1 rounded-full border border-[var(--border-color)] dark:border-white/[0.06] shadow-xs dark:shadow-none">
            <Calendar size={13} className="text-[var(--text-tertiary)] dark:text-[#9CA6BC]" />
            <span>
              {effectiveRemainingDays} {isEn ? 'days until payday' : 'dagar till lön'}
            </span>
          </div>
        </div>


        </motion.div>

      {categoryBudgets}

      {children}
    </div>
  );
}
