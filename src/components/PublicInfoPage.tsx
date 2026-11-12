import { BrandLogo } from './BrandLogo';
import React from 'react';
import { PrivacyPolicyContent, PRIVACY_CONTACT } from './PrivacyPolicy';
import { TermsPage } from './settings/LegalPages';

/**
 * Offentliga sidor som App Store och Google kräver en egen adress för:
 *   dejz.se/integritet · dejz.se/villkor · dejz.se/support
 */
export type PublicPageKind = 'integritet' | 'villkor' | 'support';

export function getPublicPageKind(pathname: string): PublicPageKind | null {
  const p = pathname.replace(/\/+$/, '').toLowerCase();
  if (p === '/integritet' || p === '/integritetspolicy' || p === '/privacy') return 'integritet';
  if (p === '/villkor' || p === '/anvandarvillkor' || p === '/terms') return 'villkor';
  if (p === '/support' || p === '/hjalp' || p === '/kontakt') return 'support';
  return null;
}

const TITLES: Record<PublicPageKind, string> = {
  integritet: 'Integritetspolicy',
  villkor: 'Användarvillkor',
  support: 'Hjälp & kontakt',
};

const Support: React.FC = () => (
  <div className="space-y-6 text-subhead leading-relaxed text-[var(--text-secondary)]">
    <p>
      Har du en fråga, hittat ett fel eller vill ge feedback? Mejla oss så svarar vi så snart vi kan, oftast samma
      dag.
    </p>
    <a
      href={`mailto:${PRIVACY_CONTACT}`}
      className="ui-btn-primary"
    >
      Mejla {PRIVACY_CONTACT}
    </a>
    <section className="space-y-3 pt-2">
      <h3 className="font-display font-semibold text-base tracking-[-0.01em] text-[var(--text-primary)]">Vanliga frågor</h3>
      <p>
        <strong className="text-[var(--text-primary)]">Hur raderar jag mitt konto?</strong> I appen under
        Inställningar → Data &amp; säkerhet → Radera konto. Allt raderas direkt och kan inte återställas.
      </p>
      <p>
        <strong className="text-[var(--text-primary)]">Kan jag koppla min bank?</strong> Bankkoppling kommer snart.
        Till dess lägger du in lön, räkningar och köp själv.
      </p>
      <p>
        <strong className="text-[var(--text-primary)]">Vad kostar Dejz?</strong> Dejz är gratis under betan.
      </p>
    </section>
  </div>
);

export const PublicInfoPage: React.FC<{ kind: PublicPageKind }> = ({ kind }) => {
  React.useEffect(() => {
    document.title = `${TITLES[kind]} – Dejz`;
  }, [kind]);
  // Fast, täckande sidhuvud – hårfin linje när texten scrollar in under det
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-sans">
      <div
        className={`sticky top-0 z-20 bg-[var(--bg-color)] transition-shadow ${
          scrolled ? 'ui-header-scrolled' : ''
        }`}
      >
      <header className="max-w-2xl mx-auto px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] h-[calc(4rem+env(safe-area-inset-top,0px))] flex items-center justify-between">
        <a href="/" aria-label="Till Dejz startsida">
          <BrandLogo className="h-6 text-[var(--accent-color)]" />
        </a>
        <a href="/" className="h-9 px-4 -mr-1 inline-flex items-center rounded-full bg-[var(--btn-secondary-fill)] text-callout font-semibold text-[var(--text-primary)] hover:opacity-80">
          Till appen
        </a>
      </header>
      </div>
      <main className="max-w-2xl mx-auto px-5 pb-16">
        <h1 className="font-display font-bold text-[2rem] leading-tight tracking-[-0.03em] mt-6 mb-6">{TITLES[kind]}</h1>
        {/* Villkoren har egna kort (samma som i appen) – lägg dem inte i ett kort till */}
        {kind === 'villkor' ? (
          <TermsPage />
        ) : (
          <div className="ui-card-p sm:p-7">
            {kind === 'integritet' && <PrivacyPolicyContent />}
            {kind === 'support' && <Support />}
          </div>
        )}
      </main>
    </div>
  );
};
