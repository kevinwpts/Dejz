import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`bg-[var(--surface-color)] border border-[var(--border-color)] dark:border-white/10 rounded-[16px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-2xs ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] border border-[var(--border-color)]/40 flex items-center justify-center text-[var(--text-secondary)] mb-3 shadow-2xs">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-[13px] font-normal text-[var(--text-secondary)] tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-[12px] font-normal text-[var(--text-secondary)]/70 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-9 px-4 bg-[var(--accent-color)] text-[var(--text-on-accent)] rounded-xl text-[12px] font-medium hover:opacity-90 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
