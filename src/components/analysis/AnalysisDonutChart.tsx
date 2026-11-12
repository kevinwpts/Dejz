// Cirkeldiagrammet i Analys-fliken: utgifter per kategori, klicka på en bit för att markera den
import React from 'react';
import { CategoryIcon } from '../CategoryIcon';
import type { ExpenseChartSlice } from './useAnalysisData';
import { formatKr } from './formatKr';

const donutRadius = 78;
const donutCircumference = 2 * Math.PI * donutRadius;

interface AnalysisDonutChartProps {
  slices: ExpenseChartSlice[];
  activeSlice: ExpenseChartSlice | null;
  selectedSliceCategory: string | null;
  setSelectedSliceCategory: React.Dispatch<React.SetStateAction<string | null>>;
  /** "Visa alla": avmarkera biten och stäng öppen kategori */
  onShowAll: () => void;
  totalSpent: number;
}

export const AnalysisDonutChart: React.FC<AnalysisDonutChartProps> = ({
  slices,
  activeSlice,
  selectedSliceCategory,
  setSelectedSliceCategory,
  onShowAll,
  totalSpent,
}) => {
  // Utan utgifter visas bara den grå ringen med "0 kr" – samma layout som annars, inget hopp
  return (
    <div className="relative pt-5 pb-3 flex flex-col items-center justify-center">

      <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full -rotate-90 overflow-visible"
        >
          {/* Subtil bakgrundsring */}
          <circle
            cx="100"
            cy="100"
            r={donutRadius}
            fill="transparent"
            stroke="var(--border-subtle)"
            strokeWidth="15"
          />

          {slices.map((slice) => {
            const isSelected = selectedSliceCategory === slice.category;
            const isDimmed = selectedSliceCategory !== null && !isSelected;
            const gap = slices.length > 1 ? 3.5 : 0;
            const sliceLength = Math.max(
              0,
              slice.fraction * donutCircumference - gap
            );
            const dashOffset = -slice.startFraction * donutCircumference;

            return (
              <circle
                key={slice.category}
                cx="100"
                cy="100"
                r={donutRadius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isSelected ? 20 : 15}
                strokeDasharray={`${sliceLength} ${donutCircumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                onClick={() =>
                  setSelectedSliceCategory((prev) =>
                    prev === slice.category ? null : slice.category
                  )
                }
                className={`cursor-pointer transition-all duration-300 ${
                  isDimmed ? 'opacity-25' : 'opacity-100'
                }`}
              />
            );
          })}
        </svg>

        {/* Center-info direkt i den öppna cirkeln */}
        <button
          type="button"
          onClick={activeSlice ? onShowAll : undefined}
          aria-label={activeSlice ? 'Visa alla kategorier' : undefined}
          className="absolute inset-7 rounded-full flex flex-col items-center justify-center text-center px-3 cursor-pointer focus:outline-none"
        >
          {activeSlice ? (
            <>
              <span className="text-footnote font-medium text-[var(--text-secondary)] truncate max-w-[124px] inline-flex items-center gap-1">
                <CategoryIcon category={activeSlice.category} size={14} />
                {activeSlice.category}
              </span>
              <span className="font-display font-semibold text-[24px] tracking-[-0.03em] whitespace-nowrap text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                {formatKr(activeSlice.amount)}
              </span>
              {/* Ersätter den svävande "Visa alla"-knappen: tryck i mitten för att visa alla igen */}
              <span className="mt-1 text-footnote font-semibold text-[var(--on-accent-container)]">
                Visa alla
              </span>
            </>
          ) : (
            <>
              <span className="text-footnote font-normal text-[var(--text-secondary)]">
                Utgifter i perioden
              </span>
              <span className="font-display font-[600] text-[24px] sm:text-[26px] tracking-[-0.03em] whitespace-nowrap text-[var(--text-primary)] tabular-nums leading-tight mt-0.5">
                {formatKr(totalSpent)}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
