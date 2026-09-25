import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Loader2, Wallet, CreditCard, Target, Plus, ChevronLeft, Check, Sparkles, TrendingUp, ShieldCheck, Search, X, Zap } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { Config, Frequency, Category } from '../types';
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
import { parseIncomePrompt } from '../utils/incomeAiParser';

export type Step = 'name' | 'age' | 'gender' | 'payday' | 'income' | 'expenses' | 'budget' | 'goals' | 'midMonth' | 'summary';

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
    welcome: 'Välkommen till Dejz',
    paydayTitle: 'Din lönedag',
    skip: 'Hoppa över',
    nameQuestion: 'Vad heter du?',
    nameDesc: 'Vi anpassar Dejz personligt efter dig och din ekonomi.',
    firstNamePlaceholder: 'Ditt förnamn',
    ageTitle: 'Din ålder',
    ageQuestion: 'Hur gammal är du?',
    ageDesc: 'Vi frågar för att bättre förstå din vardag och kunna anpassa upplevelsen efter dig.',
    genderTitle: 'Om dig',
    genderQuestionYoung: 'Är du tjej eller kille?',
    genderQuestionAdult: 'Är du kvinna eller man?',
    genderDesc: 'Hjälper oss att skräddarsy tilltal, insikter och rekommendationer.',
    girl: 'Tjej',
    boy: 'Kille',
    woman: 'Kvinna',
    man: 'Man',
    otherOrPreferNot: 'Annat / Vill inte ange',
    budgetTitle: 'Fördela budget',
    budgetQuestion: 'Fördela din vardagsbudget',
    budgetDesc: 'Hur vill du fördela dina fria vardagspengar mellan olika kategorier?',
    budgetTip: '💡 Du kan alltid justera detta när som helst under Budget i footern!',
    distributeEvenly: 'Fördela potten jämnt',
    leftToAllocate: 'Kvar att fördela',
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
    ageTitle: 'Your Age',
    ageQuestion: 'How old are you?',
    ageDesc: 'We ask so we can provide insights and tips tailored to your stage of life.',
    genderTitle: 'About you',
    genderQuestionYoung: 'Are you a girl or a boy?',
    genderQuestionAdult: 'Are you a woman or a man?',
    genderDesc: 'This helps us personalize Dejz and offer relevant recommendations.',
    girl: 'Girl',
    boy: 'Boy',
    woman: 'Woman',
    man: 'Man',
    otherOrPreferNot: 'Other / Prefer not to say',
    budgetTitle: 'Allocate Budget',
    budgetQuestion: 'Allocate your everyday budget',
    budgetDesc: 'How do you want to divide your disposable spending across categories?',
    budgetTip: '💡 You can always adjust this anytime in the Budget tab in the footer!',
    distributeEvenly: 'Distribute evenly',
    leftToAllocate: 'Left to allocate',
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
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>(config?.userAgeGroup || '');
  const [selectedGender, setSelectedGender] = useState<string>(config?.userGender || '');
  const [payday, setPayday] = useState(25);
  const [midMonthSpent, setMidMonthSpent] = useState<string>('');
  
  // Lists State
  const [incomes, setIncomes] = useState<Omit<Income, 'id'>[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<Omit<FixedExpense, 'id'>[]>([]);
  const [onboardingCategories, setOnboardingCategories] = useState<Category[]>(config.categories || []);
  const [savingsGoals, setSavingsGoals] = useState<Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'priority'>[]>([]);

  const isYoung = selectedAgeGroup === '<18' || selectedAgeGroup === '18-25';

  // Modal State
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [editingIncomeIndex, setEditingIncomeIndex] = useState<number | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState<number | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);

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

  const handleNext = () => {
    if (step === 'name') setStep('age');
    else if (step === 'age') setStep('gender');
    else if (step === 'gender') setStep('payday');
    else if (step === 'payday') setStep('income');
    else if (step === 'income') setStep('expenses');
    else if (step === 'expenses') setStep('budget');
    else if (step === 'budget') setStep('goals');
    else if (step === 'goals') setStep('midMonth');
    else if (step === 'midMonth') setStep('summary');
  };

  const handleBack = () => {
    if (step === 'age') setStep('name');
    else if (step === 'gender') setStep('age');
    else if (step === 'payday') setStep('gender');
    else if (step === 'income') setStep('payday');
    else if (step === 'expenses') setStep('income');
    else if (step === 'budget') setStep('expenses');
    else if (step === 'goals') setStep('budget');
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
        payday,
        userAgeGroup: selectedAgeGroup || undefined,
        userGender: selectedGender || undefined,
        categories: onboardingCategories,
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
            ? 'Could not detect an amount. E.g. "25000 from Ur & Penn".' 
            : 'Kunde inte hitta något belopp. Skriv t.ex. "25000 från Ur & Penn".',
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
          ? `Added ${formatAmount(parsed.amount, config.language)} ${config.currency || 'kr'} from ${parsed.name} under ${parsed.category}! ✨`
          : `Lade till ${formatAmount(parsed.amount, config.language)} kr från ${parsed.name} under ${parsed.category}! ✨`,
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
    step === 'age' ? 2 :
    step === 'gender' ? 3 :
    step === 'payday' ? 4 : 
    step === 'income' ? 5 : 
    step === 'expenses' ? 6 : 
    step === 'budget' ? 7 :
    step === 'goals' ? 8 : 
    step === 'midMonth' ? 9 : 10;
  const totalSteps = 10;

  // Summary Metrics & Days Calculation
  const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalFixed = fixedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const monthlyDisposablePot = Math.max(0, totalIncome - totalFixed);

  // Category Budget Helpers for Onboarding
  const getCatBudgetPct = (c: Category) => {
    if (c.budget === undefined || c.budget === null) return 0;
    if (c.budget > 100) return monthlyDisposablePot > 0 ? Math.round((c.budget / monthlyDisposablePot) * 100) : 0;
    return Math.max(0, Math.min(100, Math.round(Number(c.budget) || 0)));
  };

  const getCatBudgetKr = (c: Category) => {
    const pct = getCatBudgetPct(c);
    return monthlyDisposablePot > 0 ? Math.round((pct / 100) * monthlyDisposablePot) : 0;
  };

  const totalAllocatedPct = onboardingCategories.reduce((sum, c) => sum + getCatBudgetPct(c), 0);
  const remainingPct = 100 - totalAllocatedPct;
  const remainingKr = monthlyDisposablePot > 0 ? Math.round((remainingPct / 100) * monthlyDisposablePot) : 0;

  const handleDistributeEvenly = () => {
    const count = onboardingCategories.length;
    if (count === 0) return;
    const basePct = Math.floor(100 / count);
    const remainder = 100 - (basePct * count);
    setOnboardingCategories(onboardingCategories.map((c, idx) => ({
      ...c,
      budget: basePct + (idx === 0 ? remainder : 0)
    })));
  };

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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
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
                       step === 'age' ? s.ageTitle :
                       step === 'gender' ? s.genderTitle :
                       step === 'payday' ? s.paydayTitle :
                       step === 'income' ? s.monthlyIncome : 
                       step === 'expenses' ? s.fixedExpenses : 
                       step === 'budget' ? s.budgetTitle :
                       step === 'goals' ? s.savingsGoals :
                       step === 'midMonth' ? (typeof s.midMonthTitle === 'function' ? s.midMonthTitle(daysUntilPayday) : s.midMonthTitle) :
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
                      <div className="space-y-3">
                        <OnboardingCharacterArt step="name" />
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
                          autoFocus
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

                  {step === 'age' && (
                    <motion.div
                      key="age"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6 my-auto"
                    >
                      <div className="space-y-3">
                        <OnboardingCharacterArt step="age" />
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.ageQuestion}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[290px] mx-auto leading-relaxed">
                            {s.ageDesc}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-w-[320px] mx-auto w-full">
                        {AGE_OPTIONS.map((opt) => {
                          const isSelected = selectedAgeGroup === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedAgeGroup(opt.id);
                                setTimeout(() => {
                                  setStep('gender');
                                }, 180);
                              }}
                              className={`w-full p-3.5 rounded-[18px] border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                                isSelected
                                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-sm'
                                  : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/40 hover:bg-[var(--surface-muted)]'
                              }`}
                            >
                              <span className="text-[14px] sm:text-[15px] font-bold tracking-tight">
                                {isEn ? opt.labelEn : opt.labelSv}
                              </span>
                              {isSelected && <Check size={18} strokeWidth={2.5} />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {step === 'gender' && (
                    <motion.div
                      key="gender"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6 my-auto"
                    >
                      <div className="space-y-3">
                        <OnboardingCharacterArt step="gender" />
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {isYoung ? s.genderQuestionYoung : s.genderQuestionAdult}
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[290px] mx-auto leading-relaxed">
                            {s.genderDesc}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-w-[320px] mx-auto w-full">
                        {/* Option 1: Tjej / Kvinna */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGender(isYoung ? 'tjej' : 'kvinna');
                            setTimeout(() => {
                              setStep('payday');
                            }, 180);
                          }}
                          className={`w-full p-4 rounded-[20px] border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                            selectedGender === (isYoung ? 'tjej' : 'kvinna')
                              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-sm'
                              : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/40 hover:bg-[var(--surface-muted)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{isYoung ? '👧' : '👩'}</span>
                            <span className="text-[15px] font-bold tracking-tight">
                              {isYoung ? s.girl : s.woman}
                            </span>
                          </div>
                          {selectedGender === (isYoung ? 'tjej' : 'kvinna') && <Check size={18} strokeWidth={2.5} />}
                        </button>

                        {/* Option 2: Kille / Man */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGender(isYoung ? 'kille' : 'man');
                            setTimeout(() => {
                              setStep('payday');
                            }, 180);
                          }}
                          className={`w-full p-4 rounded-[20px] border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                            selectedGender === (isYoung ? 'kille' : 'man')
                              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-sm'
                              : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/40 hover:bg-[var(--surface-muted)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{isYoung ? '👦' : '👨'}</span>
                            <span className="text-[15px] font-bold tracking-tight">
                              {isYoung ? s.boy : s.man}
                            </span>
                          </div>
                          {selectedGender === (isYoung ? 'kille' : 'man') && <Check size={18} strokeWidth={2.5} />}
                        </button>

                        {/* Option 3: Annat / Vill inte ange */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGender('annat');
                            setTimeout(() => {
                              setStep('payday');
                            }, 180);
                          }}
                          className={`w-full p-3.5 rounded-[20px] border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                            selectedGender === 'annat'
                              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-sm'
                              : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)]/40 hover:bg-[var(--surface-muted)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">✨</span>
                            <span className="text-[13.5px] font-medium tracking-tight text-[var(--text-secondary)]">
                              {s.otherOrPreferNot}
                            </span>
                          </div>
                          {selectedGender === 'annat' && <Check size={16} strokeWidth={2.5} />}
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
                      <div className="space-y-3">
                        <OnboardingCharacterArt step="payday" payday={payday} />
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
                      <div className="space-y-3">
                        <OnboardingCharacterArt step="income" />
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

                        {/* AI Smart Income Input Box */}
                        <div className="p-3 sm:p-3.5 rounded-[20px] bg-[var(--surface-color)] border border-[var(--border-color)] shadow-3xs space-y-2 mt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--accent-color)]">
                            <div className="flex items-center gap-1.5">
                              <Sparkles size={13} className="text-amber-400" />
                              <span>{isEn ? 'Smart add with AI' : 'Snabb-lägg till med AI'}</span>
                            </div>
                            <span className="text-[10px] text-[var(--text-secondary)] font-medium opacity-75">
                              {isEn ? 'Free text' : 'Skriv fritt'}
                            </span>
                          </div>

                          <form onSubmit={handleAiAddIncome} className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={aiIncomePrompt}
                                onChange={(e) => setAiIncomePrompt(e.target.value)}
                                placeholder={isEn ? 'E.g. "25000 from Ur & Penn", "CSN 13200"' : 'T.ex. "25000 från ur & penn", "CSN 13200"'}
                                disabled={isAiParsing}
                                className="w-full bg-[var(--surface-muted)]/70 border border-[var(--border-color)] rounded-[14px] px-3.5 py-2 text-[12.5px] font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--accent-color)] focus:bg-[var(--surface-color)] outline-none transition-all pr-8"
                              />
                              {aiIncomePrompt && !isAiParsing && (
                                <button
                                  type="button"
                                  onClick={() => setAiIncomePrompt('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={!aiIncomePrompt.trim() || isAiParsing}
                              className="h-[36px] px-3.5 rounded-[14px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-[11.5px] flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 shrink-0"
                            >
                              {isAiParsing ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Sparkles size={12} />
                                  <span>{isEn ? 'Add' : 'Tolka'}</span>
                                </>
                              )}
                            </button>
                          </form>

                          {aiFeedback && (
                            <p className={`text-[11px] font-medium px-1 flex items-center gap-1 transition-all ${
                              aiFeedback.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {aiFeedback.type === 'success' ? <Check size={12} strokeWidth={2.5} /> : null}
                              <span>{aiFeedback.message}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
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
                          className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1 transition-colors cursor-pointer"
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
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        {fixedExpenses.length === 0 && !presetSearch.trim() && (
                          <div className="transform scale-85 origin-center -my-3">
                            <OnboardingCharacterArt step="expenses" />
                          </div>
                        )}
                        <div className="space-y-0.5 text-center">
                          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">{s.fixedExpenses}</h3>
                          <p className="text-[11px] text-[var(--text-secondary)] font-medium max-w-[320px] mx-auto leading-relaxed opacity-85">
                            {s.expensesDesc}
                          </p>
                        </div>
                      </div>

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
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)] px-1">
                            <span>Sökresultat ({filteredPresets.length})</span>
                            <span className="text-[10px] opacity-70">Klicka för att välja</span>
                          </div>
                          <div className="max-h-[26vh] overflow-y-auto pr-1 no-scrollbar space-y-1.5">
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
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[25vh] overflow-y-auto no-scrollbar pr-0.5 p-0.5">
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

                        <div className="space-y-1.5 max-h-[22vh] overflow-y-auto pr-1 no-scrollbar">
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

                      {/* Action Buttons: Next & Skip */}
                      <div className="pt-2 space-y-2">
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
                          className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1 transition-colors cursor-pointer"
                        >
                          {s.skipStep}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 'budget' && (
                    <motion.div
                      key="budget"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2 text-center">
                        <OnboardingCharacterArt step="budget" />
                        <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                          {s.budgetQuestion}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[320px] mx-auto leading-relaxed">
                          {monthlyDisposablePot > 0 
                            ? (isEn 
                                ? `After bills, you have approx ${formatAmount(monthlyDisposablePot, config.language)} ${config.currency || 'kr'} to spend. How do you want to divide the cake?`
                                : `Efter fasta kostnader har du ca ${formatAmount(monthlyDisposablePot, config.language)} kr kvar att leva på. Hur vill du fördela kakan?`)
                            : s.budgetDesc
                          }
                        </p>
                      </div>

                      {/* Distribution Summary Card */}
                      <div className="p-3.5 sm:p-4 rounded-[20px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">
                              {s.leftToAllocate}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-xl sm:text-2xl font-extrabold font-amount tabular-nums ${
                                remainingPct < 0 ? 'text-rose-500' : remainingPct === 0 ? 'text-emerald-500' : 'text-[var(--accent-color)]'
                              }`}>
                                {remainingPct < 0 ? `+${Math.abs(remainingPct)}%` : `${remainingPct}%`}
                              </span>
                              <span className="text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums">
                                ({formatAmount(Math.abs(remainingKr), config.language)} {config.currency || 'kr'})
                              </span>
                              {remainingPct === 0 && (
                                <span className="text-[9.5px] font-bold text-emerald-500 uppercase tracking-tight bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                  100% klart
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleDistributeEvenly}
                            className="text-[11px] font-bold text-[var(--accent-color)] hover:opacity-85 flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-[var(--accent-color)]/10 transition-all cursor-pointer shrink-0"
                          >
                            <Sparkles size={13} />
                            {s.distributeEvenly}
                          </button>
                        </div>

                        {/* Multi-colored Category Segment Bar */}
                        <div className="w-full h-2 bg-[var(--border-color)]/60 rounded-full overflow-hidden flex">
                          {onboardingCategories
                            .filter((c) => getCatBudgetPct(c) > 0)
                            .map((c) => {
                              const pct = getCatBudgetPct(c);
                              return (
                                <div
                                  key={c.name}
                                  style={{
                                    width: `${Math.min(100, pct)}%`,
                                    backgroundColor: c.color || '#94a3b8',
                                  }}
                                  className="h-full transition-all duration-200 border-r border-black/10 last:border-r-0"
                                />
                              );
                            })}
                        </div>
                      </div>

                      {/* Categories List */}
                      <div className="space-y-2 max-h-[34vh] overflow-y-auto pr-1 no-scrollbar">
                        {onboardingCategories.map((cat) => {
                          const iconName = cat.icon;
                          const Icon = ICON_MAP[iconName];
                          const catPct = getCatBudgetPct(cat);
                          const catKr = getCatBudgetKr(cat);

                          return (
                            <div
                              key={cat.name}
                              className="p-2.5 sm:p-3 rounded-[16px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-3xs flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div 
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 text-[13px]"
                                    style={{ backgroundColor: cat.color || '#94a3b8' }}
                                  >
                                    {isEmojiString(iconName) ? (
                                      <span className="leading-none">{iconName}</span>
                                    ) : Icon ? (
                                      <Icon size={14} strokeWidth={2} />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full" />
                                    )}
                                  </div>
                                  <span className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                                    {cat.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[12px] font-bold font-amount tabular-nums text-[var(--text-primary)]">
                                    {formatAmount(catKr, config.language)} kr
                                  </span>
                                  <span className="text-[11px] font-bold text-[var(--accent-color)] tabular-nums w-9 text-right">
                                    {catPct}%
                                  </span>
                                </div>
                              </div>

                              {/* Slider */}
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={catPct}
                                onChange={(e) => {
                                  const val = Math.round(Number(e.target.value));
                                  setOnboardingCategories(onboardingCategories.map(c => 
                                    c.name === cat.name ? { ...c, budget: val } : c
                                  ));
                                }}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--accent-color)] focus:outline-none bg-[var(--border-color)]/60"
                                style={{
                                  backgroundImage: `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${catPct}%, var(--border-color) ${catPct}%, var(--border-color) 100%)`
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] text-center">
                        {s.budgetTip}
                      </p>

                      {/* Action Buttons: Next & Skip */}
                      <div className="pt-2 space-y-2">
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
                          className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1 transition-colors cursor-pointer"
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
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <OnboardingCharacterArt step="goals" />
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

                      <div className="space-y-2">
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
                          className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1 transition-colors cursor-pointer"
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
                      className="space-y-4"
                    >
                      <div className="space-y-2 text-center">
                        <OnboardingCharacterArt step="midMonth" days={daysUntilPayday} payday={payday} />
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
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

                      {/* Main Target Amount Input */}
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={midMonthSpent}
                            onChange={(e) => setMidMonthSpent(e.target.value)}
                            className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[20px] px-4 py-3.5 pr-14 text-center text-xl sm:text-2xl font-bold font-amount tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/30"
                            placeholder={monthlyDisposablePot > 0 ? monthlyDisposablePot.toString() : s.midMonthPlaceholder}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)] pointer-events-none">
                            {config.currency}
                          </span>
                        </div>

                        {/* Live Daily Budget Preview Pill */}
                        {effectiveRemaining > 0 && (
                          <div className="p-3 bg-[var(--surface-muted)] rounded-[16px] border border-[var(--border-color)]/50 text-center">
                            <p className="text-xs font-bold text-[var(--text-primary)]">
                              {typeof s.dailyRatePreview === 'function' 
                                ? s.dailyRatePreview(formatAmount(dailyRate, lang), daysUntilPayday) 
                                : `${dailyRate} kr/dag`}
                            </p>
                          </div>
                        )}

                        {/* 1-Click Quick Preset Buttons */}
                        {monthlyDisposablePot > 0 && (
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
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

                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold">
                          {error}
                        </div>
                      )}

                      {/* Navigation Buttons */}
                      <div className="pt-2 space-y-2">
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
                          className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1 transition-colors cursor-pointer"
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
                      className="space-y-4 my-auto text-center"
                    >
                      {/* Premium Summary Badge */}
                      <OnboardingCharacterArt step="summary" />

                      {/* Summary Speech Intro Card */}
                      <div className="relative bg-[var(--surface-color)] p-4 rounded-[20px] border border-[var(--border-color)] shadow-xs text-left max-w-sm mx-auto">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-color)] mb-1">
                          <Sparkles size={14} />
                          <span>{isEn ? 'Your Plan is Ready' : 'Din plan är klar'}</span>
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
