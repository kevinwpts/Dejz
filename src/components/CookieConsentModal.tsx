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
          <div className="bg-white dark:bg-[#353535] border border-black/[0.08] dark:border-white/[0.08] rounded-[24px] p-5 sm:p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              title={t('close') || 'Stäng'}
            >
              <X size={15} strokeWidth={2} />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-[12px] bg-black/5 dark:bg-white/[0.08] flex items-center justify-center shrink-0 text-[#1C1917] dark:text-white border border-black/10 dark:border-white/10">
                <Cookie size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white tracking-tight">
                  {t('cookieConsentTitle')}
                </h3>
                <p className="text-xs text-[#6E6961] dark:text-[#A8A8A8] leading-relaxed">
                  {t('cookieConsentDesc')}{' '}
                  <button
                    onClick={onOpenPrivacyPolicy}
                    className="text-[var(--accent-color)] font-medium underline hover:opacity-80 transition-opacity inline-flex items-center gap-0.5"
                  >
                    {t('readMore')}
                  </button>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                onClick={handleAcceptNecessary}
                className="w-full sm:flex-1 h-10 px-4 bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[12px] text-xs font-semibold hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center gap-1.5"
              >
                {t('acceptNecessary')}
              </button>
              <button
                onClick={handleAcceptAll}
                className="w-full sm:flex-1 h-10 px-4 bg-[var(--accent-color)] text-[var(--text-on-accent)] rounded-[12px] text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Check size={14} />
                {t('acceptAll')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
