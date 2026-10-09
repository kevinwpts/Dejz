import React, { useState, useEffect } from 'react';
import { Shield, FileText, ArrowLeft, Copy, Check, Globe, Lock } from 'lucide-react';
import { DejzLogo } from './DejzLogo';
import { Button } from './ui';

export type LegalDocType = 'privacy' | 'terms' | 'cookies';

interface PublicLegalPageProps {
  initialDoc?: LegalDocType;
  onNavigateHome?: () => void;
}

export function PublicLegalPage({
  initialDoc = 'privacy',
  onNavigateHome
}: PublicLegalPageProps) {
  const [currentDoc, setCurrentDoc] = useState<LegalDocType>(initialDoc);
  const [language, setLanguage] = useState<'sv' | 'en'>('sv');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Sync with browser URL if changed externally
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    
    if (path.includes('terms') || hash.includes('terms')) {
      setCurrentDoc('terms');
    } else if (path.includes('cookie') || hash.includes('cookie')) {
      setCurrentDoc('cookies');
    } else if (path.includes('privacy') || hash.includes('privacy') || path.includes('integritet')) {
      setCurrentDoc('privacy');
    }
  }, []);

  const handleSelectDoc = (doc: LegalDocType) => {
    setCurrentDoc(doc);
    const newPath = doc === 'privacy' ? '/privacy' : doc === 'terms' ? '/terms' : '/cookies';
    window.history.pushState({}, '', newPath);
  };

  const handleCopyLink = () => {
    const url = window.location.origin + (currentDoc === 'privacy' ? '/privacy' : currentDoc === 'terms' ? '/terms' : '/cookies');
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleBackToApp = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.history.pushState({}, '', '/');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)] sm:max-w-[430px] sm:mx-auto sm:shadow-subtle sm:border sm:border-subtle sm:border-subtle sm:relative sm:min-h-dvh sm:overflow-hidden">
      {/* Sticky Public Header */}
      <header className="sticky top-0 z-50 bg-[var(--surface-color)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 transition-colors">
        <div className="max-w-[430px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToApp}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
              aria-label="Dejz Hem"
            >
              <DejzLogo className="h-6 w-auto" textColor="var(--logo-color)" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-[var(--surface-muted)] border-none rounded-full p-0.5 text-xs font-medium">
              <button
                onClick={() => setLanguage('sv')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === 'sv'
                    ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🇸🇪 SV
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Back to app button */}
            <Button
              onClick={handleBackToApp}
              variant="primary"
              size="sm"
              icon={<ArrowLeft size={14} />}
            >
              <span>{language === 'sv' ? 'App' : 'App'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[430px] mx-auto px-4 py-6">
        {/* Navigation Tabs between Legal Docs */}
        <div className="flex flex-col gap-3 mb-6 pb-4 border-none">
          <div className="flex items-center gap-1 p-1 bg-[var(--surface-color)] border-none rounded-card shadow-none overflow-x-auto no-scrollbar w-full">
            <button
              onClick={() => handleSelectDoc('privacy')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-card,14px)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                currentDoc === 'privacy'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <Shield size={14} />
              <span>{language === 'sv' ? 'Integritet' : 'Privacy'}</span>
            </button>

            <button
              onClick={() => handleSelectDoc('terms')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-card,14px)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                currentDoc === 'terms'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <FileText size={14} />
              <span>{language === 'sv' ? 'Villkor' : 'Terms'}</span>
            </button>

            <button
              onClick={() => handleSelectDoc('cookies')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-card,14px)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                currentDoc === 'cookies'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <Globe size={14} />
              <span>Cookies</span>
            </button>
          </div>

          {/* Quick Action: Copy Public Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border-none rounded-[var(--radius-card,14px)] transition-all shadow-none cursor-pointer"
            title="Kopiera länk till detta dokument"
          >
            {copied ? <Check size={14} className="text-neutral-800 dark:text-white" /> : <Copy size={14} />}
            <span>
              {copied
                ? (language === 'sv' ? 'Kopierad!' : 'Copied!')
                : (language === 'sv' ? 'Kopiera direktlänk' : 'Copy Public Link')}
            </span>
          </button>
        </div>

        {/* Document Card Container */}
        <div className="bg-[var(--surface-color)] border-none rounded-container p-5 shadow-none space-y-6">
          {currentDoc === 'privacy' && (
            language === 'sv' ? <SwedishPrivacyPolicy /> : <EnglishPrivacyPolicy />
          )}

          {currentDoc === 'terms' && (
            language === 'sv' ? <SwedishTermsOfService /> : <EnglishTermsOfService />
          )}

          {currentDoc === 'cookies' && (
            language === 'sv' ? <SwedishCookiePolicy /> : <EnglishCookiePolicy />
          )}
        </div>

        {/* Footer info box */}
        <div className="mt-8 text-center text-xs text-[var(--text-secondary)] space-y-2 pb-12">
          <p>© {new Date().getFullYear()} Dejz. Alla rättigheter förbehållna.</p>
          <p className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => handleSelectDoc('privacy')} className="hover:underline cursor-pointer">Integritetspolicy</button>
            <span>•</span>
            <button onClick={() => handleSelectDoc('terms')} className="hover:underline cursor-pointer">Användarvillkor</button>
            <span>•</span>
            <button onClick={() => handleSelectDoc('cookies')} className="hover:underline cursor-pointer">Cookiepolicy</button>
          </p>
        </div>
      </main>
    </div>
  );
}

/* =========================================================================
   SWEDISH PRIVACY POLICY
========================================================================= */
function SwedishPrivacyPolicy() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6 text-sm">
      <header className="border-b border-[var(--border-color)] pb-4 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/5 dark:bg-white/5 text-[#1C1917] dark:text-white border-none mb-1">
          <Lock size={12} />
          GDPR & Google OAuth
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Integritetspolicy för Dejz
        </h1>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Senast uppdaterad: 23 september 2026
        </p>
      </header>

      {/* Summary highlight */}
      <div className="p-4 rounded-[var(--radius-card,14px)] bg-[var(--surface-muted)] border-none text-xs text-[var(--text-primary)] leading-relaxed space-y-2">
        <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Shield size={15} className="text-[var(--accent-color)] shrink-0" />
          Kort sammanfattning av din integritet:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
          <li>Dejz samlar <strong>aldrig</strong> in känsliga bankinloggningar.</li>
          <li>Vi <strong>säljer aldrig</strong> dina personuppgifter till tredje part.</li>
          <li>Google-användardata används uteslutande för att identifiera ditt konto.</li>
          <li>Du kan när som helst radera ditt konto och all data permanent.</li>
        </ul>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Personuppgiftsansvarig</h2>
        <p className="leading-relaxed">
          Dejz ansvarar för behandlingen av dina personuppgifter. För frågor rörande dataskydd, kontakta oss via e-post på{' '}
          <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] font-medium underline">
            hej@dejz.se
          </a>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">2. Vilka personuppgifter vi samlar in</h2>
        <div className="space-y-2 leading-relaxed">
          <p>Vi behandlar endast nödvändiga uppgifter:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Konto:</strong> E-postadress och profilnamn.</li>
            <li><strong>Budgetdata:</strong> Inkomster, utgifter, sparkvoter och transaktionsnoteringar.</li>
            <li><strong>Teknisk data:</strong> Tidsstämplar och sessionskakor.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-2 p-4 rounded-[var(--radius-card,14px)] bg-[var(--surface-muted)] border-none">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <Lock size={16} className="text-[var(--accent-color)] shrink-0" />
          3. Google API & Begränsad användning
        </h2>
        <div className="space-y-2 leading-relaxed text-xs">
          <p>
            Vid inloggning via Google Sign-In begär vi endast grundläggande profilåtkomst.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Vi överför eller säljer aldrig data till tredje part.</li>
            <li>Vi använder inte Google-data för annonser eller AI-träning.</li>
          </ul>
        </div>
      </section>
    </article>
  );
}

/* =========================================================================
   ENGLISH PRIVACY POLICY
========================================================================= */
function EnglishPrivacyPolicy() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6 text-sm">
      <header className="border-b border-[var(--border-color)] pb-4 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/5 dark:bg-white/5 text-[#1C1917] dark:text-white border-none mb-1">
          <Lock size={12} />
          GDPR & Google OAuth
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Privacy Policy for Dejz
        </h1>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Last updated: September 23, 2026
        </p>
      </header>
      <div className="p-4 rounded-[var(--radius-card,14px)] bg-[var(--surface-muted)] border-none text-xs text-[var(--text-primary)] leading-relaxed space-y-2">
        <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Shield size={15} className="text-[var(--accent-color)] shrink-0" />
          Summary:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
          <li>Dejz never collects sensitive bank credentials.</li>
          <li>We never sell your personal data to third parties.</li>
          <li>Google user data is used exclusively for account identification.</li>
        </ul>
      </div>
    </article>
  );
}

/* =========================================================================
   SWEDISH TERMS OF SERVICE
========================================================================= */
function SwedishTermsOfService() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6 text-sm">
      <header className="border-b border-[var(--border-color)] pb-4 space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Användarvillkor för Dejz
        </h1>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Gäller från 23 september 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Tjänstens omfattning</h2>
        <p className="leading-relaxed">
          Dejz är en personlig budget- och ekonomiapp. Genom att använda tjänsten godkänner du dessa användarvillkor.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">2. Användaransvar</h2>
        <p className="leading-relaxed">
          Du ansvarar själv för att uppgifter du anger är korrekta och för att hålla dina inloggningsuppgifter säkra.
        </p>
      </section>
    </article>
  );
}

/* =========================================================================
   ENGLISH TERMS OF SERVICE
========================================================================= */
function EnglishTermsOfService() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6 text-sm">
      <header className="border-b border-[var(--border-color)] pb-4 space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Terms of Service for Dejz
        </h1>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Effective from September 23, 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Scope of Service</h2>
        <p className="leading-relaxed">
          Dejz is a personal budgeting and finance app. By using the service, you agree to these terms.
        </p>
      </section>
    </article>
  );
}

/* =========================================================================
   SWEDISH COOKIE POLICY
========================================================================= */
function SwedishCookiePolicy() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6 text-sm">
      <header className="border-b border-[var(--border-color)] pb-4 space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Cookiepolicy för Dejz
        </h1>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Senast uppdaterad: 23 september 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Vad är cookies?</h2>
        <p className="leading-relaxed">
          Cookies är små textfiler som lagras på din enhet för att förbättra din upplevelse och hålla dig inloggad.
        </p>
      </section>
    </article>
  );
}

/* =========================================================================
   ENGLISH COOKIE POLICY
========================================================================= */
function EnglishCookiePolicy() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6 text-sm">
      <header className="border-b border-[var(--border-color)] pb-4 space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Cookie Policy for Dejz
        </h1>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Last updated: September 23, 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. What cookies we use</h2>
        <p className="leading-relaxed">
          Cookies are small text files stored on your device to keep you signed in and secure.
        </p>
      </section>
    </article>
  );
}
