import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from 'motion/react';
import { 
  ChevronDown, 
  Check, 
  Smartphone, 
  Lock,
  Menu,
  X,
  User,
  Scissors,
  Mic,
  Camera,
  ArrowDownLeft,
  ArrowUpRight,
  Zap
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

/**
 * Smooth Scroll-Linked Parallax Layer
 */
const ParallaxLayer = ({
  children,
  offset = 24,
  scaleFrom = 1,
  className = '',
}: {
  children: React.ReactNode;
  offset?: number;
  scaleFrom?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const rawY = useTransform(scrollYProgress, [0, 0.5, 1], [offset, 0, -offset]);
  const smoothY = useSpring(rawY, { stiffness: 105, damping: 28, mass: 0.35 });

  const rawScale = useTransform(scrollYProgress, [0, 0.45, 1], [scaleFrom, 1, 1]);
  const smoothScale = useSpring(rawScale, { stiffness: 105, damping: 28, mass: 0.35 });

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{ y: smoothY, scale: scaleFrom !== 1 ? smoothScale : undefined }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
};

/**
 * Parallax Photo Frame (Borderless, clean rounded frame with smooth inner image scroll)
 */
const ParallaxPhotoFrame = ({
  src,
  alt,
  aspectClass = 'aspect-[16/9]',
  className = '',
}: {
  src: string;
  alt: string;
  aspectClass?: string;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  const smoothY = useSpring(rawY, { stiffness: 100, damping: 30, mass: 0.4 });

  return (
    <div
      ref={ref}
      className={`rounded-modal overflow-hidden bg-landing-sky-soft ${className}`}
    >
      <div className={`${aspectClass} w-full overflow-hidden relative`}>
        <motion.img
          src={src}
          alt={alt}
          width={640}
          height={420}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={prefersReducedMotion ? undefined : { y: smoothY, scale: 1.1 }}
          className="w-full h-full object-cover object-center select-none will-change-transform"
        />
      </div>
    </div>
  );
};

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
      <div className={`relative select-none pointer-events-none group/snippet ${className}`}>
        <img
          src={src}
          alt={alt}
          width={640}
          height={420}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`w-full h-auto object-contain transition-transform duration-500 ease-out ${
            isBentoFlush
              ? 'rounded-t-2xl rounded-b-none landing-bento-shadow'
              : 'rounded-2xl landing-cutout-shadow'
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
          ? 'bg-[var(--text-primary)]/95 backdrop-blur-md text-white shadow-modal p-4 sm:p-5'
          : isFloating
          ? 'bg-white/95 dark:bg-[var(--surface-color)]/95 backdrop-blur-md text-[var(--text-primary)] shadow-modal p-4 sm:p-5'
          : 'bg-[var(--bg-color)]/90 dark:bg-black/20 text-[var(--text-primary)] p-4 sm:p-5'
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
      <div className={`relative mx-auto w-full flex justify-center items-center py-2 px-1 sm:p-2 ${className}`}>
        <img
          src={src}
          alt={alt}
          width={620}
          height={760}
          fetchPriority="high"
          referrerPolicy="no-referrer"
          className={`w-full max-w-[430px] sm:max-w-[520px] lg:max-w-[580px] h-auto shrink-0 object-contain select-none pointer-events-none landing-hero-shadow transition-transform duration-500 ${
            perspectiveTilt ? 'hover:scale-[1.015]' : ''
          }`}
        />
      </div>
    );
  }

  if (!src && lifestyleImage) {
    return (
      <div className={`relative mx-auto w-full max-w-[460px] ${className}`}>
        <div className="relative rounded-modal overflow-hidden shadow-subtle bg-[var(--bg-color)] aspect-[4/3]">
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
        className={`relative z-10 w-full rounded-modal p-2.5 sm:p-3 bg-[var(--text-primary)] shadow-modal overflow-hidden transition-all duration-500 ${
          perspectiveTilt ? 'hover:scale-[1.015]' : ''
        }`}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-center pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-black" />
        </div>

        <div className={`relative w-full aspect-[9/19.5] rounded-card overflow-hidden bg-[var(--surface-color)] flex flex-col items-center justify-center text-center ${src ? 'p-0' : 'p-4'}`}>
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
              <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)] shadow-xs">
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

/**
 * AppIdenticalTransactionRow
 * Matches src/components/TransactionItem.tsx & src/components/BudgetItem.tsx 1:1.
 */
interface AppIdenticalTransactionProps {
  id: string;
  merchant: string;
  category: string;
  icon: string;
  amount: string;
  time?: string;
  method?: string;
  isFixed?: boolean;
  isVariable?: boolean;
  type?: 'expense' | 'income';
  className?: string;
}

const AppIdenticalTransactionRow: React.FC<AppIdenticalTransactionProps> = ({
  id,
  merchant,
  category,
  icon,
  amount,
  time,
  method,
  isFixed = false,
  isVariable = false,
  type = 'expense',
  className = '',
}) => (
  <div
    className={`px-4 py-3 sm:py-3.5 min-h-[56px] rounded-[var(--radius-card,12px)] bg-[var(--surface-color)] shadow-subtle flex items-center justify-between gap-3 text-left select-none pointer-events-none ${className}`}
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="flex-shrink-0 relative">
        <TransactionLogo
          size="md"
          transaction={{
            id,
            merchant,
            category,
            amount: 100,
            type,
            timestamp: Date.now(),
          }}
        />
        {isVariable && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-micro-label font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--surface-color)] z-20 font-sans">
            R
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="text-body-medium font-medium text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis">
          {merchant}
        </p>

        <div className="flex items-center gap-1.5 mt-0.5 min-w-0 text-[var(--text-secondary)]">
          <div className="flex items-end gap-1 shrink-0 text-[var(--text-secondary)]">
            <CategoryIcon
              icon={icon}
              categoryName={category}
              variant="minimal"
              size="2xs"
            />
            <span className="text-secondary text-[var(--text-secondary)] whitespace-nowrap">
              {category}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div className="flex flex-col items-end justify-center flex-shrink-0 whitespace-nowrap pl-2">
      <p
        className={`text-list-amount whitespace-nowrap ${
          type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
        }`}
      >
        <span className="opacity-80 mr-0.5">{type === 'income' ? '+' : '−'}</span>
        <span className="tabular-nums">{amount}</span>
        <span className="text-secondary opacity-80 font-normal ml-1">
          kr
          {isFixed && <span className="text-micro-label opacity-70 ml-0.5">/mån</span>}
        </span>
      </p>

      {(time || method) && (
        <div className="mt-0.5 flex items-center justify-end gap-1.5">
          {time && (
            <span className="text-secondary text-[var(--text-tertiary)] tabular-nums">
              {time}
            </span>
          )}
          {time && method && (
            <span className="text-[var(--text-tertiary)] opacity-50 text-micro-label">·</span>
          )}
          {method && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-micro-label font-medium bg-[var(--surface-muted)] text-[var(--text-secondary)] select-none leading-none tracking-tight">
              {method}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);

/**
 * LiveVoiceShowcase
 * Animates the spoken phrase word-by-word ("Mat" -> "Mat 378 kr" -> "Mat 378 kr Coop")
 * and smoothly reveals the resulting Coop transaction row below it.
 */
const LiveVoiceShowcase = ({ isEn }: { isEn: boolean }) => {
  const prefersReducedMotion = useReducedMotion();
  const words = isEn ? ['Groceries', '425 kr', 'ICA'] : ['Mat', '425 kr', 'ICA'];
  const [step, setStep] = useState(prefersReducedMotion ? 4 : 1);

  useEffect(() => {
    if (prefersReducedMotion) {
      setStep(4);
      return;
    }
    const durations = [700, 650, 750, 1100, 3200];
    const timer = window.setTimeout(() => {
      setStep((prev) => (prev + 1) % 5);
    }, durations[step]);
    return () => window.clearTimeout(timer);
  }, [step, prefersReducedMotion]);

  const visiblePhrase =
    step === 0
      ? isEn
        ? 'Listening...'
        : 'Lyssnar...'
      : words.slice(0, Math.min(step, 3)).join(' ');

  const isSaved = step >= 4;

  return (
    <div className="max-w-[440px] mx-auto w-full space-y-3 select-none pointer-events-none">
      {/* Voice Card */}
      <div className="rounded-card bg-[var(--surface-color)]/95 backdrop-blur-md shadow-subtle p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 max-w-[250px] mx-auto text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-landing-sky-soft flex items-center justify-center text-[var(--text-primary)]">
              <ArrowDownLeft size={17} strokeWidth={1.9} />
            </div>
            <span className="text-secondary font-medium text-[var(--text-primary)]">
              {isEn ? 'Expense' : 'Utgift'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-landing-sky-soft flex items-center justify-center text-[var(--text-primary)]">
              <ArrowUpRight size={17} strokeWidth={1.9} />
            </div>
            <span className="text-secondary font-medium text-[var(--text-primary)]">
              {isEn ? 'Income' : 'Inkomst'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-landing-sky-soft flex items-center justify-center text-[var(--text-primary)]">
              <Camera size={17} strokeWidth={1.9} />
            </div>
            <span className="text-secondary font-medium text-[var(--text-primary)]">
              {isEn ? 'Receipt' : 'Kvitto'}
            </span>
          </div>
        </div>

        {/* Live Voice Input Bar */}
        <div className="voice-bar-surface rounded-card-nested p-2.5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="voice-mic-box w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative">
              <Mic size={16} strokeWidth={2} />
              {!isSaved && !prefersReducedMotion && (
                <span className="w-2 h-2 rounded-full bg-[var(--danger-color)] absolute -top-0.5 -right-0.5 animate-pulse" />
              )}
            </div>
            <span
              className={`text-body-medium font-medium truncate transition-opacity duration-200 ${
                step === 0 ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {visiblePhrase}
            </span>
          </div>

          <div className="voice-stop-btn w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
            {isSaved ? (
              <Check size={15} strokeWidth={2.5} className="text-white" />
            ) : (
              <div className="w-2.5 h-2.5 border-[1.75px] border-white rounded-xs" />
            )}
          </div>
        </div>
      </div>

      {/* Resulting App-Identical Transaction Card */}
      <motion.div
        animate={
          prefersReducedMotion
            ? { opacity: 1, y: 0, scale: 1 }
            : {
                opacity: step >= 3 ? 1 : 0.45,
                y: step >= 3 ? 0 : 4,
                scale: step >= 4 ? 1 : 0.985,
              }
        }
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <AppIdenticalTransactionRow
          id="voice-ica-preview"
          merchant="ICA"
          category={isEn ? 'Groceries' : 'Mat & dagligvaror'}
          icon="shopping-basket"
          amount="425"
          time={isEn ? 'Today, 14 Oct' : 'Idag, 14 okt.'}
          method={isEn ? 'Voice' : 'Röst'}
        />
      </motion.div>
    </div>
  );
};

/**
 * InteractiveTimelineShowcase
 * Lets the visitor tap any day (11–16 Oct) inside the dark Bento card
 * to experience how the daily timeline works in the real app.
 */
const InteractiveTimelineShowcase = ({ isEn }: { isEn: boolean }) => {
  const [selectedDay, setSelectedDay] = useState<string>('14');

  const daysData: {
    num: string;
    dayLabel: string;
    tx: AppIdenticalTransactionProps;
  }[] = [
    {
      num: '11',
      dayLabel: isEn ? 'sun' : 'sön',
      tx: {
        id: 'tl-11',
        merchant: 'Willys',
        category: isEn ? 'Groceries' : 'Mat & dagligvaror',
        icon: 'shopping-basket',
        amount: '685',
        time: '17:40',
        method: isEn ? 'Receipt' : 'Kvitto',
      },
    },
    {
      num: '12',
      dayLabel: isEn ? 'mon' : 'mån',
      tx: {
        id: 'tl-12',
        merchant: 'Circle K',
        category: 'Transport',
        icon: 'car',
        amount: '480',
        time: '14:15',
        method: isEn ? 'Card' : 'Kort',
      },
    },
    {
      num: '13',
      dayLabel: isEn ? 'tue' : 'tis',
      tx: {
        id: 'tl-13',
        merchant: 'Apoteket',
        category: isEn ? 'Health & Fitness' : 'Hälsa & Träning',
        icon: 'heart',
        amount: '195',
        time: '12:08',
        method: isEn ? 'Card' : 'Kort',
      },
    },
    {
      num: '14',
      dayLabel: isEn ? 'Today' : 'Idag',
      tx: {
        id: 'tl-14',
        merchant: 'ICA',
        category: isEn ? 'Groceries' : 'Mat & dagligvaror',
        icon: 'shopping-basket',
        amount: '425',
        time: '18:19',
        method: isEn ? 'Voice' : 'Röst',
      },
    },
    {
      num: '15',
      dayLabel: isEn ? 'thu' : 'tor',
      tx: {
        id: 'tl-15',
        merchant: 'Espresso House',
        category: isEn ? 'Restaurants & Café' : 'Uteliv & café',
        icon: 'coffee',
        amount: '78',
        time: '08:45',
        method: isEn ? 'Shortcut' : 'Snabbval',
      },
    },
    {
      num: '16',
      dayLabel: isEn ? 'fri' : 'fre',
      tx: {
        id: 'tl-16',
        merchant: 'SL',
        category: 'Transport',
        icon: 'car',
        amount: '42',
        time: '08:12',
        method: 'Swish',
      },
    },
  ];

  const activeEntry = daysData.find((d) => d.num === selectedDay) || daysData[3];

  return (
    <div className="max-w-[440px] mx-auto lg:ml-auto lg:mr-0 w-full space-y-3">
      <div className="grid grid-cols-6 gap-2" role="tablist" aria-label={isEn ? 'Choose day' : 'Välj dag'}>
        {daysData.map((d) => {
          const isActive = d.num === selectedDay;
          return (
            <button
              key={d.num}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedDay(d.num)}
              className={`h-[52px] sm:h-[56px] rounded-card-nested flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isActive
                  ? 'bg-landing-signature font-semibold text-[var(--text-primary)] shadow-xs scale-[1.03]'
                  : 'bg-white/10 hover:bg-white/15 text-white/75'
              }`}
            >
              <span
                className={`text-micro-label leading-none ${
                  isActive ? 'font-bold text-[var(--text-primary)]' : 'font-medium'
                }`}
              >
                {d.dayLabel}
              </span>
              <span
                className={`text-body-medium font-amount tabular-nums font-semibold leading-tight ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-white'
                }`}
              >
                {d.num}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeEntry.num}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <AppIdenticalTransactionRow {...activeEntry.tx} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

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
    <div className="border-b border-black/[0.06]">
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
            <div className="pb-6 pl-8 pr-6 landing-body-copy text-[var(--text-secondary)] max-w-[58ch]">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Two-Row Scroll-Driven App Transaction Strip
 */
const ScrollTransactionStrip = ({
  currentLanguage,
  tr,
}: {
  currentLanguage: Language;
  tr: (key: TranslationKey) => string;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const isEn = currentLanguage === 'en';

  const rawRow1X = useTransform(scrollY, [0, 3200], [-40, -780]);
  const rawRow2X = useTransform(scrollY, [0, 3200], [-740, 0]);
  const row1X = useSpring(rawRow1X, { stiffness: 90, damping: 26, mass: 0.35 });
  const row2X = useSpring(rawRow2X, { stiffness: 90, damping: 26, mass: 0.35 });

  const row1Cards: AppIdenticalTransactionProps[] = [
    {
      id: 'strip-r1-ica',
      merchant: 'ICA',
      category: isEn ? 'Groceries' : 'Mat & dagligvaror',
      icon: 'shopping-basket',
      amount: '425',
      time: isEn ? 'Today, 14 Oct' : 'Idag, 14 okt.',
      method: isEn ? 'Voice' : 'Röst',
    },
    {
      id: 'strip-r1-spotify',
      merchant: 'Spotify',
      category: 'Streaming',
      icon: 'tv',
      amount: '119',
      time: isEn ? 'The 25th' : 'Den 25:e',
      method: isEn ? 'Card' : 'Kort',
      isFixed: true,
    },
    {
      id: 'strip-r1-uber',
      merchant: 'Uber',
      category: 'Transport',
      icon: 'car',
      amount: '100',
      time: isEn ? '14 Oct' : '14 okt.',
      method: isEn ? 'Card' : 'Kort',
    },
    {
      id: 'strip-r1-vattenfall',
      merchant: 'Vattenfall',
      category: isEn ? 'Housing' : 'Boende & hushåll',
      icon: 'home',
      amount: '640',
      time: isEn ? 'The 28th' : 'Den 28:e',
      method: isEn ? 'Invoice' : 'Faktura',
      isFixed: true,
      isVariable: true,
    },
    {
      id: 'strip-r1-espresso',
      merchant: 'Espresso House',
      category: isEn ? 'Restaurants & Café' : 'Uteliv & café',
      icon: 'coffee',
      amount: '78',
      time: isEn ? '15 Oct' : '15 okt.',
      method: isEn ? 'Shortcut' : 'Snabbval',
    },
    {
      id: 'strip-r1-willys',
      merchant: 'Willys',
      category: isEn ? 'Groceries' : 'Mat & dagligvaror',
      icon: 'shopping-basket',
      amount: '685',
      time: isEn ? '11 Oct' : '11 okt.',
      method: isEn ? 'Receipt' : 'Kvitto',
    },
  ];

  const row2Cards: AppIdenticalTransactionProps[] = [
    {
      id: 'strip-r2-sbab',
      merchant: 'SBAB',
      category: isEn ? 'Housing' : 'Boende & hushåll',
      icon: 'home',
      amount: '7 200',
      time: isEn ? 'The 27th' : 'Den 27:e',
      method: 'Autogiro',
      isFixed: true,
    },
    {
      id: 'strip-r2-apoteket',
      merchant: 'Apoteket',
      category: isEn ? 'Health & Fitness' : 'Hälsa & Träning',
      icon: 'heart',
      amount: '195',
      time: isEn ? '13 Oct' : '13 okt.',
      method: isEn ? 'Card' : 'Kort',
    },
    {
      id: 'strip-r2-netflix',
      merchant: 'Netflix',
      category: 'Streaming',
      icon: 'tv',
      amount: '149',
      time: isEn ? 'The 26th' : 'Den 26:e',
      method: isEn ? 'Card' : 'Kort',
      isFixed: true,
    },
    {
      id: 'strip-r2-circlek',
      merchant: 'Circle K',
      category: 'Transport',
      icon: 'car',
      amount: '480',
      time: isEn ? '12 Oct' : '12 okt.',
      method: isEn ? 'Card' : 'Kort',
    },
    {
      id: 'strip-r2-telia',
      merchant: 'Telia',
      category: isEn ? 'Subscriptions' : 'Abonnemang',
      icon: 'smartphone',
      amount: '399',
      time: isEn ? 'The 27th' : 'Den 27:e',
      method: 'Autogiro',
      isFixed: true,
    },
    {
      id: 'strip-r2-sl',
      merchant: 'SL',
      category: 'Transport',
      icon: 'car',
      amount: '42',
      time: isEn ? '16 Oct' : '16 okt.',
      method: 'Swish',
    },
  ];

  const repeatedRow1 = [...row1Cards, ...row1Cards, ...row1Cards];
  const repeatedRow2 = [...row2Cards, ...row2Cards, ...row2Cards];

  return (
    <section
      aria-label={tr('landing_tx_strip_label')}
      className="py-8 sm:py-10 bg-landing-sky-soft overflow-x-clip"
    >
      <div className="space-y-3.5 py-2">
        {/* Row 1: Moves left as user scrolls down */}
        <motion.div
          style={{ x: prefersReducedMotion ? 0 : row1X }}
          className="flex items-center gap-3.5 w-max px-4 py-1.5 will-change-transform"
        >
          {repeatedRow1.map((item, idx) => (
            <div key={`r1-${idx}`} className="w-[345px] sm:w-[380px] shrink-0">
              <AppIdenticalTransactionRow
                {...item}
                id={`r1-${idx}-${item.id}`}
              />
            </div>
          ))}
        </motion.div>

        {/* Row 2: Moves right as user scrolls down */}
        <motion.div
          style={{ x: prefersReducedMotion ? 0 : row2X }}
          className="flex items-center gap-3.5 w-max px-4 py-1.5 will-change-transform"
        >
          {repeatedRow2.map((item, idx) => (
            <div key={`r2-${idx}`} className="w-[345px] sm:w-[380px] shrink-0">
              <AppIdenticalTransactionRow
                {...item}
                id={`r2-${idx}-${item.id}`}
              />
            </div>
          ))}
        </motion.div>
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
  const prefersReducedMotion = useReducedMotion();

  // Global scroll for Hero multi-plane parallax
  const { scrollY } = useScroll();
  const rawHeroPhoneY = useTransform(scrollY, [0, 700], [0, -34]);
  const rawHeroBackdropY = useTransform(scrollY, [0, 700], [0, 20]);
  const heroPhoneY = useSpring(rawHeroPhoneY, { stiffness: 100, damping: 28, mass: 0.35 });
  const heroBackdropY = useSpring(rawHeroBackdropY, { stiffness: 100, damping: 28, mass: 0.35 });

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
      const scrollYPos = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYPos}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollYPos);
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
        initial: { opacity: 0.01, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-50px' },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="min-h-dvh bg-[var(--surface-color)] text-[var(--text-primary)] font-sans antialiased overflow-x-clip relative">

      {/* =====================================================================
          NAVIGATION HEADER
      ===================================================================== */}
      <header className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-all duration-300 ${
        isMobileMenuOpen 
          ? 'opacity-0 pointer-events-none' 
          : isScrolled
          ? 'bg-[var(--surface-color)]/95 backdrop-blur-xl shadow-xs'
          : 'bg-landing-sky-soft'
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
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_nav_how_it_works')}
            </a>

            <a
              href="#features"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_footer_features')}
            </a>

            <a
              href="#faq"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_faq_title')}
            </a>

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
                className="inline-flex items-center gap-1.5 px-3 h-8 sm:h-9 rounded-full text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] shadow-xs transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)] border-none"
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
            className="fixed top-0 left-0 right-0 z-[9995] bg-[var(--surface-color)] shadow-modal rounded-b-2xl pt-[env(safe-area-inset-top,0px)] animate-in slide-in-from-top-2 duration-200"
          >
            <div className="landing-container h-16 flex items-center justify-between">
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

            <div className="landing-container pt-2 pb-5 space-y-1 text-left">
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

              <div className="pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsMobileLangOpen(false);
                    onGetStarted();
                  }}
                  className="w-full justify-center text-center text-sm font-semibold h-12"
                >
                  {tr('landing_nav_get_started')}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <main>
        {/* =====================================================================
            1. HERO SECTION
        ===================================================================== */}
        <section className="relative pt-6 sm:pt-10 lg:pt-14 pb-8 sm:pb-12 bg-landing-sky-soft">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column (6 cols) */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0.01, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6"
            >
              <div className="space-y-4 max-w-[34rem]">
                <h1 className="text-[2.2rem] sm:text-5xl lg:text-[3.55rem] font-extrabold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.06] text-balance">
                  {tr('landing_hero_title')}
                </h1>

                <p className="landing-body-copy text-[var(--text-secondary)] max-w-[46ch] mx-auto lg:mx-0 font-normal text-pretty">
                  {tr('landing_hero_subtitle')}
                </p>
              </div>

              {/* Registration CTAs */}
              <div className="w-full max-w-sm sm:max-w-none mx-auto lg:mx-0 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onGetStarted}
                    className="w-full sm:w-auto justify-center text-center font-semibold text-sm px-7 h-12 whitespace-nowrap"
                  >
                    {tr('landing_hero_button')}
                  </Button>

                  {onGoogleLogin && (
                    <button
                      type="button"
                      onClick={onGoogleLogin}
                      className="w-full sm:w-auto inline-flex items-center justify-center text-center gap-2.5 text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] px-6 h-12 rounded-full shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)] border-none"
                    >
                      <GoogleGLogo size={17} />
                      <span>{tr('landing_hero_google')}</span>
                    </button>
                  )}

                  {onStartDemo && (
                    <button
                      type="button"
                      onClick={onStartDemo}
                      className="w-full sm:w-auto inline-flex items-center justify-center text-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4 px-3 h-10 sm:h-12 rounded-full transition-colors cursor-pointer border-none bg-transparent whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
                    >
                      {tr('landing_hero_demo')}
                    </button>
                  )}
                </div>

                <p className="text-xs font-medium text-[var(--text-tertiary)] pt-0.5">
                  {tr('landing_no_bank_needed')}
                </p>
              </div>
            </motion.div>

            {/* Right Column (6 cols): Frilagda telefoner med mjuk signaturblå cirkel bakom */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                style={prefersReducedMotion ? undefined : { y: heroBackdropY }}
                className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full bg-landing-signature/45 blur-2xl absolute pointer-events-none will-change-transform"
              />
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0.01, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={prefersReducedMotion ? undefined : { y: heroPhoneY }}
                className="relative z-10 w-full flex items-center justify-center will-change-transform"
              >
                <PhoneScreenshotFrame
                  label="Screenshot: Hem – kvar att spendera och aktuell löneperiod"
                  src={screenshots.heroHome}
                  alt="Dejz hemvy som visar kvar att spendera och aktuell löneperiod"
                  perspectiveTilt={true}
                  isPreframedMockup={true}
                />
              </motion.div>
            </div>

          </div>
        </section>

        {/* =====================================================================
            2. TVÅ RADER TRANSAKTIONER (rör sig vid scroll med mjuk fjäderfysik)
        ===================================================================== */}
        <ScrollTransactionStrip currentLanguage={currentLanguage} tr={tr} />

        {/* =====================================================================
            3. INTRODUKTION + TRE STEG
        ===================================================================== */}
        <section
          id="how-it-works"
          className="py-16 sm:py-22 bg-[var(--surface-color)] scroll-mt-20"
        >
          <div className="landing-container space-y-10 text-left">
            <motion.div {...revealMotion} className="max-w-xl space-y-2.5">
              <h2 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                {tr('landing_how_title')}
              </h2>
              <p className="landing-body-copy text-[var(--text-secondary)] text-pretty">
                {tr('landing_how_subtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
              {[
                {
                  num: '1',
                  title: tr('landing_step1_title'),
                  desc: tr('landing_step1_desc'),
                },
                {
                  num: '2',
                  title: tr('landing_step2_title'),
                  desc: tr('landing_step2_desc'),
                },
                {
                  num: '3',
                  title: tr('landing_step3_title'),
                  desc: tr('landing_step3_desc'),
                },
              ].map((step, idx) => (
                <motion.div
                  key={step.num}
                  initial={prefersReducedMotion ? false : { opacity: 0.01, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-4"
                >
                  <span className="w-8 h-8 rounded-full bg-landing-signature text-[var(--text-primary)] text-xs font-extrabold font-amount tabular-nums flex items-center justify-center shrink-0 mt-0.5">
                    {step.num}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      {step.title}
                    </h3>
                    <p className="landing-body-copy text-[var(--text-secondary)]">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. SMIDIG REGISTRERING
               Ny rytm: Levande röst-animation (ord för ord -> Coop-kort) som
               svävar i förgrunden framför miljöbilden (dejz_01.png) till höger.
        ===================================================================== */}
        <section id="features" className="py-14 sm:py-24 bg-[var(--surface-color)] scroll-mt-20">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column (5 cols): Fokuserad copy + 3 snabba sätt att registrera */}
            <motion.div {...revealMotion} className="lg:col-span-5 space-y-6 text-left">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] max-w-[18ch] text-balance">
                  {tr('landing_voice_title')}
                </h2>
                <p className="landing-body-copy text-[var(--text-secondary)] max-w-[44ch] text-pretty">
                  {tr('landing_voice_desc')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { icon: <Mic size={14} strokeWidth={2.2} />, label: tr('landing_voice_pill_voice') },
                  { icon: <Camera size={14} strokeWidth={2.2} />, label: tr('landing_voice_pill_receipt') },
                  { icon: <Zap size={14} strokeWidth={2.2} />, label: tr('landing_voice_pill_quick') },
                ].map((pill) => (
                  <span
                    key={pill.label}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-landing-sky-soft text-xs font-semibold text-[var(--text-primary)]"
                  >
                    {pill.icon}
                    <span>{pill.label}</span>
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right Column (7 cols): Miljöbild som fond + Levande röstkort som överlappar lagom utan att täcka bilden */}
            <div className="lg:col-span-7 relative">
              <ParallaxLayer offset={6}>
                <ParallaxPhotoFrame
                  src={screenshots.lifestyleGrocery || '/dejz_01.png'}
                  alt={isEn ? 'Logging a grocery purchase on the go' : 'Registrera matinköp i vardagen'}
                  aspectClass="aspect-[16/9]"
                />
              </ParallaxLayer>

              <ParallaxLayer offset={-8} className="-mt-6 sm:-mt-8 relative z-10 px-2 sm:px-6">
                <LiveVoiceShowcase isEn={isEn} />
              </ParallaxLayer>
            </div>

          </div>
        </section>

        {/* =====================================================================
            5. BUDGET & FASTA UTGIFTER
               Korten ligger direkt mot den ljusblå sektionen utan extra modulram.
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-landing-sky-soft">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column (6 cols): Korten ligger direkt mot sektionen med kaskad-parallax */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <ParallaxLayer offset={-20}>
                <div className="max-w-[440px] mx-auto w-full space-y-2.5 py-2 text-left select-none pointer-events-none">
                  {/* Totala fasta utgifter Card */}
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0.01, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-card bg-[var(--surface-color)] p-4 shadow-subtle flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-card-title text-[var(--text-secondary)] truncate">
                        {isEn ? 'Total fixed expenses' : 'Totala fasta utgifter'}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-large-amount font-bold font-amount tabular-nums text-[var(--text-primary)]">
                          −11 379
                        </span>
                        <span className="text-secondary text-[var(--text-secondary)]">
                          kr<span className="text-micro-label opacity-75">/mån</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-micro-label font-medium text-[var(--text-tertiary)]">
                        {isEn ? 'Pay period' : 'Löneperiod'}
                      </p>
                      <p className="text-body-medium font-semibold font-amount tabular-nums text-[var(--text-primary)] mt-0.5">
                        24 sep – 22 okt
                      </p>
                    </div>
                  </motion.div>

                  {/* Fixed Expense Rows med stegvis kaskad-effekt */}
                  <div className="space-y-2.5 pt-0.5">
                    {[
                      {
                        id: 'fe-sbab',
                        merchant: 'SBAB',
                        category: isEn ? 'Housing' : 'Boende & hushåll',
                        icon: 'home',
                        amount: '7 200',
                        time: isEn ? 'The 27th' : 'Den 27:e',
                        method: 'Autogiro',
                        isFixed: true,
                        isVariable: false,
                      },
                      {
                        id: 'fe-vattenfall',
                        merchant: 'Vattenfall',
                        category: isEn ? 'Housing' : 'Boende & hushåll',
                        icon: 'home',
                        amount: '640',
                        time: isEn ? 'The 28th' : 'Den 28:e',
                        method: isEn ? 'Invoice' : 'Faktura',
                        isFixed: true,
                        isVariable: true,
                      },
                      {
                        id: 'fe-telia',
                        merchant: 'Telia',
                        category: isEn ? 'Subscriptions' : 'Abonnemang',
                        icon: 'smartphone',
                        amount: '399',
                        time: isEn ? 'The 27th' : 'Den 27:e',
                        method: 'Autogiro',
                        isFixed: true,
                        isVariable: false,
                      },
                      {
                        id: 'fe-spotify',
                        merchant: 'Spotify',
                        category: 'Streaming',
                        icon: 'tv',
                        amount: '119',
                        time: isEn ? 'The 25th' : 'Den 25:e',
                        method: isEn ? 'Card' : 'Kort',
                        isFixed: true,
                        isVariable: false,
                      },
                    ].map((fe, idx) => (
                      <motion.div
                        key={fe.id}
                        initial={prefersReducedMotion ? false : { opacity: 0.01, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{
                          duration: 0.45,
                          delay: 0.06 * (idx + 1),
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <AppIdenticalTransactionRow {...fe} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </ParallaxLayer>
            </div>

            {/* Right Column (6 cols): Ren, luftig text och två tydliga punkter som balanserar de 5 utgiftskorten */}
            <motion.div {...revealMotion} className="lg:col-span-6 order-1 lg:order-2 text-left space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] max-w-[18ch] text-balance">
                  {tr('landing_fixed_title')}
                </h2>

                <p className="landing-body-copy text-[var(--text-secondary)] max-w-[46ch] font-normal text-pretty">
                  {tr('landing_fixed_desc')}
                </p>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 landing-body-copy font-medium text-[var(--text-primary)]">
                  <span className="w-6 h-6 rounded-full bg-landing-signature text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={2.6} />
                  </span>
                  <span>{tr('landing_fixed_pill_intervals')}</span>
                </li>
                <li className="flex items-center gap-3 landing-body-copy font-medium text-[var(--text-primary)]">
                  <span className="w-6 h-6 rounded-full bg-landing-signature text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={2.6} />
                  </span>
                  <span>{tr('landing_fixed_pill_variable')}</span>
                </li>
              </ul>
            </motion.div>

          </div>
        </section>

        {/* =====================================================================
            6. ÖVERBLICK
               Bento-kort + Interaktiv tidslinje där besökaren kan klicka på dagarna (11–16 okt).
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-[var(--surface-color)]">
          <div className="landing-container space-y-8 sm:space-y-10 text-left">
            <motion.div {...revealMotion} className="max-w-xl space-y-2.5">
              <h2 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                {tr('landing_daily_title')}
              </h2>
              <p className="landing-body-copy text-[var(--text-secondary)] text-pretty">
                {tr('landing_daily_desc')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Card 1 (6 cols): Kvar att spendera */}
              <ParallaxLayer offset={-16} className="lg:col-span-6 flex">
                <motion.div
                  {...revealMotion}
                  className="w-full rounded-modal bg-landing-signature p-6 sm:p-8 flex flex-col justify-between gap-6 select-none pointer-events-none"
                >
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                      {tr('landing_daily_item1_title')}
                    </h3>
                    <p className="landing-body-copy text-[var(--text-primary)]/85">
                      {tr('landing_daily_item1_desc')}
                    </p>
                  </div>

                  <ParallaxLayer offset={-8} className="max-w-[440px] mx-auto w-full space-y-2.5 py-0.5">
                    <div className="rounded-card bg-[var(--surface-color)] shadow-subtle p-4 sm:p-5 space-y-3">
                      <span className="text-card-title sm:text-body font-medium text-[var(--text-secondary)] block">
                        {isEn ? 'Remaining to spend' : 'Kvar att spendera'}
                      </span>

                      <div className="flex items-baseline gap-1.5 py-0.5">
                        <span className="text-hero-amount font-bold font-amount tabular-nums tracking-tight leading-none text-[var(--text-primary)]">
                          23 536
                        </span>
                        <span className="text-[14px] leading-none font-medium text-[var(--text-secondary)]">
                          kr
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between text-micro-label font-medium text-[var(--text-secondary)]">
                          <span>{isEn ? 'Remaining spendable' : 'Spenderbart kvar'}</span>
                          <span className="font-amount tabular-nums font-bold text-[var(--text-primary)]">
                            72 % {isEn ? 'left' : 'kvar'}
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-black/[0.07] overflow-hidden">
                          <motion.div
                            initial={prefersReducedMotion ? { width: '72%' } : { width: '0%' }}
                            whileInView={{ width: '72%' }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-[var(--text-primary)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-card bg-[var(--surface-color)] shadow-subtle p-3 sm:p-3.5 min-w-0">
                        <p className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
                          {isEn ? 'Current period' : 'Aktuell period'}
                        </p>
                        <p className="text-body-medium font-medium text-[var(--text-primary)] truncate mt-0.5">
                          24 sep – 22 okt
                        </p>
                      </div>
                      <div className="rounded-card bg-[var(--surface-color)] shadow-subtle p-3 sm:p-3.5 min-w-0">
                        <p className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
                          {isEn ? 'Next payday' : 'Nästa lön'}
                        </p>
                        <p className="text-body-medium font-medium font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                          19 {isEn ? 'days left' : 'dagar kvar'}
                        </p>
                      </div>
                    </div>
                  </ParallaxLayer>
                </motion.div>
              </ParallaxLayer>

              {/* Card 2 (6 cols): Kategoribudgetar */}
              <ParallaxLayer offset={18} className="lg:col-span-6 flex">
                <motion.div
                  {...revealMotion}
                  className="w-full rounded-modal bg-landing-sky-soft p-6 sm:p-8 flex flex-col justify-between gap-6 select-none pointer-events-none"
                >
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                      {tr('landing_daily_item2_title')}
                    </h3>
                    <p className="landing-body-copy text-[var(--text-secondary)]">
                      {tr('landing_daily_item2_desc')}
                    </p>
                  </div>

                  <ParallaxLayer offset={-8} className="max-w-[440px] mx-auto w-full my-auto">
                    <div className="flex gap-2.5 overflow-x-auto py-2 px-1 -mx-1 no-scrollbar">
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
                          initial={prefersReducedMotion ? false : { opacity: 0.01, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: '-30px' }}
                          transition={{
                            duration: 0.45,
                            delay: 0.08 * idx,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="flex-shrink-0 min-w-[138px] sm:min-w-[146px] flex-1 p-3.5 rounded-card bg-[var(--surface-color)] shadow-subtle flex flex-col justify-between gap-2.5 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <CategoryIcon
                              icon={cat.icon}
                              categoryName={cat.name}
                              size="sm"
                            />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <span className="text-card-title text-[var(--text-primary)] whitespace-nowrap block mb-0.5">
                              {cat.name}
                            </span>
                            <span className="text-list-amount font-amount tabular-nums block text-[var(--text-primary)]">
                              {cat.amount}
                              <span className="text-[11.5px] font-normal text-[var(--text-secondary)] ml-1">
                                kr
                              </span>
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ParallaxLayer>
                </motion.div>
              </ParallaxLayer>

              {/* Card 3 (12 cols): Interaktiv Tidslinje dag för dag */}
              <motion.div
                {...revealMotion}
                className="lg:col-span-12 rounded-modal bg-landing-contrast-dark p-6 sm:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-2 text-white">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {tr('landing_daily_item3_title')}
                  </h3>
                  <p className="landing-body-copy text-white/80">
                    {tr('landing_daily_item3_desc')}
                  </p>
                </div>

                {/* Interaktiv 6-dagars tidslinje (klicka på valfri dag 11–16) */}
                <ParallaxLayer offset={-12} className="lg:col-span-7">
                  <InteractiveTimelineShowcase isEn={isEn} />
                </ParallaxLayer>
              </motion.div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            7. ANALYS
               Rubrik: ”Förstå vart pengarna tar vägen.”
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-landing-sky-soft">
          <div className="landing-container space-y-8 sm:space-y-10 text-left">
            <motion.div {...revealMotion} className="max-w-xl space-y-2.5">
              <h2 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] text-balance">
                {tr('landing_analysis_title')}
              </h2>
              <p className="landing-body-copy text-[var(--text-secondary)] text-pretty">
                {tr('landing_analysis_desc')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
              {/* Left Column (6 cols): Cirkeldiagram i samma höjd som kategorilistan på desktop */}
              <ParallaxLayer offset={-12} className="lg:col-span-6 flex">
                <motion.div {...revealMotion} className="max-w-[440px] mx-auto w-full flex">
                  <div className="w-full rounded-modal bg-[var(--surface-color)] shadow-subtle p-6 flex flex-col justify-between gap-5 select-none pointer-events-none">
                    <div className="flex-1 flex items-center justify-center py-1">
                      <motion.div
                        initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0.01 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-[196px] h-[196px] sm:w-[212px] sm:h-[212px] flex items-center justify-center"
                      >
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

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                          <span className="text-metric-label font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                            {isEn ? 'Variable expenses' : 'Rörliga utgifter'}
                          </span>
                          <span className="text-large-amount font-bold font-amount tabular-nums tracking-tight text-[var(--text-primary)] mt-0.5">
                            11 105
                            <span className="text-secondary font-normal opacity-80 ml-1">
                              kr
                            </span>
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-black/[0.05]">
                      <div className="rounded-card-nested bg-landing-sky-soft p-3 text-left">
                        <p className="text-metric-label font-medium text-[var(--text-secondary)]">
                          {isEn ? 'Largest share' : 'Största post'}
                        </p>
                        <p className="text-body-medium font-semibold text-[var(--text-primary)] truncate mt-0.5">
                          {isEn ? 'Groceries (52 %)' : 'Mat & Dagligvaror (52 %)'}
                        </p>
                      </div>
                      <div className="rounded-card-nested bg-landing-sky-soft p-3 text-left">
                        <p className="text-metric-label font-medium text-[var(--text-secondary)]">
                          {isEn ? 'Category budgets' : 'Kategoribudget'}
                        </p>
                        <p className="text-body-medium font-semibold font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                          895 kr {isEn ? 'left' : 'kvar'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </ParallaxLayer>

              {/* Right Column (6 cols): Kategorirader i samma höjd */}
              <ParallaxLayer offset={12} className="lg:col-span-6 flex">
                <motion.div {...revealMotion} className="max-w-[440px] mx-auto w-full flex select-none pointer-events-none">
                  <div className="w-full rounded-modal bg-[var(--surface-color)] shadow-subtle overflow-hidden divide-y divide-black/[0.05] flex flex-col justify-between">
                    {/* Row 1: Mat & Dagligvaror */}
                    <div className="p-4 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CategoryIcon
                          icon="shopping-basket"
                          categoryName="Mat & Dagligvaror"
                          size="sm"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-body-medium font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-primary)]">
                            {isEn ? 'Groceries' : 'Mat & Dagligvaror'}
                          </p>
                          <p className="text-secondary leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-tertiary)]">
                            184 kr {isEn ? 'left of budget' : 'kvar av budget'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center shrink-0 pl-2">
                        <p className="text-list-amount text-[var(--text-primary)] font-semibold leading-tight tabular-nums">
                          5 816
                          <span className="text-secondary font-normal opacity-80 ml-1">
                            kr
                          </span>
                        </p>
                        <span className="text-secondary text-[var(--text-tertiary)] tabular-nums mt-0.5 leading-tight font-normal">
                          52 %
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Hälsa & Träning */}
                    <div className="p-4 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CategoryIcon
                          icon="heart"
                          categoryName="Hälsa & Träning"
                          size="sm"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-body-medium font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-primary)]">
                            {isEn ? 'Health & Fitness' : 'Hälsa & Träning'}
                          </p>
                          <p className="text-secondary leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-tertiary)]">
                            646 kr {isEn ? 'left of budget' : 'kvar av budget'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center shrink-0 pl-2">
                        <p className="text-list-amount text-[var(--text-primary)] font-semibold leading-tight tabular-nums">
                          1 854
                          <span className="text-secondary font-normal opacity-80 ml-1">
                            kr
                          </span>
                        </p>
                        <span className="text-secondary text-[var(--text-tertiary)] tabular-nums mt-0.5 leading-tight font-normal">
                          17 %
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Transport (Expanded with Parkster) */}
                    <div>
                      <div className="p-4 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <CategoryIcon
                            icon="car"
                            categoryName="Transport"
                            size="sm"
                          />
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <p className="text-body-medium font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-primary)]">
                              Transport
                            </p>
                            <p className="text-secondary font-medium text-[var(--danger-color)] leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                              451 kr {isEn ? 'over budget' : 'över budget'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center shrink-0 pl-2">
                          <p className="text-list-amount text-[var(--text-primary)] font-semibold leading-tight tabular-nums">
                            1 651
                            <span className="text-secondary font-normal opacity-80 ml-1">
                              kr
                            </span>
                          </p>
                          <span className="text-secondary text-[var(--text-tertiary)] tabular-nums mt-0.5 leading-tight font-normal">
                            15 %
                          </span>
                        </div>
                      </div>

                      <div className="bg-[var(--card-nested-bg)] p-3">
                        <AppIdenticalTransactionRow
                          id="analysis-uber"
                          merchant="Uber"
                          category="Transport"
                          icon="car"
                          amount="100"
                          time={isEn ? '14 Oct' : '14 okt.'}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </ParallaxLayer>
            </div>
          </div>
        </section>

        {/* =====================================================================
            8. KONTROLL
               Rubrik: ”Du har sista ordet om din budget.”
               Ny rytm: Uber-kortet svävar i förgrunden över miljöbilden (dejz_03.png).
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-[var(--surface-color)]">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center text-left">
            
            {/* Left Column (5 cols): Korta punkter */}
            <motion.div {...revealMotion} className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.08] max-w-[18ch] text-balance">
                  {tr('landing_control_title')}
                </h2>
                <p className="landing-body-copy text-[var(--text-secondary)] max-w-[44ch] text-pretty">
                  {tr('landing_control_desc')}
                </p>
              </div>

              <div className="space-y-4 pt-1">
                {[
                  {
                    title: tr('landing_control_item1_title'),
                    desc: tr('landing_control_item1_desc'),
                  },
                  {
                    title: tr('landing_control_item2_title'),
                    desc: tr('landing_control_item2_desc'),
                  },
                  {
                    title: tr('landing_control_item3_title'),
                    desc: tr('landing_control_item3_desc'),
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3.5">
                    <span className="w-6 h-6 rounded-full bg-landing-signature text-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} strokeWidth={2.6} />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {item.title}
                      </h3>
                      <p className="landing-body-copy text-[var(--text-secondary)]">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Column (7 cols): Fotografiet som fond med Uber-kortet lagom överlappande i nedkant */}
            <div className="lg:col-span-7 relative">
              <ParallaxLayer offset={6}>
                <ParallaxPhotoFrame
                  src={screenshots.lifestyleControl || '/dejz_03.png'}
                  alt={isEn ? 'Personal control over your budget without bank connection' : 'Personlig kontroll över din budget utan bankkoppling'}
                  aspectClass="aspect-[16/9]"
                />
              </ParallaxLayer>

              <ParallaxLayer offset={-8} className="-mt-6 sm:-mt-8 relative z-10 px-3 sm:px-8">
                <motion.div
                  {...revealMotion}
                  className="max-w-[420px] mx-auto w-full rounded-card bg-[var(--surface-color)]/95 backdrop-blur-md shadow-subtle p-4 sm:p-5 space-y-3 select-none pointer-events-none"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <TransactionLogo
                        size="md"
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
                        <p className="text-micro-label font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          {isEn ? 'MERCHANT' : 'MOTTAGARE'}
                        </p>
                        <p className="text-body-medium font-semibold text-[var(--text-primary)] leading-snug mt-0.5">
                          Uber
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-micro-label font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        {isEn ? 'AMOUNT' : 'BELOPP'}
                      </p>
                      <div className="flex items-baseline justify-end gap-1 mt-0.5">
                        <span className="text-large-amount font-bold font-amount tabular-nums leading-none text-[var(--text-primary)]">
                          100
                        </span>
                        <span className="text-secondary font-medium text-[var(--text-secondary)]">
                          kr
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-black/[0.05] flex items-center justify-between gap-2 text-secondary text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <CategoryIcon icon="car" categoryName="Transport" variant="minimal" size="2xs" />
                      <span>Transport</span>
                    </span>
                    <span className="font-medium tabular-nums">{isEn ? '14 Oct' : '14 okt.'}</span>
                  </div>
                </motion.div>
              </ParallaxLayer>
            </div>

          </div>
        </section>

        {/* =====================================================================
            9. PERSONLIG GRUNDARTEXT (Redaktionell, centrerad inramning före FAQ)
        ===================================================================== */}
        <section className="py-16 sm:py-22 bg-landing-sky-soft">
          <div className="landing-container">
            <motion.div
              {...revealMotion}
              className="max-w-2xl mx-auto text-center rounded-modal bg-[var(--surface-color)] shadow-subtle px-6 py-10 sm:px-12 sm:py-12 space-y-5"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-[2.2rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-[1.12] text-balance">
                {tr('landing_founder_title')}
              </h2>
              <p className="landing-body-copy text-[var(--text-secondary)] max-w-[50ch] mx-auto text-pretty">
                {tr('landing_founder_body')}
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <span className="w-8 h-8 rounded-full bg-landing-signature text-[var(--text-primary)] text-xs font-extrabold flex items-center justify-center shrink-0">
                  K
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  {tr('landing_founder_signature')}
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =====================================================================
            10. VANLIGA FRÅGOR (FAQ)
        ===================================================================== */}
        <section id="faq" className="py-16 sm:py-24 bg-[var(--surface-color)] scroll-mt-20">
          <div className="landing-container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start text-left">
            
            <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-2.5">
              <h2 className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-tight text-balance">
                {tr('landing_faq_title')}
              </h2>
              <p className="landing-body-copy text-[var(--text-secondary)] max-w-sm">
                {tr('landing_faq_subtitle')}
              </p>
            </div>

            <div className="lg:col-span-7">
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
            11. AVSLUTANDE CTA
        ===================================================================== */}
        <section className="py-16 sm:py-24 bg-landing-signature">
          <div className="landing-container text-center space-y-6">
            <h2 className="text-2xl sm:text-5xl font-extrabold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.06] max-w-2xl mx-auto text-balance">
              {tr('landing_cta_title')}
            </h2>

            <p className="landing-body-copy text-[var(--text-primary)]/85 max-w-lg mx-auto text-pretty">
              {tr('landing_cta_subtitle')}
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetStarted}
                className="w-full max-w-sm sm:w-auto font-semibold text-sm px-8 h-12 justify-center text-center"
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
          12. FOOTER
      ===================================================================== */}
      <footer className="py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] bg-[var(--surface-color)] text-sm text-[var(--text-secondary)]">
        <div className="landing-container flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2.5">
            <DejzLogo className="h-6 w-auto" />
            <span className="text-sm text-[var(--text-secondary)]">
              © {new Date().getFullYear()} Dejz. {tr('landing_footer_rights')}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => handlePolicyOpen('privacy')}
              className="min-h-11 px-3 inline-flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_footer_privacy')}
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('terms')}
              className="min-h-11 px-3 inline-flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
            >
              {tr('landing_footer_terms')}
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('privacy')}
              className="min-h-11 px-3 inline-flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
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
