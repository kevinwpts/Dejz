import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { CalendarWidget } from './CalendarWidget';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';
import { TranslationKey, Language } from '../i18n';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarDays: any[];
  selectedDate: Date;
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
  calendarDays,
  selectedDate,
  onSelectDate,
  periods,
  currentPeriodDate,
  onPeriodChange,
  periodName,
  isCurrentPeriod,
  t,
  language,
  showFixedInCalendar
}: CalendarModalProps) {
  const isSelectedToday = selectedDate && new Date(selectedDate).toDateString() === new Date().toDateString();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[var(--surface-color)] border-t sm:border border-[var(--border-color)] w-full max-w-md rounded-t-[28px] rounded-b-none sm:rounded-[24px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)] shadow-xs">
                  <CalendarIcon size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                    {t('calendar' as any) || 'Kalender'}
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)] opacity-60">
                    {selectedDate ? selectedDate.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isSelectedToday && (
                  <button
                    onClick={() => {
                      const today = new Date();
                      onSelectDate(today);
                      if (onPeriodChange) onPeriodChange(today);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border-color)]/20 transition-all active:scale-95"
                  >
                    <RotateCcw size={12} strokeWidth={2} />
                    <span>Idag</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] transition-colors"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Period Selector inside modal if periods exist */}
            {periods && onPeriodChange && currentPeriodDate && (
              <div className="mb-4">
                <UniversalPeriodSelector
                  periods={periods}
                  currentDate={currentPeriodDate}
                  onChange={onPeriodChange}
                  periodName={periodName}
                  isCurrentPeriod={isCurrentPeriod}
                />
              </div>
            )}

            {/* Calendar Grid */}
            <div className="bg-[var(--surface-color)] p-2 rounded-2xl border border-[var(--border-color)]/50 shadow-inner">
              <CalendarWidget
                calendarDays={calendarDays}
                normalizedSelectedDate={selectedDate}
                setSelectedDate={(date) => {
                  onSelectDate(date);
                  onClose();
                }}
                t={t}
                currentLang={language}
                showFixedInCalendar={showFixedInCalendar}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
