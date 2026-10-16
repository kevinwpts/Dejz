import React from 'react';
import { motion } from 'motion/react';
import { TranslationKey } from '../i18n';
import { DejzLogo } from './DejzLogo';
import { Button } from './ui';

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
    subtitle = 'Samle inntekter, faste utgifter, sparing og budsjett på ett sted och se nøyaktig hva du har igjen å bruke mellom to lønninger.';
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
    <div className="min-h-dvh relative flex flex-col bg-[var(--surface-color)] z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] selection:bg-landing-signature selection:text-[var(--text-primary)]">
      {/* Subtle Top Light-Blue Wash matching the LandingPage hero */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[380px] bg-landing-sky-soft pointer-events-none z-0"
      />

      {/* Center Content: Logo & Headline */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative z-10 max-w-md mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center space-y-6"
        >
          <div className="p-4 px-6 rounded-card-nested bg-[var(--surface-color)] shadow-subtle flex items-center justify-center">
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
        <Button
          variant="accent"
          size="lg"
          fullWidth
          onClick={() => onAction(false)}
        >
          {ctaText}
        </Button>

        <div className="flex items-center justify-center gap-4 text-label font-semibold text-[var(--text-secondary)]">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onLegalClick('terms')}
          >
            {t('termsOfService')}
          </Button>
          <span>•</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onLegalClick('privacy')}
          >
            {t('privacyPolicy')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
