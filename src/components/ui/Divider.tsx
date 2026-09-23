import React from 'react';

export interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-3 my-4 ${className}`}>
        <div className="h-px bg-[var(--border-color)] flex-1" />
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">
          {label}
        </span>
        <div className="h-px bg-[var(--border-color)] flex-1" />
      </div>
    );
  }

  return <div className={`h-px bg-[var(--border-color)] w-full my-3 ${className}`} />;
};
