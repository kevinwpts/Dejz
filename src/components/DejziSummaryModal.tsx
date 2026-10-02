import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Calendar, Coins, Zap, Wallet, TrendingUp } from 'lucide-react';
import { formatAmount } from '../utils/format';

export function DejziAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-16 h-16',
  }[size];

  const svgSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-14 h-14',
  }[size];

  return (
    <div className={`relative ${sizeClasses} flex items-center justify-center shrink-0`}>
      {size !== 'sm' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-yellow-400/15 to-cyan-400/20 rounded-full blur-xs animate-pulse" />
      )}
      <motion.div
        animate={{ y: [0, -1.5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`relative ${svgSizes} flex items-center justify-center`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs overflow-visible">
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
        {size !== 'sm' && (
          <div className="absolute -top-0.5 -right-0.5 text-amber-400 drop-shadow-xs">
            <Sparkles size={size === 'lg' ? 14 : 9} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface DejziSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  stats: any;
  calendarDays?: any[];
  availableForToday?: number;
  currency?: string;
  language?: string;
}

export function DejziSummaryModal({
  isOpen,
  onClose,
  userName,
  stats,
  calendarDays = [],
  availableForToday = 0,
  currency = 'kr',
  language = 'sv'
}: DejziSummaryModalProps) {
  const isEn = language === 'en';

  const todayDayData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return null;
    return calendarDays.find((d: any) => d.isToday) || null;
  }, [calendarDays]);

  const effectiveRemainingDays = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return stats?.remainingDays || 1;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const index = calendarDays.findIndex((d: any) => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === now.getTime();
    });
    if (index !== -1) {
      return Math.max(1, calendarDays.length - index);
    }
    return stats?.remainingDays || 1;
  }, [calendarDays, stats?.remainingDays]);

  const dejziInfo = useMemo(() => {
    if (!stats) return null;

    const spentTodayRound = todayDayData ? Math.round(todayDayData.daySpent || 0) : 0;
    const remainingToday = Math.round(availableForToday || 0);
    const remainingDaysTotal = effectiveRemainingDays || stats.remainingDays || 1;
    const futureDaysLeft = Math.max(0, remainingDaysTotal - 1);

    if (remainingToday < 0) {
      const overAmount = Math.abs(remainingToday);
      
      let detailStr = null;
      let actionTip = null;
      if (futureDaysLeft === 0) {
        detailStr = isEn
          ? `Payday tomorrow! Hold tight.`
          : `Lön imorgon! Håll ut sista biten.`;
        actionTip = isEn ? 'Final stretch before payday!' : 'Sista spurten innan lön!';
      } else if (futureDaysLeft === 1) {
        const perDayDecrease = Math.round(overAmount / 1);
        detailStr = isEn
          ? `Reduces tomorrow's allowance by ${formatAmount(perDayDecrease, language)} ${currency}.`
          : `Minskar morgondagen med ${formatAmount(perDayDecrease, language)} ${currency}.`;
        actionTip = isEn ? 'Tomorrow adjusts automatically.' : 'Morgondagen anpassas automatiskt.';
      } else {
        const perDayDecrease = Math.round(overAmount / futureDaysLeft);
        detailStr = isEn
          ? `Reduces daily allowance by ${formatAmount(perDayDecrease, language)} ${currency}/day ahead.`
          : `Dras av med ${formatAmount(perDayDecrease, language)} ${currency}/dag framöver.`;
        actionTip = isEn
          ? `Try keeping daily spending under ${formatAmount(Math.max(0, Math.round((stats.remainingPeriodCents || 0) / futureDaysLeft)), language)} ${currency}/day.`
          : `Försök hålla köpen under ${formatAmount(Math.max(0, Math.round((stats.remainingPeriodCents || 0) / futureDaysLeft)), language)} ${currency}/dag.`;
      }

      return {
        pillBadge: isEn ? `${formatAmount(overAmount, language)} ${currency} over` : `${formatAmount(overAmount, language)} ${currency} över`,
        message: isEn
          ? `You have exceeded today's budget by ${formatAmount(overAmount, language)} ${currency}.`
          : `Du har överskridit dagens budget med ${formatAmount(overAmount, language)} ${currency}.`,
        detail: detailStr,
        actionTip,
        type: 'warning',
        spentToday: spentTodayRound,
        remainingToday,
        remainingDays: remainingDaysTotal,
      };
    }

    let pillBadge = '';
    let msg = '';
    if (spentTodayRound === 0) {
      pillBadge = isEn ? 'No spending yet' : 'Inget köpt än';
      msg = isEn
        ? `No spending yet! You have ${formatAmount(remainingToday, language)} ${currency} left for today.`
        : `Inga köp gjorda än idag! Du har ${formatAmount(remainingToday, language)} ${currency} kvar att röra dig med.`;
    } else {
      pillBadge = isEn ? `${formatAmount(remainingToday, language)} ${currency} left today` : `${formatAmount(remainingToday, language)} ${currency} kvar idag`;
      msg = isEn
        ? `You've spent ${formatAmount(spentTodayRound, language)} ${currency} today. You still have ${formatAmount(remainingToday, language)} ${currency} left.`
        : `Du har spenderat ${formatAmount(spentTodayRound, language)} ${currency} idag. Du har ${formatAmount(remainingToday, language)} ${currency} kvar.`;
    }

    let detail = null;
    let actionTip = null;
    if (remainingToday > 0) {
      if (futureDaysLeft === 0) {
        detail = isEn
          ? `Make it through today to secure a +${formatAmount(remainingToday, language)} ${currency} surplus! 🎉`
          : `Klarar du dagen får du ett överskott på +${formatAmount(remainingToday, language)} ${currency}! 🎉`;
        actionTip = isEn ? 'Surplus will be celebrated on payday!' : 'Överskottet firas på lönedagen!';
      } else if (futureDaysLeft === 1) {
        const perDayBonus = Math.round(remainingToday / 1);
        detail = isEn
          ? `Saving the rest rolls over +${formatAmount(perDayBonus, language)} ${currency} directly to tomorrow!`
          : `Sparar du resten flyttas +${formatAmount(perDayBonus, language)} ${currency} direkt till morgondagen!`;
        actionTip = isEn ? 'Keep going to boost tomorrow!' : 'Håll i för att boosta morgondagen!';
      } else {
        const perDayBonus = Math.round(remainingToday / futureDaysLeft);
        detail = isEn
          ? `Saving the rest adds +${formatAmount(perDayBonus, language)} ${currency}/day to all remaining days.`
          : `Sparar du resten fördelas +${formatAmount(perDayBonus, language)} ${currency}/dag ut på alla kommande dagar.`;
        actionTip = isEn
          ? `Every unspent krona strengthens your daily budget ahead!`
          : `Varje osparad krona idag stärker din dagsbudget framöver!`;
      }
    }

    return {
      pillBadge,
      message: msg,
      detail: detail,
      actionTip,
      type: 'success',
      spentToday: spentTodayRound,
      remainingToday,
      remainingDays: remainingDaysTotal,
    };
  }, [stats, todayDayData, availableForToday, effectiveRemainingDays, language, currency, isEn]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#1C1C1C] border border-black/[0.08] dark:border-white/[0.08] rounded-[28px] p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-5 relative overflow-hidden font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DejziAvatar size="lg" />
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    {userName ? `${isEn ? 'Hi' : 'Hej'} ${userName}!` : 'Dejzi'}
                  </h3>
                  <p className="text-xs font-semibold text-amber-500 dark:text-amber-400">
                    {isEn ? 'Your personal budget coach' : 'Din personliga ekonomicoach'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status & Key Takeaway */}
            {dejziInfo && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-1.5">
                <p className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                  {dejziInfo.message}
                </p>
                {dejziInfo.detail && (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {dejziInfo.detail}
                  </p>
                )}
              </div>
            )}

            {/* Status Grid Cards (4 Metrics) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Dagsbudget kvar */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-muted)]/70 border border-[var(--border-color)]/60 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                  <Coins size={13} className="text-amber-500" />
                  <span>{isEn ? "Today's balance" : 'Dagens saldo'}</span>
                </div>
                <span className={`text-base font-extrabold font-amount tabular-nums ${availableForToday < 0 ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                  {formatAmount(Math.round(availableForToday), language)} {currency}
                </span>
              </div>

              {/* Dagar kvar till lön */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-muted)]/70 border border-[var(--border-color)]/60 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                  <Calendar size={13} className="text-neutral-800 dark:text-white" />
                  <span>{isEn ? 'Days to payday' : 'Dagar till lön'}</span>
                </div>
                <span className="text-base font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
                  {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day' : 'days') : (effectiveRemainingDays === 1 ? 'dag' : 'dagar')}
                </span>
              </div>

              {/* Totalt kvar i perioden */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-muted)]/70 border border-[var(--border-color)]/60 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                  <Wallet size={13} className="text-[var(--text-secondary)]" />
                  <span>{isEn ? 'Total left' : 'Totalt kvar'}</span>
                </div>
                <span className={`text-base font-extrabold font-amount tabular-nums ${(stats?.remainingPeriodCents || 0) < 0 ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                  {formatAmount(Math.round(stats?.remainingPeriodCents || 0), language)} {currency}
                </span>
              </div>

              {/* Grundbudget per dag */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-muted)]/70 border border-[var(--border-color)]/60 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                  <TrendingUp size={13} className="text-[var(--text-secondary)]" />
                  <span>{isEn ? 'Daily budget' : 'Budget / dag'}</span>
                </div>
                <span className="text-base font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
                  +{formatAmount(Math.round(stats?.baseDailyBudgetCents || 0), language)} {currency}
                </span>
              </div>
            </div>

            {/* Dejzi Proactive Tip */}
            {dejziInfo?.actionTip && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-[#222222] text-[#1C1917] dark:text-white text-xs font-medium border border-black/10 dark:border-white/10">
                <Zap size={14} className="shrink-0 text-[#1C1917] dark:text-white mt-0.5" />
                <span>{dejziInfo.actionTip}</span>
              </div>
            )}

            {/* Close / Action Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-accent text-[var(--text-on-accent)] font-bold text-sm shadow-xs hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              {isEn ? 'Got it, thanks!' : 'Tack Dejzi, jag har koll!'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
