import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Loader2, Wallet, CreditCard, Target, Plus, ChevronLeft, Check, Sparkles, TrendingUp, ShieldCheck, Search, X, Zap } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { Config, Frequency } from '../types';
import { formatAmount } from '../utils/format';
import { FixedExpenseModal, IncomeModal } from './BudgetModals';
import { SavingsGoalModal } from './SavingsGoalModal';
import { ICON_MAP, isEmojiString } from '../utils/icons';
import { useScrollLock } from '../hooks/useScrollLock';
import { FixedExpense, Income, SavingsGoal } from '../types';
import { BudgetItem } from './BudgetItem';
import { TransactionLogo } from './TransactionLogo';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../data/swedishExpensePresets';
import { OnboardingCharacterArt } from './OnboardingCharacterArt';

type Step = 'name' | 'payday' | 'income' | 'expenses' | 'goals' | 'midMonth' | 'summary';

const texts = {
  sv: {
    stepOf: (step: number, total: number) => `Steg ${step} av ${total}`,
    welcome: 'Välkommen till Dejz',
    paydayTitle: 'Din lönedag',
    skip: 'Hoppa över',
    nameQuestion: 'Vad heter du?',
    nameDesc: 'Vi anpassar Dejz personligt efter dig och din ekonomi.',
    firstNamePlaceholder: 'Ditt förnamn',
    paydayQuestion: 'När får du lön?',
    paydayDesc: 'Dejz använder detta för att automatiskt beräkna dina budgetperioder.',
    customDate: 'Eller välj ett anpassat datum',
    everyMonth: ':e varje månad',
    next: 'Nästa',
    finish: 'Slutför',
    back: 'Tillbaka',
    monthlyIncome: 'Månadsinkomst',
    fixedExpenses: 'Fasta kostnader',
    savingsGoals: 'Sparmål',
    incomeDesc: 'Lägg till dina återkommande inkomster som lön, CSN, barnbidrag eller sidoinkomster.',
    expensesDesc: 'Lägg till dina fasta kostnader som hyra, el, försäkring och abonnemang.',
    goalsDesc: 'Sätt upp sparmål för framtiden så hjälper Dejz dig att spara smart.',
    addIncome: 'Lägg till inkomst',
    addExpense: 'Lägg till fast utgift',
    addGoal: 'Lägg till sparmål',
    midMonthTitle: (days: number) => days === 1 ? 'Det är 1 dag kvar till lön! 🗓️' : `Det är ${days} dagar kvar till lön! 🗓️`,
    midMonthQuestion: (payday: number) => `Hur mycket vill du ha att röra dig med fram till den ${payday}:e?`,
    midMonthDesc: (days: number, payday: number) => days === 1 
      ? `Eftersom lönen kommer redan imorgon den ${payday}:e sätter vi en pott för idag. Imorgon nollställs allt automatiskt med din nya månadslön!`
      : `Eftersom det är ${days} dagar kvar till lön den ${payday}:e sätter vi en startpott för dessa dagar. På lönedagen nollställs allt automatiskt med din fulla månadspott.`,
    midMonthPlaceholder: 'T.ex. 8000',
    fullPotOption: 'Hela potten',
    halfPotOption: 'Hälften',
    thirdPotOption: 'En tredjedel',
    dailyRatePreview: (daily: string, days: number) => days === 1
      ? `👉 Ger dig ca ${daily} kr för idag fram till lönen imorgon`
      : `👉 Ger dig ca ${daily} kr / dag fram till lön (${days} dagar kvar)`,
    skipMidMonth: 'Hoppa över (Använd full månadspott)',
    summaryTitle: 'Din personliga plan',
    summarySubtitle: 'Allt är redo! Här är din ekonomiska överblick fram till nästa lön.',
    enterApp: 'Kliv in i Dejz ✨',
    totalIncomeLabel: 'Total inkomst',
    fixedCostsLabel: 'Fasta kostnader',
    freeSpendLabel: 'Kvar att röra dig med',
    activeGoalsLabel: 'Sparmål',
    popularPresets: 'Populära i Sverige',
    searchPresetsPlaceholder: 'Sök bland 100+ utgifter (Spotify, Hyra, Gym...)',
    quickAdd: 'Snabblägg',
    skipStep: 'Hoppa över / Fyll i senare',
    customExpense: 'Skapa egen utgift',
    noPresetsFound: 'Ingen färdig mall hittades. Klicka nedan för att skapa en egen.',
  },
  en: {
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    welcome: 'Welcome to Dejz',
    paydayTitle: 'Your Payday',
    skip: 'Skip',
    nameQuestion: 'What is your name?',
    nameDesc: 'We customize Dejz personally for you and your finances.',
    firstNamePlaceholder: 'Your first name',
    paydayQuestion: 'When do you get paid?',
    paydayDesc: 'Dejz uses this to automatically calculate your budget periods.',
    customDate: 'Or choose a custom date',
    everyMonth: 'th of every month',
    next: 'Next',
    finish: 'Finish',
    back: 'Back',
    monthlyIncome: 'Monthly Income',
    fixedExpenses: 'Fixed Expenses',
    savingsGoals: 'Savings Goals',
    incomeDesc: 'Add your recurring income such as salary, student aid, child support or side hustles.',
    expensesDesc: 'Add your fixed expenses like rent, utilities, insurance and subscriptions.',
    goalsDesc: 'Set up savings goals for the future, and Dejz will help you save smart.',
    addIncome: 'Add income',
    addExpense: 'Add fixed expense',
    addGoal: 'Add savings goal',
    midMonthTitle: (days: number) => days === 1 ? '1 day left until payday! 🗓️' : `${days} days left until payday! 🗓️`,
    midMonthQuestion: (payday: number) => `How much do you want available to spend until the ${payday}th?`,
    midMonthDesc: (days: number, payday: number) => days === 1
      ? `Since payday is already tomorrow on the ${payday}th, we set a budget for today. Tomorrow everything resets automatically with your new monthly budget!`
      : `Since there are ${days} days left until payday on the ${payday}th, we set a starting budget for these days. On payday, everything resets automatically with your full monthly budget.`,
    midMonthPlaceholder: 'E.g. 8000',
    fullPotOption: 'Full monthly pot',
    halfPotOption: 'Half pot',
    thirdPotOption: 'One third',
    dailyRatePreview: (daily: string, days: number) => days === 1
      ? `👉 Gives you approx ${daily} for today until payday tomorrow`
      : `👉 Gives you approx ${daily} / day until payday (${days} days left)`,
    skipMidMonth: 'Skip (Start with full monthly pot)',
    summaryTitle: 'Your Personal Plan',
    summarySubtitle: 'All set! Here is your financial overview until your next payday.',
    enterApp: 'Enter Dejz ✨',
    totalIncomeLabel: 'Total Income',
    fixedCostsLabel: 'Fixed Costs',
    freeSpendLabel: 'Available to spend',
    activeGoalsLabel: 'Savings Goals',
    popularPresets: 'Popular in Sweden',
    searchPresetsPlaceholder: 'Search 100+ expenses (Spotify, Rent, Gym...)',
    quickAdd: 'Quick Add',
    skipStep: 'Skip / Fill in later',
    customExpense: 'Create custom expense',
    noPresetsFound: 'No template found. Click below to create a custom one.',
  }
};

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
  }) => Promise<void> | void;
  t: (key: TranslationKey) => string;
  currentPeriodId: string;
}

type Step = 'name' | 'payday' | 'income' | 'expenses' | 'goals' | 'midMonth' | 'summary';

export function OnboardingModal({ isOpen, config, userId, isPro, onComplete, t, currentPeriodId }: OnboardingModalProps) {
  useScrollLock(isOpen);
  const isEn = config.language === 'en' || t('today') === 'Today';
  const lang = isEn ? 'en' : 'sv';
  const s = texts[lang];

  const [step, setStep] = useState<Step>('name');
  const [fullName, setFullName] = useState('');
  const [payday, setPayday] = useState(25);
  const [midMonthSpent, setMidMonthSpent] = useState<string>('');
  
  // Lists State
  const [incomes, setIncomes] = useState<Omit<Income, 'id'>[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<Omit<FixedExpense, 'id'>[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'priority'>[]>([]);

  // Modal State
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [editingIncomeIndex, setEditingIncomeIndex] = useState<number | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState<number | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);

  // Quick Preset Search State
  const [presetSearch, setPresetSearch] = useState('');

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
    return SWEDISH_EXPENSE_PRESETS.filter(p => p.popular);
  }, []);

  const handleNext = () => {
    if (step === 'name') setStep('payday');
    else if (step === 'payday') setStep('income');
    else if (step === 'income') setStep('expenses');
    else if (step === 'expenses') setStep('goals');
    else if (step === 'goals') setStep('midMonth');
    else if (step === 'midMonth') setStep('summary');
  };

  const handleBack = () => {
    if (step === 'payday') setStep('name');
    else if (step === 'income') setStep('payday');
    else if (step === 'expenses') setStep('income');
    else if (step === 'goals') setStep('expenses');
    else if (step === 'midMonth') setStep('goals');
    else if (step === 'summary') setStep('midMonth');
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
        const pot = Math.max(0, totalIncome - totalFixed);
        initialSpent = Math.max(0, pot - targetAmount);
      }

      await onComplete({
        fullName: trimmedName,
        incomes: incomes || [],
        fixedExpenses: fixedExpenses || [],
        savingsGoals: savingsGoals || [],
        initialSpent,
        payday
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

  const handleSaveGoal = (goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'priority'>) => {
    if (editingGoalIndex !== null) {
      const newGoals = [...savingsGoals];
      newGoals[editingGoalIndex] = goal;
      setSavingsGoals(newGoals);
    } else {
      setSavingsGoals([...savingsGoals, goal]);
    }
    setIsAddingGoal(false);
    setEditingGoalIndex(null);
  };

  const removeGoal = (index: number) => {
    setSavingsGoals(savingsGoals.filter((_, i) => i !== index));
    setEditingGoalIndex(null);
    setIsAddingGoal(false);
  };

  const stepNumber = 
    step === 'name' ? 1 : 
    step === 'payday' ? 2 : 
    step === 'income' ? 3 : 
    step === 'expenses' ? 4 : 
    step === 'goals' ? 5 : 
    step === 'midMonth' ? 6 : 7;
  const totalSteps = 7;

  // Summary Metrics & Days Calculation
  const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalFixed = fixedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const monthlyDisposablePot = Math.max(0, totalIncome - totalFixed);

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

  const userTargetNum = midMonthSpent.trim() !== '' ? Math.max(0, Number(midMonthSpent) || 0) : null;
  const effectiveRemaining = userTargetNum !== null ? userTargetNum : monthlyDisposablePot;
  const dailyRate = Math.round(effectiveRemaining / daysUntilPayday);
  const freeSpend = effectiveRemaining;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none overscroll-contain selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]"
        >
          <div className="max-w-md mx-auto w-full h-full flex flex-col px-4 sm:px-6 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-[calc(0.85rem+env(safe-area-inset-bottom))] overflow-hidden">
            
            {/* Top Notch / Handle */}
            <div className="flex justify-center pb-2 shrink-0">
              <div className="w-12 h-1.5 bg-[var(--border-strong)]/30 rounded-full" />
            </div>

            {/* Step Progress Segmented Indicator */}
            <div className="flex items-center gap-1.5 mb-3 shrink-0">
              {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    s <= stepNumber ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                {step !== 'name' && (
                  <button 
                    onClick={handleBack} 
                    className="w-8 h-8 flex items-center justify-center bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] rounded-[11px] transition-all text-[var(--text-secondary)] border border-[var(--border-color)] shadow-2xs cursor-pointer active:scale-95"
                    aria-label={s.back}
                  >
                    <ChevronLeft size={17} />
                  </button>
                )}
                <div className="flex flex-col">
                  <span className="text-[10.5px] font-bold text-[var(--accent-color)] tracking-wide uppercase">
                    {s.stepOf(stepNumber, totalSteps)}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
                    {step === 'name' ? s.welcome : 
                     step === 'payday' ? s.paydayTitle :
                     step === 'income' ? s.monthlyIncome : 
                     step === 'expenses' ? s.fixedExpenses : 
                     step === 'goals' ? s.savingsGoals :
                     step === 'midMonth' ? s.midMonthTitle :
                     s.summaryTitle}
                  </h2>
                </div>
              </div>
              
              <div />
            </div>

            {/* Step Content Area */}
            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
              <AnimatePresence mode="wait">
                {step === 'name' && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col min-h-0 justify-between"
                  >
                    {/* Pinned Static Hero Header */}
                    <div className="space-y-2 text-center shrink-0 pt-2 mb-3">
                      <OnboardingCharacterArt step="name" size="md" />
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.nameQuestion}</h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                          {s.nameDesc}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable / Input Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5 no-scrollbar flex flex-col justify-center">
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && fullName.trim()) {
                              handleNext();
                            }
                          }}
                          className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[18px] px-4 py-3.5 pl-11 text-[16px] sm:text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/40"
                          placeholder={s.firstNamePlaceholder}
                          autoComplete="given-name"
                          autoCorrect="off"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Pinned Static Footer */}
                    <div className="shrink-0 pt-3 mt-auto">
                      <button 
                        onClick={handleNext}
                        disabled={!fullName.trim()}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'payday' && (
                  <motion.div
                    key="payday"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col min-h-0"
                  >
                    {/* Pinned Static Hero Header */}
                    <div className="space-y-1.5 text-center shrink-0 pt-1 mb-2">
                      <OnboardingCharacterArt step="payday" payday={payday} size="sm" />
                      <div className="space-y-0.5">
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.paydayQuestion}</h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                          {s.paydayDesc}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5 no-scrollbar">
                      <div className="grid grid-cols-4 gap-2">
                        {[25, 27, 30, 1].map((d) => (
                          <button
                            key={d}
                            onClick={() => setPayday(d)}
                            className={`py-3 rounded-[16px] font-bold text-sm sm:text-base transition-all border cursor-pointer ${
                              payday === d 
                                ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-xs scale-[1.02]' 
                                : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/30'
                            }`}
                          >
                            {isEn ? `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}` : `${d}:e`}
                          </button>
                        ))}
                      </div>
                      
                      <div className="bg-[var(--surface-color)] p-3.5 sm:p-4 rounded-[20px] border border-[var(--border-color)] shadow-xs text-center space-y-2">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">{s.customDate}</p>
                        
                        <div className="flex justify-center items-baseline gap-1">
                          <motion.span 
                            key={payday}
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl sm:text-4xl font-bold font-amount text-[var(--accent-color)] tracking-tighter tabular-nums"
                          >
                            {payday}
                          </motion.span>
                          <span className="text-sm sm:text-base font-bold text-[var(--accent-color)]/60">
                            {isEn ? (payday === 1 ? 'st of every month' : payday === 2 ? 'nd of every month' : payday === 3 ? 'rd of every month' : 'th of every month') : ':e varje månad'}
                          </span>
                        </div>

                        <div className="px-2 pt-1">
                          <input 
                            type="range" 
                            min="1" 
                            max="31" 
                            value={payday} 
                            onChange={(e) => setPayday(parseInt(e.target.value))}
                            className="w-full h-2 bg-[var(--surface-muted)] rounded-full appearance-none cursor-pointer accent-[var(--accent-color)] border border-[var(--border-color)]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pinned Static Footer */}
                    <div className="shrink-0 pt-3 mt-auto">
                      <button 
                        onClick={handleNext}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'income' && (
                  <motion.div
                    key="income"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col min-h-0"
                  >
                    {/* Pinned Static Hero Header */}
                    <div className="space-y-1 text-center shrink-0 pt-0.5 mb-2.5">
                      <OnboardingCharacterArt step="income" size="sm" />
                      <div className="space-y-0.5">
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.monthlyIncome}</h3>
                        <p className="text-xs text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                          {s.incomeDesc}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable Items List - only this area scrolls when adding many items */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 no-scrollbar overscroll-contain">
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

                      <button 
                        onClick={() => {
                          setEditingIncomeIndex(null);
                          setIsAddingIncome(true);
                        }}
                        className="w-full py-3.5 border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-[18px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-2 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>{s.addIncome}</span>
                      </button>
                    </div>

                    {/* Pinned Static Footer */}
                    <div className="shrink-0 pt-3 mt-auto space-y-2">
                      <button 
                        onClick={handleNext}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-0.5 transition-colors cursor-pointer"
                      >
                        {s.skipStep}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'expenses' && (
                  <motion.div
                    key="expenses"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col min-h-0"
                  >
                    {/* Pinned Static Hero Header */}
                    <div className="space-y-1 text-center shrink-0 pt-0.5 mb-2">
                      <OnboardingCharacterArt step="expenses" size="sm" />
                      <div className="space-y-0.5">
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.fixedExpenses}</h3>
                        <p className="text-xs text-[var(--text-secondary)] font-medium max-w-[320px] mx-auto leading-relaxed">
                          {s.expensesDesc}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 no-scrollbar overscroll-contain">
                      {/* Preset Search Bar */}
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                          <Search size={16} />
                        </div>
                        <input
                          type="text"
                          value={presetSearch}
                          onChange={(e) => setPresetSearch(e.target.value)}
                          placeholder={s.searchPresetsPlaceholder}
                          className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[16px] px-3.5 py-2.5 pl-9 pr-9 text-[15px] sm:text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--accent-color)] outline-none shadow-2xs transition-all"
                        />
                        {presetSearch && (
                          <button
                            type="button"
                            onClick={() => setPresetSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-full cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Search Results OR Popular Quick-Add Grid */}
                      {presetSearch.trim() ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)] px-1">
                            <span>Sökresultat ({filteredPresets.length})</span>
                            <span className="text-[10px] opacity-70">Klicka för att välja</span>
                          </div>
                          <div className="space-y-1.5">
                            {filteredPresets.length > 0 ? (
                              filteredPresets.map((preset) => {
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
                                    className={`w-full p-2.5 rounded-[16px] flex items-center justify-between gap-3 text-left transition-all cursor-pointer border ${
                                      isAdded 
                                        ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-xs ring-2 ring-[var(--accent-color)]/20' 
                                        : 'bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border-[var(--border-color)] shadow-2xs'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                                        <TransactionLogo transaction={mockTx} config={config} size="sm" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-[13px] font-bold truncate">{preset.name}</p>
                                          <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-medium ${
                                            isAdded ? 'bg-white/20 text-white' : 'bg-[var(--chip-bg)] text-[var(--text-secondary)]'
                                          }`}>
                                            {preset.category}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[12px] font-bold font-amount tabular-nums">
                                        {formatAmount(preset.defaultAmount, lang)} {config.currency}
                                      </span>
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                        isAdded ? 'bg-white text-[var(--accent-color)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-color)]/40'
                                      }`}>
                                        {isAdded ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-4 text-center bg-[var(--surface-color)] rounded-[16px] border border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-secondary)] font-medium">
                                  {s.noPresetsFound}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)] px-1">
                            <div className="flex items-center gap-1.5">
                              <Zap size={12} className="text-amber-500" />
                              <span>{s.popularPresets} ({popularPresets.length} st)</span>
                            </div>
                            <span className="text-[10px] opacity-70 font-normal">Klicka för att välja</span>
                          </div>

                          {/* Quick Popular Presets Visual Box Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {popularPresets.map((preset) => {
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
                                <motion.button
                                  key={preset.id}
                                  type="button"
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => handleTogglePreset(preset)}
                                  className={`p-2.5 rounded-[18px] flex flex-col justify-between items-start text-left transition-all cursor-pointer border relative overflow-hidden group ${
                                    isAdded 
                                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-xs ring-2 ring-[var(--accent-color)]/20' 
                                      : 'bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border-[var(--border-color)] shadow-2xs'
                                  }`}
                                >
                                  {/* Top bar with Logo & Checkmark/Plus */}
                                  <div className="w-full flex items-center justify-between gap-1.5 mb-2">
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                                      <TransactionLogo transaction={mockTx} config={config} size="sm" />
                                    </div>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                      isAdded ? 'bg-white text-[var(--accent-color)] shadow-xs' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-color)]/40'
                                    }`}>
                                      {isAdded ? <Check size={12} strokeWidth={3} /> : <Plus size={11} />}
                                    </div>
                                  </div>

                                  {/* Title & Price */}
                                  <div className="w-full min-w-0">
                                    <p className="text-[12.5px] font-bold truncate leading-tight tracking-tight">
                                      {preset.name}
                                    </p>
                                    <p className={`text-[11px] font-amount font-bold mt-0.5 ${
                                      isAdded ? 'text-white/90' : 'text-[var(--text-secondary)]'
                                    }`}>
                                      {formatAmount(preset.defaultAmount, lang)} <span className="text-[9.5px] font-sans font-normal opacity-80">{config.currency}</span>
                                    </p>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Added Fixed Expenses List */}
                      <div className="space-y-2 pt-1 border-t border-[var(--border-color)]/60">
                        <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[var(--text-secondary)]">
                          <span>Dina valda utgifter ({fixedExpenses.length} st)</span>
                          <span className="font-amount font-bold text-[var(--text-primary)]">
                            {formatAmount(fixedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), lang)} {config.currency}/mån
                          </span>
                        </div>

                        <div className="space-y-1.5">
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
                      </div>
                    </div>

                    {/* Pinned Static Footer */}
                    <div className="shrink-0 pt-3 mt-auto space-y-2">
                      <button 
                        onClick={handleNext}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-0.5 transition-colors cursor-pointer"
                      >
                        {s.skipStep}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'goals' && (
                  <motion.div
                    key="goals"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col min-h-0"
                  >
                    {/* Pinned Static Hero Header */}
                    <div className="space-y-1 text-center shrink-0 pt-0.5 mb-2.5">
                      <OnboardingCharacterArt step="goals" size="sm" />
                      <div className="space-y-0.5">
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.savingsGoals}</h3>
                        <p className="text-xs text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                          {s.goalsDesc}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable Goals List */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 no-scrollbar overscroll-contain">
                      {savingsGoals.map((goal, i) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            setEditingGoalIndex(i);
                            setIsAddingGoal(true);
                          }}
                          className="px-[14px] py-[10px] min-h-[60px] rounded-[16px] bg-[var(--transaction-bg)] shadow-xs border border-[var(--border-color)] hover:bg-[var(--surface-muted)] flex items-center justify-between gap-[12px] group transition-all duration-200 cursor-pointer active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-[12px] min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-[13px] bg-[var(--accent-color)]/10 flex items-center justify-center overflow-hidden shrink-0 border border-[var(--accent-color)]/20">
                              {goal.logo ? (
                                <img src={goal.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="text-base">
                                  {isEmojiString(goal.icon || 'target') ? goal.icon : (
                                    (() => {
                                      const Icon = ICON_MAP[goal.icon || 'target'] || Target;
                                      return <Icon size={17} className="text-[var(--accent-color)]" />;
                                    })()
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                              <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight group-hover:text-[var(--accent-color)] transition-colors">
                                {goal.title}
                              </p>
                              {goal.deadline && (
                                <p className="text-[11.5px] font-medium text-[var(--text-secondary)] opacity-75 leading-tight mt-0.5">
                                  {goal.deadline}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <p className="font-bold text-[14px] text-[var(--text-primary)] whitespace-nowrap font-amount">
                              {formatAmount(goal.targetAmount.toString())} {config.currency}
                            </p>
                          </div>
                        </div>
                      ))}

                      <button 
                        onClick={() => {
                          setEditingGoalIndex(null);
                          setIsAddingGoal(true);
                        }}
                        className="w-full py-3.5 border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-[18px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-2 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>{s.addGoal}</span>
                      </button>
                    </div>

                    {error && (
                      <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold shrink-0 mb-2">
                        {error}
                      </div>
                    )}

                    {/* Pinned Static Footer */}
                    <div className="shrink-0 pt-3 mt-auto space-y-2">
                      <button 
                        onClick={handleNext}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 px-4 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-0.5 transition-colors cursor-pointer"
                      >
                        {s.skipStep}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'midMonth' && (
                  <motion.div
                    key="midMonth"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col min-h-0"
                  >
                    {/* Pinned Static Hero Header */}
                    <div className="space-y-1.5 text-center shrink-0 pt-0.5 mb-2">
                      <OnboardingCharacterArt step="midMonth" days={daysUntilPayday} payday={payday} size="sm" />
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20">
                          <span>{typeof s.midMonthTitle === 'function' ? s.midMonthTitle(daysUntilPayday) : s.midMonthTitle}</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                          {typeof s.midMonthQuestion === 'function' ? s.midMonthQuestion(payday) : s.midMonthQuestion}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] font-medium max-w-[340px] mx-auto leading-relaxed">
                          {typeof s.midMonthDesc === 'function' ? s.midMonthDesc(daysUntilPayday, payday) : s.midMonthDesc}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5 no-scrollbar">
                      {/* Main Target Amount Input */}
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={midMonthSpent}
                            onChange={(e) => setMidMonthSpent(e.target.value)}
                            className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[18px] px-4 py-3 pr-14 text-center text-xl sm:text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/30"
                            placeholder={monthlyDisposablePot > 0 ? monthlyDisposablePot.toString() : s.midMonthPlaceholder}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)] pointer-events-none">
                            {config.currency}
                          </span>
                        </div>

                        {/* Live Daily Budget Preview Pill */}
                        {effectiveRemaining > 0 && (
                          <div className="p-2.5 bg-[var(--surface-muted)] rounded-[15px] border border-[var(--border-color)]/50 text-center">
                            <p className="text-xs font-bold text-[var(--text-primary)]">
                              {typeof s.dailyRatePreview === 'function' 
                                ? s.dailyRatePreview(formatAmount(dailyRate, lang), daysUntilPayday) 
                                : `${dailyRate} kr/dag`}
                            </p>
                          </div>
                        )}

                        {/* 1-Click Quick Preset Buttons */}
                        {monthlyDisposablePot > 0 && (
                          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setMidMonthSpent(monthlyDisposablePot.toString())}
                              className={`p-2 rounded-[12px] text-center border transition-all cursor-pointer ${
                                midMonthSpent === monthlyDisposablePot.toString()
                                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] font-bold shadow-2xs'
                                  : 'bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border-[var(--border-color)] text-xs font-semibold'
                              }`}
                            >
                              <span className="block text-[10px] opacity-75 font-normal">{s.fullPotOption}</span>
                              <span className="text-[11px] font-bold font-amount">{formatAmount(monthlyDisposablePot, lang)}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setMidMonthSpent(Math.round(monthlyDisposablePot * 0.5).toString())}
                              className={`p-2 rounded-[12px] text-center border transition-all cursor-pointer ${
                                midMonthSpent === Math.round(monthlyDisposablePot * 0.5).toString()
                                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] font-bold shadow-2xs'
                                  : 'bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border-[var(--border-color)] text-xs font-semibold'
                              }`}
                            >
                              <span className="block text-[10px] opacity-75 font-normal">{s.halfPotOption}</span>
                              <span className="text-[11px] font-bold font-amount">{formatAmount(Math.round(monthlyDisposablePot * 0.5), lang)}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setMidMonthSpent(Math.round(monthlyDisposablePot * 0.33).toString())}
                              className={`p-2 rounded-[12px] text-center border transition-all cursor-pointer ${
                                midMonthSpent === Math.round(monthlyDisposablePot * 0.33).toString()
                                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] font-bold shadow-2xs'
                                  : 'bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border-[var(--border-color)] text-xs font-semibold'
                              }`}
                            >
                              <span className="block text-[10px] opacity-75 font-normal">{s.thirdPotOption}</span>
                              <span className="text-[11px] font-bold font-amount">{formatAmount(Math.round(monthlyDisposablePot * 0.33), lang)}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {error && (
                      <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold shrink-0 mb-2">
                        {error}
                      </div>
                    )}

                    {/* Pinned Static Footer */}
                    <div className="shrink-0 pt-3 mt-auto space-y-2">
                      <button 
                        onClick={handleNext}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 px-4 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMidMonthSpent('');
                          handleNext();
                        }}
                        className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-0.5 transition-colors cursor-pointer"
                      >
                        {s.skipMidMonth}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'summary' && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col min-h-0 text-center"
                  >
                    {/* Pinned Static Hero Header */}
                    <div className="shrink-0 pt-0.5 mb-2">
                      <OnboardingCharacterArt step="summary" size="sm" />
                    </div>

                    {/* Scrollable Summary Breakdown */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5 no-scrollbar">
                      {/* Summary Speech Intro Card */}
                      <div className="relative bg-[var(--surface-color)] p-3.5 rounded-[18px] border border-[var(--border-color)] shadow-xs text-left">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-color)] mb-1">
                          <Sparkles size={14} />
                          <span>{isEn ? 'Your Plan is Ready' : 'Din plan är klar'}</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                          {fullName.trim() ? `Snyggt jobbat, ${fullName.trim()}!` : 'Snyggt jobbat!'} Din personliga ekonomiska profil är nu klar. Jag har räknat ut din period fram till nästa lön den <strong className="text-[var(--accent-color)]">{payday}:e</strong>.
                        </p>
                      </div>

                      {/* Financial Profile Summary Cards */}
                      <div className="grid grid-cols-2 gap-2 text-left">
                        <div className="bg-[var(--surface-color)] p-2.5 rounded-[15px] border border-[var(--border-color)] shadow-2xs">
                          <div className="flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-secondary)] opacity-70">
                            <Wallet size={12} className="text-success" />
                            <span>{s.totalIncomeLabel}</span>
                          </div>
                          <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-amount mt-0.5">
                            +{formatAmount(totalIncome, lang)} <span className="text-[10px] font-sans opacity-60">{config.currency}</span>
                          </p>
                        </div>

                        <div className="bg-[var(--surface-color)] p-2.5 rounded-[15px] border border-[var(--border-color)] shadow-2xs">
                          <div className="flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-secondary)] opacity-70">
                            <CreditCard size={12} className="text-[var(--accent-color)]" />
                            <span>{s.fixedCostsLabel}</span>
                          </div>
                          <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-amount mt-0.5">
                            -{formatAmount(totalFixed, lang)} <span className="text-[10px] font-sans opacity-60">{config.currency}</span>
                          </p>
                        </div>

                        <div className="bg-[var(--surface-color)] p-2.5 rounded-[15px] border border-[var(--border-color)] shadow-2xs col-span-2 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-secondary)] opacity-70">
                              <TrendingUp size={12} className="text-[var(--accent-color)]" />
                              <span>{s.freeSpendLabel}</span>
                            </div>
                            <p className="text-base sm:text-lg font-bold text-[var(--accent-color)] font-amount mt-0.5">
                              {formatAmount(freeSpend, lang)} <span className="text-xs font-sans opacity-70">{config.currency}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[11px] font-bold">
                            <ShieldCheck size={13} />
                            <span>Klar</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold shrink-0 mb-2">
                        {error}
                      </div>
                    )}

                    {/* Pinned Static Footer */}
                    <div className="shrink-0 pt-3 mt-auto w-full">
                      <button 
                        onClick={() => handleSave()}
                        disabled={isUpdating}
                        className="w-full bg-[var(--accent-color)] hover:opacity-95 text-[var(--text-on-accent)] py-3.5 px-4 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
                      >
                        {isUpdating ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <span>{s.enterApp}</span>
                            <Sparkles size={16} strokeWidth={2} />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
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

            {isAddingGoal && (
              <SavingsGoalModal
                isOpen={isAddingGoal}
                editingGoal={editingGoalIndex !== null ? { ...savingsGoals[editingGoalIndex], id: 'temp-id', currentAmount: 0, createdAt: Date.now(), priority: 0 } as any : null}
                onClose={() => {
                  setIsAddingGoal(false);
                  setEditingGoalIndex(null);
                }}
                onConfirm={handleSaveGoal}
                onDelete={editingGoalIndex !== null ? () => removeGoal(editingGoalIndex) : undefined}
                t={t}
                currency={config.currency}
                userId={userId}
                isPro={isPro}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
