import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { DejzLogo } from './DejzLogo';

interface WelcomeScreenProps {
  onAction: (isRegistering: boolean) => void;
  onLegalClick: (type: 'privacy' | 'terms' | 'cookies' | 'contact') => void;
  t: (key: TranslationKey) => string;
  currentLanguage?: string;
}

export function WelcomeScreen({ onAction, onLegalClick, t, currentLanguage = 'sv' }: WelcomeScreenProps) {
  const norm = (currentLanguage || 'sv').toLowerCase();
  
  let headline = 'Hela din ekonomi. Svart på vitt.';
  let subtitle = 'Samla inkomster, fasta utgifter, sparande och budget på ett ställe och se vad du har kvar att spendera mellan två löner.';
  let ctaText = 'Kom igång gratis';

  if (norm === 'da') {
    headline = 'Hele din økonomi. Sort på hvidt.';
    subtitle = 'Saml indtægter, faste udgifter, opsparing og budget ét sted og se præcis hvad du har tilbage at bruge mellem to lønninger.';
    ctaText = 'Kom i gang gratis';
  } else if (norm === 'no') {
    headline = 'Hele din økonomi. Svart på hvitt.';
    subtitle = 'Samle inntekter, faste utgifter, sparing og budsjett på ett sted og se nøyaktig hva du har igjen å bruke mellom to lønninger.';
    ctaText = 'Kom i gang gratis';
  } else if (norm === 'fi') {
    headline = 'Koko taloutesi. Mustaa valkoisella.';
    subtitle = 'Kokoa tulot, kiinteät kulut, säästöt ja budjetti yhteen paikkaan ja näe tarkalleen, mitä sinulla on jäljellä käytettäväksi kahden palkan välillä.';
    ctaText = 'Aloita ilmaiseksi';
  } else if (norm === 'en') {
    headline = 'Your whole budget. In black and white.';
    subtitle = 'Bring income, fixed expenses, savings, and budget together in one place and see exactly what you have left to spend between two paydays.';
    ctaText = 'Get started free';
  }

  return (
    <div className="min-h-dvh relative flex flex-col bg-[var(--bg-color)] z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]">
      {/* Seamless Top Ambient Brand Gradient matching the in-app header gradient */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[420px] pointer-events-none dark:hidden z-0"
        style={{
          background: 'var(--bg-gradient)',
        }}
      />

      {/* Center Content: Logo & Headline */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative z-10 max-w-md mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center space-y-6"
        >
          <div className="p-4 px-6 rounded-card-nested bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs flex items-center justify-center">
            <DejzLogo className="text-3xl sm:text-4xl font-black" textColor="var(--logo-color)" />
          </div>
          
          <div className="space-y-3 max-w-sm">
            <h2 className="text-page-title text-[var(--text-primary)]">
              {headline}
            </h2>
            <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="p-6 pb-10 sm:pb-14 relative z-20 max-w-md mx-auto w-full space-y-4"
      >
        <button 
          onClick={() => onAction(false)}
          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] h-13 rounded-btn text-body-medium active:scale-[0.98] hover:opacity-95 transition-all flex items-center justify-center gap-2 group shadow-xs cursor-pointer"
        >
          <span>{ctaText}</span>
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center justify-center gap-4 text-label font-semibold text-[var(--text-secondary)]">
          <button 
            onClick={() => onLegalClick('terms')}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {t('termsOfService')}
          </button>
          <span>•</span>
          <button 
            onClick={() => onLegalClick('privacy')}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {t('privacyPolicy')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
