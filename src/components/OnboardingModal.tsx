import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Loader2, Plus, ChevronLeft, Check, X, Building2, Sparkles, ShieldCheck, Edit2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { Config, Frequency, Category, FixedExpense, Income, SavingsGoal, MonthlySaving, PaydayType, WeekendAdjustment } from '../types';
import { formatAmount, formatCurrency } from '../utils/format';
import { getPeriodBoundaries } from '../utils/date';
import { FixedExpenseModal, IncomeModal } from './BudgetModals';
import { useScrollLock } from '../hooks/useScrollLock';
import { BudgetItem } from './BudgetItem';
import { TransactionLogo } from './TransactionLogo';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../data/swedishExpensePresets';
import { parseIncomePrompt } from '../utils/incomeAiParser';
import { SmartInput, Modal, Button, Input } from './ui';
import { Switch } from './ui/Switch';
import { getLogoUrl, fetchLogoForName } from '../utils/logo';
import { BankConnectFlowModal } from './BankConnectFlowModal';
import { bankService, BankAccount, BankConnection } from '../services/bankService';
import { analyzeBankTransactionsForOnboarding, AnalyzedBankOnboardingData } from '../utils/bankHistoryAnalyzer';
import {
  saveOnboardingBankDraft,
  loadOnboardingBankDraft,
  clearOnboardingBankDraft,
  clearBankRedirectOrigin,
  PendingBankCallback,
} from '../utils/bankFeatureFlag';

export type Step = 'name' | 'bank' | 'payday' | 'income' | 'expenses' | 'goals' | 'midMonth' | 'summary';

export const AGE_OPTIONS = [
  { id: '<18', labelSv: 'Under 18 år', labelEn: 'Under 18', isYoung: true },
  { id: '18-25', labelSv: '18–25 år', labelEn: '18–25', isYoung: true },
  { id: '26-35', labelSv: '26–35 år', labelEn: '26–35', isYoung: false },
  { id: '36-50', labelSv: '36–50 år', labelEn: '36–50', isYoung: false },
  { id: '51+', labelSv: '51+ år', labelEn: '51+', isYoung: false },
];

import { 
  normalizeLanguage, 
  getRegionDefaults, 
  NordicCountry, 
} from '../utils/nordic';

const texts: Record<string, any> = {
  sv: {
    stepOf: (step: number, total: number) => `Steg ${step} av ${total}`,
    welcome: 'Välkommen till Dejz',
    nameQuestion: 'Vad heter du?',
    firstNamePlaceholder: 'Ditt förnamn',
    countryQuestion: 'Land och valuta',
    paydayTitle: 'Din lönedag',
    paydayQuestion: 'När får du lön?',
    paydayDesc: 'Det avgör när din period börjar och slutar.',
    customDay: 'Annan dag',
    everyMonth: ':e varje månad',
    paydayBeforeWeekendTitle: 'Lön tidigare vid helg',
    paydayBeforeWeekendDesc: 'Om din lönedag infaller på en helg räknar Dejz med att lönen kommer föregående vardag.',
    incomeTitle: 'Månadsinkomst',
    incomeQuestion: 'Vilka inkomster har du varje månad?',
    incomeDesc: 'Lägg till dina återkommande inkomster.',
    aiPlaceholder: 'T.ex. 28 500 från IKEA',
    addIncome: 'Lägg till inkomst manuellt',
    expensesTitle: 'Fasta kostnader',
    expensesQuestion: 'Vilka fasta kostnader har du?',
    expensesDesc: 'Lägg till dina återkommande kostnader.',
    searchPresetsPlaceholder: 'Sök fast kostnad',
    customExpense: 'Skapa egen utgift',
    noPresetsFound: 'Ingen färdig mall hittades. Skapa en egen nedan.',
    savingsTitle: 'Månadssparande',
    savingsQuestion: 'Hur mycket vill du spara varje månad?',
    savingsDesc: 'Vi räknar bort det innan vi visar vad du har kvar att spendera.',
    midMonthTitle: 'Din start',
    summaryTitle: 'Din plan',
    summaryQuestion: 'Din plan är klar',
    untilPayday: (date: string) => `Fram till nästa lön den ${date}`,
    incomeLabel: 'Inkomst',
    fixedCostsLabel: 'Fasta kostnader',
    savingsLabel: 'Månadssparande',
    spentSoFarLabel: 'Spenderat hittills',
    freeSpendLabel: 'Kvar att spendera',
    openDejz: 'Öppna Dejz',
    next: 'Nästa',
    back: 'Tillbaka',
    exitOnboarding: 'Avsluta onboarding',
    skipOnboardingTitle: 'Hoppa över introduktionen?',
    skipOnboardingDesc: 'Du kan alltid ställa in lönedag, inkomster och fasta utgifter senare under Inställningar.',
    skipAndEnter: 'Hoppa över & öppna Dejz',
    continueOnboarding: 'Fortsätt introduktionen',
  },
  da: {
    stepOf: (step: number, total: number) => `Trin ${step} af ${total}`,
    welcome: 'Velkommen til Dejz',
    nameQuestion: 'Hvad hedder du?',
    firstNamePlaceholder: 'Dit fornavn',
    countryQuestion: 'Land og valuta',
    paydayTitle: 'Din lønningsdag',
    paydayQuestion: 'Hvornår får du løn?',
    paydayDesc: 'Det afgør, hvornår din budgetperiode starter og slutter.',
    customDay: 'Anden dag',
    everyMonth: '. hver måned',
    paydayBeforeWeekendTitle: 'Løn tidligere ved weekend',
    paydayBeforeWeekendDesc: 'Hvis din lønningsdag falder i en weekend, regner Dejz med, at lønnen kommer hverdagen før.',
    incomeTitle: 'Månedlig indkomst',
    incomeQuestion: 'Hvilke faste indtægter har du hver måned?',
    incomeDesc: 'Tilføj dine faste indkomster.',
    aiPlaceholder: 'F.eks. 25.000 fra arbejde',
    addIncome: 'Tilføj indkomst manuelt',
    expensesTitle: 'Faste udgifter',
    expensesQuestion: 'Hvilke faste udgifter har du?',
    expensesDesc: 'Tilføj dine faste omkostninger.',
    searchPresetsPlaceholder: 'Søg fast udgift',
    customExpense: 'Opret egen udgift',
    noPresetsFound: 'Ingen skabelon fundet. Opret din egen nedenfor.',
    savingsTitle: 'Månedlig opsparing',
    savingsQuestion: 'Hvor meget vil du spare op hver måned?',
    savingsDesc: 'Vi trækker det fra, før vi viser hvad du har tilbage at bruge.',
    midMonthTitle: 'Din start',
    summaryTitle: 'Din plan',
    summaryQuestion: 'Din plan er klar',
    untilPayday: (date: string) => `Frem til næste løn den ${date}`,
    incomeLabel: 'Indkomst',
    fixedCostsLabel: 'Faste udgifter',
    savingsLabel: 'Opsparing',
    spentSoFarLabel: 'Brugt indtil videre',
    freeSpendLabel: 'Tilbage at bruge',
    openDejz: 'Åbn Dejz',
    next: 'Næste',
    back: 'Tilbage',
    exitOnboarding: 'Afslut introduktion',
    skipOnboardingTitle: 'Spring introduktionen over?',
    skipOnboardingDesc: 'Du kan altid indstille lønningsdag, indkomst og faste udgifter senere under Indstillinger.',
    skipAndEnter: 'Spring over & åbn Dejz',
    continueOnboarding: 'Fortsæt introduktionen',
  },
  no: {
    stepOf: (step: number, total: number) => `Steg ${step} av ${total}`,
    welcome: 'Velkommen til Dejz',
    nameQuestion: 'Hva heter du?',
    firstNamePlaceholder: 'Fornavnet ditt',
    countryQuestion: 'Land og valuta',
    paydayTitle: 'Din lønningsdag',
    paydayQuestion: 'Når får du lønn?',
    paydayDesc: 'Det avgjør når perioden din starter og slutter.',
    customDay: 'Annen dag',
    everyMonth: '. hver måned',
    paydayBeforeWeekendTitle: 'Lønn tidligere ved helg',
    paydayBeforeWeekendDesc: 'Hvis lønningsdagen din faller på en helg, regner Dejz med at lønnen kommer foregående hverdag.',
    incomeTitle: 'Månedsinntekt',
    incomeQuestion: 'Hvilke faste inntekter har du hver måned?',
    incomeDesc: 'Legg til dine faste inntekter.',
    aiPlaceholder: 'F.eks. 25 000 fra jobb',
    addIncome: 'Legg til inntekt manuelt',
    expensesTitle: 'Faste utgifter',
    expensesQuestion: 'Hvilke faste utgifter har du?',
    expensesDesc: 'Legg til dine faste kostnader.',
    searchPresetsPlaceholder: 'Søk fast utgift',
    customExpense: 'Opprett egen utgift',
    noPresetsFound: 'Ingen mal funnet. Opprett din egen nedenfor.',
    savingsTitle: 'Månedssparing',
    savingsQuestion: 'Hvor mye vil du spare hver måned?',
    savingsDesc: 'Vi trekker det fra før vi viser hva du har igjen å bruke.',
    midMonthTitle: 'Din start',
    summaryTitle: 'Planen din',
    summaryQuestion: 'Planen din er klar',
    untilPayday: (date: string) => `Frem til neste lønn den ${date}`,
    incomeLabel: 'Inntekt',
    fixedCostsLabel: 'Faste utgifter',
    savingsLabel: 'Månedssparing',
    spentSoFarLabel: 'Brukt så langt',
    freeSpendLabel: 'Igjen å bruke',
    openDejz: 'Åpne Dejz',
    next: 'Neste',
    back: 'Tilbake',
    exitOnboarding: 'Avslutt introduksjon',
    skipOnboardingTitle: 'Hopp over introduksjonen?',
    skipOnboardingDesc: 'Du kan alltid stille inn lønningsdag, inntekter og faste utgifter senere under Innstillinger.',
    skipAndEnter: 'Hopp over & åpne Dejz',
    continueOnboarding: 'Fortsett introduksjonen',
  },
  fi: {
    stepOf: (step: number, total: number) => `Vaihe ${step} / ${total}`,
    welcome: 'Tervetuloa Dejziin',
    nameQuestion: 'Mikä on nimesi?',
    firstNamePlaceholder: 'Etunimesi',
    countryQuestion: 'Maa ja valuutta',
    paydayTitle: 'Palkkapäiväsi',
    paydayQuestion: 'Milloin saat palkkaa?',
    paydayDesc: 'Tämä määrittää budjettikautesi alun ja lopun.',
    customDay: 'Muu päivä',
    everyMonth: '. joka kuukausi',
    paydayBeforeWeekendTitle: 'Palkka aiemmin viikonloppuna',
    paydayBeforeWeekendDesc: 'Jos palkkapäiväsi osuu viikonlopulle, Dejz olettaa sen saapuvan edellisenä arkipäivänä.',
    incomeTitle: 'Kuukausitulot',
    incomeQuestion: 'Mitä toistuvia tuloja sinulla on kuukaudessa?',
    incomeDesc: 'Lisää toistuvat tulosi.',
    aiPlaceholder: 'Esim. 2 500 palkka',
    addIncome: 'Lisää tulo manuaalisesti',
    expensesTitle: 'Kiinteät kulut',
    expensesQuestion: 'Mitä kiinteitä kuluja sinulla on?',
    expensesDesc: 'Lisää toistuvat menosi.',
    searchPresetsPlaceholder: 'Hae kiinteää kulua',
    customExpense: 'Luo oma kulu',
    noPresetsFound: 'Mallia ei löytynyt. Luo oma kulu alla.',
    savingsTitle: 'Kuukausisäästö',
    savingsQuestion: 'Kuinka paljon haluat säästää kuukaudessa?',
    savingsDesc: 'Vähennämme tämän ennen kuin näytämme vapaasti käytettävissä olevan budjettisi.',
    midMonthTitle: 'Kauden aloitus',
    summaryTitle: 'Suunnitelmasi',
    summaryQuestion: 'Suunnitelmasi on valmis',
    untilPayday: (date: string) => `Seuraavaan palkkapäivään (${date}) asti`,
    incomeLabel: 'Tulot',
    fixedCostsLabel: 'Kiinteät kulut',
    savingsLabel: 'Kuukausisäästö',
    spentSoFarLabel: 'Käytetty tähän mennessä',
    freeSpendLabel: 'Käytettävissä',
    openDejz: 'Avaa Dejz',
    next: 'Seuraava',
    back: 'Takaisin',
    exitOnboarding: 'Poistu esittelystä',
    skipOnboardingTitle: 'Haluatko ohittaa esittelyn?',
    skipOnboardingDesc: 'Voit aina määrittää palkkapäivän, tulot ja kiinteät kulut myöhemmin Asetuksista.',
    skipAndEnter: 'Ohita ja avaa Dejz',
    continueOnboarding: 'Jatka esittelyä',
  },
  en: {
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    welcome: 'Welcome to Dejz',
    nameQuestion: 'What is your name?',
    firstNamePlaceholder: 'Your first name',
    countryQuestion: 'Country & currency',
    paydayTitle: 'Your Payday',
    paydayQuestion: 'When do you get paid?',
    paydayDesc: 'This determines your financial period.',
    customDay: 'Other day',
    everyMonth: 'th of every month',
    paydayBeforeWeekendTitle: 'Pay early if weekend',
    paydayBeforeWeekendDesc: 'If your payday falls on a weekend, Dejz counts it as arriving on the previous weekday.',
    incomeTitle: 'Monthly Income',
    incomeQuestion: 'What recurring income do you have each month?',
    incomeDesc: 'Add your recurring income.',
    aiPlaceholder: 'E.g. 28 500 from IKEA',
    addIncome: 'Add income manually',
    expensesTitle: 'Fixed Expenses',
    expensesQuestion: 'What fixed expenses do you have?',
    expensesDesc: 'Add your recurring expenses.',
    searchPresetsPlaceholder: 'Search fixed cost',
    customExpense: 'Create custom expense',
    noPresetsFound: 'No template found. Create a custom one below.',
    savingsTitle: 'Monthly Savings',
    savingsQuestion: 'How much do you want to save each month?',
    savingsDesc: 'We deduct it before showing what you have available to spend.',
    midMonthTitle: 'Start of period',
    summaryTitle: 'Your Plan',
    summaryQuestion: 'Your plan is ready',
    untilPayday: (date: string) => `Until next payday on ${date}`,
    incomeLabel: 'Income',
    fixedCostsLabel: 'Fixed Expenses',
    savingsLabel: 'Monthly Savings',
    spentSoFarLabel: 'Spent so far',
    freeSpendLabel: 'Available to spend',
    openDejz: 'Open Dejz',
    next: 'Next',
    back: 'Back',
    exitOnboarding: 'Exit onboarding',
    skipOnboardingTitle: 'Skip onboarding?',
    skipOnboardingDesc: 'You can always configure your payday, incomes, and fixed expenses later in Settings.',
    skipAndEnter: 'Skip & Open Dejz',
    continueOnboarding: 'Continue onboarding',
  }
};

const QUICK_PAYDAYS = [25, 27, 30, 1];
const SAVINGS_PRESETS = [0, 1000, 2000, 3000, 5000];

function getStep6DynamicContent(daysSince: number, lang: string) {
  const days = Math.max(1, daysSince);
  const isSingular = days === 1;
  const norm = normalizeLanguage(lang);

  if (norm === 'en') {
    return {
      headline: isSingular
        ? 'You are 1 day into your pay period. How much have you spent on other purchases since payday?'
        : `You are ${days} days into your pay period. How much have you spent on other purchases since payday?`,
      helpText: 'Do not include fixed expenses you already entered. It does not need to be exact. You only do this once.',
    };
  }

  if (norm === 'da') {
    return {
      headline: isSingular
        ? 'Du er 1 dag inde i din lønperiode. Hvor meget har du brugt på øvrige køb siden lønningsdag?'
        : `Du er ${days} dage inde i din lønperiode. Hvor meget har du brugt på øvrige køb siden lønningsdag?`,
      helpText: 'Medregn ikke faste udgifter, du allerede har indtastet. Det behøver ikke være præcist. Du gør kun dette én gang.',
    };
  }

  if (norm === 'no') {
    return {
      headline: isSingular
        ? 'Du er 1 dag inn i lønnsperioden din. Hvor mye har du brukt på andre kjøp siden du fikk lønn?'
        : `Du er ${days} dager inn i lønnsperioden din. Hvor mye har du brukt på andre kjøp siden du fikk lønn?`,
      helpText: 'Ikke regn med faste utgifter du allerede har lagt inn. Det trenger ikke være nøyaktig. Dette gjør du bare én gang.',
    };
  }

  if (norm === 'fi') {
    return {
      headline: isSingular
        ? 'Olet 1 päivän palkkakaudessasi. Kuinka paljon olet käyttänyt muihin ostoksiin palkkapäivän jälkeen?'
        : `Olet ${days} päivää palkkakaudessasi. Kuinka paljon olet käyttänyt muihin ostoksiin palkkapäivän jälkeen?`,
      helpText: 'Älä laske mukaan kiinteitä kuluja, jotka olet jo lisännyt. Sen ei tarvitse olla tarkkaa. Teet tämän vain kerran.',
    };
  }

  // Swedish default
  return {
    headline: isSingular
      ? 'Du är 1 dag in i din löneperiod. Hur mycket har du spenderat på övriga köp sedan du fick lön?'
      : `Du är ${days} dagar in i din löneperiod. Hur mycket har du spenderat på övriga köp sedan du fick lön?`,
    helpText: 'Räkna inte med fasta kostnader du redan lagt in. Det behöver inte vara exakt. Det här gör du bara en gång.',
  };
}

interface OnboardingModalProps {
  isOpen: boolean;
  config: Config;
  userId?: string;
  isPro: boolean;
  isBankIntegrationEnabled?: boolean;
  pendingBankCallback?: PendingBankCallback | null;
  onClearPendingBankCallback?: () => void;
  onComplete: (data: {
    fullName: string;
    incomes: { amount: number; name: string; icon?: string; logo?: string; deductionDay?: number }[];
    fixedExpenses: Omit<FixedExpense, 'id'>[];
    savingsGoals: { title: string; targetAmount: number; icon?: string; logo?: string; deadline?: string }[];
    monthlySavings?: number;
    monthlySavingsItems?: MonthlySaving[];
    initialSpent: number;
    payday: number;
    paydayBeforeWeekend: boolean;
    userAgeGroup?: string;
    userGender?: string;
    categories?: Category[];
    country?: NordicCountry;
    currency?: string;
    currencyCode?: string;
  }) => Promise<void> | void;
  t: (key: TranslationKey) => string;
  currentPeriodId: string;
  onClose?: () => void;
}

export function OnboardingModal({
  isOpen,
  config,
  userId,
  isPro,
  isBankIntegrationEnabled = false,
  pendingBankCallback = null,
  onClearPendingBankCallback,
  onComplete,
  onClose,
  t,
  currentPeriodId,
}: OnboardingModalProps) {
  useScrollLock(isOpen);
  const norm = normalizeLanguage(config.language);
  const isEn = norm === 'en';
  const lang = norm;
  const s = texts[norm] || texts.sv;

  const initialRegion = getRegionDefaults(config.country || config.language || 'sv');
  const selectedCountry = (config.country as NordicCountry) || initialRegion.countryCode;
  const selectedCurrency = config.currency || initialRegion.currencySymbol;
  const selectedCurrencyCode = config.currencyCode || initialRegion.defaultCurrencyCode;

  const [step, setStep] = useState<Step>('name');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [payday, setPayday] = useState(25);
  const [isCustomDayActive, setIsCustomDayActive] = useState(false);
  const [paydayBeforeWeekend, setPaydayBeforeWeekend] = useState<boolean>(
    config.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true
  );
  const [midMonthSpent, setMidMonthSpent] = useState<string>('');
  
  // Lists State
  const [incomes, setIncomes] = useState<Omit<Income, 'id'>[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<Omit<FixedExpense, 'id'>[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'priority'>[]>([]);
  const [monthlySavingsInput, setMonthlySavingsInput] = useState<string>('0');

  // Bank Connection & Historical Analysis State inside Onboarding
  const [isBankFlowOpen, setIsBankFlowOpen] = useState(false);
  const [activeCallbackForModal, setActiveCallbackForModal] = useState<PendingBankCallback | null>(null);
  const [connectedBankAccounts, setConnectedBankAccounts] = useState<BankAccount[]>([]);
  const [existingConnections, setExistingConnections] = useState<BankConnection[]>([]);
  const [isCheckingBankStatus, setIsCheckingBankStatus] = useState(false);
  const [isAnalyzingBankHistory, setIsAnalyzingBankHistory] = useState(false);
  const [bankAnalysisError, setBankAnalysisError] = useState<string | null>(null);
  const [bankAnalysisResult, setBankAnalysisResult] = useState<AnalyzedBankOnboardingData | null>(null);
  const [selectedSuggestedExpenseIdxs, setSelectedSuggestedExpenseIdxs] = useState<Set<number>>(new Set());
  const [selectedSuggestedIncomeIdxs, setSelectedSuggestedIncomeIdxs] = useState<Set<number>>(new Set());
  const [enableOngoingBankImport, setEnableOngoingBankImport] = useState<boolean>(true);

  // Check if the user already has an active connected bank when reaching step === 'bank'
  useEffect(() => {
    if (!isOpen || !isBankIntegrationEnabled || step !== 'bank') return;
    let cancelled = false;
    setIsCheckingBankStatus(true);
    bankService
      .getStatus()
      .then((res) => {
        if (cancelled) return;
        const activeConns = (res.connections || []).filter((c) => c.status === 'active');
        setExistingConnections(activeConns);
        const selectedAccs = (res.accounts || []).filter((a) => a.is_selected);
        if (selectedAccs.length > 0 && connectedBankAccounts.length === 0) {
          setConnectedBankAccounts(selectedAccs);
        }
      })
      .catch(() => {
        // Ignore status check errors in onboarding
      })
      .finally(() => {
        if (!cancelled) setIsCheckingBankStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isBankIntegrationEnabled, step]);

  const applySelectedBankSuggestionsAndContinue = (stepByStep = false) => {
    if (bankAnalysisResult) {
      if (bankAnalysisResult.suggestedPayday && bankAnalysisResult.suggestedPayday >= 1 && bankAnalysisResult.suggestedPayday <= 31) {
        setPayday(bankAnalysisResult.suggestedPayday);
      }

      const chosenIncomes = bankAnalysisResult.detectedIncomes
        .filter((_, idx) => selectedSuggestedIncomeIdxs.has(idx))
        .map(({ detectedOccurrences: _o, lastDate: _l, evidenceDates: _ed, evidenceAmounts: _ea, evidenceSummary: _es, ...rest }) => rest);

      setIncomes(chosenIncomes);

      const chosenFixed: Omit<FixedExpense, 'id'>[] = bankAnalysisResult.detectedFixedExpenses
        .filter((_, idx) => selectedSuggestedExpenseIdxs.has(idx))
        .map(({ detectedOccurrences: _occ, lastDate: _ld, evidenceDates: _ed, evidenceAmounts: _ea, evidenceSummary: _es, ...rest }) => rest);

      setFixedExpenses(chosenFixed);
      setMidMonthSpent('0');
    }
    setStep(stepByStep ? 'payday' : 'summary');
  };

  const runBankHistoryAnalysis = async (accountsOverride?: BankAccount[]) => {
    setIsAnalyzingBankHistory(true);
    setBankAnalysisError(null);
    try {
      const targetAccounts = accountsOverride || connectedBankAccounts;
      if (accountsOverride && accountsOverride.length > 0) {
        setConnectedBankAccounts(accountsOverride);
      }

      // Fetch all stored transactions (or sync if empty)
      let allTransactions = await bankService.listAllTransactionsForReconciliation();

      if (allTransactions.length === 0 && (targetAccounts.length > 0 || existingConnections.length > 0)) {
        try {
          await bankService.sync({ connectionId: existingConnections[0]?.id });
          allTransactions = await bankService.listAllTransactionsForReconciliation();
        } catch (syncErr) {
          console.warn('Sync during onboarding analysis failed:', syncErr);
        }
      }

      const analysis = analyzeBankTransactionsForOnboarding(allTransactions, payday, paydayBeforeWeekend);
      setBankAnalysisResult(analysis);
      setSelectedSuggestedExpenseIdxs(
        new Set(analysis.detectedFixedExpenses.map((_, i) => i))
      );
      setSelectedSuggestedIncomeIdxs(
        new Set(analysis.detectedIncomes.map((_, i) => i))
      );
      if (analysis.suggestedPayday && analysis.suggestedPayday >= 1 && analysis.suggestedPayday <= 31) {
        setPayday(analysis.suggestedPayday);
      }
    } catch (err: any) {
      console.error('Error analyzing bank history in onboarding:', err);
      setBankAnalysisError(
        err?.message ||
          (isEn
            ? 'Could not analyze bank history right now. You can continue and review manually.'
            : 'Kunde inte analysera bankhistoriken just nu. Du kan fortsätta och granska manuellt.')
      );
    } finally {
      setIsAnalyzingBankHistory(false);
    }
  };

  // Restore saved onboarding progress when returning from bank redirect (or reset to first step when opened fresh)
  useEffect(() => {
    if (!isOpen) return;
    const savedDraft = loadOnboardingBankDraft();
    if (savedDraft) {
      if (savedDraft.fullName !== undefined) setFullName(savedDraft.fullName);
      if (savedDraft.payday !== undefined) setPayday(savedDraft.payday);
      if (savedDraft.paydayBeforeWeekend !== undefined) setPaydayBeforeWeekend(savedDraft.paydayBeforeWeekend);
      if (Array.isArray(savedDraft.incomes)) setIncomes(savedDraft.incomes as any);
      if (Array.isArray(savedDraft.fixedExpenses)) setFixedExpenses(savedDraft.fixedExpenses as any);
      if (Array.isArray(savedDraft.savingsGoals)) setSavingsGoals(savedDraft.savingsGoals as any);
      if (savedDraft.monthlySavingsInput !== undefined) setMonthlySavingsInput(savedDraft.monthlySavingsInput);
      if (savedDraft.midMonthSpent !== undefined) setMidMonthSpent(savedDraft.midMonthSpent);
      if (isBankIntegrationEnabled && savedDraft.step === 'bank') {
        setStep('bank');
      }
    } else if (!pendingBankCallback) {
      setStep('name');
      setBankAnalysisResult(null);
      setBankAnalysisError(null);
    }
  }, [isOpen, isBankIntegrationEnabled]);

  // If returned from /bank/callback during onboarding, open BankConnectFlowModal to finish code exchange & account selection
  useEffect(() => {
    if (!isOpen || !isBankIntegrationEnabled || !pendingBankCallback) return;
    setStep('bank');
    setActiveCallbackForModal(pendingBankCallback);
    setIsBankFlowOpen(true);
    if (onClearPendingBankCallback) {
      onClearPendingBankCallback();
    }
  }, [isOpen, isBankIntegrationEnabled, pendingBankCallback, onClearPendingBankCallback]);

  const persistCurrentOnboardingDraft = () => {
    saveOnboardingBankDraft({
      fullName,
      payday,
      paydayBeforeWeekend,
      incomes: incomes as any,
      fixedExpenses: fixedExpenses as any,
      savingsGoals: savingsGoals as any,
      monthlySavingsInput,
      midMonthSpent,
      step: 'bank',
      savedAt: Date.now(),
    });
  };

  // Modals State
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [editingIncomeIndex, setEditingIncomeIndex] = useState<number | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState<number | null>(null);

  // Quick Preset Search State
  const [presetSearch, setPresetSearch] = useState('');

  // AI Smart Income Input State
  const [aiIncomePrompt, setAiIncomePrompt] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const paymentMethods = config.paymentMethods || [];
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTogglePreset = (preset: SwedishExpensePreset) => {
    const existingIndex = fixedExpenses.findIndex(
      exp => exp.name.trim().toLowerCase() === preset.name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      setFixedExpenses(fixedExpenses.filter((_, i) => i !== existingIndex));
    } else {
      const instantLogo = getLogoUrl(preset.name, preset.category);

      const newExpense: Omit<FixedExpense, 'id'> = {
        name: preset.name,
        amount: preset.defaultAmount,
        category: preset.category,
        frequency: Frequency.MONTHLY,
        deductionDay: preset.deductionDay,
        paymentMethod: preset.paymentMethod,
        logo: instantLogo,
      };
      setFixedExpenses(prev => [...prev, newExpense]);

      if (!instantLogo || instantLogo.includes('google.com/s2/favicons')) {
        fetchLogoForName(preset.name, preset.category).then(url => {
          if (url) {
            setFixedExpenses(prev => prev.map(item => 
              item.name.trim().toLowerCase() === preset.name.trim().toLowerCase() ? { ...item, logo: url } : item
            ));
          }
        });
      }
    }
  };

  const filteredPresets = useMemo(() => {
    const term = presetSearch.trim().toLowerCase();
    if (!term) return [];
    return SWEDISH_EXPENSE_PRESETS.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.category.toLowerCase().includes(term)
    );
  }, [presetSearch]);

  // Lock body scroll and prevent background scroll while onboarding is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      return () => {
        document.body.style.overflow = originalOverflow;
        window.scrollTo({ top: 0, behavior: 'instant' as any });
      };
    }
  }, [isOpen]);

  const popularPresets = useMemo(() => {
    const topIds = [
      'hyra-bostad',
      'bostadslan-ranta',
      'elavtal',
      'hemforsakring',
      'mobilabonnemang',
      'bredband-hemma',
      'spotify-individual',
      'netflix-standard',
      'sl-manadskort',
      'csn-aterbetalning',
      'bilforsakring',
      'sats-gym',
      'nordic-wellness',
      'fitness24seven',
      'akassa-unionen',
      'youtube-premium',
      'disney-plus',
      'max-hbo',
      'viaplay-film-serier',
      'storytel-ljudbok',
      'bookbeat',
      'icloud-storage',
      'chatgpt-plus',
      'hedvig-hemforsakring',
      'lansforsakringar-hem',
      'vasttrafik-period',
      'skanetrafiken-period',
      'parkering-boende',
      'friskis-svettis',
      'djurforsakring-agria',
    ];
    return topIds
      .map(id => SWEDISH_EXPENSE_PRESETS.find(p => p.id === id))
      .filter((p): p is SwedishExpensePreset => p !== undefined);
  }, []);

  const hasBankFastTrack = Boolean(bankAnalysisResult && (connectedBankAccounts.length > 0 || existingConnections.length > 0));

  const stepNumber = hasBankFastTrack
    ? (step === 'name' ? 1 : step === 'bank' ? 2 : 3)
    : isBankIntegrationEnabled
      ? (step === 'name' ? 1 :
         step === 'bank' ? 2 :
         step === 'payday' ? 3 :
         step === 'income' ? 4 :
         step === 'expenses' ? 5 :
         step === 'goals' ? 6 :
         step === 'midMonth' ? 7 : 8)
      : (step === 'name' ? 1 : 
         step === 'payday' ? 2 : 
         step === 'income' ? 3 : 
         step === 'expenses' ? 4 : 
         step === 'goals' ? 5 : 
         step === 'midMonth' ? 6 : 7);
  const totalSteps = hasBankFastTrack ? 3 : (isBankIntegrationEnabled ? 8 : 7);

  // Financial Metrics: Inkomst - Fasta kostnader - Månadssparande = Kvar att använda
  const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalFixed = fixedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  
  const totalMonthlySavings = useMemo(() => {
    if (savingsGoals.length > 0) {
      return savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
    }
    return Math.max(0, Number(monthlySavingsInput) || 0);
  }, [savingsGoals, monthlySavingsInput]);

  const totalConnectedBankBalance = useMemo(() => {
    return connectedBankAccounts
      .filter((a) => a.is_selected)
      .reduce((sum, a) => sum + (Number(a.balance_amount) || 0), 0);
  }, [connectedBankAccounts]);

  // Calculate period boundaries and days since actual payday with weekend adjustment
  const currentPeriod = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paydayType = payday === 25 
      ? PaydayType.TWENTY_FIFTH 
      : (payday === 1 ? PaydayType.FIRST_DAY : PaydayType.CUSTOM);
    const adjustment = paydayBeforeWeekend 
      ? WeekendAdjustment.BEFORE 
      : WeekendAdjustment.NONE;

    const { start, end } = getPeriodBoundaries(today, paydayType, payday, adjustment);
    
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    
    const diffMs = today.getTime() - startDate.getTime();
    const daysSince = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    // Next payday date (day after period end)
    const nextPayday = new Date(end);
    nextPayday.setDate(nextPayday.getDate() + 1);
    nextPayday.setHours(0, 0, 0, 0);
    const daysUntilNext = Math.max(1, Math.round((nextPayday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      daysSincePayday: daysSince,
      daysUntilNextPayday: daysUntilNext,
      startDate,
      nextPaydayDate: nextPayday,
    };
  }, [payday, paydayBeforeWeekend]);

  const daysSincePayday = currentPeriod.daysSincePayday;

  // Auto-skip Step 6 if 0 days into the period (payday)
  useEffect(() => {
    if (step === 'midMonth' && daysSincePayday === 0) {
      setMidMonthSpent('0');
      setStep('summary');
    }
  }, [step, daysSincePayday]);

  const initialSpentAmount = bankAnalysisResult
    ? Math.max(0, Number(bankAnalysisResult.calculatedSpentSincePayday) || 0)
    : (midMonthSpent.trim() !== '' && daysSincePayday > 0 
        ? Math.max(0, Number(midMonthSpent) || 0) 
        : 0);

  // Exact economic calculation for the monthly plan (Source of Truth)
  // Inkomst − fasta kostnader − månadssparande − spenderat hittills = kvar att använda
  const calculatedLeftToUse = totalIncome - totalFixed - totalMonthlySavings - initialSpentAmount;

  const nextPaydayFormatted = useMemo(() => {
    const targetDate = currentPeriod.nextPaydayDate;
    const monthNamesSv = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mName = isEn ? monthNamesEn[targetDate.getMonth()] : monthNamesSv[targetDate.getMonth()];
    return isEn ? `${targetDate.getDate()} ${mName}` : `${targetDate.getDate()}:e ${mName}`;
  }, [currentPeriod.nextPaydayDate, isEn]);

  const handleNext = () => {
    if (step === 'name') {
      setStep(isBankIntegrationEnabled ? 'bank' : 'payday');
    } else if (step === 'bank') {
      setStep('payday');
    } else if (step === 'payday') {
      setStep('income');
    } else if (step === 'income') {
      setStep('expenses');
    } else if (step === 'expenses') {
      setStep('goals');
    } else if (step === 'goals') {
      if (daysSincePayday === 0 || bankAnalysisResult) {
        setMidMonthSpent('0');
        setStep('summary');
      } else {
        setStep('midMonth');
      }
    } else if (step === 'midMonth') {
      setStep('summary');
    }
  };

  const handleBack = () => {
    if (step === 'bank') setStep('name');
    else if (step === 'payday') setStep(isBankIntegrationEnabled ? 'bank' : 'name');
    else if (step === 'income') setStep('payday');
    else if (step === 'expenses') setStep('income');
    else if (step === 'goals') setStep('expenses');
    else if (step === 'midMonth') setStep('goals');
    else if (step === 'summary') {
      if (bankAnalysisResult) {
        setStep('bank');
      } else if (daysSincePayday === 0) {
        setStep('goals');
      } else {
        setStep('midMonth');
      }
    }
  };

  const handleSavingsChange = (val: string) => {
    setMonthlySavingsInput(val);
    const amount = Math.max(0, Number(val) || 0);
    if (amount > 0) {
      setSavingsGoals([{
        title: s.savingsTitle,
        targetAmount: amount,
        icon: 'PiggyBank',
      }]);
    } else {
      setSavingsGoals([]);
    }
  };

  const handleSave = async (forceInitialSpent?: number) => {
    setIsUpdating(true);
    setError(null);
    try {
      clearOnboardingBankDraft();
      clearBankRedirectOrigin();
      const trimmedName = fullName.trim();
      if (trimmedName && userId && userId !== 'sandbox' && userId !== 'demo-user') {
        try {
          await supabase.auth.updateUser({
            data: { full_name: trimmedName }
          });
        } catch (authErr) {
          console.warn('Could not update user full_name in auth:', authErr);
        }
      }

      let initialSpent = 0;
      if (bankAnalysisResult || connectedBankAccounts.length > 0) {
        // Real bank transactions are imported directly into app transactions, so no lump-sum adjustment is needed
        initialSpent = 0;
      } else if (forceInitialSpent !== undefined) {
        initialSpent = forceInitialSpent;
      } else if (daysSincePayday === 0) {
        initialSpent = 0;
      } else if (midMonthSpent.trim() !== '') {
        initialSpent = Math.max(0, Number(midMonthSpent) || 0);
      }

      const finalGoals = savingsGoals.length > 0 
        ? savingsGoals 
        : (Number(monthlySavingsInput) > 0 ? [{
            title: s.savingsTitle,
            targetAmount: Number(monthlySavingsInput),
            icon: 'PiggyBank',
          }] : []);

      const finalMonthlySavingsAmount = totalMonthlySavings > 0
        ? totalMonthlySavings
        : finalGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);

      const finalMonthlySavingsItems: MonthlySaving[] = finalGoals.length > 0
        ? finalGoals.filter(g => Number(g.targetAmount) > 0).map(g => ({
            id: crypto.randomUUID(),
            name: g.title || (isEn ? 'Monthly savings' : 'Månadssparande'),
            amount: Number(g.targetAmount) || 0,
            icon: g.icon || 'PiggyBank',
            logo: g.logo,
            deductionDay: payday || 25,
            frequency: Frequency.MONTHLY,
          }))
        : (finalMonthlySavingsAmount > 0 ? [{
            id: crypto.randomUUID(),
            name: isEn ? 'Monthly savings' : 'Månadssparande',
            amount: finalMonthlySavingsAmount,
            icon: 'PiggyBank',
            deductionDay: payday || 25,
            frequency: Frequency.MONTHLY,
          }] : []);

      // If bank was connected in onboarding, save import_start_date and ongoing_import_enabled on selected accounts
      if (connectedBankAccounts.length > 0) {
        const startIso = currentPeriod.startDate.toISOString().split('T')[0];
        const nowIso = new Date().toISOString();
        await Promise.all(
          connectedBankAccounts
            .filter((a) => a.is_selected)
            .map((acc) =>
              bankService.updateAccountSettings({
                bankAccountId: acc.id,
                includeInBudget: true,
                importStartDate: startIso,
                reconciliationCompletedAt: nowIso,
                ongoingImportEnabled: true,
              })
            )
        );
      }

      await onComplete({
        fullName: trimmedName,
        incomes: incomes || [],
        fixedExpenses: fixedExpenses || [],
        savingsGoals: finalGoals,
        monthlySavings: finalMonthlySavingsAmount,
        monthlySavingsItems: finalMonthlySavingsItems,
        initialSpent,
        payday,
        paydayBeforeWeekend,
        categories: config.categories,
        country: selectedCountry,
        currency: selectedCurrency,
        currencyCode: selectedCurrencyCode,
      });
    } catch (err: any) {
      console.error('Error during onboarding:', err);
      setError(err?.message || t('error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveExpense = (expense: Omit<FixedExpense, 'id'>) => {
    if (editingExpenseIndex !== null) {
      const newExpenses = [...fixedExpenses];
      newExpenses[editingExpenseIndex] = expense;
      setFixedExpenses(newExpenses);
    } else {
      setFixedExpenses([...fixedExpenses, expense]);
    }
    setIsAddingExpense(false);
    setEditingExpenseIndex(null);
  };

  const removeFixedExpense = (index: number) => {
    setFixedExpenses(fixedExpenses.filter((_, i) => i !== index));
    setEditingExpenseIndex(null);
    setIsAddingExpense(false);
  };

  const handleSaveIncome = (income: Omit<Income, 'id'>) => {
    if (editingIncomeIndex !== null) {
      const newIncomes = [...incomes];
      newIncomes[editingIncomeIndex] = income;
      setIncomes(newIncomes);
    } else {
      setIncomes([...incomes, income]);
    }
    setIsAddingIncome(false);
    setEditingIncomeIndex(null);
  };

  const removeIncome = (index: number) => {
    setIncomes(incomes.filter((_, i) => i !== index));
    setEditingIncomeIndex(null);
    setIsAddingIncome(false);
  };

  const handleAiAddIncome = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = aiIncomePrompt.trim();
    if (!text || isAiParsing) return;

    setIsAiParsing(true);
    setAiFeedback(null);

    try {
      const availableCategories = config.incomeCategories?.map(c => c.name) || ['Lön', 'CSN', 'Barnbidrag', 'Pension', 'Sidoinkomst', 'Övrigt'];
      const parsed = await parseIncomePrompt(text, availableCategories, payday);

      if (parsed.amount <= 0) {
        setAiFeedback({
          message: isEn 
            ? 'Could not detect an amount. E.g. "28 500 from IKEA".' 
            : 'Kunde inte hitta något belopp. Skriv t.ex. "28 500 från IKEA".',
          type: 'error',
        });
        return;
      }

      const newIncome: Omit<Income, 'id'> = {
        name: parsed.name,
        amount: parsed.amount,
        category: parsed.category,
        deductionDay: parsed.deductionDay,
        icon: parsed.icon,
        logo: parsed.logo,
        note: parsed.note,
      };

      setIncomes((prev) => [...prev, newIncome]);
      setAiIncomePrompt('');
      setAiFeedback(null);
    } catch (err: any) {
      console.error('AI parsing error:', err);
      setAiFeedback({
        message: err.message || (isEn ? 'Failed to parse income. Try again.' : 'Kunde inte tolka inkomsten. Försök igen.'),
        type: 'error',
      });
    } finally {
      setIsAiParsing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="light fixed inset-0 z-[100] bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col h-[100dvh] max-h-[100dvh] w-full overflow-hidden overscroll-contain selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]"
        >
          {/* Top Notch / Handle */}
          <div className="pt-[calc(0.5rem+env(safe-area-inset-top))] pb-1 flex justify-center shrink-0">
            <div className="w-12 h-1.5 bg-[var(--border-strong)]/30 rounded-full" />
          </div>

          <div className="p-4 sm:p-6 pb-6 flex-1 overflow-y-auto no-scrollbar flex flex-col">
            <div className="max-w-sm sm:max-w-md mx-auto w-full flex-1 flex flex-col justify-between">
              
              {/* Step Progress Segmented Indicator */}
              <div className="flex items-center gap-1.5 mb-3 sm:mb-4 shrink-0">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((sNum) => (
                  <div 
                    key={sNum} 
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      sNum <= stepNumber ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Header: Area Name */}
              <div className="flex items-center justify-between mb-2 sm:mb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  {step !== 'name' && (
                    <button 
                      onClick={handleBack} 
                      className="w-8 h-8 flex items-center justify-center bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] rounded-[var(--radius-button-sm,10px)] transition-all text-[var(--text-secondary)] border border-[var(--border-color)] shadow-2xs cursor-pointer active:scale-95"
                      aria-label={s.back}
                    >
                      <ChevronLeft size={16} strokeWidth={2} />
                    </button>
                  )}
                  <div className="flex flex-col">
                    <span className="text-label font-bold text-[var(--accent-color)] tracking-wide">
                      {s.stepOf(stepNumber, totalSteps)}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                      {step === 'name' ? s.welcome : 
                       step === 'bank' ? (isEn ? 'Choose setup method' : 'Välj hur du vill börja') :
                       step === 'payday' ? s.paydayTitle :
                       step === 'income' ? s.incomeTitle : 
                       step === 'expenses' ? s.expensesTitle : 
                       step === 'goals' ? s.savingsTitle :
                       step === 'midMonth' ? s.midMonthTitle :
                       s.summaryTitle}
                    </h2>
                  </div>
                </div>

                {/* Exit Onboarding Button */}
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer border border-[var(--border-color)] shadow-2xs active:scale-95 shrink-0"
                  title={s.exitOnboarding}
                  aria-label={s.exitOnboarding}
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              {/* Content Body: Question / Action */}
              <div className="flex-1 flex flex-col justify-start sm:justify-center py-1">
                <AnimatePresence mode="wait">
                  {/* STEP 1: Vad heter du? */}
                  {step === 'name' && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-1">
                        <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight leading-normal">
                          {s.nameQuestion}
                        </h3>
                      </div>

                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={s.firstNamePlaceholder}
                        icon={<User size={18} />}
                        autoComplete="given-name"
                        autoCorrect="off"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && fullName.trim()) handleNext();
                        }}
                      />

                      <div className="pt-4 sm:pt-5 flex flex-col gap-2.5">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowExitConfirm(true)}
                          className="w-full py-2 px-3 min-h-[36px] text-micro-label font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center flex items-center justify-center"
                        >
                          {isEn ? 'Skip onboarding & open Dejz directly' : 'Hoppa över introduktionen & kom igång direkt'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2 (Bank Enabled): Välj Koppla bank vs Sköt allt manuellt + Historikanalys */}
                  {step === 'bank' && isBankIntegrationEnabled && (
                    <motion.div
                      key="bank"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5 my-auto"
                    >
                      {isAnalyzingBankHistory ? (
                        <div className="p-6 rounded-card bg-[var(--surface-color)] border border-[var(--border-color)] text-center space-y-4 shadow-xs">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center mx-auto">
                            <Loader2 size={24} className="animate-spin" />
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                              {isEn ? 'Analyzing your bank history...' : 'Analyserar din bankhistorik bakåt i tiden...'}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed max-w-[280px] mx-auto">
                              {isEn
                                ? 'Identifying recurring fixed expenses, subscriptions, and salary from your transactions.'
                                : 'Vi letar efter återkommande fasta utgifter, abonnemang och lön i dina transaktioner.'}
                            </p>
                          </div>
                        </div>
                      ) : bankAnalysisResult ? (
                        <div className="space-y-4">
                          <div className="text-center space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--success-container)] text-[var(--success-color)] text-[11px] font-bold mb-1">
                              <Check size={12} strokeWidth={2.5} />
                              <span>
                                {isEn
                                  ? 'Bank account connected'
                                  : 'Bankkonto kopplat'}
                              </span>
                            </div>
                            <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight">
                              {isEn
                                ? 'Accept your incomes & fixed expenses'
                                : 'Acceptera dina inkomster & fasta utgifter'}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] font-medium max-w-[320px] mx-auto leading-relaxed">
                              {isEn
                                ? 'We identified these from your bank account. Check the ones that apply to add them directly to your budget.'
                                : 'Vi hittade dessa på ditt kopplade bankkonto. Bocka i de som stämmer så läggs de in direkt under fasta utgifter och inkomster.'}
                            </p>
                          </div>

                          {/* Connected Bank Account Total Balance */}
                          {connectedBankAccounts.filter((a) => a.is_selected).length > 0 && (
                            <div className="p-3 rounded-card bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Building2 size={16} className="text-[var(--accent-color)] shrink-0" />
                                <span className="text-xs font-semibold text-[var(--text-secondary)] truncate">
                                  {isEn ? 'Total on connected bank accounts' : 'Totalt på kopplade bankkonton'}
                                </span>
                              </div>
                              <span className="text-sm font-bold font-amount tabular-nums text-[var(--text-primary)] shrink-0">
                                {formatCurrency(totalConnectedBankBalance, config.currency || 'kr', lang)}
                              </span>
                            </div>
                          )}

                          {/* Summary Card of Detected Items with Checkboxes */}
                          <div className="p-3.5 rounded-card bg-[var(--surface-color)] border border-[var(--border-color)] space-y-3 shadow-2xs">
                            <div className="space-y-1.5 pb-2 border-b border-[var(--border-color)]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[var(--text-secondary)]">
                                  {isEn ? 'Identified incomes' : 'Identifierade inkomster'}
                                </span>
                                <span className="text-[11px] font-bold text-[var(--accent-color)]">
                                  Lönedag: den {bankAnalysisResult.suggestedPayday || payday}:e
                                </span>
                              </div>
                              {bankAnalysisResult.detectedIncomes.length === 0 ? (
                                <p className="text-xs text-[var(--text-secondary)] py-1">
                                  {isEn ? 'No regular salary found automatically.' : 'Ingen återkommande lön hittades automatiskt.'}
                                </p>
                              ) : (
                                bankAnalysisResult.detectedIncomes.map((inc, idx) => {
                                  const checked = selectedSuggestedIncomeIdxs.has(idx);
                                  return (
                                    <label
                                      key={idx}
                                      className="py-1.5 flex items-start justify-between gap-2.5 cursor-pointer select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setSelectedSuggestedIncomeIdxs((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(idx)) next.delete(idx);
                                            else next.add(idx);
                                            return next;
                                          });
                                        }}
                                        className="mt-0.5 rounded border-[var(--border-color)] text-[var(--accent-color)]"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                          {inc.name}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                                          {inc.evidenceSummary || `${inc.category || 'Inkomst'} · den ${inc.deductionDay || 25}:e`}
                                        </p>
                                      </div>
                                      <span className="text-xs font-bold font-amount tabular-nums text-[var(--success-color)] shrink-0">
                                        +{formatCurrency(inc.amount, config.currency || 'kr', lang)}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--text-secondary)]">
                                {isEn ? 'Identified fixed expenses' : 'Identifierade fasta kostnader'}
                              </span>
                              <span className="font-bold font-amount text-[var(--text-primary)]">
                                {selectedSuggestedExpenseIdxs.size} av {bankAnalysisResult.detectedFixedExpenses.length}{' '}
                                {isEn ? 'selected' : 'valda'} (
                                {formatCurrency(
                                  bankAnalysisResult.detectedFixedExpenses
                                    .filter((_, i) => selectedSuggestedExpenseIdxs.has(i))
                                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
                                  config.currency || 'kr',
                                  lang
                                )}
                                /{isEn ? 'mo' : 'mån'})
                              </span>
                            </div>

                            {bankAnalysisResult.detectedFixedExpenses.length > 0 ? (
                              <div className="max-h-[210px] overflow-y-auto divide-y divide-[var(--border-color)]/60 pr-1 [scrollbar-width:thin]">
                                {bankAnalysisResult.detectedFixedExpenses.map((exp, idx) => {
                                  const checked = selectedSuggestedExpenseIdxs.has(idx);
                                  return (
                                    <label
                                      key={idx}
                                      className="py-2 flex items-start justify-between gap-2.5 cursor-pointer select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setSelectedSuggestedExpenseIdxs((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(idx)) next.delete(idx);
                                            else next.add(idx);
                                            return next;
                                          });
                                        }}
                                        className="mt-0.5 rounded border-[var(--border-color)] text-[var(--accent-color)]"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                          {exp.name}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                                          {exp.evidenceSummary ||
                                            `${exp.category} • Hittad ${exp.detectedOccurrences} ggr`}
                                        </p>
                                      </div>
                                      <span className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)] shrink-0">
                                        {formatCurrency(exp.amount, config.currency || 'kr', lang)}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--text-secondary)] py-1">
                                {isEn ? 'No fixed costs detected yet.' : 'Inga fasta kostnader hittades automatiskt.'}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => applySelectedBankSuggestionsAndContinue(false)}
                              className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                            >
                              <span>{isEn ? 'Accept & see your plan' : 'Acceptera & gå vidare'}</span>
                              <ArrowRight size={16} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => applySelectedBankSuggestionsAndContinue(true)}
                              className="w-full py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                              {isEn ? 'Or adjust step by step manually' : 'Eller lägg till / justera fler poster manuellt'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-center pb-1 space-y-1.5">
                            <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight leading-normal">
                              {isEn ? 'Will you connect your bank?' : 'Vill du koppla din bank?'}
                            </h3>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[310px] mx-auto leading-relaxed">
                              {isEn
                                ? 'Choose whether Dejz should analyze your bank history for fixed expenses or if you prefer to set everything up manually.'
                                : 'Hämta konton, saldon och transaktioner från din bank – så analyserar vi bakåt i tiden och föreslår uppgifter som du granskar.'}
                            </p>
                          </div>

                          {bankAnalysisError && (
                            <div className="p-3 rounded-card-nested bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 font-medium">
                              {bankAnalysisError}
                            </div>
                          )}

                          <div className="space-y-3">
                            {/* OPTION 1: KOPPLA BANK (FÖRESLÅR UPPGIFTER SOM DU GRANSKAR) */}
                            <div className="p-4 rounded-card bg-[var(--surface-color)] border-2 border-[var(--accent-color)]/35 shadow-xs space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center shrink-0 mt-0.5">
                                  <Building2 size={20} />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                      {existingConnections.length > 0
                                        ? isEn
                                          ? `Use connected bank (${existingConnections[0].aspsp_name})`
                                          : `Analysera kopplad bank (${existingConnections[0].aspsp_name})`
                                        : isEn
                                          ? 'Connect your bank'
                                          : 'Koppla bank'}
                                    </h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-color)]/12 text-[var(--accent-color)] text-[10px] font-bold">
                                      <Sparkles size={10} />
                                      {isEn ? 'Suggests fixed costs' : 'Föreslår fasta utgifter'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                                    {isEn
                                      ? 'We analyze your historical transactions and suggest items that you review.'
                                      : 'Vi analyserar din historik bakåt i tiden och föreslår uppgifter som du granskar.'}
                                  </p>
                                </div>
                              </div>

                              {existingConnections.length > 0 ? (
                                <div className="space-y-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => runBankHistoryAnalysis()}
                                    disabled={isCheckingBankStatus}
                                    className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3 rounded-btn font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                                  >
                                    <Sparkles size={15} />
                                    <span>
                                      {isEn
                                        ? `Analyze history from ${existingConnections[0].aspsp_name}`
                                        : `Analysera historik från ${existingConnections[0].aspsp_name}`}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveCallbackForModal(null);
                                      setIsBankFlowOpen(true);
                                    }}
                                    className="w-full py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center"
                                  >
                                    {isEn ? 'Or connect another bank' : 'Eller koppla en annan bank'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCallbackForModal(null);
                                    setIsBankFlowOpen(true);
                                  }}
                                  className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3 rounded-btn font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                                >
                                  <Building2 size={15} />
                                  <span>{isEn ? 'Connect bank' : 'Koppla bank'}</span>
                                </button>
                              )}
                            </div>

                            {/* OPTION 2: SKÖT ALLT MANUELLT */}
                            <div className="p-4 rounded-card bg-[var(--surface-color)] border border-[var(--border-color)] space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--surface-muted)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 mt-0.5">
                                  <Edit2 size={18} />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                    {isEn ? 'Manage everything manually' : 'Sköt allt manuellt'}
                                  </h4>
                                  <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                                    {isEn
                                      ? 'Pick your fixed expenses from ready-made templates and enter your income yourself.'
                                      : 'Välj dina fasta utgifter från färdiga mallar och fyll i lönedag och inkomst själv.'}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  clearOnboardingBankDraft();
                                  clearBankRedirectOrigin();
                                  setStep('payday');
                                }}
                                className="w-full py-2.5 rounded-btn bg-[var(--surface-muted)] hover:bg-[var(--border-color)]/50 text-[var(--text-primary)] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer"
                              >
                                {isEn ? 'Continue without bank' : 'Fortsätt utan bank'}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium pt-1">
                            <ShieldCheck size={13} className="text-[var(--accent-color)] shrink-0" />
                            <span>
                              {isEn
                                ? 'Read-only access via Enable Banking (PSD2). You approve everything.'
                                : 'Säker läsåtkomst via Enable Banking (PSD2). Du granskar och godkänner allt.'}
                            </span>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 2/3: När får du lön? */}
                  {step === 'payday' && (
                    <motion.div
                      key="payday"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-1 space-y-1">
                        {bankAnalysisResult?.suggestedPayday && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[11px] font-bold mb-1">
                            <Sparkles size={11} />
                            <span>
                              {isEn
                                ? `Suggested from your bank history: ${bankAnalysisResult.suggestedPayday}th`
                                : `Föreslagen från din bankhistorik: den ${bankAnalysisResult.suggestedPayday}:e`}
                            </span>
                          </div>
                        )}
                        <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight leading-normal">
                          {s.paydayQuestion}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                          {s.paydayDesc}
                        </p>
                      </div>

                      {/* Quick Choices: 25:e, 27:e, 30:e, 1:e & Annan dag */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          {QUICK_PAYDAYS.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setPayday(d);
                                setIsCustomDayActive(false);
                              }}
                              className={`py-3.5 rounded-btn font-bold text-sm sm:text-base transition-all border cursor-pointer active:scale-95 ${
                                payday === d && !isCustomDayActive
                                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-xs scale-[1.02]' 
                                    : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/30'
                              }`}
                            >
                              {isEn ? `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}` : `${d}:e`}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsCustomDayActive(prev => !prev)}
                          className={`w-full py-2.5 rounded-btn-sm text-xs font-bold border transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                            isCustomDayActive || !QUICK_PAYDAYS.includes(payday)
                              ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border-[var(--accent-color)] font-extrabold shadow-2xs'
                              : 'bg-[var(--surface-color)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span>{!QUICK_PAYDAYS.includes(payday) ? `${s.customDay} (${payday}:e)` : s.customDay}</span>
                        </button>

                        {(isCustomDayActive || !QUICK_PAYDAYS.includes(payday)) && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-[var(--surface-color)] rounded-card-nested border border-[var(--border-color)] shadow-xs"
                          >
                            <div className="grid grid-cols-7 gap-1 text-center">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setPayday(d)}
                                  className={`h-8 w-8 mx-auto rounded-full font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                    payday === d
                                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs scale-105'
                                      : 'hover:bg-[var(--surface-muted)] text-[var(--text-primary)]'
                                  }`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* Lön tidigare vid helg toggle */}
                        <div className="pt-3.5 mt-2 border-t border-[var(--border-color)]">
                          <div className="flex items-center justify-between p-1">
                            <div className="flex flex-col pr-4 text-left">
                              <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                                {s.paydayBeforeWeekendTitle}
                              </span>
                              <span className="text-label sm:text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                                {s.paydayBeforeWeekendDesc}
                              </span>
                            </div>
                            <Switch
                              checked={paydayBeforeWeekend}
                              onChange={() => setPaydayBeforeWeekend((prev) => !prev)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 sm:pt-5">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3/4: Månadsinkomst */}
                  {step === 'income' && (
                    <motion.div
                      key="income"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-1 space-y-1">
                        {bankAnalysisResult && bankAnalysisResult.detectedIncomes.length > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[11px] font-bold mb-1">
                            <Sparkles size={11} />
                            <span>
                              {isEn
                                ? 'Pre-filled from your bank history – tap to adjust'
                                : 'Hämtat från din bankhistorik – tryck för att ändra'}
                            </span>
                          </div>
                        )}
                        <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight leading-normal">
                          {s.incomeQuestion}
                        </h3>
                      </div>

                      <div className="space-y-3 max-h-[42vh] overflow-y-auto px-2 -mx-2 py-2 -my-2 no-scrollbar">
                        {/* Direct Natural Language Input */}
                        <SmartInput
                          hideLabel
                          value={aiIncomePrompt}
                          onChange={setAiIncomePrompt}
                          onSubmit={handleAiAddIncome}
                          placeholder={s.aiPlaceholder}
                          isProcessing={isAiParsing}
                          submitText={isEn ? 'Add' : 'Lägg till'}
                          submitVariant="inline"
                          feedback={aiFeedback?.type === 'error' ? aiFeedback : null}
                          inputClassName="h-[46px]"
                        />

                        {/* Incomes List */}
                        {incomes.length > 0 && (
                          <div className="bg-[var(--surface-color)] rounded-card divide-y divide-subtle overflow-hidden">
                            {incomes.map((inc, i) => (
                              <BudgetItem
                                key={i}
                                item={inc}
                                type="income"
                                isGrouped={true}
                                onClick={() => {
                                  setEditingIncomeIndex(i);
                                  setIsAddingIncome(true);
                                }}
                                currency={config.currency}
                                language={(config.language || 'sv') as any}
                                t={t}
                                config={config}
                              />
                            ))}
                          </div>
                        )}

                        {/* Separate Manual Add Button */}
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingIncomeIndex(null);
                            setIsAddingIncome(true);
                          }}
                          className="w-full py-3 rounded-btn text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-1.5 font-semibold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>{s.addIncome}</span>
                        </button>
                      </div>

                      <div className="pt-4 sm:pt-5 flex flex-col gap-2.5">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                        {incomes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setMidMonthSpent('0');
                              setStep('summary');
                            }}
                            className="w-full py-2 px-3 min-h-[36px] text-micro-label font-bold text-[var(--brand-signature,var(--accent-color))] hover:underline transition-all cursor-pointer text-center flex items-center justify-center"
                          >
                            {isEn ? 'Done! Show my plan directly' : 'Klar! Visa vad jag har kvar att spendera'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4/5: Fasta kostnader */}
                  {step === 'expenses' && (
                    <motion.div
                      key="expenses"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5 sm:space-y-6 my-0 sm:my-auto flex flex-col flex-1 pb-0"
                    >
                      <div className="text-center pb-1 space-y-1">
                        <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight leading-normal">
                          {s.expensesQuestion}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[300px] mx-auto leading-relaxed">
                          {bankAnalysisResult && bankAnalysisResult.detectedFixedExpenses.length > 0
                            ? isEn
                              ? 'We pre-filled your fixed expenses from your bank history. Tap any item to edit or remove it, or add more below.'
                              : 'Vi har fyllt i de fasta utgifter vi hittade i din bankhistorik. Tryck på en utgift för att ändra eller ta bort.'
                            : s.expensesDesc}
                        </p>
                      </div>

                      {/* When bank analysis detected expenses, show the user's added fixedExpenses list FIRST at the top so they can review immediately */}
                      {bankAnalysisResult && fixedExpenses.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-color)]">
                              <Sparkles size={13} />
                              {isEn
                                ? `Your fixed expenses (${fixedExpenses.length})`
                                : `Dina fasta utgifter (${fixedExpenses.length} st)`}
                            </span>
                            <span className="text-xs font-bold font-amount text-[var(--text-primary)]">
                              {formatCurrency(totalFixed, config.currency || 'kr', lang)}/{isEn ? 'mo' : 'mån'}
                            </span>
                          </div>
                          <div className="bg-[var(--surface-color)] rounded-card divide-y divide-subtle overflow-hidden border border-[var(--border-color)]">
                            {fixedExpenses.map((exp, i) => (
                              <BudgetItem
                                key={i}
                                item={exp}
                                type="expense"
                                isGrouped={true}
                                onClick={() => {
                                  setEditingExpenseIndex(i);
                                  setIsAddingExpense(true);
                                }}
                                currency={config.currency}
                                language={(config.language || 'sv') as any}
                                t={t}
                                config={config}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Search Bar */}
                      <div className="space-y-2">
                        {bankAnalysisResult && fixedExpenses.length > 0 && (
                          <p className="text-xs font-semibold text-[var(--text-secondary)] px-1">
                            {isEn ? 'Missing anything? Add from templates or create custom:' : 'Saknas något? Sök bland mallar eller lägg till egen:'}
                          </p>
                        )}
                        <Input
                          variant="search"
                          type="text"
                          value={presetSearch}
                          onChange={(e) => setPresetSearch(e.target.value)}
                          onClear={() => setPresetSearch('')}
                          placeholder={s.searchPresetsPlaceholder}
                        />
                      </div>

                      {/* Presets Grid: Scrollable box showing ~6 cards at a time, scrollable for all 30 */}
                      <div className="max-h-[196px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
                        {presetSearch.trim() && filteredPresets.length === 0 ? (
                          <div className="p-3 text-center bg-[var(--surface-color)] rounded-card-nested border border-[var(--border-color)]">
                            <p className="text-xs text-[var(--text-secondary)] font-medium">
                              {s.noPresetsFound}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 p-1.5">
                            {(presetSearch.trim() ? filteredPresets : popularPresets).map((preset) => {
                              const isAdded = fixedExpenses.some(
                                e => e.name.trim().toLowerCase() === preset.name.trim().toLowerCase()
                              );
                              const presetLogo = getLogoUrl(preset.name, preset.category);
                              const mockTx = {
                                id: preset.id,
                                amount: preset.defaultAmount,
                                merchant: preset.name,
                                category: preset.category,
                                type: 'expense' as const,
                                logo: presetLogo,
                                timestamp: Date.now(),
                              };
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handleTogglePreset(preset)}
                                  className={`p-2.5 rounded-card-nested flex items-center justify-between gap-2 text-left transition-all cursor-pointer border relative min-h-[54px] ${
                                    isAdded 
                                      ? 'bg-[var(--success-container)] border-[var(--success-color)] shadow-2xs' 
                                      : 'bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border-[var(--border-color)] shadow-2xs'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                                      <TransactionLogo transaction={mockTx} config={config} size="sm" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold leading-tight break-words text-[var(--text-primary)]">
                                        {preset.name}
                                      </p>
                                      <p className="text-secondary font-amount font-semibold mt-0.5 text-[var(--text-secondary)]">
                                        {formatCurrency(preset.defaultAmount, config.currency || 'kr', lang)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                    isAdded ? 'bg-white text-[var(--success-color)] border border-[var(--success-color)]/30 shadow-2xs' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                                  }`}>
                                    {isAdded ? <Check size={11} strokeWidth={2.5} className="text-[var(--success-color)]" /> : <Plus size={11} />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Added Fixed Expenses List (when in manual mode without bankAnalysisResult) */}
                      {!bankAnalysisResult && fixedExpenses.length > 0 && (
                        <div className="bg-[var(--surface-color)] rounded-card divide-y divide-subtle overflow-hidden">
                          {fixedExpenses.map((exp, i) => (
                            <BudgetItem
                              key={i}
                              item={exp}
                              type="expense"
                              isGrouped={true}
                              onClick={() => {
                                setEditingExpenseIndex(i);
                                setIsAddingExpense(true);
                              }}
                              currency={config.currency}
                              language={(config.language || 'sv') as any}
                              t={t}
                              config={config}
                            />
                          ))}
                        </div>
                      )}

                      {/* Create Custom Expense Button */}
                      <div>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingExpenseIndex(null);
                            setIsAddingExpense(true);
                          }}
                          className="w-full py-3 rounded-btn text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-1.5 font-semibold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>{s.customExpense}</span>
                        </button>
                      </div>

                      {/* Generous bottom spacing clearance so the last expense and custom button can be scrolled completely above the fixed Next button */}
                      <div className="h-36 sm:h-32 shrink-0" aria-hidden="true" />

                      {/* Fixed Next Button docked to the very bottom */}
                      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-color)]/95 backdrop-blur-md border-t border-[var(--border-color)]/60 px-4 sm:px-6 pt-3.5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] shadow-modal">
                        {/* Subtle upward gradient fade */}
                        <div className="absolute -top-5 left-0 right-0 h-5 bg-gradient-to-t from-[var(--bg-color)] to-transparent pointer-events-none" />

                        <div className="max-w-sm sm:max-w-md mx-auto w-full flex flex-col gap-2.5">
                          <button 
                            onClick={handleNext}
                            className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-subtle hover:opacity-95"
                          >
                            <span>{s.next}</span>
                            <ArrowRight size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMidMonthSpent('0');
                              setStep('summary');
                            }}
                            className="w-full py-1.5 px-3 min-h-[32px] text-micro-label font-bold text-[var(--brand-signature,var(--accent-color))] hover:underline transition-all cursor-pointer text-center flex items-center justify-center"
                          >
                            {isEn ? 'Done! Show my plan directly' : 'Klar! Visa vad jag har kvar att spendera'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5/6: Månadssparande */}
                  {step === 'goals' && (
                    <motion.div
                      key="goals"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-1">
                        <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight leading-normal">
                          {s.savingsQuestion}
                        </h3>
                      </div>

                      {/* Main Amount Input for Monthly Savings */}
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type="number"
                            value={monthlySavingsInput}
                            onChange={(e) => handleSavingsChange(e.target.value)}
                            placeholder="0"
                            className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-input px-4 py-3.5 pr-14 text-center text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-tertiary)]"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)] pointer-events-none">
                            {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {SAVINGS_PRESETS.map((amount) => {
                            const isSelected = Number(monthlySavingsInput) === amount;
                            return (
                              <button
                                key={amount}
                                type="button"
                                onClick={() => handleSavingsChange(amount.toString())}
                                className={`py-2 rounded-[var(--radius-button-sm,10px)] text-xs font-bold font-amount tabular-nums transition-all border cursor-pointer active:scale-95 ${
                                  isSelected
                                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-2xs'
                                    : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/40'
                                }`}
                              >
                                {amount === 0 ? formatCurrency(0, config.currency || 'kr', lang) : formatAmount(amount, lang)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-4 sm:pt-5 flex flex-col gap-2.5">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMidMonthSpent('0');
                            setStep('summary');
                          }}
                          className="w-full py-2 px-3 min-h-[36px] flex items-center justify-center text-micro-label font-bold text-[var(--brand-signature,var(--accent-color))] hover:underline transition-all cursor-pointer text-center"
                        >
                          {isEn ? 'Done! Show my plan directly' : 'Klar! Visa vad jag har kvar att spendera'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 6/7: Dynamisk start i perioden */}
                  {step === 'midMonth' && (
                    <motion.div
                      key="midMonth"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      {(() => {
                        const content = getStep6DynamicContent(daysSincePayday, isEn);
                        return (
                          <>
                            <div className="text-center pb-1 space-y-1.5">
                              {bankAnalysisResult && bankAnalysisResult.calculatedSpentSincePayday > 0 && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[11px] font-bold mb-1">
                                  <Sparkles size={11} />
                                  <span>
                                    {isEn
                                      ? 'Calculated from your bank purchases since payday (excluding fixed costs)'
                                      : 'Beräknat från dina övriga köp sedan lön (exklusive fasta utgifter)'}
                                  </span>
                                </div>
                              )}
                              {/* Kombinerad huvudrubrik */}
                              <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight max-w-[360px] mx-auto leading-snug">
                                {content.headline}
                              </h3>
                            </div>

                            {/* Enkelt beloppsfält med sekundär hjälptext */}
                            <div className="space-y-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={midMonthSpent}
                                  onChange={(e) => setMidMonthSpent(e.target.value)}
                                  placeholder="0"
                                  className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-input px-4 py-3.5 pr-14 text-center text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-tertiary)]"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)] pointer-events-none">
                                  {config.currency || 'kr'}
                                </span>
                              </div>
                              <p className="text-center text-xs text-[var(--text-secondary)] font-medium">
                                {content.helpText}
                              </p>
                            </div>

                            <div className="pt-4 sm:pt-5">
                              <button 
                                onClick={handleNext}
                                className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                              >
                                <span>{s.next}</span>
                                <ArrowRight size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* STEP 7/8: Din plan */}
                  {step === 'summary' && (
                    <motion.div
                      key="summary"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5 sm:space-y-6 my-auto text-center"
                    >
                      <div className="text-center pb-1 space-y-1">
                        <h3 className="text-section-title sm:text-lg font-display text-[var(--text-primary)] tracking-tight leading-normal">
                          {s.summaryQuestion}
                        </h3>
                        <p className="text-xs font-medium text-[var(--text-secondary)]">
                          {s.untilPayday(nextPaydayFormatted)}
                        </p>
                      </div>

                      {/* Clean Breakdown Card: Inkomst − fasta kostnader − månadssparande − spenderat hittills = kvar denna perioden */}
                      <div className="p-4 rounded-card bg-[var(--surface-color)] border border-[var(--border-color)] space-y-2.5 text-left">
                        {/* Income */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            {s.incomeLabel}
                          </span>
                          <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                            {formatAmount(totalIncome, lang)} {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Fixed Expenses */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            {s.fixedCostsLabel}
                          </span>
                          <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                            −{formatAmount(totalFixed, lang)} {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Monthly Savings */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            {s.savingsLabel}
                          </span>
                          <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                            −{formatAmount(totalMonthlySavings, lang)} {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Spenderat hittills denna period */}
                        {initialSpentAmount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                              {bankAnalysisResult
                                ? (isEn ? 'Purchases this period (from bank)' : 'Köp denna period (från bank)')
                                : s.spentSoFarLabel}
                            </span>
                            <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                              −{formatAmount(initialSpentAmount, lang)} {config.currency || 'kr'}
                            </span>
                          </div>
                        )}

                        <div className="h-px bg-[var(--border-divider)] my-1" />

                        {/* Kvar denna perioden */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {isEn ? 'Remaining this period' : 'Kvar denna perioden'}
                          </span>
                          <span className="text-base font-extrabold font-amount text-[var(--text-primary)] tabular-nums">
                            {formatAmount(calculatedLeftToUse, lang)} {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Totalt på kopplade bankkonton */}
                        {connectedBankAccounts.filter((a) => a.is_selected).length > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-divider)]">
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              {isEn ? 'Total on connected bank accounts' : 'Totalt på kopplade bankkonton'}
                            </span>
                            <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                              {formatAmount(totalConnectedBankBalance, lang)} {config.currency || 'kr'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick optional monthly savings selector if fast-tracked via bank */}
                      {hasBankFastTrack && (
                        <div className="p-3.5 rounded-card bg-[var(--surface-color)] border border-[var(--border-color)] text-left space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {isEn ? 'Monthly savings (optional)' : 'Månadssparande (valfritt)'}
                            </span>
                            <span className="text-xs font-bold font-amount text-[var(--accent-color)]">
                              {formatCurrency(totalMonthlySavings, config.currency || 'kr', lang)}/{isEn ? 'mo' : 'mån'}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {SAVINGS_PRESETS.map((amount) => {
                              const isSelected = Number(monthlySavingsInput) === amount;
                              return (
                                <button
                                  key={amount}
                                  type="button"
                                  onClick={() => handleSavingsChange(amount.toString())}
                                  className={`py-1.5 rounded-[var(--radius-button-sm,10px)] text-xs font-bold font-amount tabular-nums transition-all border cursor-pointer active:scale-95 ${
                                    isSelected
                                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-2xs'
                                      : 'bg-[var(--surface-muted)] text-[var(--text-primary)] border-[var(--border-color)]'
                                  }`}
                                >
                                  {amount === 0 ? '0 kr' : formatAmount(amount, lang)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="p-2.5 bg-[var(--surface-color)] rounded-card-nested text-[var(--text-secondary)] text-xs text-center font-medium">
                          {error}
                        </div>
                      )}

                      <div className="pt-2">
                        <button 
                          onClick={() => handleSave()}
                          disabled={isUpdating}
                          className="w-full bg-[var(--accent-color)] hover:opacity-95 text-[var(--text-on-accent)] py-3.5 rounded-btn font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdating ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <span>{s.openDejz}</span>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          {/* Support Modals */}
          <AnimatePresence>
            {isAddingIncome && (
              <IncomeModal
                income={editingIncomeIndex !== null ? { ...incomes[editingIncomeIndex], id: 'temp-id' } as any : null}
                currentPeriodId={currentPeriodId}
                onClose={() => {
                  setIsAddingIncome(false);
                  setEditingIncomeIndex(null);
                }}
                onSave={handleSaveIncome}
                onDelete={editingIncomeIndex !== null ? () => removeIncome(editingIncomeIndex) : undefined}
                t={t}
                currency={config.currency}
                categories={config.incomeCategories || []}
                userId={userId}
                isPro={isPro}
                paymentMethods={paymentMethods}
                initialDeductionDay={payday}
              />
            )}

            {isAddingExpense && (
              <FixedExpenseModal
                expense={editingExpenseIndex !== null ? { ...fixedExpenses[editingExpenseIndex], id: 'temp-id', note: undefined, timestamp: Date.now(), type: 'expense' } as any : null}
                currentPeriodId={currentPeriodId}
                onClose={() => {
                  setIsAddingExpense(false);
                  setEditingExpenseIndex(null);
                }}
                onSave={handleSaveExpense}
                onDelete={editingExpenseIndex !== null ? () => removeFixedExpense(editingExpenseIndex) : undefined}
                t={t}
                currency={config.currency}
                categories={config.categories}
                userId={userId}
                isPro={isPro}
                paymentMethods={paymentMethods}
                config={config}
                hideStatus={true}
              />
            )}
          </AnimatePresence>

          {/* Bank Connection Modal for Onboarding */}
          {isBankIntegrationEnabled && (
            <BankConnectFlowModal
              isOpen={isBankFlowOpen}
              onClose={() => {
                setIsBankFlowOpen(false);
                setActiveCallbackForModal(null);
              }}
              originContext="onboarding"
              returnStep="bank"
              onBeforeRedirect={persistCurrentOnboardingDraft}
              initialCallbackData={activeCallbackForModal}
              language={lang}
              onCompleted={(accounts) => {
                setConnectedBankAccounts(accounts);
                setIsBankFlowOpen(false);
                setActiveCallbackForModal(null);
                clearOnboardingBankDraft();
                clearBankRedirectOrigin();
                runBankHistoryAnalysis(accounts);
              }}
              onSkipOrContinueWithoutBank={() => {
                setIsBankFlowOpen(false);
                setActiveCallbackForModal(null);
                clearOnboardingBankDraft();
                clearBankRedirectOrigin();
                setStep('payday');
              }}
            />
          )}

          {/* Exit / Skip Confirmation Modal */}
          {showExitConfirm && (
            <Modal
              isOpen={showExitConfirm}
              onClose={() => setShowExitConfirm(false)}
              center
              size="sm"
              title={s.skipOnboardingTitle}
              showCloseButton={true}
              bodyClassName="p-6 space-y-4"
            >
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                {s.skipOnboardingDesc}
              </p>
              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setShowExitConfirm(false);
                    try {
                      sessionStorage.setItem('dejz_onboarding_dismissed', 'true');
                      if (userId) {
                        localStorage.setItem(`dejz_onboarding_skipped_${userId}`, 'true');
                        localStorage.setItem(`dejz_onboarding_completed_${userId}`, 'true');
                      }
                      localStorage.setItem('dejz_onboarding_completed', 'true');
                      localStorage.setItem('dejz_onboarding_skipped', 'true');
                    } catch (_storageErr) {
                      // ignore localStorage errors
                    }
                    if (onClose) {
                      onClose();
                    } else {
                      onComplete({
                        fullName: fullName.trim() || 'Användare',
                        incomes: [],
                        fixedExpenses: [],
                        savingsGoals: [],
                        initialSpent: 0,
                        payday: payday || 25,
                        paydayBeforeWeekend,
                      });
                    }
                  }}
                >
                  {s.skipAndEnter}
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowExitConfirm(false)}
                >
                  {s.continueOnboarding}
                </Button>
              </div>
            </Modal>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
