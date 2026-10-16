import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, X } from 'lucide-react';
import { Button, IconButton } from './ui';

interface CookieConsentModalProps {
  t: (key: string) => string;
  onOpenPrivacyPolicy: () => void;
}

export function CookieConsentModal({ t, onOpenPrivacyPolicy }: CookieConsentModalProps) {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
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
          <div className="bg-[var(--bg-color)] border border-[var(--border-divider)] rounded-card p-5 sm:p-6 shadow-modal space-y-4 relative font-sans">
            <div className="absolute top-4 right-4">
              <IconButton
                variant="surface"
                size="md"
                shape="circle"
                onClick={handleDismiss}
                title={t('close') || 'Stäng'}
                aria-label={t('close') || 'Stäng'}
                icon={<X size={16} strokeWidth={2} />}
              />
            </div>

            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-10 h-10 rounded-icon-button bg-[var(--surface-muted)] flex items-center justify-center shrink-0 text-[var(--text-primary)]">
                <Cookie size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-section-title font-bold font-display tracking-tight text-[var(--text-primary)]">
                  {t('cookieConsentTitle')}
                </h3>
                <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
                  {t('cookieConsentDesc')}{' '}
                  <button
                    type="button"
                    onClick={onOpenPrivacyPolicy}
                    className="text-[var(--accent-color)] font-semibold underline hover:opacity-80 transition-opacity inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    {t('readMore')}
                  </button>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleAcceptNecessary}
              >
                {t('acceptNecessary')}
              </Button>
              <Button
                variant="accent"
                size="md"
                fullWidth
                icon={<Check size={14} strokeWidth={2.5} />}
                onClick={handleAcceptAll}
              >
                {t('acceptAll')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
