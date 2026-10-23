import React from 'react';
import { RotateCcw } from 'lucide-react';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';
import { TranslationKey, Language } from '../i18n';
import { BottomSheet, Card, ListRow } from './ui';

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
  t: _t,
  language,
}: CalendarModalProps) {
  const isSelectedCurrent = isCurrentPeriod;
  const filteredPeriods = periods
    ? periods.filter(p => !p.isFuture || p.isCurrent).slice().reverse()
    : [];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'en' ? 'Select period' : 'Välj period'}
      subtitle={periodName || (language === 'en' ? 'Choose period for analysis' : 'Välj period för analys')}
      headerRight={
        !isSelectedCurrent ? (
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              onSelectDate(today);
              if (onPeriodChange) onPeriodChange(today);
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-button-sm,10px)] bg-[var(--surface-color)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-label font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer border border-subtle shadow-none"
          >
            <RotateCcw size={12} strokeWidth={2.2} />
            <span>{language === 'en' ? 'Current' : 'Nuvarande'}</span>
          </button>
        ) : undefined
      }
      size="sm"
    >
      {/* Stepper with arrows inside modal */}
      {periods && onPeriodChange && currentPeriodDate && (
        <div className="pb-1 border-none">
          <UniversalPeriodSelector
            periods={periods}
            currentDate={currentPeriodDate}
            onChange={(newDate) => {
              onPeriodChange(newDate);
              const matchedPeriod = periods.find(
                (p: any) =>
                  p.start &&
                  p.end &&
                  newDate.getTime() >= new Date(p.start).getTime() &&
                  newDate.getTime() <= new Date(p.end).getTime()
              );
              if (matchedPeriod?.isCurrent) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                onSelectDate(today);
              } else if (matchedPeriod?.start) {
                const startD = new Date(matchedPeriod.start);
                startD.setHours(0, 0, 0, 0);
                onSelectDate(startD);
              } else {
                onSelectDate(newDate);
              }
            }}
            periodName={periodName}
            isCurrentPeriod={isCurrentPeriod}
            variant="modal"
            allowFuture={false}
          />
        </div>
      )}

      {/* Quick list of periods/months */}
      {filteredPeriods.length > 0 && onPeriodChange && (
        <Card variant="default" padding="none" className="divide-y divide-menu overflow-hidden mt-1">
          {filteredPeriods.map((p, idx) => {
            const [mPart, dRange] = p.name?.includes('(')
              ? p.name.split('(').map((s: string) => s.replace(')', '').trim())
              : [p.name, ''];

            const isSelected = Boolean(
              currentPeriodDate && p.start && p.end &&
              currentPeriodDate.getTime() >= p.start.getTime() &&
              currentPeriodDate.getTime() <= p.end.getTime()
            );

            return (
              <ListRow
                key={p.name || idx}
                variant="grouped"
                isLast={idx === filteredPeriods.length - 1}
                title={mPart}
                subtitle={dRange || undefined}
                showCheck={isSelected}
                onClick={() => {
                  if (p.isCurrent) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    onPeriodChange(today);
                    onSelectDate(today);
                  } else {
                    const target = p.start ? new Date(p.start) : new Date(p.date);
                    target.setHours(0, 0, 0, 0);
                    onPeriodChange(target);
                    onSelectDate(target);
                  }
                  onClose();
                }}
              />
            );
          })}
        </Card>
      )}
    </BottomSheet>
  );
}

