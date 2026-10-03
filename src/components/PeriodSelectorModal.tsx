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
          className="relative w-full rounded-t-[32px] bg-[#EFECE6] dark:bg-[#1C1C1C] border-none shadow-2xl max-h-[85dvh] h-auto flex flex-col z-10 overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,20px))] font-sans p-6 space-y-4"
        >
          {/* Mobile Drag Handle */}
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between pb-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {viewMode === 'calendar' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.light === 'function') feedback.light();
                    setViewMode('list');
                  }}
                  className="w-9 h-9 rounded-full bg-white dark:bg-[#222222] border-none hover:bg-[#F9F8F6] dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95 shadow-none"
                  title={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
                  aria-label={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
                >
                  <ChevronLeft size={18} strokeWidth={2.2} />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#222222] border-none flex items-center justify-center text-[#1C1917] dark:text-white shrink-0 shadow-none">
                  <CalendarIcon size={17} strokeWidth={1.8} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#211F1C] dark:text-white tracking-tight truncate">
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
              className="w-9 h-9 rounded-full bg-white dark:bg-[#222222] border-none hover:bg-[#F9F8F6] dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95 shadow-none"
              aria-label="Stäng"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto space-y-2 shrink min-h-0 custom-scrollbar pt-1">
            {viewMode === 'list' ? (
              <div className="space-y-2">
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
                        backgroundColor: 'var(--user-accent-soft, rgba(59, 130, 246, 0.15))',
                        color: 'var(--accent-color, #3B82F6)'
                      } : undefined}
                      className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl transition-all cursor-pointer text-left active:scale-[0.99] min-h-[52px] border-none shadow-none ${
                        isSelected
                          ? 'font-semibold'
                          : 'bg-white dark:bg-[#222222] hover:bg-[#F9F8F6] dark:hover:bg-white/[0.08] text-[#211F1C] dark:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          style={isSelected ? { backgroundColor: 'var(--accent-color, #3B82F6)' } : undefined}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'text-white' : 'bg-black/5 dark:bg-[#1C1C1C] text-[#6E6961] dark:text-[#A8A8A8]'
                          }`}
                        >
                          <CalendarIcon size={15} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm tracking-tight truncate ${isSelected ? 'font-semibold' : ''}`} style={isSelected ? { color: 'var(--accent-color, #3B82F6)' } : undefined}>
                              {title}
                            </span>
                            {p.isCurrent && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFECE6] dark:bg-[#1C1C1C] text-[#211F1C] dark:text-white border-none shrink-0">
                                {currentLang === 'en' ? 'Current' : 'Nu'}
                              </span>
                            )}
                          </div>
                          {sub && (
                            <p className="text-xs text-[#6E6961] dark:text-[#A8A8A8] truncate mt-0.5 font-normal">
                              {sub}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div 
                          style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
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
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  setViewMode('calendar');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-[#222222] hover:bg-[#F9F8F6] dark:hover:bg-white/10 text-[#211F1C] dark:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border-none active:scale-[0.99] shadow-none"
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
