import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { DejziAvatar } from './DejziSummaryModal';

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
  onOpenDejzi?: () => void;
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
  onOpenDejzi,
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
      {/* SUMMARY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-white dark:bg-[#242424] rounded-[20px] p-[16px] sm:p-[20px] border border-[#E5E2DC] dark:border-[#383838] shadow-none mb-[16px] select-none"
      >
        {/* UPPER PART */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Label: Kvar att spendera */}
            <span className="text-[14px] sm:text-[15px] font-normal text-[#716E68] dark:text-[#A8A8A8] block leading-snug">
              {t('totalRemaining')}
            </span>

            {/* Amount */}
            <div className="flex items-baseline gap-1.5 mt-[6px]">
              <AnimatedNumber
                value={stats?.remainingPeriodCents || 0}
                className={`text-[36px] sm:text-[40px] font-semibold leading-none font-amount tabular-nums tracking-tight ${
                  isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-[#242321] dark:text-white'
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span className={`text-[18px] sm:text-[20px] font-normal leading-none ${
                isNegative ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-[#716E68] dark:text-[#A8A8A8]'
              }`}>
                {currency || 'kr'}
              </span>
            </div>
          </div>

          {/* Top Right: AI Mascot Button (Requirement 3: replacing wallet icon) */}
          {onOpenDejzi && (
            <button
              type="button"
              onClick={onOpenDejzi}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#F0EEEA] dark:bg-[#2D2D2D] border border-[#E5E2DC] dark:border-[#383838] flex items-center justify-center shrink-0 hover:bg-[#EAE6DE] dark:hover:bg-[#383838] active:scale-95 transition-all cursor-pointer shadow-none"
              aria-label={isEn ? "Visa AI-överblick" : "Visa AI-överblick"}
              title={isEn ? "Visa AI-överblick" : "Visa AI-överblick"}
            >
              <DejziAvatar size="sm" />
            </button>
          )}
        </div>

        {/* THIN HORIZONTAL DIVIDER */}
        <div className="mt-[14px] border-t border-[#E5E2DC] dark:border-[#383838]" />

        {/* LOWER PART: Info row */}
        <div className="pt-[12px] grid grid-cols-2 divide-x divide-[#E5E2DC] dark:divide-[#383838]">
          {/* Left Column: Period */}
          <div className="flex items-center gap-[8px] sm:gap-[10px] pr-2 min-w-0">
            <div className="w-[32px] h-[32px] rounded-full bg-[#F0EEEA] dark:bg-[#2D2D2D] flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-[#716E68] dark:text-[#A8A8A8]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-[2px] min-w-0">
              <span className="text-[10px] font-normal text-[#716E68] dark:text-[#A8A8A8] uppercase tracking-wider leading-none">
                PERIOD
              </span>
              <span className="text-[13px] sm:text-[14px] font-medium text-[#242321] dark:text-white truncate leading-tight">
                {periodIntervalText}
              </span>
            </div>
          </div>

          {/* Right Column: Till Lön */}
          <div className="flex items-center gap-[8px] sm:gap-[10px] pl-3 sm:pl-4 min-w-0">
            <div className="w-[32px] h-[32px] rounded-full bg-[#F0EEEA] dark:bg-[#2D2D2D] flex items-center justify-center shrink-0">
              <Clock size={16} className="text-[#716E68] dark:text-[#A8A8A8]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-[2px] min-w-0">
              <span className="text-[10px] font-normal text-[#716E68] dark:text-[#A8A8A8] uppercase tracking-wider leading-none">
                {isEn ? 'PAYDAY' : 'TILL LÖN'}
              </span>
              <span className="text-[13px] sm:text-[14px] font-medium text-[#242321] dark:text-white truncate leading-tight">
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

