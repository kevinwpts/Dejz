import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  ChevronDown, 
  ChevronUp,
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
  PiggyBank,
  Pause,
  Play
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
  heroHome?: string;             // Hero: Frilagd telefon-mockup (/mockup_01.png)
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
          width={640}
          height={420}
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
          ? 'bg-[var(--text-primary)]/95 backdrop-blur-md border-2 border-dashed border-white/25 text-white shadow-modal p-4 sm:p-5'
          : isFloating
          ? 'bg-white/95 dark:bg-[var(--surface-color)]/95 backdrop-blur-md border-2 border-dashed border-[var(--text-primary)]/25 text-[var(--text-primary)] shadow-modal p-4 sm:p-5'
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
          width={520}
          height={640}
          fetchPriority="high"
          referrerPolicy="no-referrer"
          className={`w-full max-w-[360px] sm:max-w-[430px] lg:max-w-[490px] h-auto shrink-0 object-contain select-none pointer-events-none landing-hero-shadow transition-transform duration-500 ${
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
            width={640}
            height={480}
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
        className={`relative z-10 w-full rounded-modal p-2.5 sm:p-3 bg-[var(--text-primary)] shadow-modal border border-white/10 ring-1 ring-black/30 overflow-hidden transition-all duration-500 ${
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
              width={310}
              height={670}
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

const GoogleGLogo = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" style={{ width: size, height: size }} className="shrink-0" aria-hidden="true">
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
        className="w-full py-5 sm:py-6 text-left flex items-start justify-between gap-4 group cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)] focus-visible:ring-offset-2 bg-transparent border-none"
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
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 pl-8 pr-6 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-[62ch]">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Single Calm App Transaction Strip
 * One calm row of clear transaction examples, discreetly marked as examples,
 * with slow movement, hover/button pause control, and prefers-reduced-motion support.
 */
const CalmTransactionStrip = ({
  currentLanguage,
  tr,
}: {
  currentLanguage: Language;
  tr: (key: TranslationKey) => string;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const isEn = currentLanguage === 'en';

  const exampleCards = [
    {
      merchant: 'Coop',
      category: isEn ? 'Groceries' : 'Mat & dagligvaror',
      icon: 'shopping-basket',
      amount: '378',
      time: isEn ? 'Today' : 'Idag',
      method: isEn ? 'Voice' : 'Röst',
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
      method: 'Swish',
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
      merchant: 'ICA Kvantum',
      category: isEn ? 'Groceries' : 'Mat & dagligvaror',
      icon: 'shopping-basket',
      amount: '642',
      time: isEn ? 'Receipt' : 'Kvitto',
      method: isEn ? 'Card' : 'Kort',
      type: 'expense' as const,
    },
  ];

  const renderExampleCard = (item: (typeof exampleCards)[number], key: string) => (
    <div
      key={key}
      className="w-[305px] sm:w-[340px] shrink-0 rounded-card bg-[var(--surface-color)] px-4 py-3.5 flex items-center justify-between gap-3.5 shadow-subtle text-left select-none"
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
          <p className="text-sm sm:text-[15px] font-semibold text-[var(--text-primary)] truncate leading-snug">
            {item.merchant}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)]">
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
        <p className="text-sm sm:text-[15px] font-bold font-amount tabular-nums text-[var(--text-primary)] leading-snug">
          − {item.amount}{' '}
          <span className="text-xs font-normal text-[var(--text-secondary)]">
            kr{item.isFixed ? '/mån' : ''}
          </span>
        </p>
        <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[11px] text-[var(--text-tertiary)] tabular-nums">
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
      aria-label={tr('landing_tx_strip_label')}
      className="py-6 sm:py-8 bg-[var(--bg-color)] border-b border-[var(--border-divider)] overflow-hidden"
    >
      <div className="landing-container mb-3 flex items-center justify-between gap-4">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">
          {tr('landing_tx_strip_label')}
        </p>
        {!prefersReducedMotion && (
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-pressed={isPaused}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 rounded-full bg-[var(--surface-color)] border border-[var(--border-divider)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
          >
            {isPaused ? <Play size={11} /> : <Pause size={11} />}
            <span>{isPaused ? tr('landing_tx_strip_play') : tr('landing_tx_strip_pause')}</span>
          </button>
        )}
      </div>

      {prefersReducedMotion ? (
        <div className="landing-container flex gap-3.5 overflow-x-auto no-scrollbar pb-1">
          {exampleCards.map((item, idx) => renderExampleCard(item, `static-${idx}`))}
        </div>
      ) : (
        <div className="relative overflow-hidden">
          <div
            style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
            className="flex items-center gap-3.5 w-max px-4 animate-marquee-slow hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
          >
            {[...exampleCards, ...exampleCards].map((item, idx) =>
              renderExampleCard(item, `marquee-${idx}`)
            )}
          </div>
        </div>
      )}
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
  const prefersReducedMotion = useReducedMotion();

  const tr = (key: TranslationKey): string => {
    return translations[currentLanguage]?.[key] || translations.sv[key] || key;
  };

  const isEn = currentLanguage === 'en';
  const currentLangOption = NORDIC_LANGUAGES.find(l => l.code === currentLanguage) || NORDIC_LANGUAGES[0];
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const revealMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0.01, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
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
          ? 'bg-[var(--surface-color)]/92 backdrop-blur-xl border-b border-[var(--border-divider)]'
          : 'bg-[var(--surface-color)] border-b border-transparent'
      }`}>
        <div className="landing-container h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <DejzLogo className="h-6 sm:h-7 w-auto" />
          </div>

          {/* Desktop Navigation (md+) */}
          <nav aria-label={tr('landing_nav_menu_label')} className="hidden md:flex items-center gap-5 lg:gap-7">
            <a
              href="#how-it-works"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_nav_how_it_works')}
            </a>

            <a
              href="#features"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_footer_features')}
            </a>

            <a
              href="#faq"
              className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
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
          </nav>

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
                className="inline-flex items-center gap-1.5 px-2.5 h-8 sm:h-9 rounded-full text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-divider)] shadow-subtle transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
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
            <div className="landing-container h-16 flex items-center justify-between border-b border-[var(--border-divider)]/40">
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

            <div className="landing-container pt-4 pb-5 space-y-1 text-left">
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

      <main>
        {/* =====================================================================
            1. HERO SECTION
        ===================================================================== */}
        <section className="relative pt-8 sm:pt-12 lg:pt-16 pb-14 sm:pb-20 bg-[var(--surface-color)] border-b border-[var(--border-divider)] overflow-hidden">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column (7 cols): Clear Headline, Lead, Stacked Mobile / Inline Desktop CTAs */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
              <div className="space-y-4 max-w-[38rem]">
                <h1 className="text-[2.45rem] sm:text-5xl lg:text-[3.65rem] font-extrabold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.04] text-balance">
                  {tr('landing_hero_title')}
                </h1>

                <p className="text-base sm:text-lg lg:text-[1.125rem] text-[var(--text-secondary)] leading-[1.6] max-w-[54ch] mx-auto lg:mx-0 font-normal text-pretty">
                  {tr('landing_hero_subtitle')}
                </p>
              </div>

              {/* Registration CTAs: Full-width stacked on mobile, inline on sm+ */}
              <div className="w-full max-w-sm sm:max-w-none space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onGetStarted}
                    className="w-full sm:w-auto justify-center font-semibold text-sm shadow-subtle px-7 h-12 whitespace-nowrap"
                  >
                    {tr('landing_hero_button')}
                  </Button>

                  {onGoogleLogin && (
                    <button
                      type="button"
                      onClick={onGoogleLogin}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)]/70 px-6 h-12 rounded-full border border-[var(--border-strong)] transition-all cursor-pointer shadow-subtle whitespace-nowrap active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
                    >
                      <GoogleGLogo size={17} />
                      <span>{tr('landing_hero_google')}</span>
                    </button>
                  )}

                  {onStartDemo && (
                    <button
                      type="button"
                      onClick={onStartDemo}
                      className="inline-flex items-center justify-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4 px-3 h-10 sm:h-12 rounded-full transition-colors cursor-pointer border-none bg-transparent whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
                    >
                      {tr('landing_hero_demo')}
                    </button>
                  )}
                </div>

                {/* Discreet note directly under buttons */}
                <p className="text-xs font-medium text-[var(--text-tertiary)] pt-0.5">
                  {tr('landing_no_bank_needed')}
                </p>
              </div>
            </div>

            {/* Right Column (5 cols): Integrated Signature Stage + Phone Mockup */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-[440px] lg:max-w-none rounded-modal bg-landing-sky-soft border border-[var(--border-divider)] p-5 sm:p-7 flex items-center justify-center overflow-hidden">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-6 top-6 bottom-6 rounded-card bg-landing-signature/35 pointer-events-none"
                />
                <div className="relative z-10 w-full">
                  <PhoneScreenshotFrame
                    label="Screenshot: Hem – kvar att spendera och aktuell löneperiod"
                    src={screenshots.heroHome}
                    alt="Dejz hemvy som visar kvar att spendera och aktuell löneperiod"
                    perspectiveTilt={true}
                    isPreframedMockup={true}
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =====================================================================
            2. ENKEL TRANSAKTIONSREMSA (1 lugn rad, tydligt märkt som exempel)
        ===================================================================== */}
        <CalmTransactionStrip currentLanguage={currentLanguage} tr={tr} />

        {/* =====================================================================
            3. TRE STEG — ”Så kommer du igång”
        ===================================================================== */}
        <section
          id="how-it-works"
          className="py-14 sm:py-20 bg-[var(--surface-color)] border-b border-[var(--border-divider)] scroll-mt-20"
        >
          <div className="landing-container space-y-8 sm:space-y-10 text-left">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-tight">
              {tr('landing_how_title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-2 border-t border-[var(--border-divider)]">
              <div className="pt-4 md:pt-6 flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-landing-signature text-[var(--text-primary)] text-xs font-extrabold font-amount tabular-nums flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    {tr('landing_step1_title')}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                    {tr('landing_step1_desc')}
                  </p>
                </div>
              </div>

              <div className="pt-4 md:pt-6 flex items-start gap-4 border-t md:border-t-0 border-[var(--border-divider)]">
                <span className="w-8 h-8 rounded-full bg-landing-signature text-[var(--text-primary)] text-xs font-extrabold font-amount tabular-nums flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    {tr('landing_step2_title')}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                    {tr('landing_step2_desc')}
                  </p>
                </div>
              </div>

              <div className="pt-4 md:pt-6 flex items-start gap-4 border-t md:border-t-0 border-[var(--border-divider)]">
                <span className="w-8 h-8 rounded-full bg-landing-signature text-[var(--text-primary)] text-xs font-extrabold font-amount tabular-nums flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    {tr('landing_step3_title')}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                    {tr('landing_step3_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. SMIDIG REGISTRERING
               Rubrik: ”Ett köp. Några ord. Budgeten uppdaterad.”
               Integrerad med vardagsfoto (dejz_01.png) & identiskt app-utdrag (Coop 378 kr)
        ===================================================================== */}
        <section id="features" className="py-16 sm:py-24 bg-[var(--bg-color)] scroll-mt-20">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column (6 cols): Copy + Everyday Nordic Photo (dejz_01.png) */}
            <motion.div {...revealMotion} className="lg:col-span-6 space-y-6 text-left">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                  {tr('landing_voice_title')}
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] max-w-[54ch] text-pretty">
                  {tr('landing_voice_desc')}
                </p>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-[1.6] max-w-[54ch]">
                  {tr('landing_voice_subdesc')}
                </p>
              </div>

              {/* Integrated Nordic Everyday Photo (dejz_01.png) */}
              <div className="rounded-card overflow-hidden border border-[var(--border-divider)] bg-[var(--surface-color)] shadow-subtle">
                <div className="aspect-[16/9] w-full overflow-hidden bg-landing-sky-soft">
                  <img
                    src={screenshots.lifestyleGrocery || '/dejz_01.png'}
                    alt={isEn ? 'Logging a grocery purchase on the go' : 'Registrera matinköp i vardagen'}
                    width={640}
                    height={360}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
            </motion.div>

            {/* Right Column (6 cols): Clear Product Illustration (Coop 378 kr + Mat & dagligvaror) */}
            <motion.div {...revealMotion} className="lg:col-span-6">
              <div className="rounded-modal bg-landing-sky-soft border border-[var(--border-divider)] p-5 sm:p-7 space-y-4 select-none">
                {/* Excerpt 1: Voice & Action Sheet (lagga_till_transaktion.png) */}
                <div className="rounded-card bg-[var(--surface-color)] p-5 sm:p-6 shadow-subtle space-y-5">
                  <div className="w-12 h-1.5 rounded-full bg-black/15 mx-auto" />

                  <div className="grid grid-cols-3 gap-4 max-w-[300px] mx-auto text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-primary)]">
                        <ArrowDownLeft size={20} strokeWidth={1.9} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {isEn ? 'Expense' : 'Utgift'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-primary)]">
                        <ArrowUpRight size={20} strokeWidth={1.9} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {isEn ? 'Income' : 'Inkomst'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-primary)]">
                        <Camera size={20} strokeWidth={1.9} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {isEn ? 'Receipt' : 'Kvitto'}
                      </span>
                    </div>
                  </div>

                  {/* Voice Input Bar (Mat 378 kr Coop) */}
                  <div className="voice-bar-surface rounded-card-nested p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="voice-mic-box w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                        <Mic size={19} strokeWidth={1.9} />
                      </div>
                      <span className="text-base sm:text-lg font-medium text-[var(--text-primary)] truncate">
                        {isEn ? 'Groceries 378 kr Coop' : 'Mat 378 kr Coop'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <X size={17} className="text-[var(--text-tertiary)]" />
                      <div className="voice-stop-btn w-9 h-9 rounded-xl flex items-center justify-center">
                        <div className="w-3 h-3 border-[1.75px] border-white rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Excerpt 2: Interpreted Transaction Preview (Coop, Mat & dagligvaror, 378 KR) */}
                <div className="rounded-card bg-[var(--surface-color)] p-5 sm:p-6 shadow-subtle space-y-4 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
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
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                          {isEn ? 'STORE & CATEGORY' : 'BUTIK & KATEGORI'}
                        </p>
                        <p className="text-lg font-bold text-[var(--text-primary)] leading-snug mt-0.5">
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
                      <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                        {isEn ? 'AMOUNT' : 'BELOPP'}
                      </p>
                      <div className="flex items-baseline justify-end gap-1 mt-0.5">
                        <span className="text-2xl sm:text-3xl font-bold font-amount tabular-nums leading-none text-[var(--text-primary)]">
                          378
                        </span>
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          kr
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* =====================================================================
            5. BUDGET & FASTA UTGIFTER
               Rubrik: ”Lönen är inte hela din budget.”
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-landing-sky-soft border-y border-[var(--border-divider)]">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column (7 cols): App Excerpt (totalt_fasta.jpg + fasta_utgifter.jpg) */}
            <motion.div {...revealMotion} className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-modal bg-[var(--bg-color)] border border-[var(--border-divider)] p-5 sm:p-7 space-y-3.5 shadow-subtle text-left select-none">
                {/* Top Filter Pills */}
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

                {/* Totala fasta utgifter Card */}
                <div className="rounded-card bg-[var(--surface-color)] p-5 shadow-subtle flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                      {isEn ? 'Total monthly fixed expenses' : 'Totala fasta utgifter'}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-bold font-amount tabular-nums text-[var(--text-primary)]">
                        −11 379
                      </span>
                      <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
                        kr<span className="text-[11px] opacity-75">/mån</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs font-medium text-[var(--text-tertiary)]">
                      {isEn ? 'Pay period' : 'Löneperiod'}
                    </p>
                    <p className="text-sm font-bold font-amount tabular-nums text-[var(--text-primary)] mt-0.5">
                      24 sep – 22 okt
                    </p>
                  </div>
                </div>

                {/* Fixed Expense Rows */}
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
                  ].map((fe) => (
                    <div
                      key={fe.id}
                      className="rounded-card bg-[var(--surface-color)] px-4 py-3.5 flex items-center justify-between gap-3 shadow-subtle transition-transform duration-200 hover:translate-x-0.5"
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
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right Column (5 cols): Copy + Payment Intervals & Variable Amounts Detail + Home Photo */}
            <motion.div {...revealMotion} className="lg:col-span-5 order-1 lg:order-2 space-y-6 text-left">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                  {tr('landing_fixed_title')}
                </h2>

                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] font-normal text-pretty">
                  {tr('landing_fixed_desc')}
                </p>
              </div>

              {/* Short details for payment intervals & variable bills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-card-nested bg-[var(--surface-color)] p-3.5 border border-[var(--border-divider)]">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {tr('landing_fixed_pill_intervals')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                    {isEn
                      ? 'Support for monthly, quarterly, semi-annual, and annual bills.'
                      : 'Lägg in räkningar som dras varje månad, kvartal, halvår eller år.'}
                  </p>
                </div>

                <div className="rounded-card-nested bg-[var(--surface-color)] p-3.5 border border-[var(--border-divider)]">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {tr('landing_fixed_pill_variable')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                    {isEn
                      ? 'Mark bills that vary in amount, such as electricity or water.'
                      : 'Markera räkningar där beloppet varierar, som el eller bredband.'}
                  </p>
                </div>
              </div>

              {/* Integrated Nordic Home Photo (dejz_02.png) */}
              <div className="rounded-card overflow-hidden border border-[var(--border-divider)] bg-[var(--surface-color)] shadow-subtle">
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <img
                    src={screenshots.lifestyleHome || '/dejz_02.png'}
                    alt={isEn ? 'Calm overview of household fixed expenses' : 'Överblick över hemmets fasta kostnader'}
                    width={600}
                    height={338}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* =====================================================================
            6. ÖVERBLICK
               Rubrik: ”Se vad du har kvar till nästa lön.”
               Kort för återstående budget, kategorier och tidslinje (dagsöverblick som komplettering)
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-[var(--surface-color)] border-b border-[var(--border-divider)]">
          <div className="landing-container space-y-8 sm:space-y-10 text-left">
            <motion.div {...revealMotion} className="max-w-2xl space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                {tr('landing_daily_title')}
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-[58ch]">
                {tr('landing_daily_desc')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Card 1 (6 cols): Återstående budget (kvar_att_spendera.jpg) */}
              <motion.div
                {...revealMotion}
                className="lg:col-span-6 rounded-modal bg-landing-signature p-6 sm:p-8 flex flex-col justify-between gap-6 select-none shadow-subtle"
              >
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                    {tr('landing_daily_item1_title')}
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--text-primary)]/85 leading-relaxed">
                    {tr('landing_daily_item1_desc')}
                  </p>
                </div>

                <div className="space-y-3">
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
                        <div className="h-full w-[72%] rounded-full bg-[var(--text-primary)]" />
                      </div>
                    </div>
                  </div>

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

              {/* Card 2 (6 cols): Kategoribudgetar på hemskärmen */}
              <motion.div
                {...revealMotion}
                className="lg:col-span-6 rounded-modal bg-landing-sky-soft border border-[var(--border-divider)] p-6 sm:p-8 flex flex-col justify-between gap-6 select-none shadow-subtle"
              >
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                    {tr('landing_daily_item2_title')}
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    {tr('landing_daily_item2_desc')}
                  </p>
                </div>

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
                  ].map((cat) => (
                    <div
                      key={cat.name}
                      className="rounded-card bg-[var(--surface-color)] p-3.5 sm:p-4 shadow-subtle flex flex-col justify-between gap-4 min-h-[132px] sm:min-h-[146px] transition-transform duration-200 hover:-translate-y-0.5"
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
                    </div>
                  ))}
                </div>

                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  {isEn
                    ? 'Swipe through your categories directly on the home screen.'
                    : 'Svep genom dina kategorier direkt på hemskärmen.'}
                </p>
              </motion.div>

              {/* Card 3 (12 cols): Tidslinje & dagsöverblick som kompletterande funktion */}
              <motion.div
                {...revealMotion}
                className="lg:col-span-12 rounded-modal bg-landing-contrast-dark p-6 sm:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center select-none shadow-subtle"
              >
                <div className="lg:col-span-5 space-y-3 text-white">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {tr('landing_daily_item3_title')}
                  </h3>
                  <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                    {tr('landing_daily_item3_desc')}
                  </p>
                </div>

                {/* App Excerpt: tidslinje.png */}
                <div className="lg:col-span-7 rounded-modal bg-[var(--bg-color)] p-4 sm:p-6 space-y-4">
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
                        className={`h-[56px] sm:h-[62px] rounded-card-nested flex flex-col items-center justify-center gap-0.5 transition-transform duration-200 hover:-translate-y-0.5 ${
                          d.active
                            ? 'bg-landing-signature font-semibold text-[var(--text-primary)] shadow-subtle'
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

                  <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] pt-0.5">
                    {isEn ? 'Today, October 14' : 'Idag, 14 oktober'}
                  </p>

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
            7. ANALYS
               Rubrik: ”Förstå vart pengarna tar vägen.”
               Hela diagrammet och tydliga kategorier utan dubblerat "Kvar att spendera"-kort
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-[var(--bg-color)] border-b border-[var(--border-divider)]">
          <div className="landing-container space-y-8 sm:space-y-10 text-left">
            <motion.div {...revealMotion} className="max-w-2xl space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                {tr('landing_analysis_title')}
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] max-w-[58ch] text-pretty">
                {tr('landing_analysis_desc')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
              {/* Left Column (5 cols): Full Donut Chart Card */}
              <motion.div {...revealMotion} className="lg:col-span-5 flex">
                <div className="w-full rounded-modal bg-[var(--surface-color)] border border-[var(--border-divider)] p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-subtle select-none">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-9 px-3.5 rounded-full bg-[var(--bg-color)] inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <Calendar size={14} className="text-[var(--text-secondary)]" />
                      <span>{isEn ? 'October' : 'Oktober'}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-black/[0.06] text-[10px] font-bold">
                        {isEn ? 'Current' : 'Nu'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="h-8 px-3 rounded-full bg-[var(--bg-color)] text-xs font-medium text-[var(--text-secondary)] inline-flex items-center">
                        {isEn ? 'All' : 'Alla'}
                      </span>
                      <span className="h-8 px-3 rounded-full bg-[var(--text-primary)] text-[var(--surface-color)] text-xs font-semibold inline-flex items-center">
                        {isEn ? 'Variable' : 'Rörliga'}
                      </span>
                      <span className="h-8 px-3 rounded-full bg-[var(--bg-color)] text-xs font-medium text-[var(--text-secondary)] inline-flex items-center">
                        {isEn ? 'Fixed' : 'Fasta'}
                      </span>
                    </div>
                  </div>

                  {/* Full Uncropped Donut Chart */}
                  <div className="my-auto py-2 flex items-center justify-center">
                    <div className="relative w-[220px] h-[220px] sm:w-[240px] sm:h-[240px] flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
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

                  <p className="text-xs text-[var(--text-tertiary)] text-center">
                    {isEn ? 'Distribution across categories in the current period' : 'Fördelning per kategori under aktuell löneperiod'}
                  </p>
                </div>
              </motion.div>

              {/* Right Column (7 cols): Clear Category Breakdown (analys_kategorier.jpg) */}
              <motion.div {...revealMotion} className="lg:col-span-7 flex">
                <div className="w-full rounded-modal bg-landing-sky-soft border border-[var(--border-divider)] p-4 sm:p-6 flex flex-col justify-center select-none">
                  <div className="rounded-card bg-[var(--surface-color)] overflow-hidden divide-y divide-[var(--border-divider)] shadow-subtle">
                    {/* Row 1: Mat & Dagligvaror */}
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon
                          icon="shopping-basket"
                          categoryName="Mat & Dagligvaror"
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                            {isEn ? 'Groceries' : 'Mat & Dagligvaror'}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            184 kr {isEn ? 'left of budget' : 'kvar av budget'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <p className="text-sm sm:text-base font-bold font-amount tabular-nums text-[var(--text-primary)]">
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
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon
                          icon="heart"
                          categoryName="Hälsa & Träning"
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                            {isEn ? 'Health & Fitness' : 'Hälsa & Träning'}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            646 kr {isEn ? 'left of budget' : 'kvar av budget'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <p className="text-sm sm:text-base font-bold font-amount tabular-nums text-[var(--text-primary)]">
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
                      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon
                            icon="car"
                            categoryName="Transport"
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                              Transport
                            </p>
                            <p className="text-xs font-medium text-[var(--danger-color)] mt-0.5">
                              451 kr {isEn ? 'over budget' : 'över budget'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <p className="text-sm sm:text-base font-bold font-amount tabular-nums text-[var(--text-primary)]">
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
              </motion.div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            8. KONTROLL
               Rubrik: ”Du har sista ordet om din budget.”
               Manuell registrering som delaktighet + redigera_transaktion.png + dejz_03.png
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-[var(--surface-color)] border-b border-[var(--border-divider)]">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center text-left">
            
            {/* Left Column (6 cols): Editorial Copy & 3 Pillars */}
            <motion.div {...revealMotion} className="lg:col-span-6 space-y-6">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                  {tr('landing_control_title')}
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-[1.6] max-w-[54ch] text-pretty">
                  {tr('landing_control_desc')}
                </p>
              </div>

              <div className="divide-y divide-[var(--border-divider)] border-t border-b border-[var(--border-divider)]">
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

              <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                {tr('landing_control_footer')}
              </p>
            </motion.div>

            {/* Right Column (6 cols): App Excerpt (redigera_transaktion.png) + Nordic Photo (dejz_03.png) */}
            <motion.div {...revealMotion} className="lg:col-span-6 space-y-4">
              <div className="rounded-modal bg-landing-sky-soft border border-[var(--border-divider)] p-5 sm:p-7 space-y-4 select-none">
                <div className="rounded-card bg-[var(--bg-color)] p-5 sm:p-6 shadow-subtle space-y-4">
                  <div className="w-12 h-1.5 rounded-full bg-black/15 mx-auto" />

                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      {isEn ? 'Edit transaction' : 'Redigera transaktion'}
                    </h3>
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-secondary)]">
                      <X size={15} strokeWidth={2.2} />
                    </div>
                  </div>

                  {/* Inner White Card: Uber + 100 KR + Category & Date */}
                  <div className="rounded-card bg-[var(--surface-color)] p-4 sm:p-5 space-y-3.5 shadow-subtle">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
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
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                            {isEn ? 'NAME / MERCHANT' : 'NAMN / MOTTAGARE'}
                          </p>
                          <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-snug mt-0.5">
                            Uber
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                          {isEn ? 'AMOUNT' : 'BELOPP'}
                        </p>
                        <div className="flex items-baseline justify-end gap-1 mt-0.5">
                          <span className="text-2xl sm:text-3xl font-bold font-amount tabular-nums leading-none text-[var(--text-primary)]">
                            100
                          </span>
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            KR
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-divider)] flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <CategoryIcon icon="car" categoryName="Transport" variant="minimal" size="2xs" />
                        <span>Transport</span>
                      </span>
                      <span className="font-medium tabular-nums">14 okt. 2026</span>
                    </div>
                  </div>
                </div>

                {/* Integrated Nordic Lifestyle Photo (dejz_03.png) */}
                <div className="rounded-card overflow-hidden border border-[var(--border-divider)] bg-[var(--surface-color)] shadow-subtle">
                  <div className="aspect-[16/9] w-full overflow-hidden">
                    <img
                      src={screenshots.lifestyleControl || '/dejz_03.png'}
                      alt={isEn ? 'Personal control over your budget without bank connection' : 'Personlig kontroll över din budget utan bankkoppling'}
                      width={600}
                      height={338}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* =====================================================================
            9. VANLIGA FRÅGOR (FAQ) — Prioriterade frågor (bankkoppling, löneperiod, registrering, ändra uppgifter, pris, demo)
        ===================================================================== */}
        <section id="faq" className="py-16 sm:py-24 bg-[var(--bg-color)] scroll-mt-20">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start text-left">
            
            <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-tight text-balance">
                  {tr('landing_faq_title')}
                </h2>
                <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
                  {tr('landing_faq_subtitle')}
                </p>
              </div>

              <div className="rounded-card bg-[var(--surface-color)] border border-[var(--border-divider)] p-5 sm:p-6 space-y-3 shadow-subtle">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {isEn ? 'Want to explore the app first?' : 'Vill du testa i egen takt?'}
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {isEn
                    ? 'Try the interactive demo directly in your browser or create a free account.'
                    : 'Öppna demot direkt i webbläsaren eller skapa ett gratis konto.'}
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
                      className="text-xs font-semibold text-[var(--text-primary)] px-3.5 py-2 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-divider)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
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
                question={tr('landing_faq6_q')}
                answer={tr('landing_faq6_a')}
              />
              <FAQAccordionItem
                index="06"
                question={tr('landing_faq5_q')}
                answer={
                  <>
                    {tr('landing_faq5_a_before')}
                    {onStartDemo ? (
                      <button
                        type="button"
                        onClick={onStartDemo}
                        className="underline font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)] rounded-xs"
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
            </div>

          </div>
        </section>

        {/* =====================================================================
            10. AVSLUTANDE CTA
                Rubrik: ”Börja nästa löneperiod med bättre koll.”
                Undertext: ”Samla din budget i Dejz och följ vad du har kvar fram till nästa lön.”
                Primärknapp: ”Kom igång gratis”
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-landing-signature border-t border-[var(--border-divider)]">
          <div className="landing-container text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.06] max-w-2xl mx-auto text-balance">
              {tr('landing_cta_title')}
            </h2>

            <p className="text-base sm:text-lg text-[var(--text-primary)]/85 leading-relaxed max-w-xl mx-auto text-pretty">
              {tr('landing_cta_subtitle')}
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                className="w-full max-w-xs sm:w-auto font-semibold text-sm shadow-subtle px-8 h-12 justify-center text-center"
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
      </main>

      {/* =====================================================================
          11. FOOTER
      ===================================================================== */}
      <footer className="py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--border-divider)] bg-[var(--surface-color)] text-xs text-[var(--text-tertiary)]">
        <div className="landing-container flex flex-col sm:flex-row items-center justify-between gap-6">
          
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
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_footer_privacy')}
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('terms')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_footer_terms')}
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('privacy')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
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
