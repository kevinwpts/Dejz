import React from 'react';
import { AlertCircle } from 'lucide-react';
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
  variant: _variant = 'danger',
  t
}: ConfirmModalProps) {
  const displayConfirmText = confirmText || (t ? t('confirm') : 'Bekräfta');
  const displayCancelText = cancelText || (t ? t('cancel') : 'Avbryt');

  const isDanger = _variant === 'danger';
  const iconColor = isDanger ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]';
  const iconBg = isDanger ? 'bg-[var(--danger-container)] border-transparent' : 'bg-[var(--accent-container)] border-transparent';

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
        <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-[var(--radius-card-nested,10px)] flex items-center justify-center mx-auto mb-4 border shadow-none`}>
          <AlertCircle size={28} strokeWidth={2} />
        </div>

        <h2 className="text-section-title font-bold text-[var(--text-primary)] mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-secondary font-medium text-[var(--text-secondary)] mb-6 leading-relaxed opacity-80">
          {message}
        </p>

        <div className="flex flex-col gap-2.5">
          <Button 
            onClick={onConfirm} 
            variant="primary"
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
