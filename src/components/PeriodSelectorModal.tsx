import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { feedback } from '../utils/feedback';
import { BottomSheet, Card, ListRow, Button } from './ui';

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
        ) : undefined
      }
      title={
        viewMode === 'calendar' 
          ? (currentLang === 'en' ? 'Select date (Calendar month)' : 'Välj datum (Kalendermånad)')
          : (currentLang === 'en' ? 'Select pay period' : 'Välj löneperiod')
      }
      subtitle={
        viewMode === 'calendar'
          ? (currentLang === 'en' ? 'Pick a specific day in the calendar month' : 'Välj en specifik dag i kalendermånaden')
          : (currentLang === 'en' ? 'Shows transactions within the selected pay period' : 'Visar transaktioner inom vald löneperiod')
      }
      showCloseButton={true}
      bodyClassName="px-4 sm:px-5 py-4 custom-scrollbar overflow-y-auto max-h-[70vh]"
      footer={
        showCalendarOption && viewMode === 'list' ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setViewMode('calendar');
            }}
          >
            {currentLang === 'en' ? 'Select specific date in calendar' : 'Välj specifikt datum i kalender'}
          </Button>
        ) : undefined
      }
    >
      {viewMode === 'list' ? (
        <Card variant="default" padding="none" className="divide-y divide-menu overflow-hidden">
          {/* Alla perioder option */}
          {showAllPeriodsOption && (
            <ListRow
              variant="grouped"
              title={currentLang === 'en' ? 'All periods' : 'Alla perioder'}
              subtitle={currentLang === 'en' ? 'Show all transactions across periods' : 'Visa alla transaktioner sammanlagt'}
              showCheck={!selectedPeriod && !selectedDate}
              onClick={() => {
                if (typeof feedback?.selection === 'function') feedback.selection();
                else if (typeof feedback?.light === 'function') feedback.light();
                onSelectPeriod(null);
                onSelectDate(null);
                onClose();
              }}
            />
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

            if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const startStr = startDate.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' }).replace('.', '');
              const endStr = endDate.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' }).replace('.', '');
              sub = `${currentLang === 'en' ? 'Pay period' : 'Löneperiod'} ${startStr}–${endStr}`;
              if (p.name && p.name.includes('(')) {
                const extractedTitle = p.name.split('(')[0].trim();
                if (extractedTitle) title = extractedTitle;
              }
            } else if (p.name && p.name.includes('(')) {
              const parts = p.name.split('(');
              const extractedTitle = parts[0].trim();
              if (extractedTitle) title = extractedTitle;
              sub = parts[1]?.replace(')', '').trim() || '';
            } else if (p.name) {
              title = p.name;
            }

            const isSelected = (selectedPeriod?.periodId ? selectedPeriod.periodId === p.periodId : selectedPeriod?.name === p.name) && !selectedDate;

            return (
              <ListRow
                key={p.periodId || p.name || idx}
                variant="grouped"
                isLast={idx === chronologicalPeriods.length - 1}
                title={title}
                subtitle={sub || undefined}
                showCheck={isSelected}
                onClick={() => {
                  if (typeof feedback?.selection === 'function') feedback.selection();
                  else if (typeof feedback?.light === 'function') feedback.light();
                  onSelectPeriod(p);
                  onSelectDate(null);
                  onClose();
                }}
              />
            );
          })}
        </Card>
      ) : (
        calendarContent
      )}
    </BottomSheet>
  );
}

