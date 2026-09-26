import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ArrowDownLeft, ArrowUpRight, Camera, Zap, Mic, Square, Loader2, Volume2, Check } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { DejziAvatar } from './DejziSummaryModal';
import { parseQuickExpense } from '../utils/expenseAiParser';
import { feedback } from '../utils/feedback';
import { useVoiceExpense } from '../hooks/useVoiceExpense';

export { DejziAvatar };

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
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onQuickAddExpense?: (amount: number, note?: string, category?: string) => Promise<void> | void;
  onOpenCalculator?: () => void;
  allTransactions?: any[];
  children?: React.ReactNode;
}

export function GreetingModule({
  currency,
  date,
  language,
  stats,
  t,
  calendarDays,
  config,
  onAddExpense,
  onAddIncome,
  onQuickAddExpense,
  allTransactions = [],
  children
}: GreetingModuleProps) {
  const isEn = language === 'en';
  const [quickText, setQuickText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const [successMsg, setSuccessMsg] = useState<{ text: string; transcript?: string } | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleKvittoClick = () => {
    feedback.tap();
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    } else {
      onAddExpense?.();
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddExpense) {
      onAddExpense();
    }
  };

  const {
    isRecording,
    isAudioTranscribing,
    statusText,
    error: voiceError,
    toggleRecording,
    stopRecordingAndProcess
  } = useVoiceExpense({
    isEn,
    onTextUpdate: (text) => setQuickText(text),
    onSuccess: async (result) => {
      if (onQuickAddExpense && result.items && result.items.length > 0) {
        let totalAdded = 0;
        const summaryItems: string[] = [];

        for (const item of result.items) {
          if (item.amount > 0) {
            await onQuickAddExpense(item.amount, item.merchant, item.category);
            totalAdded++;
            summaryItems.push(`${item.merchant} (${item.amount} ${currency})`);
          }
        }

        if (totalAdded > 0) {
          feedback.success();
          setSuccessMsg({
            text: totalAdded === 1
              ? `${isEn ? 'Added' : 'Lade till'} ${summaryItems[0]} ✨`
              : `${isEn ? 'Added' : 'Lade till'} ${totalAdded} ${isEn ? 'expenses' : 'utgifter'}: ${summaryItems.join(', ')} ✨`,
            transcript: result.transcript,
          });
          setQuickText('');
          setTimeout(() => setSuccessMsg(null), 4500);
        }
      }
    }
  });

  const effectiveRemainingDays = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return stats?.remainingDays || 1;
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
    return stats?.remainingDays || 1;
  }, [calendarDays, date, stats?.remainingDays]);

  const handleQuickExpenseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = quickText.trim();
    if (!clean || isSubmittingQuick || !onQuickAddExpense) return;

    setIsSubmittingQuick(true);
    try {
      const defaultCategory = isEn ? 'Uncategorized' : 'Okategoriserat';
      const parsed = await parseQuickExpense(
        clean,
        config?.categories || [],
        allTransactions,
        defaultCategory
      );

      if (parsed.amount && parsed.amount > 0) {
        await onQuickAddExpense(parsed.amount, parsed.merchant, parsed.category);
        feedback.success();
        setSuccessMsg({
          text: `${isEn ? 'Added' : 'Lade till'} ${parsed.amount} ${currency} (${parsed.merchant}) ✨`
        });
        setQuickText('');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (_err) {
      console.error('Quick expense failed', _err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      const res = await stopRecordingAndProcess(quickText);
      if (res && !res.handled && quickText.trim()) {
        handleQuickExpenseSubmit();
      }
    } else {
      toggleRecording(quickText);
    }
  };

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

        {/* Payday info - secondary, calm typographic line (Regular 400) */}
        <div className="flex items-center gap-2 pt-0.5 text-[#9CA6BC] text-xs sm:text-[13px] font-normal">
          <Calendar size={14} strokeWidth={1.75} className="text-[#9CA6BC] shrink-0" />
          <span>
            {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day to payday' : 'days to payday') : (effectiveRemainingDays === 1 ? 'dag till nästa lön' : 'dagar till nästa lön')}
          </span>
        </div>
      </motion.div>

      {/* 2. ACTIONS: 3 Round translucent icon buttons with labels underneath + Snabbutgift */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        {/* The 3 Round Action Buttons evenly distributed */}
        <div className="grid grid-cols-3 justify-items-center py-1">
          {/* Utgift */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddExpense?.();
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 sm:w-[58px] sm:h-[58px] rounded-full bg-white/[0.045] group-hover:bg-white/[0.07] border border-white/[0.035] backdrop-blur-[16px] flex items-center justify-center transition-colors">
              <ArrowDownLeft size={20} strokeWidth={1.75} className="text-[#C7CDDC] group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-[#C7CDDC]/90 group-hover:text-white transition-colors text-center">
              {isEn ? 'Expense' : 'Utgift'}
            </span>
          </button>

          {/* Inkomst */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddIncome?.();
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 sm:w-[58px] sm:h-[58px] rounded-full bg-white/[0.045] group-hover:bg-white/[0.07] border border-white/[0.035] backdrop-blur-[16px] flex items-center justify-center transition-colors">
              <ArrowUpRight size={20} strokeWidth={1.75} className="text-[#C7CDDC] group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-[#C7CDDC]/90 group-hover:text-white transition-colors text-center">
              {isEn ? 'Income' : 'Inkomst'}
            </span>
          </button>

          {/* Kvitto */}
          <button
            type="button"
            onClick={handleKvittoClick}
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 sm:w-[58px] sm:h-[58px] rounded-full bg-white/[0.045] group-hover:bg-white/[0.07] border border-white/[0.035] backdrop-blur-[16px] flex items-center justify-center transition-colors">
              <Camera size={20} strokeWidth={1.75} className="text-[#C7CDDC] group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-[#C7CDDC]/90 group-hover:text-white transition-colors text-center">
              {isEn ? 'Receipt' : 'Kvitto'}
            </span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />
        </div>

        {/* Snabbutgift Input Bar with Microphone Integration */}
        <div className="space-y-2">
          <form onSubmit={handleQuickExpenseSubmit} className="relative flex items-center pt-0.5">
            {/* Microphone Button on the LEFT */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isSubmittingQuick || isAudioTranscribing}
              aria-label={isRecording ? (isEn ? 'Stop listening' : 'Stoppa inspelning') : isEn ? 'Speak expense' : 'Prata in utgift'}
              title={isRecording ? (isEn ? 'Stop listening' : 'Stoppa inspelning') : isEn ? 'Speak expense' : 'Prata in utgift'}
              className={`absolute left-1.5 z-10 w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all cursor-pointer border select-none ${
                isRecording
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-md shadow-rose-500/30 scale-105'
                  : isAudioTranscribing
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 active:scale-95'
              }`}
            >
              {isAudioTranscribing ? (
                <Loader2 size={14} className="animate-spin text-rose-400" />
              ) : isRecording ? (
                <Square size={12} className="fill-current" />
              ) : (
                <Mic size={15} strokeWidth={2} />
              )}
            </button>

            {/* Input Field with Left & Right Padding */}
            <input
              ref={quickInputRef}
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder={
                isRecording
                  ? isEn
                    ? 'Speak now, e.g. "300 kr Coop"...'
                    : 'Prata nu, t.ex. "300 kr Coop"...'
                  : isEn
                    ? 'Quick expense: e.g. 45 Coop...'
                    : 'Snabbutgift: t.ex. 45 ICA...'
              }
              className={`w-full h-11 sm:h-12 pl-12 pr-12 rounded-2xl bg-white/[0.035] hover:bg-white/[0.05] focus:bg-white/[0.065] border backdrop-blur-[18px] text-xs sm:text-sm font-normal text-white placeholder-[#9CA6BC]/70 outline-none transition-all shadow-none ${
                isRecording ? 'border-rose-500/80 ring-2 ring-rose-500/30' : 'border-white/[0.025] focus:border-white/[0.08]'
              }`}
            />

            {/* Submit button on the RIGHT */}
            <button
              type="submit"
              disabled={!quickText.trim() || isSubmittingQuick || isAudioTranscribing || isRecording}
              className="absolute right-1.5 z-10 w-8.5 h-8.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 active:scale-95 text-[#C7CDDC] flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed border border-white/[0.035]"
              title={isEn ? 'Save quick expense' : 'Spara snabbutgift'}
            >
              <Zap size={14} strokeWidth={1.75} className="text-[#C7CDDC]" />
            </button>
          </form>

          {/* Voice Status & Feedback */}
          <AnimatePresence>
            {(statusText || isRecording || isAudioTranscribing) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-300 text-xs font-medium"
              >
                {isRecording ? (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                ) : (
                  <Volume2 size={14} className="shrink-0 animate-pulse text-rose-400" />
                )}
                <span className="truncate flex-1">{statusText}</span>
                {isRecording && (
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className="text-[11px] underline font-bold hover:text-white cursor-pointer ml-auto shrink-0"
                  >
                    {isEn ? 'Done' : 'Klar'}
                  </button>
                )}
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-xs font-semibold"
              >
                <Check size={14} strokeWidth={2.5} className="shrink-0 text-emerald-400" />
                <div className="truncate flex-1">
                  <span>{successMsg.text}</span>
                  {successMsg.transcript && (
                    <p className="text-[11px] opacity-75 italic mt-0.5 truncate">
                      ”{successMsg.transcript}”
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {voiceError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-rose-400 px-1"
              >
                {voiceError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {children}
    </div>
  );
}
