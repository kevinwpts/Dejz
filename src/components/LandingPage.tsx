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
  Shield,
  FileText,
  Smartphone
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
        <span className={`text-base sm:text-lg font-bold tracking-tight transition-colors duration-200 ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
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

export function LandingPage({ onGetStarted, onLogin, onStartDemo, onGoogleLogin, onLegalClick, currentLanguage, onLanguageChange, t: _t }: LandingPageProps) {
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
          {/* Subtle Hero Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[75%] max-w-[650px] h-[300px] sm:h-[400px] bg-gradient-to-tr from-black/[0.04] via-black/[0.02] to-transparent dark:from-white/[0.04] dark:via-white/[0.02] blur-[90px] sm:blur-[130px] rounded-full pointer-events-none z-0" />

           <div className="pt-[calc(9.5rem+env(safe-area-inset-top))] md:pt-[calc(11.5rem+env(safe-area-inset-top))] pb-20 md:pb-28 px-5 sm:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-14 lg:gap-16 relative z-10">
              <div className="flex-1 space-y-7 text-center lg:text-left">
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="space-y-4"
                  >
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[70px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.05]">
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

                  {/* Google Login CTA */}
                  {onGoogleLogin && (
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
                      
                      <button
                        onClick={onGoogleLogin}
                        className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-[14px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-xs active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
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
                    </motion.div>
                  )}
              </div>

              {/* Modern Live App Interactive Mockup */}
              <div className="flex-1 w-full max-w-md relative mx-auto flex items-center justify-center">
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.96 }}
                   animate={{ opacity: 1, scale: 1 }} 
                   transition={{ duration: 0.5, delay: 0.2 }}
                   className="relative w-full flex items-center justify-center cursor-pointer group"
                   onClick={onStartDemo || onGetStarted}
                 >
                    {/* Shadow bloom */}
                    <div className="absolute top-[5%] bottom-[5%] left-[8%] right-[8%] bg-black/8 dark:bg-white/8 blur-3xl rounded-full pointer-events-none" />
                    
                    {/* Phone Frame container matching real app */}
                    <div className="relative w-full max-w-[350px] sm:max-w-[370px] bg-[var(--bg-color)] border-[6px] sm:border-[7px] border-[var(--border-strong)]/40 rounded-[36px] p-3.5 sm:p-4 shadow-xl text-left space-y-3 overflow-hidden z-10 transition-transform duration-300 group-hover:scale-[1.01]">
                      
                      {/* Phone Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-3.5 bg-[var(--border-strong)]/40 rounded-b-[12px] z-30" />

                      {/* Simulated App Header */}
                      <div className="flex items-center justify-between pt-1 px-1">
                        <DejzLogo className="text-lg font-black" textColor="var(--logo-color)" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-[10px] bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shadow-2xs">
                            <Search size={13} />
                          </div>
                          <div className="w-7 h-7 rounded-[10px] bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shadow-2xs">
                            <Bell size={13} />
                          </div>
                          <div className="w-7 h-7 rounded-[10px] overflow-hidden border border-[var(--border-color)] shadow-2xs">
                            <img 
                              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" 
                              alt="Anders" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Simulated Universal Period Selector */}
                      <div className="flex items-center justify-between bg-[var(--surface-color)] p-1.5 rounded-[16px] border border-[var(--border-color)] shadow-2xs">
                        <div className="flex items-center gap-1">
                          <span className="px-2.5 py-1 rounded-[10px] bg-[var(--accent-color)] text-[var(--text-on-accent)] text-[10px] font-bold tracking-wider">
                            IDAG
                          </span>
                          <span className="text-[11px] font-bold text-[var(--text-primary)] pl-1">
                            {getL10n('25 maj – 24 jun', 'May 25 – Jun 24', '25. mai – 24. jun', '25. maj – 24. jun', '25. toukokuuta – 24. kesäkuuta')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-[var(--surface-muted)] p-0.5 rounded-[10px] border border-[var(--border-color)]">
                          <div className="p-1 rounded-[7px] bg-[var(--surface-color)] text-[var(--text-primary)] shadow-2xs">
                            <Clock size={11} />
                          </div>
                          <div className="p-1 rounded-[7px] text-[var(--text-secondary)]">
                            <Calendar size={11} />
                          </div>
                        </div>
                      </div>

                      {/* Simulated Dejzi Greeting Module */}
                      <div className="p-3 bg-[var(--surface-color)] rounded-[20px] border border-[var(--border-color)] shadow-xs flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-[12px] bg-[var(--accent-color)] flex items-center justify-center text-[var(--text-on-accent)] text-xs font-bold shadow-2xs">
                            <Sparkles size={14} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">
                            {getL10n('God morgon Anders! 👋', 'Good morning Anders! 👋', 'God morgen Anders! 👋', 'Godmorgen Anders! 👋', 'Huomenta Anders! 👋')}
                          </p>
                          <p className="text-[10px] font-medium text-[var(--text-secondary)] truncate mt-0.5">
                            {getL10n('Du har 320 kr kvar att spendera idag', 'You have 320 kr left to spend today', 'Du har 320 kr igjen å bruke i dag', 'Du har 320 kr tilbage at bruge i dag', 'Sinulla on 320 kr jäljellä käytettäväksi tänään')}
                          </p>
                        </div>
                      </div>

                      {/* Main Hero Card: Total Remaining Today */}
                      <div className="bg-[var(--surface-color)] border border-[var(--border-color)] py-3.5 px-4 rounded-[22px] shadow-xs text-center relative overflow-hidden">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60 mb-0.5 block">
                          {getL10n('Kvar att spendera idag', 'Left to spend today', 'Igjen å bruke i dag', 'Tilbage at bruge i dag', 'Jäljellä käytettäväksi tänään')}
                        </span>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold font-amount tracking-tight text-[var(--text-primary)]">320</span>
                          <span className="text-sm font-bold text-[var(--text-secondary)] opacity-50">kr</span>
                        </div>
                        <div className="mt-2.5 w-full bg-[var(--surface-muted)] h-1.5 rounded-full overflow-hidden border border-[var(--border-color)]">
                          <div className="bg-[var(--accent-color)] h-full w-[65%] rounded-full" />
                        </div>
                      </div>

                      {/* Simulated Transactions Today */}
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            {getL10n('Idag', 'Today', 'I dag', 'I dag', 'Tänään')}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--accent-color)]">
                            3 {getL10n('st', 'items', 'stk', 'stk', 'kpl')}
                          </span>
                        </div>

                        {/* Transaction Card 1 */}
                        <div className="p-2.5 rounded-[16px] border border-[var(--border-color)] flex items-center justify-between gap-2.5 bg-[var(--surface-color)] shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-[9px] flex items-center justify-center overflow-hidden shrink-0 bg-white border border-[var(--border-color)] shadow-2xs">
                              <img 
                                src="https://www.google.com/s2/favicons?domain=espressohouse.com&sz=128" 
                                alt="Espresso House" 
                                className="w-4 h-4 object-contain"
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col">
                              <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight truncate">
                                Espresso House
                              </p>
                              <span className="text-[9px] font-medium text-[var(--text-secondary)]">
                                Café
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <p className="text-xs font-bold font-amount text-[var(--text-primary)]">
                              -45 kr
                            </p>
                            <span className="text-[9px] font-semibold text-[var(--text-secondary)] opacity-40">
                              14:22
                            </span>
                          </div>
                        </div>

                        {/* Transaction Card 2 */}
                        <div className="p-2.5 rounded-[16px] border border-[var(--border-color)] flex items-center justify-between gap-2.5 bg-[var(--surface-color)] shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-[9px] flex items-center justify-center overflow-hidden shrink-0 bg-white border border-[var(--border-color)] shadow-2xs">
                              <img 
                                src="https://www.google.com/s2/favicons?domain=hemkop.se&sz=128" 
                                alt="Hemköp" 
                                className="w-4 h-4 object-contain"
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col">
                              <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight truncate">
                                Hemköp
                              </p>
                              <span className="text-[9px] font-medium text-[var(--text-secondary)]">
                                Livsmedel
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <p className="text-xs font-bold font-amount text-[var(--text-primary)]">
                              -124 kr
                            </p>
                            <span className="text-[9px] font-semibold text-[var(--text-secondary)] opacity-40">
                              12:15
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Simulated Floating Bottom Navigation */}
                      <div className="bg-[var(--surface-color)] rounded-full py-1.5 px-4 shadow-sm border border-[var(--border-color)] flex items-center justify-around text-[var(--text-secondary)] mt-2">
                        <div className="p-1 rounded-full text-[var(--accent-color)]"><Home size={15} /></div>
                        <div className="p-1 hover:text-[var(--text-primary)]"><History size={15} /></div>
                        <div className="h-7 w-7 rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] flex items-center justify-center shadow-xs"><Plus size={15} strokeWidth={2.5} /></div>
                        <div className="p-1 hover:text-[var(--text-primary)]"><BarChart3 size={15} /></div>
                        <div className="p-1 hover:text-[var(--text-primary)]"><WalletCards size={15} /></div>
                      </div>

                      {/* Home Indicator */}
                      <div className="w-24 h-1 bg-[var(--border-strong)]/30 rounded-full mx-auto mt-1" />
                    </div>
                 </motion.div>
              </div>
           </div>
        </section>

        {/* "Så fungerar Dejz" Section */}
        <section id="how-it-works" className="w-full bg-[var(--bg-color)] border-b border-[var(--border-color)] py-20 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center">
            <div className="space-y-3 mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
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
                    <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
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
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
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
                      <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">{item.title}</h3>
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
            <div className="bg-[var(--surface-color)] border border-[var(--border-color)] p-8 sm:p-12 rounded-[28px] space-y-6 shadow-xs">
              <div className="space-y-2.5 max-w-xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
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
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                {getL10n('Vanliga frågor', 'Frequently Asked Questions', 'Ofte stilte spørsmål', 'Ofte stillede spørgsmål', 'Usein kysytyt kysymykset')}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium">
                {getL10n('Hittar du inte svaret du söker? Kontakta oss på', 'Need more help? Email us at', 'Finner du ikke svaret du leter etter? Kontakt oss på', 'Finder du ikke det svar, du søger? Kontakt os på', 'Etkö löydä etsimääsi vastausta? Ota yhteyttä osoitteeseen')} <a href="mailto:support@dejz.se" className="text-[var(--accent-color)] font-bold hover:underline">support@dejz.se</a>
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

        {/* Footer styled to match the app's clean card and navigation aesthetic */}
        <footer className="w-full bg-[var(--bg-color)] border-t border-[var(--border-color)] pt-12 pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-8">
            {/* Main App-styled Footer Container */}
            <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[24px] p-6 sm:p-10 shadow-xs relative overflow-hidden">
              {/* Subtle top ambient indicator */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-color)]/30 to-transparent" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Brand & Mission column */}
                <div className="md:col-span-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <DejzLogo className="text-2xl sm:text-3xl font-black" textColor="var(--logo-color)" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-pulse" />
                      App v2.4
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm">
                    {getL10n(
                      'En modern ekonomiplanerare byggd för enkelhet. Se exakt vad du kan spendera idag och få full kontroll fram till nästa lön.',
                      'A modern budget companion crafted for clarity. Know exactly what you can spend today and stay in control until payday.',
                      'En moderne økonomiplanlegger bygget for enkelhet. Se nøyaktig hva du kan bruke i dag og få full kontroll frem til neste lønn.',
                      'En moderne budgetplanlægger bygget for enkelhed. Se præcis hvad du kan bruge i dag og få fuld kontrol indtil næste løn.',
                      'Moderni taloussuunnittelija, joka on tehty selkeäksi. Tiedä tarkalleen, mitä voit käyttää tänään palkkapäivään asti.'
                    )}
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)]">
                      <Shield size={13} className="text-[var(--accent-color)]" />
                      <span>{getL10n('Krypterad data', 'Encrypted data', 'Kryptert data', 'Krypteret data', 'Salattu data')}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)]">
                      <Smartphone size={13} className="text-[var(--accent-color)]" />
                      <span>PWA / Mobil & Web</span>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation - In-app style pills */}
                <div className="md:col-span-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-75">
                    {getL10n('Utforska', 'Explore', 'Utforsk', 'Udforsk', 'Tutki')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                    <button 
                      onClick={() => { const el = document.getElementById('features'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="flex items-center gap-2 p-2.5 rounded-[14px] bg-[var(--surface-muted)]/70 hover:bg-[var(--surface-muted)] text-[var(--text-primary)] transition-all text-left cursor-pointer border border-[var(--border-color)]/60"
                    >
                      <Sparkles size={14} className="text-[var(--accent-color)] shrink-0" />
                      <span>{getL10n('Funktioner', 'Features', 'Funksjoner', 'Funktioner', 'Ominaisuudet')}</span>
                    </button>

                    <button 
                      onClick={() => { const el = document.getElementById('daily-budget'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="flex items-center gap-2 p-2.5 rounded-[14px] bg-[var(--surface-muted)]/70 hover:bg-[var(--surface-muted)] text-[var(--text-primary)] transition-all text-left cursor-pointer border border-[var(--border-color)]/60"
                    >
                      <Calendar size={14} className="text-[var(--accent-color)] shrink-0" />
                      <span>{getL10n('Dagsbudget', 'Daily Budget', 'Dagsbudsjett', 'Dagsbudget', 'Päiväbudjetti')}</span>
                    </button>

                    <button 
                      onClick={() => { const el = document.getElementById('faq'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="flex items-center gap-2 p-2.5 rounded-[14px] bg-[var(--surface-muted)]/70 hover:bg-[var(--surface-muted)] text-[var(--text-primary)] transition-all text-left cursor-pointer border border-[var(--border-color)]/60"
                    >
                      <FileText size={14} className="text-[var(--accent-color)] shrink-0" />
                      <span>{getL10n('Frågor & Svar', 'FAQ', 'Spørsmål & Svar', 'Spørgsmål & Svar', 'UKK')}</span>
                    </button>

                    <button 
                      onClick={onGetStarted}
                      className="flex items-center gap-2 p-2.5 rounded-[14px] bg-[var(--accent-color)]/10 hover:bg-[var(--accent-color)]/15 text-[var(--accent-color)] transition-all text-left cursor-pointer border border-[var(--accent-color)]/20"
                    >
                      <Plus size={14} className="shrink-0" />
                      <span>{getL10n('Skapa konto', 'Create account', 'Opprett konto', 'Opret konto', 'Luo tili')}</span>
                    </button>
                  </div>
                </div>

                {/* Legal & Socials */}
                <div className="md:col-span-3 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-75">
                    {getL10n('Villkor & Socialt', 'Legal & Social', 'Vilkår & Sosiale medier', 'Vilkår & Sociale medier', 'Ehdot & Yhteisö')}
                  </h4>
                  <div className="flex flex-col gap-2 text-xs font-medium">
                    <button 
                      onClick={() => onLegalClick ? onLegalClick('privacy') : setActivePolicy('privacy')} 
                      className="flex items-center justify-between p-2 rounded-[12px] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer text-left"
                    >
                      <span>{getL10n('Integritetspolicy', 'Privacy Policy', 'Personvernerklæring', 'Privatlivspolitik', 'Tietosuojaseloste')}</span>
                      <ChevronRight size={14} className="opacity-50" />
                    </button>

                    <button 
                      onClick={() => onLegalClick ? onLegalClick('terms') : setActivePolicy('terms')} 
                      className="flex items-center justify-between p-2 rounded-[12px] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer text-left"
                    >
                      <span>{getL10n('Användarvillkor', 'Terms of Service', 'Brukervilkår', 'Brugervilkår', 'Käyttöehdot')}</span>
                      <ChevronRight size={14} className="opacity-50" />
                    </button>
                    
                    <button 
                      onClick={() => onLegalClick ? onLegalClick('cookies') : setActivePolicy('cookies')} 
                      className="flex items-center justify-between p-2 rounded-[12px] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer text-left"
                    >
                      <span>{getL10n('Cookiepolicy', 'Cookie Policy', 'Informasjonskapsler', 'Cookiepolitik', 'Evästekäytäntö')}</span>
                      <ChevronRight size={14} className="opacity-50" />
                    </button>

                    <a 
                      href="https://instagram.com/dejz.se" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-[12px] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Instagram size={14} className="text-[#E1306C]" />
                        <span>@dejz.se</span>
                      </span>
                      <span className="text-[11px] font-bold text-[var(--accent-color)]">Följ</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom bar inside card */}
              <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <span>© {new Date().getFullYear()} Dejz.</span>
                  <span className="opacity-50">•</span>
                  <span>{getL10n('Byggd med precision för din vardagsekonomi', 'Built with precision for everyday finance', 'Bygget med presisjon for din hverdagsøkonomi', 'Bygget med præcision til din hverdagsøkonomi', 'Rakennettu tarkkuudella arkitalouteesi')}</span>
                </div>

                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="Till toppen"
                >
                  <ArrowUp size={13} />
                  <span>{getL10n('Till toppen', 'Back to top', 'Til toppen', 'Til toppen', 'Takaisin alkuun')}</span>
                </button>
              </div>
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
                    <h3 className="text-base font-bold">1. {getL10n('Godkännande av villkor', 'Acceptance of Terms', 'Godkjenning av vilkår', 'Accept af vilkår', 'Ehtojen hyväksyminen')}</h3>
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
                    <h3 className="text-base font-bold">2. {getL10n('Tjänstens omfattning', 'Scope of Service', 'Tjenestens omfang', 'Tjenestens omfang', 'Palvelun laajuus')}</h3>
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
                    <h3 className="text-base font-bold">3. {getL10n('Ansvarsbegränsning', 'Limitation of Liability', 'Ansvarsbegrensning', 'Ansvarsbegrænsning', 'Vastuunrajoitus')}</h3>
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
                    <h3 className="text-base font-bold">{getL10n('Cookiepolicy', 'Cookie Policy', 'Informsjonskapselpolicy', 'Cookiepolitik', 'Evästekäytäntö')}</h3>
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
