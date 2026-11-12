// Ikonväljare i arken "Ny/Redigera kategori" och "Nytt/Redigera betalsätt".
// Rutnätet scrollar inne i arket med mjuk tona i kanten (ingen halv rad som sticker fram),
// alla glyfer i samma neutrala färg – bara den valda får varumärkets lila.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CategoryIconOption } from '../CategoryIcon';

interface IconPickerGridProps {
  options: CategoryIconOption[];
  value: string;
  onChange: (id: string) => void;
  renderIcon: (id: string) => React.ReactNode;
}

export const IconPickerGrid: React.FC<IconPickerGridProps> = ({
  options,
  value,
  onChange,
  renderIcon,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ top: false, bottom: false });

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setFade((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  useEffect(() => {
    updateFade();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFade]);

  return (
    <div className="dz-icon-picker">
      <div
        ref={scrollRef}
        onScroll={updateFade}
        data-fade-top={fade.top || undefined}
        data-fade-bottom={fade.bottom || undefined}
        className="dz-icon-picker-scroll no-scrollbar"
      >
        <div className="grid grid-cols-6 gap-1.5">
          {options.map((item) => {
            const isSelected = value === item.id;
            return (
              <button
                aria-label={item.label}
                aria-pressed={isSelected}
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => onChange(item.id)}
                className={`h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                  isSelected ? 'dz-icon-picker-selected' : 'text-[var(--text-secondary)]'
                }`}
              >
                {renderIcon(item.id)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
