import React, { useMemo } from 'react';
import { X, Calendar, Coins, Zap, Wallet, TrendingUp } from 'lucide-react';
import { formatAmount } from '../utils/format';
import { Button, Card, IconButton, Modal } from './ui';

export function DejziAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-14 h-14',
  }[size];

  return (
    <div className={`relative ${sizeClasses} flex items-center justify-center shrink-0 select-none`}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* Tilted Signature Backing Card */}
        <g transform="translate(50, 50) rotate(-7) translate(-50, -50)">
          <rect
            x="16"
            y="14"
            width="68"
            height="72"
            rx="18"
            fill="var(--brand-signature, #78BAFF)"
            opacity="0.34"
          />
        </g>

        {/* Foreground Architectural Surface Card */}
        <rect
          x="16"
          y="15"
          width="68"
          height="72"
          rx="18"
          fill="var(--surface-color, #FFFFFF)"
          stroke="var(--border-divider, rgba(15, 20, 28, 0.08))"
          strokeWidth="2"
        />

        {/* Accent Core Emblem */}
        <circle
          cx="50"
          cy="44"
          r="15"
          fill="var(--accent-color, #0F141C)"
        />
        <path
          d="M 44.5 44.2 L 48.2 48 L 56 40.2"
          stroke="var(--on-accent, #FFFFFF)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Minimalist Summary Bar */}
        <rect
          x="33"
          y="69"
          width="34"
          height="5"
          rx="2.5"
          fill="var(--text-primary, #0F141C)"
          opacity="0.82"
        />
      </svg>
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
          ? `Make it through today to secure a +${formatAmount(remainingToday, language)} ${currency} surplus!`
          : `Klarar du dagen får du ett överskott på +${formatAmount(remainingToday, language)} ${currency}!`;
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
          ? `Every saved coin strengthens your daily budget ahead!`
          : `Varje sparad krona idag stärker din dagsbudget framöver!`;
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      center
      size="sm"
      showCloseButton={false}
      bodyClassName="p-6 sm:p-7 space-y-5"
    >
      {/* Modal Header with Close Button */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-divider)]">
        <div className="flex items-center gap-3">
          <DejziAvatar size="lg" />
          <div>
            <h3 className="text-section-title font-display tracking-tight text-[var(--text-primary)]">
              {userName ? `${isEn ? 'Hi' : 'Hej'} ${userName}!` : 'Dejz'}
            </h3>
            <p className="text-secondary font-semibold text-[var(--text-secondary)] mt-0.5">
              {isEn ? 'Daily budget overview' : 'Översikt av din dagsbudget'}
            </p>
          </div>
        </div>

        <IconButton
          variant="surface"
          size="md"
          shape="circle"
          onClick={onClose}
          aria-label={isEn ? 'Close' : 'Stäng'}
          icon={<X size={16} strokeWidth={2} />}
        />
      </div>

      {/* Status & Key Takeaway */}
      {dejziInfo && (
        <Card variant="default" padding="md" className="space-y-1.5">
          <p className="text-body-medium font-bold text-[var(--text-primary)] leading-snug">
            {dejziInfo.message}
          </p>
          {dejziInfo.detail && (
            <p className="text-secondary text-[var(--text-secondary)] leading-relaxed font-medium">
              {dejziInfo.detail}
            </p>
          )}
        </Card>
      )}

      {/* Status Grid Cards (4 Metrics) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Dagsbudget kvar */}
        <Card variant="default" padding="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-label text-[var(--text-secondary)] font-medium">
            <Coins size={13} className="text-[var(--accent-color)]" />
            <span>{isEn ? "Today's balance" : 'Dagens saldo'}</span>
          </div>
          <span className={`text-list-amount font-extrabold font-amount tabular-nums ${availableForToday < 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'}`}>
            {formatAmount(Math.round(availableForToday), language)} {currency}
          </span>
        </Card>

        {/* Dagar kvar till lön */}
        <Card variant="default" padding="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-label text-[var(--text-secondary)] font-medium">
            <Calendar size={13} className="text-[var(--text-primary)]" />
            <span>{isEn ? 'Days to payday' : 'Dagar till lön'}</span>
          </div>
          <span className="text-list-amount font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
            {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day' : 'days') : (effectiveRemainingDays === 1 ? 'dag' : 'dagar')}
          </span>
        </Card>

        {/* Totalt kvar i perioden */}
        <Card variant="default" padding="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-label text-[var(--text-secondary)] font-medium">
            <Wallet size={13} className="text-[var(--text-secondary)]" />
            <span>{isEn ? 'Total left' : 'Totalt kvar'}</span>
          </div>
          <span className={`text-list-amount font-extrabold font-amount tabular-nums ${(stats?.remainingPeriodCents || 0) < 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'}`}>
            {formatAmount(Math.round(stats?.remainingPeriodCents || 0), language)} {currency}
          </span>
        </Card>

        {/* Grundbudget per dag */}
        <Card variant="default" padding="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-label text-[var(--text-secondary)] font-medium">
            <TrendingUp size={13} className="text-[var(--text-secondary)]" />
            <span>{isEn ? 'Daily budget' : 'Budget / dag'}</span>
          </div>
          <span className="text-list-amount font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
            +{formatAmount(Math.round(stats?.baseDailyBudgetCents || 0), language)} {currency}
          </span>
        </Card>
      </div>

      {/* Proactive Tip */}
      {dejziInfo?.actionTip && (
        <Card variant="default" padding="sm" className="flex items-start gap-2.5 text-secondary font-medium text-[var(--text-primary)]">
          <Zap size={14} className="shrink-0 text-[var(--accent-color)] mt-0.5" />
          <span>{dejziInfo.actionTip}</span>
        </Card>
      )}

      {/* Close / Action Button */}
      <Button
        variant="accent"
        size="lg"
        fullWidth
        onClick={onClose}
      >
        {isEn ? 'Got it, thanks!' : 'Jag har koll'}
      </Button>
    </Modal>
  );
}
