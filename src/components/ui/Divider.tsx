import React from 'react';

export interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-3 my-4 ${className}`}>
        <div className="h-px bg-[#E6E2D8] dark:bg-[#383838] flex-1" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C867C] dark:text-[#71717A]">
          {label}
        </span>
        <div className="h-px bg-[#E6E2D8] dark:bg-[#383838] flex-1" />
      </div>
    );
  }

  return <div className={`h-px bg-[#E6E2D8] dark:bg-[#383838] w-full my-3 ${className}`} />;
};
