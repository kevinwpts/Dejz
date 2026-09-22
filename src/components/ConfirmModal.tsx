import React from 'react';
import { motion } from 'motion/react';

import { AlertCircle } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

import { TranslationKey } from '../i18n';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
  t: (key: TranslationKey) => string;
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
  if (!isOpen) return null;

  const displayConfirmText = confirmText || t('confirm');
  const displayCancelText = cancelText || t('cancel');

  const confirmBg = variant === 'danger' ? 'bg-danger' : 'bg-accent';
  const _confirmShadow = '';
  const iconColor = variant === 'danger' ? 'text-danger' : 'text-accent';
  const iconBg = variant === 'danger' ? 'bg-danger/10' : 'bg-accent/10';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[var(--bg-color)] backdrop-blur-xl w-full max-w-sm rounded-[24px] p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto border border-[var(--border-color)] overscroll-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 text-center">
          <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-[18px] flex items-center justify-center mx-auto mb-5 border border-[var(--border-color)] shadow-xs`}>
            <AlertCircle size={28} strokeWidth={1.5} />
          </div>

          <h2 className="text-heading-md text-[var(--text-primary)] mb-2 tracking-tight">
            {title}
          </h2>
          <p className="text-body-sm font-medium text-[var(--text-secondary)] mb-6 leading-relaxed opacity-70 tracking-tight">
            {message}
          </p>

          <div className="flex flex-col gap-2.5">
            <button 
              onClick={onConfirm} 
              className={`w-full ${confirmBg} text-[var(--text-on-accent)] py-3.5 h-auto rounded-[14px] font-bold text-sm active:scale-95 transition-all shadow-xs uppercase`}
            >
              {displayConfirmText}
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-2.5 rounded-[12px] font-semibold text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition-all uppercase"
            >
              {displayCancelText}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
