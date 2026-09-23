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
      className={`flex flex-col items-center justify-center gap-2 p-2.5 sm:p-3 min-h-[88px] rounded-[16px] transition-all relative group cursor-pointer select-none ${
        isActive
          ? 'bg-[var(--surface-color)] text-[var(--text-primary)] border-2 border-[var(--accent-color)] shadow-xs scale-[1.02]'
          : 'bg-[var(--surface-muted)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
      } ${className}`}
    >
      <CategoryIcon
        icon={icon}
        color={color}
        size="md"
        isActive={isActive}
      />
      <span className="text-[11.5px] font-medium tracking-tight text-center line-clamp-2 leading-snug break-words hyphens-auto opacity-90 w-full px-0.5 min-h-[2.4em] flex items-center justify-center">
        {displayName}
      </span>
    </button>
  );
}
