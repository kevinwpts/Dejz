import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft } from 'lucide-react';
import { feedback } from '../utils/feedback';
import { BottomSheet, BottomSheetOption } from './ui';

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
            className="w-full h-11 px-4 rounded-[14px] bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[var(--text-primary)] text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer border-none active:scale-[0.98] shadow-none"
          >
            <CalendarIcon size={16} strokeWidth={2} />
            <span>{currentLang === 'en' ? 'Select day' : 'Välj dag'}</span>
          </button>
        ) : undefined
      }
    >
      {viewMode === 'list' ? (
        <div className="space-y-1">
          {/* Alla perioder option */}
          {showAllPeriodsOption && (
            <BottomSheetOption
              label={currentLang === 'en' ? 'All periods' : 'Alla perioder'}
              subtitle={currentLang === 'en' ? 'Show all transactions' : 'Visa alla transaktioner'}
              icon={<CalendarIcon size={15} strokeWidth={2} />}
              isSelected={!selectedPeriod && !selectedDate}
              onClick={() => {
                onSelectPeriod(null);
                onSelectDate(null);
                onClose();
              }}
            />
          )}

          {chronologicalPeriods.map((p, idx) => {
            const [title, sub] = p.name?.includes('(')
              ? p.name.split('(').map((s: string) => s.replace(')', '').trim())
              : [p.name, ''];
            const isSelected = selectedPeriod?.name === p.name && !selectedDate;

            return (
              <BottomSheetOption
                key={idx}
                label={title}
                subtitle={sub || undefined}
                badge={
                  p.isCurrent ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] tracking-tight">
                      {currentLang === 'en' ? 'Current' : 'Nu'}
                    </span>
                  ) : undefined
                }
                icon={<CalendarIcon size={15} strokeWidth={2} />}
                isSelected={isSelected}
                onClick={() => {
                  onSelectPeriod(p);
                  onSelectDate(null);
                  onClose();
                }}
              />
            );
          })}
        </div>
      ) : (
        calendarContent
      )}
    </BottomSheet>
  );
}
