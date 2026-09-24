import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown,
  Check,
  ShieldCheck,
  Database,
  Lock,
  Instagram,
  ChevronRight,
  Play,
  Plus,
  Home,
  History,
  BarChart3,
  WalletCards,
  Search,
  Bell,
  Sparkles,
  Calendar,
  Clock,
  ArrowUp,
  Star,
  Smartphone,
  Tablet,
  Laptop
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

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border-b border-[var(--border-color)] transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left group cursor-pointer"
      >
        <span className={`text-base sm:text-lg font-bold font-exo tracking-tight transition-colors duration-200 ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
          {question}
        </span>
        <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-200 border ${
          isOpen ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] rotate-180 shadow-2xs' : 'bg-[var(--surface-color)] text-[var(--text-secondary)] border-[var(--border-color)] group-hover:bg-[var(--surface-muted)]'
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
            <div className="pb-5 pr-8">
              <p className="text-[var(--text-secondary)] leading-relaxed font-medium text-sm sm:text-base">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function LandingPage({ onGetStarted, onLogin, onStartDemo, onGoogleLogin, onFacebookLogin, onLegalClick, currentLanguage, onLanguageChange, t: _t }: LandingPageProps) {
  const [isLangOpen, setIsLangOpen] = React.useState(false);
  const [activePolicy, setActivePolicy] = React.useState<string | null>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const languages: { code: Language; label: string; icon: string }[] = Object.entries(languageInfo).map(([code, info]) => ({
    code: code as Language,
    label: info.label,
    icon: info.flag
  }));

  const _isSv = currentLanguage === 'sv';

  const getL10n = (
    sv: string,
    en: string,
    no?: string,
    da?: string,
    fi?: string
  ) => {
    switch (currentLanguage) {
      case 'no': return no || en;
      case 'da': return da || en;
      case 'fi': return fi || en;
      case 'sv': return sv;
      default: return en;
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] font-sans overflow-x-hidden relative selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]">
      {/* Subtle Atmospheric Blur Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-100">
        <div className="absolute top-0 left-[15%] w-[60%] h-[40%] bg-black/[0.015] dark:bg-white/[0.02] blur-[150px] rounded-full" />
        <div className="absolute top-[20%] right-[-5%] w-[50%] h-[50%] bg-black/[0.01] dark:bg-white/[0.015] blur-[160px] rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Navigation - Top Bar matching App's header feeling */}
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[var(--bg-color)]/95 border-b border-[var(--border-color)] pt-[env(safe-area-inset-top)] transition-all">
           <div className="max-w-7xl mx-auto px-5 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <DejzLogo className="text-2xl sm:text-3xl font-black" textColor="var(--logo-color)" />

                {/* Language Selector */}
                <div className="relative">
                  <button 
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[var(--text-secondary)]/30 transition-all text-xs font-bold text-[var(--text-primary)] cursor-pointer shadow-2xs"
                    aria-label="Välj språk"
                  >
                    <LanguageFlag language={currentLanguage} size="md" showCode />
                    <ChevronDown size={12} className={`transition-transform duration-200 text-[var(--text-secondary)] ${isLangOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isLangOpen && (
                      <>
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsLangOpen(false)}
                          className="fixed inset-0 z-40"
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          className="absolute top-full mt-2 left-0 z-50 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[18px] shadow-lg overflow-hidden min-w-[160px] py-1"
                        >
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                onLanguageChange(lang.code);
                                setIsLangOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                                currentLanguage === lang.code 
                                  ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]' 
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <LanguageFlag language={lang.code} size="md" />
                                <span>{lang.label}</span>
                              </div>
                              {currentLanguage === lang.code && <Check size={13} className="text-[var(--text-primary)]" />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                 <button 
                   onClick={onLogin || onGetStarted}
                   className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2 rounded-[12px] cursor-pointer"
                 >
                   {getL10n('Logga in', 'Log in', 'Logg inn', 'Log ind', 'Kirjaudu sisään')}
                 </button>

                 <button 
                   onClick={onGetStarted}
                   className="px-4.5 py-2.5 rounded-[14px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-xs sm:text-sm transition-all hover:opacity-95 active:scale-95 shadow-xs cursor-pointer"
                 >
                   {getL10n('Kom igång', 'Get started', 'Kom i gang', 'Kom i gang', 'Aloita')}
                 </button>
              </div>
           </div>
        </nav>

        {/* Hero Section */}
        <section className="w-full border-b border-[var(--border-color)] relative overflow-hidden">
          {/* Subtle Hero Glow with brand accent yellow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[75%] max-w-[650px] h-[300px] sm:h-[400px] bg-gradient-to-tr from-[#FAF59D]/[0.15] via-transparent to-transparent dark:from-[#FAF59D]/[0.08] dark:via-transparent dark:to-transparent blur-[90px] sm:blur-[130px] rounded-full pointer-events-none z-0" />

           <div className="pt-[calc(9.5rem+env(safe-area-inset-top))] md:pt-[calc(11.5rem+env(safe-area-inset-top))] pb-20 md:pb-28 px-5 sm:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-14 lg:gap-16 relative z-10">
              <div className="flex-1 space-y-7 text-center lg:text-left">
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="space-y-4"
                  >
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[70px] font-bold font-exo tracking-tight text-[var(--text-primary)] leading-[1.05]" style={{ fontFamily: '"Exo", sans-serif' }}>
                      {getL10n('Se vad du kan spendera idag.', 'See what you can spend today.', 'Se hva du kan bruke i dag.', 'Se hvad du kan bruge i dag.', 'Katso mitä voit käyttää tänään.')}
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] font-medium max-w-md mx-auto lg:mx-0 leading-relaxed font-sans">
                      {getL10n('Få koll på dina pengar – en dag i taget.', 'Get control of your money – one day at a time.', 'Få kontroll over pengene dine – én dag om gangen.', 'Få styr på dine penge – en dag ad gangen.', 'Hallitse rahojasi – päivä kerrallaan.')}
                    </p>
                  </motion.div>

                  {/* Dual Call-to-actions */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
                    className="flex flex-row flex-wrap items-center justify-center lg:justify-start gap-3"
                  >
                    <button 
                        onClick={onGetStarted} 
                        className="group relative inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-[16px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-sm sm:text-base hover:opacity-95 active:scale-[0.98] transition-all shadow-xs cursor-pointer text-center"
                    >
                        <span>{getL10n('Kom igång gratis', 'Get started for free', 'Kom i gang gratis', 'Kom i gang gratis', 'Aloita ilmaiseksi')}</span>
                        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {onStartDemo && (
                      <button
                        onClick={onStartDemo}
                        className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-[16px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] font-bold text-sm sm:text-base active:scale-[0.98] transition-all cursor-pointer shadow-xs text-center"
                      >
                        <Play size={13} className="fill-[var(--accent-color)] text-[var(--accent-color)]" />
                        <span>{getL10n('Testa demo direkt', 'Try Demo Instantly', 'Prøv demoen nå', 'Prøv demo med det samme', 'Kokeile demoa heti')}</span>
                      </button>
                    )}
                  </motion.div>

                  {/* Social Login CTAs */}
                  {(onGoogleLogin || onFacebookLogin) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.18, ease: 'easeOut' }}
                      className="flex flex-col items-center lg:items-start gap-2 pt-1"
                    >
                      <div className="flex items-center gap-3 w-auto justify-center lg:justify-start">
                        <div className="h-px bg-[var(--border-color)] w-8"></div>
                        <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{getL10n('eller fortsätt med', 'or continue with', 'eller fortsett med', 'eller fortsæt med', 'tai jatka palvelulla')}</span>
                        <div className="h-px bg-[var(--border-color)] w-8"></div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        {onGoogleLogin && (
                          <button
                            onClick={onGoogleLogin}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[14px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-xs active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                fill="#4285F4"
                                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.28 1.5-1.11 2.76-2.36 3.61v3h3.84c2.25-2.07 3.65-5.12 3.65-8.46Z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.84-3c-1.07.72-2.45 1.16-4.09 1.16-3.15 0-5.81-2.13-6.76-5.01H1.27v3.1A11.986 11.986 0 0 0 12 24Z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.24 14.24a7.15 7.15 0 0 1 0-4.48V6.66H1.27a11.99 11.99 0 0 0 0 10.68l3.97-3.1Z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.33 2.67 1.27 6.66l3.97 3.1c.95-2.88 3.61-5.01 6.76-5.01Z"
                              />
                            </svg>
                            <span>Google</span>
                          </button>
                        )}

                        {onFacebookLogin && (
                          <button
                            onClick={onFacebookLogin}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[14px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-xs active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            <span>Facebook</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
              </div>

              {/* Modern Live App Image Mockup */}
              <div className="flex-1 w-full max-w-xl relative mx-auto flex items-center justify-center">
                {/* Shadow bloom */}
                <div className="absolute top-[10%] bottom-[10%] left-[10%] right-[10%] bg-[#071020]/10 dark:bg-white/5 blur-3xl rounded-full pointer-events-none" />
                
                <motion.img 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  src="/hero.png" 
                  alt="Dejz App Mockup" 
                  className="w-full max-w-[480px] sm:max-w-[540px] h-auto object-contain relative z-10 select-none drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
           </div>
        </section>

        {/* "Så fungerar Dejz" Section */}
        <section id="how-it-works" className="w-full bg-[var(--bg-color)] border-b border-[var(--border-color)] py-20 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center">
            <div className="space-y-3 mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-exo tracking-tight text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>
                {getL10n('Så fungerar Dejz', 'How Dejz works', 'Slik fungerer Dejz', 'Sådan fungerer Dejz', 'Miten Dejz toimii')}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium max-w-md mx-auto">
                {getL10n('Tre enkla steg till fullständig koll på vardagsekonomin.', 'Three simple steps to full financial clarity.', 'Tre enkle trinn til full kontroll over hverdagsøkonomien.', 'Tre enkle trin til fuld kontrol over hverdagsøkonomien.', 'Kolme helppoa vaihetta arjen talouden täydelliseen hallintaan.')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { 
                  id: '1', 
                  title: getL10n('Lägg in din ekonomi', 'Add your finances', 'Legg inn økonomien din', 'Indtast din økonomi', 'Syötä taloutesi tiedot'), 
                  desc: getL10n('Fyll i inkomst, fasta räkningar och månadssparande.', 'Enter income, fixed bills, and monthly savings.', 'Fyll inn inntekt, faste regninger og månedlig sparing.', 'Udfyld indkomst, faste regninger og månedlig opsparing.', 'Täytä tulot, faste laskut ja kuukausisäästöt.'),
                  widget: (
                    <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[22px] p-4 text-left font-sans space-y-3 shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">{getL10n('Månadskalkyl', 'Period budget', 'Månedskalkyle', 'Månedsbudget', 'Kuukausilaskelma')}</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                          <span className="text-xs text-[var(--text-secondary)] font-semibold">{getL10n('Inkomst', 'Income', 'Inntekt', 'Indkomst', 'Tulot')}</span>
                          <span className="text-xs font-bold font-amount text-[var(--text-primary)]">25 000 kr</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                          <span className="text-xs text-[var(--text-secondary)] font-semibold">{getL10n('Fasta utgifter', 'Fixed Expenses', 'Faste utgifter', 'Faste udgifter', 'Kiinteät kulut')}</span>
                          <span className="text-xs font-bold font-amount text-[var(--text-primary)]">12 000 kr</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)]">
                          <span className="text-xs text-[var(--text-secondary)] font-semibold">{getL10n('Sparande', 'Savings', 'Sparing', 'Opsparing', 'Säästöt')}</span>
                          <span className="text-xs font-bold font-amount text-[var(--text-primary)]">3 000 kr</span>
                        </div>
                      </div>
                      <div className="pt-1 flex items-center justify-between text-xs">
                        <span className="text-emerald-500 font-bold">{getL10n('Kvar till vardag', 'Disposable', 'Igjen til hverdag', 'Rådighedsbeløb', 'Käytettävissä arkeen')}</span>
                        <span className="font-bold text-emerald-500 font-amount">10 000 kr</span>
                      </div>
                    </div>
                  )
                },
                { 
                  id: '2', 
                  title: getL10n('Få din dagsbudget', 'Get your daily budget', 'Få ditt dagsbudsjett', 'Få dit dagsbudget', 'Hanki päiväbudjettisi'), 
                  desc: getL10n('Dejz räknar automatiskt ut vad du har råd att spendera idag.', 'Dejz calculates exactly what you can afford to spend today.', 'Dejz beregner automatisk hva du har råd til å bruke i dag.', 'Dejz beregner automatisk, hvad du har råd til at bruge i dag.', 'Dejz laskee automaattisesti, mitä sinulla on varaa käyttää tänään.'),
                  widget: (
                    <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[22px] p-4 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">{getL10n('Dagsbudget', 'Daily budget', 'Dagsbudsjett', 'Dagsbudget', 'Päiväbudjetti')}</div>
                      <div className="w-20 h-20 rounded-full border-[3px] border-[var(--border-color)] border-t-[var(--accent-color)] flex flex-col items-center justify-center shadow-2xs relative">
                        <span className="text-2xl font-bold font-amount text-[var(--text-primary)] leading-none">333</span>
                        <span className="text-[9px] text-[var(--text-secondary)] font-bold mt-0.5">{getL10n('kr / dag', 'kr / day', 'kr / dag', 'kr / dag', 'kr / pv')}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                        {getL10n('Beräknat på 30 dagar kvar i perioden', 'Calculated on 30 days remaining', 'Beregnet på 30 dager igjen i perioden', 'Beregnet på 30 dage tilbage i perioden', 'Laskettu kauden 30 jäljellä olevan päivän perusteella')}
                      </p>
                    </div>
                  )
                },
                { 
                  id: '3', 
                  title: getL10n('Logga köp med ett klick', 'Log purchases easily', 'Registrer kjøp med ett klikk', 'Registrer køb med ét klik', 'Kirjaa ostokset yhdellä klikkauksella'), 
                  desc: getL10n('Se direkt hur din dagsbudget anpassas inför morgondagen.', 'See instantly how tomorrow\'s daily budget adjusts.', 'Se umiddelbart hvordan dagsbudsjettet tilpasses for morgendagen.', 'Se med det samme, hvordan dit dagsbudget tilpasses til i morgen.', 'Näe heti, miten päiväbudjettisi mukautuu huomista varten.'),
                  widget: (
                    <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[22px] p-4 text-left font-sans space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">{getL10n('Registrera', 'Register', 'Registrer', 'Registrer', 'Rekisteröi')}</div>
                        <span className="text-[9px] text-emerald-500 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10">{getL10n('Uppdaterad', 'Live', 'Oppdatert', 'Opdateret', 'Päivitetty')}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="bg-[var(--surface-muted)] rounded-[12px] p-2 flex items-center justify-between border border-[var(--border-color)]">
                          <span className="text-xs font-bold text-[var(--text-primary)]">🍔 {getL10n('Lunch', 'Lunch', 'Lunsj', 'Frokost', 'Lounas')}</span>
                          <span className="text-xs font-bold font-amount text-[var(--text-primary)]">-120 kr</span>
                        </div>
                        <div className="bg-[var(--surface-muted)] rounded-[12px] p-2 flex items-center justify-between border border-[var(--border-color)]">
                          <span className="text-xs font-bold text-[var(--text-primary)]">☕ {getL10n('Kaffe', 'Coffee', 'Kaffe', 'Kaffe', 'Kahvi')}</span>
                          <span className="text-xs font-bold font-amount text-[var(--text-primary)]">-45 kr</span>
                        </div>
                      </div>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-medium">
                        <span>{getL10n('Ny dagsbudget imorgon:', 'Tomorrow\'s budget:', 'Nytt dagsbudsjett i morgen:', 'Nyt dagsbudget i morgen:', 'Uusi päiväbudjetti huomenna:')}</span>
                        <span className="font-bold text-[var(--text-primary)] font-amount">340 kr</span>
                      </div>
                    </div>
                  )
                }
              ].map((step) => (
                <div key={step.id} className="flex flex-col items-center text-center p-6 rounded-[28px] bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs relative">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20 font-bold text-xs flex items-center justify-center mb-4">
                    {step.id}
                  </div>

                  <div className="w-full max-w-[240px] mb-5">
                    {step.widget}
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold font-exo tracking-tight text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>{step.title}</h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Device Sync Showcase Section */}
        <section id="device-sync" className="w-full bg-[var(--bg-color)] border-b border-[var(--border-color)] py-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center space-y-3 mb-16 max-w-2xl mx-auto">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-3 py-1 rounded-full">
                {getL10n('Alltid synkat • Överallt', 'Always Synced • Everywhere', 'Alltid synkronisert • Overalt', 'Altid synkroniseret • Overalt', 'Aina synkronoitu • Kaikkialla')}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-exo tracking-tight text-[var(--text-primary)] pt-1" style={{ fontFamily: '"Exo", sans-serif' }}>
                {getL10n('Mobil, padda eller dator – allt hänger ihop', 'Phone, tablet, or computer – it all syncs', 'Mobil, nettbrett eller PC – alt henger sammen', 'Mobil, tablet eller computer – det hele synkroniseres', 'Puhelin, tabletti tai tietokone – kaikki synkronoituu')}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium">
                {getL10n('Logga ett kaffe på språng i mobilen, kolla dagsbudgeten på surfplattan i soffan eller planera månaden på skärmen. Dejz synkar allt på en mikrosekund oavsett enhet.', 'Log a coffee on the go, check your daily budget on your tablet, or plan on your desktop. Dejz syncs everything in a split second on any device.', 'Registrer en kaffe på farten på mobilen, sjekk dagsbudsjettet på nettbrettet i sofaen, eller planlegg måneden på PC-en. Dejz synkroniserer alt på et mikrosekund uansett enhet.', 'Registrer en kaffe på farten på mobilen, tjek dagsbudgettet på din tablet i sofaen, eller planlæg måneden på pc\'en. Dejz synkroniserer alt på et mikrosekund uanset enhed.', 'Kirjaa kahvi lennosta puhelimella, tarkista päiväbudjetti tabletilta sohvalla tai suunnittele kuukausi tietokoneella. Dejz synkronoituu mikrosekunnissa laitteesta riippumatta.')}
              </p>
            </div>

            {/* Layout showing 3 stylized devices with instant synchronization lines */}
            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch relative">
              {/* Device 1: Mobile */}
              <div className="flex flex-col rounded-[32px] bg-[var(--surface-color)] border border-[var(--border-color)] p-6 shadow-xs relative overflow-hidden flex-1 justify-between min-h-[320px] lg:min-h-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Smartphone size={16} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold font-exo text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>{getL10n('I mobilen', 'In your pocket', 'På mobilen', 'På mobilen', 'Puhelimessa')}</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium">{getL10n('Snabb inmatning i farten', 'Quick logging on the go', 'Hurtig registrering på farten', 'Hurtig indtastning på farten', 'Nopea kirjaus lennosta')}</p>
                    </div>
                  </div>
                  
                  {/* Visual UI Preview */}
                  <div className="bg-[var(--bg-color)] rounded-[20px] p-4.5 border border-[var(--border-color)] space-y-3 shadow-2xs relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">☕ Espresso House</span>
                      <span className="text-[10px] font-bold text-rose-500">-45 kr</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 w-[80%] rounded-full" />
                    </div>
                    <div className="text-[9px] text-[var(--text-secondary)] font-semibold flex justify-between items-center">
                      <span>{getL10n('Dagsbudget kvar:', 'Remaining:', 'Dagsbudsjett igjen:', 'Dagsbudget tilbage:', 'Päiväbudjetti jäljellä:')}</span>
                      <span className="font-amount font-bold text-emerald-500">288 kr</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-color)]/60 text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {getL10n('Mobiloptimerad Web-app & PWA', 'Mobile optimized Web App & PWA', 'Mobiloptimalisert Web-app & PWA', 'Mobiloptimeret Web-app & PWA', 'Mobiilioptimoitu Web-appi & PWA')}
                </div>
              </div>

              {/* Device 2: Tablet */}
              <div className="flex flex-col rounded-[32px] bg-[var(--surface-color)] border border-[var(--border-color)] p-6 shadow-xs relative overflow-hidden flex-1 justify-between min-h-[320px] lg:min-h-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Tablet size={16} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold font-exo text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>{getL10n('På surfplattan', 'On your tablet', 'På nettbrettet', 'På din tablet', 'Tabletilla')}</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium">{getL10n('Perfekt överblick i soffan', 'Perfect overview from the couch', 'Perfekt oversikt i sofaen', 'Perfekt overblik i sofaen', 'Täydellinen yleiskuva sohvalla')}</p>
                    </div>
                  </div>

                  {/* Visual UI Preview */}
                  <div className="bg-[var(--bg-color)] rounded-[20px] p-4.5 border border-[var(--border-color)] space-y-3.5 shadow-2xs relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-[var(--text-primary)]">{getL10n('Septemberanalys', 'September Analysis', 'Septemberanalyse', 'Septemberanalyse', 'Syyskuun analyysi')}</span>
                      <span className="text-[10px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10">{getL10n('Synkad', 'Synced', 'Synkronisert', 'Synkroniseret', 'Synkronoitu')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[var(--surface-color)] rounded-[12px] border border-[var(--border-color)] text-center">
                        <span className="text-[8px] text-[var(--text-secondary)] block font-semibold">{getL10n('Inkomst', 'Income', 'Inntekt', 'Indkomst', 'Tulot')}</span>
                        <span className="text-xs font-bold text-emerald-500 font-amount">+34 700 kr</span>
                      </div>
                      <div className="p-2 bg-[var(--surface-color)] rounded-[12px] border border-[var(--border-color)] text-center">
                        <span className="text-[8px] text-[var(--text-secondary)] block font-semibold">{getL10n('Fasta', 'Fixed', 'Faste', 'Faste', 'Kiinteät')}</span>
                        <span className="text-xs font-bold text-rose-500 font-amount">-11 414 kr</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-color)]/60 text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {getL10n('Responsiv design för alla skärmar', 'Responsive layout for all screens', 'Responsivt design for alle skjermer', 'Responsivt design til alle skærme', 'Responsiivinen asettelu kaikille ruuduille')}
                </div>
              </div>

              {/* Device 3: Laptop/Desktop */}
              <div className="flex flex-col rounded-[32px] bg-[var(--surface-color)] border border-[var(--border-color)] p-6 shadow-xs relative overflow-hidden flex-1 justify-between min-h-[320px] lg:min-h-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                      <Laptop size={16} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold font-exo text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>{getL10n('På datorn', 'On your computer', 'På PC-en', 'På computeren', 'Tietokoneella')}</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium">{getL10n('Planera och analysera i lugn och ro', 'Plan and analyze comfortably', 'Planlegg og analyser i fred og ro', 'Planlæg og analysér i ro og mag', 'Suunnittele ja analysoi rauhassa')}</p>
                    </div>
                  </div>

                  {/* Visual UI Preview */}
                  <div className="bg-[var(--bg-color)] rounded-[20px] p-4.5 border border-[var(--border-color)] space-y-3 shadow-2xs relative">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-2 bg-[var(--surface-color)] rounded-[12px] border border-[var(--border-color)]">
                        <span className="text-[9px] text-[var(--text-secondary)] font-semibold">{getL10n('Deltidslön', 'Salary', 'Lønn', 'Løn', 'Palkka')}</span>
                        <span className="text-[10px] font-bold text-emerald-500 font-amount">+12 400 kr</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[var(--surface-color)] rounded-[12px] border border-[var(--border-color)]">
                        <span className="text-[9px] text-[var(--text-secondary)] font-semibold">{getL10n('Hyresrätt', 'Rent', 'Husleie', 'Husleje', 'Vuokra')}</span>
                        <span className="text-[10px] font-bold text-rose-500 font-amount">-6 500 kr</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-color)]/60 text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {getL10n('Molnsynkronisering i realtid', 'Real-time cloud database sync', 'Skysynkronisering i sanntid', 'Sky-synkronisering i realtid', 'Reaaliaikainen pilvisynkronointi')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="w-full bg-[var(--bg-color)] border-b border-[var(--border-color)] py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center space-y-3 mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-exo tracking-tight text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>
                {getL10n('Vad våra användare säger', 'What our users say', 'Hva brukerne våre sier', 'Hvad vores brugere siger', 'Mitä käyttäjämme sanovat')}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium max-w-md mx-auto">
                {getL10n('Anslut dig till tusentals andra som har tagit full kontroll över sina pengar.', 'Join thousands of others who have taken full control of their money.', 'Bli med tusenvis av andre som har tatt full kontroll over pengene sine.', 'Slut dig til tusindvis av andre, der har taget fuld kontrol over deres penge.', 'Liity tuhansien muiden joukkoon, jotka ovat ottaneet taloutensa täysin haltuun.')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  initials: 'L',
                  isVerified: true,
                  bg: 'from-pink-400/20 to-purple-400/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/40',
                  name: 'Linnéa, 28',
                  city: getL10n('Stockholm', 'Stockholm', 'Stockholm', 'Stockholm', 'Tukholma'),
                  quote: getL10n(
                    'Det absolut bästa verktyget jag använt. Att få en dagsbudget istället för tråkiga månadskalkyler ändrade helt hur jag tänker på pengar.',
                    'The absolute best tool I\'ve used. Getting a daily budget instead of boring monthly calculators completely changed how I think about money.',
                    'Det desidert beste verktøyet jeg har brukt. Å få et dagsbudsjett i stedet for kjedelige månedskalkyler endret måten jeg tenker på penger.',
                    'Det absolut bedste værktøj, jeg har brugt. At få et dagsbudget i stedet for kedelige månedskalkuler ændrede fuldstændig min måde at tænke på penge.',
                    'Ylivoimaisesti paras työkalu, jota olen käyttänyt. Päiväbudjetin saaminen tylsien kuukausilaskelmien sijaan muutti täysin tavan, jolla ajattelen rahaa.'
                  )
                },
                {
                  initials: 'K',
                  isVerified: false,
                  image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
                  bg: 'from-amber-400/20 to-orange-400/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40',
                  name: 'Kevin, 31',
                  city: getL10n('Helsingborg', 'Helsingborg', 'Helsingborg', 'Helsingborg', 'Helsingborg'),
                  quote: getL10n(
                    'Har äntligen fått koll på ekonomin. Det gäller bara att lägga in allt första gången och vara noga med att lägga in efter varje köp. Men så värt att ha full kontroll, och det är kul också.',
                    'Finally got control of my finances. You just have to enter everything the first time and be diligent about entering after every purchase. But so worth having full control, and it\'s fun too.',
                    'Har endelig fått kontroll på økonomien. Det gjelder bare å legge inn alt den første gangen og være nøye med å legge inn etter hvert kjøp. Men så verdt å ha full kontroll, og det er gøy også.',
                    'Har endelig fået styr på økonomien. Det gælder bare om at lægge alt ind første gang og være omhyggelig med at lægge det ind efter hvert køb. Men så meget værd at have fuld kontrol, og det er også sjovt.',
                    'Sain vihdoinkin talouteni hallintaan. Pitää vain syöttää kaikki ensimmäisellä kerralla ja muistaa kirjata jokaisen ostoksen jälkeen. Mutta on todella sen arvoista saada täysi hallinta, ja se on myös hauskaa.'
                  )
                },
                {
                  initials: 'S',
                  isVerified: true,
                  bg: 'from-amber-400/20 to-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
                  name: 'Sofie, 23',
                  city: getL10n('Köpenhamn', 'Copenhagen', 'København', 'København', 'Kööpenhamina'),
                  quote: getL10n(
                    'Som student var det alltid svårt att veta hur mycket jag hade kvar i slutet av månaden. Dagsbudgeten i Dejz räddade min studentekonomi.',
                    'As a student, it was always hard to know how much I had left at the end of the month. The daily budget in Dejz saved my student budget.',
                    'Som student var det alltid vanskelig å vite hvor mye jeg hadde igjen i slutten av måneden. Dagsbudsjettet i Dejz reddet studentøkonomien min.',
                    'Som studerende var det altid svært at vide, hvor meget jeg havde tilbage i slutningen af måneden. Dagsbudgettet i Dejz reddede min studenterøkonomi.',
                    'Opiskelijana oli aina vaikea tietää, kuinka paljon minulla oli jäljellä kuun lopussa. Dejzin päiväbudjetti pelasti opiskelijatalouteni.'
                  )
                }
              ].map((user, idx) => {
                // Inline component definition or inline avatar render for clean scoping
                const AvatarComponent = () => {
                  const [imgError, setImgError] = React.useState(false);
                  if (user.image && !imgError) {
                    return (
                      <img 
                        src={user.image} 
                        alt={user.name} 
                        onError={() => setImgError(true)}
                        className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)] shrink-0 shadow-2xs"
                      />
                    );
                  }
                  return (
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${user.bg} border flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs`}>
                      {user.initials}
                    </div>
                  );
                };

                return (
                  <div key={idx} className="flex flex-col justify-between p-6 rounded-[28px] bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs relative">
                    <div className="space-y-4">
                      {/* Stars Row */}
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>

                      {/* Review Quote */}
                      <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-relaxed italic">
                        &ldquo;{user.quote}&rdquo;
                      </p>
                    </div>

                    {/* Profile Info */}
                    <div className="flex items-center gap-3.5 mt-6 pt-5 border-t border-[var(--border-color)]">
                      <AvatarComponent />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">{user.name}</span>
                          {user.isVerified && (
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0" title="Verifierad användare">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-medium leading-none block mt-0.5">
                          {user.city}
                          {user.isVerified ? ` • ${getL10n('Verifierad köpare', 'Verified User', 'Verifisert bruker', 'Verificeret bruger', 'Vahvistettu käyttäjä')}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security & Privacy Section */}
        <section id="security" className="w-full bg-[var(--bg-color)] py-20 border-b border-[var(--border-color)] relative">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 relative z-10">
            <div className="grid md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-5 space-y-4 text-center md:text-left">
                <div className="w-14 h-14 rounded-[20px] bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20 flex items-center justify-center mx-auto md:mx-0 shadow-2xs">
                  <ShieldCheck size={28} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold font-exo tracking-tight text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>
                  {getL10n('Din ekonomi är 100% din.', 'Your finances are 100% yours.', 'Din økonomi er 100 % din.', 'Din økonomi er 100 % din.', 'Taloutesi on 100-prosenttisesti sinun.')}
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium leading-relaxed">
                  {getL10n(
                    'Dejz kopplas aldrig till din bank och säljer aldrig din data vidare. All information krypteras säkert.',
                    'Dejz never connects to your bank and never sells your data. Everything is encrypted.',
                    'Dejz kobles aldri til banken din og selger aldri dataene dine videre. All informasjon krypteres sikkert.',
                    'Dejz forbindes aldrig med din bank og sælger aldrig dine data videre. Al information krypteres sikkert.',
                    'Dejziä ei koskaan yhdistetä pankkiisi eikä se koskaan myy tietojasi eteenpäin. Kaikki tiedot salataan turvallisesti.'
                  )}
                </p>
              </div>

              <div className="md:col-span-7 space-y-3.5">
                {[
                  {
                    icon: Database,
                    title: getL10n('Dina uppgifter skyddas enligt GDPR', 'Data protected under GDPR', 'Dine opplysninger beskyttes i henhold til GDPR', 'Dine oplysninger beskyttes i henhold til GDPR', 'Tietosi on suojattu GDPR:n mukaisesti'),
                    desc: getL10n(
                      'Du har full äganderätt och kan radera all data med ett klick när du vill.',
                      'You have full ownership and can delete your data anytime.',
                      'Du har full eiendomsrett og kan slette alle data med ett klikk når du vil.',
                      'Du har fuld ejendomsret og kan slette alle data med ét klik, når du vil.',
                      'Sinulla on täysi omistusoikeus ja voit poistaa kaikki tiedot yhdellä klikkauksella milloin tahansa.'
                    )
                  },
                  {
                    icon: Lock,
                    title: getL10n('Ingen bankkoppling krävs', 'No bank connection required', 'Ingen bankkobling kreves', 'Ingen bankforbindelse påkrævet', 'Pankkiyhteyttä ei vaadita'),
                    desc: getL10n(
                      'Du behåller full anonymitet och kontroll utan riskabla bankbehörigheter.',
                      'Full control and privacy without sensitive bank credentials.',
                      'Du beholder full anonymitet og kontroll uten risikable banktilganger.',
                      'Du beholder fuld anonymitet og kontrol uden risikable banktilladelser.',
                      'Säilytät täyden anonymiteetin ja hallinnan ilman riskiä sisältäviä pankkivaltuuksia.'
                    )
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-5 sm:p-6 rounded-[22px] border border-[var(--border-color)] bg-[var(--surface-color)] flex items-start gap-4 text-left shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-[var(--surface-muted)] text-[var(--accent-color)] shrink-0 border border-[var(--border-color)]">
                      <item.icon size={20} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold font-exo tracking-tight text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>{item.title}</h3>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section id="pricing" className="w-full bg-[var(--bg-color)] py-16 sm:py-20 border-b border-[var(--border-color)] relative">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <div className="bg-[var(--surface-color)] border border-[var(--border-color)] p-8 sm:p-12 rounded-[28px] space-y-6 shadow-xs flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF59D] text-[#071020] text-xs font-bold shadow-2xs mb-2 select-none shrink-0">
                <span>⚡ {getL10n('100% Gratis & Reklamfritt', '100% Free & No Ads', '100% Gratis & Reklamfri', '100% Gratis & Reklamefri', '100% Ilmainen & Mainokseton')}</span>
              </div>
              <div className="space-y-2.5 max-w-xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl font-bold font-exo tracking-tight text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>
                  {getL10n('Kom igång med Dejz idag', 'Get started with Dejz today', 'Kom i gang med Dejz i dag', 'Kom i gang med Dejz i dag', 'Aloita Dejzin käyttö tänään')}
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium leading-relaxed">
                  {getL10n(
                    'Börja fatta smartare vardagsbeslut och få pengarna att räcka hela månaden.',
                    'Make smarter everyday decisions and manage your budget with ease.',
                    'Begynn å ta smartere hverdagsvalg og få pengene til å strekke til hele måneden.',
                    'Begynd at tage smartere hverdagsbeslutninger og få pengene til at række hele måneden.',
                    'Aloita viisaampien arkipäivän päätösten tekeminen ja saada rahat riittämään koko kuukaudeksi.'
                  )}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-[16px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-sm sm:text-base hover:opacity-95 active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{getL10n('Kom igång gratis', 'Get started for free', 'Kom i gang gratis', 'Kom i gang gratis', 'Aloita ilmaiseksi')}</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full bg-[var(--bg-color)] py-16 sm:py-20 border-b border-[var(--border-color)]">
          <div className="max-w-3xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-12 space-y-2.5">
              <h2 className="text-3xl sm:text-4xl font-bold font-exo tracking-tight text-[var(--text-primary)]" style={{ fontFamily: '"Exo", sans-serif' }}>
                {getL10n('Vanliga frågor', 'Frequently Asked Questions', 'Ofte stilte spørsmål', 'Ofte stillede spørgsmål', 'Usein kysytyt kysymykset')}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium">
                {getL10n('Hittar du inte svaret du söker? Kontakta oss på', 'Need more help? Email us at', 'Finner du ikke svaret du leter etter? Kontakt oss på', 'Finder du ikke det svar, du søger? Kontakt os på', 'Etkö löydä etsimääsi vastausta? Ota yhteyttä osoitteeseen')} <a href="mailto:hej@dejz.se" className="text-[var(--accent-color)] font-bold hover:underline">hej@dejz.se</a>
              </p>
            </div>
            
            <div className="space-y-1">
              <FAQItem 
                question={getL10n('Vad kostar Dejz?', 'How much does Dejz cost?', 'Hva koster Dejz?', 'Hvad koster Dejz?', 'Mitä Dejz maksaa?')} 
                answer={getL10n('Dejz är helt gratis att använda.', 'Dejz is completely free to use.', 'Dejz er helt gratis å bruke.', 'Dejz er helt gratis at bruge.', 'Dejzin käyttö on täysin ilmaista.')}
              />
              <FAQItem 
                question={getL10n('Behöver jag koppla mitt bankkonto?', 'Do I need to connect my bank account?', 'Må jeg koble til bankkontoen min?', 'Skal jeg tilslutte min bankkonto?', 'Pitääkö minun yhdistää pankkitilini?')} 
                answer={getL10n(
                  'Nej. Du anger själv dina inkomster och fasta kostnader. Dejz har ingen tillgång till ditt bankkonto.',
                  'No. You log income and expenses yourself. Dejz never accesses your bank.',
                  'Nei. Du legger inn inntekter og faste kostnader selv. Dejz har ikke tilgang til bankkontoen din.',
                  'Nej. Du angiver selv dine indkomster og faste omkostninger. Dejz har ikke adgang til din bankkonto.',
                  'Ei. Ilmoitat itse tulosi ja kiinteät kulusi. Dejzillä ei ole pääsyä pankkitilillesi.'
                )}
              />
              <FAQItem 
                question={getL10n('Hur fungerar dagsbudgeten?', 'How does the daily budget work?', 'Hvordan fungerer dagsbudsjettet?', 'Hvordan fungerer dagsbudgettet?', 'Miten päiväbudjetti toimii?')} 
                answer={getL10n(
                  'Dejz tar ditt disponibla belopp och delar det på antalet dagar fram till din nästa lönedag. Varje köp du gör anpassar summan automatiskt.',
                  'Dejz divides your disposable income by the days left until payday. Every purchase updates your daily allowance.',
                  'Dejz tar ditt disponible beløp og deler det på antall dager frem til din neste lønningsdag. Hvert kjøp du gjør justerer summen automatisk.',
                  'Dejz tager dit rådighedsbeløb og deler det med antallet af dage indtil din næste lønningsdag. Hvert køb, du foretager, justerer automatisk beløbet.',
                  'Dejz ottaa käytettävissä olevan summasi ja jakaa sen seuraavaan palkkapäivääsi jäljellä olevien päivien määrällä. Jokainen tekemäsi ostos säätää summaa automaattisesti.'
                )}
              />
            </div>
          </div>
        </section>

        {/* Minimal Clean Footer */}
        <footer className="w-full bg-[var(--bg-color)] border-t border-[var(--border-color)] py-7 transition-colors">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-[var(--text-secondary)]">
            {/* Left: Brand & Copyright */}
            <div className="flex items-center gap-2.5">
              <DejzLogo className="text-lg font-bold" textColor="var(--logo-color)" />
              <span className="opacity-40">•</span>
              <span>© {new Date().getFullYear()} Dejz</span>
            </div>

            {/* Right: Inline Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
              <button 
                onClick={() => onLegalClick ? onLegalClick('privacy') : setActivePolicy('privacy')} 
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {getL10n('Integritetspolicy', 'Privacy Policy', 'Personvernerklæring', 'Privatlivspolitik', 'Tietosuojaseloste')}
              </button>

              <button 
                onClick={() => onLegalClick ? onLegalClick('terms') : setActivePolicy('terms')} 
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {getL10n('Användarvillkor', 'Terms of Service', 'Brukervilkår', 'Brugervilkår', 'Käyttöehdot')}
              </button>

              <button 
                onClick={() => onLegalClick ? onLegalClick('cookies') : setActivePolicy('cookies')} 
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {getL10n('Cookies', 'Cookies', 'Cookies', 'Cookies', 'Evästeet')}
              </button>

              <a 
                href="https://instagram.com/dejz.se" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
              >
                <Instagram size={13} className="text-[#E1306C]" />
                <span>Instagram</span>
              </a>

              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer ml-1"
                title="Till toppen"
              >
                <ArrowUp size={12} />
                <span>{getL10n('Till toppen', 'Top', 'Til toppen', 'Til toppen', 'Alkuun')}</span>
              </button>
            </div>
          </div>

          <PolicyModal 
            isOpen={!!activePolicy} 
            onClose={() => setActivePolicy(null)} 
            title={
              activePolicy === 'terms' ? getL10n('Användarvillkor', 'Terms of Service', 'Brukervilkår', 'Brugervilkår', 'Käyttöehdot') : 
              getL10n('Integritet & Cookies', 'Privacy & Cookies', 'Personvern & informasjonskapsler', 'Privatliv & Cookies', 'Tietosuoja & Evästeet')
            }
            content={
              activePolicy === 'terms' ? (
                <div className="space-y-6 text-sm text-[var(--text-primary)]">
                  <section className="space-y-2 text-left">
                    <h3 className="text-base font-bold font-exo">1. {getL10n('Godkännande av villkor', 'Acceptance of Terms', 'Godkjenning av vilkår', 'Accept af vilkår', 'Ehtojen hyväksyminen')}</h3>
                    <p className="text-[var(--text-secondary)] font-medium">
                      {getL10n(
                        'Genom att registrera ett konto eller använda Dejz godkänner du dessa användarvillkor.',
                        'By registering an account or using Dejz, you agree to these terms of service.',
                        'Ved å registrere en konto eller bruke Dejz godtar du disse brukervilkårene.',
                        'Ved at registrere en konto eller bruge Dejz accepterer du disse brugervilkår.',
                        'Rekisteröimällä tilin tai käyttämällä Dejziä hyväksyt nämä käyttöehdot.'
                      )}
                    </p>
                  </section>
                  <section className="space-y-2 text-left">
                    <h3 className="text-base font-bold font-exo">2. {getL10n('Tjänstens omfattning', 'Scope of Service', 'Tjenestens omfang', 'Tjenestens omfang', 'Palvelun laajuus')}</h3>
                    <p className="text-[var(--text-secondary)] font-medium">
                      {getL10n(
                        'Dejz är ett digitalt verktyg för personlig budgetering och ekonomisk överblick. Beräkningar och prognoser är vägledande och utgör inte professionell finansiell rådgivning.',
                        'Dejz is a digital tool for personal budgeting and financial overview. Calculations and projections are guidelines and do not constitute professional financial advice.',
                        'Dejz er et digitalt verktøy for personlig budsjettering og økonomisk oversikt. Beregninger og prognoser er veiledende og utgjør ikke profesjonell økonomisk rådgivning.',
                        'Dejz er et digitalt værktøj til personlig budgettering og økonomisk overblik. Beregninger og prognoser er vejledende og udgør ikke professionel finansiel rådgivning.',
                        'Dejz on digitaalinen työkalu henkilökohtaiseen budjetointiin ja taloudelliseen yleiskatsaukseen. Laskelmat ja ennusteet ovat suuntaa-antavia eivätkä ne ole ammatillista taloudellista neuvontaa.'
                      )}
                    </p>
                  </section>
                  <section className="space-y-2 text-left">
                    <h3 className="text-base font-bold font-exo">3. {getL10n('Ansvarsbegränsning', 'Limitation of Liability', 'Ansvarsbegrensning', 'Ansvarsbegrænsning', 'Vastuunrajoitus')}</h3>
                    <p className="text-[var(--text-secondary)] font-medium">
                      {getL10n(
                        'Användaren ansvarar själv för sina ekonomiska beslut. Vi tar inget ansvar för eventuella ekonomiska förluster till följd av användning av appen.',
                        'The user is solely responsible for their financial decisions. We assume no responsibility for any financial losses resulting from the use of the app.',
                        'Brukeren er selv ansvarlig for sine økonomiske beslutninger. Vi påtar oss intet ansvar for eventuelle økonomiske tap som følge av bruk av appen.',
                        'Brugeren er selv ansvarlig for sine økonomiske beslutninger. Vi påtager os intet ansvar for eventuelle økonomiske tab som følge af brugen af appen.',
                        'Käyttäjä on itse vastuussa taloudellisista päätöksistään. Emme ota vastuuta mahdollisista taloudellisista menetyksistä, jotka johtuvat sovelluksen käytöstä.'
                      )}
                    </p>
                  </section>
                </div>
              ) : (
                <div className="space-y-6 text-sm text-left text-[var(--text-primary)]">
                  <section className="space-y-2">
                    <h3 className="text-base font-bold font-exo">{getL10n('Cookiepolicy', 'Cookie Policy', 'Informsjonskapselpolicy', 'Cookiepolitik', 'Evästekäytäntö')}</h3>
                    <p className="text-[var(--text-secondary)] font-medium">
                      {getL10n(
                        'Enligt lagen om elektronisk kommunikation informeras om att vi endast använder nödvändiga cookies och lokal lagring (localStorage) för att upprätthålla din inloggningssession och dina personliga inställningar. Inga spårnings- eller marknadsföringscookies från tredje part används.',
                        'We only use necessary cookies and local storage (localStorage) to maintain your login session and your personal settings. No third-party tracking or marketing cookies are used.',
                        'I henhold til lov om elektronisk kommunikasjon informeres det om at vi kun bruker nødvendige informasjonskapsler og lokal lagring (localStorage) for å opprettholde innloggingssajonen din og dine personlige innstillinger. Ingen sporings- eller markedsføringskapsler fra tredjepart brukes.',
                        'I henhold til loven om elektronisk kommunikation informeres der om, at vi kun bruger nødvendige cookies og lokal lagring (localStorage) til at opretholde din login-session og dine personlige indstillinger. Der bruges ingen sporings- eller marketingcookies fra tredjepart.',
                        'Sähköisen viestinnän palveluista annetun lain mukaisesti ilmoitamme, että käytämme vain välttämättömiä evästeitä ja paikallista tallennustilaa (localStorage) kirjautumisistuntosi ja henkilökohtaisten asetustesi ylläpitämiseen. Kolmannen osapuolen seuranta- tai markkinointievästeitä ei käytetä.'
                      )}
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
