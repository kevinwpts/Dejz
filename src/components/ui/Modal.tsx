import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  showCloseButton = true,
  children,
  footer,
  className = '',
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

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
    sm: 'max-w-[380px]',
    md: 'max-w-[460px]',
    lg: 'max-w-[560px]',
    xl: 'max-w-[680px]',
  }[size];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm"
          />

          {/* Modal Card / Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`relative w-full ${sizeStyles} bg-[var(--surface-color)] border border-[var(--border-color)] rounded-t-[28px] sm:rounded-[28px] shadow-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col z-10 overflow-hidden ${className}`}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[var(--border-color)]/60 shrink-0">
                <div className="flex flex-col pr-4">
                  {title && (
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <IconButton
                    icon={<X size={18} />}
                    onClick={onClose}
                    variant="muted"
                    size="sm"
                    aria-label="Stäng"
                  />
                )}
              </div>
            )}

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 sm:p-5 border-t border-[var(--border-color)]/60 bg-[var(--surface-muted)]/30 shrink-0 flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
