import React from 'react';
import { TranslationKey } from '../i18n';
import { Button, Modal } from './ui';

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
  const displayConfirmText = confirmText || (t ? t('confirm') : 'Bekräfta');
  const displayCancelText = cancelText || (t ? t('cancel') : 'Avbryt');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      center
      size="xs"
      zIndex={130}
      showCloseButton={false}
      bodyClassName="p-6 sm:p-7 text-center"
    >
      <div className="relative z-10 text-center">
        <h2 className="text-section-title font-bold text-[var(--text-primary)] mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-secondary font-medium text-[var(--text-secondary)] mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-2.5">
          <Button 
            onClick={onConfirm} 
            variant={variant === 'danger' ? 'danger' : 'primary'}
            fullWidth
          >
            {displayConfirmText}
          </Button>
          <Button 
            onClick={onCancel}
            variant="secondary"
            fullWidth
          >
            {displayCancelText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
