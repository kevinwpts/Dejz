import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronDown, 
  ShieldCheck, 
  Check, 
  Mic, 
  Smartphone, 
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  PieChart,
  RotateCcw,
  Menu,
  X,
  Camera,
  Zap,
  Calendar,
  PiggyBank,
  Wallet,
  Image as ImageIcon,
  MessageSquareHeart,
  Users
} from 'lucide-react';
import { Language, TranslationKey, translations } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { DejzLogo } from './DejzLogo';
import { Button, Card, IconButton } from './ui';
import { LanguagePicker } from './LanguagePicker';
import { NORDIC_LANGUAGES } from '../utils/nordic';

export interface LandingPageScreenshots {
  heroHome?: string;         // Placeholder 1: "Screenshot: Hem – kvar att spendera och aktuell löneperiod"
  economy?: string;          // Placeholder 2: "Screenshot: Ekonomi – inkomster och fasta utgifter"
  voiceInput?: string;       // Placeholder 3: "Screenshot: Röstregistrering – registrera en transaktion"
  dailyAndSavings?: string;  // Placeholder 4: "Screenshot: Dagsbudget & Spargris – dagens utrymme, kalender och sparat överskott"
  analysis?: string;         // Placeholder 5: "Screenshot: Analys – kategorier, budgetgränser och fördelning"
  lifestyleGrocery?: string; // Miljöbild: Vardag & matinköp (Röstregistrering)
  lifestyleHome?: string;    // Miljöbild: Hem & ekonomisk överblick (Fasta kostnader)
  lifestyleSavings?: string; // Miljöbild: Vardagskoll & sparande (Dagsbudget & Spargris)
  lifestyleControl?: string; // Livsstilsbild: Kontroll utan bankkoppling
}

/**
 * Centralized screenshot & lifestyle image configuration.
 * Simply set the URL/path here when images or screenshots are uploaded in AI Studio.
 */
export const SCREENSHOT_CONFIG: LandingPageScreenshots = {
  heroHome: '/hero.PNG',
  economy: undefined,
  voiceInput: undefined,
  dailyAndSavings: undefined,
  analysis: undefined,
  lifestyleGrocery: '/images/lifestyle-grocery.jpg',
  lifestyleHome: '/images/lifestyle-home.jpg',
  lifestyleSavings: undefined,
  lifestyleControl: '/images/lifestyle-control.jpg',
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

interface PhoneScreenshotFrameProps {
  label: string;
  src?: string;
  alt: string;
  className?: string;
  perspectiveTilt?: boolean;
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
  lifestyleImage,
  lifestyleAlt = '',
  placeholderNote = '[ Screenshot Placeholder ]',
}) => {
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
      
      {/* Seamless Top Ambient Brand Gradient extending behind status bar, header and hero */}
      <div 
        aria-hidden="true" 
        className="absolute top-0 left-0 right-0 h-[640px] pointer-events-none bg-gradient-to-b from-[var(--brand-peach)]/45 via-[var(--brand-pink)]/20 to-transparent dark:from-[var(--brand-peach)]/10 dark:via-[var(--brand-pink)]/5 dark:to-transparent z-0" 
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
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1"
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
                className="text-xs font-semibold text-[var(--text-primary)] px-3"
              >
                {tr('landing_nav_login')}
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={onGetStarted}
              className="text-xs font-semibold shadow-xs px-4"
            >
              {tr('landing_nav_get_started')}
            </Button>
          </div>

          {/* Mobile Menu Toggle Button (< md) */}
          <div className="md:hidden flex items-center">
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
          {/* Backdrop Overlay - pure full-screen dimming covering bottom safe area without blur */}
          <div 
            className="fixed inset-0 w-full h-full min-h-dvh bg-black/40 z-[9991] transition-opacity animate-in fade-in duration-200"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsMobileLangOpen(false);
            }}
            aria-hidden="true"
          />

          {/* Continuous Panel from Top of Screen (covers safe-area) */}
          <div 
            role="dialog"
            aria-modal="true"
            aria-label={tr('landing_nav_menu_label')}
            className="fixed top-0 left-0 right-0 z-[9995] bg-[var(--surface-color)] border-b border-[var(--border-divider)] shadow-modal rounded-b-2xl pt-[env(safe-area-inset-top,0px)] animate-in slide-in-from-top-2 duration-200"
          >
            {/* Top Bar inside Menu: Logo Left, Clear Close (X) Right */}
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

            {/* Menu Items Container - 16px below top bar */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-5 space-y-1 text-left">
              {/* Row 1: Så fungerar det */}
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

              {/* Row 2: Logga in */}
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

              {/* Row 3: Språk / Language Selection Row with Flag and Full Name */}
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

                {/* Expanded Language Picker directly on white panel */}
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

              {/* Divider before CTA */}
              <div className="border-t border-[var(--border-divider)] pt-1 my-2" />

              {/* Full-Width Primary CTA at Bottom */}
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

      {/* 1. HERO SECTION */}
      <section 
        onMouseMove={handleMouseMove}
        className="relative pt-4 sm:pt-14 pb-12 sm:pb-24 px-4 sm:px-6 overflow-hidden z-10"
      >
        {/* Soft Ambient Background Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--brand-peach)]/40 dark:bg-[var(--brand-peach)]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -right-24 w-96 h-96 rounded-full bg-[var(--brand-lavender)]/35 dark:bg-[var(--brand-lavender)]/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-8 items-center relative z-10">
          
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
            
            <div className="space-y-2.5 sm:space-y-3">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.12] text-balance">
                {tr('landing_hero_title')}
              </h1>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl font-normal text-pretty">
                {tr('landing_hero_subtitle')}
              </p>
            </div>

            {/* CTAs & Registration Options */}
            {/* Mobile Button Group (< sm) */}
            <div className="sm:hidden w-full space-y-2.5 pt-0.5">
              {/* Kom igång gratis: Full-width primary button */}
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={onGetStarted}
                className="w-full h-12 justify-center text-center font-semibold text-sm shadow-subtle"
              >
                {tr('landing_hero_button')}
              </Button>

              {/* Fortsätt med Google: Full-width, same height, centered Google icon & text */}
              {onGoogleLogin && (
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="w-full h-12 flex items-center justify-center gap-2.5 text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] rounded-[var(--radius-button,12px)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
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

              {/* Testa demo: Centered text button with compact margin */}
              {onStartDemo && (
                <div className="flex justify-center pt-0">
                  <button
                    type="button"
                    onClick={onStartDemo}
                    className="inline-flex items-center justify-center text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    {tr('landing_hero_demo')}
                  </button>
                </div>
              )}

              {/* Reassuring note: Centered under button group with tight margin */}
              <p className="text-xs font-medium text-[var(--text-tertiary)] flex items-center justify-center gap-1.5 pt-0 text-center">
                <Lock size={13} className="shrink-0 text-[var(--text-tertiary)]" />
                <span>{tr('landing_no_bank_needed')}</span>
              </p>
            </div>

            {/* Desktop Button Group (sm+) */}
            <div className="hidden sm:block space-y-3.5 pt-1">
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="font-semibold text-sm shadow-subtle px-6 h-12 whitespace-nowrap"
                >
                  {tr('landing_hero_button')}
                </Button>

                {onStartDemo && (
                  <button
                    type="button"
                    onClick={onStartDemo}
                    className="inline-flex items-center justify-center text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 h-12 rounded-[var(--radius-button,12px)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent whitespace-nowrap"
                  >
                    {tr('landing_hero_demo')}
                  </button>
                )}
              </div>

              {/* Discrete Google Sign-In */}
              {onGoogleLogin && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="inline-flex items-center justify-center gap-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] px-4 py-2.5 h-11 rounded-[var(--radius-button,12px)] border border-subtle transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{tr('landing_hero_google')}</span>
                  </button>
                </div>
              )}

              {/* Reassuring note */}
              <p className="text-xs font-medium text-[var(--text-tertiary)] flex items-center gap-1.5 pt-0.5">
                <Lock size={13} className="shrink-0 text-[var(--text-tertiary)]" />
                <span>{tr('landing_no_bank_needed')}</span>
              </p>
            </div>
          </div>

          {/* Right Column: Hero Composition with 3D Ring & Phone Mockup */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[300px] sm:min-h-[420px] pt-1 sm:pt-0">
            
            {/* 3D Shaded Brand Ring partially behind phone */}
            <Torus3DRing className="absolute -top-4 -right-2 sm:-top-8 sm:right-2 w-52 h-52 sm:w-72 sm:h-72 opacity-90 animate-pulse-subtle z-0" />

            {/* Interactive / Floating Phone Frame Container */}
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
              />
            </div>

          </div>

        </div>
      </section>

      {/* 2. RÖSTREGISTRERING MED BEFINTLIG DEMONSTRATION */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-[var(--border-divider)] relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Side: Lifestyle Photo (or uploaded voice screenshot) */}
          <div className="lg:col-span-6 order-2 lg:order-1 flex justify-center">
            <PhoneScreenshotFrame
              label="Screenshot: Röstregistrering – registrera en transaktion"
              src={screenshots.voiceInput}
              alt="Dejz Röstregistrering"
              lifestyleImage={screenshots.lifestyleGrocery}
              lifestyleAlt={tr('landing_voice_title')}
            />
          </div>

          {/* Right Side: Copy & Step-by-Step Flow Simulation Card */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6 text-left">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <Mic size={14} className="text-[var(--text-primary)]" />
                <span>{tr('landing_voice_badge')}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
                {tr('landing_voice_title')}
              </h2>

              <p className="text-base text-[var(--text-secondary)] leading-relaxed text-pretty">
                {tr('landing_voice_desc')}
              </p>

              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_voice_subdesc')}
              </p>

              {/* Registration Method Highlights */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-color)] border border-subtle text-[var(--text-primary)] shadow-2xs">
                  <Mic size={13} className="text-[var(--text-secondary)]" />
                  {tr('landing_voice_pill_voice')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-color)] border border-subtle text-[var(--text-primary)] shadow-2xs">
                  <Camera size={13} className="text-[var(--text-secondary)]" />
                  {tr('landing_voice_pill_receipt')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-color)] border border-subtle text-[var(--text-primary)] shadow-2xs">
                  <Zap size={13} className="text-[var(--text-secondary)]" />
                  {tr('landing_voice_pill_quick')}
                </span>
              </div>
            </div>

            {/* Interactive Illustrative Flow Card */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-4 bg-[var(--surface-color)] shadow-subtle relative overflow-hidden">
              
              {/* Card Header & Replay Control */}
              <div className="flex items-center justify-between pb-2 border-b border-subtle">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
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

      {/* 3. FASTA KOSTNADER OCH EKONOMISK ÖVERBLICK (Warm Peach Surface) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--brand-peach)]/30 dark:bg-[var(--brand-peach)]/10 border-t border-[var(--border-divider)] relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <Layers size={14} className="text-[var(--text-primary)]" />
              <span>{tr('landing_fixed_badge')}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
              {tr('landing_fixed_title')}
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal text-pretty">
              {tr('landing_fixed_desc')}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-color)]/90 border border-subtle text-[var(--text-primary)] shadow-2xs">
                <Calendar size={13} className="text-[var(--text-secondary)]" />
                {tr('landing_fixed_pill_intervals')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-color)]/90 border border-subtle text-[var(--text-primary)] shadow-2xs">
                <Layers size={13} className="text-[var(--text-secondary)]" />
                {tr('landing_fixed_pill_variable')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-color)]/90 border border-subtle text-[var(--text-primary)] shadow-2xs">
                <PiggyBank size={13} className="text-[var(--text-secondary)]" />
                {tr('landing_fixed_pill_goals')}
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <PhoneScreenshotFrame
              label="Screenshot: Ekonomi – inkomster och fasta utgifter"
              src={screenshots.economy}
              alt="Dejz Ekonomi - inkomster och fasta utgifter"
              lifestyleImage={screenshots.lifestyleHome}
              lifestyleAlt={tr('landing_fixed_title')}
            />
          </div>

        </div>
      </section>

      {/* 4. SÅ FUNGERAR DET I TRE STEG (3 Steps Clean Grid) */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--surface-color)] border-y border-[var(--border-divider)] scroll-mt-12">
        <div className="max-w-4xl mx-auto text-center space-y-10 sm:space-y-12">
          
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
              {tr('landing_how_title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Step 1 */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-3 relative overflow-hidden bg-[var(--bg-color)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)] text-[var(--surface-color)] text-sm font-bold flex items-center justify-center shadow-xs">
                1
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {tr('landing_step1_title')}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step1_desc')}
              </p>
            </Card>

            {/* Step 2 */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-3 relative overflow-hidden bg-[var(--bg-color)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)] text-[var(--surface-color)] text-sm font-bold flex items-center justify-center shadow-xs">
                2
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {tr('landing_step2_title')}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step2_desc')}
              </p>
            </Card>

            {/* Step 3 */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-3 relative overflow-hidden bg-[var(--bg-color)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)] text-[var(--surface-color)] text-sm font-bold flex items-center justify-center shadow-xs">
                3
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {tr('landing_step3_title')}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {tr('landing_step3_desc')}
              </p>
            </Card>
          </div>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            {tr('landing_steps_note')}
          </p>

        </div>
      </section>

      {/* 5. VARDAGSKOLL OCH SPARANDE (Dagsbudget, Spargris & Kalender) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--bg-color)] border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Side: Screenshot or Lifestyle Photo Placeholder */}
          <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
            <PhoneScreenshotFrame
              label="Screenshot: Dagsbudget & Spargris – dagens utrymme, kalender och sparat överskott"
              src={screenshots.dailyAndSavings}
              alt="Dejz Dagsbudget, Spargris och Kalender"
              lifestyleImage={screenshots.lifestyleSavings}
              lifestyleAlt={tr('landing_daily_title')}
              placeholderNote="[ Screenshot / Miljöbild Placeholder ]"
            />
          </div>

          {/* Right Side: Copy & 3 Feature Highlights */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6 text-left">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <PiggyBank size={14} className="text-[var(--text-primary)]" />
                <span>{tr('landing_daily_badge')}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
                {tr('landing_daily_title')}
              </h2>

              <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal text-pretty max-w-xl">
                {tr('landing_daily_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-card border border-subtle bg-[var(--surface-color)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                  <Wallet size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {tr('landing_daily_item1_title')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-normal">
                  {tr('landing_daily_item1_desc')}
                </p>
              </div>

              <div className="p-4 rounded-card border border-subtle bg-[var(--surface-color)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                  <PiggyBank size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {tr('landing_daily_item2_title')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-normal">
                  {tr('landing_daily_item2_desc')}
                </p>
              </div>

              <div className="p-4 rounded-card border border-subtle bg-[var(--surface-color)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                  <Calendar size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {tr('landing_daily_item3_title')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-normal">
                  {tr('landing_daily_item3_desc')}
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. KATEGORIER OCH ANALYS (Soft Lavender Surface) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--brand-lavender)]/20 dark:bg-[var(--brand-lavender)]/10 border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <PieChart size={14} className="text-[var(--text-primary)]" />
              <span>{tr('landing_analysis_badge')}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight text-balance">
              {tr('landing_analysis_title')}
            </h2>

            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal text-pretty">
              {tr('landing_analysis_desc')}
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <PhoneScreenshotFrame
              label="Screenshot: Analys – kategorier, budgetgränser och fördelning"
              src={screenshots.analysis}
              alt="Dejz Analys - kategorier och fördelning"
            />
          </div>

        </div>
      </section>

      {/* 6. KONTROLL UTAN BANKKOPPLING */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--surface-color)] border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center text-left">
          
          {/* Left Column: Heading, Description & 3 Control Points */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
                {tr('landing_control_title')}
              </h2>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed text-pretty max-w-xl">
                {tr('landing_control_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-card border border-subtle bg-[var(--bg-color)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {tr('landing_control_item1_title')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-normal">
                  {tr('landing_control_item1_desc')}
                </p>
              </div>

              <div className="p-4 rounded-card border border-subtle bg-[var(--bg-color)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                  <Check size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {tr('landing_control_item2_title')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-normal">
                  {tr('landing_control_item2_desc')}
                </p>
              </div>

              <div className="p-4 rounded-card border border-subtle bg-[var(--bg-color)] space-y-2">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                  <Sparkles size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {tr('landing_control_item3_title')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-normal">
                  {tr('landing_control_item3_desc')}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed pt-1">
              {tr('landing_control_footer')}
            </p>
          </div>

          {/* Right Column: Editorial Lifestyle Photo or Image Placeholder */}
          <div className="lg:col-span-5">
            {screenshots.lifestyleControl ? (
              <div className="relative rounded-modal overflow-hidden border border-subtle shadow-subtle bg-[var(--bg-color)] aspect-[4/3]">
                <img
                  src={screenshots.lifestyleControl}
                  alt={tr('landing_control_title')}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center select-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-[var(--brand-peach)]/15 pointer-events-none"
                />
              </div>
            ) : (
              <div className="relative rounded-modal overflow-hidden border border-subtle shadow-subtle bg-[var(--bg-color)] aspect-[4/3] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)] border border-subtle shadow-xs">
                  <ImageIcon size={24} strokeWidth={1.75} />
                </div>
                <div className="space-y-1 max-w-[220px]">
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                    Miljöbild: Kontroll utan bankkoppling
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono tracking-tight">
                    [ Bild-placeholder ]
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 7. SOCIAL PROOF (Omdömen & användarsiffra / placeholder) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--bg-color)] border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
          
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <MessageSquareHeart size={14} className="text-[var(--text-primary)]" />
              <span>{tr('landing_testimonials_badge')}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
              {tr('landing_testimonials_title')}
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed text-pretty">
              {tr('landing_testimonials_subtitle')}
            </p>

            {/* User count stat or placeholder badge */}
            <div className="pt-2 flex justify-center">
              {SOCIAL_PROOF_CONFIG.userCountStat ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-color)] border border-subtle shadow-2xs text-xs font-semibold text-[var(--text-primary)]">
                  <Users size={14} className="text-[var(--text-secondary)]" />
                  <span>{SOCIAL_PROOF_CONFIG.userCountStat}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-color)] border border-dashed border-[var(--border-color)] text-[11px] font-mono text-[var(--text-tertiary)]">
                  <Users size={13} className="text-[var(--text-tertiary)]" />
                  <span>{tr('landing_testimonials_stat_placeholder')}</span>
                </div>
              )}
            </div>
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

      {/* 8. VANLIGA FRÅGOR (FAQ) */}
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

      {/* 8. AVSLUTANDE REGISTRERING */}
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
              className="w-full sm:w-auto font-semibold text-sm shadow-subtle px-8 h-11 sm:h-12 justify-center text-center"
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

      {/* 9. FOOTER */}
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
