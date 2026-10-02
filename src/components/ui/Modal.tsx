import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { useScrollLock } from '../../hooks/useScrollLock';

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
  useScrollLock(isOpen);

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
    sm: 'max-w-[400px]',
    md: 'max-w-[480px]',
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
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Modal / Bottom Sheet Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full ${sizeStyles} bg-white dark:bg-[#1E1B22] rounded-t-[28px] sm:rounded-[28px] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-h-[90dvh] flex flex-col z-10 overflow-hidden font-sans ${className}`}
          >
            {/* Mobile Drag Pill */}
            <div className="w-10 h-1 bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                <div className="flex flex-col pr-4">
                  {title && (
                    <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] dark:text-white tracking-tight">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-xs text-[#6E6961] dark:text-[#A8A8A8] font-medium mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <IconButton
                    icon={<X size={16} strokeWidth={2.5} />}
                    onClick={onClose}
                    variant="muted"
                    size="sm"
                    aria-label="Stäng"
                  />
                )}
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[#1C1917] dark:text-white">
              {children}
            </div>

            {/* Footer / Actions */}
            {footer && (
              <div className="px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] bg-white dark:bg-[#1E1B22] shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
