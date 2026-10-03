import React from 'react';
import { motion } from 'motion/react';

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
}

export function ToggleSwitch({ isOn, onToggle }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-[51px] h-[31px] rounded-full relative transition-colors duration-300 flex-shrink-0 border ${isOn ? 'bg-[var(--accent-color)] border-transparent' : 'bg-[var(--surface-muted)] border-[var(--border-color)]'}`}
    >
      <motion.div
        className="absolute top-[1px] w-[27px] h-[27px] bg-white rounded-full shadow-xs"
        animate={{ x: isOn ? 21 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
