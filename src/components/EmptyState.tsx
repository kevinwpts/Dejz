import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
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
    <div className={`bg-[#FFFFFF] dark:bg-white/[0.035] border border-[#E6E2D8] dark:border-white/[0.025] backdrop-blur-[18px] rounded-[18px] p-6 sm:p-7 flex flex-col items-center justify-center text-center shadow-none ${className}`}>
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-[#F7F5F0] dark:bg-white/[0.04] border border-[#E6E2D8] dark:border-white/[0.035] flex items-center justify-center text-[#6E6961] dark:text-[#A8A8A8] mb-3">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 max-w-sm flex flex-col items-center">
        <h3 className="text-sm font-semibold text-[#1C1917] dark:text-white tracking-tight">
          {title}
        </h3>
        {description && (
          typeof description === 'string' ? (
            <p className="text-xs font-normal text-[#6E6961] dark:text-[#A8A8A8] leading-relaxed">
              {description}
            </p>
          ) : (
            <div className="text-xs font-normal text-[#6E6961] dark:text-[#A8A8A8] leading-relaxed">
              {description}
            </div>
          )
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3.5 h-8 px-4 bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-95 select-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
