import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CaretDown,
} from '@phosphor-icons/react';
import { PrivacyPolicySheet } from './PrivacyPolicy';
import { BrandLogo } from './BrandLogo';

/* ------------------------------------------------------------------ */
/*  Väntelista – startsida för besökare som inte är inloggade          */
/* ------------------------------------------------------------------ */

const OPEN_PRIVACY_EVENT = 'dejz-open-privacy';

/** Ber servern skicka tackmejlet. Misslyckas tyst – anmälan är redan sparad. */

/* ---------------------------- Formulär ---------------------------- */

/* --------------------------- Telefonram --------------------------- */

const PhoneFrame: React.FC<{
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}> = ({ src, alt, className = '', eager }) => (
  <div
    className={`relative rounded-[2.6rem] bg-neutral-950 p-[4px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/10 ${className}`}
  >
    <div className="relative overflow-hidden rounded-[2.35rem] bg-[var(--bg-color)]">
      <img
        src={src}
        alt={alt}
        width={1170}
        height={2532}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block w-full h-auto"
      />
      {/* Dynamic Island */}
      <span className="absolute top-[2.2%] left-1/2 -translate-x-1/2 h-[3.3%] w-[30%] rounded-pill bg-neutral-950" />
    </div>
  </div>
);

/* ----------------------------- Sidan ------------------------------ */

const STEPS = [
  {
    src: '/screens/ekonomi.webp?v=12',
    alt: 'Dejz – inkomster och fasta utgifter',
    title: 'Lägg in lön och räkningar',
    text: 'En gång, på under två minuter. Skriv in ditt saldo så drar Dejz av räkningarna som är kvar före lön.',
  },
  {
    src: '/screens/historik.webp?v=12',
    alt: 'Dejz – historik över köp',
    title: 'Logga köp på sekunder',
    text: 'Tryck på + och säg "Ica 342" – Dejz fyller i resten. När du lägger in köpen själv märker du direkt vart pengarna tar vägen.',
  },
  {
    src: '/screens/analys.webp?v=12',
    alt: 'Dejz – analys av utgifter per kategori',
    title: 'Se vart pengarna tar vägen',
    text: 'En tydlig överblick per kategori för varje löneperiod – inte per kalendermånad.',
  },
];

const FAQ = [
  {
    q: 'Vad skiljer Dejz från andra budgetappar?',
    a: 'De flesta budgetappar delar upp pengarna per kalendermånad och kategori. Dejz svarar på en enda fråga: hur mycket kan jag spendera fram till nästa lön utan att gå minus? Räkningar och sparande är redan avräknade, så beloppet du ser är ditt att använda.',
  },
  {
    q: 'Hur funkar sparande?',
    a: 'Skapa ett sparmål och välj hur mycket du vill spara varje månad. Beloppet dras av från det du har kvar att spendera på lönedagen och läggs till i målet automatiskt – betala dig själv först.',
  },
  {
    q: 'Vad kostar det?',
    a: 'Ingenting. Dejz är en gratis betaversion just nu – du behöver inget kort för att komma igång.',
  },
  {
    q: 'Måste jag ladda ner något?',
    a: 'Nej. Dejz fungerar direkt i mobilens webbläsare. Välj "Lägg till på hemskärmen" så ligger Dejz bland dina andra appar.',
  },
  {
    q: 'Kan jag koppla min bank?',
    a: 'Bankkoppling kommer snart. Just nu lägger du in köpen själv – det tar några sekunder (tryck på + och säg "Ica 342") och ger dig extra koll, eftersom du märker varje krona du spenderar. När bankkopplingen är klar kan du välja att koppla din bank, så sköts resten automatiskt.',
  },
  {
    q: 'Vad händer med mina uppgifter?',
    a: 'De används bara för att Dejz ska fungera och säljs aldrig vidare. Du kan radera ditt konto och all data när du vill i inställningarna.',
  },
];

/* ------------------- Jämförelse: månad mot lön ------------------- */

const ComparisonVisual: React.FC = () => (
  <div aria-hidden="true">
    {/* Dejz */}
    <div className="rounded-container p-5 sm:p-6 text-white bg-[image:var(--brand-gradient)] shadow-[0_18px_40px_-18px_rgba(91,61,245,0.6)]">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <BrandLogo className="h-3.5" />
        </span>
        <span className="text-white/75 tabular-nums">6 dagar till lön</span>
      </div>
      <div className="mt-3 text-sm text-white/80">Kvar att spendera till lön</div>
      <div className="mt-0.5 font-display text-[2.5rem] leading-none font-semibold tracking-[-0.035em] tabular-nums">
        2 340 kr
      </div>
      {/* Samma som i appen: stapeln är pengarna som är kvar av löneperioden */}
      <div className="mt-4 h-2 rounded-pill bg-white/20 overflow-hidden">
        <div className="h-full w-[25%] rounded-pill bg-white" />
      </div>
    </div>
  </div>
);

interface WaitlistLandingProps {
  onLogin: () => void;
  onSignup: () => void;
  existingEmail?: string | null;
  onContinueExisting?: () => void;
}

/** Huvudknappen: skapa ett gratis konto. */
const SignupCta: React.FC<{
  onSignup: () => void;
  onDark?: boolean;
  hideNote?: boolean;
  className?: string;
}> = ({ onSignup, onDark, hideNote, className = '' }) => (
  <div className={className}>
    <button
      type="button"
      onClick={onSignup}
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 rounded-pill font-display font-semibold text-base tracking-[-0.01em] active:scale-[0.98] transition-all cursor-pointer ${
        onDark
          ? 'bg-white text-brand-deep hover:bg-white/90'
          : 'bg-[var(--accent-color)] text-[var(--on-accent)] hover:opacity-90 shadow-[0_12px_30px_-12px_rgba(91,61,245,0.6)]'
      }`}
    >
      Skapa konto – gratis
      <ArrowRight size={18} weight="bold" />
    </button>
    {!hideNote && (
      <p className={`mt-3 text-sm ${onDark ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>
        Gratis · Ingen nedladdning · Funkar direkt i mobilen
      </p>
    )}
  </div>
);

export const WaitlistLanding: React.FC<WaitlistLandingProps> = ({
  onLogin,
  onSignup,
  existingEmail,
  onContinueExisting,
}) => {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [privacyOpen, setPrivacyOpen] = useState(() => {
    try {
      return window.location.pathname.replace(/\/$/, '') === '/integritet';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onOpen = () => setPrivacyOpen(true);
    window.addEventListener(OPEN_PRIVACY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PRIVACY_EVENT, onOpen);
  }, []);

  const closePrivacy = () => {
    setPrivacyOpen(false);
    try {
      if (window.location.pathname.replace(/\/$/, '') === '/integritet') {
        window.history.replaceState(null, '', '/');
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {/* Topp */}
        <header className="flex items-center justify-between h-12">
          <BrandLogo className="h-6 text-[var(--accent-color)]" />
          <button
            type="button"
            onClick={onLogin}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer px-2 py-1"
          >
            Logga in
          </button>
        </header>

        {/* Hjälte */}
        <section className="grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-10 items-center pt-10 sm:pt-16 lg:pt-20">
          <div className="text-center lg:text-left animate-fade-in">
            <h1 className="font-display font-semibold text-[2.5rem] leading-[1.02] sm:text-[3.25rem] lg:text-[4rem] tracking-[-0.045em] text-[var(--text-primary)] text-balance">
              Se vad du har kvar till nästa lön.
            </h1>

            <p className="mt-4 text-[17px] sm:text-lg text-[var(--text-secondary)] max-w-[26rem] sm:max-w-lg mx-auto lg:mx-0 leading-[1.45] tracking-[-0.01em] text-pretty">
              Dejz räknar från lön till lön. Räkningar och sparande dras av direkt – så ser du alltid hur
              mycket du kan spendera fram till nästa lön, utan att gå minus.
            </p>

            <SignupCta onSignup={onSignup} className="mt-8" />

            {existingEmail && onContinueExisting && (
              <button
                type="button"
                onClick={onContinueExisting}
                className="mt-4 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer truncate max-w-full"
              >
                Fortsätt som {existingEmail} →
              </button>
            )}
          </div>

          {/* Telefoner */}
          <div className="relative mx-auto w-full max-w-[420px] h-[560px] sm:h-[620px]">
            <div className="absolute inset-x-6 top-16 bottom-6 rounded-full bg-[radial-gradient(closest-side,rgba(91,61,245,0.22),transparent)] blur-2xl" />
            <div className="hidden sm:block absolute right-0 top-12 w-[230px] rotate-[6deg]">
              <PhoneFrame src="/screens/analys.webp?v=12" alt="" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 sm:left-2 sm:translate-x-0 top-0 w-[255px] sm:w-[270px]">
              <PhoneFrame src="/screens/home.webp?v=12" alt="Dejz hemskärm – kvar att spendera" eager />
            </div>
          </div>
        </section>

        {/* Lön till lön – det som gör Dejz annorlunda */}
        <section className="mt-24 sm:mt-32 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <h2 className="font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em] text-balance">
              Andra appar räknar till månadsskiftet. Dejz räknar till lön.
            </h2>
            <p className="mt-4 text-[var(--text-secondary)] leading-[1.5] tracking-[-0.005em] max-w-xl mx-auto lg:mx-0 text-pretty">
              Pengarna tar inte slut vid månadsskiftet – de tar slut innan lön. Därför räknar Dejz från
              lönedag till lönedag och drar av hyra, räkningar och sparande direkt. Det du ser är det du
              faktiskt kan spendera – utan att hamna på minus innan lönen kommer. Infaller lönen på en helg
              flyttas den automatiskt.
            </p>
          </div>

          <ComparisonVisual />
        </section>

        {/* Så funkar det */}
        <section className="mt-24 sm:mt-32">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em] text-balance">
              Tre steg. Sen vet du alltid.
            </h2>
          </div>

          <div className="mt-12 grid gap-14 sm:gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.src} className="flex flex-col items-center text-center">
                <PhoneFrame src={s.src} alt={s.alt} className="w-[230px] sm:w-full sm:max-w-[250px]" />
                <span className="mt-7 w-7 h-7 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display font-semibold text-lg tracking-[-0.01em]">{s.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-[1.5] max-w-xs">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vanliga frågor */}
        <section className="mt-24 sm:mt-32 max-w-2xl mx-auto">
          <h2 className="text-center font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em]">
            Vanliga frågor
          </h2>
          <div className="mt-8 rounded-card bg-[var(--surface-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4 sm:px-6">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-display font-semibold text-base [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <CaretDown
                    size={16}
                    weight="bold"
                    className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-[1.55]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Avslutande CTA */}
        <section className="relative overflow-hidden mt-24 sm:mt-32 rounded-container text-white px-6 py-12 sm:px-12 sm:py-16 text-center bg-[radial-gradient(120%_90%_at_100%_0%,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_55%),radial-gradient(80%_70%_at_0%_100%,rgba(255,140,210,0.3)_0%,rgba(255,140,210,0)_60%),var(--brand-gradient)] shadow-[0_24px_60px_-24px_rgba(91,61,245,0.7)]">
          <h2 className="font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em] text-balance">
            Se vad du har kvar till nästa lön.
          </h2>
          <p className="mt-3 text-white/80 max-w-md mx-auto">
            Kom igång på två minuter, utan kort. Bankkoppling kommer snart.
          </p>
          <SignupCta onSignup={onSignup} onDark hideNote className="mt-8" />
        </section>

        <footer className="mt-12 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-4 text-[var(--accent-color)]" />
            <span>© {currentYear} Dejz</span>
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Integritetspolicy
            </button>
          </div>
          <button
            type="button"
            onClick={onLogin}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Har du redan ett konto? Logga in
          </button>
        </footer>
      </div>
      <PrivacyPolicySheet open={privacyOpen} onClose={closePrivacy} />
    </div>
  );
};
