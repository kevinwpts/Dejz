import { ModalSubView } from './shared';
import type { SetStateAction } from 'react';
import React from 'react';
import { CaretRight, CaretLeft } from '@phosphor-icons/react';
import { TransactionItem } from '../../../app/models';
import { formatSwedishFullDate } from '../../../utils/swedishDate';
import { SheetHeader } from '../../ui/SheetHeader';

export interface TxViewDatePickerProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  pickerYearMonth: { year: number; month: number; };
  date: string;
  setDate: (value: SetStateAction<string>) => void;
  activeTx: TransactionItem | null;
  onUpdate?: (tx: TransactionItem, applyToSimilarIds?: string[], options?: { renameScope?: "single" | "same-merchant" | "chain"; renameTargetIds?: string[]; categoryTargetIds?: string[]; }) => void;
  setPickerYearMonth: (value: SetStateAction<{ year: number; month: number; }>) => void;
}

export const TxViewDatePicker: React.FC<TxViewDatePickerProps> = ({
  subView,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  pickerYearMonth,
  date,
  setDate,
  activeTx,
  onUpdate,
  setPickerYearMonth,
}) => (
  <>
    {subView === 'date-picker' && (
      <div className={`${slideAnimClass} space-y-4`}>
        <SheetHeader title="Välj datum" onBack={() => navigateSubView(pickerReturnView, 'back')} onClose={onClose} flush />

        {(() => {
          const now = new Date();
          const toIso = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
              d.getDate()
            ).padStart(2, '0')}`;
          const todayIso = toIso(now);
          const yest = new Date(now);
          yest.setDate(now.getDate() - 1);
          const yesterdayIso = toIso(yest);
          const twoAgo = new Date(now);
          twoAgo.setDate(now.getDate() - 2);
          const twoDaysAgoIso = toIso(twoAgo);

          const quickPresets = [
            { label: 'Idag', sub: formatSwedishFullDate(todayIso), iso: todayIso },
            { label: 'Igår', sub: formatSwedishFullDate(yesterdayIso), iso: yesterdayIso },
            { label: 'I förrgår', sub: formatSwedishFullDate(twoDaysAgoIso), iso: twoDaysAgoIso },
          ];

          const monthNames = [
            'Januari',
            'Februari',
            'Mars',
            'April',
            'Maj',
            'Juni',
            'Juli',
            'Augusti',
            'September',
            'Oktober',
            'November',
            'December',
          ];
          const firstDayOfMonth = new Date(pickerYearMonth.year, pickerYearMonth.month, 1);
          // Monday = 0 ... Sunday = 6
          const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
          const daysInMonth = new Date(
            pickerYearMonth.year,
            pickerYearMonth.month + 1,
            0
          ).getDate();

          // Tomma rutor före den 1:a (så att dagen hamnar under rätt veckodag)
          const leadingBlankKeys: string[] = [];
          for (let i = 0; i < startWeekday; i++) leadingBlankKeys.push(`empty-${i}`);
          const dayNumbers: number[] = [];
          for (let d = 1; d <= daysInMonth; d++) dayNumbers.push(d);

          return (
            <div className="space-y-3">
              {/* Snabbval */}
              <div className="grid grid-cols-3 gap-2">
                {quickPresets.map((p) => {
                  const isSel = date === p.iso;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setDate(p.iso);
                        if (pickerReturnView === 'details' && activeTx && onUpdate) {
                          onUpdate({ ...activeTx, date: p.iso });
                        }
                        navigateSubView(pickerReturnView, 'back');
                      }}
                      className={`px-3 py-2.5 rounded-card-nested text-left transition-all cursor-pointer active:scale-[0.98] ${
                        isSel
                          ? 'ui-selected'
                          : 'bg-[var(--fill-grouped)] hover:opacity-90 text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="font-semibold text-callout block">
                        {p.label}
                      </span>
                      <span
                        className={`text-footnote block truncate mt-0.5 tabular-nums ${
                          isSel ? 'opacity-80' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {p.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Kalender-matris */}
              <div className="rounded-card-nested bg-[var(--fill-grouped)] p-3.5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPickerYearMonth((prev) =>
                        prev.month === 0
                          ? { year: prev.year - 1, month: 11 }
                          : { year: prev.year, month: prev.month - 1 }
                      )
                    }
                    aria-label="Föregående månad"
                    className="ui-icon-btn-surface"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>
                  <span className="font-display font-semibold text-subhead text-[var(--text-primary)] tabular-nums">
                    {monthNames[pickerYearMonth.month]} {pickerYearMonth.year}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPickerYearMonth((prev) =>
                        prev.month === 11
                          ? { year: prev.year + 1, month: 0 }
                          : { year: prev.year, month: prev.month + 1 }
                      )
                    }
                    aria-label="Nästa månad"
                    className="ui-icon-btn-surface"
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((w) => (
                    <span
                      key={w}
                      className="text-footnote font-medium text-[var(--text-muted)] py-1"
                    >
                      {w}
                    </span>
                  ))}
                  {leadingBlankKeys.map((blankKey) => (
                    <div key={blankKey} className="h-10" />
                  ))}
                  {dayNumbers.map((dayNum) => {
                    const iso = `${pickerYearMonth.year}-${String(
                      pickerYearMonth.month + 1
                    ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSel = date === iso;
                    const isTodayCell = iso === todayIso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => {
                          setDate(iso);
                          if (pickerReturnView === 'details' && activeTx && onUpdate) {
                            onUpdate({ ...activeTx, date: iso });
                          }
                          navigateSubView(pickerReturnView, 'back');
                        }}
                        className={`relative ui-day-btn ${
                          isSel
                            ? 'ui-day-btn-active'
                            : isTodayCell
                            ? '!text-[var(--accent-color)] font-semibold'
                            : ''
                        }`}
                      >
                        <span>{dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    )}
  </>
);
