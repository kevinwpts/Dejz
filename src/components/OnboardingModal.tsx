import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowRight, Loader2, Wallet, CreditCard, Target, Plus, ChevronLeft, Banknote, Check } from 'lucide-react';
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

interface OnboardingModalProps {
  isOpen: boolean;
  config: Config;
  userId?: string;
  isPro: boolean;
  onComplete: (data: {
    fullName: string;
    incomes: { amount: number; name: string; icon?: string; logo?: string }[];
    fixedExpenses: Omit<FixedExpense, 'id'>[];
    savingsGoals: { title: string; targetAmount: number; icon?: string; logo?: string; deadline?: string }[];
    initialSpent: number;
    payday: number;
  }) => Promise<void> | void;
  t: (key: TranslationKey) => string;
  currentPeriodId: string;
}

type Step = 'name' | 'payday' | 'income' | 'expenses' | 'goals';

export function OnboardingModal({ isOpen, config, userId, isPro, onComplete, t, currentPeriodId }: OnboardingModalProps) {
  useScrollLock(isOpen);
  const [step, setStep] = useState<Step>('name');
  const [fullName, setFullName] = useState('');
  const [payday, setPayday] = useState(25);
  
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
  };

  const handleBack = () => {
    if (step === 'payday') setStep('name');
    else if (step === 'income') setStep('payday');
    else if (step === 'expenses') setStep('income');
    else if (step === 'goals') setStep('expenses');
  };

  const handleSave = async () => {
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

      const initialSpent = 0;

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

  const stepNumber = step === 'name' ? 1 : step === 'payday' ? 2 : step === 'income' ? 3 : step === 'expenses' ? 4 : 5;
  const totalSteps = 5;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col overflow-hidden selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]"
        >
          {/* Top Notch / Handle */}
          <div className="pt-[calc(0.75rem+env(safe-area-inset-top))] pb-1 flex justify-center shrink-0">
            <div className="w-12 h-1.5 bg-[var(--border-strong)]/30 rounded-full" />
          </div>

          <div className="p-5 sm:p-6 pb-8 flex-1 overflow-y-auto no-scrollbar flex flex-col">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
              
              {/* Step Progress Segmented Indicator */}
              <div className="flex items-center gap-1.5 mb-5 shrink-0">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div 
                    key={s} 
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      s <= stepNumber ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Header */}
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  {step !== 'name' && (
                    <button 
                      onClick={handleBack} 
                      className="w-9 h-9 flex items-center justify-center bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] rounded-[12px] transition-all text-[var(--text-secondary)] border border-[var(--border-color)] shadow-2xs cursor-pointer active:scale-95"
                      aria-label="Tillbaka"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[var(--accent-color)] tracking-wide uppercase">
                      Steg {stepNumber} av {totalSteps}
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                      {step === 'name' ? 'Välkommen till Dejz' : 
                       step === 'payday' ? 'Din lönedag' :
                       step === 'income' ? t('monthlyIncome' as any) : 
                       step === 'expenses' ? t('fixedExpensesTitle' as any) : 
                       t('savingsGoalsTitle' as any)}
                    </h2>
                  </div>
                </div>
                
                {step !== 'name' && step !== 'goals' ? (
                  <button
                    onClick={() => {
                      // Trigger PWA modal after 10 seconds delay as requested by user
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('trigger-pwa-modal'));
                      }, 10000);
                      handleSave();
                    }}
                    disabled={isUpdating}
                    className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-[12px] bg-[var(--surface-color)] border border-[var(--border-color)] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>Hoppa över</span>
                  </button>
                ) : <div />}
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {step === 'name' && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                          <div className="w-20 h-20 bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs rounded-[24px] flex items-center justify-center">
                            <User size={32} className="text-[var(--accent-color)]" />
                          </div>
                        </div>
                        <div className="space-y-1 text-center">
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Vad heter du?</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            Vi anpassar Dejz personligt efter dig och din ekonomi.
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
                          className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[18px] px-4 py-3.5 pl-11 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 shadow-xs outline-none transition-all placeholder-[var(--text-secondary)]/40"
                          placeholder="Ditt förnamn"
                        />
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={handleNext}
                          disabled={!fullName.trim()}
                          className="w-full bg-[#03070E] text-[#FFFFFF] hover:bg-[#03070E]/90 dark:bg-[#FFFFFF] dark:text-[#03070E] h-[52px] rounded-full font-bold text-sm sm:text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm font-sans"
                        >
                          <span>{t('next' as any)}</span>
                          <ArrowRight size={18} strokeWidth={2.5} />
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
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">När får du lön?</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            Dejz använder detta för att automatiskt beräkna dina budgetperioder.
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
                            {d}:e
                          </button>
                        ))}
                      </div>
                      
                      <div className="bg-[var(--surface-color)] p-5 rounded-[22px] border border-[var(--border-color)] shadow-xs text-center space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">Eller välj ett anpassat datum</p>
                        
                        <div className="flex justify-center items-baseline gap-1">
                          <motion.span 
                            key={payday}
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-4xl font-bold font-amount text-[var(--accent-color)] tracking-tighter tabular-nums"
                          >
                            {payday}
                          </motion.span>
                          <span className="text-base font-bold text-[var(--accent-color)]/60">:e varje månad</span>
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
                          className="w-full bg-[#03070E] text-[#FFFFFF] hover:bg-[#03070E]/90 dark:bg-[#FFFFFF] dark:text-[#03070E] h-[52px] rounded-full font-bold text-sm sm:text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-sans"
                        >
                          <span>{t('next' as any)}</span>
                          <ArrowRight size={18} strokeWidth={2.5} />
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
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{t('monthlyIncome' as any)}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {t('onboardingIncomeDesc' as any)}
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
                          className="w-full h-[48px] border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-2 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>{t('addIncome' as any)}</span>
                        </button>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[#03070E] text-[#FFFFFF] hover:bg-[#03070E]/90 dark:bg-[#FFFFFF] dark:text-[#03070E] h-[52px] rounded-full font-bold text-sm sm:text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-sans"
                        >
                          <span>{t('next' as any)}</span>
                          <ArrowRight size={18} strokeWidth={2.5} />
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
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{t('fixedExpensesTitle' as any)}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {t('onboardingExpensesDesc' as any)}
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
                          className="w-full h-[48px] border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-2 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>{t('addExpense' as any)}</span>
                        </button>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={handleNext}
                          className="w-full bg-[#03070E] text-[#FFFFFF] hover:bg-[#03070E]/90 dark:bg-[#FFFFFF] dark:text-[#03070E] h-[52px] rounded-full font-bold text-sm sm:text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-sans"
                        >
                          <span>{t('next' as any)}</span>
                          <ArrowRight size={18} strokeWidth={2.5} />
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
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{t('savingsGoalsTitle' as any)}</h3>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto leading-relaxed">
                            {t('onboardingGoalsDesc' as any)}
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
                          className="w-full h-[48px] border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center gap-2 font-bold text-xs bg-[var(--surface-color)] active:scale-[0.98] cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>{t('addSavingsGoal' as any)}</span>
                        </button>
                      </div>

                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[14px] text-red-500 text-xs text-center font-bold">
                          {error}
                        </div>
                      )}

                      <button 
                        onClick={handleSave}
                        disabled={isUpdating}
                        className="w-full bg-[#03070E] text-[#FFFFFF] hover:bg-[#03070E]/90 dark:bg-[#FFFFFF] dark:text-[#03070E] h-[52px] rounded-full font-bold text-sm sm:text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer font-sans"
                      >
                        {isUpdating ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            <span>{t('finish' as any)}</span>
                            <Check size={18} strokeWidth={2.5} />
                          </>
                        )}
                      </button>
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
