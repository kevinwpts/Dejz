import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Modal, Button, Input } from './ui';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  t: (key: TranslationKey) => string;
  isSocialUser?: boolean;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm, t }: DeleteAccountModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetWord = 'RADERA';
  const isMatch = confirmInput.trim().toUpperCase() === targetWord || confirmInput.trim().toUpperCase() === 'DELETE';

  const handleConfirm = async () => {
    if (!isMatch) {
      setError(`Skriv "${targetWord}" för att bekräfta raderingen.`);
      return;
    }
    
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || t('error'));
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      center
      size="sm"
      showCloseButton={true}
      bodyClassName="p-6 sm:p-7 text-center"
    >
      <div className="text-center">
        <div className="w-12 h-12 bg-[var(--danger-container)] text-[var(--danger-color)] rounded-[var(--radius-card-nested,12px)] flex items-center justify-center mx-auto mb-4 border border-[var(--danger-color)]/20 shadow-none">
          <AlertCircle size={22} strokeWidth={2} />
        </div>

        <h2 className="text-section-title font-bold text-[var(--text-primary)] mb-2">
          {t('deleteAccount')}
        </h2>
        <p className="text-secondary font-medium text-[var(--text-secondary)] mb-5 leading-relaxed">
          {t('deleteAccountConfirm')}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5 text-left">
            <Input
              label={<span>Skriv <span className="font-extrabold text-[var(--text-primary)] select-all tracking-wider">RADERA</span> för att bekräfta</span>}
              type="text"
              value={confirmInput}
              onChange={(e) => {
                setConfirmInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="RADERA"
              error={error || undefined}
              autoCapitalize="characters"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={handleConfirm}
              disabled={!isMatch || isDeleting}
              loading={isDeleting}
            >
              {t('deleteAccount')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={onClose}
              disabled={isDeleting}
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
