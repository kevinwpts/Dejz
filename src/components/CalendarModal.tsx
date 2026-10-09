import React from 'react';
import { Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';
import { TranslationKey, Language } from '../i18n';
import { BottomSheet, BottomSheetOption } from './ui';

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

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'en' ? 'Select period' : 'Välj period'}
      subtitle={periodName || (language === 'en' ? 'Choose period for analysis' : 'Välj period för analys')}
      headerLeading={
        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
          <CalendarIcon size={16} strokeWidth={2} />
        </div>
      }
      headerRight={
        !isSelectedCurrent ? (
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              onSelectDate(today);
              if (onPeriodChange) onPeriodChange(today);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button-sm,10px)] bg-black/5 dark:bg-white/5 text-label font-semibold text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors active:scale-95 cursor-pointer border-none shadow-none"
          >
            <RotateCcw size={12} strokeWidth={2.5} />
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
        <div className="mt-1 space-y-1">
          {periods
            .filter(p => !p.isFuture || p.isCurrent)
            .slice()
            .reverse()
            .map((p, idx) => {
              const [mPart, dRange] = p.name?.includes('(')
                ? p.name.split('(').map((s: string) => s.replace(')', '').trim())
                : [p.name, ''];

              const isSelected = Boolean(
                currentPeriodDate && p.start && p.end &&
                currentPeriodDate.getTime() >= p.start.getTime() &&
                currentPeriodDate.getTime() <= p.end.getTime()
              );

              return (
                <BottomSheetOption
                  key={p.name || idx}
                  label={mPart}
                  subtitle={dRange}
                  badge={p.isCurrent ? (language === 'en' ? 'Current' : 'Nuvarande') : undefined}
                  icon={<CalendarIcon size={16} strokeWidth={2} />}
                  isSelected={isSelected}
                  onClick={() => {
                    onPeriodChange(p.date);
                    onSelectDate(p.date);
                    onClose();
                  }}
                />
              );
            })}
        </div>
      )}
    </BottomSheet>
  );
}
