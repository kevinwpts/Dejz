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
    <div className={`bg-[#FFFFFF] dark:bg-white/[0.035] border border-[#E6E2D8] dark:border-white/[0.025] backdrop-blur-[18px] rounded-[18px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-none ${className}`}>
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-[#F7F5F0] dark:bg-white/[0.04] border border-[#E6E2D8] dark:border-white/[0.035] flex items-center justify-center text-[#6E6961] dark:text-[#9CA6BC] mb-3">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-[13.5px] font-semibold text-[#1C1917] dark:text-white tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-[12px] font-normal text-[#6E6961] dark:text-[#9CA6BC] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3.5 h-8 px-3.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-[#05b862]/[0.16] dark:hover:bg-[#05b862]/[0.24] text-emerald-700 dark:text-white border border-emerald-200 dark:border-[#05b862]/30 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
