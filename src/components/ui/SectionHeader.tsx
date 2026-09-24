import React from 'react';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  count,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-3 px-1 ${className}`}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-secondary)]">
            {title}
          </h3>
          {count !== undefined && (
            <span className="text-[11px] font-semibold py-0.5 px-2 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[var(--text-secondary)] opacity-80 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
