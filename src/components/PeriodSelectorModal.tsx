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
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 27, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#1C1C1C] rounded-t-[28px] sm:rounded-[28px] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-h-[85dvh] h-auto flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans"
        >
          {/* Mobile Drag Handle */}
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {viewMode === 'calendar' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.light === 'function') feedback.light();
                    setViewMode('list');
                  }}
                  className="w-8 h-8 rounded-full bg-black/5 dark:bg-[#222222] hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
                  title={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
                  aria-label={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
                >
                  <ChevronLeft size={18} strokeWidth={2.2} />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-[#222222] border border-black/5 dark:border-white/[0.06] flex items-center justify-center text-[#1C1917] dark:text-white shrink-0">
                  <CalendarIcon size={16} strokeWidth={1.8} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white tracking-tight truncate">
                  {viewMode === 'calendar' 
                    ? (currentLang === 'en' ? 'Select date' : 'Välj datum')
                    : (currentLang === 'en' ? 'Select period' : 'Välj period')}
                </h3>
                <p className="text-xs text-[#6E6961] dark:text-[#A8A8A8] truncate mt-0.5">
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
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-[#222222] hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
              aria-label="Stäng"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-2.5 sm:p-3.5 overflow-y-auto space-y-2 shrink min-h-0 custom-scrollbar">
            {viewMode === 'list' ? (
              <div className="space-y-1">
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
                      style={isSelected ? {
                        backgroundColor: 'var(--user-accent-soft, rgba(99, 91, 255, 0.15))',
                        borderColor: 'rgba(var(--user-accent-rgb, 99, 91, 255), 0.25)',
                        color: 'var(--accent-color, #635BFF)'
                      } : undefined}
                      className={`w-full flex items-center justify-between py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl transition-all cursor-pointer text-left active:scale-[0.99] min-h-[46px] border ${
                        isSelected
                          ? 'font-semibold'
                          : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/[0.04] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div 
                          style={isSelected ? { backgroundColor: 'var(--accent-color, #635BFF)' } : undefined}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'text-white' : 'bg-black/5 dark:bg-[#222222] text-[var(--text-secondary)]'
                          }`}
                        >
                          <CalendarIcon size={14} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs sm:text-[13px] tracking-tight truncate ${isSelected ? 'font-semibold' : ''}`} style={isSelected ? { color: 'var(--accent-color, #635BFF)' } : undefined}>
                              {title}
                            </span>
                            {p.isCurrent && (
                              <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-[#222222] text-[var(--text-secondary)] border border-black/5 dark:border-white/5 shrink-0">
                                {currentLang === 'en' ? 'Current' : 'Nu'}
                              </span>
                            )}
                          </div>
                          {sub && (
                            <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5 font-normal">
                              {sub}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div 
                          style={{ backgroundColor: 'var(--accent-color, #635BFF)' }}
                          className="w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 ml-2"
                        >
                          <Check size={12} strokeWidth={3} />
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
            <div className="px-4 pt-2 pb-1 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  setViewMode('calendar');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-black/5 dark:bg-[#222222] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border border-black/10 dark:border-white/10 active:scale-[0.99]"
              >
                <CalendarIcon size={14} strokeWidth={2} />
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
