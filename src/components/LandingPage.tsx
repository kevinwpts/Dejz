import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown,
  ChevronRight,
  ArrowUp,
  Instagram,
  Check,
  Shield,
  Trash2,
  Lock,
  ArrowRight
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

// Custom high-end mockup placeholder component
const MockupPlaceholder = ({ name, className }: { name: string; className?: string }) => (
  <div className={`relative bg-[#F6F5F3] border border-[#ECEBE8] rounded-[24px] overflow-hidden flex flex-col items-center justify-center p-8 text-center min-h-[320px] sm:min-h-[400px] shadow-sm select-none transition-all duration-300 hover:border-neutral-300 ${className}`}>
    <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none" />
    <div className="w-14 h-14 rounded-full bg-[#ECEBE8] flex items-center justify-center text-neutral-400 mb-4 text-xl shadow-2xs">
      📷
    </div>
    <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#05020E]/50">
      [ {name} ]
    </span>
    <p className="text-[10px] sm:text-xs text-neutral-400 mt-2 font-medium">Färdig mockup placeras här</p>
  </div>
);

// FAQ Accordion Item
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-[#ECEBE8] transition-all duration-300 py-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left group cursor-pointer"
      >
        <span className={`text-base sm:text-lg font-semibold tracking-tight transition-colors duration-200 ${isOpen ? 'text-[#05020E]' : 'text-[#05020E]/70 group-hover:text-[#05020E]'}`}>
          {question}
        </span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border ${
          isOpen ? 'bg-[#05020E] text-white border-[#05020E] rotate-180 shadow-2xs' : 'bg-white text-[#05020E]/50 border-[#ECEBE8] group-hover:bg-neutral-50'
        }`}>
          <ChevronDown size={14} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="pb-6 pr-8">
              <p className="text-[#05020E]/70 leading-relaxed font-medium text-sm sm:text-base">
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
  onFacebookLogin, 
  onLegalClick, 
  currentLanguage, 
  onLanguageChange, 
  t: _t 
}: LandingPageProps) {
  const [activePolicy, setActivePolicy] = React.useState<string | null>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh bg-white text-[#05020E] font-sans overflow-x-hidden relative selection:bg-[#FCA311] selection:text-white">
      {/* Premium subtle layout container */}
      <div className="relative z-10 flex flex-col min-h-dvh">
        
        {/* ==================================================
            6. HEADER (Sticky Navigation)
            ================================================== */}
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/90 border-b border-[#ECEBE8] pt-[env(safe-area-inset-top)] transition-all">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
            {/* Left side: Logo */}
            <div className="flex items-center gap-12">
              <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <DejzLogo className="text-2xl font-black tracking-tight" textColor="#05020E" />
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#05020E]/70">
                <a href="#sa-fungerar-det" className="hover:text-[#05020E] transition-colors">Så fungerar det</a>
                <a href="#funktioner" className="hover:text-[#05020E] transition-colors">Funktioner</a>
                <a href="#integritet" className="hover:text-[#05020E] transition-colors">Integritet</a>
                <a href="#faq" className="hover:text-[#05020E] transition-colors">Vanliga frågor</a>
              </div>
            </div>

            {/* Right side: Login and Get Started */}
            <div className="flex items-center gap-3">
              {onLogin && (
                <button 
                  onClick={onLogin}
                  className="text-xs sm:text-sm font-medium text-[#05020E]/70 hover:text-[#05020E] transition-colors px-4 py-2.5 rounded-[12px] cursor-pointer"
                >
                  Logga in
                </button>
              )}
              <button 
                onClick={onGetStarted}
                className="px-5 py-3 rounded-[14px] bg-[#05020E] text-white hover:bg-neutral-900 transition-all font-semibold text-xs sm:text-sm active:scale-95 cursor-pointer shadow-xs"
              >
                Kom igång gratis
              </button>
            </div>
          </div>
        </nav>

        {/* ==================================================
            7. HERO SECTION
            ================================================== */}
        <section className="w-full pt-[calc(8rem+env(safe-area-inset-top))] pb-20 md:pb-32 px-6 sm:px-10 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-20">
            {/* Left Column: Copy & Actions */}
            <div className="flex-1 space-y-8 text-center lg:text-left max-w-xl">
              <div className="space-y-4">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
                  DIN EKONOMI MELLAN TVÅ LÖNER
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#05020E] leading-[1.08] font-sans">
                  Få pengarna att räcka.<br />
                  Hela vägen till nästa lön.
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-[#05020E]/60 font-medium leading-relaxed font-sans max-w-lg mx-auto lg:mx-0">
                  Dejz räknar ut hur mycket du faktiskt har att röra dig med efter räkningar och sparande – och hjälper dig hålla koll hela vägen till nästa lön.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button 
                  onClick={onGetStarted} 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[16px] bg-[#05020E] text-white hover:bg-neutral-900 transition-all font-semibold text-sm sm:text-base cursor-pointer text-center"
                >
                  <span>Kom igång gratis</span>
                  <ChevronRight size={16} />
                </button>

                {onStartDemo && (
                  <button
                    onClick={onStartDemo}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[16px] bg-[#FAFAF9] hover:bg-[#F6F5F3] text-[#05020E] border border-[#ECEBE8] transition-all font-semibold text-sm sm:text-base cursor-pointer text-center"
                  >
                    <span>Testa demo</span>
                  </button>
                )}
              </div>

              {/* Trust Text */}
              <p className="text-[11px] font-semibold text-[#05020E]/40 tracking-wider">
                Ingen bankkoppling • Gratis att komma igång
              </p>
            </div>

            {/* Right Column: HERO_MOCKUP Placeholder */}
            <div className="flex-1 w-full max-w-xl">
              <MockupPlaceholder name="HERO_MOCKUP" className="w-full max-w-md mx-auto aspect-3/4" />
            </div>
          </div>
        </section>

        {/* ==================================================
            8. PROBLEM / VÄRDE SECTION
            ================================================== */}
        <section className="w-full py-20 md:py-32 px-6 sm:px-10 bg-[#FAFAF9] border-t border-b border-[#ECEBE8]">
          <div className="max-w-7xl mx-auto space-y-16">
            {/* Problem intro */}
            <div className="max-w-2xl text-center lg:text-left space-y-4">
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
                DET ÄR INTE SALDOT SOM ÄR PROBLEMET
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#05020E] leading-tight">
                Pengar på kontot är inte samma sak som pengar du kan spendera.
              </h2>
              <p className="text-base sm:text-lg text-[#05020E]/60 font-medium leading-relaxed">
                Lönen kommer in. Räkningarna ska betalas. Du vill kanske lägga undan pengar. Och resten ska räcka hela vägen till nästa lön. Dejz gör det enkelt att se vad du faktiskt har att röra dig med – utan kalkylblad, huvudräkning eller gissningar.
              </p>
            </div>

            {/* Minimalist calculation example directly on page */}
            <div className="w-full max-w-xl mx-auto lg:mx-0 bg-white border border-[#ECEBE8] rounded-[24px] p-8 sm:p-10 space-y-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm sm:text-base pb-3 border-b border-[#ECEBE8]/50">
                  <span className="font-medium text-[#05020E]/60">Inkomst</span>
                  <span className="font-bold text-[#05020E] font-amount text-base sm:text-lg">25 000 kr</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base pb-3 border-b border-[#ECEBE8]/50">
                  <span className="font-medium text-[#05020E]/60">Fasta utgifter</span>
                  <span className="font-bold text-[#05020E]/80 font-amount text-base sm:text-lg">−12 000 kr</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base pb-3 border-b border-[#ECEBE8]/50">
                  <span className="font-medium text-[#05020E]/60">Sparande</span>
                  <span className="font-bold text-[#05020E]/80 font-amount text-base sm:text-lg">−3 000 kr</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-[#05020E]/40 uppercase block">Kvar att leva på</span>
                  <div className="flex items-baseline gap-1 relative">
                    <span className="text-4xl sm:text-5xl font-black text-[#05020E] font-amount">10 000 kr</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FCA311] inline-block animate-pulse shrink-0 ml-1.5 self-center" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            9. SÅ FUNGERAR DEJZ SECTION
            ================================================== */}
        <section id="sa-fungerar-det" className="w-full py-20 md:py-32 px-6 sm:px-10 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
                SÅ FUNGERAR DEJZ
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#05020E] leading-tight">
                Från lön till nästa lön.<br />Utan att behöva gissa.
              </h2>
              <p className="text-base sm:text-lg text-[#05020E]/60 font-medium max-w-md mx-auto">
                Du lägger in grunden. Dejz håller koll på resten.
              </p>
            </div>

            {/* Editorial large steps block */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-14 pt-6">
              <div className="space-y-4">
                <div className="text-5xl sm:text-6xl font-black text-[#ECEBE8] select-none font-amount">01</div>
                <h3 className="text-lg font-bold text-[#05020E]">Lägg in dina inkomster</h3>
                <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                  Börja med pengarna du får in under perioden.
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-5xl sm:text-6xl font-black text-[#ECEBE8] select-none font-amount">02</div>
                <h3 className="text-lg font-bold text-[#05020E]">Lägg till det som måste ut</h3>
                <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                  Hyra, abonnemang, försäkringar och andra fasta utgifter.
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-5xl sm:text-6xl font-black text-[#ECEBE8] select-none font-amount">03</div>
                <h3 className="text-lg font-bold text-[#05020E]">Bestäm vad du vill spara</h3>
                <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                  Välj hur mycket du vill lägga undan innan du börjar spendera.
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-5xl sm:text-6xl font-black text-[#ECEBE8] select-none font-amount">04</div>
                <h3 className="text-lg font-bold text-[#05020E]">Se vad du faktiskt kan använda</h3>
                <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                  Dejz visar vad du har kvar och hjälper dig fördela pengarna fram till nästa lön.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            10. DYNAMIKEN I DEJZ (Mörk Sektion)
            ================================================== */}
        <section className="w-full py-20 md:py-32 px-6 sm:px-10 bg-[#05020E] text-white">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-16 lg:gap-24">
            
            {/* Copy */}
            <div className="space-y-6 max-w-xl">
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#FCA311] uppercase block">
                DEJZ FÖLJER MED
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Spendera mer idag.<br />Ha mindre kvar framåt.<br />Och tvärtom.
              </h2>
              <p className="text-base sm:text-lg text-white/70 font-medium leading-relaxed">
                Dejz följer med när du spenderar. Använder du mindre än planerat får du mer utrymme framåt. Spenderar du mer anpassas resten av perioden automatiskt. Du behöver inte räkna om någonting själv.
              </p>
            </div>

            {/* Typography-driven graphic demonstration (Editorial layout, not a mockup) */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 sm:p-12 space-y-8 relative overflow-hidden max-w-lg lg:max-w-none">
              <div className="space-y-4">
                {/* 10 000 kr kvar */}
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-semibold opacity-55">Huvudbudget</span>
                  <span className="text-3xl sm:text-4xl font-bold font-amount text-white">10 000 kr kvar</span>
                </div>
                {/* -650 kr spent */}
                <div className="flex justify-between items-baseline text-[#FCA311]">
                  <span className="text-xs sm:text-sm font-semibold">Ny registrering</span>
                  <span className="text-xl sm:text-2xl font-bold font-amount">− 650 kr spenderat</span>
                </div>
                <div className="h-px bg-white/10 my-4" />
                {/* 9 350 kr kvar */}
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-xs sm:text-sm font-semibold opacity-80">Automatisk anpassning</span>
                  <span className="text-3xl sm:text-4xl font-extrabold font-amount text-white">9 350 kr kvar</span>
                </div>
              </div>

              {/* Tagline */}
              <div className="bg-[#FCA311]/10 text-[#FCA311] border border-[#FCA311]/20 py-2.5 px-4 rounded-[14px] text-xs sm:text-sm font-semibold inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCA311] inline-block animate-ping" />
                <span>Dejz anpassar resten av perioden automatiskt</span>
              </div>
            </div>

          </div>
        </section>

        {/* ==================================================
            11. PRODUKTVISNING / FUNKTIONER
            ================================================== */}
        <section id="funktioner" className="w-full py-20 md:py-32 px-6 sm:px-10 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto space-y-24 md:space-y-36">
            
            {/* Sektions-header */}
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
                DEJZ I PRAKTIKEN
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#05020E] leading-tight">
                Allt du behöver för att hålla koll. Inget du inte behöver.
              </h2>
            </div>

            {/* Alternating large feature blocks */}
            <div className="space-y-24 md:space-y-36">
              
              {/* Row 1: ÖVERSIKT */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
                <div className="flex-1 space-y-4 max-w-xl">
                  <span className="text-[11px] font-bold tracking-widest text-[#05020E]/40 uppercase block">
                    ÖVERSIKT
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#05020E]">
                    Vet vad du har att röra dig med.
                  </h3>
                  <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                    Se vad som finns kvar under perioden, hur länge pengarna ska räcka och hur din ekonomi ligger till.
                  </p>
                </div>
                <div className="flex-1 w-full max-w-xl">
                  <MockupPlaceholder name="OVERVIEW_MOCKUP" className="w-full aspect-4/3" />
                </div>
              </div>

              {/* Row 2: BUDGET */}
              <div className="flex flex-col lg:flex-row-reverse items-center justify-between gap-12 lg:gap-20">
                <div className="flex-1 space-y-4 max-w-xl">
                  <span className="text-[11px] font-bold tracking-widest text-[#05020E]/40 uppercase block">
                    BUDGET
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#05020E]">
                    Se vad som kommer in och vad som måste ut.
                  </h3>
                  <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                    Samla inkomster, fasta utgifter och sparande och få en tydlig bild av vad som faktiskt finns kvar.
                  </p>
                </div>
                <div className="flex-1 w-full max-w-xl">
                  <MockupPlaceholder name="BUDGET_MOCKUP" className="w-full aspect-4/3" />
                </div>
              </div>

              {/* Row 3: ANALYS */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
                <div className="flex-1 space-y-4 max-w-xl">
                  <span className="text-[11px] font-bold tracking-widest text-[#05020E]/40 uppercase block">
                    ANALYS
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#05020E]">
                    Förstå vart pengarna går.
                  </h3>
                  <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                    Se din spendering per kategori och förstå vilka delar av vardagen som påverkar ekonomin mest.
                  </p>
                </div>
                <div className="flex-1 w-full max-w-xl">
                  <MockupPlaceholder name="ANALYSIS_MOCKUP" className="w-full aspect-4/3" />
                </div>
              </div>

              {/* Row 4: HISTORIK */}
              <div className="flex flex-col lg:flex-row-reverse items-center justify-between gap-12 lg:gap-20">
                <div className="flex-1 space-y-4 max-w-xl">
                  <span className="text-[11px] font-bold tracking-widest text-[#05020E]/40 uppercase block">
                    HISTORIK
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#05020E]">
                    Allt som hänt. På ett ställe.
                  </h3>
                  <p className="text-sm sm:text-base text-[#05020E]/60 font-medium leading-relaxed">
                    Se tidigare transaktioner och följ din spendering över tid.
                  </p>
                </div>
                <div className="flex-1 w-full max-w-xl">
                  <MockupPlaceholder name="HISTORY_MOCKUP" className="w-full aspect-4/3" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            12. DEJZI SECTION
            ================================================== */}
        <section className="w-full py-20 md:py-32 px-6 sm:px-10 bg-[#FAF9F6]">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
              MÖT DEJZI
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#05020E] max-w-2xl mx-auto leading-tight">
              Siffrorna berättar vad som hänt. Dejzi hjälper dig förstå vad det betyder.
            </h2>
            <p className="text-base sm:text-lg text-[#05020E]/60 font-medium leading-relaxed max-w-xl mx-auto">
              Dejzi hjälper dig tolka din ekonomi och visar hur din spendering påverkar resten av perioden. Inte bara vad som har hänt – utan vad det innebär framåt.
            </p>
            <div className="pt-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FCA311]/10 text-[#FCA311] text-xs font-bold uppercase tracking-wider">
                🌟 Smart analys direkt i appen
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================
            13. ALLA ENHETER
            ================================================== */}
        <section className="w-full py-20 md:py-32 px-6 sm:px-10 bg-white border-t border-b border-[#ECEBE8]">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="flex-1 space-y-6 max-w-xl">
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
                DEJZ FÖLJER MED
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#05020E] leading-tight">
                Mobil, surfplatta eller dator.
              </h2>
              <p className="text-base sm:text-lg text-[#05020E]/60 font-medium leading-relaxed">
                Dejz är en webbapp som fungerar på alla dina enheter. Logga en utgift i mobilen och fortsätt där du slutade på datorn.
              </p>
            </div>
            <div className="flex-1 w-full max-w-xl">
              <MockupPlaceholder name="DEVICES_MOCKUP" className="w-full aspect-4/3" />
            </div>
          </div>
        </section>

        {/* ==================================================
            14. INTEGRITET
            ================================================== */}
        <section id="integritet" className="w-full py-20 md:py-32 px-6 sm:px-10 bg-white scroll-mt-20">
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
                INTEGRITET
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#05020E] leading-tight">
                Din ekonomi. Din kontroll.
              </h2>
              <p className="text-base sm:text-lg text-[#05020E]/60 font-medium max-w-md mx-auto">
                Dejz kräver ingen bankkoppling. Du väljer själv vilken ekonomisk information du lägger in och behåller kontrollen över din data.
              </p>
            </div>

            {/* Three key points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="p-8 rounded-[20px] bg-[#FAFAF9] border border-[#ECEBE8] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#ECEBE8] flex items-center justify-center text-neutral-600 mx-auto">
                  <Shield size={20} />
                </div>
                <h3 className="text-base font-bold text-[#05020E]">Ingen bankkoppling</h3>
                <p className="text-xs sm:text-sm text-[#05020E]/60 font-medium leading-relaxed">
                  Du kopplar inga bankkonton. All inmatning sker tryggt på dina egna villkor.
                </p>
              </div>

              <div className="p-8 rounded-[20px] bg-[#FAFAF9] border border-[#ECEBE8] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#ECEBE8] flex items-center justify-center text-neutral-600 mx-auto">
                  <Lock size={20} />
                </div>
                <h3 className="text-base font-bold text-[#05020E]">Du bestämmer vad du registrerar</h3>
                <p className="text-xs sm:text-sm text-[#05020E]/60 font-medium leading-relaxed">
                  Du har full kontroll över vilka transaktioner och belopp du vill lagra och spåra.
                </p>
              </div>

              <div className="p-8 rounded-[20px] bg-[#FAFAF9] border border-[#ECEBE8] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#ECEBE8] flex items-center justify-center text-neutral-600 mx-auto">
                  <Trash2 size={20} />
                </div>
                <h3 className="text-base font-bold text-[#05020E]">Radera din data när du vill</h3>
                <p className="text-xs sm:text-sm text-[#05020E]/60 font-medium leading-relaxed">
                  Ditt konto är helt och hållet ditt. Du kan ta bort all data permanent när du vill.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            16. DEMO SECTION
            ================================================== */}
        <section className="w-full py-20 md:py-32 px-6 sm:px-10 bg-[#FAFAF9] border-t border-b border-[#ECEBE8]">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="flex-1 space-y-6 max-w-xl">
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#05020E]/50 uppercase block">
                TESTA SJÄLV
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#05020E] leading-tight">
                Förstå Dejz på några sekunder.
              </h2>
              <p className="text-base sm:text-lg text-[#05020E]/60 font-medium leading-relaxed">
                Utforska Dejz med exempeldata och se hur din ekonomi förändras när du registrerar utgifter – utan att skapa ett konto.
              </p>
              
              {onStartDemo && (
                <div className="space-y-2.5">
                  <button 
                    onClick={onStartDemo} 
                    className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[16px] bg-[#05020E] text-white hover:bg-neutral-900 transition-all font-semibold text-sm sm:text-base cursor-pointer text-center"
                  >
                    <span>Testa demo</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <p className="text-xs font-semibold text-[#05020E]/40 pl-1">
                    Ingen registrering krävs.
                  </p>
                </div>
              )}
            </div>
            <div className="flex-1 w-full max-w-xl">
              <MockupPlaceholder name="DEMO_MOCKUP" className="w-full aspect-4/3" />
            </div>
          </div>
        </section>

        {/* ==================================================
            17. SLUTLIG CTA (Mörk Sektion)
            ================================================== */}
        <section className="w-full py-24 md:py-36 px-6 sm:px-10 bg-[#05020E] text-white text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Få pengarna att räcka.<br />Hela vägen.
            </h2>
            <p className="text-base sm:text-lg text-white/70 font-medium max-w-xl mx-auto leading-relaxed">
              Se vad du faktiskt har att röra dig med och låt Dejz hjälpa dig hålla koll fram till nästa lön.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={onGetStarted} 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[16px] bg-white text-[#05020E] hover:bg-neutral-100 transition-all font-semibold text-sm sm:text-base cursor-pointer text-center"
              >
                <span>Kom igång gratis</span>
              </button>

              {onStartDemo && (
                <button
                  onClick={onStartDemo}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[16px] bg-transparent hover:bg-white/5 text-white border border-white/20 transition-all font-semibold text-sm sm:text-base cursor-pointer text-center"
                >
                  <span>Testa demo</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ==================================================
            18. FAQ SECTION
            ================================================== */}
        <section id="faq" className="w-full py-20 md:py-32 px-6 sm:px-10 bg-white scroll-mt-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#05020E]">
                Vanliga frågor
              </h2>
              <p className="text-sm sm:text-base text-[#05020E]/60 font-medium">
                Hittar du inte svaret du söker? Kontakta oss på <a href="mailto:hej@dejz.se" className="text-[#FCA311] hover:underline">hej@dejz.se</a>
              </p>
            </div>

            {/* Accordion List */}
            <div className="space-y-1">
              <FAQItem 
                question="Vad är Dejz?" 
                answer="Dejz är en webbapp som hjälper dig hålla koll på hur mycket du faktiskt har att spendera mellan två löner." 
              />
              <FAQItem 
                question="Hur räknar Dejz ut vad jag kan spendera?" 
                answer="Dejz utgår från dina inkomster, fasta utgifter, sparande och registrerade utgifter och visar vad som finns kvar under perioden." 
              />
              <FAQItem 
                question="Vad händer när jag spenderar pengar?" 
                answer="När du registrerar en utgift uppdaterar Dejz vad du har kvar och anpassar ditt utrymme för resten av perioden." 
              />
              <FAQItem 
                question="Behöver jag koppla mitt bankkonto?" 
                answer="Nej. Dejz kräver ingen bankkoppling. Du registrerar själv den information du vill använda i appen." 
              />
              <FAQItem 
                question="Vad kostar Dejz?" 
                answer="Dejz är gratis att komma igång med." 
              />
              <FAQItem 
                question="Kan jag testa Dejz utan konto?" 
                answer="Ja. Du kan använda demoläget och utforska Dejz med exempeldata utan att skapa ett konto." 
              />
              <FAQItem 
                question="Fungerar Dejz på mobilen?" 
                answer="Ja. Dejz är en webbapp som är byggd för att fungera på mobil, surfplatta och dator." 
              />
            </div>
          </div>
        </section>

        {/* ==================================================
            19. FOOTER
            ================================================== */}
        <footer className="w-full bg-[#FAFAF9] border-t border-[#ECEBE8] py-16 sm:py-24 px-6 sm:px-10 text-[#05020E]/80">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 sm:gap-16 pb-16 border-b border-[#ECEBE8]">
            
            {/* Column 1: Brand details */}
            <div className="lg:col-span-2 space-y-4">
              <DejzLogo className="text-2xl font-black tracking-tight" textColor="#05020E" />
              <p className="text-sm text-[#05020E]/60 max-w-xs font-medium leading-relaxed">
                Få pengarna att räcka hela vägen till nästa lön.
              </p>
            </div>

            {/* Column 2: Produkt */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#05020E]/40 uppercase block">Produkt</span>
              <ul className="space-y-2.5 text-sm font-medium text-[#05020E]/70">
                <li><a href="#sa-fungerar-det" className="hover:text-[#05020E] transition-colors">Så fungerar det</a></li>
                <li><a href="#funktioner" className="hover:text-[#05020E] transition-colors">Funktioner</a></li>
                {onStartDemo && (
                  <li><button onClick={onStartDemo} className="hover:text-[#05020E] transition-colors text-left cursor-pointer">Testa demo</button></li>
                )}
              </ul>
            </div>

            {/* Column 3: Dejz */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#05020E]/40 uppercase block">Dejz</span>
              <ul className="space-y-2.5 text-sm font-medium text-[#05020E]/70">
                {onLogin && (
                  <li><button onClick={onLogin} className="hover:text-[#05020E] transition-colors text-left cursor-pointer">Logga in</button></li>
                )}
                <li><button onClick={onGetStarted} className="hover:text-[#05020E] transition-colors text-left cursor-pointer">Kom igång gratis</button></li>
              </ul>
            </div>

            {/* Column 4: Juridiskt / Kontakt */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#05020E]/40 uppercase block">Juridiskt</span>
              <ul className="space-y-2.5 text-sm font-medium text-[#05020E]/70">
                <li>
                  <button 
                    onClick={() => onLegalClick ? onLegalClick('privacy') : setActivePolicy('privacy')} 
                    className="hover:text-[#05020E] transition-colors cursor-pointer text-left"
                  >
                    Integritetspolicy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onLegalClick ? onLegalClick('terms') : setActivePolicy('terms')} 
                    className="hover:text-[#05020E] transition-colors cursor-pointer text-left"
                  >
                    Användarvillkor
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onLegalClick ? onLegalClick('cookies') : setActivePolicy('cookies')} 
                    className="hover:text-[#05020E] transition-colors cursor-pointer text-left"
                  >
                    Cookies
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer block */}
          <div className="max-w-7xl mx-auto pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#05020E]/50 font-medium">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <span>© {new Date().getFullYear()} Dejz. Alla rättigheter förbehållna.</span>
              <a 
                href="https://instagram.com/dejz.se" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#05020E] transition-colors"
              >
                <Instagram size={13} className="text-[#E1306C]" />
                <span>Instagram</span>
              </a>
              <a href="mailto:hej@dejz.se" className="hover:text-[#05020E] transition-colors">hej@dejz.se</a>
            </div>

            {/* Go to top */}
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 hover:text-[#05020E] transition-colors cursor-pointer"
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
                <div className="space-y-6 text-sm text-[#05020E]">
                  <section className="space-y-2 text-left">
                    <h3 className="text-base font-bold">1. Godkännande av villkor</h3>
                    <p className="text-[#05020E]/70 font-medium">
                      Genom att registrera ett konto eller använda Dejz godkänner du dessa användarvillkor.
                    </p>
                  </section>
                  <section className="space-y-2 text-left">
                    <h3 className="text-base font-bold">2. Tjänstens omfattning</h3>
                    <p className="text-[#05020E]/70 font-medium">
                      Dejz är ett digitalt verktyg för personlig budgetering och ekonomisk överblick. Beräkningar och prognoser är vägledande och utgör inte professionell finansiell rådgivning.
                    </p>
                  </section>
                  <section className="space-y-2 text-left">
                    <h3 className="text-base font-bold">3. Ansvarsbegränsning</h3>
                    <p className="text-[#05020E]/70 font-medium">
                      Användaren ansvarar själv för sina ekonomiska beslut. Vi tar inget ansvar för eventuella ekonomiska förluster till följd av användning av appen.
                    </p>
                  </section>
                </div>
              ) : (
                <div className="space-y-6 text-sm text-left text-[#05020E]">
                  <section className="space-y-2">
                    <h3 className="text-base font-bold">Cookiepolicy</h3>
                    <p className="text-[#05020E]/70 font-medium">
                      Enligt lagen om elektronisk kommunikation informeras om att vi endast använder nödvändiga cookies och lokal lagring (localStorage) för att upprätthålla din inloggningssession och dina personliga inställningar. Inga spårnings- eller marknadsföringscookies från tredje part används.
                    </p>
                  </section>
                </div>
              )
            }
          />
        </footer>

      </div>
    </div>
  );
}
