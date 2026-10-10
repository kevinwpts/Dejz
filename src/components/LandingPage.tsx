import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown,
  Shield,
  Lock,
  Sparkles,
  Check,
  Receipt,
  Instagram,
  Star
} from 'lucide-react';
import { TranslationKey, Language } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { DejzLogo } from './DejzLogo';
import { Button, Card } from './ui';

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

const PlaceholderBox = ({ 
  id, 
  className = 'aspect-[16/10]',
  labelClass = 'text-xs sm:text-sm'
}: { 
  id: string; 
  className?: string;
  labelClass?: string;
}) => {
  return (
    <div 
      data-mockup-id={id}
      className={`relative w-full ${className} rounded-[var(--radius-card,16px)] bg-[var(--surface-color)] border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center p-6 select-none transition-all hover:bg-[var(--surface-muted)]`}
    >
      <span className={`font-mono font-semibold tracking-wider text-[var(--text-tertiary)] uppercase text-center ${labelClass}`}>
        {id}
      </span>
    </div>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-[var(--border-subtle)] transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 sm:py-6 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
      >
        <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] transition-colors pr-6">
          {question}
        </span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${isOpen ? 'rotate-180 bg-[var(--surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] bg-[var(--surface-color)] group-hover:text-[var(--text-primary)]'}`}>
          <ChevronDown size={16} />
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
            <div className="pb-6 pr-6">
              <p className="text-[var(--text-secondary)] leading-relaxed font-normal text-sm sm:text-base">
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
  onGoogleLogin, 
  onLegalClick: _onLegalClick
}: LandingPageProps) {
  const [activePolicy, setActivePolicy] = React.useState<'privacy' | 'terms' | null>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh font-sans text-[var(--text-primary)] bg-[var(--bg-color)] relative selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)] light" style={{ colorScheme: 'light' }}>
      {/* Policy Modal */}
      <PolicyModal 
        isOpen={activePolicy !== null}
        type={activePolicy || 'privacy'}
        onClose={() => setActivePolicy(null)}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-color)]/95 border-b border-[var(--border-subtle)] transition-all pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center select-none cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <DejzLogo className="text-2xl font-black tracking-tight text-[var(--text-primary)]" />
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a 
                href="#how-it-works" 
                className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Så fungerar det
              </a>
              <a 
                href="#features" 
                className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Funktioner
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {onLogin && (
              <Button
                variant="ghost"
                size="md"
                onClick={onLogin}
                className="text-[var(--text-primary)]"
              >
                Logga in
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={onGetStarted}
            >
              Kom igång gratis
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative w-full bg-[var(--bg-color)] pt-6 pb-16 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          
          {/* ==================== DESKTOP LAYOUT (lg:block) ==================== */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-14 items-center">
            {/* LEFT COLUMN: Text, CTAs, Trust */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-[1.2]">
                  Hela din ekonomi.<br />
                  Svart på vitt.
                </h1>
                <p className="text-lg text-[var(--text-secondary)] font-normal leading-relaxed max-w-xl">
                  Samla inkomster, utgifter, sparande och budget på ett ställe. Se vart pengarna går och få koll på ekonomin mellan två löner.
                </p>
              </div>

              {/* CTA buttons */}
              <div className="space-y-3">
                <div className="flex items-stretch gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onGetStarted}
                    className="flex-1 shadow-subtle shadow-[var(--accent-color)]/20"
                  >
                    Kom igång gratis
                  </Button>
                  {onStartDemo && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={onStartDemo}
                    >
                      Testa demo direkt
                    </Button>
                  )}
                </div>

                {onGoogleLogin && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onGoogleLogin}
                    fullWidth
                    className="gap-3 font-semibold"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Fortsätt med Google
                  </Button>
                )}
              </div>

              {/* Trust points */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] mb-1">
                    <Shield size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Ingen bankkoppling</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">Full kontroll över din data.</p>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] mb-1">
                    <Lock size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Säker och privat</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">Din information är din.</p>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] mb-1">
                    <Sparkles size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Byggd för enkelhet</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">Fokus på det som hjälper.</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Image */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full relative rounded-[var(--radius-card,16px)] overflow-hidden shadow-subtle border border-[var(--border-subtle)] bg-[#0f172a]">
                <img 
                  src="/hero.png" 
                  alt="Dejz App" 
                  className="w-full h-auto object-cover object-center block"
                />
              </div>
            </div>
          </div>

          {/* ==================== MOBILE LAYOUT (block lg:hidden) ==================== */}
          <div className="block lg:hidden space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-[1.25]">
                Hela din ekonomi.<br />
                Svart på vitt.
              </h1>
              <p className="text-base text-[var(--text-secondary)] font-normal leading-relaxed">
                Samla inkomster, utgifter, sparande och budget på ett ställe. Se vart pengarna går och få koll på ekonomin mellan två löner.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  fullWidth
                  className="shadow-subtle shadow-[var(--accent-color)]/20"
                >
                  Kom igång gratis
                </Button>
                {onStartDemo && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={onStartDemo}
                    fullWidth
                  >
                    Testa demo direkt
                  </Button>
                )}
              </div>

              {onGoogleLogin && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onGoogleLogin}
                  fullWidth
                  className="gap-3 font-semibold"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Fortsätt med Google
                </Button>
              )}
            </div>

            {/* Hero Image */}
            <div className="w-full relative rounded-[var(--radius-card,16px)] overflow-hidden shadow-subtle border border-[var(--border-subtle)] bg-[#0f172a] aspect-[16/11] sm:aspect-[16/10]">
              <img 
                src="/hero.png" 
                alt="Dejz App" 
                className="w-full h-full object-cover object-right block"
              />
            </div>

            {/* Trust points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-[var(--surface-color)] sm:bg-transparent p-3 sm:p-0 rounded-[var(--radius-card-nested,10px)] border sm:border-0 border-[var(--border-subtle)]">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--bg-color)] sm:bg-[var(--surface-color)] border sm:border-0 border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Shield size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Ingen bankkoppling</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">Full kontroll över din data.</p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-[var(--surface-color)] sm:bg-transparent p-3 sm:p-0 rounded-[var(--radius-card-nested,10px)] border sm:border-0 border-[var(--border-subtle)]">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--bg-color)] sm:bg-[var(--surface-color)] border sm:border-0 border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Lock size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Säker och privat</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">Din information är din.</p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-[var(--surface-color)] sm:bg-transparent p-3 sm:p-0 rounded-[var(--radius-card-nested,10px)] border sm:border-0 border-[var(--border-subtle)]">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--bg-color)] sm:bg-[var(--surface-color)] border sm:border-0 border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Sparkles size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Byggd för enkelhet</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">Fokus på det som hjälper.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SÅ FUNGERAR DEJZ */}
      <section id="how-it-works" className="py-24 bg-[var(--surface-color)] border-y border-[var(--border-subtle)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-14">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-snug">
              Så fungerar Dejz
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)]">
              Tre enkla steg till bättre koll på pengarna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Block 1 */}
            <Card variant="default" padding="lg" className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-bold text-sm flex items-center justify-center">
                  1
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Periodkalkyl</h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  Fyll i din inkomst, fasta kostnader och sparande. Dejz räknar ut vad du faktiskt har kvar.
                </p>
              </div>

              <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,10px)] p-4 border border-[var(--border-subtle)] space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Inkomst</span>
                  <span className="font-semibold text-[var(--text-primary)]">25 000 kr</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Fasta kostnader</span>
                  <span className="font-semibold text-[var(--text-primary)]">−12 000 kr</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Sparande</span>
                  <span className="font-semibold text-[var(--text-primary)]">−3 000 kr</span>
                </div>
                <div className="border-t border-[var(--border-subtle)] pt-2 flex justify-between font-bold text-[var(--text-primary)] text-sm">
                  <span>Kvar att spendera</span>
                  <span className="text-emerald-600">10 000 kr</span>
                </div>
              </div>
            </Card>

            {/* Block 2 */}
            <Card variant="default" padding="lg" className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-bold text-sm flex items-center justify-center">
                  2
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Registrera utgifter</h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  Lägg snabbt till dina köp och välj kategori.
                </p>
              </div>

              <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,10px)] p-4 border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between bg-[var(--bg-color)] p-3 rounded-[var(--radius-card-nested,10px)] border border-[var(--border-subtle)] shadow-xs">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Lunch</span>
                  <span className="text-sm font-bold text-rose-600">−120 kr</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] px-1">
                  <Receipt size={14} className="text-[var(--text-tertiary)]" />
                  <span>Bifoga kvitto</span>
                </div>
              </div>
            </Card>

            {/* Block 3 */}
            <Card variant="default" padding="lg" className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-bold text-sm flex items-center justify-center">
                  3
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Se vad du kan spendera</h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  När du registrerar nya utgifter uppdaterar Dejz automatiskt hur mycket du har kvar.
                </p>
              </div>

              <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,10px)] p-4 border border-[var(--border-subtle)] space-y-1.5 text-center">
                <span className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider">Kvar att spendera</span>
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  10 000 kr
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">Uppdateras i realtid</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. STOR PRODUKTSEKTION ("Din ekonomi, på dina villkor") */}
      <section id="features" className="py-24 bg-[var(--bg-color)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Image */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[340px] sm:max-w-[380px] relative rounded-[var(--radius-card,16px)] overflow-hidden shadow-subtle border border-[var(--border-subtle)] bg-[var(--surface-color)]">
                <img 
                  src="/IMG_3049.PNG" 
                  alt="Din ekonomi, på dina villkor" 
                  className="w-full h-auto object-cover object-center block"
                />
              </div>
            </div>

            {/* Right Text */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-snug">
                  Din ekonomi, på dina villkor.
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
                  Dejz hjälper dig att få full kontroll över vardagsekonomin. Ingen bankkoppling och inga onödigt komplicerade verktyg – bara en tydlig överblick över dina pengar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Manuell inmatning – du bestämmer</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Smarta analyser</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Koll från lön till lön</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Säker och privat</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Kvitton och historik</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Ingen data säljs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ALLT DU BEHÖVER – SAMLAT PÅ ETT STÄLLE */}
      <section className="py-24 bg-[var(--surface-color)] border-y border-[var(--border-subtle)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <Card variant="default" padding="lg" className="p-8 sm:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Content */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-[1.25] max-w-sm">
                    Allt du behöver<br />
                    – samlat på ett ställe.
                  </h2>
                  <p className="text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed max-w-md">
                    Se dina utgifter, budget, historik och analyser på ett och samma ställe.
                  </p>
                </div>

                <div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onGetStarted}
                  >
                    Kom igång gratis
                  </Button>
                </div>
              </div>

              {/* Right Content */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2.5">
                  <PlaceholderBox id="HOME_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Hem</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">Se vad du kan spendera.</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="HISTORY_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Historik</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">Alla dina transaktioner samlade.</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="ANALYSIS_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Analys</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">Förstå vart pengarna går.</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="ECONOMY_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Ekonomi</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">Hantera inkomster och fasta utgifter.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 8. BETA TESTERS SOCIAL PROOF SECTION */}
      <section className="py-24 bg-[var(--bg-color)] border-b border-[var(--border-subtle)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shadow-2xs">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
              <span>4.9 av 5 i betyg bland 20+ tidiga betatestare</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold font-display tracking-tight text-[var(--text-primary)]">
              Vad säger de som provat?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)]">
              Dejz har testats av över 20 tidiga användare för att säkerställa att upplevelsen sitter perfekt från dag ett.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default" padding="lg" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] italic leading-relaxed">
                  &quot;Slutligen en app som inte kräver krångliga bankkopplingar. Har äntligen full koll på pengarna mellan lönerna!&quot;
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center">
                  ML
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Marcus Lindström</h4>
                  <p className="text-xs text-[var(--text-tertiary)]">Betatestare (Stockholm)</p>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="lg" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] italic leading-relaxed">
                  &quot;Periodkalkylen är guld värd. Man ser direkt vad som faktiskt finns kvar att spendera efter alla fasta utgifter.&quot;
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center">
                  SK
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Sofia Karlsson</h4>
                  <p className="text-xs text-[var(--text-tertiary)]">Betatestare (Göteborg)</p>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="lg" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] italic leading-relaxed">
                  &quot;Superenkel, snabb och stilren design. Precis det ekonomiverktyg jag har letat efter i flera år.&quot;
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center">
                  AE
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Alexander Ek</h4>
                  <p className="text-xs text-[var(--text-tertiary)]">Betatestare (Malmö)</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="py-24 bg-[var(--bg-color)]">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)]">
            Vanliga frågor
          </h2>

          <div className="space-y-0">
            <FAQItem 
              question="Är Dejz gratis att använda?" 
              answer="Ja, du kan komma igång och använda grundläggande funktioner helt gratis." 
            />
            <FAQItem 
              question="Hur fungerar Dejz utan bankkoppling?" 
              answer="Du lägger enkelt till dina transaktioner manuellt, via röstinmatning eller genom att fota kvitton. Det ger dig fullständig kontroll och ökad medvetenhet om varje köp utan att dela dina bankinloggningsuppgifter." 
            />
            <FAQItem 
              question="Kan jag testa Dejz innan jag skapar konto?" 
              answer="Absolut! Du kan klicka på 'Testa demo direkt' för att utforska appen med färdig demo-data direkt i webbläsaren." 
            />
            <FAQItem 
              question="Hur fungerar perioderna mellan två löner?" 
              answer="Du ställer in din egen lönedag (t.ex. den 25:e i månaden). Dejz räknar sedan automatiskt ut din budgetperiod och dagsbudget fram till nästa lön." 
            />
          </div>
        </div>
      </section>

      {/* 10. SLUTLIG CTA */}
      <section className="py-12 px-6 sm:px-8 max-w-[1240px] mx-auto">
        <div className="bg-[#0f172a] text-white rounded-[var(--radius-card,16px)] p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-subtle border border-[var(--border-subtle)]">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-xl sm:text-3xl font-semibold font-display tracking-tight text-white leading-snug">
              Redo att få koll på ekonomin?
            </h2>
            <p className="text-slate-300 text-sm sm:text-lg font-medium leading-relaxed">
              Kom igång med Dejz på några minuter.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto">
            {onGoogleLogin && (
              <Button
                variant="outline"
                size="lg"
                onClick={onGoogleLogin}
                className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 border-none gap-2.5 font-bold"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Fortsätt med Google
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              className="w-full sm:w-auto font-bold"
            >
              Kom igång gratis
            </Button>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="py-12 border-t border-[var(--border-subtle)] mt-12 bg-[var(--bg-color)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2 select-none">
            <DejzLogo className="text-xl font-bold tracking-tight text-[var(--text-primary)]" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Funktioner</a>
            <button onClick={() => setActivePolicy('privacy')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">Integritetspolicy</button>
            <button onClick={() => setActivePolicy('terms')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">Användarvillkor</button>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">Kontakt</a>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <span className="text-xs text-[var(--text-tertiary)] font-medium">© 2026 Dejz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
