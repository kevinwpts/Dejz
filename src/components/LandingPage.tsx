import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Sparkles,
  Mic,
  Plus,
} from 'lucide-react';
import { Language, TranslationKey } from '../i18n';
import { DejzLogo } from './DejzLogo';
import { Button, Card, FilterButtonGroup, SmartInput } from './ui';
import { LanguagePicker } from './LanguagePicker';
import { CategoryIcon } from './CategoryIcon';
import { TransactionItem } from './TransactionItem';
import { BudgetItem } from './BudgetItem';
import { AnimatedNumber } from './AnimatedNumber';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';
import { Config, Frequency } from '../types';
import { getCategoryColor } from '../utils/categoryColors';
import { formatAmount, formatCurrency } from '../utils/format';

export interface LandingPageScreenshots {
  heroHome?: string;
  economy?: string;
  voiceInput?: string;
  analysis?: string;
}

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

export function LandingPage({
  onGetStarted,
  onLogin,
  onStartDemo,
  onGoogleLogin,
  onLegalClick,
  t: externalT,
  currentLanguage,
  onLanguageChange,
}: LandingPageProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  // Interactive & auto-animated states for identical app elements
  const [activeDonutIndex, setActiveDonutIndex] = useState<number>(0);
  const [userTouchedDonut, setUserTouchedDonut] = useState(false);

  const [voiceDemoIndex, setVoiceDemoIndex] = useState<number>(0);
  const [voicePhase, setVoicePhase] = useState<'listening' | 'saved'>('saved');

  const [budgetFilter, setBudgetFilter] = useState<'fixed' | 'income' | 'savings'>('fixed');
  const [userTouchedBudgetFilter, setUserTouchedBudgetFilter] = useState(false);

  const [isAutoAllocated, setIsAutoAllocated] = useState<boolean>(true);
  const [userTouchedAllocate, setUserTouchedAllocate] = useState(false);

  const isEn = currentLanguage === 'en';

  const previewConfig: Config = {
    currency: 'kr',
    language: currentLanguage,
    categories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
  } as unknown as Config;

  const fallbackT = (key: TranslationKey): string => {
    if (externalT) return externalT(key);
    const mapSv: Record<string, string> = {
      perMonthSuffix: '/mån',
      paymentMethodCardShort: 'Kort',
      cancelledStatus: 'Uppsagd',
      lastPaymentDateLabel: 'Sista dragning',
      savings: 'Sparande',
    };
    const mapEn: Record<string, string> = {
      perMonthSuffix: '/mo',
      paymentMethodCardShort: 'Card',
      cancelledStatus: 'Cancelled',
      lastPaymentDateLabel: 'Last payment',
      savings: 'Savings',
    };
    return (isEn ? mapEn[key] : mapSv[key]) || String(key);
  };

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Gentle auto-cycle for Analysis Donut segments
  useEffect(() => {
    if (userTouchedDonut) return;
    const timer = window.setInterval(() => {
      setActiveDonutIndex((prev) => (prev + 1) % 4);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [userTouchedDonut]);

  // Gentle auto-cycle for Voice / SmartInput demo
  useEffect(() => {
    const timer = window.setInterval(() => {
      setVoicePhase('listening');
      const switchTimeout = window.setTimeout(() => {
        setVoiceDemoIndex((prev) => (prev + 1) % 3);
        setVoicePhase('saved');
      }, 950);
      return () => window.clearTimeout(switchTimeout);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  // Gentle auto-cycle for BudgetView filter tabs
  useEffect(() => {
    if (userTouchedBudgetFilter) return;
    const order: Array<'fixed' | 'income' | 'savings'> = ['fixed', 'income', 'savings'];
    let idx = 0;
    const timer = window.setInterval(() => {
      idx = (idx + 1) % order.length;
      setBudgetFilter(order[idx]);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [userTouchedBudgetFilter]);

  // Gentle auto-toggle for Category Budget Allocation
  useEffect(() => {
    if (userTouchedAllocate) return;
    const timer = window.setInterval(() => {
      setIsAutoAllocated((prev) => !prev);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [userTouchedAllocate]);

  const handlePolicyOpen = (type: 'privacy' | 'terms' | 'cookies') => {
    if (onLegalClick) {
      onLegalClick(type);
    }
  };

  // Voice / SmartInput Demo examples
  const voiceExamples = [
    {
      prompt: isEn ? '“287 kr Coop groceries”' : '”Handlade på Coop för 287 kr”',
      feedbackText: isEn ? 'Saved in Groceries' : 'Sparat i Mat & dagligvaror',
      tx: {
        id: 'voice-coop',
        merchant: 'Coop',
        category: isEn ? 'Groceries' : 'Mat & dagligvaror',
        icon: 'mat_dagligvaror',
        amount: 287,
        timestamp: new Date(2026, 10, 12, 18, 14).getTime(),
        type: 'expense' as const,
      },
    },
    {
      prompt: isEn ? '“Coffee Espresso House 58 kr”' : '”Fika på Espresso House 58 kr”',
      feedbackText: isEn ? 'Saved in Café & dining' : 'Sparat i Äta ute & fika',
      tx: {
        id: 'voice-eh',
        merchant: 'Espresso House',
        category: isEn ? 'Café & dining' : 'Äta ute & fika',
        icon: 'ata_ute_fika',
        amount: 58,
        timestamp: new Date(2026, 10, 12, 10, 30).getTime(),
        type: 'expense' as const,
      },
    },
    {
      prompt: isEn ? '“SL ticket 42 kr”' : '”SL enkelbiljett 42 kr”',
      feedbackText: isEn ? 'Saved in Transport' : 'Sparat i Transport & fordon',
      tx: {
        id: 'voice-sl',
        merchant: 'SL',
        category: isEn ? 'Transport' : 'Transport & fordon',
        icon: 'transport_fordon',
        amount: 42,
        timestamp: new Date(2026, 10, 12, 8, 5).getTime(),
        type: 'expense' as const,
      },
    },
  ];

  const activeVoiceExample = voiceExamples[voiceDemoIndex] || voiceExamples[0];

  // Identical to BudgetView.tsx items
  const fixedBudgetItems = [
    {
      id: 'lp-fx-1',
      name: isEn ? 'Housing & Rent' : 'Boende & Hyra',
      category: 'Boende & hushåll',
      icon: 'boende_hushall',
      amount: 8400,
      paymentMethod: 'Autogiro',
      deductionDay: 28,
      frequency: Frequency.MONTHLY,
    },
    {
      id: 'lp-fx-2',
      name: 'Vattenfall El',
      category: 'Boende & hushåll',
      icon: 'boende_hushall',
      amount: 640,
      paymentMethod: 'E-faktura',
      deductionDay: 27,
      frequency: Frequency.MONTHLY,
      isVariable: true,
    },
    {
      id: 'lp-fx-3',
      name: 'SATS',
      category: 'Hälsa & apotek',
      icon: 'halsa_apotek',
      amount: 499,
      paymentMethod: 'Autogiro',
      deductionDay: 27,
      frequency: Frequency.MONTHLY,
    },
  ];

  const incomeBudgetItems = [
    {
      id: 'lp-inc-1',
      name: isEn ? 'Monthly Salary' : 'Månadslön',
      category: isEn ? 'Salary' : 'Lön',
      icon: 'lon',
      amount: 28500,
      deductionDay: 25,
      frequency: Frequency.MONTHLY,
    },
  ];

  const savingsBudgetItems = [
    {
      id: 'lp-sav-1',
      name: 'Avanza Indexfond',
      category: isEn ? 'Savings' : 'Sparande',
      icon: 'sparande',
      amount: 3000,
      deductionDay: 25,
      frequency: Frequency.MONTHLY,
    },
    {
      id: 'lp-sav-2',
      name: isEn ? 'Buffer account' : 'Buffertkonto',
      category: isEn ? 'Savings' : 'Sparande',
      icon: 'sparande',
      amount: 1000,
      deductionDay: 25,
      frequency: Frequency.MONTHLY,
    },
  ];

  // Identical to AnalysisView.tsx Donut segments
  const donutSegments = [
    {
      name: isEn ? 'Housing & household' : 'Boende & hushåll',
      rawCat: 'Boende & hushåll',
      icon: 'boende_hushall',
      amount: 9040,
      count: 2,
      pct: 58,
      color: getCategoryColor('Boende & hushåll', DEFAULT_EXPENSE_CATEGORIES),
    },
    {
      name: isEn ? 'Groceries' : 'Mat & dagligvaror',
      rawCat: 'Mat & dagligvaror',
      icon: 'mat_dagligvaror',
      amount: 3840,
      count: 12,
      pct: 25,
      color: getCategoryColor('Mat & dagligvaror', DEFAULT_EXPENSE_CATEGORIES),
    },
    {
      name: isEn ? 'Café & dining' : 'Äta ute & fika',
      rawCat: 'Äta ute & fika',
      icon: 'ata_ute_fika',
      amount: 1420,
      count: 8,
      pct: 9,
      color: getCategoryColor('Äta ute & fika', DEFAULT_EXPENSE_CATEGORIES),
    },
    {
      name: isEn ? 'Entertainment' : 'Nöje & underhållning',
      rawCat: 'Nöje & underhållning',
      icon: 'noje_underhallning',
      amount: 1200,
      count: 4,
      pct: 8,
      color: getCategoryColor('Nöje & underhållning', DEFAULT_EXPENSE_CATEGORIES),
    },
  ];

  const totalDonutSpent = 15500;
  const activeDonutItem = donutSegments[activeDonutIndex] || donutSegments[0];

  // Identical to BudgetCategoriesView.tsx rows
  const allocationRows = [
    {
      name: isEn ? 'Groceries' : 'Mat & dagligvaror',
      rawCat: 'Mat & dagligvaror',
      icon: 'mat_dagligvaror',
      fixed: 0,
      baseBudget: 3500,
      autoBudget: 5500,
    },
    {
      name: isEn ? 'Café & dining' : 'Äta ute & fika',
      rawCat: 'Äta ute & fika',
      icon: 'ata_ute_fika',
      fixed: 0,
      baseBudget: 1000,
      autoBudget: 2200,
    },
    {
      name: isEn ? 'Entertainment' : 'Nöje & underhållning',
      rawCat: 'Nöje & underhållning',
      icon: 'noje_underhallning',
      fixed: 298,
      baseBudget: 800,
      autoBudget: 1800,
    },
  ];

  const totalPool = 9500;
  const allocatedSum = isAutoAllocated ? 9500 : 5300;
  const leftToAllocate = totalPool - allocatedSum;

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-[var(--bg-color)] text-[var(--text-primary)] font-sans antialiased relative overflow-x-hidden selection:bg-[var(--accent-color)] selection:text-[var(--on-accent)]">
      {/* 1. MODERN FLOATING ROUNDED HEADER */}
      <header className="sticky top-0 z-40 pt-[calc(env(safe-area-inset-top,0px)+10px)] sm:pt-4 pb-2 px-3 sm:px-6 lg:px-8">
        <div
          className={`max-w-6xl mx-auto h-14 sm:h-[60px] px-4 sm:px-5 rounded-full bg-[var(--surface-color)]/90 backdrop-blur-xl border border-[var(--border-subtle)] flex items-center justify-between gap-3 sm:gap-6 transition-all duration-200 ${
            isScrolled ? 'shadow-modal' : 'shadow-subtle'
          }`}
        >
          <a
            href="#top"
            className="flex items-center shrink-0 whitespace-nowrap focus-visible:outline-none pl-1"
            aria-label="Dejz"
          >
            <DejzLogo className="h-5 sm:h-6 w-auto" textColor="var(--logo-color)" />
          </a>

          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[var(--bg-color)]/75 border border-[var(--border-subtle)] text-[13.5px] font-semibold text-[var(--text-secondary)]">
            <a
              href="#oversikt"
              className="px-3.5 py-1.5 rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] transition-all whitespace-nowrap shrink-0"
            >
              {isEn ? 'Overview' : 'Översikt'}
            </a>
            <a
              href="#funktioner"
              className="px-3.5 py-1.5 rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] transition-all whitespace-nowrap shrink-0"
            >
              {isEn ? 'Features' : 'Funktioner'}
            </a>
            <a
              href="#hur-det-funkar"
              className="px-3.5 py-1.5 rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] transition-all whitespace-nowrap shrink-0"
            >
              {isEn ? 'How it works' : 'Så funkar det'}
            </a>
            {onStartDemo && (
              <button
                type="button"
                onClick={onStartDemo}
                className="px-3.5 py-1.5 rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] transition-all whitespace-nowrap shrink-0 cursor-pointer bg-transparent border-none font-semibold text-[13.5px] text-[var(--text-secondary)]"
              >
                {isEn ? 'Live demo' : 'Interaktiv demo'}
              </button>
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <LanguagePicker
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
              variant="compact"
            />

            {onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="px-3 py-1.5 rounded-full text-[13.5px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-color)] transition-colors whitespace-nowrap shrink-0 cursor-pointer bg-transparent border-none"
              >
                {isEn ? 'Log in' : 'Logga in'}
              </button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={onGetStarted}
              className="rounded-full px-4 sm:px-5 h-9 sm:h-10 font-semibold whitespace-nowrap shrink-0"
            >
              {isEn ? 'Get started' : 'Kom igång'}
            </Button>
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10 flex-1">
        {/* 2. HERO SECTION — KLARNA-STYLE INSET ROUNDED CARD WITH UNCROPPED HEAD & NO FADE */}
        <section
          id="oversikt"
          className="pt-1 sm:pt-2 pb-10 sm:pb-16 px-3 sm:px-6 lg:px-8"
        >
          <div className="max-w-6xl mx-auto">
            <div className="relative w-full h-[75dvh] min-h-[500px] max-h-[660px] sm:h-[600px] lg:h-[680px] rounded-[28px] sm:rounded-[34px] overflow-hidden flex items-end shadow-subtle">
              {/* Hero photograph anchored to top so his head is never cut off, with zero fade/overlay */}
              <img
                src="/dejz_02.png"
                alt={
                  isEn
                    ? 'Dejz personal finance app – full control over your money from payday to payday'
                    : 'Dejz budgetapp – full koll på pengarna från lön till lön'
                }
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-[64%_top] sm:object-[center_top] select-none pointer-events-none"
              />

              {/* Overlaid copy and actions */}
              <div className="relative z-10 w-full p-6 sm:p-10 lg:p-14">
                <div className="max-w-xl space-y-5 sm:space-y-6 text-left">
                  <div className="space-y-2.5">
                    <h1
                      className="font-display font-extrabold text-white tracking-[-0.035em] leading-[1.03]"
                      style={{
                        fontSize: 'clamp(2.25rem, 5vw, 4.1rem)',
                        textWrap: 'balance',
                        textShadow: '0 2px 16px rgba(0, 0, 0, 0.32)',
                      }}
                    >
                      {isEn
                        ? 'Know exactly what you have left to spend.'
                        : 'Full koll på pengarna. Från lön till lön.'}
                    </h1>

                    <p
                      className="text-[15.5px] sm:text-[17.5px] leading-[1.45] text-white font-medium max-w-lg"
                      style={{
                        textShadow: '0 1px 10px rgba(0, 0, 0, 0.35)',
                      }}
                    >
                      {isEn
                        ? 'Salary, fixed bills, and savings in one place—see what you have left to spend until next payday.'
                        : 'Lön, fasta räkningar och sparande på ett ställe – se vad du har kvar att röra dig med fram till nästa lön.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={onGetStarted}
                        className="rounded-full h-12 sm:h-13 px-7 text-[15px] font-bold justify-center whitespace-nowrap shrink-0"
                      >
                        <span>{isEn ? 'Get started free' : 'Kom igång gratis'}</span>
                        <ArrowRight size={17} strokeWidth={2.4} className="ml-2 shrink-0" />
                      </Button>

                      {onStartDemo && (
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={onStartDemo}
                          className="rounded-full h-12 sm:h-13 px-6 text-[15px] font-semibold justify-center bg-[var(--surface-color)] text-[var(--text-primary)] whitespace-nowrap shrink-0 shadow-subtle"
                        >
                          <span>{isEn ? 'Try live demo' : 'Testa live-demo'}</span>
                        </Button>
                      )}
                    </div>

                    {onGoogleLogin && (
                      <div className="pt-0.5 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={onGoogleLogin}
                          className="inline-flex items-center gap-2.5 text-[13.5px] font-semibold text-white hover:opacity-85 py-1 transition-opacity cursor-pointer bg-transparent border-none"
                          style={{ textShadow: '0 1px 8px rgba(0, 0, 0, 0.35)' }}
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>{isEn ? 'Continue with Google' : 'Fortsätt med Google'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ASYMMETRIC BENTO GRID — IDENTICAL APP MODULES WITH LIVE MOTION */}
        <section
          id="funktioner"
          className="py-14 sm:py-20 px-4 sm:px-8 border-t border-[var(--border-divider)]"
        >
          <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
            {/* Concise Section Header (No extra paragraph fluff) */}
            <div className="max-w-xl space-y-2 text-left">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--accent-color)]">
                <span>{isEn ? 'Features' : 'Funktioner'}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--text-secondary)]">
                  {isEn ? 'Identical to the app' : 'Direkt från appen'}
                </span>
              </div>
              <h2
                className="font-display font-extrabold text-[var(--text-primary)] tracking-[-0.03em] leading-[1.08]"
                style={{
                  fontSize: 'clamp(1.8rem, 3.4vw, 2.65rem)',
                  textWrap: 'balance',
                }}
              >
                {isEn
                  ? 'Everything your budget needs. Without spreadsheets.'
                  : 'Allt din ekonomi behöver. Utan kalkylblad.'}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              {/* Bento Card 1 (7 Cols): 1:1 AnalysisView.tsx Donut + Category List */}
              <div className="lg:col-span-7 rounded-card bg-[var(--surface-color)] p-5 sm:p-7 shadow-subtle flex flex-col justify-between gap-5">
                <div className="space-y-1 text-left">
                  <h3 className="text-[19px] sm:text-[21px] font-display font-bold text-[var(--text-primary)] tracking-[-0.02em]">
                    {isEn ? 'Visual spending analysis' : 'Visuell utgiftsanalys'}
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)]">
                    {isEn
                      ? 'See exactly where your money goes across categories in real time.'
                      : 'Se exakt hur lönen fördelas mellan fasta och rörliga kategorier.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  {/* 1:1 AnalysisView Donut */}
                  <div className="sm:col-span-5 flex justify-center">
                    <div className="relative w-[188px] h-[188px] flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 overflow-visible">
                        <circle
                          cx="50"
                          cy="50"
                          r={38}
                          fill="none"
                          stroke="var(--surface-muted)"
                          strokeWidth="12"
                        />
                        {(() => {
                          const radius = 38;
                          const circumference = 2 * Math.PI * radius;
                          let accumulated = 0;
                          return donutSegments.map((seg, idx) => {
                            const fraction = seg.amount / totalDonutSpent;
                            const strokeLen = fraction * circumference;
                            const visibleLen = Math.max(1, strokeLen - 2.5);
                            const dashArray = `${visibleLen} ${circumference - visibleLen}`;
                            const dashOffset = -accumulated * circumference;
                            accumulated += fraction;
                            const isSelected = activeDonutIndex === idx;

                            return (
                              <circle
                                key={seg.name}
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth={isSelected ? 15 : 12}
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="butt"
                                className="transition-all duration-300 cursor-pointer"
                                style={{
                                  opacity: isSelected ? 1 : 0.45,
                                }}
                                onMouseEnter={() => {
                                  setUserTouchedDonut(true);
                                  setActiveDonutIndex(idx);
                                }}
                                onClick={() => {
                                  setUserTouchedDonut(true);
                                  setActiveDonutIndex(idx);
                                }}
                              />
                            );
                          });
                        })()}
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                        <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate max-w-full">
                          {activeDonutItem.name}
                        </span>
                        <span className="text-[20px] font-bold font-amount tabular-nums text-[var(--text-primary)] tracking-tight mt-0.5">
                          <AnimatedNumber
                            value={activeDonutItem.amount}
                            formatter={(val) => formatAmount(val, currentLanguage)}
                          />{' '}
                          <span className="text-secondary font-normal text-[var(--text-secondary)]">
                            kr
                          </span>
                        </span>
                        <span
                          className="text-micro-label font-bold font-amount tabular-nums mt-0.5"
                          style={{ color: activeDonutItem.color }}
                        >
                          {activeDonutItem.pct}% {isEn ? 'of total' : 'av utgifter'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 1:1 AnalysisView Category Rows */}
                  <div className="sm:col-span-7 divide-y divide-menu">
                    {donutSegments.map((seg, idx) => {
                      const isSelected = activeDonutIndex === idx;
                      return (
                        <button
                          key={seg.name}
                          type="button"
                          onMouseEnter={() => {
                            setUserTouchedDonut(true);
                            setActiveDonutIndex(idx);
                          }}
                          onClick={() => {
                            setUserTouchedDonut(true);
                            setActiveDonutIndex(idx);
                          }}
                          className={`w-full py-2.5 px-2.5 rounded-card-nested flex items-center justify-between gap-3 text-left transition-colors cursor-pointer border-none ${
                            isSelected
                              ? 'bg-[var(--surface-muted)]'
                              : 'bg-transparent hover:bg-[var(--surface-muted)]/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <CategoryIcon
                              icon={seg.icon}
                              color={seg.color}
                              categoryName={seg.rawCat}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-body-medium font-medium text-[var(--text-primary)] truncate">
                                  {seg.name}
                                </span>
                                <span className="text-list-amount font-amount tabular-nums text-[var(--text-primary)] shrink-0">
                                  −{formatAmount(seg.amount, currentLanguage)}{' '}
                                  <span className="text-secondary font-normal text-[var(--text-secondary)]">
                                    kr
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-[var(--bg-color)] rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: seg.color }}
                                    animate={{ width: `${seg.pct}%` }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                  />
                                </div>
                                <span className="text-micro-label font-amount tabular-nums text-[var(--text-secondary)] shrink-0">
                                  {seg.pct}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bento Card 2 (5 Cols): 1:1 SmartInput + Live Animated TransactionItem */}
              <div className="lg:col-span-5 rounded-card bg-[var(--surface-color)] p-5 sm:p-7 shadow-subtle flex flex-col justify-between gap-5">
                <div className="space-y-1 text-left">
                  <h3 className="text-[19px] sm:text-[21px] font-display font-bold text-[var(--text-primary)] tracking-[-0.02em]">
                    {isEn ? 'Log by voice or text' : 'Säg eller skriv köpet direkt'}
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)]">
                    {isEn
                      ? 'Amount, store, and category are matched automatically.'
                      : 'Belopp, butik och kategori sätts automatiskt på sekunder.'}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Real SmartInput Component from App.tsx */}
                  <SmartInput
                    hideLabel
                    value={activeVoiceExample.prompt}
                    onChange={() => {}}
                    onSubmit={() => {
                      setVoiceDemoIndex((prev) => (prev + 1) % voiceExamples.length);
                    }}
                    leftElement={
                      <button
                        type="button"
                        onClick={() =>
                          setVoiceDemoIndex((prev) => (prev + 1) % voiceExamples.length)
                        }
                        aria-label={isEn ? 'Switch voice example' : 'Byt röstexempel'}
                        className={`w-10 h-10 rounded-icon-button flex items-center justify-center transition-all cursor-pointer border select-none ${
                          voicePhase === 'listening'
                            ? 'bg-[var(--danger-color)] text-white border-transparent scale-105'
                            : 'bg-[var(--surface-color)] text-[var(--accent-color)] border-subtle'
                        }`}
                      >
                        <Mic size={16} strokeWidth={2.2} />
                      </button>
                    }
                    submitVariant="inside"
                    submitIcon={<Plus size={18} strokeWidth={2.2} />}
                    feedback={{
                      type: 'success',
                      message: activeVoiceExample.feedbackText,
                    }}
                    inputClassName="h-13 text-[14.5px] font-medium rounded-input bg-[var(--bg-color)] text-[var(--text-primary)] border-subtle"
                  />

                  {/* Real TransactionItem Component animating on each voice match */}
                  <div className="rounded-card bg-[var(--bg-color)] overflow-hidden border border-subtle">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeVoiceExample.tx.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                      >
                        <TransactionItem
                          transaction={activeVoiceExample.tx}
                          config={previewConfig}
                          variant="transparent"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Bento Card 3 (5 Cols): 1:1 BudgetView.tsx (FilterButtonGroup + Summary + BudgetItem) */}
              <div className="lg:col-span-5 rounded-card bg-[var(--surface-color)] p-5 sm:p-7 shadow-subtle flex flex-col justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-[19px] sm:text-[21px] font-display font-bold text-[var(--text-primary)] tracking-[-0.02em]">
                    {isEn ? 'Fixed bills, income & savings' : 'Fasta utgifter, lön & sparande'}
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)]">
                    {isEn
                      ? 'Reserved automatically on payday.'
                      : 'Reserveras direkt vid löning så du ser vad som är fritt.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <FilterButtonGroup
                    options={[
                      { id: 'fixed', label: isEn ? 'Fixed' : 'Fasta utgifter' },
                      { id: 'income', label: isEn ? 'Income' : 'Inkomster' },
                      { id: 'savings', label: isEn ? 'Savings' : 'Sparande' },
                    ]}
                    selectedId={budgetFilter}
                    onSelect={(id) => {
                      setUserTouchedBudgetFilter(true);
                      setBudgetFilter(id as 'fixed' | 'income' | 'savings');
                    }}
                    ariaLabel={isEn ? 'Filter finances' : 'Filtrera ekonomi'}
                  />

                  {/* 1:1 BudgetItem List from BudgetView.tsx */}
                  <div className="rounded-card bg-[var(--bg-color)] divide-y divide-menu overflow-hidden border border-subtle min-h-[186px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={budgetFilter}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="divide-y divide-menu"
                      >
                        {budgetFilter === 'fixed' &&
                          fixedBudgetItems.map((item) => (
                            <BudgetItem
                              key={item.id}
                              item={item}
                              onClick={() => {}}
                              currency="kr"
                              type="expense"
                              language={currentLanguage}
                              t={fallbackT}
                              config={previewConfig}
                              isGrouped={true}
                              isFixedExpenseList={true}
                            />
                          ))}
                        {budgetFilter === 'income' &&
                          incomeBudgetItems.map((item) => (
                            <BudgetItem
                              key={item.id}
                              item={item}
                              onClick={() => {}}
                              currency="kr"
                              type="income"
                              language={currentLanguage}
                              t={fallbackT}
                              config={previewConfig}
                              isGrouped={true}
                            />
                          ))}
                        {budgetFilter === 'savings' &&
                          savingsBudgetItems.map((item) => (
                            <BudgetItem
                              key={item.id}
                              item={item}
                              onClick={() => {}}
                              currency="kr"
                              type="expense"
                              language={currentLanguage}
                              t={fallbackT}
                              config={previewConfig}
                              isGrouped={true}
                            />
                          ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Bento Card 4 (7 Cols): 1:1 BudgetCategoriesView.tsx Auto-Allocation */}
              <div className="lg:col-span-7 rounded-card bg-[var(--surface-color)] p-5 sm:p-7 shadow-subtle flex flex-col justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-[19px] sm:text-[21px] font-display font-bold text-[var(--text-primary)] tracking-[-0.02em]">
                    {isEn ? 'One-tap category allocation' : 'Fördela kategoribudget med ett tryck'}
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)]">
                    {isEn
                      ? 'Distribute your disposable space automatically across categories.'
                      : 'Fördela ditt fria konsumtionsutrymme automatiskt över dina kategorier.'}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* 1:1 Top Allocation Bar from BudgetCategoriesView.tsx */}
                  <div className="rounded-card bg-[var(--bg-color)] p-4 border border-subtle space-y-2.5">
                    <div className="flex items-end justify-between gap-3">
                      <div className="space-y-0.5 min-w-0 text-left">
                        <span className="text-metric-label font-medium text-[var(--text-secondary)] block">
                          {isEn ? 'Left to allocate' : 'Kvar att fördela'}
                        </span>
                        <div className="text-large-amount font-bold font-amount tabular-nums leading-tight text-[var(--text-primary)]">
                          <AnimatedNumber
                            value={leftToAllocate}
                            formatter={(val) => formatCurrency(val, 'kr', currentLanguage)}
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="tonal"
                        size="sm"
                        onClick={() => {
                          setUserTouchedAllocate(true);
                          setIsAutoAllocated((prev) => !prev);
                        }}
                        icon={<Sparkles size={13} />}
                      >
                        {isEn ? 'Auto-allocate' : 'Fördela automatiskt'}
                      </Button>
                    </div>

                    <div className="w-full h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[var(--brand-signature,var(--accent-color))]"
                        animate={{
                          width: `${Math.round((allocatedSum / totalPool) * 100)}%`,
                        }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* 1:1 Category Budget Rows from BudgetCategoriesView.tsx */}
                  <Card variant="default" padding="none" className="divide-y divide-menu bg-[var(--bg-color)]">
                    {allocationRows.map((cat) => {
                      const amountVal = isAutoAllocated ? cat.autoBudget : cat.baseBudget;
                      const catColor = getCategoryColor(cat.rawCat, DEFAULT_EXPENSE_CATEGORIES);
                      return (
                        <div
                          key={cat.name}
                          onClick={() => {
                            setUserTouchedAllocate(true);
                            setIsAutoAllocated((prev) => !prev);
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 min-h-[54px] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <CategoryIcon
                              icon={cat.icon}
                              color={catColor}
                              size="sm"
                              categoryName={cat.rawCat}
                            />
                            <div className="min-w-0 flex flex-col justify-center">
                              <span className="text-card-title text-[var(--text-primary)] truncate">
                                {cat.name}
                              </span>
                              {cat.fixed > 0 && (
                                <span className="text-secondary text-[var(--text-tertiary)] truncate">
                                  {isEn ? 'Fixed: ' : 'Fasta: '}
                                  {cat.fixed} kr
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="px-3 py-1.5 min-h-[36px] rounded-button bg-[var(--surface-color)] flex items-center gap-1 shrink-0 shadow-subtle">
                            <AnimatedNumber
                              value={amountVal}
                              formatter={(val) => formatAmount(val, currentLanguage)}
                              className="text-list-amount font-amount tabular-nums text-[var(--text-primary)]"
                            />
                            <span className="text-secondary text-[var(--text-secondary)]">kr</span>
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. COMPACT 3-STEP WORKFLOW */}
        <section
          id="hur-det-funkar"
          className="py-12 sm:py-16 px-4 sm:px-8 border-t border-[var(--border-divider)]"
        >
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="space-y-1.5 text-left">
              <span className="text-[12.5px] font-bold font-amount tabular-nums text-[var(--accent-color)]">
                01.
              </span>
              <h3 className="text-[17px] sm:text-[18px] font-display font-bold text-[var(--text-primary)]">
                {isEn ? 'Set payday & salary' : 'Välj lönedag och inkomst'}
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)]">
                {isEn
                  ? 'Automatically adjusts when the 25th falls on a weekend.'
                  : 'Anpassar perioden automatiskt när den 25:e infaller på helg.'}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <span className="text-[12.5px] font-bold font-amount tabular-nums text-[var(--accent-color)]">
                02.
              </span>
              <h3 className="text-[17px] sm:text-[18px] font-display font-bold text-[var(--text-primary)]">
                {isEn ? 'Deduct fixed bills & savings' : 'Lägg in fasta räkningar'}
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)]">
                {isEn
                  ? 'Reserved on day one so you see your true spending space.'
                  : 'Räknas bort direkt så du ser ditt faktiska konsumtionsutrymme.'}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <span className="text-[12.5px] font-bold font-amount tabular-nums text-[var(--accent-color)]">
                03.
              </span>
              <h3 className="text-[17px] sm:text-[18px] font-display font-bold text-[var(--text-primary)]">
                {isEn ? 'Log purchases in seconds' : 'Logga köp i realtid'}
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)]">
                {isEn
                  ? 'By voice, receipt scan, or quick tap.'
                  : 'Med rösten, kvittokamera eller ett snabbt knapptryck.'}
              </p>
            </div>
          </div>
        </section>

        {/* 5. CLOSING CONVERSION BANNER */}
        <section className="pb-14 sm:pb-20 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div
              className="rounded-modal p-7 sm:p-11 shadow-subtle relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
              style={{ background: 'var(--brand-gradient)' }}
            >
              <div className="space-y-2 text-left max-w-lg relative z-10">
                <h2
                  className="font-display font-extrabold text-[var(--text-primary)] tracking-[-0.03em] leading-[1.08]"
                  style={{
                    fontSize: 'clamp(1.65rem, 3vw, 2.35rem)',
                    textWrap: 'balance',
                  }}
                >
                  {isEn
                    ? 'Ready for full control over your next payday?'
                    : 'Redo för full koll på nästa löneperiod?'}
                </h2>
                <p className="text-[15px] sm:text-[16px] text-[var(--text-primary)]/80">
                  {isEn
                    ? 'Start in under a minute or explore the interactive demo.'
                    : 'Kom igång på under en minut eller testa direkt i vår live-demo.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 relative z-10">
                {onStartDemo && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={onStartDemo}
                    className="rounded-full h-12 px-6 text-[15px] font-semibold justify-center bg-[var(--surface-color)] whitespace-nowrap"
                  >
                    {isEn ? 'Try live demo' : 'Testa live-demo'}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="rounded-full h-12 px-7 text-[15px] font-bold justify-center whitespace-nowrap"
                >
                  <span>{isEn ? 'Get started free' : 'Kom igång gratis'}</span>
                  <ArrowRight size={17} strokeWidth={2.4} className="ml-2 shrink-0" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. FOOTER */}
      <footer className="relative z-10 py-7 px-4 sm:px-8 border-t border-[var(--border-divider)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DejzLogo className="h-5 w-auto" textColor="var(--logo-color)" />
            <span className="text-[12.5px] text-[var(--text-secondary)]">
              © {new Date().getFullYear()} Dejz
            </span>
          </div>

          <div className="flex items-center gap-6 text-[13px] font-medium text-[var(--text-secondary)]">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                handlePolicyOpen('privacy');
              }}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer no-underline text-inherit"
            >
              {isEn ? 'Privacy Policy' : 'Integritetspolicy'}
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                handlePolicyOpen('terms');
              }}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer no-underline text-inherit"
            >
              {isEn ? 'Terms of Use' : 'Användarvillkor'}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
