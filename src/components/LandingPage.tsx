import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  ArrowRight, 
  Check, 
  Shield, 
  Sliders, 
  HeartHandshake, 
  ArrowDown, 
  Smartphone,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { TranslationKey, Language, languageInfo } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { LanguageFlag } from './LanguageFlag';
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

/**
 * Clean, neutral mockup placeholder designed for quick replacement with real uploaded screenshots.
 * When an image source is added later, simply pass `imageSrc="path/to/image.png"`.
 */
interface MockupPlaceholderProps {
  label: string;
  sublabel?: string;
  aspect?: string;
  className?: string;
  imageSrc?: string;
  dark?: boolean;
}

const MockupPlaceholder: React.FC<MockupPlaceholderProps> = ({
  label,
  sublabel = 'Produktmockup – ersätts med uppladdad bild',
  aspect = 'aspect-[4/3]',
  className = '',
  imageSrc,
  dark = false,
}) => {
  if (imageSrc) {
    return (
      <div className={`overflow-hidden rounded-[28px] border ${dark ? 'border-white/10 bg-[#0E1522]' : 'border-black/[0.08] bg-white'} shadow-sm ${className}`}>
        <img src={imageSrc} alt={label} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full ${aspect} rounded-[28px] sm:rounded-[32px] border transition-all duration-300 flex flex-col items-center justify-center p-6 text-center select-none ${
        dark 
          ? 'bg-[#0A101A] border-white/15 text-[#F4F6FC] shadow-2xl' 
          : 'bg-[#F1F4F9] border-black/[0.08] text-[#03070E] shadow-xs'
      } ${className}`}
    >
      {/* Subtle simulated screen header pill */}
      <div className={`absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wider uppercase ${
        dark 
          ? 'bg-white/[0.06] border-white/15 text-[#94A0B8]' 
          : 'bg-white border-black/[0.06] text-[#525866]'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#A0C5FD]" />
        {label}
      </div>

      <div className="flex flex-col items-center justify-center gap-3 max-w-sm px-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
          dark ? 'bg-white/[0.08] border-white/15 text-[#A0C5FD]' : 'bg-white border-black/[0.08] text-[#03070E]'
        }`}>
          <Smartphone size={22} strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <p className={`text-sm sm:text-base font-bold tracking-tight ${dark ? 'text-[#FFFFFF]' : 'text-[#03070E]'}`}>
            {label}
          </p>
          <p className={`text-xs sm:text-sm font-medium ${dark ? 'text-[#94A0B8]' : 'text-[#525866]'}`}>
            {sublabel}
          </p>
        </div>
      </div>
    </div>
  );
};

export function LandingPage({
  onGetStarted,
  onLogin,
  onStartDemo,
  onLegalClick,
  currentLanguage,
  onLanguageChange,
}: LandingPageProps) {
  const [activePolicy, setActivePolicy] = useState<'privacy' | 'terms' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Set to true once real testimonials and avatars are added
  const SHOW_TESTIMONIALS = false;

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleLegal = (type: 'privacy' | 'terms') => {
    if (onLegalClick) {
      onLegalClick(type);
    } else {
      setActivePolicy(type);
    }
  };

  const faqs = [
    {
      q: 'Vad är Dejz?',
      a: 'Dejz är en enkel och smart privatekonomi-app som hjälper dig att hålla koll på dina pengar dag för dag. Istället för att gissa hur mycket du kan handla för räknar Dejz ut vad du faktiskt har kvar efter fasta kostnader och sparande – och ger dig ett exakt belopp du kan spendera idag.',
    },
    {
      q: 'Hur räknar Dejz ut vad jag kan spendera idag?',
      a: 'Dejz tar dina förväntade inkomster, drar bort dina fasta månadskostnader (hyra, räkningar, abonnemang) samt ditt valda sparande. Det som blir kvar fördelas jämnt över månadens återstående dagar. Det ger dig en tydlig dagsbudget i realtid.',
    },
    {
      q: 'Vad händer om jag spenderar mindre än min dagsbudget?',
      a: 'Om du spenderar mindre än ditt dagsbelopp förs överskottet automatiskt över till kommande dagar. Din framtida dagsbudget ökar och du får mer utrymme framåt utan krångliga omräkningar.',
    },
    {
      q: 'Vad händer om jag spenderar mer?',
      a: 'Om du gör ett större inköp en dag fördelar Dejz underskottet jämnt över resten av perioden. Din dagsbudget justeras nedåt så att du fortfarande håller din totala månadsplan och når dina sparmål.',
    },
    {
      q: 'Behöver jag koppla mitt bankkonto?',
      a: 'Nej. Dejz kräver ingen bankkoppling eller BankID till dina konton. Du har full kontroll över din information och väljer själv vad du lägger in.',
    },
    {
      q: 'Kan jag testa Dejz innan jag skapar konto?',
      a: 'Ja! Du kan klicka på "Testa demo" och prova appen direkt i webbläsaren med färdig exempeldata, helt utan att skapa konto eller lämna e-postadress.',
    },
    {
      q: 'Fungerar Dejz på mobilen?',
      a: 'Ja, Dejz är byggd mobile-first och fungerar supersnabbt direkt i mobilens webbläsare. Du kan även installera den som en app direkt på hemskärmen (PWA) på både iPhone och Android.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#03070E] font-sans antialiased selection:bg-[#A0C5FD] selection:text-[#03070E] overflow-x-hidden">
      {/* 1. HEADER (Sticky & Minimalistisk) */}
      <header className="sticky top-0 z-50 bg-[#F8F9FA]/90 backdrop-blur-md border-b border-black/[0.06] transition-all">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Vänster: Logga */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 cursor-pointer focus:outline-none"
              aria-label="Dejz Hem"
            >
              <DejzLogo className="h-7 sm:h-8 w-auto" textColor="#03070E" />
            </button>
          </div>

          {/* Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#525866]">
            <button 
              onClick={() => scrollToSection('how-it-works')} 
              className="hover:text-[#03070E] transition-colors cursor-pointer"
            >
              Så fungerar det
            </button>
            <button 
              onClick={() => scrollToSection('features')} 
              className="hover:text-[#03070E] transition-colors cursor-pointer"
            >
              Funktioner
            </button>
            <button 
              onClick={() => scrollToSection('privacy')} 
              className="hover:text-[#03070E] transition-colors cursor-pointer"
            >
              Integritet
            </button>
            <button 
              onClick={() => scrollToSection('faq')} 
              className="hover:text-[#03070E] transition-colors cursor-pointer"
            >
              Vanliga frågor
            </button>
          </nav>

          {/* Höger: Logga in + Kom igång gratis */}
          <div className="hidden sm:flex items-center gap-4">
            {/* Language switch button */}
            <div className="relative">
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-black/[0.07] bg-white text-xs font-semibold text-[#03070E] hover:border-black/20 transition-colors"
                aria-label="Välj språk"
              >
                <LanguageFlag language={currentLanguage} size="sm" showCode />
                <ChevronDown size={12} className={`transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 mt-2 z-50 bg-white border border-black/[0.08] rounded-2xl shadow-xl p-1.5 min-w-[150px]"
                    >
                      {Object.entries(languageInfo).map(([code, info]) => (
                        <button
                          key={code}
                          onClick={() => {
                            onLanguageChange(code as Language);
                            setIsLangOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            currentLanguage === code ? 'bg-[#A0C5FD]/20 text-[#03070E]' : 'text-[#525866] hover:bg-black/[0.04]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{info.flag}</span>
                            <span>{info.label}</span>
                          </span>
                          {currentLanguage === code && <Check size={12} className="text-[#03070E]" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {onLogin && (
              <button 
                onClick={onLogin}
                className="px-4 py-2 text-sm font-semibold text-[#03070E] hover:text-[#525866] transition-colors cursor-pointer"
              >
                Logga in
              </button>
            )}

            <button 
              onClick={onGetStarted}
              className="px-5 py-2.5 rounded-full bg-[#03070E] text-[#FFFFFF] text-sm font-semibold hover:bg-[#03070E]/90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Kom igång gratis
            </button>
          </div>

          {/* Mobilmeny-knapp */}
          <div className="flex sm:hidden items-center gap-2">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-black/[0.08] bg-white text-[#03070E]"
              aria-label="Meny"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobilmeny-drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden border-b border-black/[0.06] bg-[#F8F9FA] px-5 py-6 space-y-4"
            >
              <div className="flex flex-col gap-3 text-base font-semibold text-[#03070E]">
                <button 
                  onClick={() => scrollToSection('how-it-works')} 
                  className="text-left py-2 hover:text-[#525866]"
                >
                  Så fungerar det
                </button>
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="text-left py-2 hover:text-[#525866]"
                >
                  Funktioner
                </button>
                <button 
                  onClick={() => scrollToSection('privacy')} 
                  className="text-left py-2 hover:text-[#525866]"
                >
                  Integritet
                </button>
                <button 
                  onClick={() => scrollToSection('faq')} 
                  className="text-left py-2 hover:text-[#525866]"
                >
                  Vanliga frågor
                </button>
              </div>

              <div className="pt-4 border-t border-black/[0.06] flex flex-col gap-3">
                <button 
                  onClick={onGetStarted}
                  className="w-full py-3 rounded-2xl bg-[#03070E] text-[#FFFFFF] text-sm font-semibold text-center shadow-xs"
                >
                  Kom igång gratis
                </button>
                {onLogin && (
                  <button 
                    onClick={onLogin}
                    className="w-full py-3 rounded-2xl border border-black/[0.1] bg-white text-sm font-semibold text-center text-[#03070E]"
                  >
                    Logga in
                  </button>
                )}
                {onStartDemo && (
                  <button 
                    onClick={onStartDemo}
                    className="w-full py-2.5 text-xs font-semibold text-center text-[#525866] hover:text-[#03070E]"
                  >
                    Testa demo utan konto
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* 2. HERO */}
        <section className="pt-12 sm:pt-20 lg:pt-28 pb-16 sm:pb-24 px-5 sm:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Vänster textinnehåll */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A0C5FD]/25 border border-[#A0C5FD]/50 text-[#03070E] text-xs font-bold uppercase tracking-[0.16em]">
                <span className="w-2 h-2 rounded-full bg-[#A0C5FD]" />
                DIN EKONOMI. DAG FÖR DAG.
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight text-[#03070E] leading-[1.06]">
                Se exakt vad du kan<br />
                <span className="text-[#03070E]">spendera idag.</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#525866] font-normal leading-relaxed max-w-xl">
                Samla dina inkomster, fasta utgifter och ditt sparande på ett ställe. Dejz räknar ut vad du faktiskt har kvar och visar hur mycket du kan spendera varje dag.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <button 
                    onClick={onGetStarted}
                    className="px-8 py-4 rounded-full bg-[#03070E] text-[#FFFFFF] text-base font-bold hover:bg-[#03070E]/90 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Kom igång gratis
                    <ArrowRight size={18} />
                  </button>
                  {onStartDemo && (
                    <button 
                      onClick={onStartDemo}
                      className="px-7 py-4 rounded-full bg-white border border-black/[0.1] text-[#03070E] text-base font-bold hover:bg-black/[0.02] hover:border-black/20 active:scale-98 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                    >
                      Testa demo
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-[#8C94A0] font-medium pt-1">
                  Ingen bankkoppling • Enkelt att komma igång
                </p>
              </div>
            </div>

            {/* Höger: Dejz Home Mockup */}
            <div className="lg:col-span-6 w-full flex justify-center items-center py-2 sm:py-4">
              <div className="relative mx-auto max-w-[280px] sm:max-w-[315px] lg:max-w-[350px] w-full flex justify-center">
                <img 
                  src="/hero_mockup.png" 
                  alt="Dejz app – Se exakt vad du kan spendera idag" 
                  className="w-full h-auto object-contain select-none hover:scale-[1.015] transition-transform duration-300" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEMET */}
        <section className="py-20 sm:py-32 px-5 sm:px-8 border-t border-black/[0.06] bg-white">
          <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
            <div className="max-w-2xl space-y-5">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#03070E] leading-[1.12]">
                Pengar på kontot är inte samma sak som pengar att spendera.
              </h2>
              <p className="text-lg sm:text-xl text-[#525866] font-normal leading-relaxed">
                Det är enkelt att se hur mycket pengar du har på kontot. Det svåra är att veta hur mycket du faktiskt kan använda utan att tappa kontrollen över resten av perioden.
              </p>
            </div>

            {/* Stort visuellt räkneexempel */}
            <div className="p-8 sm:p-14 rounded-[32px] sm:rounded-[40px] bg-[#F8F9FA] border border-black/[0.07] space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 pb-8 border-b border-black/[0.06]">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8C94A0]">Inkomster</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#03070E] tracking-tight">+29 500 kr</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8C94A0]">Fasta utgifter</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#03070E] tracking-tight">−13 250 kr</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8C94A0]">Sparande</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#03070E] tracking-tight">−3 000 kr</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-[#525866]">Kvar att leva på</span>
                  <p className="text-3xl sm:text-4xl font-extrabold text-[#03070E] tracking-tight">13 250 kr</p>
                </div>

                <div className="hidden sm:flex items-center text-[#8C94A0]">
                  <ArrowRight size={32} />
                </div>
                <div className="flex sm:hidden items-center text-[#8C94A0] py-2">
                  <ArrowDown size={28} />
                </div>

                <div className="p-6 sm:p-8 rounded-[24px] bg-[#03070E] text-white space-y-1 sm:min-w-[280px]">
                  <span className="text-xs sm:text-sm font-bold text-[#A0C5FD] uppercase tracking-wider block">
                    Det här kan du spendera idag
                  </span>
                  <p className="text-4xl sm:text-5xl font-black tracking-tight text-[#FFFFFF]">
                    442 kr
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SÅ FUNGERAR DEJZ */}
        <section id="how-it-works" className="py-20 sm:py-32 px-5 sm:px-8 max-w-7xl mx-auto space-y-16">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#03070E] leading-[1.12]">
              Från din ekonomi till ett enda tydligt belopp.
            </h2>
            <p className="text-lg sm:text-xl text-[#525866] font-normal leading-relaxed">
              Du fyller i grunden. Dejz räknar resten.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Steg 01 */}
            <div className="p-8 rounded-[28px] bg-white border border-black/[0.07] space-y-5">
              <span className="text-3xl font-extrabold text-[#03070E] tracking-tight block">01</span>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-[#03070E] tracking-tight">
                  Lägg in vad du får in
                </h3>
                <p className="text-sm sm:text-base text-[#525866] font-normal leading-relaxed">
                  Samla lön och andra inkomster.
                </p>
              </div>
            </div>

            {/* Steg 02 */}
            <div className="p-8 rounded-[28px] bg-white border border-black/[0.07] space-y-5">
              <span className="text-3xl font-extrabold text-[#03070E] tracking-tight block">02</span>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-[#03070E] tracking-tight">
                  Lägg in det som måste ut
                </h3>
                <p className="text-sm sm:text-base text-[#525866] font-normal leading-relaxed">
                  Hyra, abonnemang, försäkringar och andra fasta kostnader.
                </p>
              </div>
            </div>

            {/* Steg 03 */}
            <div className="p-8 rounded-[28px] bg-white border border-black/[0.07] space-y-5">
              <span className="text-3xl font-extrabold text-[#03070E] tracking-tight block">03</span>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-[#03070E] tracking-tight">
                  Bestäm vad du vill spara
                </h3>
                <p className="text-sm sm:text-base text-[#525866] font-normal leading-relaxed">
                  Välj hur mycket du vill lägga undan.
                </p>
              </div>
            </div>

            {/* Steg 04 */}
            <div className="p-8 rounded-[28px] bg-white border border-black/[0.07] space-y-5">
              <span className="text-3xl font-extrabold text-[#03070E] tracking-tight block">04</span>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-[#03070E] tracking-tight">
                  Se vad du kan spendera idag
                </h3>
                <p className="text-sm sm:text-base text-[#525866] font-normal leading-relaxed">
                  Dejz räknar ut din dagsbudget och håller den uppdaterad.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. DAGSBUDGETEN (Mörk sektion med #03070E, #A0C5FD accent och högkontrast text) */}
        <section className="py-24 sm:py-36 px-5 sm:px-8 bg-[#03070E]">
          <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">
            <div className="max-w-3xl space-y-6">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#A0C5FD]">
                Dynamisk beräkning
              </span>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#FFFFFF] leading-[1.08]">
                Din ekonomi förändras.<br />
                Din dagsbudget gör det också.
              </h2>
              <p className="text-lg sm:text-xl text-[#94A0B8] font-normal leading-relaxed max-w-2xl">
                Spenderar du mindre idag får du mer utrymme framåt. Spenderar du mer anpassar Dejz kommande dagar efter vad du har kvar.
              </p>
            </div>

            {/* Visuellt flöde */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
              {/* Box 1 */}
              <div className="p-8 rounded-[28px] bg-[#0E1522] border border-white/10 space-y-3 flex flex-col justify-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94A0B8]">Kvar idag</span>
                <p className="text-4xl font-extrabold text-[#A0C5FD] tracking-tight">500 kr</p>
              </div>

              {/* Box 2 */}
              <div className="p-8 rounded-[28px] bg-[#0E1522] border border-white/10 space-y-3 flex flex-col justify-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94A0B8]">ICA</span>
                <p className="text-4xl font-extrabold text-[#FFFFFF] tracking-tight">−200 kr</p>
              </div>

              {/* Box 3 */}
              <div className="p-8 rounded-[28px] bg-[#0E1522] border border-white/10 space-y-3 flex flex-col justify-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94A0B8]">Kvar idag</span>
                <p className="text-4xl font-extrabold text-[#A0C5FD] tracking-tight">300 kr</p>
              </div>

              {/* Box 4 */}
              <div className="p-8 rounded-[28px] bg-[#0E1522] border border-[#A0C5FD]/40 space-y-2 flex flex-col justify-center">
                <div className="w-8 h-8 rounded-full bg-[#A0C5FD]/20 text-[#A0C5FD] flex items-center justify-center mb-1">
                  <Sparkles size={16} />
                </div>
                <p className="text-lg font-bold text-[#FFFFFF] tracking-tight leading-snug">
                  Kommande dagar anpassas
                </p>
                <p className="text-xs text-[#94A0B8] leading-relaxed font-medium">
                  Automatisk omfördelning utan manuell matematik.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. PRODUKTEN (Ljus stor sektion med stora placeholders i alternerande layout) */}
        <section id="features" className="py-24 sm:py-36 px-5 sm:px-8 max-w-7xl mx-auto space-y-24 sm:space-y-36">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#03070E] leading-[1.1]">
              Allt du behöver för att förstå dina pengar.
            </h2>
          </div>

          {/* HOME */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C94A0]">HOME</span>
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#03070E] leading-tight">
                Vet vad du kan spendera – direkt.
              </h3>
              <p className="text-base sm:text-lg text-[#525866] font-normal leading-relaxed">
                Öppna Dejz och se direkt vad du kan spendera idag, hur mycket du har kvar och hur dina val påverkar dagarna framåt.
              </p>
            </div>
            <div className="lg:col-span-7">
              <MockupPlaceholder 
                label="HOME MOCKUP" 
                aspect="aspect-[16/10] sm:aspect-[16/11]"
              />
            </div>
          </div>

          {/* ANALYS (Omvänd ordning på desktop: Bild vänster, text höger) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <MockupPlaceholder 
                label="ANALYS MOCKUP" 
                aspect="aspect-[16/10] sm:aspect-[16/11]"
              />
            </div>
            <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C94A0]">ANALYS</span>
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#03070E] leading-tight">
                Se vart pengarna faktiskt går.
              </h3>
              <p className="text-base sm:text-lg text-[#525866] font-normal leading-relaxed">
                Få en tydlig visuell bild av dina utgifter och se vilka kategorier som står för störst del av din konsumtion.
              </p>
            </div>
          </div>

          {/* BUDGET */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C94A0]">BUDGET</span>
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#03070E] leading-tight">
                Få koll på vad som kommer in och vad som måste ut.
              </h3>
              <p className="text-base sm:text-lg text-[#525866] font-normal leading-relaxed">
                Samla inkomster, fasta kostnader och sparande och se hur din ekonomi faktiskt går ihop.
              </p>
            </div>
            <div className="lg:col-span-7">
              <MockupPlaceholder 
                label="BUDGET MOCKUP" 
                aspect="aspect-[16/10] sm:aspect-[16/11]"
              />
            </div>
          </div>

          {/* HISTORIK (Omvänd ordning på desktop: Bild vänster, text höger) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <MockupPlaceholder 
                label="HISTORIK MOCKUP" 
                aspect="aspect-[16/10] sm:aspect-[16/11]"
              />
            </div>
            <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C94A0]">HISTORIK</span>
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#03070E] leading-tight">
                Allt som hänt. På ett ställe.
              </h3>
              <p className="text-base sm:text-lg text-[#525866] font-normal leading-relaxed">
                Se dina transaktioner i en tydlig tidslinje och hitta snabbt det du söker.
              </p>
            </div>
          </div>
        </section>

        {/* 7. INTEGRITET */}
        <section id="privacy" className="py-20 sm:py-32 px-5 sm:px-8 border-t border-black/[0.06] bg-white">
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#03070E] leading-[1.12]">
                Din ekonomi. Din kontroll.
              </h2>
              <p className="text-lg sm:text-xl text-[#525866] font-normal leading-relaxed">
                Dejz kräver ingen bankkoppling. Du väljer själv vilken ekonomisk information du lägger in.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              <div className="space-y-4 p-8 rounded-[28px] bg-[#F8F9FA] border border-black/[0.06]">
                <div className="w-12 h-12 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#03070E]">
                  <Shield size={22} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#03070E] tracking-tight">
                    Ingen bankkoppling
                  </h3>
                  <p className="text-sm sm:text-base text-[#525866] leading-relaxed font-normal">
                    Du behöver inte ansluta ditt bankkonto.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-8 rounded-[28px] bg-[#F8F9FA] border border-black/[0.06]">
                <div className="w-12 h-12 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#03070E]">
                  <Sliders size={22} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#03070E] tracking-tight">
                    Du bestämmer
                  </h3>
                  <p className="text-sm sm:text-base text-[#525866] leading-relaxed font-normal">
                    Du väljer själv vad du registrerar.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-8 rounded-[28px] bg-[#F8F9FA] border border-black/[0.06]">
                <div className="w-12 h-12 rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center text-[#03070E]">
                  <HeartHandshake size={22} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#03070E] tracking-tight">
                    Integritet i fokus
                  </h3>
                  <p className="text-sm sm:text-base text-[#525866] leading-relaxed font-normal">
                    Din ekonomiska information ska behandlas med omsorg.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. TESTIMONIALS (Dold i produktion tills riktiga läggs in) */}
        {SHOW_TESTIMONIALS && (
          <section className="py-20 sm:py-32 px-5 sm:px-8 max-w-7xl mx-auto space-y-16">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#03070E]">
                Vad användare säger om Dejz
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-8 rounded-[28px] bg-white border border-black/[0.07] space-y-6">
                  <div className="w-12 h-12 rounded-full bg-[#F1F4F9] border border-black/[0.06] flex items-center justify-center text-xs font-semibold text-[#8C94A0]">
                    Foto
                  </div>
                  <p className="text-base text-[#525866] leading-relaxed italic">
                    &ldquo;Citat från riktig användare läggs in här.&rdquo;
                  </p>
                  <div>
                    <p className="font-bold text-sm text-[#03070E]">Användarnamn</p>
                    <p className="text-xs text-[#8C94A0]">Dejz-användare</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 9. TESTA DEMO */}
        <section className="py-20 sm:py-32 px-5 sm:px-8 border-t border-black/[0.06] bg-[#F8F9FA]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#03070E] leading-[1.1]">
                  Förstå Dejz på några sekunder.
                </h2>
                <p className="text-lg sm:text-xl text-[#525866] font-normal leading-relaxed">
                  Utforska appen med exempeldata och se hur din dagsbudget förändras – utan att skapa ett konto.
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={onStartDemo}
                  className="px-8 py-4 rounded-full bg-[#03070E] text-[#FFFFFF] text-base font-bold hover:bg-[#03070E]/90 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  Testa demo
                  <ArrowRight size={18} />
                </button>
                <p className="text-xs sm:text-sm text-[#8C94A0] font-medium">
                  Du behöver inte registrera dig.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6">
              <MockupPlaceholder 
                label="DEMO MOCKUP"
                sublabel="Bild läggs in senare"
                aspect="aspect-[16/10]"
              />
            </div>
          </div>
        </section>

        {/* 10. FAQ (Accordion) */}
        <section id="faq" className="py-20 sm:py-32 px-5 sm:px-8 max-w-4xl mx-auto space-y-12">
          <div className="space-y-4 text-center sm:text-left">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#03070E] leading-[1.12]">
              Det du kanske undrar.
            </h2>
          </div>

          <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="py-5 sm:py-6">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 text-left group cursor-pointer focus:outline-none"
                  >
                    <span className="text-lg sm:text-xl font-bold tracking-tight text-[#03070E]">
                      {faq.q}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-200 ${
                      isOpen ? 'bg-[#A0C5FD] border-[#A0C5FD] text-[#03070E] rotate-180' : 'bg-white border-black/[0.08] text-[#525866] group-hover:bg-black/[0.04]'
                    }`}>
                      <ChevronDown size={16} />
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
                        <div className="pt-4 pr-10">
                          <p className="text-base sm:text-lg text-[#525866] font-normal leading-relaxed">
                            {faq.a}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* 11. FINAL CTA (Mörk sektion #03070E) */}
        <section className="py-24 sm:py-36 px-5 sm:px-8 bg-[#03070E]">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#A0C5FD]">
              DIN EKONOMI. DAG FÖR DAG.
            </span>

            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#FFFFFF] leading-[1.06]">
              Sluta gissa.<br />
              Se vad du kan spendera idag.
            </h2>

            <p className="text-lg sm:text-xl text-[#94A0B8] font-normal leading-relaxed max-w-2xl mx-auto">
              Samla din ekonomi, se vad du faktiskt har kvar och håll din plan – en dag i taget.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto px-9 py-4 rounded-full bg-[#A0C5FD] text-[#03070E] text-base font-extrabold hover:bg-[#8BB6FB] active:scale-98 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                Kom igång gratis
                <ArrowRight size={18} />
              </button>
              {onStartDemo && (
                <button 
                  onClick={onStartDemo}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.08] border border-white/20 text-[#FFFFFF] text-base font-bold hover:bg-white/[0.14] active:scale-98 transition-all cursor-pointer"
                >
                  Testa demo
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 12. FOOTER */}
      <footer className="py-16 sm:py-20 px-5 sm:px-8 bg-[#03070E] border-t border-white/10 text-white">
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-white/10">
            <div className="space-y-3">
              <DejzLogo className="h-7 sm:h-8 w-auto" textColor="#FFFFFF" />
              <p className="text-sm font-medium text-[#94A0B8]">
                Se vad du kan spendera idag.
              </p>
            </div>

            {/* Footer Navigation Links */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-[#94A0B8]">
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Så fungerar det
              </button>
              <button 
                onClick={() => scrollToSection('features')} 
                className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Funktioner
              </button>
              {onStartDemo && (
                <button 
                  onClick={onStartDemo} 
                  className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
                >
                  Testa demo
                </button>
              )}
              <button 
                onClick={() => scrollToSection('faq')} 
                className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Vanliga frågor
              </button>
              <button 
                onClick={() => handleLegal('privacy')} 
                className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Integritetspolicy
              </button>
              <button 
                onClick={() => handleLegal('terms')} 
                className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Användarvillkor
              </button>
              <a 
                href="mailto:hej@dejz.se" 
                className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Kontakt
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-medium text-[#647085]">
            <p>
              © 2026 Dejz. Alla rättigheter förbehållna.
            </p>
            <a 
              href="mailto:hej@dejz.se" 
              className="hover:text-[#A0C5FD] transition-colors"
            >
              hej@dejz.se
            </a>
          </div>
        </div>
      </footer>

      {/* Fallback policy modal if onLegalClick is not provided */}
      <PolicyModal 
        isOpen={!!activePolicy} 
        onClose={() => setActivePolicy(null)} 
        title={activePolicy === 'terms' ? 'Användarvillkor' : 'Integritetspolicy'}
        content={
          activePolicy === 'terms' ? (
            <div className="space-y-4 text-sm text-[#03070E]">
              <p className="font-medium text-[#525866]">
                Genom att registrera ett konto eller använda Dejz godkänner du dessa användarvillkor. Dejz är ett digitalt verktyg för personlig budgetering och dagsöversikt.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-[#03070E]">
              <p className="font-medium text-[#525866]">
                Dejz värnar om din integritet. Vi kräver ingen bankkoppling eller BankID och delar inte din information med tredje part i marknadsföringssyfte.
              </p>
            </div>
          )
        }
      />
    </div>
  );
}

export default LandingPage;
