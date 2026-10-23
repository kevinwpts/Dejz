import React, { useState, useEffect } from 'react';
import { Smartphone, Fingerprint } from 'lucide-react';
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
  sandboxMode?: boolean;
}

export function SecurityModal({ isOpen, onClose, t, addToast, sandboxMode = false }: SecurityModalProps) {
  const [view, setView] = useState<'menu' | 'pin-setup' | 'pin-disable'>('menu');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricsEnabled, setBiometricsState] = useState(false);

  useEffect(() => {
    if (!sandboxMode) {
      setPinEnabled(hasPin());
      setBiometricsState(isBiometricsEnabled());
    }
  }, [isOpen, view, sandboxMode]);

  const toggleBiometrics = () => {
    const newState = !biometricsEnabled;
    if (!sandboxMode) {
      setBiometricsEnabled(newState);
    }
    setBiometricsState(newState);
    addToast(t('saved'), 'success');
  };

  if (view === 'pin-setup') {
    return (
      <PinLockScreen
        mode="setup"
        t={t}
        onSuccess={() => {
          if (sandboxMode) setPinEnabled(true);
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
          if (!sandboxMode) {
            removePin();
          } else {
            setPinEnabled(false);
          }
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
      title={t('security')}
      showCloseButton={true}
      bodyClassName="p-5 sm:p-6"
    >
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
    </Modal>
  );
}
