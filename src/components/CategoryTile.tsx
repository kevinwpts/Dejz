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
      className={`flex flex-col items-center justify-center gap-1.5 p-2 min-h-[70px] sm:min-h-[74px] rounded-card transition-all relative group cursor-pointer select-none ${
        isActive
          ? 'bg-[var(--accent-color)]/15 text-[var(--text-primary)] border-2 border-[var(--accent-color)] shadow-xs scale-[1.02]'
          : 'bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/[0.08] hover:text-[var(--text-primary)] dark:hover:text-white border border-subtle'
      } ${className}`}
    >
      <CategoryIcon
        icon={icon}
        color={color}
        size="sm"
        isActive={isActive}
        categoryName={displayName}
      />
      <span className="text-micro-label text-center line-clamp-1 leading-tight break-words opacity-90 w-full px-0.5">
        {displayName}
      </span>
    </button>
  );
}
