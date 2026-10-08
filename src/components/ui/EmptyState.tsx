import React from 'react';
import { Icon, IconName } from './Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-[var(--surface-color)] rounded-[8px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-none border-none ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.06] border-none flex items-center justify-center text-[var(--text-secondary)] mb-3 shrink-0">
          <Icon name={icon} size={20} />
        </div>
      )}
      <div className="space-y-1 max-w-sm flex flex-col items-center">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          {title}
        </h3>
        {description && (
          typeof description === 'string' ? (
            <p className="text-xs font-normal text-[var(--text-secondary)] leading-relaxed">
              {description}
            </p>
          ) : (
            <div className="text-xs font-normal text-[var(--text-secondary)] leading-relaxed">
              {description}
            </div>
          )
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-9 px-4 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-primary)] rounded-[8px] text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-[0.98] select-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
