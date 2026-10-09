import React from 'react';
import { Switch } from './ui/Switch';

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  'aria-label'?: string;
  className?: string;
}

export function ToggleSwitch({ isOn, onToggle, 'aria-label': ariaLabel, className }: ToggleSwitchProps) {
  return (
    <Switch
      checked={isOn}
      onChange={() => onToggle()}
      aria-label={ariaLabel}
      className={className}
    />
  );
}

