import React, { useState } from 'react';
import { Calendar as CalendarIcon, Check, ChevronLeft } from 'lucide-react';
import { feedback } from '../utils/feedback';
import { Modal } from './ui';

interface PeriodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: any[];
  selectedPeriod: any;
  selectedDate: Date | null;
  onSelectPeriod: (period: any) => void;
  onSelectDate: (date: Date | null) => void;
  showCalendarOption?: boolean;
  showAllPeriodsOption?: boolean;
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
  showAllPeriodsOption = true,
  currentLang,
  calendarContent,
}: PeriodSelectorModalProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  React.useEffect(() => {
    if (isOpen) {
      setViewMode('list');
    }
  }, [isOpen]);

  const chronologicalPeriods = periods 
    ? periods.slice().reverse() 
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-3">
          {viewMode === 'calendar' ? (
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setViewMode('list');
              }}
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
              title={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
              aria-label={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
              <CalendarIcon size={16} strokeWidth={2} />
            </div>
          )}
          <span>
            {viewMode === 'calendar' 
              ? (currentLang === 'en' ? 'Select date' : 'Välj datum')
              : (currentLang === 'en' ? 'Select period' : 'Välj period')}
          </span>
        </div>
      }
      subtitle={
        viewMode === 'calendar'
          ? (currentLang === 'en' ? 'Pick a day or view full period' : 'Välj en dag eller visa hela perioden')
          : (currentLang === 'en' ? 'Pay periods' : 'Dina löneperioder')
      }
      showCloseButton={true}
      bodyClassName="px-5 py-4 space-y-2 custom-scrollbar overflow-y-auto max-h-[70vh]"
      footer={
        showCalendarOption && viewMode === 'list' ? (
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
        ) : undefined
      }
    >
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {/* Alla perioder option */}
          {showAllPeriodsOption && (
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
                  <CalendarIcon size={15} strokeWidth={2} />
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
                  <Check size={18} strokeWidth={2} />
                </div>
              )}
            </button>
          )}

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
                    <CalendarIcon size={15} strokeWidth={2} />
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
                    <Check size={18} strokeWidth={2} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        calendarContent
      )}
    </Modal>
  );
}
