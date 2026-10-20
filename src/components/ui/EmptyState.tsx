import React from 'react';
import { IconName } from './Icon';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: IconName | React.ComponentType<any> | React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const cleanActionLabel = actionLabel ? actionLabel.replace(/^\+\s*/, '').trim() : undefined;

  return (
    <div
      className={`bg-[var(--surface-color)] rounded-card p-6 sm:p-7 flex flex-col items-center justify-center text-center border border-subtle shadow-subtle ${className}`}
    >
      <div className="space-y-1 max-w-[280px] sm:max-w-xs flex flex-col items-center">
        <h3 className="text-section-title font-semibold text-[var(--text-primary)] text-center">
          {title}
        </h3>
        {description && (
          typeof description === 'string' ? (
            <p className="text-secondary font-medium text-[var(--text-secondary)] text-center mt-0.5 leading-relaxed">
              {description}
            </p>
          ) : (
            <div className="text-secondary font-medium text-[var(--text-secondary)] text-center mt-0.5 leading-relaxed">
              {description}
            </div>
          )
        )}
      </div>
      {cleanActionLabel && onAction && (
        <Button
          variant="tonal"
          size="sm"
          onClick={onAction}
          className="mt-4 font-semibold"
        >
          {cleanActionLabel}
        </Button>
      )}
    </div>
  );
};
