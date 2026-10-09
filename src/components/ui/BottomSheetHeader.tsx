import React from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface BottomSheetHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: 'standard' | 'centered' | 'actions';
  leading?: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export function BottomSheetHeader({
  title,
  subtitle,
  variant = 'standard',
  leading,
  onClose,
  className = '',
}: BottomSheetHeaderProps) {
  if (variant === 'centered') {
    return (
      <div className={`px-5 sm:px-6 pt-3 sm:pt-4 pb-3 grid grid-cols-[40px_1fr_40px] items-center shrink-0 border-b border-[var(--border-color)]/60 dark:border-white/[0.04] ${className}`}>
        <div className="flex justify-start">
          {leading}
        </div>
        <div className="flex flex-col items-center justify-center text-center overflow-hidden px-2">
          {title && (
            <h2 className="text-card-title truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-micro-label truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <IconButton
            icon={<Icon name="x" size={16} />}
            onClick={onClose}
            variant="muted"
            size="sm"
            aria-label="Stäng"
          />
        </div>
      </div>
    );
  }

  if (variant === 'actions') {
    return (
      <div className={`px-5 sm:px-6 pt-3 sm:pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]/60 dark:border-white/[0.04] ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {leading}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <IconButton
            icon={<Icon name="x" size={16} />}
            onClick={onClose}
            variant="muted"
            size="sm"
            aria-label="Stäng"
          />
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div className={`px-5 sm:px-6 pt-3 sm:pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]/60 dark:border-white/[0.04] ${className}`}>
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {leading}
        <div className="flex flex-col min-w-0">
          {title && (
            <h2 className="text-card-title truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-micro-label truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <IconButton
          icon={<Icon name="x" size={16} />}
          onClick={onClose}
          variant="muted"
          size="sm"
          aria-label="Stäng"
        />
      </div>
    </div>
  );
}
