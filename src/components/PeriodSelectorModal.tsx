import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft } from 'lucide-react';
import { feedback } from '../utils/feedback';
import { BottomSheet } from './ui';

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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      headerLeading={
        viewMode === 'calendar' ? (
          <button
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setViewMode('list');
            }}
            className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
            title={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
            aria-label={currentLang === 'en' ? 'Back to period list' : 'Tillbaka till periodlistan'}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
            <CalendarIcon size={16} strokeWidth={2} />
          </div>
        )
      }
      title={
        viewMode === 'calendar' 
          ? (currentLang === 'en' ? 'Select date' : 'Välj datum')
          : (currentLang === 'en' ? 'Select period' : 'Välj period')
      }
      subtitle={
        viewMode === 'calendar'
          ? (currentLang === 'en' ? 'Pick a day or view full period' : 'Välj en dag eller visa hela perioden')
          : (currentLang === 'en' ? 'Pay periods' : 'Dina löneperioder')
      }
      showCloseButton={true}
      bodyClassName="px-5 py-4 space-y-1.5 custom-scrollbar overflow-y-auto max-h-[70vh]"
      footer={
        showCalendarOption && viewMode === 'list' ? (
          <button
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setViewMode('calendar');
            }}
            className="w-full h-11 px-4 rounded-btn bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[var(--text-primary)] text-body-medium flex items-center justify-center gap-2 transition-all cursor-pointer border-none active:scale-[0.98] shadow-none"
          >
            <CalendarIcon size={16} strokeWidth={2} />
            <span>{currentLang === 'en' ? 'Select day' : 'Välj dag'}</span>
          </button>
        ) : undefined
      }
    >
      {viewMode === 'list' ? (
        <div className="space-y-2 py-1">
          {/* Alla perioder option */}
          {showAllPeriodsOption && (
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onSelectPeriod(null);
                onSelectDate(null);
                onClose();
              }}
              className={`w-full p-3.5 rounded-[var(--radius-card-sm,12px)] border transition-all text-left flex items-center justify-between gap-3 cursor-pointer touch-press ${
                !selectedPeriod && !selectedDate
                  ? 'bg-[var(--text-primary)] text-[var(--surface-color)] border-[var(--text-primary)] shadow-subtle'
                  : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-subtle hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  !selectedPeriod && !selectedDate ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]'
                }`}>
                  <CalendarIcon size={15} strokeWidth={2} />
                </div>
                <div>
                  <div className="text-body font-semibold tracking-tight">
                    {currentLang === 'en' ? 'All periods' : 'Alla perioder'}
                  </div>
                  <div className={`text-secondary ${!selectedPeriod && !selectedDate ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
                    {currentLang === 'en' ? 'Show all transactions' : 'Visa alla transaktioner sammanlagt'}
                  </div>
                </div>
              </div>
            </button>
          )}

          {chronologicalPeriods.map((p, idx) => {
            const endDate = p.end ? new Date(p.end) : null;
            const startDate = p.start ? new Date(p.start) : null;

            const monthName = endDate && !isNaN(endDate.getTime()) 
              ? endDate.toLocaleString(currentLang === 'en' ? 'en-US' : 'sv-SE', { month: 'long' }) 
              : (startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleString(currentLang === 'en' ? 'en-US' : 'sv-SE', { month: 'long' }) : '');
            
            const capitalizedMonth = monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : (p.name || '');

            let title = capitalizedMonth;
            let sub = '';

            if (p.name && p.name.includes('(')) {
              const parts = p.name.split('(');
              const extractedTitle = parts[0].trim();
              if (extractedTitle) title = extractedTitle;
              sub = parts[1]?.replace(')', '').trim() || '';
            } else if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const startStr = startDate.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' });
              const endStr = endDate.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' });
              sub = `${startStr} – ${endStr}`;
            } else if (p.name) {
              title = p.name;
            }

            const isSelected = (selectedPeriod?.periodId ? selectedPeriod.periodId === p.periodId : selectedPeriod?.name === p.name) && !selectedDate;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  onSelectPeriod(p);
                  onSelectDate(null);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-[var(--radius-card-sm,12px)] border transition-all text-left flex items-center justify-between gap-3 cursor-pointer touch-press ${
                  isSelected
                    ? 'bg-[var(--text-primary)] text-[var(--surface-color)] border-[var(--text-primary)] shadow-xs'
                    : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-subtle hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]'
                  }`}>
                    <CalendarIcon size={15} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-semibold tracking-tight truncate">{title}</span>
                      {p.isCurrent && (
                        <span className={`text-micro-label font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-[var(--accent-color)]/15 text-[var(--accent-color)]'
                        }`}>
                          {currentLang === 'en' ? 'Current' : 'Nu'}
                        </span>
                      )}
                    </div>
                    {sub && (
                      <div className={`text-secondary truncate ${isSelected ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
                        {sub}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-white text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <span className="text-micro-label font-bold">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        calendarContent
      )}
    </BottomSheet>
  );
}
