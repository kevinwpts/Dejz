import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronDown, 
  Check, 
  Mic, 
  Smartphone, 
  Sparkles,
  CheckCircle2,
  Lock,
  RotateCcw,
  Menu,
  X,
  Image as ImageIcon,
  Users,
  User,
  Scissors,
  ArrowRight
} from 'lucide-react';
import { Language, TranslationKey, translations } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { DejzLogo } from './DejzLogo';
import { Button, Card, IconButton } from './ui';
import { LanguagePicker } from './LanguagePicker';
import { NORDIC_LANGUAGES } from '../utils/nordic';

export interface LandingPageScreenshots {
  heroHome?: string;             // Hero: Stor frilagd telefon-mockup (/mockup_01.png)
  lifestyleGrocery?: string;     // Miljöbild 1: Vardag & matinköp (/dejz_01.png)
  lifestyleHome?: string;        // Miljöbild 2: Hem & fasta kostnader (/dejz_02.png)
  lifestyleSavings?: string;     // Miljöbild 3 (valfri): Vardagskoll & period
  lifestyleControl?: string;     // Miljöbild 4: Kontroll utan bankkoppling (/dejz_03.png)

  // Photoshop-urklipp / App-detaljer (lägg in i public/ och ange sökvägen nedan när du är klar)
  voiceInput?: string;           // Urklipp 1: Snabbutgift med mikrofon / Rösttolkat köp (t.ex. /crop_voice_card.png)
  snippetQuickActions?: string;  // Urklipp 2: Plus-menyn (Utgift, Inkomst, Kvitto) eller Kategoriuppdelning (t.ex. /crop_plus_menu.png)
  economy?: string;              // Urklipp 3: Lista med fasta utgifter & intervall under Ekonomi (t.ex. /crop_fixed_list.png)
  snippetPayPeriod?: string;     // Urklipp 4: Översiktskortet under Ekonomi / Hur räknas det ut? (t.ex. /crop_pay_period.png)
  dailyAndSavings?: string;      // Urklipp 5: Kortet "Kvar att spendera" + Aktuell period & Nästa lön (t.ex. /crop_remaining_card.png)
  snippetPiggyBank?: string;     // Urklipp 6: Horisontella korten för "Kategoribudgetar" på hemskärmen (t.ex. /crop_category_cards.png)
  snippetCalendar?: string;      // Urklipp 7: Horisontella tidslinjen med dagar & dagens transaktioner (t.ex. /crop_timeline.png)
  analysis?: string;             // Urklipp 8: Analys – cirkeldiagrammet (donut-grafen) & mot förra perioden (t.ex. /crop_analysis_chart.png)
  snippetCategoryBars?: string;  // Urklipp 9: Kategorilistan i Analys med "kvar av budget" & procentandel (t.ex. /crop_category_list.png)
  snippetEditModal?: string;     // Urklipp 10: Redigera transaktion (belopp, kategori, datum, kvitto) (t.ex. /crop_edit_tx.png)
}

/**
 * Centralized screenshot & UI snippet configuration.
 * Ladda upp dina tillklippta Photoshop-bilder i `public/` och lägg in sökvägen här!
 */
export const SCREENSHOT_CONFIG: LandingPageScreenshots = {
  heroHome: '/mockup_01.png',
  lifestyleGrocery: '/dejz_01.png',
  lifestyleHome: '/dejz_02.png',
  lifestyleSavings: undefined,
  lifestyleControl: '/dejz_03.png',

  // --- PHOTOSHOP-URKLIPP PLACEHOLDERS (sätt t.ex. '/crop_01.png' när du laddat upp) ---
  voiceInput: '/intalat.png',     // Urklipp 1 (Sektion: Röst & Snabbutgift - nederkant på dejz_01.png)
  snippetQuickActions: '/lagga_till_transaktion.png', // Urklipp 2 (Sektion: Plus-menyn / Lägg till transaktion - överkant på dejz_01.png)
  economy: '/fasta_utgifter.jpg', // Urklipp 3 (Sektion: Fasta kostnader - lista med fasta utgifter)
  snippetPayPeriod: '/totalt_fasta.jpg', // Urklipp 4 (Sektion: Fasta kostnader - överlappande summeringskort)
  dailyAndSavings: '/kvar_att_spendera.jpg', // Urklipp 5 (Bento-kort 1: Kvar att spendera + Aktuell period & Nästa lön)
  snippetPiggyBank: '/kategoribudgetar.png', // Urklipp 6 (Bento-kort 2: Kategoribudgetar på hemskärmen)
  snippetCalendar: '/tidslinje.png', // Urklipp 7 (Bento-kort 3: Tidslinjen dag för dag)
  analysis: '/cirkeldiagram.jpg', // Urklipp 8 (Sektion: Analys - cirkeldiagrammet)
  snippetCategoryBars: '/analys_kategorier.jpg', // Urklipp 9 (Sektion: Analys - kategorilistan med kvar av budget)
  snippetEditModal: '/redigera_transaktion.png', // Urklipp 10 (Mörk sektion: Redigera transaktion på dejz_03.png)
};

/**
 * Centralized Social Proof configuration.
 * Set `userCountStat` when you want to display a verified user count or milestone badge.
 */
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
 * 3D Torus Ring Decoration with specular highlights and depth
 */
export const Torus3DRing = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 200 200"
    className={`select-none pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="torusGradBrand" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE0CE" />
        <stop offset="45%" stopColor="#F8C4DF" />
        <stop offset="100%" stopColor="#CEB9EF" />
      </linearGradient>
      <radialGradient id="torusHighlight" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
        <stop offset="40%" stopColor="#F8C4DF" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#CEB9EF" stopOpacity="0.05" />
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

/**
 * Dedicated Placeholder & Renderer for cropped UI snippets (Photoshop cutouts).
 * Clearly instructs the user what app element to crop, recommended aspect/size, and file path.
 */
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
    return (
      <div className={`relative select-none ${className}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-auto rounded-2xl drop-shadow-[0_20px_50px_rgba(0,0,0,0.22)] object-contain"
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
  // If the image itself is already a complete phone mockup (with transparent background),
  // render it directly without wrapping a second CSS phone bezel around it.
  if (src && isPreframedMockup) {
    return (
      <div className={`relative mx-auto w-full flex justify-center items-center ${className}`}>
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className={`w-[138%] max-w-[540px] sm:w-[580px] sm:max-w-[580px] lg:w-[660px] lg:max-w-[660px] h-auto shrink-0 object-contain select-none pointer-events-none drop-shadow-[0_24px_48px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_28px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 ${
            perspectiveTilt ? 'hover:scale-[1.015]' : ''
          }`}
        />
      </div>
    );
  }

  // If no app screenshot is provided and a real lifestyle photo is configured,
  // render the clean photograph without a phone mockup covering it.
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
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-[var(--brand-peach)]/15 pointer-events-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mx-auto w-full max-w-[280px] sm:max-w-[310px] ${className}`}>
      {/* Outer Phone Mockup Frame with subtle shadow and 3D depth */}
      <div 
        className={`relative z-10 w-full rounded-modal p-2.5 sm:p-3 bg-[var(--text-primary)] shadow-[0_28px_65px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_65px_rgba(0,0,0,0.6)] border border-white/10 ring-1 ring-black/30 overflow-hidden transition-all duration-500 ${
          perspectiveTilt ? 'sm:rotate-[-2deg] hover:rotate-0 hover:scale-[1.015]' : ''
        }`}
      >
        {/* Top Notch / Camera Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-center pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/10" />
        </div>

        {/* Inner Screen Container */}
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

const FAQAccordionItem = ({ question, answer }: { question: string; answer: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[var(--border-divider)] last:border-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 sm:py-5 text-left flex items-center justify-between gap-4 group cursor-pointer focus:outline-none"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">
          {question}
        </span>
        <ChevronDown 
          size={18} 
          className={`text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pb-5 pr-6 text-body text-[var(--text-secondary)] leading-relaxed animate-fade-in">
          {answer}
        </div>
      )}
    </div>
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

  // Mouse tilt position for hero desktop interaction
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Voice registration sequence interactive animation state
  const [voiceStep, setVoiceStep] = useState<0 | 1 | 2>(0);
  const [animatedBalance, setAnimatedBalance] = useState(6420);

  const tr = (key: TranslationKey): string => {
    return translations[currentLanguage]?.[key] || translations.sv[key] || key;
  };

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setMousePos({ x, y });
  };

  // Close mobile menu on ESC
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

  // Lock body scroll while mobile menu is open, preserving scroll position
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

  // Close mobile menu on resize to desktop (>= 768px)
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

  // Step-by-step timer for voice registration sequence demo
  useEffect(() => {
    const timer1 = setTimeout(() => setVoiceStep(1), 1200);
    const timer2 = setTimeout(() => {
      setVoiceStep(2);
      setAnimatedBalance(6133);
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleRestartVoiceDemo = () => {
    setVoiceStep(0);
    setAnimatedBalance(6420);
    setTimeout(() => setVoiceStep(1), 1000);
    setTimeout(() => {
      setVoiceStep(2);
      setAnimatedBalance(6133);
    }, 2200);
  };

  const handlePolicyOpen = (type: 'privacy' | 'terms' | 'cookies') => {
    if (onLegalClick) {
      onLegalClick(type);
    } else {
      setActivePolicyModal(type);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans antialiased overflow-x-hidden relative">
      
      {/* Seamless Top Ambient Brand Gradient matching the in-app header gradient */}
      <div 
        aria-hidden="true" 
        className="absolute top-0 left-0 right-0 h-[550px] pointer-events-none dark:hidden z-0"
        style={{
          background: 'var(--bg-gradient)'
        }}
      />

      {/* 1. DISCRETE STICKY HEADER WITH SAFE AREA INSET TOP */}
      <header className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-all duration-300 ${
        isMobileMenuOpen 
          ? 'opacity-0 pointer-events-none' 
          : isScrolled
          ? 'bg-white/85 dark:bg-[var(--surface-color)]/90 backdrop-blur-md border-b border-[var(--border-divider)]/80 shadow-2xs opacity-100'
          : 'bg-transparent border-b border-transparent opacity-100'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-18 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <DejzLogo className="h-6 sm:h-7 w-auto" />
          </div>

          {/* Desktop Navigation (md+) */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <a
              href="#how-it-works"
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 whitespace-nowrap"
            >
              {tr('landing_nav_how_it_works')}
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
          </div>

          {/* Mobile Header Actions (< md): Language Picker + Login + Menu Toggle */}
          <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
            <LanguagePicker
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />
            {onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center gap-1.5 px-2.5 h-8 sm:h-9 rounded-[var(--radius-button-sm,10px)] text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-divider)] shadow-subtle transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
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

      {/* MOBILE MENU: SEAMLESS PORTAL TO document.body WITH FULL-SCREEN OVERLAY */}
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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-18 flex items-center justify-between border-b border-[var(--border-divider)]/40">
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
                className="w-full h-12 flex items-center px-3.5 rounded-[var(--radius-button-sm,10px)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)]"
              >
                <span>{tr('landing_nav_how_it_works')}</span>
              </a>

              {onLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsMobileLangOpen(false);
                    onLogin();
                  }}
                  className="w-full h-12 text-left flex items-center px-3.5 rounded-[var(--radius-button-sm,10px)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)] cursor-pointer bg-transparent border-none"
                >
                  <span>{tr('landing_nav_login')}</span>
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMobileLangOpen(!isMobileLangOpen)}
                  aria-expanded={isMobileLangOpen}
                  className="w-full h-12 text-left flex items-center justify-between px-3.5 rounded-[var(--radius-button-sm,10px)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-[var(--text-primary)] cursor-pointer bg-transparent border-none"
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
                          className={`w-full h-11 px-3.5 rounded-[var(--radius-button-sm,10px)] text-left text-sm flex items-center justify-between gap-3 transition-colors cursor-pointer border-none ${
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
          1. HERO SECTION — Big floating phone mockup + Editorial Highlight Strip
      ===================================================================== */}
      <section 
        onMouseMove={handleMouseMove}
        className="relative pt-4 sm:pt-14 pb-10 sm:pb-20 px-4 sm:px-6 overflow-hidden z-10"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-8 items-center relative z-10">
          
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5 text-left">
            <div className="space-y-2.5 sm:space-y-3">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.12] text-balance">
                {tr('landing_hero_title')}
              </h1>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl font-normal text-pretty">
                {tr('landing_hero_subtitle')}
              </p>
            </div>

            {/* CTAs & Registration Options — Compact natural widths */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="w-auto font-semibold text-sm shadow-subtle px-5 h-11 whitespace-nowrap"
                >
                  {tr('landing_hero_button')}
                </Button>

                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] px-4 h-11 rounded-[var(--radius-button,12px)] border border-subtle transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.99]"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{tr('landing_hero_google')}</span>
                  </button>
                )}

                {onStartDemo && (
                  <button
                    type="button"
                    onClick={onStartDemo}
                    className="inline-flex items-center justify-center text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3.5 h-11 rounded-[var(--radius-button,12px)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent whitespace-nowrap"
                  >
                    {tr('landing_hero_demo')}
                  </button>
                )}
              </div>

              <p className="text-xs font-medium text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Lock size={13} className="shrink-0 text-[var(--text-tertiary)]" />
                <span>{tr('landing_no_bank_needed')}</span>
              </p>
            </div>
          </div>

          {/* Right Column: Hero Phone Mockup (reduced ~15%) */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[290px] sm:min-h-[390px] lg:min-h-[420px] pt-2 sm:pt-0">
            <div 
              style={{
                transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 0px)`,
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
          </div>

        </div>
      </section>

      {/* =====================================================================
          2. RÖSTREGISTRERING — Editorial Collage with Overlapping UI Cutouts
      ===================================================================== */}
      <section className="py-14 sm:py-22 px-4 sm:px-6 border-t border-[var(--border-divider)] relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center">
          
          {/* Left Side: Editorial Photo (dejz_01.png) + 2 Overlapping UI Snippets (reduced ~20%) */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative mx-auto max-w-[416px] pt-4 pb-6 sm:pt-8 sm:pb-9">
              
              {/* Floating Top-Right Cutout: Plus Menu (Utgift, Inkomst, Kvitto) */}
              <div className="relative sm:absolute sm:-top-2 sm:-right-5 z-20 mb-3 sm:mb-0 max-w-[232px] mx-auto sm:mx-0 sm:w-[232px] sm:rotate-[1.5deg] hover:rotate-0 transition-transform">
                <UISnippetPlaceholder
                  src={screenshots.snippetQuickActions}
                  alt="Plus-menyn med Utgift, Inkomst och Kvitto i Dejz"
                  badgeNumber="URKLIPP 2"
                  title="Plus-menyn (Utgift, Inkomst, Kvitto) eller Kategoriuppdelning"
                  whatToCrop="Klipp ut de tre runda valen (Utgift, Inkomst, Kvitto) i +-menyn — eller rutan där ett köp delas upp på flera kategorier."
                  recommendedSize="ca 560 × 200 px • PNG"
                  fileHint="SCREENSHOT_CONFIG.snippetQuickActions"
                  variant="floating"
                />
              </div>

              {/* Main Lifestyle Photo dejz_01.png */}
              <div className="relative rounded-3xl overflow-hidden border border-subtle shadow-[0_20px_50px_rgba(0,0,0,0.12)] bg-[var(--surface-color)] aspect-[4/3.4]">
                {screenshots.lifestyleGrocery ? (
                  <img
                    src={screenshots.lifestyleGrocery}
                    alt={tr('landing_voice_title')}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center select-none"
                  />
                ) : (
                  <PhoneScreenshotFrame
                    label="Screenshot: Röstregistrering"
                    src={screenshots.voiceInput}
                    alt="Dejz Röstregistrering"
                  />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none"
                />
              </div>

              {/* Floating Bottom-Left Cutout Placeholder: Quick Expense & Voice Input Bar */}
              <div className="relative sm:absolute sm:-bottom-3 sm:-left-5 z-20 mt-3 sm:mt-0 max-w-[272px] mx-auto sm:mx-0 sm:w-[272px] sm:rotate-[-1.5deg] hover:rotate-0 transition-transform">
                <UISnippetPlaceholder
                  src={screenshots.voiceInput}
                  alt="Snabbutgift med röstinmatning i Dejz"
                  badgeNumber="URKLIPP 1"
                  title="Snabbutgift-fältet med mikrofon (”t.ex. 45 ICA...”)"
                  whatToCrop="Klipp ut fältet 'Snabbutgift: t.ex. 45 ICA...' med mikrofonknappen längst ner i +-menyn, eller ett färdigtolkat köp."
                  recommendedSize="ca 640 × 220 px • PNG"
                  fileHint="SCREENSHOT_CONFIG.voiceInput"
                  variant="floating"
                />
              </div>

            </div>
          </div>

          {/* Right Side: Copy & Live Interactive Flow Simulation Card */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6 text-left">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
                {tr('landing_voice_title')}
              </h2>

              <p className="text-base text-[var(--text-secondary)] leading-relaxed text-pretty">
                {tr('landing_voice_desc')}
              </p>

              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_voice_subdesc')}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-xs font-semibold text-[var(--text-primary)]">
                <span>{tr('landing_voice_pill_voice')}</span>
                <span aria-hidden="true" className="text-[var(--text-tertiary)]">·</span>
                <span>{tr('landing_voice_pill_receipt')}</span>
                <span aria-hidden="true" className="text-[var(--text-tertiary)]">·</span>
                <span>{tr('landing_voice_pill_quick')}</span>
              </div>
            </div>

            {/* Interactive Illustrative Flow Card */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-4 bg-[var(--surface-color)] shadow-subtle relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-subtle">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-tertiary)]">
                  <Sparkles size={14} className="text-[var(--accent-color)] shrink-0" />
                  <span>{tr('landing_voice_demo_label')}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRestartVoiceDemo}
                  className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-none"
                  title={tr('landing_voice_demo_replay')}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Step 1: Voice Input Quote */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <Mic size={13} className="text-[var(--accent-color)]" />
                  <span>{tr('landing_voice_demo_step1')}</span>
                </div>
                <div className="p-3 rounded-card-nested bg-[var(--surface-high)] text-sm font-semibold text-[var(--text-primary)] italic">
                  {tr('landing_voice_demo_quote')}
                </div>
              </div>

              {/* Step 2: Parsed Transaction Card */}
              <div className={`space-y-1.5 transition-all duration-500 ${voiceStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'}`}>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <Sparkles size={13} className="text-[var(--accent-color)]" />
                  <span>{tr('landing_voice_demo_step2')}</span>
                </div>
                <div className="p-3 rounded-card-nested bg-[var(--surface-color)] border border-subtle flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-peach)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                      C
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">Coop</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{tr('landing_voice_demo_category')}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)]">−287 kr</p>
                    <span className="text-[10px] font-semibold text-[var(--success-color)] flex items-center gap-0.5 justify-end">
                      <CheckCircle2 size={11} /> {tr('landing_voice_demo_confirm')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: Remaining Balance Update */}
              <div className={`pt-2 border-t border-subtle flex items-center justify-between text-xs transition-all duration-500 ${voiceStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                <span className="text-[var(--text-secondary)]">{tr('landing_voice_demo_step3')}</span>
                <div className="flex items-baseline gap-1.5 font-amount tabular-nums font-bold text-sm">
                  <span className="line-through opacity-50 text-[var(--text-tertiary)] text-xs">6 420 kr</span>
                  <span className="text-[var(--text-primary)] text-sm font-bold bg-[var(--brand-lavender)]/30 px-1.5 py-0.5 rounded-md">
                    {animatedBalance.toLocaleString('sv-SE')} kr
                  </span>
                </div>
              </div>
            </Card>

            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              {tr('landing_voice_footer')}
            </p>
          </div>

        </div>
      </section>

      {/* =====================================================================
          3. FASTA KOSTNADER — Contained Editorial Island + Split Visual Showcase
      ===================================================================== */}
      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-3xl bg-[var(--brand-peach)]/35 dark:bg-[var(--brand-peach)]/10 border border-[var(--border-divider)] p-6 sm:p-10 lg:p-14 space-y-10">
          
          {/* Top Editorial Split Header (Breaks the 50/50 left-right repetition!) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end text-left">
            <div className="lg:col-span-6">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
                {tr('landing_fixed_title')}
              </h2>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal text-pretty">
                {tr('landing_fixed_desc')}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-[var(--text-primary)]">
                <span>{tr('landing_fixed_pill_intervals')}</span>
                <span aria-hidden="true" className="text-[var(--text-tertiary)]">·</span>
                <span>{tr('landing_fixed_pill_variable')}</span>
                <span aria-hidden="true" className="text-[var(--text-tertiary)]">·</span>
                <span>{tr('landing_fixed_pill_goals')}</span>
              </div>
            </div>
          </div>

          {/* Bottom Asymmetric Visual Grid: Lifestyle Photo (dejz_02.png) + 2 Cropped App Snippets (reduced ~20%) */}
          <div className="max-w-[840px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            
            {/* Left 7 cols: dejz_02.png with floating pay-period snippet */}
            <div className="lg:col-span-7 relative">
              <div className="relative rounded-2xl overflow-hidden border border-subtle shadow-subtle bg-[var(--surface-color)] aspect-[16/10] max-w-[460px] mx-auto">
                {screenshots.lifestyleHome ? (
                  <img
                    src={screenshots.lifestyleHome}
                    alt={tr('landing_fixed_title')}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center select-none"
                  />
                ) : (
                  <PhoneScreenshotFrame
                    label="Screenshot: Ekonomi"
                    src={screenshots.economy}
                    alt="Dejz Ekonomi"
                  />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-transparent pointer-events-none"
                />
              </div>

              {/* Overlapping Pay-Period Summary Cutout */}
              <div className="mt-3 sm:mt-0 sm:absolute sm:bottom-3 sm:left-4 z-20 max-w-[290px] sm:w-[310px] mx-auto sm:mx-0">
                <UISnippetPlaceholder
                  src={screenshots.snippetPayPeriod}
                  alt="Ekonomi-översikt i Dejz"
                  badgeNumber="URKLIPP 4"
                  title="Flikarna Fasta utgifter / Inkomster / Månadssparande + Totalbelopp"
                  whatToCrop="Klipp ut toppen av Ekonomi-fliken med de tre filterknapparna och kortet 'Totala fasta utgifter' (eller 'Hur räknas det ut?'-modalen)."
                  recommendedSize="ca 640 × 200 px • PNG"
                  fileHint="SCREENSHOT_CONFIG.snippetPayPeriod"
                  variant="floating"
                />
              </div>
            </div>

            {/* Right 5 cols: Cropped List of Fixed Expenses (reduced ~20%) */}
            <div className="lg:col-span-5 flex flex-col justify-center max-w-[300px] sm:max-w-[320px] mx-auto w-full">
              <UISnippetPlaceholder
                src={screenshots.economy}
                alt="Dejz Ekonomi - fasta kostnader och intervall"
                badgeNumber="URKLIPP 3"
                title="Lista med fasta utgifter, dragningsdagar & intervall"
                whatToCrop="Klipp ut 3–4 rader från Ekonomi-fliken (t.ex. Hyra, Försäkring kvartalsvis, El med rörligt belopp eller Uppsagda abonnemang)."
                recommendedSize="ca 580 × 440 px • PNG"
                fileHint="SCREENSHOT_CONFIG.economy"
                variant="floating"
                className="flex flex-col justify-center"
              />
            </div>

          </div>

        </div>
      </section>

      {/* =====================================================================
          4. SÅ FUNGERAR DET I TRE STEG — Editorial Numbered Horizontal Flow
      ===================================================================== */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--surface-color)] border-y border-[var(--border-divider)] scroll-mt-12">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left border-b border-[var(--border-divider)] pb-6">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
              {tr('landing_how_title')}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md">
              {tr('landing_steps_note')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 text-left">
            {/* Step 1 */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-3xl sm:text-4xl font-extrabold font-amount tabular-nums tracking-tight text-[var(--text-primary)]">
                  01.
                </span>
                <ArrowRight size={18} className="hidden md:block text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {tr('landing_step1_title')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step1_desc')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-3xl sm:text-4xl font-extrabold font-amount tabular-nums tracking-tight text-[var(--text-primary)]">
                  02.
                </span>
                <ArrowRight size={18} className="hidden md:block text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {tr('landing_step2_title')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step2_desc')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-3xl sm:text-4xl font-extrabold font-amount tabular-nums tracking-tight text-[var(--text-primary)]">
                  03.
                </span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
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
          5. VARDAGSKOLL & SPARANDE — Asymmetric Multi-Size Bento Grid!
      ===================================================================== */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-[var(--bg-color)] border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
          
          {/* Section Header */}
          <div className="max-w-2xl text-left space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
              {tr('landing_daily_title')}
            </h2>

            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal text-pretty">
              {tr('landing_daily_desc')}
            </p>
          </div>

          {/* Asymmetric Bento Grid (7 cols + 5 cols, then full 12-col horizontal card) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
            
            {/* Bento Card 1 (7 columns): Kvar att spendera + Aktuell period & Nästa lön */}
            <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 bg-[var(--surface-color)] border border-subtle shadow-2xs flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {tr('landing_daily_item1_title')}
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-lg">
                  {tr('landing_daily_item1_desc')}
                </p>
              </div>

              <UISnippetPlaceholder
                src={screenshots.dailyAndSavings}
                alt="Dejz Kvar att spendera urklipp"
                badgeNumber="URKLIPP 5"
                title="Huvudkortet ”Kvar att spendera” + Aktuell period & Nästa lön"
                whatToCrop="Klipp ut toppkortet på Hem-vyn som visar 'Kvar att spendera', procentstapeln ('Spenderbart kvar') samt de två rutorna 'Aktuell period' och 'Nästa lön'."
                recommendedSize="ca 720 × 300 px • PNG"
                fileHint="SCREENSHOT_CONFIG.dailyAndSavings"
                variant="bento"
              />
            </div>

            {/* Bento Card 2 (5 columns): Kategoribudgetar på hemskärmen */}
            <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 bg-[var(--brand-lavender)]/25 dark:bg-[var(--brand-lavender)]/10 border border-subtle shadow-2xs flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {tr('landing_daily_item2_title')}
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {tr('landing_daily_item2_desc')}
                </p>
              </div>

              <UISnippetPlaceholder
                src={screenshots.snippetPiggyBank}
                alt="Dejz Kategoribudgetar på hemskärmen"
                badgeNumber="URKLIPP 6"
                title="Kategoribudgetar på hemskärmen"
                whatToCrop="Klipp ut den horisontella raden med mini-kort under 'Kategoribudgetar' på Hem-vyn (t.ex. Mat & dryck, Shopping, Nöje med belopp kvar)."
                recommendedSize="ca 520 × 260 px • PNG"
                fileHint="SCREENSHOT_CONFIG.snippetPiggyBank"
                variant="floating"
              />
            </div>

            {/* Bento Card 3 (12 columns horizontal split): Tidslinje & kalender */}
            <div className="lg:col-span-12 rounded-3xl p-6 sm:p-8 bg-[var(--surface-color)] border border-subtle shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {tr('landing_daily_item3_title')}
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {tr('landing_daily_item3_desc')}
                </p>
              </div>

              <div className="lg:col-span-7">
                <UISnippetPlaceholder
                  src={screenshots.snippetCalendar}
                  alt="Dejz Tidslinje och transaktioner"
                  badgeNumber="URKLIPP 7"
                  title="Horisontella tidslinjen med dagar + Dagens transaktioner"
                  whatToCrop="Klipp ut raden med dagar (Idag, Mån, Tis, Ons...) på Hem-vyn tillsammans med 1–2 transaktionsrader under datumrubriken."
                  recommendedSize="ca 820 × 280 px • PNG"
                  fileHint="SCREENSHOT_CONFIG.snippetCalendar"
                  variant="bento"
                />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =====================================================================
          6. KATEGORIER OCH ANALYS — Compact Staggered Dual-Crop Showcase (reduced ~30%)
      ===================================================================== */}
      <section className="py-12 sm:py-18 px-4 sm:px-6 bg-[var(--brand-lavender)]/15 dark:bg-[var(--brand-lavender)]/5 border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-3 text-left">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
              {tr('landing_analysis_title')}
            </h2>

            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal text-pretty max-w-lg">
              {tr('landing_analysis_desc')}
            </p>
          </div>

          {/* Compact Staggered 2-part UI Snippet Stack (reduced ~30% in size & height) */}
          <div className="lg:col-span-6">
            <div className="max-w-[380px] sm:max-w-[410px] mx-auto space-y-3 sm:space-y-0">
              <div className="w-[82%] sm:w-[78%]">
                <UISnippetPlaceholder
                  src={screenshots.analysis}
                  alt="Dejz Analys - cirkeldiagram och periodjämförelse"
                  badgeNumber="URKLIPP 8"
                  title="Analysvyn – Cirkeldiagrammet (Donut-grafen) & sammanfattningskorten"
                  whatToCrop="Klipp ut cirkeldiagrammet i Analys-fliken (gärna tillsammans med de två korten 'Kvar att spendera' och 'Mot förra perioden' ovanför)."
                  recommendedSize="ca 720 × 340 px • PNG"
                  fileHint="SCREENSHOT_CONFIG.analysis"
                  variant="floating"
                  className="[&_img]:max-h-[220px] sm:[&_img]:max-h-[240px] [&_img]:w-auto"
                />
              </div>

              <div className="w-[84%] sm:w-[80%] ml-auto sm:-mt-5 relative z-10">
                <UISnippetPlaceholder
                  src={screenshots.snippetCategoryBars}
                  alt="Dejz Kategorilista under Analys"
                  badgeNumber="URKLIPP 9"
                  title="Kategorilistan under Analys (med ”kvar av budget” & procent)"
                  whatToCrop="Klipp ut 2–3 rader ur kategorilistan i Analys som visar kategoriikon, 'X kr kvar av budget', totalt spenderat och procentandel."
                  recommendedSize="ca 720 × 260 px • PNG"
                  fileHint="SCREENSHOT_CONFIG.snippetCategoryBars"
                  variant="floating"
                  className="[&_img]:max-h-[190px] sm:[&_img]:max-h-[210px] [&_img]:w-auto"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =====================================================================
          7. KONTROLL UTAN BANKKOPPLING — High-Contrast Obsidian Editorial Block
      ===================================================================== */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[var(--bg-color)] border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto rounded-3xl bg-[var(--text-primary)] text-[var(--surface-color)] p-6 sm:p-12 lg:p-16 shadow-modal relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center text-left relative z-10">
            
            {/* Left Column: Heading, Description & 3 Control Points on Dark Canvas */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white text-balance">
                  {tr('landing_control_title')}
                </h2>
                <p className="text-base text-white/75 leading-relaxed text-pretty max-w-xl">
                  {tr('landing_control_desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.04] space-y-1.5">
                  <h3 className="text-sm font-bold text-white">
                    {tr('landing_control_item1_title')}
                  </h3>
                  <p className="text-xs text-white/70 leading-normal">
                    {tr('landing_control_item1_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.04] space-y-1.5">
                  <h3 className="text-sm font-bold text-white">
                    {tr('landing_control_item2_title')}
                  </h3>
                  <p className="text-xs text-white/70 leading-normal">
                    {tr('landing_control_item2_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.04] space-y-1.5">
                  <h3 className="text-sm font-bold text-white">
                    {tr('landing_control_item3_title')}
                  </h3>
                  <p className="text-xs text-white/70 leading-normal">
                    {tr('landing_control_item3_desc')}
                  </p>
                </div>
              </div>

              <p className="text-xs text-white/55 leading-relaxed pt-1">
                {tr('landing_control_footer')}
              </p>
            </div>

            {/* Right Column: Editorial Lifestyle Photo (dejz_03.png) + Overlapping Edit Transaction Cutout (reduced ~15%) */}
            <div className="lg:col-span-5">
              <div className="max-w-[330px] sm:max-w-[360px] mx-auto lg:ml-auto lg:mr-0 space-y-3">
                {screenshots.lifestyleControl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-subtle bg-black/40 aspect-[4/3]">
                    <img
                      src={screenshots.lifestyleControl}
                      alt={tr('landing_control_title')}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center select-none"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 aspect-[4/3] flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <ImageIcon size={24} className="text-white/70" />
                    <p className="text-xs font-semibold text-white">Miljöbild: Kontroll utan bankkoppling</p>
                  </div>
                )}

                {/* Overlapping Dark-Mode Cutout: Edit Transaction (reduced ~15%) */}
                <div className="sm:-mt-8 sm:-ml-4 relative z-20 max-w-[275px] sm:max-w-[295px] mx-auto sm:mx-0">
                  <UISnippetPlaceholder
                    src={screenshots.snippetEditModal}
                    alt="Redigera transaktion i Dejz"
                    badgeNumber="URKLIPP 10"
                    title="Redigera transaktion (belopp, kategori, datum, kvitto)"
                    whatToCrop="Klipp ut vyn 'Redigera transaktion' där man kan ändra belopp, byta eller dela upp kategori, välja datum (Idag / Igår), hjärtmarkera eller bifoga kvitto."
                    recommendedSize="ca 560 × 240 px • PNG"
                    fileHint="SCREENSHOT_CONFIG.snippetEditModal"
                    variant="dark-floating"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =====================================================================
          8. SOCIAL PROOF (Omdömen & användarsiffra / placeholder)
      ===================================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--bg-color)] border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
          
          <div className="max-w-2xl mx-auto text-center space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
              {tr('landing_testimonials_title')}
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed text-pretty">
              {tr('landing_testimonials_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Quote 1 */}
            <Card variant="default" padding="lg" className="border border-subtle bg-[var(--surface-color)] flex flex-col justify-between space-y-5">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                &ldquo;{tr('landing_testimonial1_quote')}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-subtle">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-peach)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {tr('landing_testimonial1_name')}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {tr('landing_testimonial1_role')}
                  </p>
                </div>
              </div>
            </Card>

            {/* Quote 2 */}
            <Card variant="default" padding="lg" className="border border-subtle bg-[var(--surface-color)] flex flex-col justify-between space-y-5">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                &ldquo;{tr('landing_testimonial2_quote')}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-subtle">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-pink)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                  E
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {tr('landing_testimonial2_name')}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {tr('landing_testimonial2_role')}
                  </p>
                </div>
              </div>
            </Card>

            {/* Quote 3 */}
            <Card variant="default" padding="lg" className="border border-subtle bg-[var(--surface-color)] flex flex-col justify-between space-y-5">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                &ldquo;{tr('landing_testimonial3_quote')}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-subtle">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-lavender)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                  S
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {tr('landing_testimonial3_name')}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {tr('landing_testimonial3_role')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </section>

      {/* =====================================================================
          9. VANLIGA FRÅGOR (FAQ)
      ===================================================================== */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6 text-left">
          
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {tr('landing_faq_title')}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {tr('landing_faq_subtitle')}
            </p>
          </div>

          <div className="space-y-1">
            <FAQAccordionItem
              question={tr('landing_faq1_q')}
              answer={tr('landing_faq1_a')}
            />
            <FAQAccordionItem
              question={tr('landing_faq2_q')}
              answer={tr('landing_faq2_a')}
            />
            <FAQAccordionItem
              question={tr('landing_faq3_q')}
              answer={tr('landing_faq3_a')}
            />
            <FAQAccordionItem
              question={tr('landing_faq4_q')}
              answer={tr('landing_faq4_a')}
            />
            <FAQAccordionItem
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
              question={tr('landing_faq6_q')}
              answer={tr('landing_faq6_a')}
            />
          </div>

        </div>
      </section>

      {/* =====================================================================
          10. AVSLUTANDE REGISTRERING
      ===================================================================== */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-transparent via-[var(--brand-peach)]/20 to-[var(--brand-peach)]/30 border-t border-[var(--border-divider)] text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-5 relative z-10">
          
          <div className="space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] text-balance">
              {tr('landing_cta_title')}
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto text-pretty">
              {tr('landing_cta_subtitle')}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              className="w-auto font-semibold text-sm shadow-subtle px-7 h-11 sm:h-12 justify-center text-center"
            >
              {tr('landing_hero_button')}
            </Button>

            <p className="text-xs font-medium text-[var(--text-tertiary)] flex items-center justify-center gap-1.5">
              <Lock size={13} className="shrink-0 text-[var(--text-tertiary)]" />
              <span>{tr('landing_no_bank_needed')}</span>
            </p>
          </div>

        </div>
      </section>

      {/* =====================================================================
          11. FOOTER
      ===================================================================== */}
      <footer className="py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] px-4 sm:px-6 border-t border-[var(--border-divider)] bg-[var(--bg-color)] text-xs text-[var(--text-tertiary)]">
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
