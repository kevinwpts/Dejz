import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown,
  ChevronRight,
  ArrowUp,
  Instagram,
  CreditCard,
  PieChart,
  Calendar,
  Wallet,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { TranslationKey, Language } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { DejzLogo } from './DejzLogo';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  onStartDemo?: () => void;
  onGoogleLogin?: () => void;
  onFacebookLogin?: () => void;
  onLegalClick?: (type: 'privacy' | 'terms' | 'cookies') => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

const MockupPlaceholder = ({ 
  id = 'HERO_MOCKUP', 
  imageSrc, 
  imageAlt = 'Dejz Mockup',
  aspectRatio = 'aspect-[4/3] sm:aspect-[16/11] lg:aspect-[5/4]',
  className = '',
  sublabel = 'Mockup placeras här'
}: { 
  id?: string; 
  imageSrc?: string; 
  imageAlt?: string;
  aspectRatio?: string;
  className?: string;
  sublabel?: string;
}) => {
  if (imageSrc) {
    return (
      <div className="relative group w-full">
        {/* Soft Ambient Glow Behind Mockup */}
        <div 
          className="absolute -inset-3 sm:-inset-6 rounded-[36px] bg-[var(--accent-color)] opacity-[0.12] dark:opacity-[0.18] blur-2xl sm:blur-3xl -z-10 transition-opacity duration-500 group-hover:opacity-[0.20]" 
          aria-hidden="true"
        />
        <div 
          data-mockup-id={id}
          className={`relative w-full rounded-[28px] overflow-hidden flex items-center justify-center bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] shadow-xl shadow-black/[0.03] dark:shadow-black/20 ${className}`}
        >
          <img 
            src={imageSrc} 
            alt={imageAlt} 
            className="w-full h-auto max-h-[540px] object-contain rounded-[28px]" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group w-full">
      <div 
        className="absolute -inset-3 sm:-inset-6 rounded-[36px] bg-[var(--accent-color)] opacity-[0.10] blur-2xl -z-10" 
        aria-hidden="true"
      />
      <div 
        data-mockup-id={id}
        className={`relative w-full ${aspectRatio} rounded-[28px] bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden flex flex-col items-center justify-center p-8 select-none shadow-lg ${className}`}
      >
        <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(var(--text-primary)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        
        <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-[var(--text-primary)]/20 rounded-tl-xs" />
        <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-[var(--text-primary)]/20 rounded-tr-xs" />
        <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-[var(--text-primary)]/20 rounded-bl-xs" />
        <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-[var(--text-primary)]/20 rounded-br-xs" />

        <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-[var(--text-primary)]/75">
            [ {id} ]
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {sublabel}
          </span>
        </div>
      </div>
    </div>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 sm:py-7 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
      >
        <span className={`text-lg sm:text-xl font-bold tracking-tight transition-colors pr-6 ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]/80 group-hover:text-[var(--text-primary)]'}`}>
          {question}
        </span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${isOpen ? 'rotate-180 bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] bg-black/[0.03] dark:bg-white/[0.05]'}`}>
          <ChevronDown size={18} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="pb-6 pr-8">
              <p className="text-[var(--text-secondary)] leading-relaxed font-normal text-base sm:text-lg">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function LandingPage({ 
  onGetStarted, 
  onLogin, 
  onStartDemo, 
  onGoogleLogin: _onGoogleLogin, 
  onFacebookLogin: _onFacebookLogin, 
  onLegalClick, 
  currentLanguage: _currentLanguage, 
  onLanguageChange: _onLanguageChange, 
  t: _t 
}: LandingPageProps) {
  const [activePolicy, setActivePolicy] = React.useState<string | null>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans overflow-x-hidden relative selection:bg-[var(--accent-color)] selection:text-[var(--on-accent)] antialiased">
      
      {/* HEADER */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-color)]/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] pt-[env(safe-area-inset-top)] transition-colors">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center cursor-pointer text-left focus:outline-none"
            aria-label="Dejz Hem"
          >
            <DejzLogo className="text-2xl font-black tracking-tight" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            {onLogin && (
              <button 
                onClick={onLogin}
                className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-color)] transition-colors px-3 py-2 cursor-pointer"
              >
                Logga in
              </button>
            )}
            <button 
              onClick={onGetStarted}
              className="px-5 py-2.5 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] hover:opacity-95 active:scale-95 transition-all font-semibold text-sm cursor-pointer shadow-xs"
            >
              Kom igång gratis
            </button>
          </div>
        </div>
      </nav>

      {/* Main Streamlined Content Flow */}
      <main className="flex flex-col min-h-dvh">

        {/* HERO */}
        <section className="w-full pt-[calc(7.5rem+env(safe-area-inset-top))] pb-16 md:pb-24 lg:pb-32 px-6 sm:px-10 bg-[var(--bg-color)] relative overflow-hidden">
          
          {/* Hero Atmospheric Accent Glows */}
          <div 
            className="absolute top-12 left-1/2 -translate-x-1/2 sm:-translate-x-1/3 w-[500px] sm:w-[700px] h-[350px] sm:h-[500px] rounded-full bg-gradient-to-tr from-[var(--accent-color)]/20 via-[var(--accent-color)]/10 to-transparent blur-3xl sm:blur-[110px] pointer-events-none -z-10" 
            aria-hidden="true" 
          />
          <div 
            className="absolute -top-10 -left-20 w-[350px] h-[350px] rounded-full bg-[var(--accent-color)]/10 blur-3xl pointer-events-none -z-10" 
            aria-hidden="true" 
          />

          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 relative z-10">
            
            <div className="w-full lg:w-[50%] space-y-6 sm:space-y-8 text-left">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.03]">
                Hela din ekonomi.<br />
                <span>Svart på vitt.</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-[var(--text-secondary)] font-normal leading-relaxed max-w-xl">
                Samla inkomster, utgifter, sparande och budget på ett ställe. Se vart pengarna går och få full koll på ekonomin mellan två löner.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button 
                  onClick={onGetStarted} 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] hover:opacity-95 transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
                >
                  <span>Kom igång gratis</span>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>

                {onStartDemo && (
                  <button
                    onClick={onStartDemo}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] border border-black/[0.06] dark:border-white/[0.08] transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
                  >
                    <span>Testa demo</span>
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm font-medium text-[var(--text-tertiary)] pt-1 flex items-center gap-2">
                <span>Ingen bankkoppling</span>
                <span className="opacity-40">•</span>
                <span>Gratis att komma igång</span>
              </p>
            </div>

            <div className="w-full lg:w-[50%] flex items-center justify-center">
              <MockupPlaceholder 
                id="HERO_MOCKUP" 
                imageSrc="/hero_ny.png" 
                imageAlt="Dejz - Hela din ekonomi. Svart på vitt." 
              />
            </div>

          </div>
        </section>

        {/* SÅ FUNGERAR DEJZ */}
        <section id="sa-fungerar-det" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-gradient-to-b from-[var(--surface-color)] via-[var(--surface-color)] to-[var(--bg-color)] border-t border-b border-black/[0.06] dark:border-white/[0.08] scroll-mt-20 relative overflow-hidden">
          
          {/* Subtle Background Accent Aura */}
          <div 
            className="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full bg-[var(--accent-color)]/8 blur-3xl pointer-events-none -z-10" 
            aria-hidden="true" 
          />

          <div className="max-w-6xl mx-auto space-y-12 md:space-y-16 relative z-10">
            
            <h2 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08] text-left">
              Se vad du faktiskt kan spendera.
            </h2>

            <div className="w-full max-w-3xl text-left">
              <MockupPlaceholder 
                id="CALCULATION_MOCKUP" 
                imageSrc="/under_hero.png"
                imageAlt="Dejz - Se vad du faktiskt kan spendera"
                aspectRatio="aspect-[16/9] sm:aspect-[21/9]"
                sublabel="Kalkyl-mockup placeras här"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
              
              <div className="p-6 rounded-[22px] bg-[var(--surface-color)]/80 border border-black/[0.05] dark:border-white/[0.06] space-y-3 text-left transition-all hover:border-[var(--accent-color)]/30 hover:shadow-xs group">
                <div className="w-11 h-11 rounded-[14px] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center font-mono font-bold text-lg ring-1 ring-[var(--accent-color)]/20 transition-transform group-hover:scale-105">
                  01
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  Lägg in din ekonomi
                </h3>
              </div>

              <div className="p-6 rounded-[22px] bg-[var(--surface-color)]/80 border border-black/[0.05] dark:border-white/[0.06] space-y-3 text-left transition-all hover:border-[var(--accent-color)]/30 hover:shadow-xs group">
                <div className="w-11 h-11 rounded-[14px] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center font-mono font-bold text-lg ring-1 ring-[var(--accent-color)]/20 transition-transform group-hover:scale-105">
                  02
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  Registrera dina utgifter
                </h3>
              </div>

              <div className="p-6 rounded-[22px] bg-[var(--surface-color)]/80 border border-black/[0.05] dark:border-white/[0.06] space-y-3 text-left transition-all hover:border-[var(--accent-color)]/30 hover:shadow-xs group">
                <div className="w-11 h-11 rounded-[14px] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center font-mono font-bold text-lg ring-1 ring-[var(--accent-color)]/20 transition-transform group-hover:scale-105">
                  03
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  Se vad du faktiskt har kvar
                </h3>
              </div>
            </div>

            <p className="text-base sm:text-lg text-[var(--text-secondary)] font-medium text-left pt-2">
              När du registrerar nya utgifter uppdaterar Dejz automatiskt hur mycket du har kvar.
            </p>

          </div>
        </section>

        {/* FUNKTIONER */}
        <section id="funktioner" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-[var(--bg-color)] scroll-mt-20 relative overflow-hidden">
          
          {/* Background Ambient Radial Lights */}
          <div 
            className="absolute top-1/3 left-10 w-[500px] h-[500px] rounded-full bg-[var(--accent-color)]/8 blur-3xl pointer-events-none -z-10" 
            aria-hidden="true" 
          />

          <div className="max-w-6xl mx-auto space-y-12 md:space-y-16 relative z-10">
            
            <h2 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08] text-left">
              Allt samlat på ett ställe.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6 sm:gap-y-8 text-left">
              
              <div className="space-y-4 bg-gradient-to-br from-[var(--surface-color)] to-[var(--surface-color)]/90 p-7 rounded-[24px] border border-black/[0.05] dark:border-white/[0.06] hover:border-[var(--accent-color)]/35 hover:shadow-lg hover:shadow-[var(--accent-color)]/5 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--accent-color)]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[var(--accent-color)]/15 to-[var(--accent-color)]/5 flex items-center justify-center text-[var(--accent-color)] ring-1 ring-[var(--accent-color)]/20 group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <Wallet size={22} strokeWidth={2} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Budget
                  </h3>
                  <p className="text-base text-[var(--text-secondary)] font-normal leading-relaxed">
                    Planera inkomster, fasta utgifter och sparande.
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-gradient-to-br from-[var(--surface-color)] to-[var(--surface-color)]/90 p-7 rounded-[24px] border border-black/[0.05] dark:border-white/[0.06] hover:border-[var(--accent-color)]/35 hover:shadow-lg hover:shadow-[var(--accent-color)]/5 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--accent-color)]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[var(--accent-color)]/15 to-[var(--accent-color)]/5 flex items-center justify-center text-[var(--accent-color)] ring-1 ring-[var(--accent-color)]/20 group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <CreditCard size={22} strokeWidth={2} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Transaktioner
                  </h3>
                  <p className="text-base text-[var(--text-secondary)] font-normal leading-relaxed">
                    Registrera och kategorisera dina köp.
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-gradient-to-br from-[var(--surface-color)] to-[var(--surface-color)]/90 p-7 rounded-[24px] border border-black/[0.05] dark:border-white/[0.06] hover:border-[var(--accent-color)]/35 hover:shadow-lg hover:shadow-[var(--accent-color)]/5 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--accent-color)]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[var(--accent-color)]/15 to-[var(--accent-color)]/5 flex items-center justify-center text-[var(--accent-color)] ring-1 ring-[var(--accent-color)]/20 group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <PieChart size={22} strokeWidth={2} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Analys
                  </h3>
                  <p className="text-base text-[var(--text-secondary)] font-normal leading-relaxed">
                    Se vart pengarna faktiskt går.
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-gradient-to-br from-[var(--surface-color)] to-[var(--surface-color)]/90 p-7 rounded-[24px] border border-black/[0.05] dark:border-white/[0.06] hover:border-[var(--accent-color)]/35 hover:shadow-lg hover:shadow-[var(--accent-color)]/5 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--accent-color)]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[var(--accent-color)]/15 to-[var(--accent-color)]/5 flex items-center justify-center text-[var(--accent-color)] ring-1 ring-[var(--accent-color)]/20 group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <Calendar size={22} strokeWidth={2} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Historik
                  </h3>
                  <p className="text-base text-[var(--text-secondary)] font-normal leading-relaxed">
                    Följ din ekonomi över tid.
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-gradient-to-br from-[var(--surface-color)] via-[var(--surface-color)] to-[var(--accent-color)]/5 p-7 rounded-[24px] border border-black/[0.05] dark:border-white/[0.06] hover:border-[var(--accent-color)]/35 hover:shadow-lg hover:shadow-[var(--accent-color)]/5 transition-all duration-300 group relative overflow-hidden md:col-span-2 lg:col-span-2">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-[var(--accent-color)]/15 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[var(--accent-color)]/20 to-[var(--accent-color)]/5 flex items-center justify-center text-[var(--accent-color)] ring-1 ring-[var(--accent-color)]/25 group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                  <Sparkles size={22} strokeWidth={2} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      Dejzi
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-color)] shadow-xs animate-pulse" />
                  </div>
                  <p className="text-base text-[var(--text-secondary)] font-normal leading-relaxed max-w-xl">
                    Få hjälp att förstå din ekonomi och upptäcka sådant som är värt att uppmärksamma.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* INTEGRITET */}
        <section id="integritet" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-[var(--bg-color)] border-t border-b border-black/[0.06] dark:border-white/[0.08] text-[var(--text-primary)] scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 sm:p-12 rounded-[28px] bg-gradient-to-br from-[var(--surface-color)] via-[var(--surface-color)] to-[var(--accent-color)]/10 border border-black/[0.06] dark:border-white/[0.08] shadow-sm relative overflow-hidden text-left space-y-5">
              
              <div className="w-12 h-12 rounded-[16px] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center ring-1 ring-[var(--accent-color)]/20 mb-2">
                <ShieldCheck size={24} strokeWidth={2} />
              </div>

              <h2 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08]">
                Ingen bankkoppling behövs.
              </h2>
              <p className="text-lg sm:text-xl text-[var(--text-secondary)] font-normal leading-relaxed max-w-2xl">
                Du bestämmer själv vad du lägger in i Dejz. Samla den ekonomi du vill hålla koll på utan att koppla ditt bankkonto.
              </p>
            </div>
          </div>
        </section>

        {/* SLUTLIG CTA */}
        <section className="w-full py-20 md:py-28 px-6 sm:px-10 bg-[var(--bg-color)] border-b border-black/[0.06] dark:border-white/[0.08] relative overflow-hidden">
          
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-b from-[var(--surface-color)] to-[var(--surface-color)]/95 p-10 sm:p-16 border border-black/[0.06] dark:border-white/[0.08] shadow-xl shadow-black/[0.02] text-center space-y-8">
              
              {/* Subtle Atmospheric Top Glow */}
              <div 
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 sm:w-[500px] h-48 bg-[var(--accent-color)]/18 rounded-full blur-3xl pointer-events-none" 
                aria-hidden="true"
              />

              <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
                <h2 className="text-4xl sm:text-6xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-[var(--text-primary)]">
                  Redo att få koll?
                </h2>
                
                <p className="text-lg sm:text-xl text-[var(--text-secondary)] font-normal max-w-xl mx-auto leading-relaxed">
                  Börja med din egen ekonomi eller testa Dejz direkt med exempeldata.
                </p>
              </div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                <button 
                  onClick={onGetStarted} 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] hover:opacity-95 transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
                >
                  <span>Kom igång gratis</span>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>

                {onStartDemo && (
                  <button
                    onClick={onStartDemo}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] border border-black/[0.06] dark:border-white/[0.08] transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
                  >
                    <span>Testa demo</span>
                  </button>
                )}
              </div>

              <p className="relative z-10 text-xs sm:text-sm text-[var(--text-tertiary)] font-medium pt-1">
                Du kan testa demoläget utan att skapa ett konto.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-[var(--surface-color)] scroll-mt-20">
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] text-left">
              Vanliga frågor
            </h2>

            <div className="border-t border-black/[0.06] dark:border-white/[0.08]">
              <FAQItem 
                question="Vad är Dejz?" 
                answer="Dejz är en webbapp som hjälper dig hålla koll på hur mycket du faktiskt har att spendera mellan två löner." 
              />
              <FAQItem 
                question="Hur räknar Dejz ut vad jag kan spendera?" 
                answer="Dejz utgår från dina inkomster, fasta utgifter och sparande och visar vad som finns kvar under perioden." 
              />
              <FAQItem 
                question="Behöver jag koppla mitt bankkonto?" 
                answer="Nej. Dejz kräver ingen bankkoppling. Du väljer själv vilken information du vill lägga in." 
              />
              <FAQItem 
                question="Kan jag testa Dejz utan konto?" 
                answer="Ja. Du kan använda demoläget och utforska Dejz med exempeldata utan att registrera dig." 
              />
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[var(--bg-color)] border-t border-black/[0.06] dark:border-white/[0.08] py-14 px-6 sm:px-10 text-[var(--text-primary)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-black/[0.06] dark:border-white/[0.08]">
          
          <div className="space-y-1 text-left">
            <DejzLogo className="text-2xl font-black tracking-tight" />
            <p className="text-sm text-[var(--text-secondary)]">
              Hela din ekonomi. Svart på vitt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
            <button 
              onClick={() => onLegalClick ? onLegalClick('privacy') : setActivePolicy('privacy')} 
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Integritetspolicy
            </button>
            <button 
              onClick={() => onLegalClick ? onLegalClick('terms') : setActivePolicy('terms')} 
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Användarvillkor
            </button>
            <a href="mailto:hej@dejz.se" className="hover:text-[var(--text-primary)] transition-colors">
              Kontakt
            </a>
            <a 
              href="https://instagram.com/dejz.se" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
            >
              <Instagram size={14} className="text-[#E1306C]" />
              <span>Instagram</span>
            </a>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-tertiary)]">
          <span>© 2026 Dejz. Alla rättigheter förbehållna.</span>
          
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Till toppen"
          >
            <ArrowUp size={13} />
            <span>Till toppen</span>
          </button>
        </div>

        {/* Legal Document Modals */}
        <PolicyModal 
          isOpen={!!activePolicy} 
          onClose={() => setActivePolicy(null)} 
          title={
            activePolicy === 'terms' ? 'Användarvillkor' : 'Integritet & Cookies'
          }
          content={
            activePolicy === 'terms' ? (
              <div className="space-y-6 text-sm text-[var(--text-primary)]">
                <section className="space-y-2 text-left">
                  <h3 className="text-base font-bold">1. Godkännande av villkor</h3>
                  <p className="text-[var(--text-secondary)] font-medium">
                    Genom att registrera ett konto eller använda Dejz godkänner du dessa användarvillkor.
                  </p>
                </section>
                <section className="space-y-2 text-left">
                  <h3 className="text-base font-bold">2. Tjänstens omfattning</h3>
                  <p className="text-[var(--text-secondary)] font-medium">
                    Dejz är ett digitalt verktyg för personlig budgetering och ekonomisk överblick. Beräkningar och prognoser är vägledande och utgör inte professionell finansiell rådgivning.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-6 text-sm text-left text-[var(--text-primary)]">
                <section className="space-y-2">
                  <h3 className="text-base font-bold">Integritets- och cookiepolicy</h3>
                  <p className="text-[var(--text-secondary)] font-medium">
                    Vi sparar endast den information som krävs för att driva appen och din budget. Inga bankkopplingar görs och inga tredjepartsspårare används.
                  </p>
                </section>
              </div>
            )
          }
        />
      </footer>

    </div>
  );
}
