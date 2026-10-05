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
          className="relative w-full sm:max-w-md bg-[var(--bg-color)] rounded-t-[28px] sm:rounded-[28px] border-none shadow-2xl max-h-[85dvh] h-auto flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans"
        >
          {/* Mobile Drag Handle */}
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
            <div className="min-w-0 pr-2">
              <h3 className="text-base font-bold font-display tracking-tight text-[var(--text-primary)] truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5 font-medium">
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
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95 border-none shadow-none"
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
                  className="w-full flex items-center justify-between py-2.5 px-3 sm:py-3 sm:px-3.5 rounded-[14px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {opt.icon && (
                      <div
                        className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                            : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
                        }`}
                      >
                        {opt.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-[13px] tracking-tight truncate ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subtitle && (
                        <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-normal">
                          {opt.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="text-[var(--accent-color)] shrink-0 ml-2 pl-1">
                      <Check size={18} strokeWidth={2.5} />
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
