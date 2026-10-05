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
  Sparkles
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
      <div 
        data-mockup-id={id}
        className={`relative w-full rounded-[28px] overflow-hidden flex items-center justify-center bg-white border border-[#E2DDD4] shadow-sm ${className}`}
      >
        <img 
          src={imageSrc} 
          alt={imageAlt} 
          className="w-full h-auto max-h-[540px] object-contain rounded-[28px]" 
        />
      </div>
    );
  }

  return (
    <div 
      data-mockup-id={id}
      className={`relative w-full ${aspectRatio} rounded-[28px] bg-white border border-[#E2DDD4] overflow-hidden flex flex-col items-center justify-center p-8 select-none shadow-sm ${className}`}
    >
      <div className="absolute inset-0 opacity-[0.2] bg-[radial-gradient(#211F1C_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      
      <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-[#211F1C]/20 rounded-tl-xs" />
      <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-[#211F1C]/20 rounded-tr-xs" />
      <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-[#211F1C]/20 rounded-bl-xs" />
      <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-[#211F1C]/20 rounded-br-xs" />

      <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
        <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#211F1C]/75 uppercase">
          [ {id} ]
        </span>
        <span className="text-xs text-[#6E6961]">
          {sublabel}
        </span>
      </div>
    </div>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-[#E2DDD4]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 sm:py-7 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
      >
        <span className={`text-lg sm:text-xl font-bold tracking-tight transition-colors pr-6 ${isOpen ? 'text-[#211F1C]' : 'text-[#211F1C]/80 group-hover:text-[#211F1C]'}`}>
          {question}
        </span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform shrink-0 ${isOpen ? 'rotate-180 text-[#1C1917]' : 'text-[#6E6961] group-hover:text-[#211F1C]'}`}>
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
              <p className="text-[#6E6961] leading-relaxed font-normal text-base sm:text-lg">
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
    <div className="min-h-dvh bg-[#EFECE6] text-[#211F1C] font-sans overflow-x-hidden relative selection:bg-[#1C1917] selection:text-white antialiased">
      
      {/* HEADER */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#EFECE6]/90 backdrop-blur-md border-b border-[#E2DDD4] pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center cursor-pointer text-left focus:outline-none"
            aria-label="Dejz Hem"
          >
            <DejzLogo className="text-2xl font-black tracking-tight" textColor="#211F1C" />
          </button>

          <div className="flex items-center gap-4">
            {onLogin && (
              <button 
                onClick={onLogin}
                className="text-sm font-semibold text-[#211F1C] hover:text-[#1C1917] transition-colors px-2 py-2 cursor-pointer"
              >
                Logga in
              </button>
            )}
            <button 
              onClick={onGetStarted}
              className="px-5 py-2.5 rounded-[14px] bg-[#1C1917] text-[#FFFFFF] hover:bg-[#2E2A27] active:bg-[#3D3834] transition-all font-semibold text-sm cursor-pointer shadow-xs active:scale-95"
            >
              Kom igång gratis
            </button>
          </div>
        </div>
      </nav>

      {/* Main Streamlined Content Flow */}
      <main className="flex flex-col min-h-dvh">

        {/* HERO */}
        <section className="w-full pt-[calc(7.5rem+env(safe-area-inset-top))] pb-16 md:pb-24 lg:pb-32 px-6 sm:px-10 bg-[#EFECE6]">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
            
            <div className="w-full lg:w-[50%] space-y-6 sm:space-y-8 text-left">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#211F1C] leading-[1.03]">
                Hela din ekonomi.<br />
                Svart på vitt.
              </h1>
              
              <p className="text-lg sm:text-xl text-[#6E6961] font-normal leading-relaxed max-w-xl">
                Samla inkomster, utgifter, sparande och budget på ett ställe. Se vart pengarna går och få koll på ekonomin mellan två löner.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button 
                  onClick={onGetStarted} 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-[#1C1917] text-[#FFFFFF] hover:bg-[#2E2A27] active:bg-[#3D3834] transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
                >
                  <span>Kom igång gratis</span>
                  <ChevronRight size={16} />
                </button>

                {onStartDemo && (
                  <button
                    onClick={onStartDemo}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-white hover:bg-[#F9F8F6] text-[#211F1C] border border-[#E2DDD4] transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
                  >
                    <span>Testa demo</span>
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm font-medium text-[#6E6961] pt-1">
                Ingen bankkoppling • Gratis att komma igång
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
        <section id="sa-fungerar-det" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-white border-t border-b border-[#E2DDD4] scroll-mt-20">
          <div className="max-w-6xl mx-auto space-y-12 md:space-y-16">
            
            <h2 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight text-[#211F1C] leading-[1.08] text-left">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 pt-6 border-t border-[#E2DDD4]">
              <div className="space-y-2 text-left">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-[#211F1C] block">
                  01
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#211F1C]">
                  Lägg in din ekonomi
                </h3>
              </div>

              <div className="space-y-2 text-left">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-[#211F1C] block">
                  02
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#211F1C]">
                  Registrera dina utgifter
                </h3>
              </div>

              <div className="space-y-2 text-left">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-[#211F1C] block">
                  03
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#211F1C]">
                  Se vad du faktiskt har kvar
                </h3>
              </div>
            </div>

            <p className="text-base sm:text-lg text-[#6E6961] font-medium text-left pt-2">
              När du registrerar nya utgifter uppdaterar Dejz automatiskt hur mycket du har kvar.
            </p>

          </div>
        </section>

        {/* FUNKTIONER */}
        <section id="funktioner" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-[#EFECE6] scroll-mt-20">
          <div className="max-w-6xl mx-auto space-y-12 md:space-y-16">
            
            <h2 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight text-[#211F1C] leading-[1.08] text-left">
              Allt samlat på ett ställe.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 sm:gap-y-12 text-left">
              
              <div className="space-y-3 bg-white p-6 rounded-[22px] border border-[#E2DDD4]">
                <div className="w-10 h-10 rounded-[14px] bg-black/[0.04] flex items-center justify-center text-[#211F1C]">
                  <Wallet size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[#211F1C]">
                    Budget
                  </h3>
                  <p className="text-base text-[#6E6961] font-normal leading-relaxed">
                    Planera inkomster, fasta utgifter och sparande.
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-white p-6 rounded-[22px] border border-[#E2DDD4]">
                <div className="w-10 h-10 rounded-[14px] bg-black/[0.04] flex items-center justify-center text-[#211F1C]">
                  <CreditCard size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[#211F1C]">
                    Transaktioner
                  </h3>
                  <p className="text-base text-[#6E6961] font-normal leading-relaxed">
                    Registrera och kategorisera dina köp.
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-white p-6 rounded-[22px] border border-[#E2DDD4]">
                <div className="w-10 h-10 rounded-[14px] bg-black/[0.04] flex items-center justify-center text-[#211F1C]">
                  <PieChart size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[#211F1C]">
                    Analys
                  </h3>
                  <p className="text-base text-[#6E6961] font-normal leading-relaxed">
                    Se vart pengarna faktiskt går.
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-white p-6 rounded-[22px] border border-[#E2DDD4]">
                <div className="w-10 h-10 rounded-[14px] bg-black/[0.04] flex items-center justify-center text-[#211F1C]">
                  <Calendar size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[#211F1C]">
                    Historik
                  </h3>
                  <p className="text-base text-[#6E6961] font-normal leading-relaxed">
                    Följ din ekonomi över tid.
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-white p-6 rounded-[22px] border border-[#E2DDD4] md:col-span-2 lg:col-span-2">
                <div className="w-10 h-10 rounded-[14px] bg-black/[0.04] flex items-center justify-center text-[#211F1C]">
                  <Sparkles size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#211F1C]">
                      Dejzi
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-[#1C1917]" />
                  </div>
                  <p className="text-base text-[#6E6961] font-normal leading-relaxed max-w-xl">
                    Få hjälp att förstå din ekonomi och upptäcka sådant som är värt att uppmärksamma.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* INTEGRITET */}
        <section id="integritet" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-[#1C1917] text-white scroll-mt-20">
          <div className="max-w-4xl mx-auto text-left space-y-5">
            <h2 className="text-3xl sm:text-5xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
              Ingen bankkoppling behövs.
            </h2>
            <p className="text-lg sm:text-xl text-[#B8B8B8] font-normal leading-relaxed max-w-2xl">
              Du bestämmer själv vad du lägger in i Dejz. Samla den ekonomi du vill hålla koll på utan att koppla ditt bankkonto.
            </p>
          </div>
        </section>

        {/* SLUTLIG CTA */}
        <section className="w-full py-24 md:py-32 px-6 sm:px-10 bg-[#EFECE6] text-center border-b border-[#E2DDD4]">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl sm:text-6xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-[#211F1C]">
              Redo att få koll?
            </h2>
            
            <p className="text-lg sm:text-xl text-[#6E6961] font-normal max-w-xl mx-auto leading-relaxed">
              Börja med din egen ekonomi eller testa Dejz direkt med exempeldata.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <button 
                onClick={onGetStarted} 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-[#1C1917] text-[#FFFFFF] hover:bg-[#2E2A27] active:bg-[#3D3834] transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
              >
                <span>Kom igång gratis</span>
                <ChevronRight size={16} />
              </button>

              {onStartDemo && (
                <button
                  onClick={onStartDemo}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[14px] bg-white hover:bg-[#F9F8F6] text-[#211F1C] border border-[#E2DDD4] transition-all font-semibold text-base cursor-pointer text-center shadow-xs active:scale-[0.98]"
                >
                  <span>Testa demo</span>
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[#6E6961] font-medium pt-1">
              Du kan testa demoläget utan att skapa ett konto.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="w-full py-20 md:py-28 px-6 sm:px-10 bg-white scroll-mt-20">
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#211F1C] text-left">
              Vanliga frågor
            </h2>

            <div className="border-t border-[#E2DDD4]">
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
      <footer className="w-full bg-[#EFECE6] border-t border-[#E2DDD4] py-14 px-6 sm:px-10 text-[#211F1C]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-[#E2DDD4]">
          
          <div className="space-y-1 text-left">
            <DejzLogo className="text-2xl font-black tracking-tight" textColor="#211F1C" />
            <p className="text-sm text-[#6E6961]">
              Hela din ekonomi. Svart på vitt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-[#6E6961]">
            <button 
              onClick={() => onLegalClick ? onLegalClick('privacy') : setActivePolicy('privacy')} 
              className="hover:text-[#211F1C] transition-colors cursor-pointer"
            >
              Integritetspolicy
            </button>
            <button 
              onClick={() => onLegalClick ? onLegalClick('terms') : setActivePolicy('terms')} 
              className="hover:text-[#211F1C] transition-colors cursor-pointer"
            >
              Användarvillkor
            </button>
            <a href="mailto:hej@dejz.se" className="hover:text-[#211F1C] transition-colors">
              Kontakt
            </a>
            <a 
              href="https://instagram.com/dejz.se" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#211F1C] transition-colors"
            >
              <Instagram size={14} className="text-[#E1306C]" />
              <span>Instagram</span>
            </a>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E6961]">
          <span>© 2026 Dejz. Alla rättigheter förbehållna.</span>
          
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1 hover:text-[#211F1C] transition-colors cursor-pointer"
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
              <div className="space-y-6 text-sm text-[#211F1C]">
                <section className="space-y-2 text-left">
                  <h3 className="text-base font-bold">1. Godkännande av villkor</h3>
                  <p className="text-[#6E6961] font-medium">
                    Genom att registrera ett konto eller använda Dejz godkänner du dessa användarvillkor.
                  </p>
                </section>
                <section className="space-y-2 text-left">
                  <h3 className="text-base font-bold">2. Tjänstens omfattning</h3>
                  <p className="text-[#6E6961] font-medium">
                    Dejz är ett digitalt verktyg för personlig budgetering och ekonomisk överblick. Beräkningar och prognoser är vägledande och utgör inte professionell finansiell rådgivning.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-6 text-sm text-left text-[#211F1C]">
                <section className="space-y-2">
                  <h3 className="text-base font-bold">Integritets- och cookiepolicy</h3>
                  <p className="text-[#6E6961] font-medium">
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
