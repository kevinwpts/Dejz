import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { useScrollLock } from '../../hooks/useScrollLock';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  headerRight?: React.ReactNode;
  headerClassName?: string;
  center?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  showCloseButton = true,
  headerRight,
  headerClassName = '',
  center = false,
  children,
  footer,
  className = '',
  bodyClassName,
  zIndex = 100,
}) => {
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
    xs: 'sm:max-w-[380px]',
    sm: 'sm:max-w-[480px]',
    md: 'sm:max-w-[576px]',
    lg: 'sm:max-w-[672px]',
    xl: 'sm:max-w-[768px]',
  }[size];

  const modalNode = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className={`fixed inset-0 flex justify-center ${
            center ? 'items-center p-4' : 'items-end sm:items-center p-0 sm:p-4'
          }`}
          style={{ zIndex }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Card */}
          <motion.div
            initial={{ opacity: 0, y: center ? 20 : 40, scale: center ? 0.95 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: center ? 20 : 30, scale: center ? 0.95 : 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full ${sizeStyles} bg-[var(--bg-color)] ${
              center ? 'rounded-[var(--radius-modal,24px)] border' : 'rounded-t-[var(--radius-modal,24px)] sm:rounded-[var(--radius-modal,24px)] border-t sm:border'
            } border-[var(--border-subtle)] shadow-modal max-h-[90dvh] flex flex-col z-10 overflow-hidden font-sans ${className}`}
          >
            {/* Mobile Drag Pill */}
            {!center && (
              <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3 shrink-0 sm:hidden" />
            )}

            {/* Header */}
            {(title || showCloseButton || headerRight) && (
              <div className={`flex items-center justify-between page-px pt-4 pb-2 shrink-0 ${headerClassName}`}>
                <div className="flex flex-col pr-4 min-w-0">
                  {title && (
                    <h2 className="text-section-title truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-secondary mt-0.5 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {headerRight}
                  {showCloseButton && (
                    <IconButton
                      icon={<Icon name="x" size={16} />}
                      onClick={onClose}
                      variant="muted"
                      size="sm"
                      aria-label="Stäng"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Content Body */}
            <div className={`flex-1 overflow-y-auto ${bodyClassName ?? 'page-px py-4 space-y-4'} text-[var(--text-primary)]`}>
              {children}
            </div>

            {/* Footer / Actions */}
            {footer && (
              <div className="page-px pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] bg-[var(--modal-bg,var(--bg-color))] shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined' || !document.body) return null;
  return createPortal(modalNode, document.body);
};
