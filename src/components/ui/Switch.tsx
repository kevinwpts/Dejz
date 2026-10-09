import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel,
  id,
  className = '',
}) => {
  const isSm = size === 'sm';

  const trackWidth = isSm ? 'w-9 h-5' : 'w-11 h-6';
  const thumbSize = isSm ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  const translateChecked = isSm ? 'translate-x-4' : 'translate-x-5';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors duration-[var(--duration-normal,150ms)] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30 disabled:opacity-40 disabled:cursor-not-allowed select-none ${trackWidth} ${
        checked ? 'bg-[var(--accent-color)]' : 'bg-[var(--surface-muted)] border border-[var(--border-subtle)]'
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full bg-white shadow-xs transform transition-transform duration-[var(--duration-normal,150ms)] ease-out ${thumbSize} ${
          checked ? `${translateChecked} ml-1` : 'translate-x-1'
        }`}
      />
    </button>
  );
};
