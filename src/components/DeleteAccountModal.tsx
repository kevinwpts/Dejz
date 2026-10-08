import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Modal } from './ui';

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
        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-[8px] flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-none">
          <AlertCircle size={22} strokeWidth={2} />
        </div>

        <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)] mb-2">
          {t('deleteAccount')}
        </h2>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-5 leading-relaxed">
          {t('deleteAccountConfirm')}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
              Skriv <span className="font-extrabold text-[var(--text-primary)] select-all tracking-wider">RADERA</span> för att bekräfta
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => {
                setConfirmInput(e.target.value);
                if (error) setError(null);
              }}
              className="w-full h-12 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[8px] px-4 text-sm font-bold tracking-wider text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-red-500/50"
              placeholder="RADERA"
              autoCapitalize="characters"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-500 text-left ml-1">{error}</p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting || !isMatch}
              className="w-full h-12 rounded-[8px] bg-red-500 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:bg-red-600"
            >
              <span>{isDeleting ? t('loading') : t('deleteAccount')}</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full h-11 rounded-[8px] bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5"
            >
              <span>{t('cancel')}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
