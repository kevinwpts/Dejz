import React, { useMemo } from 'react';
import { motion } from 'motion/react';

import { Sparkles } from 'lucide-react';
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
  children?: React.ReactNode;
}

function DejziAvatar() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/30 via-emerald-400/30 to-cyan-400/30 rounded-full blur-md animate-pulse" />
      <motion.div
        animate={{ y: [0, -3, 0], rotate: [0, 2, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-11 h-11 flex items-center justify-center"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
          <defs>
            <radialGradient id="dejziBody" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#FEF08A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </radialGradient>
            <radialGradient id="dejziCheek" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="38" fill="url(#dejziBody)" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="35" cy="56" r="6" fill="url(#dejziCheek)" />
          <circle cx="65" cy="56" r="6" fill="url(#dejziCheek)" />
          <ellipse cx="40" cy="48" rx="4.5" ry="5.5" fill="#0F172A" />
          <circle cx="38.5" cy="46" r="1.8" fill="#FFFFFF" />
          <ellipse cx="60" cy="48" rx="4.5" ry="5.5" fill="#0F172A" />
          <circle cx="58.5" cy="46" r="1.8" fill="#FFFFFF" />
          <path d="M 45 58 Q 50 63 55 58" fill="none" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <div className="absolute -top-1 -right-1 text-amber-400 drop-shadow">
          <Sparkles size={12} />
        </div>
      </motion.div>
    </div>
  );
}

export function GreetingModule({
  availableForD,
  currency,
  date,
  language,
  stats,
  t,
  calendarDays,
  children
}: GreetingModuleProps) {
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
  void _impact;

  const todayDayData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return null;
    return calendarDays.find((d: any) => d.isToday) || null;
  }, [calendarDays]);

  // Dejzi mascot advice calculation
  const dejziInfo = useMemo(() => {
    if (!stats) return null;

    const spentTodayRound = todayDayData ? Math.round(todayDayData.daySpent || 0) : 0;
    const remainingToday = Math.round(availableForD || 0);
    const remainingDaysTotal = stats.remainingDays || 1;
    const futureDaysLeft = Math.max(0, remainingDaysTotal - 1);

    if (remainingToday < 0) {
      const overAmount = Math.abs(remainingToday);
      
      let detailStr = null;
      if (futureDaysLeft === 0) {
        detailStr = language === 'en'
          ? `Payday tomorrow! Hold tight.`
          : `Lön imorgon! Håll ut.`;
      } else if (futureDaysLeft === 1) {
        const perDayDecrease = Math.round(overAmount / 1);
        detailStr = language === 'en'
          ? `Tomorrow's allowance down by ${formatAmount(perDayDecrease, language)} ${currency}.`
          : `Minskar morgondagen med ${formatAmount(perDayDecrease, language)} ${currency}.`;
      } else {
        const perDayDecrease = Math.round(overAmount / futureDaysLeft);
        detailStr = language === 'en'
          ? `Reduces daily allowance by ${formatAmount(perDayDecrease, language)} ${currency}/day.`
          : `Dra ner med ${formatAmount(perDayDecrease, language)} ${currency}/dag framöver.`;
      }

      return {
        message: language === 'en'
          ? `${formatAmount(overAmount, language)} ${currency} over today's budget.`
          : `${formatAmount(overAmount, language)} ${currency} över dagens budget.`,
        detail: detailStr,
        type: 'warning'
      };
    }

    let msg = '';
    if (spentTodayRound === 0) {
      msg = language === 'en'
        ? `No spending yet! ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Inget spenderat än! ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    } else {
      msg = language === 'en'
        ? `Spent ${formatAmount(spentTodayRound, language)} ${currency} today. ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Spenderat ${formatAmount(spentTodayRound, language)} ${currency} idag. ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    }

    let detail = null;
    if (remainingToday > 0) {
      if (futureDaysLeft === 0) {
        detail = language === 'en'
          ? `Klarar dagen to get +${formatAmount(remainingToday, language)} ${currency} surplus! 🎉`
          : `Klarar du dagen får du +${formatAmount(remainingToday, language)} ${currency} i överskott! 🎉`;
      } else if (futureDaysLeft === 1) {
        const perDayBonus = Math.round(remainingToday / 1);
        detail = language === 'en'
          ? `No more spending means +${formatAmount(perDayBonus, language)} ${currency} tomorrow!`
          : `Spara resten och få +${formatAmount(perDayBonus, language)} ${currency} imorgon!`;
      } else {
        const perDayBonus = Math.round(remainingToday / futureDaysLeft);
        detail = language === 'en'
          ? `No more spending adds +${formatAmount(perDayBonus, language)} ${currency}/day ahead.`
          : `Spara resten och få +${formatAmount(perDayBonus, language)} ${currency}/dag framöver.`;
      }
    }

    return {
      message: msg,
      detail: detail,
      type: 'success'
    };
  }, [stats, todayDayData, availableForD, language, currency]);

  return (
    <div className="space-y-4 sm:space-y-5 font-sans relative">
      {/* 1. Seamless Integrated Grand Hero Area aligned cleanly with other tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pb-2 text-[var(--text-primary)] relative overflow-hidden flex flex-col"
      >
        {/* The Premium Main Rounded Card */}
        <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[32px] p-7 sm:p-8 shadow-xs relative overflow-hidden flex flex-col">
          {/* Clean Stats Row with Totalt kvar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex flex-col text-left justify-center">
              <span className="text-xs font-bold text-[var(--text-secondary)] tracking-wider mb-1.5 block uppercase">
                {t('totalRemaining')}
              </span>
              <div className="flex items-baseline gap-1.5">
                <AnimatedNumber 
                  value={stats?.remainingPeriodCents || 0} 
                  className={`text-[48px] sm:text-[54px] md:text-[60px] leading-none font-black text-[var(--text-primary)] font-amount tabular-nums tracking-tight ${
                    (stats?.remainingPeriodCents || 0) < 0 ? 'text-rose-500' : ''
                  }`}
                  formatter={(val) => formatAmount(val, language)}
                />
                <span className={`text-[22px] sm:text-[24px] font-bold ${
                  (stats?.remainingPeriodCents || 0) < 0 ? 'text-rose-500' : 'text-[var(--text-secondary)]'
                }`}>
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Integrated Category Budgets Carousel as the Bottom Section inside the Card */}
          {children && (
            <div className="w-full pt-4 mt-6 text-left border-t border-[var(--border-color)]/60">
              {children}
            </div>
          )}
        </div>
      </motion.div>

      {/* Dejzi Mascot Card with Premium Animated Avatar */}
      {dejziInfo && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-[22px] border border-[var(--border-color)] p-4 bg-gradient-to-br from-[var(--surface-color)] via-[var(--surface-color)] to-[var(--surface-muted)]/50 shadow-sm relative overflow-hidden flex items-center gap-4"
        >
          <div className="flex flex-col items-center gap-1 shrink-0">
            <DejziAvatar />
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] opacity-90">
              Dejzi
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-snug">
              {dejziInfo.message}
            </p>

            {dejziInfo.detail && (
              <p className="text-xs text-[var(--text-secondary)] opacity-85 mt-0.5 leading-normal">
                {dejziInfo.detail}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
