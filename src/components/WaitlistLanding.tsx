import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle,
  Lightning,
  Microphone,
  MusicNotes,
  ShareNetwork,
  ShoppingCart,
  SpinnerGap,
  Train,
  ArrowsLeftRight,
  WarningCircle,
  Wallet,
} from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';

/* ------------------------------------------------------------------ */
/*  Väntelista – startsida för besökare som inte är inloggade          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'dejz_waitlist_email';

const SOURCES = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'van', label: 'En vän' },
  { id: 'google', label: 'Google' },
  { id: 'annat', label: 'Annat' },
];

const PAINS = [
  'Pengarna tar slut innan lön',
  'Vet inte vart pengarna tar vägen',
  'Glömmer fasta räkningar',
  'Svårt att spara',
];

type Step = 'form' | 'questions' | 'done';

function readStoredEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readUtmSource(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('utm_source') || params.get('ref') || null;
  } catch {
    return null;
  }
}

async function joinWaitlist(payload: {
  email: string;
  source?: string | null;
  pain?: string | null;
}) {
  const client: any = supabase;
  if (typeof client.rpc !== 'function') {
    throw new Error('not_configured');
  }
  const { error } = await client.rpc('join_waitlist', {
    p_email: payload.email,
    p_source: payload.source ?? null,
    p_pain: payload.pain ?? null,
    p_utm_source: readUtmSource(),
  });
  if (error) throw error;
}

/* ---------------------------- Formulär ---------------------------- */

const WaitlistForm: React.FC<{ inputRef?: React.Ref<HTMLInputElement>; compact?: boolean }> = ({
  inputRef,
  compact,
}) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>(() => (readStoredEmail() ? 'done' : 'form'));
  const [savedEmail, setSavedEmail] = useState<string | null>(() => readStoredEmail());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [pain, setPain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Håll båda formulären på sidan i synk
  useEffect(() => {
    const onJoined = () => {
      const stored = readStoredEmail();
      if (stored) {
        setSavedEmail(stored);
        setStep((prev) => (prev === 'form' ? 'done' : prev));
      }
    };
    window.addEventListener('dejz-waitlist-joined', onJoined);
    return () => window.removeEventListener('dejz-waitlist-joined', onJoined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      setError('Kontrollera e-postadressen.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await joinWaitlist({ email: clean });
      try {
        localStorage.setItem(STORAGE_KEY, clean);
      } catch {
        // ignore
      }
      setSavedEmail(clean);
      setStep('questions');
      window.dispatchEvent(new Event('dejz-waitlist-joined'));
    } catch (err: any) {
      const msg = String(err?.message || '');
      setError(
        msg.includes('invalid_email')
          ? 'Kontrollera e-postadressen.'
          : 'Något gick fel. Försök igen om en liten stund.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswers = async () => {
    if (savedEmail && (source || pain)) {
      try {
        await joinWaitlist({ email: savedEmail, source, pain });
      } catch {
        // Svaren är en bonus – e-posten är redan sparad
      }
    }
    setStep('done');
  };

  const handleShare = async () => {
    const url = 'https://dejz.se/?ref=dela';
    const text = 'Kolla Dejz – appen som visar vad du har kvar till nästa lön.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Dejz', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // användaren avbröt
    }
  };

  if (step === 'questions') {
    return (
      <div className="rounded-card bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 space-y-5 text-left animate-scale-in shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle size={26} weight="fill" className="text-emerald-500 shrink-0" />
          <div>
            <p className="font-display font-semibold text-[var(--text-primary)]">Du är med på listan!</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Två snabba frågor hjälper mig bygga rätt saker. Helt frivilligt.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Var hittade du Dejz?</p>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <Chip key={s.id} active={source === s.id} onClick={() => setSource(source === s.id ? null : s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Vad är svårast med din ekonomi?</p>
          <div className="flex flex-wrap gap-2">
            {PAINS.map((p) => (
              <Chip key={p} active={pain === p} onClick={() => setPain(pain === p ? null : p)}>
                {p}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleAnswers}
            className="flex-1 h-12 rounded-btn bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            {source || pain ? 'Skicka' : 'Klar'}
          </button>
          {!(source || pain) && (
            <button
              type="button"
              onClick={() => setStep('done')}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer px-2"
            >
              Hoppa över
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="rounded-card bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 text-left animate-scale-in shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle size={26} weight="fill" className="text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className="font-display font-semibold text-[var(--text-primary)]">Tack – du står på listan</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Vi mejlar{' '}
              {savedEmail ? (
                <span className="font-medium text-[var(--text-primary)] break-all">{savedEmail}</span>
              ) : (
                'dig'
              )}{' '}
              så fort Dejz öppnar.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="mt-4 w-full h-12 rounded-btn bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer"
        >
          {copied ? <Check size={16} weight="bold" /> : <ShareNetwork size={16} weight="bold" />}
          {copied ? 'Länk kopierad' : 'Tipsa en vän'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
      <div
        className={`flex flex-col sm:flex-row gap-2 ${
          compact ? '' : 'sm:p-1.5 sm:rounded-card sm:bg-[var(--surface-color)] sm:border sm:border-[var(--border-subtle)] sm:shadow-sm'
        }`}
      >
        <input
          ref={inputRef}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Din e-postadress"
          aria-label="E-postadress"
          className="w-full sm:flex-1 min-w-0 h-12 px-4 rounded-btn bg-[var(--surface-color)] sm:bg-transparent border border-[var(--border-subtle)] sm:border-0 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--text-primary)]/15 sm:focus:ring-0"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-5 rounded-btn bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 shrink-0"
        >
          {loading ? <SpinnerGap size={16} className="animate-spin" /> : null}
          <span>Få tidig tillgång</span>
          {!loading && <ArrowRight size={16} weight="bold" />}
        </button>
      </div>
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <WarningCircle size={14} weight="bold" />
          {error}
        </p>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Gratis. Vi mejlar bara när Dejz öppnar – inget spam.
        </p>
      )}
    </form>
  );
};

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3.5 py-2 rounded-pill text-xs font-medium border transition-all cursor-pointer active:scale-[0.97] ${
      active
        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
        : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
    }`}
  >
    {children}
  </button>
);

/* -------------------------- Mobil-mockup -------------------------- */

const MOCK_TX = [
  { name: 'ICA Nära', cat: 'Mat', amount: -186, icon: ShoppingCart, tint: 'bg-emerald-500/12 text-emerald-600' },
  { name: 'Spotify', cat: 'Prenumeration', amount: -129, icon: MusicNotes, tint: 'bg-violet-500/12 text-violet-600' },
  { name: 'Swish från Emma', cat: 'Middag', amount: 250, icon: ArrowsLeftRight, tint: 'bg-sky-500/12 text-sky-600' },
  { name: 'SL', cat: 'Resor', amount: -45, icon: Train, tint: 'bg-amber-500/14 text-amber-600' },
];

const kr = (n: number) =>
  `${n < 0 ? '−' : n > 0 ? '+' : ''}${Math.abs(n).toLocaleString('sv-SE')} kr`;

const PhoneMockup: React.FC = () => (
  <div className="relative mx-auto w-[280px] sm:w-[300px]" aria-hidden="true">
    {/* Mjuk glöd bakom */}
    <div className="absolute -inset-10 rounded-full bg-emerald-400/20 blur-3xl" />

    <div className="relative rounded-[2.75rem] bg-neutral-900 p-2.5 shadow-2xl shadow-black/25">
      <div className="relative overflow-hidden rounded-[2.25rem] bg-[var(--bg-color)]">
        {/* Statusrad */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-[var(--text-primary)]">
          <span>9:41</span>
          <span className="h-5 w-20 rounded-pill bg-neutral-900" />
          <span className="tabular-nums">100%</span>
        </div>

        <div className="px-3.5 pb-5 pt-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <img src="/dejz_mork.png" alt="" className="h-3.5 w-auto" />
            <span className="w-6 h-6 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[9px] font-semibold text-[var(--text-primary)]">
              S
            </span>
          </div>

          {/* Hjältekort */}
          <div className="rounded-card bg-[var(--surface-color)] p-4 shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
              <span>Kvar att spendera</span>
              <span className="tabular-nums">25 okt – 24 nov</span>
            </div>
            <div className="font-display text-[28px] font-semibold tracking-[-0.02em] leading-tight tabular-nums text-[var(--text-primary)] mt-0.5">
              6 840 kr
            </div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-pill bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              ≈ 342 kr per dag · 20 dagar till lön
            </div>
            <div className="mt-3 h-1.5 w-full rounded-pill bg-[var(--bg-color)] overflow-hidden">
              <div className="h-full w-[58%] rounded-pill bg-[var(--text-primary)]" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-3">
              {[
                { l: 'Inkomst', v: '+28 500', c: 'text-emerald-600' },
                { l: 'Fasta', v: '−14 200', c: 'text-[var(--text-primary)]' },
                { l: 'Rörligt', v: '−7 460', c: 'text-[var(--text-primary)]' },
              ].map((s) => (
                <div key={s.l} className="min-w-0">
                  <div className="text-[9px] text-[var(--text-secondary)]">{s.l}</div>
                  <div className={`font-display text-[12px] font-semibold tabular-nums ${s.c}`}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaktioner */}
          <div className="rounded-card bg-[var(--surface-color)] shadow-sm">
            <div className="px-4 pt-3 pb-1 text-[10px] font-medium text-[var(--text-secondary)]">Idag</div>
            {MOCK_TX.map((t, i) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.name}
                  className={`flex items-center gap-2.5 px-4 py-2.5 ${
                    i > 0 ? 'border-t border-[var(--border-subtle)]' : ''
                  }`}
                >
                  <span className={`w-7 h-7 rounded-icon-button flex items-center justify-center shrink-0 ${t.tint}`}>
                    <Icon size={14} weight="fill" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-[var(--text-primary)] truncate">{t.name}</div>
                    <div className="text-[9px] text-[var(--text-secondary)]">{t.cat}</div>
                  </div>
                  <span
                    className={`font-display text-[11px] font-semibold tabular-nums ${
                      t.amount > 0 ? 'text-emerald-600' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {kr(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    {/* Flytande "röst-inmatning" */}
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
      <div className="animate-float flex items-center gap-2 rounded-pill bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-lg shadow-black/10 pl-1.5 pr-3.5 py-1.5">
        <span className="w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center">
          <Microphone size={13} weight="fill" />
        </span>
        <span className="text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap">
          ”Lunch 129 kr”
        </span>
      </div>
    </div>
  </div>
);

/* ----------------------------- Sidan ------------------------------ */

const FEATURES = [
  {
    icon: Wallet,
    title: 'Ett tal som säger allt',
    text: 'Dejz visar vad du kan spendera idag – utan att pengarna tar slut innan lön.',
  },
  {
    icon: CalendarCheck,
    title: 'Räkningarna är redan räknade',
    text: 'Hyra, el och prenumerationer dras av direkt. Det du ser är faktiskt ditt.',
  },
  {
    icon: Lightning,
    title: 'Logga köp på sekunder',
    text: 'Skriv eller säg ”Lunch 129 kr” – Dejz sorterar in det åt dig.',
  },
];

interface WaitlistLandingProps {
  onLogin: () => void;
  existingEmail?: string | null;
  onContinueExisting?: () => void;
}

export const WaitlistLanding: React.FC<WaitlistLandingProps> = ({
  onLogin,
  existingEmail,
  onContinueExisting,
}) => {
  const heroInputRef = useRef<HTMLInputElement>(null);

  const scrollToForm = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => heroInputRef.current?.focus({ preventScroll: true }), 450);
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {/* Topp */}
        <header className="flex items-center justify-between h-12">
          <img src="/dejz_mork.png" alt="Dejz" className="h-6 w-auto object-contain" />
          <button
            type="button"
            onClick={onLogin}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer px-2 py-1"
          >
            Logga in
          </button>
        </header>

        {/* Hjälte */}
        <section className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-8 items-center pt-8 sm:pt-14 lg:pt-16">
          <div className="text-center lg:text-left animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-pill bg-[var(--surface-color)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Snart i App Store · Tidig tillgång
            </span>

            <h1 className="mt-5 font-display font-semibold text-[2.1rem] leading-[1.08] sm:text-5xl lg:text-[3.6rem] tracking-[-0.03em] text-[var(--text-primary)]">
              Vet du vad du har kvar till nästa lön?
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Dejz räknar ut exakt hur mycket du kan spendera varje dag – från lön till lön. Räkningar och
              sparande dras av automatiskt.
            </p>

            <div className="mt-7 max-w-md mx-auto lg:mx-0">
              <WaitlistForm inputRef={heroInputRef} />
            </div>

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

          <div className="pb-4">
            <PhoneMockup />
          </div>
        </section>

        {/* Fördelar */}
        <section className="mt-20 sm:mt-28">
          <h2 className="text-center font-display font-semibold text-2xl sm:text-3xl tracking-[-0.02em]">
            Budget utan Excel och dåligt samvete
          </h2>
          <div className="mt-8 grid gap-3 sm:gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-card bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 sm:p-6"
                >
                  <span className="w-10 h-10 rounded-icon-button bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-primary)]">
                    <Icon size={20} weight="duotone" />
                  </span>
                  <h3 className="mt-4 font-display font-semibold text-base">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Personlig not + avslutande CTA */}
        <section className="mt-20 sm:mt-28 rounded-container bg-neutral-900 text-white px-6 py-10 sm:px-12 sm:py-14 text-center">
          <p className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.02em] max-w-2xl mx-auto">
            ”Jag byggde Dejz för att jag själv aldrig visste vad jag hade kvar innan lön.”
          </p>
          <p className="mt-3 text-sm text-white/60">Kevin, grundare av Dejz</p>
          <button
            type="button"
            onClick={scrollToForm}
            className="mt-7 h-12 px-6 rounded-btn bg-white text-neutral-900 font-display font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            Ställ dig på väntelistan
            <ArrowRight size={16} weight="bold" />
          </button>
        </section>

        <footer className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span>© {new Date().getFullYear()} Dejz · Byggd i Sverige</span>
          <button
            type="button"
            onClick={onLogin}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Har du redan ett konto? Logga in
          </button>
        </footer>
      </div>
    </div>
  );
};
