import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Lock, X, Smartphone, Fingerprint } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { hasPin, removePin, isBiometricsEnabled, setBiometricsEnabled } from '../utils/security';
import { PinLockScreen } from './PinLockScreen';
import { useScrollLock } from '../hooks/useScrollLock';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: TranslationKey) => string;
  addToast: (message: string, type: 'success' | 'error') => void;
  _userEmail?: string;
}

export function SecurityModal({ isOpen, onClose, t, addToast, _userEmail }: SecurityModalProps) {
  useScrollLock(isOpen);
  const [view, setView] = useState<'menu' | 'pin-setup' | 'pin-disable'>('menu');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricsEnabled, setBiometricsState] = useState(false);

  useEffect(() => {
    setPinEnabled(hasPin());
    setBiometricsState(isBiometricsEnabled());
  }, [isOpen, view]);

  if (!isOpen) return null;

  const toggleBiometrics = () => {
    const newState = !biometricsEnabled;
    setBiometricsEnabled(newState);
    setBiometricsState(newState);
    addToast(t('saved'), 'success');
  };

  if (view === 'pin-setup') {
    return (
      <PinLockScreen
        mode="setup"
        t={t}
        onSuccess={() => {
          addToast(t('pinSet'), 'success');
          setView('menu');
        }}
        onCancel={() => setView('menu')}
      />
    );
  }

  if (view === 'pin-disable') {
    return (
      <PinLockScreen
        mode="disable"
        t={t}
        onSuccess={() => {
          removePin();
          addToast(t('pinRemoved'), 'success');
          setView('menu');
        }}
        onCancel={() => setView('menu')}
      />
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[var(--bg-color)] w-full max-w-sm rounded-[28px] p-6 sm:p-7 relative border-none shadow-2xl font-sans"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="absolute right-4 top-4">
            <button 
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer border-none shadow-none"
              aria-label={t('close')}
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] rounded-[14px] flex items-center justify-center mx-auto mb-4 border border-black/5 dark:border-white/10">
            <Lock size={24} />
          </div>

          <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)] mb-5">
            {t('security')}
          </h2>

          {view === 'menu' && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setView(pinEnabled ? 'pin-disable' : 'pin-setup')}
                className="w-full flex items-center justify-between p-3.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className="text-[var(--text-secondary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{t('appLock')}</span>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-all ${pinEnabled ? 'bg-[var(--accent-color)]' : 'bg-black/20 dark:bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${pinEnabled ? 'translate-x-4' : 'translate-x-0'} shadow-xs`} />
                </div>
              </button>

              {pinEnabled && (
                <button
                  type="button"
                  onClick={toggleBiometrics}
                  className="w-full flex items-center justify-between p-3.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[14px] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Fingerprint size={18} className="text-[var(--text-secondary)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{t('biometrics')}</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-all ${biometricsEnabled ? 'bg-[var(--accent-color)]' : 'bg-black/20 dark:bg-white/20'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${biometricsEnabled ? 'translate-x-4' : 'translate-x-0'} shadow-xs`} />
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

