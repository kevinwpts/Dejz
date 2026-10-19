import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ShieldCheck, 
  Check, 
  Mic, 
  Smartphone, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  PieChart,
  RotateCcw,
  Menu,
  X
} from 'lucide-react';
import { Language, TranslationKey } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { DejzLogo } from './DejzLogo';
import { Button, Card } from './ui';
import { LanguagePicker } from './LanguagePicker';

export interface LandingPageScreenshots {
  heroHome?: string;      // Placeholder 1: "Screenshot: Hem – kvar att spendera och aktuell löneperiod"
  economy?: string;       // Placeholder 2: "Screenshot: Ekonomi – inkomster och fasta utgifter"
  voiceInput?: string;    // Placeholder 3: "Screenshot: Röstregistrering – registrera en transaktion"
  analysis?: string;      // Placeholder 4: "Screenshot: Analys – kategorier och fördelning"
}

/**
 * Centralized screenshot configuration for uploaded app images.
 * Simply set the URL/path here when screenshots are uploaded in AI Studio.
 */
export const SCREENSHOT_CONFIG: LandingPageScreenshots = {
  heroHome: undefined,
  economy: undefined,
  voiceInput: undefined,
  analysis: undefined,
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
        <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.35" />
        <stop offset="55%" stopColor="var(--accent-color)" stopOpacity="0.75" />
        <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="0.95" />
      </linearGradient>
      <radialGradient id="torusHighlight" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="var(--on-accent)" stopOpacity="0.85" />
        <stop offset="45%" stopColor="var(--accent-color)" stopOpacity="0.25" />
        <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="0.05" />
      </radialGradient>
      <filter id="softShadow3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="6" dy="16" stdDeviation="12" floodColor="var(--text-primary)" floodOpacity="0.14" />
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
}

export const PhoneScreenshotFrame: React.FC<PhoneScreenshotFrameProps> = ({
  label,
  src,
  alt,
  className = '',
  perspectiveTilt = false,
}) => {
  return (
    <div className={`relative mx-auto w-full max-w-[280px] sm:max-w-[310px] ${className}`}>
      {/* Outer Phone Mockup Frame with subtle shadow and 3D depth */}
      <div 
        className={`relative rounded-modal p-3 sm:p-3.5 bg-[var(--text-primary)] shadow-[0_28px_65px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_65px_rgba(0,0,0,0.55)] border border-white/10 ring-1 ring-black/20 overflow-hidden transition-all duration-500 ${
          perspectiveTilt ? 'sm:rotate-[-2deg] hover:rotate-0 hover:scale-[1.015]' : ''
        }`}
      >
        {/* Top Notch / Camera Island */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/10" />
        </div>

        {/* Inner Screen Container */}
        <div className="relative w-full aspect-[9/19.5] rounded-card overflow-hidden bg-[var(--surface-color)] border border-subtle flex flex-col items-center justify-center text-center p-4">
          {src ? (
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-contain pointer-events-none select-none"
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
                  [ Screenshot Placeholder ]
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FAQAccordionItem = ({ question, answer }: { question: string; answer: string }) => {
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

  // Mouse tilt position for hero desktop interaction
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Voice registration sequence interactive animation state
  const [voiceStep, setVoiceStep] = useState<0 | 1 | 2>(0);
  const [animatedBalance, setAnimatedBalance] = useState(6420);

  const isEn = currentLanguage === 'en';

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
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans antialiased overflow-x-hidden">
      
      {/* 1. DISCRETE STICKY HEADER WITH SAFE AREA INSET TOP */}
      <header className="sticky top-0 z-50 bg-[var(--bg-color)]/95 backdrop-blur-xl border-b border-[var(--border-divider)] pt-[env(safe-area-inset-top,0px)] transition-all">
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
              {isEn ? 'How it works' : 'Så fungerar det'}
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
                {isEn ? 'Log in' : 'Logga in'}
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={onGetStarted}
              className="text-xs font-semibold shadow-xs px-4"
            >
              {isEn ? 'Get started free' : 'Kom igång gratis'}
            </Button>
          </div>

          {/* Mobile Menu Toggle Button (< md) */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? (isEn ? 'Close menu' : 'Stäng meny') : (isEn ? 'Open menu' : 'Öppna meny')}
              aria-expanded={isMobileMenuOpen}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent"
            >
              {isMobileMenuOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
            </button>
          </div>

        </div>

        {/* Mobile Slide-Down Menu Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-divider)] bg-[var(--surface-color)]/98 backdrop-blur-2xl shadow-modal px-5 py-6 space-y-4 animate-fade-in">
            <div className="flex flex-col space-y-3 text-left">
              <a
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-semibold text-[var(--text-primary)] py-2 border-b border-subtle"
              >
                {isEn ? 'How it works' : 'Så fungerar det'}
              </a>

              <div className="flex items-center justify-between py-2 border-b border-subtle">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {isEn ? 'Language' : 'Språk'}
                </span>
                <LanguagePicker
                  currentLanguage={currentLanguage}
                  onLanguageChange={onLanguageChange}
                />
              </div>

              {onLogin && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogin();
                  }}
                  className="justify-center text-sm font-semibold text-[var(--text-primary)] py-2.5"
                >
                  {isEn ? 'Log in' : 'Logga in'}
                </Button>
              )}

              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onGetStarted();
                }}
                className="justify-center text-sm font-semibold shadow-subtle py-3 mt-1"
              >
                {isEn ? 'Get started free' : 'Kom igång gratis'}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION WITH COMPACT COPY & RICH 3D DEPTH */}
      <section 
        onMouseMove={handleMouseMove}
        className="relative pt-6 sm:pt-16 pb-14 sm:pb-24 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-[var(--accent-soft)] via-transparent to-transparent"
      >
        {/* Soft Ambient Background Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--accent-soft)] blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -right-24 w-96 h-96 rounded-full bg-[var(--accent-soft)] blur-3xl pointer-events-none opacity-70" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center relative z-10">
          
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-left">
            
            <div className="space-y-2.5">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.12]">
                Koll på pengarna.<br />
                <span className="text-[var(--text-primary)] opacity-90">Från lön till lön.</span>
              </h1>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl font-normal">
                Samla inkomster, fasta utgifter och sparande. Se vad du har kvar fram till nästa lön.
              </p>
            </div>

            {/* CTAs & Registration Options */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="font-semibold text-sm shadow-subtle flex items-center justify-center gap-2 px-6"
                >
                  <span>{isEn ? 'Get started free' : 'Kom igång gratis'}</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </Button>

                {onStartDemo && (
                  <button
                    type="button"
                    onClick={onStartDemo}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <span>{isEn ? 'Try demo' : 'Testa demo'}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* Discrete Google Sign-In */}
              {onGoogleLogin && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="inline-flex items-center gap-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] px-3.5 py-2 rounded-button border border-subtle transition-all cursor-pointer shadow-2xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{isEn ? 'Continue with Google' : 'Fortsätt med Google'}</span>
                  </button>
                </div>
              )}

              {/* Reassuring note */}
              <p className="text-xs font-medium text-[var(--text-tertiary)] flex items-center gap-1.5 pt-0.5">
                <Lock size={13} className="shrink-0 text-[var(--text-tertiary)]" />
                <span>Ingen bankkoppling behövs.</span>
              </p>
            </div>
          </div>

          {/* Right Column: Hero Composition with 3D Ring & Phone Mockup */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[340px] sm:min-h-[420px]">
            
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

      {/* 3. ÖVERBLICK ÖVER EKONOMIN */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--surface-muted)] border-y border-[var(--border-divider)] relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <Layers size={14} className="text-[var(--text-primary)]" />
              <span>{isEn ? 'Financial Overview' : 'Fasta kostnader'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              Alla fasta kostnader. En tydlig överblick.
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal">
              Se dina återkommande inkomster och utgifter samlade. Med fasta kostnader och sparande i budgeten ser du vad som finns kvar att spendera.
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <PhoneScreenshotFrame
              label="Screenshot: Ekonomi – inkomster och fasta utgifter"
              src={screenshots.economy}
              alt="Dejz Ekonomi - inkomster och fasta utgifter"
            />
          </div>

        </div>
      </section>

      {/* 4. SMIDIG RÖSTREGISTRERING (Interactive Scroll & Flow Story) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Side: Screenshot Placeholder */}
          <div className="lg:col-span-6 order-2 lg:order-1 flex justify-center">
            <PhoneScreenshotFrame
              label="Screenshot: Röstregistrering – registrera en transaktion"
              src={screenshots.voiceInput}
              alt="Dejz Röstregistrering"
            />
          </div>

          {/* Right Side: Copy & Step-by-Step Flow Simulation Card */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6 text-left">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <Mic size={14} className="text-[var(--text-primary)]" />
                <span>{isEn ? 'Voice Input' : 'Smidig röstinmatning'}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                Säg det. Registrera det. Klart.
              </h2>

              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Lägg till utgifter och inkomster med rösten eller skriv in dem själv. Appen hjälper dig med kategoriseringen.
              </p>
            </div>

            {/* Interactive Illustrative Flow Card */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-4 bg-[var(--surface-color)] shadow-subtle relative overflow-hidden">
              
              {/* Card Header & Replay Control */}
              <div className="flex items-center justify-between pb-2 border-b border-subtle">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  <Sparkles size={14} className="text-[var(--accent-color)] shrink-0" />
                  <span>Exempel — så tolkar Dejz din röst</span>
                </div>
                <button
                  type="button"
                  onClick={handleRestartVoiceDemo}
                  className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-none"
                  title="Spela upp exemplet igen"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Step 1: Voice Input Quote */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <Mic size={13} className="text-[var(--accent-color)]" />
                  <span>1. Du säger</span>
                </div>
                <div className="p-3 rounded-card-nested bg-[var(--surface-high)] text-sm font-semibold text-[var(--text-primary)] italic">
                  ”Jag handlade mat för 287 kronor på Coop.”
                </div>
              </div>

              {/* Step 2: Parsed Transaction Card */}
              <div className={`space-y-1.5 transition-all duration-500 ${voiceStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'}`}>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <Sparkles size={13} className="text-[var(--accent-color)]" />
                  <span>2. Appen tolkar & föreslår</span>
                </div>
                <div className="p-3 rounded-card-nested bg-[var(--surface-color)] border border-subtle flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent-color)] font-bold text-xs flex items-center justify-center shrink-0">
                      C
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">Coop</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Mat & dagligvaror</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)]">−287 kr</p>
                    <span className="text-[10px] font-semibold text-[var(--success-color)] flex items-center gap-0.5 justify-end">
                      <CheckCircle2 size={11} /> Bekräfta
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: Remaining Balance Update */}
              <div className={`pt-2 border-t border-subtle flex items-center justify-between text-xs transition-all duration-500 ${voiceStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                <span className="text-[var(--text-secondary)]">3. Kvar att spendera uppdateras:</span>
                <div className="flex items-baseline gap-1.5 font-amount tabular-nums font-bold text-sm">
                  <span className="line-through opacity-50 text-[var(--text-tertiary)] text-xs">6 420 kr</span>
                  <span className="text-[var(--accent-color)] text-sm font-bold bg-[var(--accent-soft)] px-1.5 py-0.5 rounded-md">
                    {animatedBalance.toLocaleString('sv-SE')} kr
                  </span>
                </div>
              </div>

            </Card>

            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              Du har alltid full kontroll och bekräftar uppgifterna innan köpet sparas i din budget.
            </p>

          </div>

        </div>
      </section>

      {/* 5. SÅ FUNGERAR DET (3 Steps Clean Grid) */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--surface-color)] border-y border-[var(--border-divider)] scroll-mt-12">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Från lön till lön, i tre steg.
            </h2>
            <p className="text-base text-[var(--text-secondary)] max-w-xl mx-auto">
              Ett enkelt flöde som hjälper dig hålla koll utan krångliga menystrukturer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Step 1 */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-3 relative overflow-hidden bg-[var(--bg-color)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)] text-[var(--surface-color)] text-sm font-bold flex items-center justify-center shadow-xs">
                1
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Sätt upp din budget.
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Lägg in din löneperiod, inkomster, fasta utgifter och sparande.
              </p>
            </Card>

            {/* Step 2 */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-3 relative overflow-hidden bg-[var(--bg-color)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)] text-[var(--surface-color)] text-sm font-bold flex items-center justify-center shadow-xs">
                2
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Registrera det som händer.
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Tala in eller skriv in utgifter och inkomster under månadens gång.
              </p>
            </Card>

            {/* Step 3 */}
            <Card variant="default" padding="lg" className="border border-subtle space-y-3 relative overflow-hidden bg-[var(--bg-color)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)] text-[var(--surface-color)] text-sm font-bold flex items-center justify-center shadow-xs">
                3
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Följ vad du har kvar.
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Se hur budgeten förändras och anpassas fram till nästa lön.
              </p>
            </Card>
          </div>

        </div>
      </section>

      {/* 6. FÖRSTÅ VART PENGARNA GÅR */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--surface-muted)] border-b border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <PieChart size={14} className="text-[var(--text-primary)]" />
              <span>{isEn ? 'Spending Insights' : 'Kategorier & Analys'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              Se helheten. Förstå detaljerna.
            </h2>

            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal">
              Följ dina kategorier och se hur utgifterna fördelas. Få en tydligare bild av vad du spenderar pengarna på.
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <PhoneScreenshotFrame
              label="Screenshot: Analys – kategorier och fördelning"
              src={screenshots.analysis}
              alt="Dejz Analys - kategorier och fördelning"
            />
          </div>

        </div>
      </section>

      {/* 7. KONTROLL UTAN BANKKOPPLING */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[var(--surface-color)] border-b border-[var(--border-divider)]">
        <div className="max-w-4xl mx-auto space-y-8 text-left">
          
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Du bestämmer vad som hamnar i din budget.
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              När du registrerar dina köp blir du mer delaktig i din ekonomi. Med smidig inmatning och hjälp med kategoriseringen blir det enkelt att hålla budgeten uppdaterad.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-card border border-subtle bg-[var(--bg-color)] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                <ShieldCheck size={18} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Ingen bankkoppling behövs
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-normal">
                Du slipper dela dina bankinloggningsuppgifter eller lita på automatiska synkningar.
              </p>
            </div>

            <div className="p-4 rounded-card border border-subtle bg-[var(--bg-color)] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                <Check size={18} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Du väljer vad du registrerar
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-normal">
                Bara de köp och inkomster du väljer att lägga till påverkar din periodbudget.
              </p>
            </div>

            <div className="p-4 rounded-card border border-subtle bg-[var(--bg-color)] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-primary)]">
                <Sparkles size={18} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Kontrollera och ändra
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-normal">
                Du kan alltid ändra kategori, belopp eller datum i efterhand med ett klick.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 8. VANLIGA FRÅGOR (FAQ) */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6 text-left">
          
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Vanliga frågor
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Svar på det du kan undra om Dejz och din budget.
            </p>
          </div>

          <div className="space-y-1">
            <FAQAccordionItem
              question="Behöver jag koppla min bank?"
              answer="Nej, Dejz kräver ingen bankkoppling eller delning av bankinloggningar. Du registrerar dina köp manuellt eller med rösten, vilket ger dig full medvetenhet och kontroll utan säkerhetsrisker."
            />
            <FAQAccordionItem
              question="Hur fungerar perioden från lön till lön?"
              answer="Du ställer in din vanliga lönedag (exempelvis den 25:e). Dejz beräknar automatiskt din budgetperiod fram till nästa lönedag så att du ser vad som faktiskt finns kvar att spendera."
            />
            <FAQAccordionItem
              question="Hur registrerar jag utgifter och inkomster?"
              answer="Du kan skriva in dem manuellt på några sekunder eller enkelt tala in dem (t.ex. 'Kaffe 45 kr på Espresso House'). Appen tolkar belopp, butik och kategori och ber dig bekräfta innan det sparas."
            />
            <FAQAccordionItem
              question="Kan jag ändra kategorin på en transaktion?"
              answer="Ja, absolut. Du kan när som helst klicka på vilken transaktion som helst för att justera kategori, belopp, datum eller betalningsmetod."
            />
            <FAQAccordionItem
              question="Vad kostar appen?"
              answer="Dejz är helt gratis att komma igång med och använda för dina grundläggande behov från lön till lön."
            />
          </div>

        </div>
      </section>

      {/* 9. AVSLUTANDE REGISTRERING */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[var(--accent-soft)] border-t border-[var(--border-divider)] text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-5 relative z-10">
          
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Få koll fram till nästa lön.
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Samla din ekonomi och se vad du har kvar att spendera.
            </p>
          </div>

          <div className="flex items-center justify-center pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              className="w-full sm:w-auto font-semibold text-sm shadow-subtle px-8"
            >
              <span>{isEn ? 'Get started free' : 'Kom igång gratis'}</span>
              <ArrowRight size={16} strokeWidth={2} className="ml-2" />
            </Button>
          </div>

        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="py-10 px-4 sm:px-6 border-t border-[var(--border-divider)] bg-[var(--bg-color)] text-xs text-[var(--text-tertiary)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2">
            <DejzLogo className="h-6 w-auto" />
            <span className="ml-2 text-micro-label text-[var(--text-tertiary)]">
              © {new Date().getFullYear()} Dejz. Alla rättigheter förbehålls.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handlePolicyOpen('privacy')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Integritetspolicy
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('terms')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Användarvillkor
            </button>
            <button
              type="button"
              onClick={() => handlePolicyOpen('privacy')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Kontakt
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
