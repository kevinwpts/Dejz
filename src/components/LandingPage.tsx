import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Star,
  Image as ImageIcon
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
  id = 'MOCKUP', 
  aspectRatio = 'aspect-[16/10]',
  sublabel = 'Här ska det finnas en bild på xxxxx'
}: { 
  id?: string; 
  aspectRatio?: string;
  sublabel?: string;
}) => {
  return (
    <div className="relative w-full my-6">
      <div 
        data-mockup-id={id}
        className={`relative w-full ${aspectRatio} rounded-[24px] bg-[var(--surface-color)] border border-black/10 dark:border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 select-none shadow-sm`}
      >
        <div className="relative z-10 flex flex-col items-center gap-2.5 text-center px-4">
          <div className="w-10 h-10 rounded-[12px] bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] flex items-center justify-center">
            <ImageIcon size={20} strokeWidth={2} />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-[0.15em] text-[var(--text-secondary)] uppercase">
            [ BILDBOX: {id} ]
          </span>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] max-w-sm">
            {sublabel}
          </p>
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
        className="w-full py-5 sm:py-6 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
      >
        <span className={`text-base sm:text-lg font-bold tracking-tight transition-colors pr-6 ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]/80 group-hover:text-[var(--text-primary)]'}`}>
          {question}
        </span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${isOpen ? 'rotate-180 bg-black/10 dark:bg-white/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] bg-black/[0.03] dark:bg-white/[0.05]'}`}>
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
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-color)]/80 border-b border-black/[0.04] dark:border-white/[0.06] transition-all">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <DejzLogo className="text-2xl font-black tracking-tight" />
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {onStartDemo && (
              <button
                onClick={onStartDemo}
                className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 rounded-[12px] text-xs font-semibold text-[var(--text-primary)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95"
              >
                Testa demo
              </button>
            )}
            {onLogin && (
              <button
                onClick={onLogin}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-[12px] text-xs font-semibold text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer active:scale-95"
              >
                Logga in
              </button>
            )}
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center px-4 py-2 rounded-[12px] text-xs font-semibold text-[var(--text-on-accent)] bg-[var(--accent-color)] hover:opacity-95 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Kom igång
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center relative z-10 space-y-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Få full kontroll på din ekonomi – utan krångel.
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] font-normal max-w-xl mx-auto leading-relaxed">
            Dejz hjälper dig att automatiskt hålla koll på dina perioder, dagsbudgetar, fasta utgifter och sparande på ett och samma ställe.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[16px] text-sm font-semibold text-[var(--text-on-accent)] bg-[var(--accent-color)] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[var(--accent-color)]/20 active:scale-95"
            >
              <span>Skapa konto gratis</span>
              <ArrowRight size={16} />
            </button>
            {onStartDemo && (
              <button
                onClick={onStartDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[16px] text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface-color)] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer active:scale-95"
              >
                <span>Testa interaktiv demo</span>
              </button>
            )}
          </div>

          {/* Clean Unboxed Trust Badges with Perfect Mobile Row/Column Alignment */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-xs font-medium text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span className="text-[var(--text-primary)]">Inga bindningstider</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span className="text-[var(--text-primary)]">100% säker & privat</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span className="text-[var(--text-primary)]">Kom igång på 1 minut</span>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="pt-4">
            <MockupPlaceholder 
              id="HERO_OVERVIEW" 
              aspectRatio="aspect-[16/10]"
              sublabel="Här ska det finnas en bild på appens översiktsvy / Hem-skärmen med perioder och dagsbudget"
            />
          </div>
        </div>
      </section>

      {/* Social Proof / Trust Bar */}
      <section className="py-8 border-y border-black/[0.04] dark:border-white/[0.06] bg-[var(--surface-color)]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Används av tusentals svenskar för att bemästra sin vardagsekonomi
          </p>
          <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-xs">
            <Star size={14} fill="currentColor" />
            <Star size={14} fill="currentColor" />
            <Star size={14} fill="currentColor" />
            <Star size={14} fill="currentColor" />
            <Star size={14} fill="currentColor" />
            <span className="text-[var(--text-primary)] ml-1.5 font-bold">4.9 / 5.0 i betyg</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-semibold text-[var(--accent-color)]">
            Funktioner som gör skillnad
          </p>
          <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
            Allt du behöver för att aldrig mer undra vart pengarna tog vägen.
          </h3>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Byggt från grunden för att passa den nordiska modellen med lön den 25:e och fasta autogiron.
          </p>
        </div>

        {/* Feature 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight">
              Koll på dagsbudgeten från lön till lön
            </h4>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Ställ in din lönedag och låt Dejz automatiskt räkna ut exakt hur mycket du kan spendera varje dag utan att riskera att stå tomhänt innan månaden är slut.
            </p>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Automatiska perioder (25:e till 25:e eller kalendermånad)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Realtidsuppdaterad dagsbudget som anpassar sig direkt</span>
              </li>
            </ul>
          </div>
          <div>
            <MockupPlaceholder 
              id="FEATURE_TODAY" 
              aspectRatio="aspect-[4/3]"
              sublabel="Här ska det finnas en bild på dagsbudget- och kalendervyn"
            />
          </div>
        </div>

        {/* Feature 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <MockupPlaceholder 
              id="FEATURE_FIXED" 
              aspectRatio="aspect-[4/3]"
              sublabel="Här ska det finnas en bild på vyn för fasta utgifter och abonnemang"
            />
          </div>
          <div className="space-y-4 order-1 md:order-2">
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight">
              Full koll på fasta utgifter och abonnemang
            </h4>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Samla alla dina återkommande räkningar, Netflix-abonnemang, lån och autogiron på ett ställe. Välj om de ska betalas månadsvis, kvartalsvis eller årligen.
            </p>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Flexibla intervaller: Månad, kvartal, halvår eller år</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Variabla belopp och periodspecifika justeringar</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight">
              Bygg upp din spargris och nå dina mål
            </h4>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Automatisera ditt månadssparande. Sätt undan pengar till buffert, semester eller drömresan och följ dina framsteg i realtid.
            </p>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Dedikerade sparmål med egna ikoner och belopp</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Tydlig historik för allt du sparat</span>
              </li>
            </ul>
          </div>
          <div>
            <MockupPlaceholder 
              id="FEATURE_SAVINGS" 
              aspectRatio="aspect-[4/3]"
              sublabel="Här ska det finnas en bild på sparmål och månadssparande"
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[var(--surface-color)]/40 border-y border-black/[0.04] dark:border-white/[0.06]">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <p className="text-xs font-semibold text-[var(--accent-color)]">
              Användaromdömen
            </p>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Älskad av tusentals sparare
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Se vad några av våra aktiva användare tycker om att använda Dejz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-[22px] bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex text-amber-500 gap-0.5">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                </div>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-normal leading-relaxed">
                  &ldquo;Dejz har helt förändrat hur jag ser på mina pengar. Att äntligen ha en glasklar dagsbudget gör att jag aldrig mer handlar impulsivt.&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-bold text-xs flex items-center justify-center">
                  EM
                </div>
                <div>
                  <h5 className="font-bold text-xs">Elin M.</h5>
                  <p className="text-[10px] text-[var(--text-secondary)]">Användare i 8 månader</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[22px] bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex text-amber-500 gap-0.5">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                </div>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-normal leading-relaxed">
                  &ldquo;Superenkel att komma igång med och otroligt snygg design. Att få alla fasta utgifter synkade med lönedagen är precis vad jag letat efter.&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-bold text-xs flex items-center justify-center">
                  JS
                </div>
                <div>
                  <h5 className="font-bold text-xs">Johan S.</h5>
                  <p className="text-[10px] text-[var(--text-secondary)]">Användare i över ett år</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[22px] bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex text-amber-500 gap-0.5">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                </div>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-normal leading-relaxed">
                  &ldquo;Spargrisen och månadssparandet har gjort att jag faktiskt har fått ihop min buffert. Rekommenderas starkt till alla som vill ha ordning!&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-bold text-xs flex items-center justify-center">
                  ML
                </div>
                <div>
                  <h5 className="font-bold text-xs">Maria L.</h5>
                  <p className="text-[10px] text-[var(--text-secondary)]">Användare i 4 månader</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold text-[var(--accent-color)]">
            Vanliga frågor
          </p>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            Allt du behöver veta om Dejz
          </h3>
        </div>

        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          <FAQItem 
            question="Är Dejz gratis att använda?" 
            answer="Ja, du kan komma igång helt utan kostnad och få full koll på dina utgifter, perioder och dagsbudget."
          />
          <FAQItem 
            question="Hur säker är min information?" 
            answer="All data krypteras och hanteras med högsta säkerhet. Vi säljer aldrig några personuppgifter och du har full kontroll över ditt konto."
          />
          <FAQItem 
            question="Kan jag testa appen innan jag skapar konto?" 
            answer="Absolut! Du kan när som helst klicka på 'Testa interaktiv demo' för att hoppa direkt in i en fullt fungerande demomiljö med förifylld data."
          />
          <FAQItem 
            question="Hur fungerar perioderna från lön till lön?" 
            answer="Du anger vilken dag i månaden du får lön (exempelvis den 25:e). Dejz räknar sedan automatiskt ut din budgetperiod så att den löper mellan lönedagarna istället för kalendermånader."
          />
        </div>
      </section>

      {/* Final Conversion CTA Banner */}
      <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="relative rounded-[28px] bg-[var(--accent-color)] text-[var(--text-on-accent)] p-8 sm:p-12 overflow-hidden text-center space-y-6 shadow-xl">
          <div className="relative z-10 max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Redo a få full koll på ekonomin?
            </h2>
            <p className="text-sm sm:text-base opacity-90">
              Skapa ett gratis konto på under en minut och upplev skillnaden redan idag.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[16px] text-sm font-semibold text-[var(--accent-color)] bg-white hover:bg-white/95 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <span>Kom igång kostnadsfritt</span>
              <ArrowRight size={16} />
            </button>
            {onStartDemo && (
              <button
                onClick={onStartDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[16px] text-sm font-semibold text-white bg-black/20 hover:bg-black/30 transition-all cursor-pointer active:scale-95"
              >
                <span>Testa demot först</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-black/[0.04] dark:border-white/[0.06] bg-[var(--surface-color)]/30">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 select-none">
            <DejzLogo className="text-lg font-black tracking-tight" />
            <span className="text-xs text-[var(--text-secondary)]">© {new Date().getFullYear()} Dejz. Alla rättigheter förbehållna.</span>
          </div>

          <div className="flex items-center gap-5 text-xs font-semibold text-[var(--text-secondary)]">
            {onLegalClick && (
              <>
                <button onClick={() => onLegalClick('privacy')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                  Integritetspolicy
                </button>
                <button onClick={() => onLegalClick('terms')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                  Användarvillkor
                </button>
                <button onClick={() => onLegalClick('cookies')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                  Cookies
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Policy Modal */}
      {activePolicy && (
        <PolicyModal 
          type={activePolicy as any} 
          onClose={() => setActivePolicy(null)} 
          t={t} 
        />
      )}
    </div>
  );
}

export default LandingPage;
