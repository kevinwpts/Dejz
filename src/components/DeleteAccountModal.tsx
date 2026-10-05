import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Modal } from './ui';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password?: string) => Promise<void>;
  t: (key: TranslationKey) => string;
  isSocialUser?: boolean;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm, t, isSocialUser }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!isSocialUser && !password) {
      setError(t('passwordRequired'));
      return;
    }
    
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(isSocialUser ? undefined : password);
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
        <div className="w-12 h-12 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] rounded-[14px] flex items-center justify-center mx-auto mb-4 border border-black/5 dark:border-white/10 shadow-none">
          <AlertCircle size={22} strokeWidth={2} />
        </div>

        <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)] mb-2">
          {t('deleteAccount')}
        </h2>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-5 leading-relaxed">
          {t('deleteAccountConfirm')}
        </p>

        <div className="space-y-4">
          {!isSocialUser && (
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-[var(--text-secondary)] ml-0.5">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-4 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent-color)]"
                placeholder={t('password')}
              />
            </div>
          )}

          {isSocialUser && (
            <div className="bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 p-3.5 rounded-[14px] text-left mb-3">
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Tips för Google-användare</p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Vi kommer att försöka koppla bort appen från ditt Google-konto automatiskt. Om det misslyckas kan du behöva göra det manuellt i dina Google-inställningar.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs font-medium text-[var(--text-secondary)] text-left ml-1">{error}</p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="w-full h-12 rounded-[14px] bg-black dark:bg-white text-white dark:text-black font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-90"
            >
              <span>{isDeleting ? t('loading') : t('deleteAccount')}</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full h-11 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5"
            >
              <span>{t('cancel')}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
