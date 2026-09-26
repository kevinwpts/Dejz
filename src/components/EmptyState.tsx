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
    <div className={`bg-white/[0.035] border border-white/[0.025] backdrop-blur-[18px] rounded-[20px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-none ${className}`}>
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.035] flex items-center justify-center text-[#9CA6BC] mb-3">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-[13px] font-medium text-white tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-[12px] font-normal text-[#9CA6BC] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3.5 h-8 px-3.5 bg-[#818cf8]/[0.16] hover:bg-[#818cf8]/[0.24] text-white border border-[#8B9CFF]/30 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
