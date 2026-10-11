import React from 'react';
import { Icon, IconName } from './Icon';
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
      className={`bg-[var(--surface-color)] rounded-[var(--radius-card,16px)] p-6 sm:p-7 flex flex-col items-center justify-center text-center border border-subtle shadow-none ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-secondary)] mb-3 shrink-0">
          {renderIcon()}
        </div>
      )}
      <div className="space-y-1 max-w-sm flex flex-col items-center">
        <h3 className="text-section-title text-center">
          {title}
        </h3>
        {description && (
          typeof description === 'string' ? (
            <p className="text-secondary text-center mt-0.5 leading-relaxed">
              {description}
            </p>
          ) : (
            <div className="text-secondary text-center mt-0.5 leading-relaxed">
              {description}
            </div>
          )
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAction}
          className="mt-3.5 sm:mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
