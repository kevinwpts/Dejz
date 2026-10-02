import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { feedback } from '../../utils/feedback';
import { useScrollLock } from '../../hooks/useScrollLock';

export interface FilterMenuOption<T = string> {
  id: T;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface FilterMenuModalProps<T = string> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: FilterMenuOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  footerNode?: React.ReactNode;
}

export function FilterMenuModal<T = string>({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
  footerNode,
}: FilterMenuModalProps<T>) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Bottom Sheet Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 27, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#2A2A2A] rounded-t-[28px] sm:rounded-[28px] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-h-[85dvh] h-auto flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans"
        >
          {/* Mobile Drag Handle */}
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
            <div className="min-w-0 pr-2">
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
              aria-label="Stäng"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>

          {/* Options List */}
          <div className="p-2.5 sm:p-3 overflow-y-auto space-y-1 shrink min-h-0 custom-scrollbar">
            {options.map((opt) => {
              const isSelected = opt.id === selectedId;
              return (
                <button
                  key={String(opt.id)}
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.selection === 'function') feedback.selection();
                    else if (typeof feedback?.tap === 'function') feedback.tap();
                    onSelect(opt.id);
                    onClose();
                  }}
                  style={isSelected ? {
                    backgroundColor: 'var(--user-accent-soft, rgba(99, 91, 255, 0.15))',
                    borderColor: 'rgba(var(--user-accent-rgb, 99, 91, 255), 0.25)',
                    color: 'var(--accent-color, #635BFF)'
                  } : undefined}
                  className={`w-full flex items-center justify-between py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl transition-all cursor-pointer text-left active:scale-[0.99] border ${
                    isSelected
                      ? 'font-semibold'
                      : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/[0.04] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {opt.icon && (
                      <div
                        style={isSelected ? { backgroundColor: 'var(--accent-color, #635BFF)' } : undefined}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'text-white'
                            : 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]'
                        }`}
                      >
                        {opt.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-[13px] tracking-tight truncate ${isSelected ? 'font-semibold' : ''}`} style={isSelected ? { color: 'var(--accent-color, #635BFF)' } : undefined}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)] shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subtitle && (
                        <p className="text-[11px] text-[#8C867C] dark:text-[#71717A] truncate mt-0.5 font-normal">
                          {opt.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div 
                      style={{ backgroundColor: 'var(--accent-color, #635BFF)' }}
                      className="w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 ml-2"
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {footerNode && (
            <div className="px-4 pt-2 pb-1 border-t border-black/[0.06] dark:border-white/[0.08]">
              {footerNode}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
