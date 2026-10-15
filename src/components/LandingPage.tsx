import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Check, 
  Smartphone, 
  Lock,
  Menu,
  X,
  User,
  Scissors,
  Mic,
  Camera,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank
} from 'lucide-react';
import { Language, TranslationKey, translations } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { DejzLogo } from './DejzLogo';
import { Button, IconButton } from './ui';
import { LanguagePicker } from './LanguagePicker';
import { NORDIC_LANGUAGES } from '../utils/nordic';
import { CategoryIcon } from './CategoryIcon';
import { TransactionLogo } from './TransactionLogo';

export interface LandingPageScreenshots {
  heroHome?: string;             // Hero: Stor frilagd telefon-mockup (/mockup_01.png)
  lifestyleGrocery?: string;     // Miljöbild 1: Vardag & matinköp (/dejz_01.png)
  lifestyleHome?: string;        // Miljöbild 2: Hem & fasta kostnader (/dejz_02.png)
  lifestyleSavings?: string;     // Miljöbild 3 (valfri): Extra miljöbild
  lifestyleControl?: string;     // Miljöbild 4: Kontroll utan bankkoppling (/dejz_03.png)

  voiceInput?: string;
  snippetQuickActions?: string;
  economy?: string;
  snippetPayPeriod?: string;
  dailyAndSavings?: string;
  snippetPiggyBank?: string;
  snippetCalendar?: string;
  analysis?: string;
  snippetCategoryBars?: string;
  snippetEditModal?: string;
}

export const SCREENSHOT_CONFIG: LandingPageScreenshots = {
  heroHome: '/mockup_01.png',
  lifestyleGrocery: '/dejz_01.png',
  lifestyleHome: '/dejz_02.png',
  lifestyleSavings: '/images/lifestyle-grocery.jpg',
  lifestyleControl: '/dejz_03.png',

  voiceInput: '/intalat.png',
  snippetQuickActions: '/lagga_till_transaktion.png',
  economy: '/fasta_utgifter.jpg',
  snippetPayPeriod: '/totalt_fasta.jpg',
  dailyAndSavings: '/kvar_att_spendera.jpg',
  snippetPiggyBank: '/kategoribudgetar.png',
  snippetCalendar: '/tidslinje.png',
  analysis: '/cirkeldiagram.jpg',
  snippetCategoryBars: '/analys_kategorier.jpg',
  snippetEditModal: '/redigera_transaktion.png',
};

export const SOCIAL_PROOF_CONFIG: {
  userCountStat?: string;
} = {
  userCountStat: undefined,
};

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  onStartDemo?: () => void;
  onGoogleLogin?: () => void;
  onFacebookLogin?: () => void;
  onLegalClick?: (type: 'privacy' | 'terms' | 'cookies') => void;
  t?: (key: TranslationKey, params?: Record<string, string | number>) => string;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  screenshots?: LandingPageScreenshots;
}

export const Torus3DRing = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 200 200"
    className={`select-none pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="torusGradBrand" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#78B8FF" />
        <stop offset="100%" stopColor="#EAE4DC" />
      </linearGradient>
      <radialGradient id="torusHighlight" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FCFBF9" stopOpacity="0.85" />
        <stop offset="40%" stopColor="#78B8FF" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#EAE4DC" stopOpacity="0.05" />
      </radialGradient>
      <filter id="softShadow3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="6" dy="16" stdDeviation="12" floodColor="#151718" floodOpacity="0.14" />
      </filter>
    </defs>
    <g filter="url(#softShadow3d)">
      <path
        d="M 100 20 A 80 80 0 1 0 100 180 A 80 80 0 1 0 100 20 Z M 100 55 A 45 45 0 1 1 100 145 A 45 45 0 1 1 100 55 Z"
        fill="url(#torusGradBrand)"
        fillRule="evenodd"
      />
      <path
        d="M 100 20 A 80 80 0 1 0 100 180 A 80 80 0 1 0 100 20 Z M 100 55 A 45 45 0 1 1 100 145 A 45 45 0 1 1 100 55 Z"
        fill="url(#torusHighlight)"
        fillRule="evenodd"
      />
    </g>
  </svg>
);

interface UISnippetPlaceholderProps {
  src?: string;
  alt: string;
  badgeNumber: string;
  title: string;
  whatToCrop: string;
  recommendedSize: string;
  fileHint: string;
  variant?: 'floating' | 'bento' | 'dark-floating';
  className?: string;
}

export const UISnippetPlaceholder: React.FC<UISnippetPlaceholderProps> = ({
  src,
  alt,
  badgeNumber,
  title,
  whatToCrop,
  recommendedSize,
  fileHint,
  variant = 'bento',
  className = '',
}) => {
  if (src) {
    const isBentoFlush = variant === 'bento';
    return (
      <div className={`relative select-none group/snippet ${className}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`w-full h-auto object-contain ring-1 ring-black/[0.08] dark:ring-white/15 transition-transform duration-500 ease-out ${
            isBentoFlush
              ? 'rounded-t-2xl rounded-b-none landing-bento-shadow group-hover/bento:translate-y-[-3px] group-hover/bento:scale-[1.015]'
              : 'rounded-2xl landing-cutout-shadow group-hover/snippet:scale-[1.025] group-hover/snippet:-translate-y-0.5'
          }`}
        />
      </div>
    );
  }

  const isDark = variant === 'dark-floating';
  const isFloating = variant === 'floating' || variant === 'dark-floating';

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 text-left ${
        isDark
          ? 'bg-[var(--text-primary)]/95 backdrop-blur-md border-2 border-dashed border-white/25 text-white shadow-[0_24px_60px_rgba(0,0,0,0.55)] p-4 sm:p-5'
          : isFloating
          ? 'bg-white/95 dark:bg-[var(--surface-color)]/95 backdrop-blur-md border-2 border-dashed border-[var(--text-primary)]/25 text-[var(--text-primary)] shadow-[0_20px_50px_rgba(0,0,0,0.16)] p-4 sm:p-5'
          : 'bg-[var(--bg-color)]/90 dark:bg-black/20 border-2 border-dashed border-[var(--text-primary)]/20 text-[var(--text-primary)] p-4 sm:p-5'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            isDark
              ? 'bg-white/10 text-[var(--brand-peach)]'
              : 'bg-[var(--brand-peach)]/60 text-[var(--text-primary)]'
          }`}
        >
          <Scissors size={15} strokeWidth={2.2} />
        </div>

        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isDark
                  ? 'bg-white/15 text-white'
                  : 'bg-[var(--text-primary)] text-[var(--surface-color)]'
              }`}
            >
              {badgeNumber}
            </span>
            <span
              className={`text-[10px] font-mono ${
                isDark ? 'text-white/65' : 'text-[var(--text-tertiary)]'
              }`}
            >
              {recommendedSize}
            </span>
          </div>

          <p
            className={`text-xs sm:text-sm font-bold leading-snug ${
              isDark ? 'text-white' : 'text-[var(--text-primary)]'
            }`}
          >
            {title}
          </p>

          <p
            className={`text-[11px] sm:text-xs leading-relaxed ${
              isDark ? 'text-white/75' : 'text-[var(--text-secondary)]'
            }`}
          >
            {whatToCrop}
          </p>

          <p
            className={`text-[10px] font-mono pt-0.5 ${
              isDark ? 'text-[var(--brand-peach)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            {fileHint}
          </p>
        </div>
      </div>
    </div>
  );
};

interface PhoneScreenshotFrameProps {
  label: string;
  src?: string;
  alt: string;
  className?: string;
  perspectiveTilt?: boolean;
  isPreframedMockup?: boolean;
  lifestyleImage?: string;
  lifestyleAlt?: string;
  placeholderNote?: string;
}

export const PhoneScreenshotFrame: React.FC<PhoneScreenshotFrameProps> = ({
  label,
  src,
  alt,
  className = '',
  perspectiveTilt = false,
  isPreframedMockup = false,
  lifestyleImage,
  lifestyleAlt = '',
  placeholderNote = '[ Screenshot Placeholder ]',
}) => {
  if (src && isPreframedMockup) {
    return (
      <div className={`relative mx-auto w-full flex justify-center items-center ${className}`}>
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className={`w-[136%] max-w-[520px] sm:w-[560px] sm:max-w-[560px] lg:w-[620px] lg:max-w-[620px] h-auto shrink-0 object-contain select-none pointer-events-none landing-hero-shadow transition-transform duration-500 ${
            perspectiveTilt ? 'hover:scale-[1.015]' : ''
          }`}
        />
      </div>
    );
  }

  if (!src && lifestyleImage) {
    return (
      <div className={`relative mx-auto w-full max-w-[460px] ${className}`}>
        <div className="relative rounded-modal overflow-hidden border border-subtle shadow-subtle bg-[var(--bg-color)] aspect-[4/3]">
          <img
            src={lifestyleImage}
            alt={lifestyleAlt || alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center select-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mx-auto w-full max-w-[280px] sm:max-w-[310px] ${className}`}>
      <div 
        className={`relative z-10 w-full rounded-modal p-2.5 sm:p-3 bg-[var(--text-primary)] shadow-[0_28px_65px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_65px_rgba(0,0,0,0.6)] border border-white/10 ring-1 ring-black/30 overflow-hidden transition-all duration-500 ${
          perspectiveTilt ? 'hover:scale-[1.015]' : ''
        }`}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-center pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/10" />
        </div>

        <div className={`relative w-full aspect-[9/19.5] rounded-card overflow-hidden bg-[var(--surface-color)] border border-subtle/50 flex flex-col items-center justify-center text-center ${src ? 'p-0' : 'p-4'}`}>
          {src ? (
            <img
              src={src}
              alt={alt}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top pointer-events-none select-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 space-y-3 text-[var(--text-secondary)]">
              <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)] border border-subtle shadow-xs">
                <Smartphone size={24} strokeWidth={1.75} />
              </div>
              <div className="space-y-1 max-w-[210px]">
                <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                  {label}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] font-mono tracking-tight">
                  {placeholderNote}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GoogleGLogo = ({ size = 36 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" style={{ width: size, height: size }} className="shrink-0">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const FAQAccordionItem = ({
  index,
  question,
  answer,
}: {
  index: string;
  question: string;
  answer: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[var(--border-divider)]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 sm:py-6 text-left flex items-start justify-between gap-4 group cursor-pointer focus:outline-none bg-transparent border-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-baseline gap-4 min-w-0">
          <span className="text-xs font-bold font-amount tabular-nums text-[var(--text-tertiary)] shrink-0">
            {index}
          </span>
          <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:opacity-75 transition-opacity">
            {question}
          </span>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-[var(--text-secondary)] shrink-0 mt-1 transition-transform duration-300 ease-out ${
            isOpen ? 'rotate-180 text-[var(--text-primary)]' : 'group-hover:translate-y-0.5'
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 pl-8 pr-6 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Dual Counter-Scrolling App Transaction Band
 * Uses the exact TransactionItem card layout and real TransactionLogo + CategoryIcon components.
 */
const DualCounterParallaxBand = ({
  currentLanguage,
}: {
  currentLanguage: Language;
}) => {
  const bandRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: bandRef,
    offset: ['start end', 'end start'],
  });

  const xRow1 = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);
  const xRow2 = useTransform(scrollYProgress, [0, 1], ['-15%', '0%']);
  const isEn = currentLanguage === 'en';

  const row1Cards = [
    {
      merchant: 'Coop',
      category: isEn ? 'Groceries' : 'Mat & dagligvaror',
      icon: 'shopping-basket',
      amount: '378',
      time: '01:19',
      type: 'expense' as const,
    },
    {
      merchant: 'Sveafastigheter',
      category: isEn ? 'Housing' : 'Boende & hushåll',
      icon: 'home',
      amount: '6 766',
      time: isEn ? 'The 25th' : 'Den 25:e',
      method: isEn ? 'Invoice' : 'Faktura',
      isFixed: true,
      isVariable: true,
      type: 'expense' as const,
    },
    {
      merchant: 'Parkster',
      category: 'Transport',
      icon: 'car',
      amount: '61',
      time: '12 okt.',
      type: 'expense' as const,
    },
    {
      merchant: 'Telenor (Mobil)',
      category: isEn ? 'Subscriptions' : 'Abonnemang',
      icon: 'smartphone',
      amount: '529',
      time: isEn ? 'The 28th' : 'Den 28:e',
      method: 'Autogiro',
      isFixed: true,
      type: 'expense' as const,
    },
    {
      merchant: 'ICA Kvantum',
      category: isEn ? 'Groceries' : 'Mat & dagligvaror',
      icon: 'shopping-basket',
      amount: '642',
      time: '18:40',
      type: 'expense' as const,
    },
  ];

  const row2Cards = [
    {
      merchant: 'Öresundskraft',
      category: isEn ? 'Housing' : 'Boende & hushåll',
      icon: 'home',
      amount: '548',
      time: isEn ? 'The 6th' : 'Den 6:e',
      method: isEn ? 'Invoice' : 'Faktura',
      isFixed: true,
      isVariable: true,
      type: 'expense' as const,
    },
    {
      merchant: 'Uber',
      category: 'Transport',
      icon: 'car',
      amount: '100',
      time: '23:14',
      type: 'expense' as const,
    },
    {
      merchant: 'Google AI Ultra',
      category: 'Dejz',
      icon: 'cloud',
      amount: '999',
      time: isEn ? 'The 10th' : 'Den 10:e',
      method: 'Google',
      isFixed: true,
      type: 'expense' as const,
    },
    {
      merchant: 'Spotify',
      category: isEn ? 'Subscriptions' : 'Abonnemang',
      icon: 'smartphone',
      amount: '119',
      time: isEn ? 'The 25th' : 'Den 25:e',
      method: 'Kort',
      isFixed: true,
      type: 'expense' as const,
    },
    {
      merchant: 'Espresso House',
      category: isEn ? 'Dining & Café' : 'Uteliv & Café',
      icon: 'coffee',
      amount: '89',
      time: '09:15',
      type: 'expense' as const,
    },
  ];

  const renderAppTransactionPill = (item: any, key: string) => (
    <div
      key={key}
      className="w-[300px] sm:w-[330px] shrink-0 rounded-card bg-[var(--surface-color)] px-4 py-3 flex items-center justify-between gap-3 shadow-subtle text-left select-none"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          <TransactionLogo
            transaction={{
              id: key,
              merchant: item.merchant,
              category: item.category,
              amount: 100,
              type: item.type,
              timestamp: Date.now(),
            }}
          />
          {item.isVariable && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-[10px] font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--surface-color)] z-20">
              R
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate leading-snug">
            {item.merchant}
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--text-secondary)]">
            <CategoryIcon
              icon={item.icon}
              categoryName={item.category}
              variant="minimal"
              size="2xs"
            />
            <span className="truncate">{item.category}</span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 pl-2">
        <p className="text-sm font-bold font-amount tabular-nums text-[var(--text-primary)] leading-snug">
          − {item.amount}{' '}
          <span className="text-xs font-normal text-[var(--text-secondary)]">
            kr{item.isFixed ? '/mån' : ''}
          </span>
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5 text-[11px] text-[var(--text-tertiary)] tabular-nums">
          <span>{item.time}</span>
          {item.method && (
            <>
              <span>·</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[10px] font-medium text-[var(--text-secondary)] leading-none">
                {item.method}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section
      ref={bandRef}
      aria-label={isEn ? 'Live app transactions' : 'Transaktioner i appen'}
      className="py-8 sm:py-10 bg-[var(--bg-color)] border-b border-[var(--border-divider)] overflow-hidden select-none space-y-3.5"
    >
      <motion.div style={{ x: xRow1 }} className="flex items-center gap-3.5 w-max px-4">
        {[...row1Cards, ...row1Cards, ...row1Cards].map((item, idx) =>
          renderAppTransactionPill(item, `r1-${idx}`)
        )}
      </motion.div>

      <motion.div style={{ x: xRow2 }} className="flex items-center gap-3.5 w-max px-4">
        {[...row2Cards, ...row2Cards, ...row2Cards].map((item, idx) =>
          renderAppTransactionPill(item, `r2-${idx}`)
        )}
      </motion.div>
    </section>
  );
};

/**
 * Editorial Parallax Gallery (dejz_01.png, dejz_02.png, dejz_03.png)
 * Full-width 3-column desktop editorial showcase + horizontal swipe on mobile.
 */
const EditorialParallaxGallery = ({
  screenshots,
  currentLanguage,
}: {
  screenshots: LandingPageScreenshots;
  currentLanguage: Language;
}) => {
  const galleryRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ['start end', 'end start'],
  });

  const yCol1 = useTransform(scrollYProgress, [0, 1], [14, -14]);
  const yCol2 = useTransform(scrollYProgress, [0, 1], [-10, 14]);
  const yCol3 = useTransform(scrollYProgress, [0, 1], [18, -10]);

  const isEn = currentLanguage === 'en';

  const slides = [
    {
      num: '01',
      src: screenshots.lifestyleGrocery || '/dejz_01.png',
      tag: isEn ? 'Voice & Quick Log' : 'Röst & Snabbinmatning',
      title: isEn
        ? 'Say the purchase out loud on your way out of the store.'
        : 'Säg köpet rakt ut på väg ut ur butiken.',
      motionY: yCol1,
    },
    {
      num: '02',
      src: screenshots.lifestyleHome || '/dejz_02.png',
      tag: isEn ? 'Payday to Payday' : 'Från lön till lön',
      title: isEn
        ? 'Fixed bills are deducted on day one so your balance is always honest.'
        : 'Fasta räkningar dras direkt vid lön så att saldot alltid stämmer.',
      motionY: yCol2,
    },
    {
      num: '03',
      src: screenshots.lifestyleControl || '/dejz_03.png',
      tag: isEn ? '100% Private' : '100 % Privat',
      title: isEn
        ? 'Total clarity without handing over your bank login.'
        : 'Full kontroll i realtid utan att koppla din bank.',
      motionY: yCol3,
    },
  ];

  const handleMobileScroll = (dir: 'left' | 'right') => {
    if (!mobileScrollRef.current) return;
    mobileScrollRef.current.scrollBy({
      left: dir === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  return (
    <section
      ref={galleryRef}
      aria-label={isEn ? 'Everyday financial calm' : 'Ekonomiskt lugn i vardagen'}
      className="py-20 sm:py-28 bg-[var(--surface-color)] border-y border-[var(--border-divider)] overflow-hidden select-none"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-10 sm:mb-14 flex items-end justify-between gap-4 text-left">
        <div className="space-y-2.5 max-w-2xl">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.06] text-balance">
            {isEn
              ? 'Less time in spreadsheets. More calm between paydays.'
              : 'Mindre tid i tabeller. Mer lugn mellan lönerna.'}
          </h2>
        </div>

        <div className="flex md:hidden items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleMobileScroll('left')}
            aria-label={isEn ? 'Previous image' : 'Föregående bild'}
            className="w-10 h-10 rounded-full bg-[var(--bg-color)] border border-[var(--border-divider)] flex items-center justify-center text-[var(--text-primary)] cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleMobileScroll('right')}
            aria-label={isEn ? 'Next image' : 'Nästa bild'}
            className="w-10 h-10 rounded-full bg-[var(--bg-color)] border border-[var(--border-divider)] flex items-center justify-center text-[var(--text-primary)] cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Desktop 3-Column Panorama Grid */}
      <div className="hidden md:grid max-w-6xl mx-auto px-4 sm:px-6 grid-cols-3 gap-6 lg:gap-8 text-left">
        {slides.map((slide) => (
          <motion.div
            key={slide.num}
            style={{ y: slide.motionY }}
            className="group flex flex-col space-y-4"
          >
            <div className="relative rounded-modal overflow-hidden aspect-[4/4.6] bg-editorial-peach shadow-subtle">
              <img
                src={slide.src}
                alt={slide.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[var(--surface-color)]/90 backdrop-blur-md text-[11px] font-bold text-[var(--text-primary)]">
                {slide.num} · {slide.tag}
              </div>
            </div>
            <p className="text-base lg:text-lg font-bold text-[var(--text-primary)] leading-snug pr-2">
              {slide.title}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Mobile Horizontal Snap Carousel */}
      <div
        ref={mobileScrollRef}
        className="md:hidden flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pb-2 text-left"
      >
        {slides.map((slide) => (
          <div
            key={slide.num}
            className="snap-start w-[82vw] max-w-[340px] shrink-0 space-y-3"
          >
            <div className="relative rounded-modal overflow-hidden aspect-[4/4.4] bg-editorial-peach shadow-subtle">
              <img
                src={slide.src}
                alt={slide.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-[var(--surface-color)]/90 backdrop-blur-md text-[11px] font-bold text-[var(--text-primary)]">
                {slide.num} · {slide.tag}
              </div>
            </div>
            <p className="text-base font-bold text-[var(--text-primary)] leading-snug">
              {slide.title}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export function LandingPage({
  onGetStarted,
  onLogin,
  onStartDemo,
  onGoogleLogin,
  onLegalClick,
  currentLanguage,
  onLanguageChange,
  screenshots = SCREENSHOT_CONFIG,
}: LandingPageProps) {
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'terms' | 'cookies' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileLangOpen, setIsMobileLangOpen] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const tr = (key: TranslationKey): string => {
    return translations[currentLanguage]?.[key] || translations.sv[key] || key;
  };

  const isEn = currentLanguage === 'en';
  const currentLangOption = NORDIC_LANGUAGES.find(l => l.code === currentLanguage) || NORDIC_LANGUAGES[0];
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress: pageScrollProgress } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setMousePos({ x, y });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsMobileLangOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        setIsMobileLangOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  const handlePolicyOpen = (type: 'privacy' | 'terms' | 'cookies') => {
    if (onLegalClick) {
      onLegalClick(type);
    } else {
      setActivePolicyModal(type);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans antialiased overflow-x-hidden relative">

      {/* =====================================================================
          NAVIGATION HEADER
      ===================================================================== */}
      <header className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-all duration-300 ${
        isMobileMenuOpen 
          ? 'opacity-0 pointer-events-none' 
          : isScrolled
          ? 'bg-[var(--bg-color)]/90 backdrop-blur-xl border-b border-[var(--border-divider)]'
          : 'bg-transparent border-b border-transparent'
      }`}>
        <motion.div
          aria-hidden="true"
          style={{ scaleX: pageScrollProgress }}
          className="h-[2.5px] bg-[var(--brand-signature)] origin-left"
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <DejzLogo className="h-6 sm:h-7 w-auto" />
          </div>

          {/* Desktop Navigation (md+) */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7">
            <a
              href="#how-it-works"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
            >
              {tr('landing_nav_how_it_works')}
            </a>

            <a
              href="#features"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
            >
              {tr('landing_footer_features')}
            </a>

            <a
              href="#faq"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
            >
              {tr('landing_faq_title')}
            </a>

            <div className="h-4 w-px bg-[var(--border-divider)]" />

            <LanguagePicker
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />

            {onLogin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogin}
                icon={<User size={14} strokeWidth={2} />}
                className="text-xs font-semibold text-[var(--text-primary)] px-3 whitespace-nowrap"
              >
                {tr('landing_nav_login')}
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={onGetStarted}
              className="text-xs font-semibold shadow-xs px-4 whitespace-nowrap"
            >
              {tr('landing_nav_get_started')}
            </Button>
          </div>

          {/* Mobile Header Actions (< md) */}
          <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
            <LanguagePicker
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />
            {onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center gap-1.5 px-2.5 h-8 sm:h-9 rounded-full text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-divider)] shadow-subtle transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                <User size={13} strokeWidth={2.2} className="text-[var(--text-secondary)] shrink-0" />
                <span>{tr('landing_nav_login')}</span>
              </button>
            )}
            <IconButton
              onClick={() => {
                setIsMobileMenuOpen(true);
                setIsMobileLangOpen(false);
              }}
              aria-label={tr('landing_nav_open_menu')}
              aria-expanded={isMobileMenuOpen}
              variant="ghost"
              size="lg"
              className="text-[var(--text-primary)]"
              icon={<Menu size={20} strokeWidth={2} />}
            />
          </div>

        </div>
      </header>

      {/* MOBILE MENU PORTAL */}
      {typeof document !== 'undefined' && isMobileMenuOpen && createPortal(
        <div className="fixed inset-0 z-[9990] pointer-events-auto">
          <div 
            className="fixed inset-0 w-full h-full min-h-dvh bg-black/40 z-[9991] transition-opacity animate-in fade-in duration-200"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsMobileLangOpen(false);
            }}
            aria-hidden="true"
          />

          <div 
            role="dialog"
            aria-modal="true"
            aria-label={tr('landing_nav_menu_label')}
            className="fixed top-0 left-0 right-0 z-[9995] bg-[var(--surface-color)] border-b border-[var(--border-divider)] shadow-modal rounded-b-2xl pt-[env(safe-area-inset-top,0px)] animate-in slide-in-from-top-2 duration-200"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between border-b border-[var(--border-divider)]/40">
              <div className="flex items-center gap-2 shrink-0">
                <DejzLogo className="h-6 sm:h-7 w-auto" />
              </div>
              <IconButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsMobileLangOpen(false);
                }}
                aria-label={tr('landing_nav_close_menu')}
                variant="ghost"
                size="lg"
                className="text-[var(--text-primary)]"
                icon={<X size={20} strokeWidth={2} />}
              />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-5 space-y-1 text-left">
              <a
                href="#how-it-works"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsMobileLangOpen(false);
                }}
                className="w-full h-12 flex items-center px-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)]"
              >
                <span>{tr('landing_nav_how_it_works')}</span>
              </a>

              <a
                href="#features"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsMobileLangOpen(false);
                }}
                className="w-full h-12 flex items-center px-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)]"
              >
                <span>{tr('landing_footer_features')}</span>
              </a>

              <a
                href="#faq"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsMobileLangOpen(false);
                }}
                className="w-full h-12 flex items-center px-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)]"
              >
                <span>{tr('landing_faq_title')}</span>
              </a>

              {onLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsMobileLangOpen(false);
                    onLogin();
                  }}
                  className="w-full h-12 text-left flex items-center px-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)] cursor-pointer bg-transparent border-none"
                >
                  <span>{tr('landing_nav_login')}</span>
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMobileLangOpen(!isMobileLangOpen)}
                  aria-expanded={isMobileLangOpen}
                  className="w-full h-12 text-left flex items-center justify-between px-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)] cursor-pointer bg-transparent border-none"
                >
                  <span className="text-[var(--text-secondary)] font-medium">{tr('landing_nav_language')}</span>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                    <span className="text-base select-none leading-none" aria-hidden="true">{currentLangOption.flag}</span>
                    <span>{currentLangOption.nativeLabel}</span>
                    <ChevronDown size={16} className={`shrink-0 opacity-60 transition-transform duration-200 ${isMobileLangOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isMobileLangOpen && (
                  <div className="pt-0.5 pb-1 space-y-0.5">
                    {NORDIC_LANGUAGES.map((lang) => {
                      const isSelected = lang.code === currentLanguage;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            onLanguageChange(lang.code);
                            setIsMobileLangOpen(false);
                          }}
                          className={`w-full h-11 px-3.5 rounded-xl text-left text-sm flex items-center justify-between gap-3 transition-colors cursor-pointer border-none ${
                            isSelected 
                              ? 'bg-black/[0.03] dark:bg-white/[0.06] text-[var(--text-primary)] font-semibold' 
                              : 'bg-transparent text-[var(--text-primary)] font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base select-none leading-none" aria-hidden="true">{lang.flag}</span>
                            <span className="text-[var(--text-primary)]">{lang.nativeLabel}</span>
                          </div>
                          {isSelected && <Check size={16} strokeWidth={2.5} className="shrink-0 text-[var(--text-primary)]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border-divider)] pt-1 my-2" />

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsMobileLangOpen(false);
                  onGetStarted();
                }}
                className="w-full justify-center text-center text-sm font-semibold shadow-subtle h-12"
              >
                {tr('landing_nav_get_started')}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =====================================================================
          1. HERO SECTION — Editorial Nordic Authority & Luminous Sky Stage
      ===================================================================== */}
      <section 
        onMouseMove={handleMouseMove}
        className="relative pt-6 sm:pt-14 pb-16 sm:pb-24 px-4 sm:px-6 bg-[var(--surface-color)] overflow-hidden z-10 border-b border-[var(--border-divider)]"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column (6 cols): Editorial Headline, Lead, CTAs & Hairline Facts */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6 sm:space-y-8 text-left"
          >
            <div className="space-y-4">
              <h1 className="text-[2.45rem] sm:text-6xl lg:text-[3.85rem] font-extrabold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.02] text-balance">
                {tr('landing_hero_title')}
              </h1>

              <p className="text-base sm:text-lg lg:text-[1.15rem] text-[var(--text-secondary)] leading-[1.6] max-w-xl font-normal text-pretty">
                {tr('landing_hero_subtitle')}
              </p>
            </div>

            {/* CTAs */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="w-auto font-semibold text-sm shadow-subtle px-7 h-12 whitespace-nowrap"
                >
                  {tr('landing_hero_button')}
                </Button>

                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)]/70 px-5 h-12 rounded-full border border-[var(--border-divider)] transition-all cursor-pointer shadow-subtle whitespace-nowrap active:scale-[0.99]"
                  >
                    <GoogleGLogo size={16} />
                    <span>{tr('landing_hero_google')}</span>
                  </button>
                )}

                {onStartDemo && (
                  <button
                    type="button"
                    onClick={onStartDemo}
                    className="inline-flex items-center justify-center text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 h-12 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent whitespace-nowrap"
                  >
                    {tr('landing_hero_demo')}
                  </button>
                )}
              </div>
            </div>

            {/* Clean Architectural Hairline Facts */}
            <div className="pt-6 border-t border-[var(--border-divider)] grid grid-cols-3 gap-4">
              <div>
                <p className="text-base sm:text-lg font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
                  0 kr
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {isEn ? 'Free for personal use' : 'Gratis att använda'}
                </p>
              </div>
              <div>
                <p className="text-base sm:text-lg font-extrabold font-amount text-[var(--text-primary)]">
                  100 %
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {tr('landing_no_bank_needed')}
                </p>
              </div>
              <div>
                <p className="text-base sm:text-lg font-extrabold font-amount tabular-nums text-[var(--text-primary)]">
                  24 sep – 22 okt
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {isEn ? 'Follows your payday' : 'Följer din riktiga lönedag'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column (6 cols): Studio 3D Hardware Phone Stage on Luminous Nordic Sky (#78B8FF) */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18, delay: 0.1 }}
            className="lg:col-span-6 relative flex items-center justify-center min-h-[320px] sm:min-h-[420px]"
          >
            <div
              aria-hidden="true"
              className="absolute w-[88%] h-[84%] rounded-modal bg-editorial-lavender pointer-events-none"
            />

            <div 
              style={{
                transform: `translate3d(${mousePos.x * 0.7}px, ${mousePos.y * 0.7}px, 0px)`,
                transition: 'transform 0.2s ease-out',
              }}
              className="relative z-10 w-full animate-float"
            >
              <PhoneScreenshotFrame
                label="Screenshot: Hem – kvar att spendera och aktuell löneperiod"
                src={screenshots.heroHome}
                alt="Dejz Hemvy - kvar att spendera och löneperiod"
                perspectiveTilt={true}
                isPreframedMockup={true}
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* =====================================================================
          2. DUAL COUNTER-SCROLLING APP TRANSACTION BAND
             Identical TransactionItem rows gliding in opposite directions
      ===================================================================== */}
      <DualCounterParallaxBand currentLanguage={currentLanguage} />

      {/* =====================================================================
          3. SÅ FUNGERAR DET — Crisp Full-Bleed 01 / 02 / 03 Grid
      ===================================================================== */}
      <section
        id="how-it-works"
        className="bg-[var(--surface-color)] border-b border-[var(--border-divider)] scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-divider)] text-left">
            <div className="py-8 sm:py-12 md:pr-8 lg:pr-10 space-y-3">
              <span className="w-8 h-8 rounded-full bg-editorial-lavender text-[var(--text-primary)] text-xs font-extrabold font-amount tabular-nums flex items-center justify-center">
                01
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {tr('landing_step1_title')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step1_desc')}
              </p>
            </div>

            <div className="py-8 sm:py-12 md:px-8 lg:px-10 space-y-3">
              <span className="w-8 h-8 rounded-full bg-editorial-lavender text-[var(--text-primary)] text-xs font-extrabold font-amount tabular-nums flex items-center justify-center">
                02
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {tr('landing_step2_title')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step2_desc')}
              </p>
            </div>

            <div className="py-8 sm:py-12 md:pl-8 lg:pl-10 space-y-3">
              <span className="w-8 h-8 rounded-full bg-editorial-lavender text-[var(--text-primary)] text-xs font-extrabold font-amount tabular-nums flex items-center justify-center">
                03
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {tr('landing_step3_title')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step3_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. RÖST & SNABBINMATNING
             100% Identical App Excerpts: lagga_till_transaktion.png + intalat.png
      ===================================================================== */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left Column (6 cols): Exact App Excerpts (lagga_till_transaktion.png + intalat.png) */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 order-2 lg:order-1"
          >
            <div className="rounded-modal bg-editorial-lavender p-5 sm:p-8 space-y-4 select-none shadow-subtle">
              {/* Excerpt 1: Identical to lagga_till_transaktion.png */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.08 }}
                className="rounded-card bg-[var(--bg-color)] p-5 sm:p-6 shadow-subtle space-y-6"
              >
                {/* Top sheet grab bar */}
                <div className="w-12 h-1.5 rounded-full bg-black/15 mx-auto" />

                {/* 3 Circular Action Buttons: Utgift, Inkomst, Kvitto */}
                <div className="grid grid-cols-3 gap-4 max-w-[320px] mx-auto text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/[0.04] flex items-center justify-center text-[var(--text-primary)]">
                      <ArrowDownLeft size={22} strokeWidth={1.8} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                      {isEn ? 'Expense' : 'Utgift'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/[0.04] flex items-center justify-center text-[var(--text-primary)]">
                      <ArrowUpRight size={22} strokeWidth={1.8} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                      {isEn ? 'Income' : 'Inkomst'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/[0.04] flex items-center justify-center text-[var(--text-primary)]">
                      <Camera size={22} strokeWidth={1.8} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                      {isEn ? 'Receipt' : 'Kvitto'}
                    </span>
                  </div>
                </div>

                {/* Exact Voice Input Bar (Mat 378 kr Coop) */}
                <div className="voice-bar-surface rounded-card-nested p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="voice-mic-box w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                      <Mic size={20} strokeWidth={1.9} />
                    </div>
                    <span className="text-base sm:text-lg font-medium text-[var(--text-primary)] truncate">
                      {isEn ? 'Groceries 378 kr Coop' : 'Mat 378 kr Coop'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <X size={18} className="text-[var(--text-tertiary)]" />
                    <div className="voice-stop-btn w-10 h-10 rounded-xl flex items-center justify-center animate-pulse-subtle">
                      <div className="w-3.5 h-3.5 border-[1.75px] border-white rounded-sm" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Excerpt 2: Identical to intalat.png (Coop + 378 KR) */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="rounded-card bg-[var(--surface-color)] p-5 sm:p-6 shadow-subtle space-y-4 text-left"
              >
                <div className="flex items-center gap-3.5">
                  <TransactionLogo
                    size="lg"
                    transaction={{
                      id: 'voice-coop-preview',
                      merchant: 'Coop',
                      category: 'Mat & dagligvaror',
                      amount: 378,
                      type: 'expense',
                      timestamp: Date.now(),
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                      {isEn ? 'NAME / MERCHANT' : 'NAMN / MOTTAGARE'}
                    </p>
                    <p className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] leading-snug mt-0.5">
                      Coop
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-divider)]">
                  <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                    {isEn ? 'AMOUNT' : 'BELOPP'}
                  </p>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className="text-[32px] sm:text-[36px] font-bold font-amount tabular-nums leading-none text-[var(--text-primary)]">
                      378
                    </span>
                    <span className="text-sm font-medium text-[var(--text-tertiary)]">
                      KR
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column (6 cols): Editorial Copy */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-5 text-left">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.06] text-balance">
              {tr('landing_voice_title')}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] text-pretty">
              {tr('landing_voice_desc')}
            </p>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-[1.6]">
              {tr('landing_voice_subdesc')}
            </p>
          </div>

        </div>
      </section>

      {/* =====================================================================
          5. FASTA UTGIFTER & LÖNEPERIOD
             100% Identical App Excerpts: totalt_fasta.jpg + fasta_utgifter.jpg
      ===================================================================== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-editorial-peach border-y border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left Column (5 cols): Editorial Copy + Payday Logic */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.06] text-balance">
                {tr('landing_fixed_title')}
              </h2>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] font-normal text-pretty">
                {tr('landing_fixed_desc')}
              </p>
            </div>

            <div className="pt-6 border-t border-[var(--border-divider)] grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  {isEn ? 'Active pay period' : 'Aktuell löneperiod'}
                </p>
                <p className="text-lg sm:text-xl font-extrabold font-amount tabular-nums text-[var(--text-primary)] mt-1">
                  24 sep – 22 okt
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  {isEn ? 'Reserved on payday' : 'Dras direkt vid lön'}
                </p>
                <p className="text-lg sm:text-xl font-extrabold font-amount tabular-nums text-[var(--text-primary)] mt-1">
                  −11 379 kr
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Exact App Excerpts (totalt_fasta.jpg + fasta_utgifter.jpg) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <div className="rounded-modal bg-[var(--bg-color)] p-5 sm:p-7 space-y-3.5 shadow-subtle text-left select-none">
              {/* Top Filter Pills (Identical to totalt_fasta.jpg) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--text-primary)] text-[var(--surface-color)] text-xs font-semibold shrink-0">
                  <Calendar size={13} strokeWidth={2} />
                  <span>{isEn ? 'Fixed expenses' : 'Fasta utgifter'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--surface-color)] text-[var(--text-secondary)] text-xs font-medium shrink-0">
                  <ArrowDownLeft size={13} strokeWidth={2} />
                  <span>{isEn ? 'Income' : 'Inkomster'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--surface-color)] text-[var(--text-secondary)] text-xs font-medium shrink-0">
                  <PiggyBank size={13} strokeWidth={2} />
                  <span>{isEn ? 'Monthly savings' : 'Månadssparande'}</span>
                </span>
              </div>

              {/* Totala fasta utgifter Card (Identical to totalt_fasta.jpg) */}
              <div className="rounded-card bg-[var(--surface-color)] p-5 shadow-subtle space-y-1">
                <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                  {isEn ? 'Total monthly fixed expenses' : 'Totala fasta utgifter'}
                </p>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl sm:text-3xl font-bold font-amount tabular-nums text-[var(--text-primary)]">
                    −11 379
                  </span>
                  <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    kr<span className="text-[11px] opacity-75">/mån</span>
                  </span>
                </div>
              </div>

              {/* Fixed Expense Rows (Identical to fasta_utgifter.jpg) */}
              <div className="space-y-2">
                {[
                  {
                    id: 'fe-svea',
                    merchant: 'Sveafastigheter',
                    category: isEn ? 'Housing' : 'Boende & hushåll',
                    icon: 'home',
                    amount: '6 766',
                    day: isEn ? 'The 25th' : 'Den 25:e',
                    method: isEn ? 'Invoice' : 'Faktura',
                    isVariable: true,
                  },
                  {
                    id: 'fe-google',
                    merchant: 'Google AI Ultra',
                    category: 'Dejz',
                    icon: 'cloud',
                    amount: '999',
                    day: isEn ? 'The 10th' : 'Den 10:e',
                    method: 'Google',
                    isVariable: false,
                  },
                  {
                    id: 'fe-oresund',
                    merchant: 'Öresundskraft',
                    category: isEn ? 'Housing' : 'Boende & hushåll',
                    icon: 'home',
                    amount: '548',
                    day: isEn ? 'The 6th' : 'Den 6:e',
                    method: isEn ? 'Invoice' : 'Faktura',
                    isVariable: true,
                  },
                  {
                    id: 'fe-telenor',
                    merchant: 'Telenor (Mobil)',
                    category: isEn ? 'Subscriptions' : 'Abonnemang',
                    icon: 'smartphone',
                    amount: '529',
                    day: isEn ? 'The 28th' : 'Den 28:e',
                    method: 'Autogiro',
                    isVariable: false,
                  },
                ].map((fe, idx) => (
                  <motion.div
                    key={fe.id}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.08 + idx * 0.07 }}
                    whileHover={{ x: 3 }}
                    className="rounded-card bg-[var(--surface-color)] px-4 py-3.5 flex items-center justify-between gap-3 shadow-subtle"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <TransactionLogo
                          transaction={{
                            id: fe.id,
                            merchant: fe.merchant,
                            category: fe.category,
                            amount: 100,
                            type: 'expense',
                            timestamp: Date.now(),
                          }}
                        />
                        {fe.isVariable && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-[10px] font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--surface-color)] z-20">
                            R
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] truncate leading-snug">
                          {fe.merchant}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)]">
                          <CategoryIcon
                            icon={fe.icon}
                            categoryName={fe.category}
                            variant="minimal"
                            size="2xs"
                          />
                          <span className="truncate">{fe.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <p className="text-sm sm:text-base font-bold font-amount tabular-nums text-[var(--text-primary)] leading-snug">
                        − {fe.amount}{' '}
                        <span className="text-xs font-normal text-[var(--text-secondary)]">
                          kr<span className="text-[10px] opacity-75">/mån</span>
                        </span>
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-xs text-[var(--text-tertiary)] tabular-nums">
                        <span>{fe.day}</span>
                        <span>·</span>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[11px] font-medium text-[var(--text-secondary)] leading-none">
                          {fe.method}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* =====================================================================
          6. EDITORIAL PARALLAX LIFESTYLE GALLERY (dejz_01, dejz_02, dejz_03)
      ===================================================================== */}
      <EditorialParallaxGallery
        screenshots={screenshots}
        currentLanguage={currentLanguage}
      />

      {/* =====================================================================
          7. KVAR ATT SPENDERA, KATEGORIBUDGETAR & TIDSLINJE
             100% Identical App Excerpts: kvar_att_spendera.jpg, kategoribudgetar.png, tidslinje.png
      ===================================================================== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-[var(--bg-color)]">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 text-left">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl space-y-3 mb-4"
          >
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.06] text-balance">
              {tr('landing_daily_title')}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              {tr('landing_daily_desc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Bento 1 (6 cols): Identical to kvar_att_spendera.jpg + GreetingModule.tsx (without info icon!) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-6 rounded-modal bg-editorial-lavender p-6 sm:p-8 flex flex-col justify-between gap-6 select-none shadow-subtle"
            >
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {tr('landing_daily_item1_title')}
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-primary)]/85 leading-relaxed">
                  {tr('landing_daily_item1_desc')}
                </p>
              </div>

              <div className="space-y-3">
                {/* Main Kvar att spendera White Card */}
                <div className="rounded-card bg-[var(--surface-color)] p-5 sm:p-6 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-medium text-[var(--text-secondary)]">
                      {isEn ? 'Remaining to spend' : 'Kvar att spendera'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-[42px] font-bold font-amount tabular-nums tracking-tight leading-none text-[var(--text-primary)]">
                      23 536
                    </span>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      kr
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-end">
                      <span className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)]">
                        72 % {isEn ? 'left' : 'kvar'}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-black/[0.07] overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        whileInView={{ width: '72%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                        className="h-full rounded-full bg-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Two Bottom Modules from GreetingModule.tsx */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-card bg-[var(--surface-color)] p-3.5 sm:p-4 shadow-subtle">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      {isEn ? 'Current period' : 'Aktuell period'}
                    </p>
                    <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] mt-0.5">
                      24 sep – 22 okt
                    </p>
                  </div>
                  <div className="rounded-card bg-[var(--surface-color)] p-3.5 sm:p-4 shadow-subtle">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      {isEn ? 'Next payday' : 'Nästa lön'}
                    </p>
                    <p className="text-sm sm:text-base font-medium font-amount tabular-nums text-[var(--text-primary)] mt-0.5">
                      19 {isEn ? 'days left' : 'dagar kvar'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento 2 (6 cols): Identical to kategoribudgetar.png (without redundant header/Hantera!) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="lg:col-span-6 rounded-modal bg-editorial-peach p-6 sm:p-8 flex flex-col justify-between gap-6 select-none shadow-subtle"
            >
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {tr('landing_daily_item2_title')}
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {tr('landing_daily_item2_desc')}
                </p>
              </div>

              {/* Exact 3 Category Mini-Cards from kategoribudgetar.png / TodayView.tsx */}
              <div className="grid grid-cols-3 gap-3 my-auto">
                {[
                  {
                    name: isEn ? 'Health & Fitness' : 'Hälsa & Träning',
                    icon: 'heart',
                    amount: '347',
                  },
                  {
                    name: isEn ? 'Insurance' : 'Försäkringar',
                    icon: 'shield',
                    amount: '160',
                  },
                  {
                    name: isEn ? 'Subscriptions' : 'Abonnemang',
                    icon: 'smartphone',
                    amount: '300',
                  },
                ].map((cat, idx) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: 0.12 + idx * 0.08 }}
                    whileHover={{ y: -3 }}
                    className="rounded-card bg-[var(--surface-color)] p-3.5 sm:p-4 shadow-subtle flex flex-col justify-between gap-4 min-h-[132px] sm:min-h-[148px]"
                  >
                    <CategoryIcon
                      icon={cat.icon}
                      categoryName={cat.name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                        {cat.name}
                      </p>
                      <p className="text-base sm:text-xl font-bold font-amount tabular-nums text-[var(--text-primary)] mt-0.5">
                        {cat.amount}{' '}
                        <span className="text-xs font-normal text-[var(--text-secondary)]">
                          kr
                        </span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {isEn
                  ? 'Swipe through your categories directly on the home screen.'
                  : 'Svep genom dina kategorier direkt på hemskärmen.'}
              </p>
            </motion.div>

            {/* Bento 3 (12 cols): Identical to tidslinje.png on a High-Contrast Obsidian Theater Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="lg:col-span-12 rounded-modal bg-editorial-forest p-6 sm:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center select-none shadow-subtle"
            >
              <div className="lg:col-span-5 space-y-3 text-white">
                <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {tr('landing_daily_item3_title')}
                </h3>
                <p className="text-sm sm:text-base text-white/75 leading-relaxed">
                  {tr('landing_daily_item3_desc')}
                </p>
              </div>

              {/* Exact App Excerpt: tidslinje.png */}
              <div className="lg:col-span-7 rounded-modal bg-[var(--bg-color)] p-4 sm:p-6 space-y-4">
                {/* Horizontal Day Strip */}
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { day: isEn ? 'sun' : 'sön', num: '11', active: false },
                    { day: isEn ? 'mon' : 'mån', num: '12', active: false },
                    { day: isEn ? 'tue' : 'tis', num: '13', active: false },
                    { day: isEn ? 'Today' : 'Idag', num: '14', active: true },
                    { day: isEn ? 'thu' : 'tor', num: '15', active: false },
                    { day: isEn ? 'fri' : 'fre', num: '16', active: false },
                  ].map((d) => (
                    <div
                      key={d.num}
                      className={`h-[58px] sm:h-[64px] rounded-card-nested flex flex-col items-center justify-center gap-0.5 transition-transform duration-200 hover:-translate-y-0.5 ${
                        d.active
                          ? 'bg-editorial-lavender font-semibold text-[var(--text-primary)] shadow-subtle'
                          : 'bg-[var(--surface-color)] text-[var(--text-secondary)] shadow-subtle'
                      }`}
                    >
                      <span
                        className={`text-[11px] leading-none ${
                          d.active ? 'font-bold text-[var(--text-primary)]' : 'font-medium'
                        }`}
                      >
                        {d.day}
                      </span>
                      <span className="text-base sm:text-lg font-amount tabular-nums font-semibold text-[var(--text-primary)] leading-tight">
                        {d.num}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Connected Date Header */}
                <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] pt-1">
                  {isEn ? 'Today, October 14' : 'Idag, 14 oktober'}
                </p>

                {/* Exact Coop Transaction Card */}
                <div className="rounded-card bg-[var(--surface-color)] px-4 py-3.5 flex items-center justify-between gap-3 shadow-subtle">
                  <div className="flex items-center gap-3 min-w-0">
                    <TransactionLogo
                      transaction={{
                        id: 'timeline-coop',
                        merchant: 'Coop',
                        category: 'Mat & dagligvaror',
                        amount: 378,
                        type: 'expense',
                        timestamp: Date.now(),
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] truncate">
                        Coop
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)]">
                        <CategoryIcon
                          icon="shopping-basket"
                          categoryName="Mat & dagligvaror"
                          variant="minimal"
                          size="2xs"
                        />
                        <span>{isEn ? 'Groceries' : 'Mat & dagligvaror'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm sm:text-base font-bold font-amount tabular-nums text-[var(--text-primary)]">
                      − 378{' '}
                      <span className="text-xs font-normal text-[var(--text-secondary)]">
                        kr
                      </span>
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] tabular-nums mt-0.5">
                      01:19
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. ANALYS & CIRKELDIAGRAM
             100% Identical App Excerpts: cirkeldiagram.jpg + analys_kategorier.jpg
      ===================================================================== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-[var(--surface-color)] border-t border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start text-left">
          
          {/* Left Column (6 cols): Exact App Excerpt (cirkeldiagram.jpg) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6"
          >
            <div className="rounded-modal bg-[var(--bg-color)] p-5 sm:p-7 space-y-3.5 shadow-subtle select-none">
              {/* Top Controls Row (Oktober Nu + Alla / Rörliga / Fasta) */}
              <div className="flex items-center justify-between gap-2">
                <div className="h-9 px-3.5 rounded-full bg-[var(--surface-color)] inline-flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] shadow-subtle">
                  <Calendar size={14} className="text-[var(--text-secondary)]" />
                  <span>{isEn ? 'October' : 'Oktober'}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-black/[0.06] text-[10px] font-bold">
                    {isEn ? 'Current' : 'Nu'}
                  </span>
                  <ChevronDown size={13} className="text-[var(--text-secondary)]" />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-9 px-3.5 rounded-full bg-[var(--surface-color)] text-xs font-medium text-[var(--text-secondary)] inline-flex items-center">
                    {isEn ? 'All' : 'Alla'}
                  </span>
                  <span className="h-9 px-3.5 rounded-full bg-[var(--text-primary)] text-[var(--surface-color)] text-xs font-semibold inline-flex items-center">
                    {isEn ? 'Variable' : 'Rörliga'}
                  </span>
                  <span className="h-9 px-3.5 rounded-full bg-[var(--surface-color)] text-xs font-medium text-[var(--text-secondary)] inline-flex items-center">
                    {isEn ? 'Fixed' : 'Fasta'}
                  </span>
                </div>
              </div>

              {/* Two Summary Cards Side-by-Side (Consistent 23 536 kr, no info icon!) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-card bg-[var(--surface-color)] p-4 shadow-subtle">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    {isEn ? 'Remaining to spend' : 'Kvar att spendera'}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] mt-1">
                    23 536{' '}
                    <span className="text-xs font-normal text-[var(--text-secondary)]">
                      kr
                    </span>
                  </p>
                </div>

                <div className="rounded-card bg-[var(--surface-color)] p-4 shadow-subtle">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    {isEn ? 'vs previous period' : 'Mot förra perioden'}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] mt-1">
                    +3 219{' '}
                    <span className="text-xs font-normal text-[var(--text-secondary)]">
                      kr
                    </span>
                  </p>
                </div>
              </div>

              {/* Donut Chart Card (Identical to cirkeldiagram.jpg / AnalysisView.tsx) */}
              <div className="rounded-card bg-[var(--surface-color)] p-6 flex items-center justify-center shadow-subtle">
                <div className="relative w-[220px] h-[220px] sm:w-[244px] sm:h-[244px] flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="41"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="9.5"
                      className="text-black/[0.04]"
                    />
                    {(() => {
                      const radius = 41;
                      const circumference = 2 * Math.PI * radius;
                      const segments = [
                        { pct: 0.52, strokeColor: 'rgb(239, 68, 68)' },
                        { pct: 0.17, strokeColor: 'rgb(244, 63, 94)' },
                        { pct: 0.15, strokeColor: 'rgb(14, 165, 233)' },
                        { pct: 0.07, strokeColor: 'rgb(232, 155, 184)' },
                        { pct: 0.04, strokeColor: 'rgb(139, 92, 246)' },
                        { pct: 0.05, strokeColor: 'rgb(115, 109, 132)' },
                      ];
                      let acc = 0;
                      return segments.map((seg, i) => {
                        const len = seg.pct * circumference;
                        const visible = Math.max(1, len - 2.5);
                        const dashArray = `${visible} ${circumference - visible}`;
                        const dashOffset = -acc * circumference;
                        acc += seg.pct;
                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke={seg.strokeColor}
                            strokeWidth="9.5"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                          />
                        );
                      });
                    })()}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-medium tracking-wider text-[var(--text-tertiary)]">
                      {isEn ? 'VARIABLE EXPENSES' : 'RÖRLIGA UTGIFTER'}
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold font-amount tabular-nums text-[var(--text-primary)] mt-0.5">
                      11 105{' '}
                      <span className="text-xs font-normal text-[var(--text-secondary)]">
                        kr
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column (6 cols): Copy + Exact Category Breakdown Excerpt (analys_kategorier.jpg) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.06] text-balance">
                {tr('landing_analysis_title')}
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] text-pretty">
                {tr('landing_analysis_desc')}
              </p>
            </div>

            {/* Exact App Excerpt: analys_kategorier.jpg */}
            <div className="rounded-modal bg-[var(--bg-color)] p-4 sm:p-6 shadow-subtle select-none">
              <div className="rounded-card bg-[var(--surface-color)] overflow-hidden divide-y divide-[var(--border-divider)] shadow-subtle">
                {/* Row 1: Mat & Dagligvaror */}
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon
                      icon="shopping-basket"
                      categoryName="Mat & Dagligvaror"
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] truncate">
                        {isEn ? 'Groceries' : 'Mat & Dagligvaror'}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        184 kr {isEn ? 'left of budget' : 'kvar av budget'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <p className="text-sm sm:text-base font-semibold font-amount tabular-nums text-[var(--text-primary)]">
                        5 816{' '}
                        <span className="text-xs font-normal text-[var(--text-secondary)]">
                          kr
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] tabular-nums">
                        52 %
                      </p>
                    </div>
                    <ChevronDown size={16} className="text-[var(--text-secondary)] opacity-60" />
                  </div>
                </div>

                {/* Row 2: Hälsa & Träning */}
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon
                      icon="heart"
                      categoryName="Hälsa & Träning"
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] truncate">
                        {isEn ? 'Health & Fitness' : 'Hälsa & Träning'}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        646 kr {isEn ? 'left of budget' : 'kvar av budget'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <p className="text-sm sm:text-base font-semibold font-amount tabular-nums text-[var(--text-primary)]">
                        1 854{' '}
                        <span className="text-xs font-normal text-[var(--text-secondary)]">
                          kr
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] tabular-nums">
                        17 %
                      </p>
                    </div>
                    <ChevronDown size={16} className="text-[var(--text-secondary)] opacity-60" />
                  </div>
                </div>

                {/* Row 3: Transport (Expanded with Parkster) */}
                <div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        icon="car"
                        categoryName="Transport"
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] truncate">
                          Transport
                        </p>
                        <p className="text-xs font-medium text-[var(--danger-color)] mt-0.5">
                          451 kr {isEn ? 'over budget' : 'över budget'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-semibold font-amount tabular-nums text-[var(--text-primary)]">
                          1 651{' '}
                          <span className="text-xs font-normal text-[var(--text-secondary)]">
                            kr
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] tabular-nums">
                          15 %
                        </p>
                      </div>
                      <ChevronUp size={16} className="text-[var(--text-primary)]" />
                    </div>
                  </div>

                  {/* Expanded Nested Transaction (Parkster - 61 kr 12 okt.) */}
                  <div className="bg-[var(--card-nested-bg)] p-3.5 border-t border-[var(--border-divider)]">
                    <div className="rounded-card bg-[var(--surface-color)] px-4 py-3 flex items-center justify-between gap-3 shadow-subtle">
                      <div className="flex items-center gap-3 min-w-0">
                        <TransactionLogo
                          transaction={{
                            id: 'analysis-parkster',
                            merchant: 'Parkster',
                            category: 'Transport',
                            amount: 61,
                            type: 'expense',
                            timestamp: Date.now(),
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            Parkster
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--text-secondary)]">
                            <CategoryIcon
                              icon="car"
                              categoryName="Transport"
                              variant="minimal"
                              size="2xs"
                            />
                            <span>Transport</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-amount tabular-nums text-[var(--text-primary)]">
                          − 61{' '}
                          <span className="text-xs font-normal text-[var(--text-secondary)]">
                            kr
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] tabular-nums mt-0.5">
                          12 okt.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =====================================================================
          9. FULL KONTROLL UTAN BANKKOPPLING
             100% Identical App Excerpt: redigera_transaktion.png
      ===================================================================== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-[var(--bg-color)] border-t border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center text-left">
          
          {/* Left Column (6 cols): Exact App Excerpt (redigera_transaktion.png) */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 order-2 lg:order-1"
          >
            <div className="rounded-modal bg-editorial-lavender p-5 sm:p-8 select-none shadow-subtle">
              <div className="rounded-modal bg-[var(--bg-color)] p-5 sm:p-6 shadow-subtle space-y-5">
                {/* Top sheet handle */}
                <div className="w-12 h-1.5 rounded-full bg-black/15 mx-auto" />

                {/* Modal Header: Redigera transaktion + Close X */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    {isEn ? 'Edit transaction' : 'Redigera transaktion'}
                  </h3>
                  <div className="w-9 h-9 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-secondary)]">
                    <X size={16} strokeWidth={2.2} />
                  </div>
                </div>

                {/* Inner White Card: Uber + 100 KR */}
                <div className="rounded-card bg-[var(--surface-color)] p-5 sm:p-6 space-y-4 shadow-subtle">
                  <div className="flex items-center gap-3.5">
                    <TransactionLogo
                      size="lg"
                      transaction={{
                        id: 'edit-uber-preview',
                        merchant: 'Uber',
                        category: 'Transport',
                        amount: 100,
                        type: 'expense',
                        timestamp: Date.now(),
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                        {isEn ? 'NAME / MERCHANT' : 'NAMN / MOTTAGARE'}
                      </p>
                      <p className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] leading-snug mt-0.5">
                        Uber
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-divider)]">
                    <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                      {isEn ? 'AMOUNT' : 'BELOPP'}
                    </p>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-[32px] sm:text-[36px] font-bold font-amount tabular-nums leading-none text-[var(--text-primary)]">
                        100
                      </span>
                      <span className="text-sm font-medium text-[var(--text-tertiary)]">
                        KR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column (6 cols): Editorial Copy & 3 Pillars */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.06] text-balance">
                {tr('landing_control_title')}
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] text-pretty">
                {tr('landing_control_desc')}
              </p>
            </div>

            <div className="pt-2 divide-y divide-[var(--border-divider)] border-t border-b border-[var(--border-divider)]">
              <div className="py-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {tr('landing_control_item1_title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {tr('landing_control_item1_desc')}
                  </p>
                </div>
                <Check size={18} className="text-[var(--text-primary)] shrink-0 mt-1" />
              </div>

              <div className="py-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {tr('landing_control_item2_title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {tr('landing_control_item2_desc')}
                  </p>
                </div>
                <Check size={18} className="text-[var(--text-primary)] shrink-0 mt-1" />
              </div>

              <div className="py-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {tr('landing_control_item3_title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {tr('landing_control_item3_desc')}
                  </p>
                </div>
                <Check size={18} className="text-[var(--text-primary)] shrink-0 mt-1" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =====================================================================
          10. VANLIGA FRÅGOR (FAQ) — Balanced Left Column & Hairline Accordion
      ===================================================================== */}
      <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-divider)] bg-[var(--surface-color)] scroll-mt-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start text-left">
          
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-tight text-balance">
                {tr('landing_faq_title')}
              </h2>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
                {tr('landing_faq_subtitle')}
              </p>
            </div>

            <div className="rounded-card bg-editorial-peach p-5 sm:p-6 space-y-3">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {isEn ? 'Want to see how it feels first?' : 'Vill du känna på appen direkt?'}
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {isEn
                  ? 'You can explore Dejz in demo mode or create a free account in under a minute.'
                  : 'Testa demot direkt i webbläsaren eller skapa ett gratis konto på under en minut.'}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onGetStarted}
                  className="text-xs font-semibold px-4"
                >
                  {tr('landing_nav_get_started')}
                </Button>
                {onStartDemo && (
                  <button
                    type="button"
                    onClick={onStartDemo}
                    className="text-xs font-semibold text-[var(--text-primary)] px-3.5 py-2 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer border-none shadow-2xs"
                  >
                    {tr('landing_hero_demo')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 border-t border-[var(--border-divider)]">
            <FAQAccordionItem
              index="01"
              question={tr('landing_faq1_q')}
              answer={tr('landing_faq1_a')}
            />
            <FAQAccordionItem
              index="02"
              question={tr('landing_faq2_q')}
              answer={tr('landing_faq2_a')}
            />
            <FAQAccordionItem
              index="03"
              question={tr('landing_faq3_q')}
              answer={tr('landing_faq3_a')}
            />
            <FAQAccordionItem
              index="04"
              question={tr('landing_faq4_q')}
              answer={tr('landing_faq4_a')}
            />
            <FAQAccordionItem
              index="05"
              question={tr('landing_faq5_q')}
              answer={
                <>
                  {tr('landing_faq5_a_before')}
                  {onStartDemo ? (
                    <button
                      type="button"
                      onClick={onStartDemo}
                      className="underline font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 inline"
                    >
                      {tr('landing_faq5_a_link')}
                    </button>
                  ) : (
                    tr('landing_faq5_a_link')
                  )}
                  {tr('landing_faq5_a_after')}
                </>
              }
            />
            <FAQAccordionItem
              index="06"
              question={tr('landing_faq6_q')}
              answer={tr('landing_faq6_a')}
            />
          </div>

        </div>
      </section>

      {/* =====================================================================
          11. AVSLUTANDE REGISTRERING — Full-Bleed Luminous Nordic Sky Finale
      ===================================================================== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-editorial-lavender border-t border-[var(--border-divider)]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.05] text-balance">
            {tr('landing_cta_title')}
          </h2>

          <p className="text-base sm:text-lg text-[var(--text-primary)]/80 leading-relaxed max-w-xl mx-auto text-pretty">
            {tr('landing_cta_subtitle')}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              className="w-auto font-semibold text-sm shadow-subtle px-8 h-12 justify-center text-center"
            >
              {tr('landing_hero_button')}
            </Button>

            <p className="text-xs font-medium text-[var(--text-primary)]/80 flex items-center justify-center gap-1.5">
              <Lock size={13} className="shrink-0" />
              <span>{tr('landing_no_bank_needed')}</span>
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          12. FOOTER
      ===================================================================== */}
      <footer className="py-12 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] px-4 sm:px-6 border-t border-[var(--border-divider)] bg-[var(--bg-color)] text-xs text-[var(--text-tertiary)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2">
            <DejzLogo className="h-6 w-auto" />
            <span className="ml-2 text-micro-label text-[var(--text-tertiary)]">
              © {new Date().getFullYear()} Dejz. {tr('landing_footer_rights')}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handlePolicyOpen('privacy')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              {tr('landing_footer_privacy')}
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('terms')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              {tr('landing_footer_terms')}
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('privacy')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              {tr('landing_footer_contact')}
            </button>
          </div>

        </div>
      </footer>

      {/* Policy Modal fallback */}
      {activePolicyModal && (
        <PolicyModal
          type={activePolicyModal}
          onClose={() => setActivePolicyModal(null)}
          currentLanguage={currentLanguage}
        />
      )}

    </div>
  );
}
