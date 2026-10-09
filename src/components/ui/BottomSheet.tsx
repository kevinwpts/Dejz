import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { feedback } from '../../utils/feedback';
import { useScrollLock } from '../../hooks/useScrollLock';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerLeading?: React.ReactNode;
  headerRight?: React.ReactNode;
  showCloseButton?: boolean;
  showDragHandle?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  zIndex?: number;
  maxHeight?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  headerLeading,
  headerRight,
  showCloseButton = true,
  showDragHandle = true,
  size = 'md',
  children,
  footer,
  className = '',
  bodyClassName,
  zIndex = 110,
  maxHeight = 'max-h-[90dvh] sm:max-h-[85vh]',
}: BottomSheetProps) {
  useScrollLock(isOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeStyles = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-xl',
    xl: 'sm:max-w-2xl',
    full: 'sm:max-w-3xl',
  }[size];

  const hasHeader = Boolean(title || subtitle || headerLeading || headerRight || showCloseButton);

  if (!mounted || typeof document === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ zIndex }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${sizeStyles} bg-[var(--modal-bg,var(--bg-color))] text-[var(--text-primary)] rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] border-none shadow-modal ${maxHeight} flex flex-col z-10 overflow-hidden font-sans ${className}`}
          >
            {/* Mobile Drag Handle */}
            {showDragHandle && (
              <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />
            )}

            {/* Header */}
            {hasHeader && (
              <div className="px-5 sm:px-6 pt-3 sm:pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 min-w-0 pr-3 flex-1">
                  {headerLeading && (
                    <div className="shrink-0">
                      {headerLeading}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    {title && (
                      <h2 className="text-card-title truncate">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="text-secondary truncate mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {headerRight}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof feedback?.light === 'function') feedback.light();
                        onClose();
                      }}
                      className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95 border-none shadow-none"
                      aria-label="Stäng"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Body */}
            <div
              className={`flex-1 overflow-y-auto ${
                bodyClassName ?? 'page-px py-4 space-y-3.5 custom-scrollbar'
              } min-h-0`}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="page-px pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] border-t border-[var(--border-subtle)] shrink-0 bg-[var(--modal-bg,var(--bg-color))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Standardized option row for bottom sheets and selection menus.
 *
 * Requirements:
 * - Valt alternativ markeras med tydligare text (font-semibold) och en diskret bock (Check).
 * - INGEN färgad bakgrund!
 * - Neutral subtil hover-yta.
 * - Stöd för underrubriker, badges, ikoner och extra element.
 */
export interface BottomSheetOptionProps<T = string> {
  id?: T;
  label: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isSelected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function BottomSheetOption<T = string>({
  label,
  subtitle,
  icon,
  badge,
  isSelected = false,
  onClick,
  disabled = false,
  rightElement,
  className = '',
}: BottomSheetOptionProps<T>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          if (typeof feedback?.selection === 'function') {
            feedback.selection();
          } else if (typeof feedback?.tap === 'function') {
            feedback.tap();
          }
          onClick();
        }
      }}
      className={`w-full flex items-center justify-between py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-[var(--radius-button-sm,8px)] transition-colors cursor-pointer text-left active:scale-[0.99] min-h-[48px] bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="w-8 h-8 rounded-[var(--radius-icon-button,6px)] bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 text-[var(--text-primary)]">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-secondary truncate leading-tight ${
                isSelected
                  ? 'font-semibold text-[var(--text-primary)]'
                  : 'font-medium'
              }`}
            >
              {label}
            </span>
            {badge && (
              <span className="text-micro-label font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-micro-label truncate mt-0.5 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {rightElement}
        {isSelected && (
          <div className="text-[var(--text-primary)] pl-1 shrink-0">
            <Icon name="check" size={18} />
          </div>
        )}
      </div>
    </button>
  );
}

// Aliases for convenience
export const BottomSheetOptionRow = BottomSheetOption;
export const BottomSheetItem = BottomSheetOption;

export interface BottomSheetSectionProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheetSection({ title, children, className = '' }: BottomSheetSectionProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {title && (
        <h3 className="px-3 text-micro-label tracking-wider uppercase">
          {title}
        </h3>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
