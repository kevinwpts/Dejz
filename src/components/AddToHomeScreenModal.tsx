import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Download, MoreVertical, Smartphone } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { useScrollLock } from '../hooks/useScrollLock';
import { Button, Card, IconButton, SegmentedControl, Modal } from './ui';

interface AddToHomeScreenModalProps {
  t: (key: TranslationKey) => string;
  theme?: string;
  language?: string;
}

export function AddToHomeScreenModal({ language = 'sv' }: AddToHomeScreenModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  useScrollLock(isOpen);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setActivePlatform('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-add-to-home-screen', handleOpenModal);
    window.addEventListener('trigger-pwa-modal', handleOpenModal);

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setActivePlatform(isIosDevice ? 'ios' : 'android');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-add-to-home-screen', handleOpenModal);
      window.removeEventListener('trigger-pwa-modal', handleOpenModal);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('add-to-home-screen-dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsOpen(false);
    }
  };

  const stepTexts: Record<string, {
    title: string;
    desc: string;
    iosStep1Title: string;
    iosStep1Desc: string;
    iosStep2Title: string;
    iosStep2Desc: string;
    iosRowAction: string;
    iosHint: string;
    androidStep1Title: string;
    androidStep1Desc: string;
    androidStep2Title: string;
    androidStep2Desc: string;
    androidRowAction: string;
    androidHint: string;
    installBtn: string;
    maybeLater: string;
    gotIt: string;
  }> = {
    sv: {
      title: 'Spara som app',
      desc: 'Få snabb åtkomst i helskärm direkt från hemskärmen.',
      iosStep1Title: 'Tryck på Dela',
      iosStep1Desc: 'Längst ner i Safaris verktygsfält',
      iosStep2Title: 'Välj "Lägg till på hemskärmen"',
      iosStep2Desc: 'Skrolla ner i listan och tryck Lägg till',
      iosRowAction: 'Lägg till på hemskärmen',
      iosHint: 'Dela-knappen hittar du längst ner i Safari',
      androidStep1Title: 'Tryck på Menyn (⋮)',
      androidStep1Desc: 'Högst upp till höger i webbläsaren',
      androidStep2Title: 'Välj "Installera app"',
      androidStep2Desc: 'Tryck på Installera i listan som fälls ner',
      androidRowAction: 'Installera app',
      androidHint: 'Meny-knappen hittar du högst upp i Chrome',
      installBtn: 'Installera appen direkt',
      maybeLater: 'Kanske senare',
      gotIt: 'Jag förstår',
    },
    en: {
      title: 'Save as app',
      desc: 'Get fast fullscreen access right from your home screen.',
      iosStep1Title: 'Tap Share',
      iosStep1Desc: 'At the bottom of Safari toolbar',
      iosStep2Title: 'Select "Add to Home Screen"',
      iosStep2Desc: 'Scroll down and tap Add',
      iosRowAction: 'Add to Home Screen',
      iosHint: 'Find the Share button at the bottom of Safari',
      androidStep1Title: 'Tap Menu (⋮)',
      androidStep1Desc: 'At the top right corner of Chrome',
      androidStep2Title: 'Select "Install app"',
      androidStep2Desc: 'Tap Install in the dropdown menu',
      androidRowAction: 'Install app',
      androidHint: 'Find the Menu button at the top of Chrome',
      installBtn: 'Install app directly',
      maybeLater: 'Maybe later',
      gotIt: 'Got it',
    },
    no: {
      title: 'Lagre som app',
      desc: 'Få rask fullskjermtilgang direkte fra startskjermen.',
      iosStep1Title: 'Trykk på Del',
      iosStep1Desc: 'Nederst i Safaris verktøylinje',
      iosStep2Title: 'Velg «Legg til på startskjerm»',
      iosStep2Desc: 'Rull ned og trykk Legg til',
      iosRowAction: 'Legg til på startskjerm',
      iosHint: 'Del-knappen finner du nederst i Safari',
      androidStep1Title: 'Trykk på Meny (⋮)',
      androidStep1Desc: 'Øverst til høyre i nettleseren',
      androidStep2Title: 'Velg «Installer app»',
      androidStep2Desc: 'Trykk Installer i menyen som felles ned',
      androidRowAction: 'Installer app',
      androidHint: 'Meny-knappen finner du øverst i Chrome',
      installBtn: 'Installer appen',
      maybeLater: 'Kanskje senere',
      gotIt: 'Skjønner',
    },
    da: {
      title: 'Gem som app',
      desc: 'Få hurtig fuldskærmsadgang direkte fra hjemmeskærmen.',
      iosStep1Title: 'Tryk på Del',
      iosStep1Desc: 'Nederst i Safaris værktøjslinje',
      iosStep2Title: 'Vælg "Føj til hjemmeskærm"',
      iosStep2Desc: 'Rul ned og tryk Tilføj',
      iosRowAction: 'Føj til hjemmeskærm',
      iosHint: 'Del-knappen findes nederst i Safari',
      androidStep1Title: 'Tryk på Menu (⋮)',
      androidStep1Desc: 'Øverst til højre i browseren',
      androidStep2Title: 'Vælg "Installer app"',
      androidStep2Desc: 'Tryk på Installer i menuen',
      androidRowAction: 'Installer app',
      androidHint: 'Menu-knappen findes øverst i Chrome',
      installBtn: 'Installer appen',
      maybeLater: 'Måske senere',
      gotIt: 'Forstået',
    },
    fi: {
      title: 'Tallenna sovelluksena',
      desc: 'Nopea koko näytön käyttö suoraan kotinäytöltäsi.',
      iosStep1Title: 'Paina Jaa',
      iosStep1Desc: 'Safarin alapalkissa',
      iosStep2Title: 'Valitse "Lisää aloitusnäyttöön"',
      iosStep2Desc: 'Vieritä alas ja paina Lisää',
      iosRowAction: 'Lisää aloitusnäyttöön',
      iosHint: 'Jaa-painike löytyy Safarin alareunasta',
      androidStep1Title: 'Paina Valikko (⋮)',
      androidStep1Desc: 'Selaimen oikeassa yläkulmassa',
      androidStep2Title: 'Valitse "Asenna sovellus"',
      androidStep2Desc: 'Paina valikosta Asenna',
      androidRowAction: 'Asenna sovellus',
      androidHint: 'Valikkopainike löytyy Chromen yläreunasta',
      installBtn: 'Asenna sovellus',
      maybeLater: 'Ehkä myöhemmin',
      gotIt: 'Selvä',
    },
  };

  const localized = stepTexts[language] || stepTexts.sv;

  if (isStandalone) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xs"
      showCloseButton={false}
      bodyClassName="p-6 sm:p-7 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-7 relative"
    >
      {/* Close Button */}
      <div className="absolute top-4 right-5 z-20">
        <IconButton
          variant="surface"
          size="md"
          shape="circle"
          onClick={handleClose}
          aria-label="Stäng"
          icon={<X size={16} strokeWidth={2} />}
        />
      </div>

      {/* Header: Title & Description */}
      <div className="flex flex-col items-center text-center mb-5 pt-1">
        <h3 className="text-page-title font-bold font-display tracking-tight text-[var(--text-primary)]">
          {localized.title}
        </h3>
        <p className="text-secondary font-medium text-[var(--text-secondary)] mt-1 max-w-[280px] mx-auto leading-relaxed">
          {localized.desc}
        </p>
      </div>

      {/* Platform Switcher */}
      <div className="mb-5">
        <SegmentedControl
          size="sm"
          value={activePlatform}
          onChange={(val) => setActivePlatform(val as 'ios' | 'android')}
          options={[
            {
              value: 'ios',
              label: 'Apple',
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.96 0-1.76-.43-2.6-.43-.88 0-1.76.43-2.72.43-1.56 0-3.01-1.2-3.71-2.48-1.42-2.54-.37-6.32 1.01-8.31.69-1 1.76-1.63 2.92-1.63 1.15 0 1.83.47 2.76.47s1.48-.47 2.75-.47c1.02 0 2.05.54 2.7 1.34-2.32 1.33-1.93 4.67.43 5.7-.56 1.46-1.32 2.9-2.64 4.02-.4.36-.93.91-1.4.91zm-3.03-14.77c0-1.26.8-2.61 2.02-3.51-1.12.06-2.39.78-3.12 1.88-.66.97-.66 2.27 0 3.51 1.25-.13 2.02-1.03 2.02-1.88z" />
                </svg>
              ),
            },
            {
              value: 'android',
              label: 'Android',
              icon: <Smartphone size={14} />,
            },
          ]}
        />
      </div>

      {deferredPrompt && activePlatform === 'android' ? (
        <div className="w-full space-y-2.5">
          <Button
            variant="accent"
            size="lg"
            fullWidth
            icon={<Download size={18} strokeWidth={2} />}
            onClick={handleInstallClick}
          >
            {localized.installBtn}
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={handleClose}
          >
            {localized.maybeLater}
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="space-y-2.5">
            {/* Step 1 */}
            <Card variant="default" padding="sm" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-icon-button bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] font-display font-bold text-secondary shrink-0">
                1
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-secondary font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  {activePlatform === 'ios' ? <Share size={13} className="text-[var(--accent-color)]" /> : <MoreVertical size={13} className="text-[var(--accent-color)]" />}
                  {activePlatform === 'ios' ? localized.iosStep1Title : localized.androidStep1Title}
                </div>
                <div className="text-label text-[var(--text-secondary)] truncate">
                  {activePlatform === 'ios' ? localized.iosStep1Desc : localized.androidStep1Desc}
                </div>
              </div>
            </Card>

            {/* Step 2 */}
            <Card variant="default" padding="sm" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-icon-button bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] font-display font-bold text-secondary shrink-0">
                2
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-secondary font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <PlusSquare size={13} className="text-[var(--text-primary)]" />
                  {activePlatform === 'ios' ? localized.iosStep2Title : localized.androidStep2Title}
                </div>
                <div className="text-label text-[var(--text-secondary)] truncate">
                  {activePlatform === 'ios' ? localized.iosStep2Desc : localized.androidStep2Desc}
                </div>
              </div>
            </Card>
          </div>

          <Button
            variant="accent"
            size="lg"
            fullWidth
            onClick={handleClose}
          >
            {localized.gotIt}
          </Button>
        </div>
      )}
    </Modal>
  );
}

