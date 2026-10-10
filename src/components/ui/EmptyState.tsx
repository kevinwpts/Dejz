import React from 'react';
import { Icon, IconName } from './Icon';

export interface EmptyStateProps {
  icon?: IconName | React.ComponentType<any> | React.ReactNode;
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
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <Icon name={icon as IconName} size={20} />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const CustomIcon = icon as React.ComponentType<any>;
      return <CustomIcon size={20} />;
    }
    return null;
  };

  return (
    <div
      className={`bg-[var(--surface-color)] rounded-[var(--radius-card,14px)] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-none border-none ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-[var(--radius-card-nested,10px)] bg-[var(--surface-muted)] border-none flex items-center justify-center text-[var(--text-secondary)] mb-3 shrink-0">
          {renderIcon()}
        </div>
      )}
      <div className="space-y-1.5 max-w-sm flex flex-col items-center">
        <h3 className="text-card-title text-center">
          {title}
        </h3>
        {description && (
          typeof description === 'string' ? (
            <p className="text-secondary text-center">
              {description}
            </p>
          ) : (
            <div className="text-secondary text-center">
              {description}
            </div>
          )
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-9 px-4 bg-[var(--surface-muted)] hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-primary)] rounded-[var(--radius-button-sm,10px)] text-label font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-[0.98] select-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
