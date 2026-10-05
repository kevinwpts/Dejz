import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, Check, ChevronLeft } from 'lucide-react';
import { feedback } from '../utils/feedback';
import { useScrollLock } from '../hooks/useScrollLock';

interface PeriodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: any[];
  selectedPeriod: any;
  selectedDate: Date | null;
  onSelectPeriod: (period: any) => void;
  onSelectDate: (date: Date | null) => void;
  showCalendarOption?: boolean;
  currentLang: string;
  calendarContent?: React.ReactNode;
}

export function PeriodSelectorModal({
  isOpen,
  onClose,
  periods,
  selectedPeriod,
  selectedDate,
  onSelectPeriod,
  onSelectDate,
  showCalendarOption = false,
  currentLang,
  calendarContent,
}: PeriodSelectorModalProps) {
  useScrollLock(isOpen);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  React.useEffect(() => {
    if (isOpen) {
      setViewMode('list');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const chronologicalPeriods = periods 
    ? periods.filter(p => !p.isFuture || p.isCurrent).slice().reverse() 
    : [];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card - Edge-to-edge on mobile */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 27, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full rounded-t-[28px] sm:rounded-[28px] bg-[var(--bg-color)] border-none shadow-2xl max-h-[85dvh] h-auto flex flex-col z-10 overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,20px))] font-sans p-5 sm:p-6 space-y-4"
        >
          {/* Mobile Drag Handle */}
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {viewMode === 'calendar' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.light === 'function') feedback.light();
                    setViewMode('list');
                  }}
                  className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95 border-none shadow-none"
                  title={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
                  aria-label={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
                >
                  <ChevronLeft size={16} strokeWidth={2.2} />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] shrink-0 border-none shadow-none">
                  <CalendarIcon size={16} strokeWidth={1.8} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-bold font-display tracking-tight text-[var(--text-primary)] leading-tight truncate">
                  {viewMode === 'calendar' 
                    ? (currentLang === 'en' ? 'Select date' : 'Välj datum')
                    : (currentLang === 'en' ? 'Select period' : 'Välj period')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5 font-medium">
                  {viewMode === 'calendar'
                    ? (currentLang === 'en' ? 'Pick a day or view full period' : 'Välj en dag eller visa hela perioden')
                    : (currentLang === 'en' ? 'Pay periods' : 'Dina löneperioder')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95 border-none shadow-none"
              aria-label="Stäng"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto space-y-2 shrink min-h-0 custom-scrollbar pt-1">
            {viewMode === 'list' ? (
              <div className="space-y-2">
                {/* Alla perioder option */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.selection === 'function') {
                      feedback.selection();
                    } else if (typeof feedback?.tap === 'function') {
                      feedback.tap();
                    }
                    onSelectPeriod(null);
                    onSelectDate(null);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between py-3 px-4 rounded-[14px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left active:scale-[0.99] min-h-[52px]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                      className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors ${
                        !selectedPeriod && !selectedDate
                          ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-semibold' 
                          : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
                      }`}
                    >
                      <CalendarIcon size={15} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[13.5px] tracking-tight truncate block ${!selectedPeriod && !selectedDate ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
                        {currentLang === 'en' ? 'All periods' : 'Alla perioder'}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] opacity-80 block truncate mt-0.5">
                        {currentLang === 'en' ? 'Show all transactions' : 'Visa alla transaktioner'}
                      </span>
                    </div>
                  </div>

                  {!selectedPeriod && !selectedDate && (
                    <div className="text-[var(--accent-color)] shrink-0 ml-2 pl-1">
                      <Check size={18} strokeWidth={2.5} />
                    </div>
                  )}
                </button>

                {chronologicalPeriods.map((p, idx) => {
                  const [title, sub] = p.name?.includes('(')
                    ? p.name.split('(').map((s: string) => s.replace(')', '').trim())
                    : [p.name, ''];
                  const isSelected = selectedPeriod?.name === p.name && !selectedDate;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (typeof feedback?.selection === 'function') {
                          feedback.selection();
                        } else if (typeof feedback?.tap === 'function') {
                          feedback.tap();
                        }
                        onSelectPeriod(p);
                        onSelectDate(null);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between py-3 px-4 rounded-[14px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left active:scale-[0.99] min-h-[52px]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-semibold' : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
                          }`}
                        >
                          <CalendarIcon size={15} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13.5px] tracking-tight truncate ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
                              {title}
                            </span>
                            {p.isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] tracking-tight shrink-0">
                                {currentLang === 'en' ? 'Current' : 'Nu'}
                              </span>
                            )}
                          </div>
                          {sub && (
                            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5 font-normal">
                              {sub}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="text-[var(--accent-color)] shrink-0 ml-2 pl-1">
                          <Check size={18} strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              calendarContent
            )}
          </div>

          {/* Footer Toggle Button when in list mode */}
          {showCalendarOption && viewMode === 'list' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  setViewMode('calendar');
                }}
                className="w-full h-12 px-4 rounded-[14px] bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] text-[var(--text-primary)] text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border-none active:scale-[0.98] shadow-none"
              >
                <CalendarIcon size={16} strokeWidth={2} />
                <span>{currentLang === 'en' ? 'Select day' : 'Välj dag'}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
