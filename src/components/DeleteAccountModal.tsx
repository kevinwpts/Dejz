import React, { useState } from 'react';
import { motion } from 'motion/react';

import { AlertCircle, X, Loader2 } from 'lucide-react';
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
        className="bg-[var(--surface-solid)] w-full max-w-sm rounded-xl p-8 relative border-[0.5px] border-[var(--border-color)] pt-[env(safe-area-inset-top)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-danger/10 text-danger rounded-[12px] flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
            {t('deleteAccount')}
          </h2>
          <p className="text-sm font-semibold text-[var(--text-secondary)] mb-6 leading-relaxed">
            {t('deleteAccountConfirm')}
          </p>

          <div className="space-y-4">
            {!isSocialUser && (
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold text-[var(--text-secondary)] ml-1">
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--surface-muted)] border border-transparent rounded-[22px] px-6 py-4 text-[15px] font-semibold text-[var(--text-primary)] focus:bg-[var(--surface-color)] focus:border-danger/20 shadow-sm outline-none transition-all placeholder-[var(--text-secondary)]/30"
                  placeholder={t('password')}
                />
              </div>
            )}

            {isSocialUser && (
              <div className="bg-warning/10 border-[0.5px] border-warning/20 p-4 rounded-xl text-left mb-4">
                <p className="text-xs font-semibold text-warning mb-1">Tips för Google-användare</p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
                  Vi kommer att försöka koppla bort appen från ditt Google-konto automatiskt. Om det misslyckas kan du behöva göra det manuellt i dina Google-inställningar.
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs font-semibold text-danger text-left ml-1">{error}</p>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button 
                onClick={handleConfirm}
                disabled={isDeleting}
                className="w-full bg-danger text-[var(--text-primary)] py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="div-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  t('deleteAccount')
                )}
              </button>
              <button 
                onClick={onClose}
                disabled={isDeleting}
                className="w-full py-3 rounded-xl font-semibold text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-color)] transition-all"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
