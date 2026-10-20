import React, { useState, useEffect } from 'react';
import { Shield, FileText, ArrowLeft, Copy, Check, Globe, Lock } from 'lucide-react';
import { DejzLogo } from './DejzLogo';
import { Button, SegmentedControl } from './ui';
import { LanguagePicker } from './LanguagePicker';
import { Language } from '../i18n';

export type LegalDocType = 'privacy' | 'terms' | 'cookies';

interface PublicLegalPageProps {
  initialDoc?: LegalDocType;
  onNavigateHome?: () => void;
  currentLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export function PublicLegalPage({
  initialDoc = 'privacy',
  onNavigateHome,
  currentLanguage: externalLanguage,
  onLanguageChange,
}: PublicLegalPageProps) {
  const [currentDoc, setCurrentDoc] = useState<LegalDocType>(initialDoc);
  const [internalLanguage, setInternalLanguage] = useState<Language>('sv');
  const [copied, setCopied] = useState(false);

  const activeLang = externalLanguage || internalLanguage;
  const language: 'sv' | 'en' = activeLang === 'en' ? 'en' : 'sv';

  const handleLanguageChange = (lang: Language) => {
    setInternalLanguage(lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

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
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)] relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none dark:hidden z-0"
        style={{
          background: 'var(--bg-gradient)',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-[400px] -bottom-[200px] bg-[var(--bg-color)] pointer-events-none z-0"
      />
      {/* Sticky Public Header */}
      <header className="sticky top-0 z-50 bg-[var(--surface-color)]/90 backdrop-blur-md border-b border-[var(--border-divider)] px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 transition-colors">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
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
            <LanguagePicker
              currentLanguage={activeLang}
              onLanguageChange={handleLanguageChange}
              variant="compact"
            />

            {/* Back to app button */}
            <Button
              onClick={handleBackToApp}
              variant="primary"
              size="sm"
              icon={<ArrowLeft size={14} />}
            >
              <span>{language === 'sv' ? 'Tillbaka' : 'Back'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Navigation Tabs between Legal Docs */}
        <div className="flex flex-col gap-3 mb-6 pb-2 border-none">
          <SegmentedControl
            variant="surface"
            value={currentDoc}
            onChange={(val) => handleSelectDoc(val as LegalDocType)}
            options={[
              {
                value: 'privacy',
                label: language === 'sv' ? 'Integritet' : 'Privacy',
                icon: <Shield size={14} />,
              },
              {
                value: 'terms',
                label: language === 'sv' ? 'Villkor' : 'Terms',
                icon: <FileText size={14} />,
              },
              {
                value: 'cookies',
                label: 'Cookies',
                icon: <Globe size={14} />,
              },
            ]}
          />

          {/* Quick Action: Copy Public Link */}
          <div className="flex justify-end">
            <Button
              onClick={handleCopyLink}
              variant="secondary"
              size="sm"
              icon={copied ? <Check size={14} className="text-[var(--success-color)]" /> : <Copy size={14} />}
              title="Kopiera länk till detta dokument"
            >
              <span>
                {copied
                  ? (language === 'sv' ? 'Kopierad!' : 'Copied!')
                  : (language === 'sv' ? 'Kopiera direktlänk' : 'Copy Public Link')}
              </span>
            </Button>
          </div>
        </div>

        {/* Document Card Container */}
        <div className="bg-[var(--surface-color)] border border-[var(--border-divider)] rounded-container p-5 sm:p-6 shadow-subtle space-y-6">
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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label font-semibold bg-black/5 dark:bg-white/5 text-[var(--text-primary)] border-none mb-1">
          <Lock size={12} />
          GDPR & Google OAuth
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Integritetspolicy för Dejz
        </h1>
        <p className="text-label text-[var(--text-secondary)]">
          Senast uppdaterad: 23 september 2026
        </p>
      </header>

      {/* Summary highlight */}
      <div className="p-4 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-muted)] border-none text-xs text-[var(--text-primary)] leading-relaxed space-y-2">
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

      <section className="space-y-2 p-4 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-muted)] border-none">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <Lock size={16} className="text-[var(--accent-color)] shrink-0" />
          3. Google API & Begränsad användning
        </h2>
        <div className="space-y-2 leading-relaxed text-xs">
          <p>
            Vid inloggning via Google Sign-In begär vi endast grundläggande profilåtkomst (namn och e-postadress).
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Vi överför eller säljer aldrig data till tredje part.</li>
            <li>Vi använder inte Google-data för annonser eller AI-träning.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">4. Lagring och säkerhet</h2>
        <p className="leading-relaxed">
          Dina uppgifter lagras krypterat på säkra servrar inom EU/EES. Endast du har åtkomst till din personliga budgetdata.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">5. Dina rättigheter enligt GDPR</h2>
        <p className="leading-relaxed">
          Enligt dataskyddsförordningen (GDPR) har du rätt att begära registerutdrag, rättelse eller permanent radering av dina personuppgifter. Du kan när som helst radera ditt konto och all tillhörande data direkt under <strong>Profil &rarr; Radera konto</strong> i appen.
        </p>
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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label font-semibold bg-black/5 dark:bg-white/5 text-[var(--text-primary)] border-none mb-1">
          <Lock size={12} />
          GDPR & Google OAuth
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Privacy Policy for Dejz
        </h1>
        <p className="text-label text-[var(--text-secondary)]">
          Last updated: October 2026
        </p>
      </header>
      <div className="p-4 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-muted)] border-none text-xs text-[var(--text-primary)] leading-relaxed space-y-2">
        <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Shield size={15} className="text-[var(--accent-color)] shrink-0" />
          Summary:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
          <li>Dejz never collects sensitive bank credentials.</li>
          <li>We never sell your personal data to third parties.</li>
          <li>Google user data is used exclusively for account identification.</li>
          <li>You can permanently delete your account and all data at any time inside the app.</li>
        </ul>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Data Controller</h2>
        <p className="leading-relaxed">
          Dejz is responsible for processing your personal data. For privacy inquiries, contact us at{' '}
          <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] font-medium underline">
            hej@dejz.se
          </a>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">2. Data We Collect</h2>
        <p className="leading-relaxed">
          We only process data necessary to provide the service: your email address, profile name, and the budget entries (incomes, fixed costs, savings goals, and expenses) you choose to enter.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">3. Your GDPR Rights & Account Deletion</h2>
        <p className="leading-relaxed">
          Under GDPR, you have the right to access, rectify, or erase your personal data. You can permanently delete your account and all associated records at any time directly inside the app under <strong>Profile &rarr; Delete Account</strong>.
        </p>
      </section>
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
        <p className="text-label text-[var(--text-secondary)]">
          Senast uppdaterad: oktober 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Godkännande av villkor</h2>
        <p className="leading-relaxed">
          Genom att skapa ett konto eller använda Dejz godkänner du dessa användarvillkor.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">2. Tjänstens omfattning & Ingen finansiell rådgivning</h2>
        <p className="leading-relaxed">
          Dejz är ett digitalt verktyg för personlig budgetering och ekonomisk överblick i vardagen. Alla beräkningar, budgetöversikter och prognoser är vägledande hjälpmedel baserade på dina egna inmatade siffror och utgör <strong>inte</strong> finansiell, juridisk eller skattemässig rådgivning.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">3. Ansvarsbegränsning</h2>
        <p className="leading-relaxed">
          Du ansvarar själv för dina ekonomiska beslut och för att dina angivna uppgifter stämmer. Dejz ansvarar inte för eventuella direkta eller indirekta ekonomiska förluster eller uteblivna betalningar till följd av hur tjänsten används.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">4. Konton, säkerhet och avslut</h2>
        <p className="leading-relaxed">
          Du ansvarar för att hålla dina inloggningsuppgifter säkra. Du kan när som helst avsluta och permanent radera ditt konto direkt i appens inställningar.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">5. Ändringar av villkor</h2>
        <p className="leading-relaxed">
          Vi förbehåller oss rätten att uppdatera dessa villkor vid behov. Vid väsentliga ändringar informeras användare i appen eller via e-post.
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
        <p className="text-label text-[var(--text-secondary)]">
          Last updated: October 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Acceptance of Terms</h2>
        <p className="leading-relaxed">
          By registering an account or using Dejz, you agree to these Terms of Service.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">2. Scope of Service & No Financial Advice</h2>
        <p className="leading-relaxed">
          Dejz is a digital tool for personal budgeting and financial overview. All calculations, budget summaries, and projections are indicative aids based on your own inputs and do <strong>not</strong> constitute professional financial, legal, or tax advice.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">3. Limitation of Liability</h2>
        <p className="leading-relaxed">
          You are solely responsible for your financial decisions. Dejz shall not be liable for any direct or indirect financial losses resulting from the use of the app.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">4. Account Security & Termination</h2>
        <p className="leading-relaxed">
          You are responsible for safeguarding your login credentials. You may terminate and permanently delete your account at any time inside the app.
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
        <p className="text-label text-[var(--text-secondary)]">
          Senast uppdaterad: oktober 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. Hur vi använder cookies och lokal lagring</h2>
        <p className="leading-relaxed">
          Enligt lagen om elektronisk kommunikation ska besökare informeras om användningen av cookies. Dejz använder endast tekniskt nödvändiga cookies och lokal lagring (<code>localStorage</code>) för att hålla dig säkert inloggad samt spara dina språk- och temainställningar.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">2. Ingen tredjepartsspårning</h2>
        <p className="leading-relaxed">
          Vi använder inga annons- eller marknadsföringscookies från tredje part och spårar inte ditt surfbeteende utanför Dejz.
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
        <p className="text-label text-[var(--text-secondary)]">
          Last updated: October 2026
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">1. How We Use Cookies & Local Storage</h2>
        <p className="leading-relaxed">
          Dejz uses strictly necessary cookies and browser local storage (<code>localStorage</code>) exclusively to maintain your authenticated session and remember your language and display preferences.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-bold text-[var(--text-primary)]">2. No Third-Party Advertising Cookies</h2>
        <p className="leading-relaxed">
          We do not use third-party advertising or cross-site tracking cookies.
        </p>
      </section>
    </article>
  );
}
