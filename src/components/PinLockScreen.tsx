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
      className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col items-center justify-center p-4"
    >
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-[var(--text-secondary)]"
        >
          <X size={24} />
        </button>
      )}

      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          {getTitle()}
        </h2>
        <p className="text-[var(--text-secondary)] h-6 text-sm font-medium">
          {error || (step === 'confirm' ? t('confirmPin') : '')}
        </p>
      </div>

      <div className="flex gap-4 mb-12">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              i < pin.length 
                ? 'bg-[var(--text-primary)] scale-110' 
                : 'bg-[var(--border-color)]'
            } ${error ? 'bg-danger' : ''}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-[280px] w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="w-16 h-16 rounded-full text-2xl font-semibold text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--bg-hover)] active:scale-95 transition-all flex items-center justify-center border border-[var(--border-color)]"
          >
            {num}
          </button>
        ))}
        <div className="flex items-center justify-center">
          {mode === 'unlock' && isBiometricsEnabled() && (
            <button className="w-16 h-16 text-[var(--text-primary)] flex items-center justify-center">
              <Fingerprint size={32} />
            </button>
          )}
        </div>
        <button
          onClick={() => handleNumberClick(0)}
          className="w-16 h-16 rounded-full text-2xl font-semibold text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--bg-hover)] active:scale-95 transition-all flex items-center justify-center border border-[var(--border-color)]"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center justify-center"
        >
          <Delete size={24} />
        </button>
      </div>
    </motion.div>
  );
}
