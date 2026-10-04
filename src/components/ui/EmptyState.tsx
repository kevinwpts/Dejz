import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-[var(--surface-color)] rounded-[16px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-none border-none ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-none flex items-center justify-center text-[var(--text-secondary)] mb-3 shrink-0">
          <Icon size={20} strokeWidth={2} />
        </div>
      )}
      <div className="space-y-1 max-w-sm flex flex-col items-center">
        <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
          {title}
        </h3>
        {description && (
          typeof description === 'string' ? (
            <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
              {description}
            </p>
          ) : (
            <div className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
              {description}
            </div>
          )
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-8 px-4 bg-[#1C1917] dark:bg-[var(--accent-color)] text-[var(--text-on-accent)] dark:text-[var(--on-accent)] rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-95 select-none hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
