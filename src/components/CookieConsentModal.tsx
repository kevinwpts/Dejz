import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, X } from 'lucide-react';

interface CookieConsentModalProps {
  t: (key: string) => string;
  onOpenPrivacyPolicy: () => void;
}

export function CookieConsentModal({ t, onOpenPrivacyPolicy }: CookieConsentModalProps) {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Small delay for smooth entrance
      const timer = setTimeout(() => setShowConsent(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie_consent', 'all');
    setShowConsent(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('cookie_consent', 'necessary');
    setShowConsent(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('cookie_consent', 'dismissed');
    setShowConsent(false);
  };

  return (
    <AnimatePresence>
      {showConsent && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[150] pointer-events-auto"
        >
          <div className="bg-[var(--bg-color)] border-none rounded-[var(--radius-card,20px)] p-5 sm:p-6 shadow-modal space-y-4 relative font-sans">
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center shrink-0 cursor-pointer border-none shadow-none"
              title={t('close') || 'Stäng'}
            >
              <X size={17} strokeWidth={2} />
            </button>
            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-10 h-10 rounded-[var(--radius-icon-button,10px)] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0 text-[var(--text-primary)] border border-subtle">
                <Cookie size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-display tracking-tight text-[var(--text-primary)]">
                  {t('cookieConsentTitle')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {t('cookieConsentDesc')}{' '}
                  <button
                    type="button"
                    onClick={onOpenPrivacyPolicy}
                    className="text-[var(--accent-color)] font-semibold underline hover:opacity-80 transition-opacity inline-flex items-center gap-0.5"
                  >
                    {t('readMore')}
                  </button>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAcceptNecessary}
                className="w-full sm:flex-1 h-11 px-4 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] border border-subtle rounded-[var(--radius-button,12px)] text-xs font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
              >
                {t('acceptNecessary')}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:flex-1 h-11 px-4 bg-[var(--accent-color)] text-[var(--on-accent)] rounded-[var(--radius-button,12px)] text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <Check size={14} strokeWidth={2.5} />
                {t('acceptAll')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
