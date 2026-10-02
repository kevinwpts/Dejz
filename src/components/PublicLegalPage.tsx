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
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]">
      {/* Sticky Public Header */}
      <header className="sticky top-0 z-50 bg-[var(--surface-color)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 sm:px-8 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3.5 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToApp}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
              aria-label="Dejz Hem"
            >
              <DejzLogo className="h-6 sm:h-7 w-auto" textColor="var(--logo-color)" />
            </button>

            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-color)]">
              {language === 'sv' ? 'Juridiskt dokument' : 'Legal Documentation'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-xl p-0.5 text-xs font-medium">
              <button
                onClick={() => setLanguage('sv')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'sv'
                    ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🇸🇪 Svenska
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🇬🇧 English
              </button>
            </div>

            {/* Back to app button */}
            <Button
              onClick={handleBackToApp}
              variant="primary"
              size="sm"
              icon={<ArrowLeft size={15} />}
            >
              <span className="hidden sm:inline">{language === 'sv' ? 'Gå till appen' : 'Go to App'}</span>
              <span className="sm:hidden">{language === 'sv' ? 'App' : 'App'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Tabs between Legal Docs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-xs">
            <button
              onClick={() => handleSelectDoc('privacy')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentDoc === 'privacy'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <Shield size={16} />
              <span>{language === 'sv' ? 'Integritetspolicy' : 'Privacy Policy'}</span>
            </button>

            <button
              onClick={() => handleSelectDoc('terms')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentDoc === 'terms'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <FileText size={16} />
              <span>{language === 'sv' ? 'Användarvillkor' : 'Terms of Service'}</span>
            </button>

            <button
              onClick={() => handleSelectDoc('cookies')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentDoc === 'cookies'
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              <Globe size={16} />
              <span>Cookies</span>
            </button>
          </div>

          {/* Quick Action: Copy Public Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-xl transition-all shadow-xs cursor-pointer"
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
        <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[28px] p-6 sm:p-10 shadow-xs space-y-8">
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
        <div className="mt-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
          <p>© {new Date().getFullYear()} Dejz. Alla rättigheter förbehållna.</p>
          <p className="flex items-center justify-center gap-4">
            <button onClick={() => handleSelectDoc('privacy')} className="hover:underline cursor-pointer">Integritetspolicy</button>
            <span>•</span>
            <button onClick={() => handleSelectDoc('terms')} className="hover:underline cursor-pointer">Användarvillkor</button>
            <span>•</span>
            <button onClick={() => handleSelectDoc('cookies')} className="hover:underline cursor-pointer">Cookiepolicy</button>
            <span>•</span>
            <a href="mailto:hej@dejz.se" className="hover:underline">Kontakt & Support</a>
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
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6">
      <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white border border-black/10 dark:border-white/10 mb-2">
          <Lock size={12} />
          GDPR & Google OAuth Compliant
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Integritetspolicy för Dejz
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Senast uppdaterad: 23 september 2026 | Gäller tills vidare
        </p>
      </header>

      {/* Summary highlight */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed space-y-2">
        <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Shield size={16} className="text-[var(--accent-color)]" />
          Kort sammanfattning av din integritet:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
          <li>Dejz samlar <strong>aldrig</strong> in känsliga bankinloggningar (inga BankID-krav).</li>
          <li>Vi <strong>säljer aldrig</strong> dina personuppgifter eller din ekonomiska data till tredje part.</li>
          <li>Google-användardata används uteslutande för att identifiera ditt konto och skydda din data.</li>
          <li>Du har full kontroll och kan när som helst radera ditt konto och all data permanent via appen.</li>
        </ul>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Personuppgiftsansvarig</h2>
        <p className="text-sm leading-relaxed">
          Dejz (nedan kallat &quot;vi&quot;, &quot;oss&quot; eller &quot;vår&quot;) ansvarar för behandlingen av dina personuppgifter när du använder webbapplikationen Dejz.
          För alla frågor rörande dataskydd och dina rättigheter kan du kontakta oss via e-post på{' '}
          <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] font-medium underline">
            hej@dejz.se
          </a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">2. Vilka personuppgifter vi samlar in</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>Vi behandlar endast de uppgifter som är nödvändiga för att tillhandahålla tjänsten:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Konto- och kontaktuppgifter:</strong> E-postadress och eventuellt användarnamn/profilnamn.
            </li>
            <li>
              <strong>Ekonomisk budgetdata:</strong> Inkomster, fasta och rörliga utgifter, sparkvoter, sparkonton, sparkategorier och transaktionsnoteringar som du själv matar in i appen.
            </li>
            <li>
              <strong>Teknisk data:</strong> Tidsstämplar för inloggning, användar-ID i vår säkra databas och nödvändiga sessionskakor för att hålla dig inloggad.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Lock size={18} className="text-[var(--accent-color)]" />
          3. Google API-användardata & Begränsad användning (Google Sign-In)
        </h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>
            När du väljer att logga in på Dejz via <strong>Google Sign-In</strong> begär appen endast grundläggande profilåtkomst (din e-postadress, namn och profilbild).
          </p>
          <p>
            <strong>Hur vi använder informationen från Google:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identifiera ditt konto och låta dig logga in säkert utan att behöva skapa ett separat lösenord.</li>
            <li>Visa ditt namn och profilbild i gränssnittet för en personlig användarupplevelse.</li>
          </ul>
          <p className="mt-2 font-medium text-[var(--text-primary)]">
            Dejz efterlever Googles policy för användardata från API-tjänster (Google API Services User Data Policy), inklusive kraven på begränsad användning (Limited Use Requirements):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li>Vi överför eller säljer aldrig data från Google-användare till tredje part.</li>
            <li>Vi använder inte Google-användardata för att visa personanpassade annonser.</li>
            <li>Vi använder inte Google-användardata för att träna maskininlärnings- eller AI-modeller.</li>
            <li>Människor har inte åtkomst till din Google-data förutom vid uttrycklig supportförfrågan från dig eller vid tvingande lagkrav.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">4. Syfte och rättslig grund (GDPR)</h2>
        <p className="text-sm leading-relaxed">
          Vi behandlar dina uppgifter med stöd av följande rättsliga grunder i enlighet med EU:s dataskyddsförordning (GDPR artikel 6):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
          <li>
            <strong>Fullgörande av avtal (Artikel 6.1 b):</strong> Behandlingen är nödvändig för att leverera Dejz budget- och spartjänster till dig enligt användarvillkoren.
          </li>
          <li>
            <strong>Berättigat intresse (Artikel 6.1 f):</strong> Att upprätthålla säkerhet, förhindra missbruk och erbjuda teknisk support.
          </li>
          <li>
            <strong>Rättslig förpliktelse (Artikel 6.1 c):</strong> Om lag eller myndighetsbeslut kräver att viss bokförings- eller transaktionsinformation sparas.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">5. Datasäkerhet och lagringsplats</h2>
        <p className="text-sm leading-relaxed">
          Säkerheten för din data är vår högsta prioritet:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
          <li>All kommunikation mellan din enhet och våra servrar krypteras med modern TLS/HTTPS (SSL).</li>
          <li>Data lagras säkert i datacenter inom EU via vår databaspartner Supabase (certifierade enligt SOC2 och ISO 27001).</li>
          <li>Vi tillämpar strikta behörighetskontroller (Row Level Security) så att endast du med dina inloggningsuppgifter kan läsa och skriva din ekonomiska data.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">6. Datalagring och rätten att radera konto</h2>
        <p className="text-sm leading-relaxed">
          Vi lagrar dina uppgifter endast så länge ditt konto är aktivt. 
          Du kan när som helst <strong>radera ditt konto och all tillhörande data permanent</strong> direkt inifrån appens inställningsmeny, eller genom att kontakta oss på{' '}
          <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a>. Vid radering raderas alla dina budgetposter, sparkonton och personuppgifter omedelbart och oåterkalleligt från våra databaser.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">7. Dina rättigheter enligt GDPR</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>Som användare har du lagstadgade rättigheter enligt GDPR:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Rätt till tillgång:</strong> Få en kopia av de personuppgifter vi behandlar om dig.</li>
            <li><strong>Rätt till rättelse:</strong> Rätta felaktiga eller ofullständiga uppgifter.</li>
            <li><strong>Rätt till radering (&quot;rätten att bli bortglömd&quot;):</strong> Få all din data raderad.</li>
            <li><strong>Rätt till dataportabilitet:</strong> Få ut din data i ett strukturerat, maskinläsbart format.</li>
            <li><strong>Rätt att inge klagomål:</strong> Du har rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY) om du anser att vi behandlar dina personuppgifter i strid med gällande lag.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">8. Tredjepartstjänster</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>För att drifta och leverera tjänsten använder vi följande betrodda partners som agerar som personuppgiftsbiträden:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase Inc.</strong> – Användarautentisering och krypterad PostgreSQL-databas (datacenter inom EU).</li>
            <li><strong>Google LLC</strong> – Valbar OAuth-inloggning.</li>
            <li><strong>Stripe Payments</strong> – Eventuell hantering av säkra prenumerationsbetalningar (vi hanterar eller sparar aldrig kreditkortsnummer).</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 pt-4 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">9. Kontakt</h2>
        <p className="text-sm leading-relaxed">
          Vid frågor om denna integritetspolicy eller hanteringen av dina personuppgifter, kontakta oss:
        </p>
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] text-sm space-y-1 border border-[var(--border-color)]">
          <p><strong>App:</strong> Dejz Personal Budgeting</p>
          <p><strong>Support & Dataskydd:</strong> <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a></p>
          <p><strong>Webbplats:</strong> <a href={window.location.origin} className="text-[var(--accent-color)] underline">{window.location.origin}</a></p>
        </div>
      </section>
    </article>
  );
}

/* =========================================================================
   ENGLISH PRIVACY POLICY (For Google OAuth Reviewers)
========================================================================= */
function EnglishPrivacyPolicy() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6">
      <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white border border-black/10 dark:border-white/10 mb-2">
          <Lock size={12} />
          GDPR & Google OAuth Compliant
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Privacy Policy for Dejz
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Last updated: September 23, 2026 | Public Official Notice
        </p>
      </header>

      {/* Summary highlight */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed space-y-2">
        <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Shield size={16} className="text-[var(--accent-color)]" />
          Key Privacy Commitments:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
          <li>Dejz <strong>never</strong> asks for or connects to sensitive bank credentials.</li>
          <li>We <strong>never sell</strong> your personal or financial data to any third parties.</li>
          <li>Google user data is used solely to authenticate your identity and protect your personal budget account.</li>
          <li>You retain full ownership and can permanently delete your account and all associated data at any time.</li>
        </ul>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Data Controller</h2>
        <p className="text-sm leading-relaxed">
          Dejz (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is the controller responsible for the processing of your personal data when using the Dejz application.
          For any data protection inquiries, you can reach our team via email at{' '}
          <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] font-medium underline">
            hej@dejz.se
          </a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">2. What Data We Collect</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>We only collect and process data strictly necessary to provide the budgeting services:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Account & Profile Information:</strong> Email address, name, and profile picture (when provided via email registration or Google Sign-In).
            </li>
            <li>
              <strong>Financial & Budgeting Data:</strong> Incomes, expenses, savings accounts, goals, and transaction notes entered by you manually.
            </li>
            <li>
              <strong>Technical Logs:</strong> Session tokens and timestamps necessary to maintain security and authentication state.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Lock size={18} className="text-[var(--accent-color)]" />
          3. Google API User Data & Limited Use Disclosure
        </h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>
            When you sign in using <strong>Google Sign-In</strong>, Dejz requests access to your basic profile information (email address, full name, and avatar picture).
          </p>
          <p>
            <strong>How we use Google user data:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To verify your identity and grant access to your private budget dashboard without needing a separate password.</li>
            <li>To display your avatar and name inside the app settings.</li>
          </ul>
          <p className="mt-2 font-medium text-[var(--text-primary)]">
            Dejz’s use and transfer of information received from Google APIs adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li>We do not transfer or sell Google user data to third parties.</li>
            <li>We do not use Google user data for serving personalized advertising.</li>
            <li>We do not use Google user data to train generalized AI or machine learning models.</li>
            <li>Human access to user data is strictly prohibited, except where explicitly approved by the user for technical troubleshooting or required by applicable law.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">4. Legal Basis for Processing (GDPR)</h2>
        <p className="text-sm leading-relaxed">
          We process personal data under the following legal bases in accordance with GDPR Article 6:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
          <li><strong>Performance of Contract (Art. 6.1 b):</strong> Required to deliver the Dejz budgeting tools to you.</li>
          <li><strong>Legitimate Interests (Art. 6.1 f):</strong> Protecting app security and preventing fraud.</li>
          <li><strong>Compliance with Legal Obligations (Art. 6.1 c):</strong> Where mandatory financial accounting regulations apply.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">5. Data Retention & Account Deletion</h2>
        <p className="text-sm leading-relaxed">
          We retain your data only for as long as your account remains active. You can <strong>permanently delete your account and all associated budget data</strong> at any time directly in the application settings, or by emailing{' '}
          <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a>. Account deletion immediately and irreversibly wipes all your records from our databases.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">6. Your Rights Under GDPR</h2>
        <p className="text-sm leading-relaxed">
          Under European data protection laws, you have the right to access, rectify, export, restrict, or erase your personal data. To exercise any of these rights, contact us at{' '}
          <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a>.
        </p>
      </section>

      <section className="space-y-3 pt-4 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">7. Contact Information</h2>
        <p className="text-sm leading-relaxed">
          For any privacy questions or requests regarding your personal data:
        </p>
        <div className="p-4 rounded-xl bg-[var(--surface-muted)] text-sm space-y-1 border border-[var(--border-color)]">
          <p><strong>App:</strong> Dejz Personal Budgeting</p>
          <p><strong>Contact Email:</strong> <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a></p>
        </div>
      </section>
    </article>
  );
}

/* =========================================================================
   SWEDISH TERMS OF SERVICE
========================================================================= */
function SwedishTermsOfService() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6">
      <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-[#2D2D2D] text-[#1C1917] dark:text-[#F9F8F6] border border-[#E6E2D8] dark:border-white/10 mb-2">
          <FileText size={12} />
          Officiella användarvillkor
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Användarvillkor för Dejz
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Senast uppdaterad: 23 september 2026 | Gäller tills vidare
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Godkännande av villkor</h2>
        <p className="text-sm leading-relaxed">
          Genom att skapa ett konto eller använda webbapplikationen Dejz godkänner du dessa användarvillkor i sin helhet. 
          Om du inte accepterar villkoren ska du omedelbart avsluta din användning av appen.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">2. Beskrivning av tjänsten</h2>
        <p className="text-sm leading-relaxed">
          Dejz är ett digitalt hjälpmedel för privatekonomisk planering, budgetering, sparuppföljning och kostnadsanalys. 
          Tjänsten tillhandahålls i befintligt skick (&quot;as-is&quot;).
        </p>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">3. Friskrivning från finansiell rådgivning</h2>
        <p className="text-sm leading-relaxed">
          Information, grafer, simuleringar och beräkningar som genereras i Dejz är endast avsedda för informations- och planeringssyften. 
          Dejz tillhandahåller <strong>inte auktoriserad finansiell rådgivning, skatterådgivning eller juridisk rådgivning</strong>. 
          Du fattar alla ekonomiska beslut självständigt och på eget ansvar.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">4. Användarkonto och säkerhet</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>För att använda appen fullt ut behöver du registrera ett konto via e-post eller Google Sign-In:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Du ansvarar för att hålla dina inloggningsuppgifter hemliga.</li>
            <li>Du får inte dela ditt konto med obehöriga eller använda andras inloggningsuppgifter utan tillstånd.</li>
            <li>Om du misstänker obehörig åtkomst till ditt konto ska du omedelbart kontakta oss.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">5. Tillåten användning</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>Du förbinder dig att inte:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Försöka kringgå säkerhetssystem, överbelasta eller störa tjänstens servrar.</li>
            <li>Använda automatiserade verktyg (bots, scrapers) utan skriftligt godkännande.</li>
            <li>Använda Dejz för olagliga eller bedrägliga ändamål.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">6. Immateriella rättigheter</h2>
        <p className="text-sm leading-relaxed">
          Allt innehåll i appen, inklusive varumärket Dejz, källkod, logotyper, design, ikoner och gränssnitt tillhör Dejz och skyddas av upphovsrätt och varumärkeslag.
          Du äger fullt ut all ekonomisk data och text som du själv matar in i appen.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">7. Uppsägning och radering av konto</h2>
        <p className="text-sm leading-relaxed">
          Du kan när som helst avsluta ditt användarkonto och radera din data via inställningarna i appen. 
          Vi förbehåller oss rätten att stänga av konton som allvarligt bryter mot dessa villkor.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">8. Ansvarsbegränsning</h2>
        <p className="text-sm leading-relaxed">
          I den utsträckning det är tillåtet enligt gällande lag ansvarar Dejz inte för direkta, indirekta eller oförutsedda skador, inklusive ekonomisk förlust, till följd av användning eller oförmåga att använda tjänsten.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">9. Ändring av villkor</h2>
        <p className="text-sm leading-relaxed">
          Vi kan uppdatera dessa villkor från tid till annan. Vid väsentliga ändringar informeras du via appen eller via e-post. Fortsatt användning av Dejz efter uppdatering innebär godkännande av de ändrade villkoren.
        </p>
      </section>

      <section className="space-y-3 pt-4 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">10. Tillämplig lag & Kontakt</h2>
        <p className="text-sm leading-relaxed">
          Dessa villkor tolkas och tillämpas i enlighet med svensk lagstiftning. 
          För frågor angående dessa villkor, kontakta oss på <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a>.
        </p>
      </section>
    </article>
  );
}

/* =========================================================================
   ENGLISH TERMS OF SERVICE (For Google Reviewers)
========================================================================= */
function EnglishTermsOfService() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6">
      <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-[#2D2D2D] text-[#1C1917] dark:text-[#F9F8F6] border border-[#E6E2D8] dark:border-white/10 mb-2">
          <FileText size={12} />
          Official Terms of Service
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Terms of Service for Dejz
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Last updated: September 23, 2026 | Public Official Notice
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Acceptance of Terms</h2>
        <p className="text-sm leading-relaxed">
          By creating an account or accessing the Dejz application, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not access or use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">2. Description of Service</h2>
        <p className="text-sm leading-relaxed">
          Dejz is a personal finance and budgeting management platform designed to help individuals calculate budgets, track expenses, and plan savings goals. The service is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis.
        </p>
      </section>

      <section className="space-y-3 p-5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">3. No Financial Advice Disclaimer</h2>
        <p className="text-sm leading-relaxed">
          Calculations, projections, and reports in Dejz are strictly for informational and personal budgeting purposes. Dejz <strong>does not provide certified financial, investment, legal, or tax advice</strong>. All financial actions and decisions are undertaken solely at your own discretion and responsibility.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">4. Accounts and Security</h2>
        <p className="text-sm leading-relaxed">
          You are responsible for safeguarding your login credentials and for any activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">5. User Data Ownership & Account Termination</h2>
        <p className="text-sm leading-relaxed">
          You retain full ownership of the financial entries and content you submit to Dejz. You can delete your account and all associated data at any time via the in-app settings or by contacting <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a>.
        </p>
      </section>

      <section className="space-y-3 pt-4 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">6. Governing Law & Contact</h2>
        <p className="text-sm leading-relaxed">
          These Terms are governed by and construed in accordance with the laws of Sweden. 
          For questions, reach out to <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] underline">hej@dejz.se</a>.
        </p>
      </section>
    </article>
  );
}

/* =========================================================================
   COOKIE POLICY
========================================================================= */
function SwedishCookiePolicy() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6">
      <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Cookiepolicy för Dejz
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Senast uppdaterad: 23 september 2026
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Vad är cookies och lokal lagring?</h2>
        <p className="text-sm leading-relaxed">
          Cookies och lokal lagring (localStorage) är små textfiler som sparas i din webbläsare för att komma ihåg dina val och hålla dig inloggad mellan sidvisningar.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">2. Hur Dejz använder cookies</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>Dejz använder <strong>uteslutande strikt nödvändiga cookies och lokal lagring</strong>:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Autentisering (Session):</strong> Sparar en säker sessionstoken från Supabase så att du slipper logga in vid varje klick.</li>
            <li><strong>Användarinställningar:</strong> Sparar ditt val av ljust/mörkt tema, valt språk och cookie-medgivande.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">3. Inga spårnings- eller annonscookies</h2>
        <p className="text-sm leading-relaxed">
          Vi använder <strong>inga</strong> marknadsförings-, spårnings- eller tredjeparts-annonscookies (t.ex. Google AdSense eller Facebook Pixel). Din aktivitet i Dejz spåras inte över internet.
        </p>
      </section>
    </article>
  );
}

function EnglishCookiePolicy() {
  return (
    <article className="prose prose-slate max-w-none text-[var(--text-secondary)] space-y-6">
      <header className="border-b border-[var(--border-color)] pb-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Cookie Policy for Dejz
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Last updated: September 23, 2026
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Strictly Necessary Storage</h2>
        <p className="text-sm leading-relaxed">
          Dejz only uses strictly necessary session storage and cookies to maintain your authenticated login state and remember your local preferences (such as light/dark mode and language).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">2. No Third-Party Tracking Cookies</h2>
        <p className="text-sm leading-relaxed">
          We do not use advertising or tracking cookies from third-party networks. Your budget activity is strictly private to your account.
        </p>
      </section>
    </article>
  );
}
