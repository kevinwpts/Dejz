import React, { useState } from 'react';
import { motion } from 'motion/react';

import { AlertCircle, X } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { useScrollLock } from '../hooks/useScrollLock';
import { Button, IconButton } from './ui';

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
        className="bg-white dark:bg-[#222222] w-full max-w-sm rounded-[24px] p-6 sm:p-8 relative border border-black/[0.08] dark:border-white/[0.08] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-4 top-4">
          <IconButton 
            icon={<X size={18} />}
            onClick={onClose}
            variant="muted"
            size="sm"
            aria-label={t('close')}
          />
        </div>

        <div className="text-center">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-[16px] flex items-center justify-center mx-auto mb-5 border border-rose-500/20 shadow-xs">
            <AlertCircle size={28} />
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#1C1917] dark:text-white mb-2">
            {t('deleteAccount')}
          </h2>
          <p className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8] mb-5 leading-relaxed">
            {t('deleteAccountConfirm')}
          </p>

          <div className="space-y-4">
            {!isSocialUser && (
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5">
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[48px] bg-black/5 dark:bg-[#222222] border border-black/10 dark:border-white/10 focus:border-[#1C1917] dark:focus:border-white rounded-[14px] px-4 text-sm font-semibold text-[#1C1917] dark:text-white placeholder-[#8C867C] dark:placeholder-[#71717A] outline-none transition-all"
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
              <Button 
                onClick={handleConfirm}
                disabled={isDeleting}
                loading={isDeleting}
                variant="danger"
                fullWidth
                size="lg"
              >
                {t('deleteAccount')}
              </Button>
              <Button 
                onClick={onClose}
                disabled={isDeleting}
                variant="ghost"
                fullWidth
                size="md"
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
