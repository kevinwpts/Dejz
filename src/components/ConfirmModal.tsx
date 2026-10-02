import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { TranslationKey } from '../i18n';
import { Button } from './ui';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
  t?: (key: TranslationKey) => string;
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  onConfirm, 
  onCancel, 
  variant = 'danger',
  t
}: ConfirmModalProps) {
  useScrollLock(isOpen);
  if (!isOpen || typeof document === 'undefined') return null;

  const displayConfirmText = confirmText || (t ? t('confirm') : 'Bekräfta');
  const displayCancelText = cancelText || (t ? t('cancel') : 'Avbryt');

  const isDanger = variant === 'danger';
  const iconColor = isDanger ? 'text-danger' : 'text-[var(--accent-color)]';
  const iconBg = isDanger ? 'bg-danger/10 border-danger/20' : 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/20';

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-[#353535] w-full max-w-sm rounded-[28px] p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto border border-black/[0.08] dark:border-white/[0.08] overscroll-contain shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 text-center">
          <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-[16px] flex items-center justify-center mx-auto mb-4 border shadow-xs`}>
            <AlertCircle size={28} strokeWidth={1.75} />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-6 leading-relaxed opacity-80">
            {message}
          </p>

          <div className="flex flex-col gap-2.5">
            <Button 
              onClick={onConfirm} 
              variant={isDanger ? 'danger' : 'primary'}
              fullWidth
            >
              {displayConfirmText}
            </Button>
            <Button 
              onClick={onCancel}
              variant="ghost"
              fullWidth
            >
              {displayCancelText}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
