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
      className={`bg-white dark:bg-[#242424] rounded-[18px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-none border-none ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-muted)] dark:bg-[#2D2D2D] border-none flex items-center justify-center text-[#6E6961] dark:text-[#A8A8A8] mb-3 shrink-0">
          <Icon size={20} strokeWidth={2} />
        </div>
      )}
      <div className="space-y-1 max-w-sm flex flex-col items-center">
        <h3 className="text-sm font-bold text-[#1C1917] dark:text-white tracking-tight">
          {title}
        </h3>
        {description && (
          typeof description === 'string' ? (
            <p className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8] leading-relaxed">
              {description}
            </p>
          ) : (
            <div className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8] leading-relaxed">
              {description}
            </div>
          )
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-8 px-4 bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-95 select-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
