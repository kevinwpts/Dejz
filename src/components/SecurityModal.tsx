import React, { useState, useEffect } from 'react';
import { Lock, Smartphone, Fingerprint } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { hasPin, removePin, isBiometricsEnabled, setBiometricsEnabled } from '../utils/security';
import { PinLockScreen } from './PinLockScreen';
import { Modal, Card, ListRow, Switch } from './ui';

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
        <div className="w-12 h-12 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] rounded-[var(--radius-card-nested,10px)] flex items-center justify-center mx-auto mb-4 border border-subtle">
          <Lock size={24} strokeWidth={2} />
        </div>

        <h2 className="text-section-title font-bold text-[var(--text-primary)] mb-5">
          {t('security')}
        </h2>

        {view === 'menu' && (
          <Card variant="nested" padding="none" className="divide-y divide-subtle text-left">
            <ListRow
              variant="grouped"
              icon={<Smartphone size={18} strokeWidth={2} />}
              iconBg="bg-transparent"
              iconColor="text-[var(--text-secondary)]"
              title={t('appLock')}
              control={
                <Switch
                  checked={pinEnabled}
                  onChange={() => setView(pinEnabled ? 'pin-disable' : 'pin-setup')}
                  aria-label={t('appLock')}
                />
              }
            />

            {pinEnabled && (
              <ListRow
                variant="grouped"
                icon={<Fingerprint size={18} strokeWidth={2} />}
                iconBg="bg-transparent"
                iconColor="text-[var(--text-secondary)]"
                title={t('biometrics')}
                control={
                  <Switch
                    checked={biometricsEnabled}
                    onChange={toggleBiometrics}
                    aria-label={t('biometrics')}
                  />
                }
              />
            )}
          </Card>
        )}
      </div>
    </Modal>
  );
}
