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

  const trackWidth = isSm ? 'w-9 h-[22px]' : 'w-[51px] h-[31px]';
  const thumbSize = isSm ? 'w-[18px] h-[18px]' : 'w-[27px] h-[27px]';
  const translateChecked = isSm ? 'translate-x-[14px]' : 'translate-x-5';

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
      className={`relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors duration-[var(--duration-normal,150ms)] ease-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-color)] disabled:bg-[var(--surface-nested)] disabled:cursor-not-allowed select-none ${trackWidth} ${
        checked
          ? 'bg-[var(--accent-color)]'
          : 'bg-[var(--segment-track)]'
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transform transition-transform duration-[var(--duration-normal,150ms)] ease-out ${thumbSize} ${
          checked
            ? `${translateChecked} ml-0.5 bg-white`
            : 'translate-x-0 ml-0.5 bg-white'
        }`}
      />
    </button>
  );
};
