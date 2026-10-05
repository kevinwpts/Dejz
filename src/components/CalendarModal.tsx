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
            className="bg-[var(--bg-color)] border-none w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden text-[var(--text-primary)] font-sans"
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] border-none shadow-none">
                  <CalendarIcon size={16} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display tracking-tight text-[var(--text-primary)] leading-tight">
                    {language === 'en' ? 'Select period' : 'Välj period'}
                  </h3>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[var(--surface-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.05] border-none shadow-none transition-all active:scale-95 cursor-pointer"
                  >
                    <RotateCcw size={12} strokeWidth={2.5} />
                    <span>{language === 'en' ? 'Current' : 'Nuvarande'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors cursor-pointer border-none shadow-none"
                  aria-label="Stäng"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Stepper with arrows inside modal */}
            {periods && onPeriodChange && currentPeriodDate && (
              <div className="pt-3 pb-1 border-none">
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
                        className={`w-full flex items-center justify-between p-3 rounded-[14px] transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-blue-500/10 dark:bg-blue-500/15 text-[var(--text-primary)] font-semibold'
                            : 'bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] text-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 ${
                            isSelected 
                              ? 'bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold shadow-xs' 
                              : 'bg-black/5 dark:bg-white/[0.04] text-[var(--text-secondary)]'
                          }`}>
                            <CalendarIcon size={15} strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13.5px] font-semibold text-[var(--text-primary)] tracking-tight truncate">
                                {mPart}
                              </span>
                              {p.isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] tracking-tight">
                                  {language === 'en' ? 'Current' : 'Nuvarande'}
                                </span>
                              )}
                            </div>
                            {dRange && (
                              <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                                {dRange}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                            <Check size={12} strokeWidth={2.5} />
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
