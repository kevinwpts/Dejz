import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, RotateCcw, Check } from 'lucide-react';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';
import { TranslationKey, Language } from '../i18n';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarDays?: any[];
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  periods?: any[];
  currentPeriodDate?: Date;
  onPeriodChange?: (date: Date) => void;
  periodName?: string;
  isCurrentPeriod?: boolean;
  t: (key: TranslationKey) => string;
  language: Language;
  showFixedInCalendar?: boolean;
}

export function CalendarModal({
  isOpen,
  onClose,
  selectedDate: _selectedDate,
  onSelectDate,
  periods,
  currentPeriodDate,
  onPeriodChange,
  periodName,
  isCurrentPeriod,
  language
}: CalendarModalProps) {
  const isSelectedCurrent = isCurrentPeriod;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-color)] dark:bg-[#232323] border-t sm:border border-[var(--border-color)] dark:border-white/[0.08] w-full max-w-md rounded-t-[22px] rounded-b-none sm:rounded-[22px] p-5 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden text-[var(--text-primary)] dark:text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-color)]/60 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] dark:bg-white/[0.05] border border-[var(--border-color)] dark:border-white/[0.06] flex items-center justify-center text-[#05b862] dark:text-[#05b862]">
                  <CalendarIcon size={16} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)] dark:text-white leading-tight">
                    {language === 'en' ? 'Select period' : 'Välj period'}
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)] dark:text-[#9CA6BC] opacity-80 mt-0.5">
                    {periodName || (language === 'en' ? 'Choose period for analysis' : 'Välj period för analys')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isSelectedCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      onSelectDate(today);
                      if (onPeriodChange) onPeriodChange(today);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--surface-muted)] dark:bg-white/[0.05] text-[11px] font-semibold text-[var(--text-primary)] dark:text-white hover:bg-[var(--border-color)] dark:hover:bg-white/[0.1] border border-[var(--border-color)] dark:border-white/[0.06] transition-all active:scale-95 cursor-pointer"
                  >
                    <RotateCcw size={12} strokeWidth={2} />
                    <span>{language === 'en' ? 'Current' : 'Nuvarande'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] dark:text-[#9CA6BC] hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Stäng"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Stepper with arrows inside modal */}
            {periods && onPeriodChange && currentPeriodDate && (
              <div className="pt-3 pb-1 border-b border-[var(--border-color)]/60 dark:border-white/[0.04]">
                <UniversalPeriodSelector
                  periods={periods}
                  currentDate={currentPeriodDate}
                  onChange={onPeriodChange}
                  periodName={periodName}
                  isCurrentPeriod={isCurrentPeriod}
                  variant="modal"
                  allowFuture={false}
                />
              </div>
            )}

            {/* Quick list of periods/months */}
            {periods && onPeriodChange && (
              <div className="mt-3 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {periods
                  .filter(p => !p.isFuture || p.isCurrent)
                  .slice()
                  .reverse()
                  .map((p, idx) => {
                    const [mPart, dRange] = p.name?.includes('(')
                      ? p.name.split('(').map((s: string) => s.replace(')', '').trim())
                      : [p.name, ''];

                    const isSelected = currentPeriodDate && p.start && p.end &&
                      currentPeriodDate.getTime() >= p.start.getTime() &&
                      currentPeriodDate.getTime() <= p.end.getTime();

                    return (
                      <button
                        key={p.name || idx}
                        type="button"
                        onClick={() => {
                          onPeriodChange(p.date);
                          onSelectDate(p.date);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                          isSelected
                            ? 'bg-[#05b862]/10 dark:bg-[#05b862]/[0.16] border-[#05b862]/30 dark:border-[#05b862]/35 text-[#05b862] dark:text-white'
                            : 'bg-[var(--surface-color)] dark:bg-white/[0.025] hover:bg-[var(--surface-muted)] dark:hover:bg-white/[0.05] border-[var(--border-color)] dark:border-white/[0.04] text-[var(--text-secondary)] dark:text-[#C7CDDC]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected 
                              ? 'bg-[#05b862] text-white font-semibold border-transparent shadow-xs' 
                              : 'bg-black/5 dark:bg-white/[0.04] text-[#6E6961] dark:text-[#9CA6BC]'
                          }`}>
                            <CalendarIcon size={15} strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13.5px] font-semibold text-[#1C1917] dark:text-white tracking-tight truncate">
                                {mPart}
                              </span>
                              {p.isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-[#05b862]/20 dark:text-[#05b862] tracking-tight">
                                  {language === 'en' ? 'Current' : 'Nuvarande'}
                                </span>
                              )}
                            </div>
                            {dRange && (
                              <div className="text-[11px] text-[#6E6961] dark:text-[#9CA6BC] truncate mt-0.5">
                                {dRange}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-[#05b862] flex items-center justify-center text-white dark:text-[#232323] shrink-0 ml-2">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
