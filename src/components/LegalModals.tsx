import React from 'react';
import { motion } from 'motion/react';

import { X, Shield, FileText, Mail, Info } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { useScrollLock } from '../hooks/useScrollLock';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | 'cookies' | 'contact';
  t: (key: TranslationKey) => string;
}

export function LegalModal({ isOpen, onClose, type, t }: LegalModalProps) {
  useScrollLock(isOpen);
  const getContent = () => {
    switch (type) {
      case 'privacy':
        return (
          <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">1. Inledning</h3>
              <p>
                Vi värnar om din integritet. Denna policy förklarar hur vi samlar in, använder och skyddar din personliga information när du använder vår app.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">2. Data vi samlar in</h3>
              <p>
                Vi samlar in information som du tillhandahåller direkt till oss, såsom ditt namn, e-postadress och ekonomisk data (inkomster, utgifter) för att kunna erbjuda appens funktioner.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">3. Hur vi använder din data</h3>
              <p>
                Din data används uteslutande för att beräkna din budget och ge dig insikter om din ekonomi. Vi säljer aldrig din data till tredje part.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">4. Datasäkerhet</h3>
              <p>
                Vi använder kryptering och säkra servrar (via Supabase) för att skydda din information.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">5. Dina rättigheter</h3>
              <p>
                Enligt GDPR har du rätt att begära utdrag, rättelse eller radering av din data. Du kan radera ditt konto när som helst direkt i appen.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">6. Kontakt</h3>
              <p>
                För frågor om din integritet kan du nå oss via feedback- och supportfunktionen i appen.
              </p>
            </section>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">1. Godkännande av villkor</h3>
              <p>
                Genom att registrera ett konto eller använda Dejz godkänner du dessa användarvillkor.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">2. Tjänstens omfattning</h3>
              <p>
                Dejz är ett digitalt verktyg för personlig budgetering och ekonomisk överblick. Beräkningar och prognoser är vägledande och utgör inte professionell finansiell rådgivning.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">3. Ansvarsbegränsning</h3>
              <p>
                Användaren ansvarar själv för sina ekonomiska beslut. Vi tar inget ansvar för eventuella ekonomiska förluster till följd av användning av appen.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">4. Konton och säkerhet</h3>
              <p>
                Du ansvarar för att skydda dina inloggningsuppgifter och hålla ditt konto säkert.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">5. Ändringar av villkor</h3>
              <p>
                Vi förbehåller oss rätten att uppdatera villkoren vid behov. Fortsatt användning innebär godkännande av de nya villkoren.
              </p>
            </section>
          </div>
        );
      case 'cookies':
        return (
          <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Cookiepolicy</h3>
              <p>
                Enligt lagen om elektronisk kommunikation ska besökare informeras om användningen av cookies. Vi använder endast nödvändiga cookies och lokal lagring (localStorage) för att upprätthålla din inloggningssession och dina personliga inställningar.
              </p>
              <p>
                Inga spårnings- eller marknadsföringscookies från tredje part används.
              </p>
            </section>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
            <div className="surface-card p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-[8px] bg-accent/10 text-accent flex items-center justify-center">
                <Mail size={32} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Hjälp & Feedback</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Har du frågor, förslag på förbättringar eller stöter på något problem?
                </p>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Du kan när som helst skicka feedback eller synpunkter direkt via feedback-funktionen i appen.
              </p>
            </div>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'privacy': return t('privacyPolicy');
      case 'terms': return t('termsOfService');
      case 'cookies': return t('cookiePolicy');
      case 'contact': return t('contact');
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'privacy': return <Shield size={20} className="text-accent" />;
      case 'terms': return <FileText size={20} className="text-accent" />;
      case 'cookies': return <Info size={20} className="text-warning" />;
      case 'contact': return <Mail size={20} className="text-accent" />;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full sm:max-w-lg bg-[var(--bg-color)] max-h-[85vh] sm:max-h-[90vh] mt-[env(safe-area-inset-top,0px)] rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] border-none overflow-hidden flex flex-col pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-0 shadow-2xl font-sans"
      >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-card-nested,10px)] bg-[var(--surface-color)] flex items-center justify-center border-none">
                  {getIcon()}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">{getTitle()}</h2>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Juridisk information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer border-none shadow-none"
                aria-label="Stäng"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {getContent()}
            </div>

          </motion.div>
    </motion.div>
  );
}
