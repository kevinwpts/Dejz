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
        className="pt-3 sm:pt-5 pb-1 text-left space-y-2"
      >
        {/* Tracked Minimalist Uppercase Structural Label (500 Medium) */}
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9CA6BC] block select-none">
          {t('totalRemaining')}
        </span>

        {/* Amount & Payday Info in a row */}
        <div className="flex flex-wrap sm:flex-nowrap items-baseline sm:items-center justify-between gap-3 w-full">
          {/* Primary Hero Amount (Semibold 600 - Bold 700) */}
          <div className="flex items-baseline gap-2">
            <AnimatedNumber 
              value={stats?.remainingPeriodCents || 0} 
              className={`text-[52px] sm:text-[64px] leading-[0.98] font-semibold sm:font-bold font-amount tabular-nums tracking-tight ${
                isNegative ? 'text-rose-400' : 'text-white'
              }`}
              formatter={(val) => formatAmount(val, language)}
            />
            {/* Lighter, smaller currency label (Regular 400) */}
            <span className={`text-[19px] sm:text-[21px] font-normal tracking-normal ${
              isNegative ? 'text-rose-400/80' : 'text-[#9CA6BC]'
            }`}>
              {currency}
            </span>
          </div>

          {/* Payday info - rendered inline to the right as an elegant metadata badge */}
          <div className="flex items-center gap-1.5 text-[#9CA6BC] text-xs sm:text-[13px] font-normal bg-white/[0.045] px-3 py-1.5 rounded-full border border-white/[0.03] shadow-none cursor-pointer hover:bg-white/[0.07] transition-all select-none self-center shrink-0">
            <Calendar size={13} strokeWidth={1.75} className="text-[#9CA6BC] shrink-0" />
            <span className="whitespace-nowrap font-medium tracking-tight">
              {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day to payday' : 'days to payday') : (effectiveRemainingDays === 1 ? 'dag till nästa lön' : 'dagar till nästa lön')}
            </span>
          </div>
        </div>
      </motion.div>

      {categoryBudgets}

      {children}
    </div>
  );
}
