import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { DejzLogo } from './DejzLogo';

interface WelcomeScreenProps {
  onAction: (isRegistering: boolean) => void;
  onLegalClick: (type: 'privacy' | 'terms' | 'cookies' | 'contact') => void;
  t: (key: TranslationKey) => string;
}

export function WelcomeScreen({ onAction, onLegalClick, t }: WelcomeScreenProps) {
  return (
    <div className="min-h-dvh relative flex flex-col bg-[var(--bg-color)] z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]">
      {/* Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-100">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-gradient-to-tr from-[var(--accent-color)]/[0.12] via-transparent to-transparent dark:from-[var(--accent-color)]/[0.05] dark:via-transparent dark:to-transparent blur-[120px] rounded-full pointer-events-none" />
      </div>

      {/* Center Content: Logo & Headline */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative z-10 max-w-md mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center space-y-6"
        >
          <div className="p-4 px-6 rounded-[28px] bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs flex items-center justify-center">
            <DejzLogo className="text-3xl sm:text-4xl font-black" textColor="var(--logo-color)" />
          </div>
          
          <div className="space-y-3 max-w-sm">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Se exakt vad du kan spendera idag.
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
              Låt oss räkna ut din personliga dagsbudget. Sluta gissa – vet exakt vad du har råd med, varje morgon.
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
          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] h-13 rounded-[14px] font-semibold text-sm sm:text-base active:scale-[0.98] hover:opacity-95 transition-all flex items-center justify-center gap-2 group shadow-xs cursor-pointer"
        >
          <span>Kom igång gratis</span>
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center justify-center gap-4 text-xs font-semibold text-[var(--text-secondary)]">
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
