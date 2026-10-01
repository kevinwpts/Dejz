import React from 'react';
import { CategoryIcon } from './CategoryIcon';

interface CategoryTileProps {
  name: string | any;
  icon: string;
  color?: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

export function CategoryTile({
  name,
  icon,
  color,
  isActive = false,
  onClick,
  className = ''
}: CategoryTileProps) {
  const displayName = typeof name === 'object' ? (name?.name || '') : (name || '');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 p-2 min-h-[70px] sm:min-h-[74px] rounded-[14px] transition-all relative group cursor-pointer select-none ${
        isActive
          ? 'bg-[var(--accent-color)]/15 text-[var(--text-primary)] border-2 border-[var(--accent-color)] shadow-xs scale-[1.02]'
          : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--text-primary)] border border-black/10 dark:border-white/10'
      } ${className}`}
    >
      <CategoryIcon
        icon={icon}
        color={color}
        size="sm"
        isActive={isActive}
      />
      <span className="text-[11px] font-medium tracking-tight text-center line-clamp-1 leading-tight break-words opacity-90 w-full px-0.5">
        {displayName}
      </span>
    </button>
  );
}
