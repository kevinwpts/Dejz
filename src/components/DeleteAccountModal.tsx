import React, { useState } from 'react';
import { motion } from 'motion/react';

import { AlertCircle, X } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { useScrollLock } from '../hooks/useScrollLock';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password?: string) => Promise<void>;
  t: (key: TranslationKey) => string;
  isSocialUser?: boolean;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm, t, isSocialUser }: DeleteAccountModalProps) {
  useScrollLock(isOpen);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-[#1C1C1C] w-full max-w-sm rounded-[28px] p-6 sm:p-7 relative border border-black/[0.08] dark:border-white/[0.08] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-4 top-4">
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-[#222222] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label={t('close')}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-[14px] flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-none">
            <AlertCircle size={24} />
          </div>

          <h2 className="text-base sm:text-lg font-bold font-display uppercase tracking-wider text-[var(--text-primary)] mb-2">
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
                  className="w-full h-12 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] px-4 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-rose-500"
                  placeholder={t('password')}
                />
              </div>
            )}

            {isSocialUser && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-[14px] text-left mb-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Tips för Google-användare</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  Vi kommer att försöka koppla bort appen från ditt Google-konto automatiskt. Om det misslyckas kan du behöva göra det manuellt i dina Google-inställningar.
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 text-left ml-1">{error}</p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button 
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="w-full h-12 rounded-[14px] bg-rose-600 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:bg-rose-500"
              >
                <span>{isDeleting ? t('loading') : t('deleteAccount')}</span>
              </button>
              <button 
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="w-full h-11 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
              >
                <span>{t('cancel')}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
