import React, { useRef, useEffect } from 'react';
import { feedback } from '../../utils/feedback';

export interface FilterButtonGroupOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface FilterButtonGroupProps<T extends string = string> {
  options: FilterButtonGroupOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function FilterButtonGroup<T extends string = string>({
  options,
  selectedId,
  onSelect,
  className = '',
  ariaLabel = 'Filter'
}: FilterButtonGroupProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Ensure active option is visible without unnecessary jumps
  useEffect(() => {
    const container = containerRef.current;
    const button = buttonRefs.current[selectedId];
    if (!container || !button) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    const isLeftCutOff = buttonRect.left < containerRect.left + 4;
    const isRightCutOff = buttonRect.right > containerRect.right - 4;

    if (isLeftCutOff || isRightCutOff) {
      button.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedId]);

  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`} role="region" aria-label={ariaLabel}>
      <div
        ref={containerRef}
        role="tablist"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 -mx-0.5 overscroll-x-contain touch-pan-x select-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {options.map((option) => {
          const isSelected = option.id === selectedId;

          return (
            <button
              key={option.id}
              ref={(el) => {
                buttonRefs.current[option.id] = el;
              }}
              role="tab"
              aria-selected={isSelected}
              type="button"
              onClick={() => {
                if (typeof feedback?.selection === 'function') {
                  feedback.selection();
                } else if (typeof feedback?.tap === 'function') {
                  feedback.tap();
                }
                onSelect(option.id);
              }}
              className={`flex-shrink-0 whitespace-nowrap h-9 sm:h-[38px] px-3.5 sm:px-4 rounded-[14px] inline-flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                isSelected
                  ? 'bg-[#242321] text-white dark:bg-stone-100 dark:text-[#242321] border border-transparent shadow-xs'
                  : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-black/[0.04] dark:border-white/[0.06]'
              }`}
            >
              {option.icon && (
                <span className={`shrink-0 transition-colors ${isSelected ? 'text-white dark:text-[#242321]' : 'text-[var(--text-secondary)]'}`}>
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
              {option.badge !== undefined && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                    isSelected
                      ? 'bg-white/20 dark:bg-black/15 text-white dark:text-[#242321]'
                      : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
                  }`}
                >
                  {option.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
