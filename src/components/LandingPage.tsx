import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown,
  Shield,
  Lock,
  Sparkles,
  Check,
  Receipt,
  Instagram
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
      className={`relative w-full ${className} rounded-card bg-slate-100/80 border border-dashed border-subtle flex flex-col items-center justify-center p-6 select-none transition-all hover:bg-slate-100`}
    >
      <span className={`font-mono font-semibold tracking-wider text-slate-400 uppercase text-center ${labelClass}`}>
        {id}
      </span>
    </div>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-subtle transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 sm:py-6 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
      >
        <span className={`text-base sm:text-lg font-bold tracking-tight transition-colors pr-6 ${isOpen ? 'text-slate-900' : 'text-slate-800 group-hover:text-slate-900'}`}>
          {question}
        </span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${isOpen ? 'rotate-180 bg-slate-200 text-slate-900' : 'text-slate-500 group-hover:text-slate-900 bg-slate-100'}`}>
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
              <p className="text-slate-600 leading-relaxed font-normal text-sm sm:text-base">
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
    <div className="min-h-dvh font-sans text-slate-900 bg-white relative selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)] light" style={{ colorScheme: 'light' }}>
      {/* Policy Modal */}
      <PolicyModal 
        isOpen={activePolicy !== null}
        type={activePolicy || 'privacy'}
        onClose={() => setActivePolicy(null)}
      />

      {/* HEADER (Clean background, safe area padding for dynamic island / notch) */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/95 border-b border-subtle transition-all pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center select-none cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <DejzLogo className="text-2xl font-black tracking-tight text-slate-900" />
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a 
                href="#how-it-works" 
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Så fungerar det
              </a>
              <a 
                href="#features" 
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Funktioner
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {onLogin && (
              <button
                onClick={onLogin}
                className="inline-flex items-center justify-center px-4 py-2 rounded-btn text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
              >
                Logga in
              </button>
            )}
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center px-4.5 py-2 rounded-btn text-sm font-semibold text-[var(--text-on-accent)] bg-[var(--accent-color)] hover:opacity-95 transition-all cursor-pointer shadow-subtle active:scale-95"
            >
              Kom igång gratis
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION (Structured container, side-by-side on desktop, stacked on mobile in exact required order) */}
      <section className="relative w-full bg-white pt-6 pb-16 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          
          {/* ==================== DESKTOP LAYOUT (lg:block) ==================== */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-14 items-center">
            {/* LEFT COLUMN: Text, CTAs, Trust */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-semibold font-unbounded tracking-tight text-slate-900 leading-[1.2]">
                  Hela din ekonomi.<br />
                  Svart på vitt.
                </h1>
                <p className="text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
                  Samla inkomster, utgifter, sparande och budget på ett ställe. Se vart pengarna går och få koll på ekonomin mellan två löner.
                </p>
              </div>

              {/* CTA buttons */}
              <div className="space-y-3">
                <div className="flex items-stretch gap-3">
                  <button
                    onClick={onGetStarted}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-btn text-base font-semibold text-[var(--text-on-accent)] bg-[var(--accent-color)] hover:opacity-95 transition-all cursor-pointer shadow-subtle shadow-[var(--accent-color)]/20 active:scale-95"
                  >
                    Kom igång gratis
                  </button>
                  {onStartDemo && (
                    <button
                      onClick={onStartDemo}
                      className="inline-flex items-center justify-center px-6 py-3.5 rounded-btn text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
                    >
                      Testa demo direkt
                    </button>
                  )}
                </div>

                {onGoogleLogin && (
                  <button
                    onClick={onGoogleLogin}
                    className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-btn text-sm font-semibold text-slate-700 bg-white border border-subtle hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Fortsätt med Google
                  </button>
                )}
              </div>

              {/* Trust points */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-icon-button bg-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <Shield size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Ingen bankkoppling</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">Full kontroll över din data.</p>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-icon-button bg-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <Lock size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Säker och privat</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">Din information är din.</p>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-icon-button bg-slate-100 flex items-center justify-center text-slate-700 mb-1">
                    <Sparkles size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Byggd för enkelhet</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">Fokus på det som hjälper.</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Image */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full relative rounded-container overflow-hidden shadow-subtle border border-subtle bg-slate-900">
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
              <h1 className="text-3xl sm:text-4xl font-semibold font-unbounded tracking-tight text-slate-900 leading-[1.25]">
                Hela din ekonomi.<br />
                Svart på vitt.
              </h1>
              <p className="text-base text-slate-600 font-normal leading-relaxed">
                Samla inkomster, utgifter, sparande och budget på ett ställe. Se vart pengarna går och få koll på ekonomin mellan två löner.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <button
                  onClick={onGetStarted}
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-btn text-base font-semibold text-[var(--text-on-accent)] bg-[var(--accent-color)] hover:opacity-95 transition-all cursor-pointer shadow-subtle shadow-[var(--accent-color)]/20 active:scale-95"
                >
                  Kom igång gratis
                </button>
                {onStartDemo && (
                  <button
                    onClick={onStartDemo}
                    className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-btn text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
                  >
                    Testa demo direkt
                  </button>
                )}
              </div>

              {onGoogleLogin && (
                <button
                  onClick={onGoogleLogin}
                  className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-btn text-sm font-semibold text-slate-700 bg-white border border-subtle hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Fortsätt med Google
                </button>
              )}
            </div>

            {/* Hero Image (Separate visual block, responsive crop/position for mobile so phones are main motif) */}
            <div className="w-full relative rounded-card overflow-hidden shadow-subtle border border-subtle bg-slate-900 aspect-[16/11] sm:aspect-[16/10]">
              <img 
                src="/hero.png" 
                alt="Dejz App" 
                className="w-full h-full object-cover object-right block"
              />
            </div>

            {/* Trust points (Compact 3 columns or rows) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-card-nested border sm:border-0 border-subtle">
                <div className="w-7 h-7 rounded-icon-button bg-white sm:bg-slate-100 border sm:border-0 border-subtle flex items-center justify-center text-slate-700 shrink-0">
                  <Shield size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Ingen bankkoppling</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">Full kontroll över din data.</p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-card-nested border sm:border-0 border-subtle">
                <div className="w-7 h-7 rounded-icon-button bg-white sm:bg-slate-100 border sm:border-0 border-subtle flex items-center justify-center text-slate-700 shrink-0">
                  <Lock size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Säker och privat</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">Din information är din.</p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-card-nested border sm:border-0 border-subtle">
                <div className="w-7 h-7 rounded-icon-button bg-white sm:bg-slate-100 border sm:border-0 border-subtle flex items-center justify-center text-slate-700 shrink-0">
                  <Sparkles size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Byggd för enkelhet</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">Fokus på det som hjälper.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SÅ FUNGERAR DEJZ */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-y border-subtle">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-14">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-semibold font-unbounded tracking-tight text-slate-900 leading-snug">
              Så fungerar Dejz
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Tre enkla steg till bättre koll på pengarna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Block 1 */}
            <div className="bg-white rounded-card p-8 border border-subtle shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Periodkalkyl</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Fyll i din inkomst, fasta kostnader och sparande. Dejz räknar ut vad du faktiskt har kvar.
                </p>
              </div>

              <div className="bg-slate-50 rounded-card p-4 border border-subtle space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Inkomst</span>
                  <span className="font-semibold text-slate-900">25 000 kr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Fasta kostnader</span>
                  <span className="font-semibold text-slate-900">−12 000 kr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sparande</span>
                  <span className="font-semibold text-slate-900">−3 000 kr</span>
                </div>
                <div className="border-t border-subtle pt-2 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Kvar att spendera</span>
                  <span className="text-emerald-600">10 000 kr</span>
                </div>
              </div>
            </div>

            {/* Block 2 */}
            <div className="bg-white rounded-card p-8 border border-subtle shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Registrera utgifter</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Lägg snabbt till dina köp och välj kategori.
                </p>
              </div>

              <div className="bg-slate-50 rounded-card p-4 border border-subtle space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-card-nested border border-subtle shadow-xs">
                  <span className="text-sm font-semibold text-slate-800">Lunch</span>
                  <span className="text-sm font-bold text-rose-600">−120 kr</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                  <Receipt size={14} className="text-slate-400" />
                  <span>Bifoga kvitto</span>
                </div>
              </div>
            </div>

            {/* Block 3 */}
            <div className="bg-white rounded-card p-8 border border-subtle shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Se vad du kan spendera</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  När du registrerar nya utgifter uppdaterar Dejz automatiskt hur mycket du har kvar.
                </p>
              </div>

              <div className="bg-slate-50 rounded-card p-4 border border-subtle space-y-1.5 text-center">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kvar att spendera</span>
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  10 000 kr
                </div>
                <div className="text-[11px] text-slate-400">Uppdateras i realtid</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STOR PRODUKTSEKTION ("Din ekonomi, på dina villkor") with IMG_3049.PNG constrained in max-w */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Image (~45% / col-span-5) using IMG_3049.PNG with controlled width */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[340px] sm:max-w-[380px] relative rounded-container overflow-hidden shadow-subtle border border-subtle bg-slate-100">
                <img 
                  src="/IMG_3049.PNG" 
                  alt="Din ekonomi, på dina villkor" 
                  className="w-full h-auto object-cover object-center block"
                />
              </div>
            </div>

            {/* Right Text (~55% / col-span-7) */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-semibold font-unbounded tracking-tight text-slate-900 leading-snug">
                  Din ekonomi, på dina villkor.
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  Dejz hjälper dig att få full kontroll över vardagsekonomin. Ingen bankkoppling och inga onödigt komplicerade verktyg – bara en tydlig överblick över dina pengar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Manuell inmatning – du bestämmer</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Smarta analyser</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Koll från lön till lön</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Säker och privat</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Kvitton och historik</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Ingen data säljs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ALLT DU BEHÖVER – SAMLAT PÅ ETT STÄLLE */}
      <section className="py-24 bg-slate-50 border-y border-subtle">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <div className="bg-white rounded-container p-8 sm:p-12 border border-subtle shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Content (wider left column) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-semibold font-unbounded tracking-tight text-slate-900 leading-[1.25] max-w-sm">
                    Allt du behöver<br />
                    – samlat på ett ställe.
                  </h2>
                  <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
                    Se dina utgifter, budget, historik och analyser på ett och samma ställe.
                  </p>
                </div>

                <div>
                  <button
                    onClick={onGetStarted}
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-btn text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-subtle active:scale-95"
                  >
                    Kom igång gratis
                  </button>
                </div>
              </div>

              {/* Right Content (larger placeholders) */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2.5">
                  <PlaceholderBox id="HOME_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Hem</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">Se vad du kan spendera.</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="HISTORY_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Historik</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">Alla dina transaktioner samlade.</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="ANALYSIS_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Analys</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">Förstå vart pengarna går.</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="ECONOMY_SCREEN" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Ekonomi</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">Hantera inkomster och fasta utgifter.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
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

      {/* 10. SLUTLIG CTA (Mörk avslutande CTA med hög kontrast) */}
      <section className="py-12 px-6 sm:px-8 max-w-[1240px] mx-auto">
        <div className="bg-slate-900 text-white rounded-container p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-subtle border border-subtle">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-xl sm:text-3xl font-semibold font-unbounded tracking-tight text-white leading-snug">
              Redo att få koll på ekonomin?
            </h2>
            <p className="text-slate-200 text-sm sm:text-lg font-medium leading-relaxed">
              Kom igång med Dejz på några minuter.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto">
            {onGoogleLogin && (
              <button
                onClick={onGoogleLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-btn text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 transition-all cursor-pointer shadow-subtle active:scale-95"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Fortsätt med Google
              </button>
            )}
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-btn text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer shadow-subtle active:scale-95"
            >
              Kom igång gratis
            </button>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="py-12 border-t border-subtle mt-12 bg-white">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-600">
          <div className="flex items-center gap-2 select-none">
            <DejzLogo className="text-xl font-bold tracking-tight text-slate-900" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
            <a href="#features" className="hover:text-slate-900 transition-colors">Funktioner</a>
            <button onClick={() => setActivePolicy('privacy')} className="hover:text-slate-900 transition-colors cursor-pointer">Integritetspolicy</button>
            <button onClick={() => setActivePolicy('terms')} className="hover:text-slate-900 transition-colors cursor-pointer">Användarvillkor</button>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">Kontakt</a>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <span className="text-xs text-slate-500 font-medium">© 2026 Dejz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
