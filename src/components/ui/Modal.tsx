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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card / Bottom Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`relative w-full ${sizeStyles} bg-[#FFFFFF] dark:bg-[#232323] border-t sm:border border-[#E6E2D8] dark:border-white/[0.04] rounded-t-[22px] sm:rounded-[22px] shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col z-10 overflow-hidden ${className}`}
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E6E2D8] dark:border-white/[0.035] shrink-0">
                <div className="flex flex-col pr-4">
                  {title && (
                    <h2 className="text-lg sm:text-xl font-bold font-display text-[#1C1917] dark:text-white tracking-normal">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-xs text-[#6E6961] dark:text-[#9CA6BC] mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <IconButton
                    icon={<X size={18} strokeWidth={2} />}
                    onClick={onClose}
                    variant="muted"
                    size="sm"
                    aria-label="Stäng"
                  />
                )}
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar text-[#1C1917] dark:text-white">
              {children}
            </div>

            {/* Footer / Actions */}
            {footer && (
              <div className="p-4 sm:p-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] border-t border-[#E6E2D8] dark:border-white/[0.035] bg-[#FFFFFF] dark:bg-[#232323] shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
