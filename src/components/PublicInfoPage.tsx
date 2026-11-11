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
  <div className="space-y-6 text-sm leading-relaxed text-[var(--text-secondary)]">
    <p>
      Har du en fråga, hittat ett fel eller vill ge feedback? Mejla oss så svarar vi så snart vi kan, oftast samma
      dag.
    </p>
    <a
      href={`mailto:${PRIVACY_CONTACT}`}
      className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] font-semibold"
    >
      {PRIVACY_CONTACT}
    </a>
    <section className="space-y-2">
      <h3 className="font-display font-semibold text-[15px] text-[var(--text-primary)]">Vanliga frågor</h3>
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
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-sans">
      <header className="max-w-2xl mx-auto px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4 flex items-center justify-between">
        <a href="/" aria-label="Till Dejz startsida">
          <BrandLogo className="h-6 text-[var(--accent-color)]" />
        </a>
        <a href="/" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Till appen
        </a>
      </header>
      <main className="max-w-2xl mx-auto px-5 pb-16">
        <h1 className="font-display font-semibold text-3xl tracking-[-0.02em] mb-6">{TITLES[kind]}</h1>
        <div className="rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-6">
          {kind === 'integritet' && <PrivacyPolicyContent />}
          {kind === 'villkor' && <TermsPage />}
          {kind === 'support' && <Support />}
        </div>
      </main>
    </div>
  );
};
