import React from 'react';

export interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-3 my-4 ${className}`}>
        <div className="h-px bg-[var(--border-divider,var(--border-subtle))] flex-1" />
        <span className="text-[12px] font-semibold text-[var(--text-secondary)] px-1">
          {label}
        </span>
        <div className="h-px bg-[var(--border-divider,var(--border-subtle))] flex-1" />
      </div>
    );
  }

  return <div className={`h-px bg-[var(--border-divider,var(--border-subtle))] w-full my-3 ${className}`} />;
};
