import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Loader2, Wallet, CreditCard, Target, Plus, ChevronLeft, Banknote, Check, Sparkles, TrendingUp, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { Config } from '../types';
import { formatAmount } from '../utils/format';
import { FixedExpenseModal, IncomeModal } from './BudgetModals';
import { SavingsGoalModal } from './SavingsGoalModal';
import { ICON_MAP, isEmojiString } from '../utils/icons';
import { useScrollLock } from '../hooks/useScrollLock';
import { FixedExpense, Income, SavingsGoal } from '../types';
import { BudgetItem } from './BudgetItem';

function DejzyMascot({ mood = 'happy' }: { mood?: 'happy' | 'celebrating' | 'thinking' }) {
  return (
    <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
      {/* Glow aura */}
      <motion.div 
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-color)]/30 to-amber-400/30 rounded-full blur-xl pointer-events-none"
      />

      {/* Floating Mascot Body */}
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, 1.5, -1.5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-24 h-24"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
          {/* Ears / Antennas */}
          <motion.ellipse 
            cx="32" cy="22" rx="7" ry="12" 
            transform="rotate(-20 32 22)" 
            fill="var(--accent-color)" 
            animate={{ rotate: [-20, -25, -20] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.ellipse 
            cx="68" cy="22" rx="7" ry="12" 
            transform="rotate(20 68 22)" 
            fill="var(--accent-color)" 
            animate={{ rotate: [20, 25, 20] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <ellipse cx="32" cy="23" rx="4" ry="7" transform="rotate(-20 32 23)" fill="#FDE047" />
          <ellipse cx="68" cy="23" rx="4" ry="7" transform="rotate(20 68 23)" fill="#FDE047" />

          {/* Body */}
          <circle cx="50" cy="54" r="36" fill="var(--accent-color)" />
          {/* Belly */}
          <ellipse cx="50" cy="62" rx="24" ry="20" fill="white" fillOpacity="0.9" />

          {/* Cheeks */}
          <circle cx="33" cy="56" r="4.5" fill="#F43F5E" fillOpacity="0.4" />
          <circle cx="67" cy="56" r="4.5" fill="#F43F5E" fillOpacity="0.4" />

          {/* Eyes with sparkles */}
          <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.48, 0.52, 1] }}>
            <ellipse cx="38" cy="46" rx="4.5" ry="5.5" fill="#0F172A" />
            <circle cx="36.5" cy="44" r="1.8" fill="white" />
            <ellipse cx="62" cy="46" rx="4.5" ry="5.5" fill="#0F172A" />
            <circle cx="60.5" cy="44" r="1.8" fill="white" />
          </motion.g>

          {/* Smile */}
          <path d="M 44 56 Q 50 63 56 56" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Golden Coin in hand */}
          <motion.g 
            animate={{ y: [0, -3, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx="78" cy="65" r="9" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
            <circle cx="78" cy="65" r="7" fill="#FBBF24" />
            <text x="78" y="68.5" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle">kr</text>
          </motion.g>
        </svg>

        {/* Floating Sparkle Stars */}
        <motion.div 
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6], rotate: [0, 45, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute -top-1 -left-1 text-amber-400"
        >
          <Sparkles size={16} />
        </motion.div>
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5], rotate: [45, 0, 45] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.8 }}
          className="absolute top-2 -right-2 text-[var(--accent-color)]"
        >
          <Sparkles size={14} />
        </motion.div>
      </motion.div>
    </div>
  );
}

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
    midMonthTitle: 'Starta mitt i perioden',
    midMonthDesc: 'Om du börjar med appen mitt i månaden finns det risk att du redan har gjort av med pengar, och gör det lite svårare att få helt rätt på allt. Men var lugn, nästa månad eller period kommer det bli toppen. Men för att uppskatta så att vi kan fortsätta resterande period fram till nästa lön, hur mycket tror du att du har spenderat om du bortser från dina fasta utgifter?',
    midMonthPlaceholder: 'T.ex. 6000',
    summaryTitle: 'Din personliga plan',
    summarySubtitle: 'Allt är redo! Här är din ekonomiska överblick fram till nästa lön.',
    enterApp: 'Kliv in i Dejz ✨',
    totalIncomeLabel: 'Total inkomst',
    fixedCostsLabel: 'Fasta kostnader',
    freeSpendLabel: 'Kvar att röra dig med',
    activeGoalsLabel: 'Sparmål',
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
    midMonthTitle: 'Starting mid-period',
    midMonthDesc: 'If you start using the app in the middle of the month, you may have already spent money, making it harder to get everything perfectly right. But don\'t worry, next month or period will be great. To estimate and continue the remaining period until your next payday, how much do you think you have already spent, excluding your fixed expenses?',
    midMonthPlaceholder: 'E.g. 6000',
    summaryTitle: 'Your Personal Plan',
    summarySubtitle: 'All set! Here is your financial overview until your next payday.',
    enterApp: 'Enter Dejz ✨',
    totalIncomeLabel: 'Total Income',
    fixedCostsLabel: 'Fixed Costs',
    freeSpendLabel: 'Available to spend',
    activeGoalsLabel: 'Savings Goals',
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

  const paymentMethods = config.paymentMethods || [];
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

      const initialSpent = forceInitialSpent !== undefined ? forceInitialSpent : (Number(midMonthSpent) || 0);

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

  // Summary Metrics
  const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalFixed = fixedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const spentEst = Number(midMonthSpent) || 0;
  const freeSpend = Math.max(0, totalIncome - totalFixed - spentEst);

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
          <div className="pt-[calc(0.75rem+env(safe-area-inset-top))] pb-1 flex justify-center shrink-0">
            <div className="w-12 h-1.5 bg-[var(--border-strong)]/30 rounded-full" />
          </div>

          <div className="p-5 sm:p-6 pb-8 flex-1 overflow-y-auto no-scrollbar flex flex-col">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between">
              
              {/* Step Progress Segmented Indicator */}
              <div className="flex items-center gap-1.5 mb-5 shrink-0">
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
              <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  {step !== 'name' && (
                    <button 
                      onClick={handleBack} 
                      className="w-9 h-9 flex items-center justify-center bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] rounded-[12px] transition-all text-[var(--text-secondary)] border border-[var(--border-color)] shadow-2xs cursor-pointer active:scale-95"
                      aria-label={s.back}
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[var(--accent-color)] tracking-wide uppercase">
                      {s.stepOf(stepNumber, totalSteps)}
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
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

              <div className="flex-1 flex flex-col justify-start sm:justify-center py-2">
                <AnimatePresence mode="wait">
                  {step === 'name' && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6 my-auto"
                    >
                      <div className="space-y-4">
                        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                          <div className="w-20 h-20 bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs rounded-[24px] flex items-center justify-center">
                            <User size={32} className="text-[var(--accent-color)]" />
                          </div>
                        </div>
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.nameQuestion}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.nameDesc}
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[18px] px-4 py-3.5 pl-11 text-[16px] sm:text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/40"
                          placeholder={s.firstNamePlaceholder}
                          autoComplete="given-name"
                          autoCorrect="off"
                        />
                      </div>

                      <div className="pt-2">
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
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[22px] flex items-center justify-center mx-auto border border-[var(--accent-color)]/20 shadow-xs">
                          <Banknote size={28} />
                        </div>
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.paydayQuestion}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.paydayDesc}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2.5">
                        {[25, 27, 30, 1].map((d) => (
                          <button
                            key={d}
                            onClick={() => setPayday(d)}
                            className={`py-3.5 rounded-[16px] font-bold text-sm sm:text-base transition-all border cursor-pointer ${
                              payday === d 
                                ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-xs scale-[1.02]' 
                                : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/30'
                            }`}
                          >
                            {isEn ? `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}` : `${d}:e`}
                          </button>
                        ))}
                      </div>
                      
                      <div className="bg-[var(--surface-color)] p-5 rounded-[22px] border border-[var(--border-color)] shadow-xs text-center space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">{s.customDate}</p>
                        
                        <div className="flex justify-center items-baseline gap-1">
                          <motion.span 
                            key={payday}
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-4xl font-bold font-amount text-[var(--accent-color)] tracking-tighter tabular-nums"
                          >
                            {payday}
                          </motion.span>
                          <span className="text-base font-bold text-[var(--accent-color)]/60">
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

                      <div className="pt-2">
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
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[22px] flex items-center justify-center mx-auto border border-[var(--accent-color)]/20 shadow-xs">
                          <Wallet size={28} />
                        </div>
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.monthlyIncome}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.incomeDesc}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1 no-scrollbar">
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

                      <div className="pt-2">
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

                  {step === 'expenses' && (
                    <motion.div
                      key="expenses"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[22px] flex items-center justify-center mx-auto border border-[var(--accent-color)]/20 shadow-xs">
                          <CreditCard size={28} />
                        </div>
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.fixedExpenses}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.expensesDesc}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1 no-scrollbar">
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
                          onClick={() => {
                            setEditingExpenseIndex(null);
                            setIsAddingExpense(true);
                          }}
                          className="w-full py-3.5 border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-[18px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-2 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>{s.addExpense}</span>
                        </button>
                      </div>

                      <div className="pt-2">
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

                  {step === 'goals' && (
                    <motion.div
                      key="goals"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[22px] flex items-center justify-center mx-auto border border-[var(--accent-color)]/20 shadow-xs">
                          <Target size={28} />
                        </div>
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.savingsGoals}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {s.goalsDesc}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1 no-scrollbar">
                        {savingsGoals.map((goal, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              setEditingGoalIndex(i);
                              setIsAddingGoal(true);
                            }}
                            className="px-[14px] py-[10px] min-h-[64px] rounded-[16px] bg-[var(--transaction-bg)] shadow-xs border border-[var(--border-color)] hover:bg-[var(--surface-muted)] flex items-center justify-between gap-[12px] group transition-all duration-200 cursor-pointer active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-[12px] min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-[14px] bg-[var(--accent-color)]/10 flex items-center justify-center overflow-hidden shrink-0 border border-[var(--accent-color)]/20">
                                {goal.logo ? (
                                  <img src={goal.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="text-base">
                                    {isEmojiString(goal.icon || 'target') ? goal.icon : (
                                      (() => {
                                        const Icon = ICON_MAP[goal.icon || 'target'] || Target;
                                        return <Icon size={18} className="text-[var(--accent-color)]" />;
                                      })()
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 flex flex-col justify-center">
                                <p className="text-[15px] font-medium text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight group-hover:text-[var(--accent-color)] transition-colors">
                                  {goal.title}
                                </p>
                                {goal.deadline && (
                                  <p className="text-[12px] font-medium text-[var(--text-secondary)] opacity-75 leading-tight mt-0.5">
                                    {goal.deadline}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <p className="font-bold text-[15px] text-[var(--text-primary)] whitespace-nowrap font-amount">
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
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold">
                          {error}
                        </div>
                      )}

                      <button 
                        onClick={handleNext}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 px-4 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>
                    </motion.div>
                  )}

                  {step === 'midMonth' && (
                    <motion.div
                      key="midMonth"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[22px] flex items-center justify-center mx-auto border border-[var(--accent-color)]/20 shadow-xs">
                          <Banknote size={28} />
                        </div>
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.midMonthTitle}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[340px] mx-auto leading-relaxed">
                            {s.midMonthDesc}
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          value={midMonthSpent}
                          onChange={(e) => setMidMonthSpent(e.target.value)}
                          className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[18px] px-4 py-3.5 pr-14 text-[16px] sm:text-sm font-semibold text-[var(--text-primary)] text-center focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/40"
                          placeholder={s.midMonthPlaceholder}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)] pointer-events-none">
                          {config.currency}
                        </span>
                      </div>

                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold">
                          {error}
                        </div>
                      )}

                      <button 
                        onClick={handleNext}
                        className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 px-4 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-95"
                      >
                        <span>{s.next}</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>
                    </motion.div>
                  )}

                  {step === 'summary' && (
                    <motion.div
                      key="summary"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 my-auto text-center"
                    >
                      {/* Animated Mascot */}
                      <DejzyMascot mood="celebrating" />

                      {/* Mascot Speech Bubble */}
                      <div className="relative bg-[var(--surface-color)] p-4 rounded-[20px] border border-[var(--border-color)] shadow-xs text-left max-w-sm mx-auto">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-color)] mb-1">
                          <Sparkles size={14} />
                          <span>Dejzy hälsar</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                          {fullName.trim() ? `Snyggt jobbat, ${fullName.trim()}!` : 'Snyggt jobbat!'} Din personliga ekonomiska profil är nu klar. Jag har räknat ut din period fram till nästa lön den <strong className="text-[var(--accent-color)]">{payday}:e</strong>.
                        </p>
                      </div>

                      {/* Financial Profile Summary Cards */}
                      <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto text-left">
                        <div className="bg-[var(--surface-color)] p-3 rounded-[16px] border border-[var(--border-color)] shadow-2xs">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] opacity-70">
                            <Wallet size={12} className="text-success" />
                            <span>{s.totalIncomeLabel}</span>
                          </div>
                          <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-amount mt-0.5">
                            +{formatAmount(totalIncome, lang)} <span className="text-[10px] font-sans opacity-60">{config.currency}</span>
                          </p>
                        </div>

                        <div className="bg-[var(--surface-color)] p-3 rounded-[16px] border border-[var(--border-color)] shadow-2xs">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] opacity-70">
                            <CreditCard size={12} className="text-[var(--accent-color)]" />
                            <span>{s.fixedCostsLabel}</span>
                          </div>
                          <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-amount mt-0.5">
                            -{formatAmount(totalFixed, lang)} <span className="text-[10px] font-sans opacity-60">{config.currency}</span>
                          </p>
                        </div>

                        <div className="bg-[var(--surface-color)] p-3 rounded-[16px] border border-[var(--border-color)] shadow-2xs col-span-2 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] opacity-70">
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

                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="pt-2 max-w-sm mx-auto w-full">
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
