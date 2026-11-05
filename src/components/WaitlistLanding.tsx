import React, { useEffect, useRef, useState } from 'react';
import {
  AppleLogo,
  ArrowRight,
  CaretDown,
  LockSimple,
  Eye,
  ArrowsClockwise,
  Check,
  CheckCircle,
  ShareNetwork,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';
import { PrivacyPolicySheet } from './PrivacyPolicy';

/* ------------------------------------------------------------------ */
/*  Väntelista – startsida för besökare som inte är inloggade          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'dejz_waitlist_email';
const POSITION_KEY = 'dejz_waitlist_position';
const OPEN_PRIVACY_EVENT = 'dejz-open-privacy';

function readStoredPosition(): number | null {
  try {
    const n = Number(localStorage.getItem(POSITION_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

const openPrivacy = () => window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT));

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

/** Returnerar platsen i kön (0 = okänd). */
async function joinWaitlist(payload: {
  email: string;
  source?: string | null;
  pain?: string | null;
  website?: string;
  elapsedMs?: number;
}): Promise<number> {
  const client: any = supabase;
  if (typeof client.rpc !== 'function') {
    throw new Error('not_configured');
  }
  const base = {
    p_email: payload.email,
    p_source: payload.source ?? null,
    p_pain: payload.pain ?? null,
    p_utm_source: readUtmSource(),
  };
  const { data, error } = await client.rpc('join_waitlist', {
    ...base,
    p_website: payload.website ?? null,
    p_elapsed_ms: payload.elapsedMs ?? null,
  });
  if (error) {
    // Om spamskydds-migrationen inte är körd än: använd den gamla funktionen
    const msg = `${error.code || ''} ${error.message || ''}`;
    if (msg.includes('PGRST202') || msg.includes('Could not find the function')) {
      const { error: legacyError } = await client.rpc('join_waitlist', base);
      if (legacyError) throw legacyError;
      return 0;
    }
    throw error;
  }
  return typeof data === 'number' ? data : 0;
}

/** Ber servern skicka tackmejlet. Misslyckas tyst – anmälan är redan sparad. */
function requestWelcomeEmail(email: string) {
  try {
    const client: any = supabase;
    client?.functions?.invoke?.('waitlist-welcome', { body: { email } })?.catch?.(() => {});
  } catch {
    // ignore
  }
}

/* ---------------------------- Formulär ---------------------------- */

const WaitlistForm: React.FC<{ inputRef?: React.Ref<HTMLInputElement>; onDark?: boolean }> = ({
  inputRef,
  onDark,
}) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>(() => (readStoredEmail() ? 'done' : 'form'));
  const [savedEmail, setSavedEmail] = useState<string | null>(() => readStoredEmail());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [pain, setPain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState<number | null>(() => readStoredPosition());
  // Spamskydd: dolt fält som bara botar fyller i, och tiden formuläret varit öppet
  const [website, setWebsite] = useState('');
  const mountedAtRef = useRef(Date.now());

  // Håll båda formulären på sidan i synk
  useEffect(() => {
    const onJoined = () => {
      const stored = readStoredEmail();
      if (stored) {
        setSavedEmail(stored);
        setStep((prev) => (prev === 'form' ? 'done' : prev));
        setPosition(readStoredPosition());
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
      const queuePosition = await joinWaitlist({
        email: clean,
        website,
        elapsedMs: Date.now() - mountedAtRef.current,
      });
      try {
        localStorage.setItem(STORAGE_KEY, clean);
        if (queuePosition > 0) localStorage.setItem(POSITION_KEY, String(queuePosition));
      } catch {
        // ignore
      }
      if (queuePosition > 0) {
        setPosition(queuePosition);
        requestWelcomeEmail(clean);
      }
      setSavedEmail(clean);
      setStep('questions');
      window.dispatchEvent(new Event('dejz-waitlist-joined'));
    } catch (err: any) {
      const msg = String(err?.message || '');
      setError(
        msg.includes('invalid_email')
          ? 'Kontrollera e-postadressen.'
          : msg.includes('rate_limited')
          ? 'Många anmälningar härifrån just nu. Vänta en stund och försök igen.'
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
            <p className="font-display font-semibold text-[var(--text-primary)]">
              {position ? `Du är med – nummer ${position} i kön!` : 'Du är med på listan!'}
            </p>
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
            <p className="font-display font-semibold text-[var(--text-primary)]">
              {position ? `Tack – du är nummer ${position} i kön` : 'Tack – du står på listan'}
            </p>
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
    <form onSubmit={handleSubmit} noValidate className="relative space-y-2.5">
      {/* Dolt fält mot botar – syns inte för människor och skärmläsare */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label>
          Webbplats
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:p-1.5 sm:rounded-card sm:bg-[var(--surface-color)] sm:border sm:border-[var(--border-subtle)] sm:shadow-sm">
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
          className={`h-12 px-5 rounded-btn ${
            onDark
              ? 'bg-white text-neutral-950 sm:bg-[var(--text-primary)] sm:text-[var(--bg-color)]'
              : 'bg-[var(--text-primary)] text-[var(--bg-color)]'
          } font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 shrink-0`}
        >
          {loading ? <SpinnerGap size={16} className="animate-spin" /> : null}
          <span>Få tidig tillgång</span>
          {!loading && <ArrowRight size={16} weight="bold" />}
        </button>
      </div>
      {error ? (
        <p className={`flex items-center gap-1.5 text-xs font-medium ${onDark ? 'text-rose-400' : 'text-rose-600'}`}>
          <WarningCircle size={14} weight="bold" />
          {error}
        </p>
      ) : (
        <p className={`text-xs leading-relaxed ${onDark ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
          Gratis och inget spam. Genom att skriva upp dig godkänner du att vi sparar din e-post enligt vår{' '}
          <button
            type="button"
            onClick={openPrivacy}
            className={`underline underline-offset-2 cursor-pointer ${
              onDark ? 'hover:text-white' : 'hover:text-[var(--text-primary)]'
            }`}
          >
            integritetspolicy
          </button>
          .
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

/* --------------------------- Telefonram --------------------------- */

const PhoneFrame: React.FC<{
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}> = ({ src, alt, className = '', eager }) => (
  <div
    className={`relative rounded-[3rem] bg-neutral-950 p-[9px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/10 ${className}`}
  >
    <div className="relative overflow-hidden rounded-[2.45rem] bg-[var(--bg-color)]">
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
    src: '/screens/ekonomi.png?v=5',
    alt: 'Dejz – inkomster och fasta utgifter',
    title: 'Koppla din bank',
    text: 'Dejz hittar din lön, hyra och prenumerationer och räknar av dem varje löneperiod.',
  },
  {
    src: '/screens/historik.png?v=5',
    alt: 'Dejz – historik över köp',
    title: 'Köpen dyker upp av sig själva',
    text: 'Varje köp hamnar i Dejz med butik, logga och kategori. Du behöver inte göra något.',
  },
  {
    src: '/screens/analys.png?v=5',
    alt: 'Dejz – analys av utgifter per kategori',
    title: 'Se vart pengarna tar vägen',
    text: 'En tydlig överblick per kategori för varje löneperiod – inte per kalendermånad.',
  },
];

const FAQ = [
  {
    q: 'Vad skiljer Dejz från andra budgetappar?',
    a: 'Dejz räknar från lön till lön i stället för per kalendermånad. Du ser ett enda belopp – vad du har kvar fram till nästa lön – där räkningar och sparande redan är avräknade.',
  },
  {
    q: 'Är det säkert att koppla min bank?',
    a: 'Ja. Kopplingen sker via Enable Banking, en licensierad tjänst för öppen bankdata enligt EU:s regler (PSD2). Du loggar in med BankID hos din egen bank. Dejz kan bara läsa saldo och transaktioner – aldrig flytta pengar – och du kan koppla bort banken när du vill.',
  },
  {
    q: 'Måste jag koppla min bank?',
    a: 'Nej, men det är så Dejz fungerar bäst – då uppdateras allt av sig självt. Vill du hellre sköta det själv lägger du in lön och räkningar en gång och loggar köp med text eller röst på några sekunder.',
  },
  {
    q: 'När kommer appen?',
    a: 'Dejz kommer snart till App Store och Google Play. Du som står på väntelistan får testa först – vi mejlar dig när det är dags.',
  },
  {
    q: 'Vad händer med min e-postadress?',
    a: 'Den används bara för att höra av oss om Dejz – till exempel när du kan börja använda appen. Vill du bli borttagen räcker det att svara på mejlet.',
  },
];

/* ------------------------- Lön-till-lön-visual ------------------------- */

const PaydayTimeline: React.FC = () => (
  <div
    className="rounded-container bg-[var(--surface-color)] border border-[var(--border-subtle)] p-6 sm:p-8 shadow-sm"
    aria-hidden="true"
  >
    <div className="flex items-baseline justify-between text-sm text-[var(--text-secondary)]">
      <span>Kvar att spendera</span>
      <span className="tabular-nums">20 dagar till lön</span>
    </div>
    <div className="mt-1 font-display text-4xl sm:text-5xl font-semibold tracking-[-0.03em] tabular-nums">
      17 371 kr
    </div>

    <div className="mt-8">
      <div className="relative h-2 rounded-pill bg-[var(--bg-color)]">
        <div className="absolute inset-y-0 left-0 w-[39%] rounded-pill bg-[var(--text-primary)]" />
        <div className="absolute top-1/2 left-[39%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--surface-color)] border-[3px] border-[var(--text-primary)]" />
        <span className="absolute -top-7 left-[39%] -translate-x-1/2 rounded-pill bg-[var(--text-primary)] text-[var(--bg-color)] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
          Idag
        </span>
      </div>
      <div className="mt-3 flex justify-between text-xs">
        <div>
          <div className="font-semibold text-[var(--text-primary)]">Lön</div>
          <div className="text-[var(--text-muted)] tabular-nums">23 okt</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-[var(--text-primary)]">Nästa lön</div>
          <div className="text-[var(--text-muted)] tabular-nums">25 nov</div>
        </div>
      </div>
    </div>

    <div className="mt-7 pt-5 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-3 text-xs">
      <div>
        <div className="text-[var(--text-secondary)]">Lön</div>
        <div className="mt-0.5 font-display font-semibold text-sm text-emerald-600 tabular-nums">+34 700</div>
      </div>
      <div>
        <div className="text-[var(--text-secondary)]">Räkningar</div>
        <div className="mt-0.5 font-display font-semibold text-sm tabular-nums">−11 414</div>
      </div>
      <div>
        <div className="text-[var(--text-secondary)]">Köp hittills</div>
        <div className="mt-0.5 font-display font-semibold text-sm tabular-nums">−5 915</div>
      </div>
    </div>
  </div>
);

/* ---------------------- Kommer snart i butikerna ---------------------- */

/** Google Play-symbolen i sina fyra färger (Apples symbol är alltid enfärgad). */
const GooglePlayColor: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <g strokeLinejoin="round" strokeWidth="1.2">
      <path d="M4.2 2.4 L13.6 12 L4.2 21.6 Q3.4 21.2 3.4 20.2 V3.8 Q3.4 2.8 4.2 2.4 Z" fill="#4285F4" stroke="#4285F4" />
      <path d="M4.2 2.4 L16.6 9.2 L13.6 12 Z" fill="#34A853" stroke="#34A853" />
      <path d="M4.2 21.6 L13.6 12 L16.6 14.8 Z" fill="#EA4335" stroke="#EA4335" />
      <path d="M16.6 9.2 L20.1 11.1 Q21.6 12 20.1 12.9 L16.6 14.8 L13.6 12 Z" fill="#FBBC04" stroke="#FBBC04" />
    </g>
  </svg>
);

const StoreBadge: React.FC<{ icon: React.ReactNode; store: string }> = ({ icon, store }) => (
  <div
    className="inline-flex items-center gap-2.5 h-12 pl-3.5 pr-4 rounded-btn bg-[var(--text-primary)] text-[var(--bg-color)] select-none"
    aria-label={`Kommer snart på ${store}`}
  >
    {icon}
    <span className="text-left leading-none">
      <span className="block text-[10px] opacity-75">Kommer snart på</span>
      <span className="block mt-1 font-display font-semibold text-[15px] tracking-[-0.01em]">{store}</span>
    </span>
  </div>
);

const StoreBadges: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
    <StoreBadge icon={<AppleLogo size={24} weight="fill" />} store="App Store" />
    <StoreBadge icon={<GooglePlayColor size={22} />} store="Google Play" />
  </div>
);

/* --------------------------- Bankkoppling --------------------------- */

const BANKS = [
  { file: 'seb', name: 'SEB' },
  { file: 'swedbank', name: 'Swedbank' },
  { file: 'handelsbanken', name: 'Handelsbanken' },
  { file: 'nordea', name: 'Nordea' },
  { file: 'lansforsakringar', name: 'Länsförsäkringar' },
  { file: 'danske', name: 'Danske Bank' },
  { file: 'icabanken', name: 'ICA Banken' },
  { file: 'skandia', name: 'Skandia' },
  { file: 'sbab', name: 'SBAB' },
  { file: 'revolut', name: 'Revolut' },
  { file: 'klarna', name: 'Klarna' },
];

const BANK_POINTS = [
  { icon: LockSimple, text: 'Du loggar in med BankID hos din egen bank' },
  { icon: Eye, text: 'Dejz kan bara läsa – aldrig flytta pengar' },
  { icon: ArrowsClockwise, text: 'Saldo och köp uppdateras av sig själva' },
];

const BankSection: React.FC = () => (
  <section className="mt-24 sm:mt-32 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
    <div className="text-center lg:text-left">
      <h2 className="font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em] text-balance">
        Koppla din bank. Se alltid vad du har kvar.
      </h2>
      <p className="mt-4 text-[var(--text-secondary)] leading-[1.5] tracking-[-0.005em] max-w-xl mx-auto lg:mx-0 text-pretty">
        När banken är kopplad räknar Dejz av varje köp direkt. Du behöver aldrig skriva in något – du öppnar
        appen och ser hur mycket du har kvar till nästa lön, just nu.
      </p>
      <ul className="mt-6 space-y-3 max-w-md mx-auto lg:mx-0 text-left">
        {BANK_POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
            <span className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent-color)] flex items-center justify-center shrink-0">
              <Icon size={16} weight="bold" />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>

    <div className="rounded-container bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 sm:p-7 shadow-sm">
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {BANKS.map((bank) => (
          <div
            key={bank.file}
            className="h-14 sm:h-16 rounded-card-nested bg-white border border-[var(--border-subtle)] flex items-center justify-center px-3"
          >
            <img
              src={`/banks/${bank.file}.png`}
              alt={bank.name}
              loading="lazy"
              decoding="async"
              className="max-h-5 sm:max-h-6 max-w-full w-auto object-contain"
            />
          </div>
        ))}
        <div className="h-14 sm:h-16 rounded-card-nested bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-center px-2">
          <span className="text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] leading-tight">
            + över 100 banker till
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--text-muted)] text-center">
        Bankkopplingen sker säkert via Enable Banking.
      </p>
    </div>
  </section>
);

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
        <section className="grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-10 items-center pt-10 sm:pt-16 lg:pt-20">
          <div className="text-center lg:text-left animate-fade-in">
            <h1 className="font-display font-semibold text-[2.5rem] leading-[1.02] sm:text-[3.25rem] lg:text-[4rem] tracking-[-0.045em] text-[var(--text-primary)] text-balance">
              Vet du vad du har kvar till nästa lön?
            </h1>

            <p className="mt-4 text-[17px] sm:text-lg text-[var(--text-secondary)] max-w-[26rem] sm:max-w-lg mx-auto lg:mx-0 leading-[1.45] tracking-[-0.01em] text-pretty">
              Koppla din bank och se direkt hur mycket du kan spendera fram till nästa lön. Räkningar och
              sparande räknas av automatiskt.
            </p>

            <div className="mt-8 max-w-md mx-auto lg:mx-0">
              <WaitlistForm inputRef={heroInputRef} />
            </div>

            <StoreBadges className="mt-6 justify-center lg:justify-start" />

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
              <PhoneFrame src="/screens/analys.png?v=5" alt="" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 sm:left-2 sm:translate-x-0 top-0 w-[255px] sm:w-[270px]">
              <PhoneFrame src="/screens/home.png?v=5" alt="Dejz hemskärm – kvar att spendera" eager />
            </div>
          </div>
        </section>

        {/* Lön till lön – det som gör Dejz annorlunda */}
        <section className="mt-24 sm:mt-32 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <h2 className="font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em] text-balance">
              Din budget börjar när lönen kommer – inte den 1:a
            </h2>
            <p className="mt-4 text-[var(--text-secondary)] leading-[1.5] tracking-[-0.005em] max-w-xl mx-auto lg:mx-0 text-pretty">
              De flesta budgetappar räknar per kalendermånad. Men för de flesta tar pengarna slut innan
              lönen – inte vid månadsskiftet. Dejz räknar i löneperioder, så du alltid ser vad du har kvar
              fram till nästa lönedag. Infaller lönen på en helg flyttas den automatiskt.
            </p>
          </div>

          <PaydayTimeline />
        </section>

        <BankSection />

        {/* Så funkar det */}
        <section className="mt-24 sm:mt-32">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em] text-balance">
              Budget utan kalkylark
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
        <section className="mt-24 sm:mt-32 rounded-container bg-neutral-950 text-white px-6 py-12 sm:px-12 sm:py-16 text-center">
          <h2 className="font-display font-semibold text-[1.875rem] leading-[1.08] sm:text-[2.5rem] tracking-[-0.04em] text-balance">
            Bli bland de första att testa Dejz
          </h2>
          <p className="mt-3 text-white/60 max-w-md mx-auto">
            Skriv upp dig så hör vi av oss när appen öppnar för fler.
          </p>
          <div className="mt-8 max-w-md mx-auto text-left">
            <WaitlistForm onDark />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-white/70 text-sm">
            <span className="inline-flex items-center gap-2">
              <AppleLogo size={18} weight="fill" /> Kommer snart på App Store
            </span>
            <span className="inline-flex items-center gap-2">
              <GooglePlayColor size={17} /> Kommer snart på Google Play
            </span>
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <img src="/dejz_mork.png" alt="Dejz" className="h-4 w-auto opacity-70" />
            <span>© {new Date().getFullYear()} Dejz</span>
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
