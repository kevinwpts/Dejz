import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
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
  const dragControls = useDragControls();

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
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-xl',
    xl: 'sm:max-w-2xl',
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
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal / Bottom Sheet Card */}
          <motion.div
            initial={{ opacity: 0, y: center ? 16 : '100%', scale: center ? 0.96 : 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: center ? 16 : '100%', scale: center ? 0.96 : 1 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag={center ? false : 'y'}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.75 }}
            onDragEnd={(_e, info) => {
              if (!center && (info.offset.y > 70 || info.velocity.y > 350)) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${sizeStyles} bg-[var(--bg-color)] text-[var(--text-primary)] ${
              center ? 'rounded-[var(--radius-modal,24px)]' : 'rounded-t-[var(--radius-modal,24px)] sm:rounded-[var(--radius-modal,24px)]'
            } border-none shadow-modal max-h-[90dvh] sm:max-h-[85vh] flex flex-col z-10 overflow-hidden font-sans ${className}`}
          >
            {/* Mobile Drag Pill */}
            {!center && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                onClick={onClose}
                className="w-full pt-2.5 pb-1 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0"
              >
                <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton || headerRight) && (
              <div className={`flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-divider shrink-0 ${headerClassName}`}>
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
            <div className={`flex-1 overflow-y-auto min-h-0 ${bodyClassName ?? 'px-5 sm:px-6 py-4 space-y-4 custom-scrollbar'} text-[var(--text-primary)]`}>
              {children}
            </div>

            {/* Footer / Actions */}
            {footer && (
              <div className="px-5 sm:px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-divider bg-[var(--modal-bg,var(--bg-color))] shrink-0">
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
