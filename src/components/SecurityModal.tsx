import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Lock, X, Smartphone, Fingerprint } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { hasPin, removePin, isBiometricsEnabled, setBiometricsEnabled } from '../utils/security';
import { PinLockScreen } from './PinLockScreen';
import { useScrollLock } from '../hooks/useScrollLock';
import { IconButton } from './ui';

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
            className="bg-white dark:bg-[#2D2D2D] w-full max-w-sm rounded-[24px] p-6 sm:p-8 relative border border-black/[0.08] dark:border-white/[0.08] shadow-2xl"
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
          <div className="w-14 h-14 bg-black/5 dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white rounded-[16px] flex items-center justify-center mx-auto mb-5 border border-black/10 dark:border-white/10">
            <Lock size={28} />
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#1C1917] dark:text-white mb-5">
            {t('security')}
          </h2>

          {view === 'menu' && (
            <div className="space-y-3">
              <button
                onClick={() => setView(pinEnabled ? 'pin-disable' : 'pin-setup')}
                className="w-full flex items-center justify-between p-4 bg-[var(--bg-color)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Smartphone size={20} className="text-[var(--text-secondary)]" />
                  <span className="font-semibold text-[var(--text-primary)]">{t('appLock')}</span>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-all ${pinEnabled ? 'bg-accent' : 'bg-[var(--border-color)]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${pinEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>

              {pinEnabled && (
                <button
                  onClick={toggleBiometrics}
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg-color)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Fingerprint size={20} className="text-[var(--text-secondary)]" />
                    <span className="font-semibold text-[var(--text-primary)]">{t('biometrics')}</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-all ${biometricsEnabled ? 'bg-accent' : 'bg-[var(--border-color)]'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${biometricsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
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

