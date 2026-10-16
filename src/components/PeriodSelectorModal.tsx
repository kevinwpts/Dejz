import React, { useState } from 'react';
import { Calendar as CalendarIcon, Check, Layers } from 'lucide-react';
import { feedback } from '../utils/feedback';
import { BottomSheet, Card } from './ui';

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
      setViewMode(selectedDate && showCalendarOption ? 'calendar' : 'list');
    }
  }, [isOpen, selectedDate, showCalendarOption]);

  const getL10n = (sv: string, en: string, no?: string, da?: string, fi?: string) => {
    if (currentLang === 'en') return en;
    if (currentLang === 'no') return no || sv;
    if (currentLang === 'da') return da || sv;
    if (currentLang === 'fi') return fi || en;
    return sv;
  };

  const getLocale = () => {
    if (currentLang === 'en') return 'en-US';
    if (currentLang === 'no') return 'nb-NO';
    if (currentLang === 'da') return 'da-DK';
    if (currentLang === 'fi') return 'fi-FI';
    return 'sv-SE';
  };

  const chronologicalPeriods = periods ? periods.slice().reverse() : [];
  const locale = getLocale();

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        viewMode === 'calendar'
          ? getL10n('Välj datum', 'Select date', 'Velg dato', 'Vælg dato', 'Valitse päivä')
          : getL10n('Välj period', 'Select period', 'Velg periode', 'Vælg periode', 'Valitse jakso')
      }
      subtitle={
        viewMode === 'calendar'
          ? getL10n(
              'Välj en specifik dag eller visa hela perioden',
              'Pick a specific day or view full period',
              'Velg en bestemt dag eller vis hele perioden',
              'Vælg en bestemt dag eller vis hele perioden',
              'Valitse päivä tai näytä koko jakso'
            )
          : getL10n(
              'Dina löneperioder',
              'Your pay periods',
              'Dine lønnsperioder',
              'Dine lønperioder',
              'Palkkajaksosi'
            )
      }
      showCloseButton={true}
      bodyClassName="px-4 sm:px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-2 space-y-3.5 custom-scrollbar overflow-y-auto max-h-[72vh]"
    >
      {/* Segmented switcher between Pay Periods and Calendar when calendar option is enabled */}
      {showCalendarOption && (
        <div className="grid grid-cols-2 p-1 rounded-full bg-[var(--surface-color)]">
          <button
            type="button"
            onClick={() => {
              if (typeof feedback?.selection === 'function') feedback.selection();
              setViewMode('list');
            }}
            className={`h-9 rounded-full text-xs sm:text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[var(--text-primary)] text-[var(--surface-color)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers size={14} strokeWidth={2} />
            <span>{getL10n('Perioder', 'Periods', 'Perioder', 'Perioder', 'Jaksot')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof feedback?.selection === 'function') feedback.selection();
              setViewMode('calendar');
            }}
            className={`h-9 rounded-full text-xs sm:text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-[var(--text-primary)] text-[var(--surface-color)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CalendarIcon size={14} strokeWidth={2} />
            <span>{getL10n('Välj dag', 'Select day', 'Velg dag', 'Vælg dag', 'Valitse päivä')}</span>
          </button>
        </div>
      )}

      {viewMode === 'list' ? (
        <Card variant="default" padding="none" className="divide-y divide-menu overflow-hidden">
          {/* Alla perioder option */}
          {showAllPeriodsOption && (() => {
            const isAllSelected = !selectedPeriod && !selectedDate;
            return (
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.selection === 'function') feedback.selection();
                  else if (typeof feedback?.light === 'function') feedback.light();
                  onSelectPeriod(null);
                  onSelectDate(null);
                  onClose();
                }}
                className={`w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer active:scale-[0.99] ${
                  isAllSelected
                    ? 'bg-black/[0.03] dark:bg-white/[0.04]'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isAllSelected
                        ? 'bg-[var(--text-primary)] text-[var(--surface-color)]'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Layers size={16} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-body tracking-tight truncate ${
                        isAllSelected
                          ? 'font-bold text-[var(--text-primary)]'
                          : 'font-medium text-[var(--text-primary)]'
                      }`}
                    >
                      {getL10n('Alla perioder', 'All periods', 'Alle perioder', 'Alle perioder', 'Kaikki jaksot')}
                    </div>
                    <div className="text-secondary text-[var(--text-tertiary)] truncate mt-0.5">
                      {getL10n(
                        'Visa alla transaktioner sammanlagt',
                        'Show all transactions combined',
                        'Vis alle transaksjoner samlet',
                        'Vis alle transaktioner samlet',
                        'Näytä kaikki tapahtumat yhteensä'
                      )}
                    </div>
                  </div>
                </div>

                {isAllSelected && (
                  <div className="w-6 h-6 rounded-full bg-[var(--text-primary)] text-[var(--surface-color)] flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={2.75} />
                  </div>
                )}
              </button>
            );
          })()}

          {chronologicalPeriods.map((p, idx) => {
            const endDate = p.end ? new Date(p.end) : null;
            const startDate = p.start ? new Date(p.start) : null;

            const monthName =
              endDate && !isNaN(endDate.getTime())
                ? endDate.toLocaleString(locale, { month: 'long' })
                : startDate && !isNaN(startDate.getTime())
                  ? startDate.toLocaleString(locale, { month: 'long' })
                  : '';

            const capitalizedMonth = monthName
              ? monthName.charAt(0).toUpperCase() + monthName.slice(1)
              : p.name || '';

            let title = capitalizedMonth;
            let sub = '';

            if (p.name && p.name.includes('(')) {
              const parts = p.name.split('(');
              const extractedTitle = parts[0].trim();
              if (extractedTitle) title = extractedTitle;
              sub = parts[1]?.replace(')', '').trim() || '';
            } else if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const startStr = startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\.$/, '');
              const endStr = endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\.$/, '');
              sub = `${startStr} – ${endStr}`;
            } else if (p.name) {
              title = p.name;
            }

            const isSelected =
              (selectedPeriod?.periodId
                ? selectedPeriod.periodId === p.periodId
                : selectedPeriod?.name === p.name) && !selectedDate;

            return (
              <button
                key={p.periodId || p.name || idx}
                type="button"
                onClick={() => {
                  if (typeof feedback?.selection === 'function') feedback.selection();
                  else if (typeof feedback?.light === 'function') feedback.light();
                  onSelectPeriod(p);
                  onSelectDate(null);
                  onClose();
                }}
                className={`w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? 'bg-black/[0.03] dark:bg-white/[0.04]'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[var(--text-primary)] text-[var(--surface-color)]'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)]'
                    }`}
                  >
                    <CalendarIcon size={16} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-body tracking-tight truncate ${
                          isSelected
                            ? 'font-bold text-[var(--text-primary)]'
                            : 'font-medium text-[var(--text-primary)]'
                        }`}
                      >
                        {title}
                      </span>
                      {p.isCurrent && (
                        <span className="text-micro-label font-semibold px-2 py-0.5 rounded-full shrink-0 bg-black/[0.05] dark:bg-white/[0.08] text-[var(--text-primary)]">
                          {getL10n('Nu', 'Current', 'Nå', 'Nu', 'Nyt')}
                        </span>
                      )}
                    </div>
                    {sub && (
                      <div className="text-secondary text-[var(--text-tertiary)] truncate mt-0.5 tabular-nums">
                        {sub}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[var(--text-primary)] text-[var(--surface-color)] flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={2.75} />
                  </div>
                )}
              </button>
            );
          })}
        </Card>
      ) : (
        calendarContent
      )}
    </BottomSheet>
  );
}
