import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  onCheckedChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel,
  id,
  className = '',
}) => {
  const handleChange = (newChecked: boolean) => {
    if (disabled) return;
    onChange?.(newChecked);
    onCheckedChange?.(newChecked);
  };
  const isSm = size === 'sm';

  const trackWidth = isSm ? 'w-9 h-5' : 'w-11 h-6';
  const thumbSize = isSm ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  const translateChecked = isSm ? 'translate-x-4' : 'translate-x-5';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleChange(!checked);
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
      onClick={() => handleChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors duration-[var(--duration-normal,150ms)] ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-color,#0B0B0F)] disabled:bg-[var(--surface-nested,#ECEEF2)] disabled:cursor-not-allowed select-none ${trackWidth} ${
        checked
          ? 'bg-[var(--accent-color)] border border-transparent'
          : 'bg-[var(--surface-nested,#ECEEF2)] border border-[var(--border-subtle)]'
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full shadow-xs transform transition-transform duration-[var(--duration-normal,150ms)] ease-out ${thumbSize} ${
          checked
            ? `${translateChecked} ml-1 bg-[var(--on-accent)]`
            : 'translate-x-1 bg-[var(--surface-color,#FFFFFF)] dark:bg-[var(--text-secondary)] border border-[var(--border-subtle)]'
        }`}
      />
    </button>
  );
};
