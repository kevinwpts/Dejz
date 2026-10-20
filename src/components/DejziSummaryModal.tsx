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
  currency = 'kr',
  language = 'sv'
}: DejziSummaryModalProps) {
  const isEn = language === 'en';

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

    const spentInPeriod = Math.round(stats.totalSpentInPeriod || 0);
    const remainingPeriod = Math.round(stats.remainingPeriodCents || 0);
    const remainingDaysTotal = effectiveRemainingDays || stats.remainingDays || 1;

    if (remainingPeriod < 0) {
      const overAmount = Math.abs(remainingPeriod);
      const detailStr = isEn
        ? `${remainingDaysTotal} ${remainingDaysTotal === 1 ? 'day' : 'days'} left until your next payday.`
        : `${remainingDaysTotal} ${remainingDaysTotal === 1 ? 'dag' : 'dagar'} kvar till nästa lön.`;
      const actionTip = isEn
        ? 'You can cover the deficit by adjusting category budgets or borrowing from your piggy bank.'
        : 'Du kan täcka underskottet genom att se över dina utgifter eller låna från spargrisen.';

      return {
        message: isEn
          ? `You have exceeded your period budget by ${formatAmount(overAmount, language)} ${currency}.`
          : `Du har överskridit ditt utrymme för perioden med ${formatAmount(overAmount, language)} ${currency}.`,
        detail: detailStr,
        actionTip,
        type: 'warning',
      };
    }

    const msg =
      spentInPeriod === 0
        ? isEn
          ? `No purchases logged yet this period! You have ${formatAmount(remainingPeriod, language)} ${currency} available until payday.`
          : `Inga köp loggade i perioden än! Du har ${formatAmount(remainingPeriod, language)} ${currency} kvar att röra dig med fram till lön.`
        : isEn
          ? `You have ${formatAmount(remainingPeriod, language)} ${currency} left to spend across the remaining ${remainingDaysTotal} ${remainingDaysTotal === 1 ? 'day' : 'days'} until payday.`
          : `Du har ${formatAmount(remainingPeriod, language)} ${currency} kvar att röra dig med under periodens sista ${remainingDaysTotal} ${remainingDaysTotal === 1 ? 'dag' : 'dagar'}.`;

    const detail = isEn
      ? `So far this period you have logged ${formatAmount(spentInPeriod, language)} ${currency} in variable purchases.`
      : `Hittills under löneperioden har du registrerat köp för ${formatAmount(spentInPeriod, language)} ${currency}.`;

    const actionTip = isEn
      ? 'Anything left unspent when payday arrives can be saved straight into your piggy bank!'
      : 'Allt som finns kvar när nästa lön kommer kan du spara direkt i spargrisen!';

    return {
      message: msg,
      detail,
      actionTip,
      type: 'success',
    };
  }, [stats, effectiveRemainingDays, language, currency, isEn]);

  const remainingPeriodVal = Math.round(stats?.remainingPeriodCents || 0);
  const spentInPeriodVal = Math.round(stats?.totalSpentInPeriod || 0);
  const fixedAndSavingsVal = Math.round((stats?.totalFixed || 0) + (stats?.totalSavings || 0));

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
              {isEn ? 'Payday period overview' : 'Översikt av din löneperiod'}
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
        {/* Kvar att spendera */}
        <Card variant="default" padding="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-label text-[var(--text-secondary)] font-medium">
            <Wallet size={13} className="text-[var(--accent-color)]" />
            <span>{isEn ? 'Left to spend' : 'Kvar till lön'}</span>
          </div>
          <span className={`text-list-amount font-extrabold font-amount tabular-nums ${remainingPeriodVal < 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'}`}>
            {formatAmount(remainingPeriodVal, language)} {currency}
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

        {/* Spenderat i perioden */}
        <Card variant="default" padding="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-label text-[var(--text-secondary)] font-medium">
            <Coins size={13} className="text-[var(--text-secondary)]" />
            <span>{isEn ? 'Spent in period' : 'Spenderat'}</span>
          </div>
          <span className="text-list-amount font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
            {formatAmount(spentInPeriodVal, language)} {currency}
          </span>
        </Card>

        {/* Fasta utgifter & sparande */}
        <Card variant="default" padding="sm" className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-label text-[var(--text-secondary)] font-medium">
            <TrendingUp size={13} className="text-[var(--text-secondary)]" />
            <span>{isEn ? 'Fixed & savings' : 'Fasta & spar'}</span>
          </div>
          <span className="text-list-amount font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
            {formatAmount(fixedAndSavingsVal, language)} {currency}
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
