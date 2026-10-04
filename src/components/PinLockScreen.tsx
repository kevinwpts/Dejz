import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

import { Lock, Delete, Fingerprint, X } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { verifyPin, setPin as savePin, isBiometricsEnabled } from '../utils/security';
import { useScrollLock } from '../hooks/useScrollLock';

interface PinLockScreenProps {
  mode: 'unlock' | 'setup' | 'disable';
  onSuccess: () => void;
  onCancel?: () => void;
  t: (key: TranslationKey) => string;
}

export function PinLockScreen({ mode, onSuccess, onCancel, t }: PinLockScreenProps) {
  useScrollLock(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'create' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'setup') {
      setStep('create');
    } else {
      setStep('enter');
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'unlock' && isBiometricsEnabled()) {
      // In a real app, we would trigger biometric prompt here
      // For now, we just show the icon
    }
  }, [mode]);

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);

      if (newPin.length === 4) {
        handlePinComplete(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  const handlePinComplete = (completedPin: string) => {
    if (mode === 'unlock' || mode === 'disable') {
      if (verifyPin(completedPin)) {
        onSuccess();
      } else {
        setError(t('wrongPin'));
        setTimeout(() => setPin(''), 500);
      }
    } else if (mode === 'setup') {
      if (step === 'create') {
        setConfirmPin(completedPin);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (completedPin === confirmPin) {
          savePin(completedPin);
          onSuccess();
        } else {
          setError(t('pinMismatch'));
          setTimeout(() => {
            setPin('');
            setConfirmPin('');
            setStep('create');
          }, 1000);
        }
      }
    }
  };

  const getTitle = () => {
    if (mode === 'unlock') return t('unlock');
    if (mode === 'disable') return t('enterPin');
    if (step === 'create') return t('createPin');
    return t('confirmPin');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col items-center justify-center p-4 font-sans select-none"
    >
      {onCancel && (
        <button 
          type="button"
          onClick={onCancel}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/5 dark:bg-[#222222] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Stäng"
        >
          <X size={17} strokeWidth={2.2} />
        </button>
      )}

      <div className="mb-8 flex flex-col items-center">
        <div className="w-14 h-14 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] border border-black/5 dark:border-white/10 rounded-[16px] flex items-center justify-center mb-5 shadow-xs">
          <Lock size={26} />
        </div>
        <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-[var(--text-primary)] mb-1 text-center">
          {getTitle()}
        </h2>
        <p className="text-[var(--text-secondary)] h-5 text-xs font-medium">
          {error || (step === 'confirm' ? t('confirmPin') : '')}
        </p>
      </div>

      <div className="flex gap-4 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
              i < pin.length 
                ? 'bg-[var(--text-primary)] scale-110' 
                : 'bg-black/15 dark:bg-white/20'
            } ${error ? 'bg-rose-500' : ''}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5 max-w-[280px] w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberClick(num)}
            className="w-16 h-16 rounded-full text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] bg-white dark:bg-[#1C1C1C] hover:bg-black/5 dark:hover:bg-[#222222] active:scale-[0.92] transition-all flex items-center justify-center border border-black/5 dark:border-white/10 shadow-xs cursor-pointer"
          >
            {num}
          </button>
        ))}
        <div className="flex items-center justify-center">
          {mode === 'unlock' && isBiometricsEnabled() && (
            <button 
              type="button"
              className="w-16 h-16 text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
            >
              <Fingerprint size={28} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleNumberClick(0)}
          className="w-16 h-16 rounded-full text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] bg-white dark:bg-[#1C1C1C] hover:bg-black/5 dark:hover:bg-[#222222] active:scale-[0.92] transition-all flex items-center justify-center border border-black/5 dark:border-white/10 shadow-xs cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="w-16 h-16 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-[0.92] transition-all flex items-center justify-center cursor-pointer"
        >
          <Delete size={22} />
        </button>
      </div>
    </motion.div>
  );
}
