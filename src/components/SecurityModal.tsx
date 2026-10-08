import React, { useState, useEffect } from 'react';
import { Lock, Smartphone, Fingerprint } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { hasPin, removePin, isBiometricsEnabled, setBiometricsEnabled } from '../utils/security';
import { PinLockScreen } from './PinLockScreen';
import { ToggleSwitch } from './ToggleSwitch';
import { Modal } from './ui';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: TranslationKey) => string;
  addToast: (message: string, type: 'success' | 'error') => void;
  _userEmail?: string;
}

export function SecurityModal({ isOpen, onClose, t, addToast }: SecurityModalProps) {
  const [view, setView] = useState<'menu' | 'pin-setup' | 'pin-disable'>('menu');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricsEnabled, setBiometricsState] = useState(false);

  useEffect(() => {
    setPinEnabled(hasPin());
    setBiometricsState(isBiometricsEnabled());
  }, [isOpen, view]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      center
      size="sm"
      showCloseButton={true}
      bodyClassName="p-6 sm:p-7 text-center"
    >
      <div className="text-center">
        <div className="w-12 h-12 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] rounded-[8px] flex items-center justify-center mx-auto mb-4 border border-black/5 dark:border-white/10">
          <Lock size={24} strokeWidth={2} />
        </div>

        <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)] mb-5">
          {t('security')}
        </h2>

        {view === 'menu' && (
          <div className="space-y-2.5">
            <div className="w-full flex items-center justify-between p-3.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[8px]">
              <div className="flex items-center gap-3">
                <Smartphone size={18} strokeWidth={2} className="text-[var(--text-secondary)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">{t('appLock')}</span>
              </div>
              <ToggleSwitch
                isOn={pinEnabled}
                onToggle={() => setView(pinEnabled ? 'pin-disable' : 'pin-setup')}
              />
            </div>

            {pinEnabled && (
              <div className="w-full flex items-center justify-between p-3.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-[8px]">
                <div className="flex items-center gap-3">
                  <Fingerprint size={18} strokeWidth={2} className="text-[var(--text-secondary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{t('biometrics')}</span>
                </div>
                <ToggleSwitch
                  isOn={biometricsEnabled}
                  onToggle={toggleBiometrics}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
