import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share, PlusSquare, X, Download, MoreVertical, Smartphone } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { useScrollLock } from '../hooks/useScrollLock';

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
    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setActivePlatform('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Custom event to trigger opening this modal from anywhere
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-add-to-home-screen', handleOpenModal);
    window.addEventListener('trigger-pwa-modal', handleOpenModal);

    // Check if running in standalone mode (already installed as PWA)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    // Check device type
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setActivePlatform(isIosDevice ? 'ios' : 'android');

    // We don't auto-open here anymore based on a fixed timer on mount
    // It's now handled by the 'trigger-pwa-modal' event from App.tsx

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

  // Clean localized texts
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
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/60 backdrop-blur-md"
          onClick={handleClose}
        >
            <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="bg-white dark:bg-[#242424] w-full max-w-[420px] rounded-t-[28px] sm:rounded-[26px] p-6 sm:p-7 border-t sm:border border-[#E6E2D8] dark:border-[#383838] shadow-2xl relative overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle for mobile */}
            <div className="w-10 h-1 bg-[#D6D1C7] dark:bg-[#3D3D3D] rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

            {/* Close Button */}
            <button 
              onClick={handleClose}
              aria-label="Stäng"
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] hover:bg-[#EDE9DF] dark:hover:bg-[#383838] text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white flex items-center justify-center transition-all active:scale-90 z-20 cursor-pointer"
            >
              <X size={16} strokeWidth={2} />
            </button>

            {/* Header: Title & Description */}
            <div className="flex flex-col items-center text-center mb-6 pt-1">
              <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {localized.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] opacity-70 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                {localized.desc}
              </p>
            </div>

            {/* Platform Switcher */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 bg-[var(--surface-muted)] rounded-[14px] border border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setActivePlatform('ios')}
                  className={`py-2 px-5 rounded-[10px] transition-all flex items-center gap-2.5 text-xs font-bold cursor-pointer ${
                    activePlatform === 'ios'
                      ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs border border-[var(--border-color)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.96 0-1.76-.43-2.6-.43-.88 0-1.76.43-2.72.43-1.56 0-3.01-1.2-3.71-2.48-1.42-2.54-.37-6.32 1.01-8.31.69-1 1.76-1.63 2.92-1.63 1.15 0 1.83.47 2.76.47s1.48-.47 2.75-.47c1.02 0 2.05.54 2.7 1.34-2.32 1.33-1.93 4.67.43 5.7-.56 1.46-1.32 2.9-2.64 4.02-.4.36-.93.91-1.4.91zm-3.03-14.77c0-1.26.8-2.61 2.02-3.51-1.12.06-2.39.78-3.12 1.88-.66.97-.66 2.27 0 3.51 1.25-.13 2.02-1.03 2.02-1.88z" />
                  </svg>
                  <span>Apple</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('android')}
                  className={`py-2 px-5 rounded-[10px] transition-all flex items-center gap-2.5 text-xs font-bold cursor-pointer ${
                    activePlatform === 'android'
                      ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs border border-[var(--border-color)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>Android</span>
                </button>
              </div>
            </div>

            {deferredPrompt && activePlatform === 'android' ? (
              <div className="w-full space-y-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-[var(--text-primary)] text-[var(--bg-color)] py-3.5 px-6 rounded-[12px] font-bold text-sm tracking-wide shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={18} strokeWidth={2.5} />
                  <span>{localized.installBtn}</span>
                </button>
                <button
                  onClick={handleClose}
                  className="w-full bg-transparent text-[var(--text-secondary)] py-2 rounded-[12px] font-medium text-xs hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  {localized.maybeLater}
                </button>
              </div>
            ) : (
              <div className="w-full space-y-5">
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3.5 group p-2.5 rounded-[14px] bg-[var(--surface-muted)] border border-[var(--border-color)]">
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs shrink-0 shadow-xs">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        {activePlatform === 'ios' ? <Share size={13} className="text-[var(--accent-color)]" /> : <MoreVertical size={13} className="text-[var(--accent-color)]" />}
                        {activePlatform === 'ios' ? localized.iosStep1Title : localized.androidStep1Title}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] opacity-70 truncate">
                        {activePlatform === 'ios' ? localized.iosStep1Desc : localized.androidStep1Desc}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3.5 group p-2.5 rounded-[14px] bg-[var(--surface-muted)] border border-[var(--border-color)]">
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs shrink-0 shadow-xs">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <PlusSquare size={13} className="text-neutral-800 dark:text-white" />
                        {activePlatform === 'ios' ? localized.iosStep2Title : localized.androidStep2Title}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] opacity-70 truncate">
                        {activePlatform === 'ios' ? localized.iosStep2Desc : localized.androidStep2Desc}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full bg-[var(--text-primary)] text-[var(--bg-color)] py-3 px-6 rounded-[12px] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-xs"
                >
                  {localized.gotIt}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
