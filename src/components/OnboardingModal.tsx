import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Loader2, Plus, ChevronLeft, Check, Sparkles, Search, X, PiggyBank, ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { Config, Frequency, Category } from '../types';
import { formatAmount } from '../utils/format';
import { FixedExpenseModal, IncomeModal } from './BudgetModals';
import { useScrollLock } from '../hooks/useScrollLock';
import { FixedExpense, Income, SavingsGoal } from '../types';
import { BudgetItem } from './BudgetItem';
import { TransactionLogo } from './TransactionLogo';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../data/swedishExpensePresets';
import { OnboardingCharacterArt } from './OnboardingCharacterArt';
import { parseIncomePrompt } from '../utils/incomeAiParser';

export type Step = 'name' | 'payday' | 'income' | 'expenses' | 'goals' | 'midMonth' | 'summary';

export const AGE_OPTIONS = [
  { id: '<18', labelSv: 'Under 18 år', labelEn: 'Under 18', isYoung: true },
  { id: '18-25', labelSv: '18–25 år', labelEn: '18–25', isYoung: true },
  { id: '26-35', labelSv: '26–35 år', labelEn: '26–35', isYoung: false },
  { id: '36-50', labelSv: '36–50 år', labelEn: '36–50', isYoung: false },
  { id: '51+', labelSv: '51+ år', labelEn: '51+', isYoung: false },
];

const texts = {
  sv: {
    stepOf: (step: number, total: number) => `Steg ${step} av ${total}`,
    
    // Step 1
    welcome: 'Välkommen till Dejz',
    nameQuestion: 'Vad heter du?',
    firstNamePlaceholder: 'Ditt förnamn',
    
    // Step 2
    paydayTitle: 'Din lönedag',
    paydayQuestion: 'När får du lön?',
    paydayDesc: 'Det avgör din ekonomiska period.',
    customDay: 'Annan dag',
    everyMonth: ':e varje månad',
    
    // Step 3
    incomeTitle: 'Månadsinkomst',
    incomeQuestion: 'Vilka inkomster har du varje månad?',
    incomeDesc: 'Lägg till dina återkommande inkomster.',
    aiHelper: 'Skriv som du vill – Dejz ordnar resten.',
    aiPlaceholder: 'T.ex. 25 000 från Ur & Penn',
    addIncome: 'Lägg till inkomst manuellt',
    
    // Step 4
    expensesTitle: 'Fasta kostnader',
    expensesQuestion: 'Vilka fasta kostnader har du?',
    expensesDesc: 'Lägg till dina återkommande kostnader.',
    searchPresetsPlaceholder: 'Sök fast kostnad',
    customExpense: 'Skapa egen utgift',
    noPresetsFound: 'Ingen färdig mall hittades. Skapa en egen nedan.',
    
    // Step 5
    savingsTitle: 'Månadssparande',
    savingsQuestion: 'Hur mycket vill du spara varje månad?',
    savingsDesc: 'Vi räknar bort det innan vi visar vad du har kvar att använda.',
    
    // Step 6
    midMonthTitle: 'Kvar till nästa lön',
    midMonthDaysBadge: (days: number, payday: number) => `${days} ${days === 1 ? 'dag kvar' : 'dagar kvar'} till den ${payday}:e`,
    midMonthQuestion: 'Hur mycket har du kvar till nästa lön?',
    estimatedLabel: 'Beräknat:',
    useEstimatedAction: 'Använd',
    dailyRateText: (daily: string) => `≈ ${daily} kr per dag`,
    
    // Step 7
    summaryTitle: 'Din plan',
    summaryQuestion: 'Din plan är klar',
    untilPayday: (date: string) => `Fram till nästa lön den ${date}`,
    incomeLabel: 'Inkomst',
    fixedCostsLabel: 'Fasta kostnader',
    savingsLabel: 'Månadssparande',
    freeSpendLabel: 'Kvar att använda',
    openDejz: 'Öppna Dejz',
    
    next: 'Nästa',
    back: 'Tillbaka',
  },
  en: {
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    
    // Step 1
    welcome: 'Welcome to Dejz',
    nameQuestion: 'What is your name?',
    firstNamePlaceholder: 'Your first name',
    
    // Step 2
    paydayTitle: 'Your Payday',
    paydayQuestion: 'When do you get paid?',
    paydayDesc: 'This determines your financial period.',
    customDay: 'Other day',
    everyMonth: 'th of every month',
    
    // Step 3
    incomeTitle: 'Monthly Income',
    incomeQuestion: 'What recurring income do you have each month?',
    incomeDesc: 'Add your recurring income.',
    aiHelper: 'Write as you want – Dejz handles the rest.',
    aiPlaceholder: 'E.g. 25 000 from Ur & Penn',
    addIncome: 'Add income manually',
    
    // Step 4
    expensesTitle: 'Fixed Expenses',
    expensesQuestion: 'What fixed expenses do you have?',
    expensesDesc: 'Add your recurring expenses.',
    searchPresetsPlaceholder: 'Search fixed cost',
    customExpense: 'Create custom expense',
    noPresetsFound: 'No template found. Create a custom one below.',
    
    // Step 5
    savingsTitle: 'Monthly Savings',
    savingsQuestion: 'How much do you want to save each month?',
    savingsDesc: 'We deduct it before showing what you have available to spend.',
    
    // Step 6
    midMonthTitle: 'Remaining to Payday',
    midMonthDaysBadge: (days: number, payday: number) => `${days} ${days === 1 ? 'day left' : 'days left'} until the ${payday}th`,
    midMonthQuestion: 'How much do you have left until next payday?',
    estimatedLabel: 'Estimated:',
    useEstimatedAction: 'Use',
    dailyRateText: (daily: string) => `≈ ${daily} per day`,
    
    // Step 7
    summaryTitle: 'Your Plan',
    summaryQuestion: 'Your plan is ready',
    untilPayday: (date: string) => `Until next payday on ${date}`,
    incomeLabel: 'Income',
    fixedCostsLabel: 'Fixed Expenses',
    savingsLabel: 'Monthly Savings',
    freeSpendLabel: 'Available to spend',
    openDejz: 'Open Dejz',
    
    next: 'Next',
    back: 'Back',
  }
};

const QUICK_PAYDAYS = [25, 27, 30, 1];
const SAVINGS_PRESETS = [0, 1000, 2000, 3000, 5000];

interface OnboardingModalProps {
  isOpen: boolean;
  config: Config;
  userId?: string;
  isPro: boolean;
  onComplete: (data: {
    fullName: string;
    incomes: { amount: number; name: string; icon?: string; logo?: string; deductionDay?: number }[];
    fixedExpenses: Omit<FixedExpense, 'id'>[];
    savingsGoals: { title: string; targetAmount: number; icon?: string; logo?: string; deadline?: string }[];
    initialSpent: number;
    payday: number;
    userAgeGroup?: string;
    userGender?: string;
    categories?: Category[];
  }) => Promise<void> | void;
  t: (key: TranslationKey) => string;
  currentPeriodId: string;
}

export function OnboardingModal({ isOpen, config, userId, isPro, onComplete, t, currentPeriodId }: OnboardingModalProps) {
  useScrollLock(isOpen);
  const isEn = config.language === 'en' || t('today') === 'Today';
  const lang = isEn ? 'en' : 'sv';
  const s = texts[lang];

  const [step, setStep] = useState<Step>('name');
  const [fullName, setFullName] = useState('');
  const [payday, setPayday] = useState(25);
  const [isCustomDayActive, setIsCustomDayActive] = useState(false);
  const [midMonthSpent, setMidMonthSpent] = useState<string>('');
  
  // Lists State
  const [incomes, setIncomes] = useState<Omit<Income, 'id'>[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<Omit<FixedExpense, 'id'>[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'priority'>[]>([]);
  const [monthlySavingsInput, setMonthlySavingsInput] = useState<string>('0');

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
      const newExpense: Omit<FixedExpense, 'id'> = {
        name: preset.name,
        amount: preset.defaultAmount,
        category: preset.category,
        frequency: Frequency.MONTHLY,
        deductionDay: preset.deductionDay,
        paymentMethod: preset.paymentMethod,
      };
      setFixedExpenses([...fixedExpenses, newExpense]);
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

  const popularPresets = useMemo(() => {
    const topIds = [
      'hyra-bostad',
      'spotify-individual',
      'netflix-standard',
      'elavtal',
      'mobilabonnemang',
      'sl-manadskort'
    ];
    return topIds
      .map(id => SWEDISH_EXPENSE_PRESETS.find(p => p.id === id))
      .filter((p): p is SwedishExpensePreset => p !== undefined);
  }, []);

  const stepNumber = 
    step === 'name' ? 1 : 
    step === 'payday' ? 2 : 
    step === 'income' ? 3 : 
    step === 'expenses' ? 4 : 
    step === 'goals' ? 5 : 
    step === 'midMonth' ? 6 : 7;
  const totalSteps = 7;

  // Financial Metrics: Inkomst - Fasta kostnader - Månadssparande = Kvar att använda
  const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalFixed = fixedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  
  const totalMonthlySavings = useMemo(() => {
    if (savingsGoals.length > 0) {
      return savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
    }
    return Math.max(0, Number(monthlySavingsInput) || 0);
  }, [savingsGoals, monthlySavingsInput]);

  // Exact economic calculation for the monthly plan (Source of Truth)
  const calculatedLeftToUse = totalIncome - totalFixed - totalMonthlySavings;
  const monthlyDisposablePot = Math.max(0, calculatedLeftToUse);

  const daysUntilPayday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let targetDate = new Date(currentYear, currentMonth, payday);
    if (currentDay >= payday) {
      targetDate = new Date(currentYear, currentMonth + 1, payday);
    }
    const diffMs = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [payday]);

  const nextPaydayFormatted = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let targetDate = new Date(currentYear, currentMonth, payday);
    if (currentDay >= payday) {
      targetDate = new Date(currentYear, currentMonth + 1, payday);
    }
    const monthNamesSv = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mName = isEn ? monthNamesEn[targetDate.getMonth()] : monthNamesSv[targetDate.getMonth()];
    return isEn ? `${targetDate.getDate()} ${mName}` : `${payday}:e ${mName}`;
  }, [payday, isEn]);

  // For Step 6 mid-month input and daily rate calculation
  const activeAmountForRemainingDays = midMonthSpent.trim() !== '' ? Math.max(0, Number(midMonthSpent) || 0) : monthlyDisposablePot;
  const dailyRate = Math.round(activeAmountForRemainingDays / daysUntilPayday);

  const handleNext = () => {
    if (step === 'name') {
      if (!fullName.trim()) return;
      setStep('payday');
    } else if (step === 'payday') {
      setStep('income');
    } else if (step === 'income') {
      if (incomes.length === 0) return;
      setStep('expenses');
    } else if (step === 'expenses') {
      setStep('goals');
    } else if (step === 'goals') {
      setStep('midMonth');
    } else if (step === 'midMonth') {
      setStep('summary');
    }
  };

  const handleBack = () => {
    if (step === 'payday') setStep('name');
    else if (step === 'income') setStep('payday');
    else if (step === 'expenses') setStep('income');
    else if (step === 'goals') setStep('expenses');
    else if (step === 'midMonth') setStep('goals');
    else if (step === 'summary') setStep('midMonth');
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
      const trimmedName = fullName.trim();
      if (trimmedName) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: trimmedName }
          });
        } catch (authErr) {
          console.warn('Could not update user full_name in auth:', authErr);
        }
      }

      let initialSpent = 0;
      if (forceInitialSpent !== undefined) {
        initialSpent = forceInitialSpent;
      } else if (midMonthSpent.trim() !== '') {
        const targetAmount = Math.max(0, Number(midMonthSpent) || 0);
        const pot = Math.max(0, totalIncome - totalFixed - totalMonthlySavings);
        initialSpent = Math.max(0, pot - targetAmount);
      }

      const finalGoals = savingsGoals.length > 0 
        ? savingsGoals 
        : (Number(monthlySavingsInput) > 0 ? [{
            title: s.savingsTitle,
            targetAmount: Number(monthlySavingsInput),
            icon: 'PiggyBank',
          }] : []);

      await onComplete({
        fullName: trimmedName,
        incomes: incomes || [],
        fixedExpenses: fixedExpenses || [],
        savingsGoals: finalGoals,
        initialSpent,
        payday,
        categories: config.categories,
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
            ? 'Could not detect an amount. E.g. "25 000 from Ur & Penn".' 
            : 'Kunde inte hitta något belopp. Skriv t.ex. "25 000 från Ur & Penn".',
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
      setAiFeedback({
        message: isEn
          ? `Added ${formatAmount(parsed.amount, config.language)} ${config.currency || 'kr'} from ${parsed.name}! ✨`
          : `Lade till ${formatAmount(parsed.amount, config.language)} kr från ${parsed.name}! ✨`,
        type: 'success',
      });

      setTimeout(() => {
        setAiFeedback(null);
      }, 4000);
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
          className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col h-[100dvh] max-h-[100dvh] w-full overflow-hidden overscroll-contain selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]"
        >
          {/* Top Notch / Handle */}
          <div className="pt-[calc(0.5rem+env(safe-area-inset-top))] pb-1 flex justify-center shrink-0">
            <div className="w-12 h-1.5 bg-[var(--border-strong)]/30 rounded-full" />
          </div>

          <div className="p-4 sm:p-6 pb-6 flex-1 overflow-y-auto no-scrollbar flex flex-col">
            <div className="max-w-sm sm:max-w-md mx-auto w-full flex-1 flex flex-col justify-between">
              
              {/* Step Progress Segmented Indicator: Exactly 7 Steps */}
              <div className="flex items-center gap-1.5 mb-3 sm:mb-4 shrink-0">
                {[1, 2, 3, 4, 5, 6, 7].map((sNum) => (
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
                      className="w-8 h-8 flex items-center justify-center bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] rounded-[12px] transition-all text-[var(--text-secondary)] border border-[var(--border-color)] shadow-2xs cursor-pointer active:scale-95"
                      aria-label={s.back}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[10.5px] font-bold text-[var(--accent-color)] tracking-wide uppercase">
                      {s.stepOf(stepNumber, totalSteps)}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                      {step === 'name' ? s.welcome : 
                       step === 'payday' ? s.paydayTitle :
                       step === 'income' ? s.incomeTitle : 
                       step === 'expenses' ? s.expensesTitle : 
                       step === 'goals' ? s.savingsTitle :
                       step === 'midMonth' ? s.midMonthTitle :
                       s.summaryTitle}
                    </h2>
                  </div>
                </div>
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
                      <div className="text-center pb-2 sm:pb-2.5">
                        <OnboardingCharacterArt step="name" />
                        <div className="mt-5 sm:mt-6 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {s.nameQuestion}
                          </h3>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[18px] px-4 py-3.5 pl-11 text-base font-semibold text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-tertiary)]"
                          placeholder={s.firstNamePlaceholder}
                          autoComplete="given-name"
                          autoCorrect="off"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && fullName.trim()) handleNext();
                          }}
                        />
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={handleNext}
                          disabled={!fullName.trim()}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-xs hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: När får du lön? */}
                  {step === 'payday' && (
                    <motion.div
                      key="payday"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-2 sm:pb-2.5">
                        <OnboardingCharacterArt step="payday" payday={payday} />
                        <div className="mt-5 sm:mt-6 space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {s.paydayQuestion}
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.paydayDesc}
                          </p>
                        </div>
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
                              className={`py-3.5 rounded-[16px] font-bold text-sm sm:text-base transition-all border cursor-pointer active:scale-95 ${
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
                          className={`w-full py-2.5 rounded-[14px] text-xs font-bold border transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
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
                            className="p-3 bg-[var(--surface-color)] rounded-[18px] border border-[var(--border-color)] shadow-xs"
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
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Månadsinkomst */}
                  {step === 'income' && (
                    <motion.div
                      key="income"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-2 sm:pb-2.5">
                        <OnboardingCharacterArt step="income" />
                        <div className="mt-5 sm:mt-6 space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {s.incomeQuestion}
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.incomeDesc}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[36vh] overflow-y-auto pr-0.5 no-scrollbar">
                        {/* Direct, clean AI Natural Language Input Area */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 px-0.5">
                            <Sparkles size={13} className="text-[var(--accent-color)] shrink-0" />
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              {s.aiHelper}
                            </span>
                          </div>

                          <form onSubmit={handleAiAddIncome} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={aiIncomePrompt}
                                onChange={(e) => setAiIncomePrompt(e.target.value)}
                                placeholder={s.aiPlaceholder}
                                disabled={isAiParsing}
                                className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[16px] px-3.5 py-3 text-xs sm:text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 outline-none transition-all pr-8 shadow-2xs"
                              />
                              {aiIncomePrompt && !isAiParsing && (
                                <button
                                  type="button"
                                  onClick={() => setAiIncomePrompt('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={!aiIncomePrompt.trim() || isAiParsing}
                              className="h-[46px] px-4 rounded-[16px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-xs sm:text-sm flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 shrink-0"
                            >
                              {isAiParsing ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <span>{isEn ? 'Add' : 'Lägg till'}</span>
                              )}
                            </button>
                          </form>

                          {aiFeedback && (
                            <p className={`text-[11px] font-medium px-1 flex items-center gap-1 transition-all ${
                              aiFeedback.type === 'success' ? 'text-neutral-800 dark:text-white' : 'text-rose-500'
                            }`}>
                              {aiFeedback.type === 'success' ? <Check size={12} strokeWidth={2.5} /> : null}
                              <span>{aiFeedback.message}</span>
                            </p>
                          )}
                        </div>

                        {/* Incomes List */}
                        {incomes.map((inc, i) => (
                          <BudgetItem
                            key={i}
                            item={inc}
                            type="income"
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

                        {/* Separate Manual Add Button */}
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingIncomeIndex(null);
                            setIsAddingIncome(true);
                          }}
                          className="w-full py-2.5 border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-1.5 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>{s.addIncome}</span>
                        </button>
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={handleNext}
                          disabled={incomes.length === 0}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: Fasta kostnader */}
                  {step === 'expenses' && (
                    <motion.div
                      key="expenses"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-0 sm:my-auto flex flex-col flex-1 pb-0"
                    >
                      <div className="text-center pb-2 sm:pb-2.5">
                        <OnboardingCharacterArt step="expenses" />
                        <div className="mt-5 sm:mt-6 space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {s.expensesQuestion}
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.expensesDesc}
                          </p>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
                          <Search size={15} />
                        </div>
                        <input
                          type="text"
                          value={presetSearch}
                          onChange={(e) => setPresetSearch(e.target.value)}
                          placeholder={s.searchPresetsPlaceholder}
                          className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[14px] px-3.5 py-2 pl-9 pr-8 text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-color)] outline-none shadow-2xs transition-all"
                        />
                        {presetSearch && (
                          <button
                            type="button"
                            onClick={() => setPresetSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-full cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Presets Grid: 2 Columns for high readability, no text truncation */}
                      {presetSearch.trim() && filteredPresets.length === 0 ? (
                        <div className="p-3 text-center bg-[var(--surface-color)] rounded-[14px] border border-[var(--border-color)]">
                          <p className="text-xs text-[var(--text-secondary)] font-medium">
                            {s.noPresetsFound}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 p-0.5">
                          {(presetSearch.trim() ? filteredPresets : popularPresets).map((preset) => {
                            const isAdded = fixedExpenses.some(
                              e => e.name.trim().toLowerCase() === preset.name.trim().toLowerCase()
                            );
                            const mockTx = {
                              id: preset.id,
                              amount: preset.defaultAmount,
                              merchant: preset.name,
                              category: preset.category,
                              type: 'expense' as const,
                              timestamp: Date.now(),
                            };
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleTogglePreset(preset)}
                                className={`p-2.5 rounded-[16px] flex items-center justify-between gap-2 text-left transition-all cursor-pointer border relative min-h-[54px] ${
                                  isAdded 
                                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-2xs' 
                                    : 'bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border-[var(--border-color)] shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                                    <TransactionLogo transaction={mockTx} config={config} size="sm" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold leading-tight break-words">
                                      {preset.name}
                                    </p>
                                    <p className={`text-[10.5px] font-amount font-semibold mt-0.5 ${
                                      isAdded ? 'text-white/90' : 'text-[var(--text-secondary)]'
                                    }`}>
                                      {formatAmount(preset.defaultAmount, lang)} kr
                                    </p>
                                  </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                  isAdded ? 'bg-white text-[var(--accent-color)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                                }`}>
                                  {isAdded ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Added Fixed Expenses List - Natural height without internal scroll */}
                      {fixedExpenses.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]/60">
                          {fixedExpenses.map((exp, i) => (
                            <BudgetItem
                              key={i}
                              item={exp}
                              type="expense"
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
                          className="w-full py-2.5 border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-1.5 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>{s.customExpense}</span>
                        </button>
                      </div>

                      {/* Bottom spacing clearance so the last expense and custom button can be scrolled completely above the sticky Next button */}
                      <div className="h-6 sm:h-2 shrink-0" aria-hidden="true" />

                      {/* Sticky Next Button at bottom on mobile */}
                      <div className="sticky bottom-0 -mx-4 px-4 sm:-mx-0 sm:px-0 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/95 to-transparent z-20 shrink-0 mt-auto">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5: Månadssparande */}
                  {step === 'goals' && (
                    <motion.div
                      key="goals"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-2 sm:pb-2.5">
                        <OnboardingCharacterArt step="goals" />
                        <div className="mt-5 sm:mt-6 space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {s.savingsQuestion}
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[300px] mx-auto leading-relaxed">
                            {s.savingsDesc}
                          </p>
                        </div>
                      </div>

                      {/* Main Amount Input for Monthly Savings */}
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type="number"
                            value={monthlySavingsInput}
                            onChange={(e) => handleSavingsChange(e.target.value)}
                            placeholder="0"
                            className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[20px] px-4 py-3.5 pr-14 text-center text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-tertiary)]"
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
                                className={`py-2 rounded-[12px] text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                                  isSelected
                                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-2xs'
                                    : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/40'
                                }`}
                              >
                                {amount === 0 ? (isEn ? '0' : '0 kr') : `${amount / 1000}k`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 6: Kvar till nästa lön */}
                  {step === 'midMonth' && (
                    <motion.div
                      key="midMonth"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6 sm:space-y-7 my-auto"
                    >
                      <div className="text-center pb-2 sm:pb-2.5">
                        <OnboardingCharacterArt step="midMonth" days={daysUntilPayday} payday={payday} />
                        <div className="mt-5 sm:mt-6 space-y-1 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[11px] font-bold">
                            {s.midMonthDaysBadge(daysUntilPayday, payday)}
                          </span>
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {s.midMonthQuestion}
                          </h3>
                        </div>
                      </div>

                      {/* Main Remaining Amount Input */}
                      <div className="space-y-2.5">
                        <div className="relative">
                          <input
                            type="number"
                            value={midMonthSpent}
                            onChange={(e) => setMidMonthSpent(e.target.value)}
                            placeholder={monthlyDisposablePot > 0 ? monthlyDisposablePot.toString() : '0'}
                            className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[20px] px-4 py-3.5 pr-14 text-center text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-tertiary)]"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)] pointer-events-none">
                            {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Estimated Amount Indicator & "Använd" Action */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[14px] text-xs">
                          <span className="text-[var(--text-secondary)] font-medium">
                            {s.estimatedLabel} <strong className="text-[var(--text-primary)] font-amount font-bold">{formatAmount(monthlyDisposablePot, lang)} {config.currency || 'kr'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setMidMonthSpent(monthlyDisposablePot.toString())}
                            className="text-xs font-bold text-[var(--accent-color)] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>→ {s.useEstimatedAction}</span>
                          </button>
                        </div>

                        {/* Simplified Daily Rate: ≈ 2 872 kr per dag */}
                        {activeAmountForRemainingDays > 0 && (
                          <div className="text-center pt-0.5">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">
                              {s.dailyRateText(formatAmount(dailyRate, lang))}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                        >
                          <span>{s.next}</span>
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 7: Din plan */}
                  {step === 'summary' && (
                    <motion.div
                      key="summary"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6 sm:space-y-7 my-auto text-center"
                    >
                      <div className="text-center pb-2 sm:pb-2.5">
                        <OnboardingCharacterArt step="summary" />
                        <div className="mt-5 sm:mt-6 space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {s.summaryQuestion}
                          </h3>
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            {s.untilPayday(nextPaydayFormatted)}
                          </p>
                        </div>
                      </div>

                      {/* Clean Breakdown Card: No '+' on income, minus on expenses and savings */}
                      <div className="p-4 rounded-[22px] bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs space-y-2.5 text-left">
                        {/* Income */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                            <ArrowUpRight size={14} className="text-emerald-500" />
                            {s.incomeLabel}
                          </span>
                          <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                            {formatAmount(totalIncome, lang)} {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Fixed Expenses */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                            <ArrowDownRight size={14} className="text-rose-500" />
                            {s.fixedCostsLabel}
                          </span>
                          <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                            −{formatAmount(totalFixed, lang)} {config.currency || 'kr'}
                          </span>
                        </div>

                        {/* Monthly Savings */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                            <PiggyBank size={14} className="text-amber-500" />
                            {s.savingsLabel}
                          </span>
                          <span className="text-sm font-bold font-amount text-[var(--text-primary)] tabular-nums">
                            −{formatAmount(totalMonthlySavings, lang)} {config.currency || 'kr'}
                          </span>
                        </div>

                        <div className="h-px bg-[var(--border-color)] my-1" />

                        {/* Kvar att använda */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {s.freeSpendLabel}
                          </span>
                          <span className="text-base font-extrabold font-amount text-[var(--accent-color)] tabular-nums">
                            {formatAmount(calculatedLeftToUse, lang)} {config.currency || 'kr'}
                          </span>
                        </div>
                      </div>

                      {error && (
                        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="pt-1">
                        <button 
                          onClick={() => handleSave()}
                          disabled={isUpdating}
                          className="w-full bg-[var(--accent-color)] hover:opacity-95 text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
                        >
                          {isUpdating ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <span>{s.openDejz}</span>
                              <ShieldCheck size={16} />
                            </>
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
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
