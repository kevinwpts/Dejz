import React from 'react';
import { motion } from 'motion/react';

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
}

export function ToggleSwitch({ isOn, onToggle }: ToggleSwitchProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-[51px] h-[31px] rounded-full relative transition-colors duration-300 flex-shrink-0 border border-black/5 dark:border-white/5 ${isOn ? 'bg-[var(--success-color)]' : 'bg-[var(--bg-secondary)]'}`}
      style={{ boxShadow: isOn ? 'none' : 'inset 0 0 0 1px var(--border-color)' }}
    >
      <motion.div
        className="absolute top-[1px] w-[27px] h-[27px] bg-white rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16),0_3px_1px_rgba(0,0,0,0.1)]"
        animate={{ x: isOn ? 21 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
