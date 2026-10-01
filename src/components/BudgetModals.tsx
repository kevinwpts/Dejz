import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

import { X, Check, Trash2, ChevronDown, Receipt, PiggyBank, Banknote, Pencil, ChevronRight } from 'lucide-react';
import { Income, FixedExpense, Frequency, Category, Config, MonthlySaving } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { fetchLogoForName, getLogoUrl } from '../utils/logo';
import { IconSelector } from './IconSelector';
import { IconPickerModal } from './IconPickerModal';
import { ICON_MAP, isEmojiString, getPaymentMethodIcon } from '../utils/icons';
import { ConfirmModal } from './ConfirmModal';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { CategoryTile } from './CategoryTile';
import { useScrollLock } from '../hooks/useScrollLock';
import { QuickMathToolbar } from './QuickMathToolbar';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { Button, IconButton } from './ui';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';

// --- Income View Modal ---

interface IncomeViewModalProps {
  income: Income;
  onClose: () => void;
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
  t: (key: TranslationKey) => string;
  currency: string;
  config: Config;
  currentPeriodId: string;
}

export function IncomeViewModal({ income, onClose, onEdit, onDelete, t, currency, config, currentPeriodId }: IncomeViewModalProps) {
  useScrollLock(true);
  const dragControls = useDragControls();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const expenseCompatible = {
    ...income,
    note: income.name,
    category: income.category || t('income'),
    type: 'income' as const,
    timestamp: Date.now() // Dummy for logo logic
  };

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const displayAmount = (income.isVariable && income.periodOverrides && currentPeriodId && income.periodOverrides[currentPeriodId] !== undefined)
    ? income.periodOverrides[currentPeriodId]
    : income.amount;

  const hasAdjustment = income.isVariable && income.periodOverrides && currentPeriodId && income.periodOverrides[currentPeriodId] !== undefined;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => {
        backdropMouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        if (backdropMouseDownTarget.current === e.target && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.75 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 70 || info.velocity.y > 350) {
            onClose();
          }
        }}
        className="bg-[var(--bg-color)] dark:bg-[#232323] w-full max-w-lg rounded-t-[22px] rounded-b-none sm:rounded-[22px] border-t sm:border border-[var(--border-color)] dark:border-white/[0.08] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full py-3 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="w-10 h-1 bg-[var(--border-color)] dark:bg-white/20 hover:bg-[var(--text-secondary)] dark:hover:bg-white/40 rounded-full transition-colors" />
        </div>

        {/* Compact Header Section */}
        <div className="px-5 sm:px-6 pt-2 sm:pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]/60 dark:border-white/[0.04]">
          <div className="flex items-center gap-3 min-w-0">
            <TransactionLogo transaction={expenseCompatible as any} config={config} size="sm" />
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] dark:text-white truncate">
              {income.name}
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              type="button"
              onClick={() => onEdit(income)} 
              className="w-8 h-8 rounded-full bg-[var(--surface-muted)] dark:bg-white/[0.04] hover:bg-[var(--border-color)]/50 dark:hover:bg-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] dark:text-[#9CA6BC] hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer"
              title={t('edit')}
              aria-label={t('edit')}
            >
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            <button 
              type="button"
              onClick={() => setShowDeleteConfirm(true)} 
              className="w-8 h-8 rounded-full bg-rose-500/[0.1] hover:bg-rose-500/[0.2] flex items-center justify-center text-rose-500 dark:text-rose-400 transition-colors cursor-pointer"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
            <div className="w-px h-4 bg-[var(--border-color)] dark:bg-white/10 mx-0.5" />
            <button 
              type="button"
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-[var(--surface-muted)] dark:bg-white/[0.04] hover:bg-[var(--border-color)]/50 dark:hover:bg-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] dark:text-[#9CA6BC] hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer"
              aria-label={t('close')}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Main Content Area: One Cohesive Detail Surface */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          <div className="bg-[var(--surface-color)] dark:bg-[#312f2f] rounded-[18px] border border-[var(--border-color)] dark:border-white/[0.05] divide-y divide-[var(--border-color)]/50 dark:divide-white/[0.05] overflow-hidden shadow-xs dark:shadow-none">
            
            {/* Amount Row */}
            <div className="p-3.5 sm:p-4 flex items-center justify-between">
              <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] shrink-0">
                {t('amount')}
              </span>
              <div className="text-right">
                <p className="text-[22px] sm:text-[24px] font-semibold font-amount tabular-nums text-[#211F1C] dark:text-white">
                  <span className="opacity-75 mr-0.5">+</span>
                  <span>{formatAmount(displayAmount, config.language)}</span>
                  <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] ml-[3px] font-sans">{currency}</span>
                </p>
                {hasAdjustment && (
                  <p className="text-[12px] font-normal text-[#777168] dark:text-[#71717A] mt-0.5 tabular-nums">
                    {t('adjustmentFor')} {currentPeriodId} ({t('plannedAmount')}: {formatAmount(income.amount, config.language)} {currency})
                  </p>
                )}
              </div>
            </div>

            {/* Merchant / Payer Row */}
            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
              <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] shrink-0">
                {t('merchant')}
              </span>
              <span className="text-[15px] font-medium text-[#211F1C] dark:text-white text-right truncate">
                {income.name}
              </span>
            </div>

            {/* Category Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <span className="text-xs font-normal text-[#6E6961] dark:text-[#9CA6BC] shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center justify-end gap-2">
                <CategoryIcon icon={income.icon || '💰'} size="xs" />
                <span className="text-sm font-medium text-[#1C1917] dark:text-white">
                  {income.category || t('income')}
                </span>
              </div>
            </div>

            {/* Type Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <span className="text-xs font-normal text-[#6E6961] dark:text-[#9CA6BC] shrink-0">
                {t('type')}
              </span>
              <span className="text-sm font-medium text-[#1C1917] dark:text-white text-right">
                {income.isVariable ? 'Varierande' : 'Fast belopp'}
              </span>
            </div>

            {/* Arrival Day Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <span className="text-xs font-normal text-[#6E6961] dark:text-[#9CA6BC] shrink-0">
                {t('arrivalDay')}
              </span>
              <span className="text-sm font-medium text-[#1C1917] dark:text-white text-right">
                {income.deductionDay ? `${income.deductionDay}e` : '-'}
              </span>
            </div>

            {/* Note Row if exists */}
            {income.note && (
              <div className="p-4 sm:p-4.5 flex items-start justify-between gap-4">
                <span className="text-xs font-normal text-[#6E6961] dark:text-[#9CA6BC] shrink-0 pt-0.5">
                  Notering
                </span>
                <span className="text-sm font-normal text-[#1C1917] dark:text-white text-right max-w-[65%] break-words">
                  {income.note}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={t('delete')}
          message={t('deleteConfirm')}
          onConfirm={() => {
            onDelete(income.id);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          t={t}
        />
      )}
    </motion.div>
  );
}

interface IncomeModalProps {
  income?: Income | null;
  onClose: () => void;
  onSave: (income: Omit<Income, 'id'>) => void;
  onDelete?: () => void;
  t: (key: TranslationKey) => string;
  currency: string;
  userId?: string;
  isPro: boolean;
  categories: Category[];
}

export function IncomeModal({ income, onClose, onSave, onDelete, t, currency, userId, isPro, categories, paymentMethods, _currentPeriodId, initialDeductionDay, config }: IncomeModalProps & { paymentMethods: any[], _currentPeriodId?: string, currentPeriodId?: string, initialDeductionDay?: number, config: Config }) {
  useScrollLock(true);
  const [name, setName] = useState(income?.name || '');
  const [note, setNote] = useState(income?.note || '');
  const [amount, setAmount] = useState(formatAmount(income?.amount || ''));
  
  const [deductionDay, setDeductionDay] = useState(income?.deductionDay || initialDeductionDay || 25);
  const [startMonth, setStartMonth] = useState(income?.startMonth ?? new Date().getMonth());
  const [frequency, setFrequency] = useState(income?.frequency || Frequency.MONTHLY);
  const firstPaymentMethod = paymentMethods && paymentMethods.length > 0 ? (typeof paymentMethods[0] === 'string' ? paymentMethods[0] : paymentMethods[0]?.name) : 'Autogiro';
  const paymentMethod = typeof income?.paymentMethod === 'string' ? income.paymentMethod : (income?.paymentMethod as any)?.name || firstPaymentMethod;
  const [isVariable, setIsVariable] = useState(income?.isVariable || false);
  const [category, setCategory] = useState(typeof income?.category === 'object' ? (income.category as any)?.name : (income?.category || (categories && categories.length > 0 ? categories[0].name : '')));
  const [icon, setIcon] = useState(income?.icon || '💰');
  const originalName = useRef(income?.name || '');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  
  const [logo, setLogo] = useState<string | undefined>(income?.logo);
  const [autoLogo, setAutoLogo] = useState<string | undefined>(income?.name ? getLogoUrl(income.name) : undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [showIconSelector, setShowIconSelector] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!name || name.length < 2) {
      if (!manualSelectionThisSession) setLogo(undefined);
      setAutoLogo(undefined);
      return;
    }

    const timer = setTimeout(async () => {
      const url = await fetchLogoForName(name);
      setAutoLogo(url);
      
      // Auto-select if the name has changed and user hasn't manually picked one this session
      if (url && !manualSelectionThisSession && (name !== originalName.current || !logo)) {
        setLogo(url);
        setIcon('none');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [name, manualSelectionThisSession]);

  const handleSave = () => {
    const parsedAmount = parseAmount(amount);

    onSave({ 
      name, 
      note,
      amount: parsedAmount, 
      category, 
      icon, 
      logo, 
      deductionDay, 
      startMonth: frequency === Frequency.MONTHLY ? undefined : startMonth,
      frequency,
      paymentMethod, 
      isVariable, 
      periodOverrides: isVariable ? (income?.periodOverrides || {}) : {} 
    });
  };

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => {
        backdropMouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        if (backdropMouseDownTarget.current === e.target && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="bg-white dark:bg-[#242424] w-full max-w-lg rounded-t-[28px] sm:rounded-[26px] border-t sm:border border-[#E6E2D8] dark:border-[#383838] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[#D6D1C7] dark:bg-[#3D3D3D] rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[#E6E2D8] dark:border-[#383838]">
          <div className="flex justify-start">
            <button
              key="icon"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowIconSelector(true);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 active:scale-95 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] shrink-0"
              title={t('chooseIcon')}
            >
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : isEmojiString(icon) ? (
                icon
              ) : (
                (() => {
                  const Icon = ICON_MAP[icon] || Banknote;
                  return <Icon size={20} className="text-accent" />;
                })()
              )}
            </button>
          </div>
          <div className="flex justify-center overflow-hidden">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] text-center truncate px-2">
              {income ? t('edit') : t('newIncome')}
            </h2>
          </div>
          <div className="flex justify-end">
            <IconButton 
              icon={<X size={18} strokeWidth={2} />} 
              onClick={onClose} 
              variant="muted" 
              size="sm" 
              aria-label={t('close')}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="shrink overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          {/* Amount Inputs Section */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="bg-[var(--surface-muted)]/50 rounded-[16px] py-5 px-5 flex items-center justify-between transition-all cursor-text border border-[var(--border-color)] group"
              >
                <div className="shrink-0 flex items-center min-w-[72px]" />
                <div className="flex-1 flex justify-center">
                  <input
                    ref={amountInputRef}
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(formatAmount(e.target.value))}
                    onBlur={() => setAmount(evaluateAndFormatAmount(amount))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setAmount(evaluateAndFormatAmount(amount));
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-transparent text-[var(--text-primary)] outline-none font-amount text-[32px] sm:text-[34px] font-medium text-center tracking-tight leading-none placeholder:[var(--text-tertiary)]/30"
                  />
                </div>
                <div className="shrink-0 flex items-center justify-end min-w-[72px]">
                  <span className="text-xs font-semibold text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-3 py-1.5 rounded-full group-focus-within:bg-[var(--accent-color)]/20 transition-colors">
                    {currency}
                  </span>
                </div>
              </div>

              <QuickMathToolbar value={amount} onChange={setAmount} inputRef={amountInputRef} currency={currency} showMathTools={false} />
            </div>

            <div className="flex items-center justify-between px-5 py-4 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] transition-all">
              <div className="flex flex-col gap-0.5 pr-2">
                <span className="text-[13.5px] font-semibold text-[var(--text-primary)] tracking-tight">Varierande belopp</span>
                <span className="text-[11.5px] font-normal text-[var(--text-secondary)] opacity-70 tracking-tight leading-none">Ändras månad till månad</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVariable(!isVariable)}
                className={`w-12 h-7 rounded-full relative transition-colors duration-300 shrink-0 cursor-pointer ${isVariable ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-xs ${isVariable ? 'left-6' : 'left-1'}`}
                />
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1">
                {t('incomePayerLabel')}
              </label>
              {autoLogo && !manualSelectionThisSession && name !== originalName.current && (
                <span className="text-[10px] font-bold text-[#05B862] bg-[#E8F8F0] dark:bg-[#0D2E1F] px-2 py-0.5 rounded-full animate-pulse">
                  Auto
                </span>
              )}
            </div>
            <div className="relative group">
              <input 
                ref={nameInputRef}
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder={t('incomePayerPlaceholder')} 
                className="w-full h-[48px] bg-[#F7F5F0] dark:bg-[#2D2D2D] text-sm font-semibold text-[#1C1917] dark:text-white outline-none transition-all placeholder-[#8C867C] dark:placeholder-[#71717A] rounded-[14px] px-4 border border-[#E6E2D8] dark:border-[#383838] focus:border-[#1C1917] dark:focus:border-white" 
              />
              {name && (
                <button 
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C867C] hover:text-[#1C1917] dark:text-[#71717A] dark:hover:text-white p-1 cursor-pointer"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5 block">Egen notering</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Skriv en notering..."
              className="w-full bg-[#F7F5F0] dark:bg-[#2D2D2D] text-sm font-semibold text-[#1C1917] dark:text-white outline-none transition-all placeholder-[#8C867C] dark:placeholder-[#71717A] rounded-[14px] px-4 py-3 border border-[#E6E2D8] dark:border-[#383838] focus:border-[#1C1917] dark:focus:border-white min-h-[90px] resize-none"
            />
          </div>

          {/* Arrival Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5 block">{t('arrivalDay')}</label>
            <div className="relative">
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="w-full h-[48px] appearance-none bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] rounded-[14px] px-4 text-[14px] font-normal text-[#1C1917] dark:text-white focus:border-[#1C1917] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867C] dark:text-[#71717A]" />
            </div>
          </div>

          <div className={`grid gap-3 ${frequency !== Frequency.MONTHLY ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5 block">{t('frequency')}</label>
              <div className="relative">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full h-[48px] appearance-none bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] rounded-[14px] px-4 text-[14px] font-normal text-[#1C1917] dark:text-white focus:border-[#1C1917] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                >
                  {(Object.keys(Frequency) as Array<keyof typeof Frequency>).map(key => (
                    <option key={key} value={Frequency[key]}>{t(`freq_${key.toLowerCase()}` as TranslationKey)}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867C] dark:text-[#71717A]" />
              </div>
            </div>

            {frequency !== Frequency.MONTHLY && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5 block">{t('startMonthLabel')}</label>
                <div className="relative">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(parseInt(e.target.value))}
                    className="w-full h-[48px] appearance-none bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] rounded-[14px] px-4 text-[14px] font-normal text-[#1C1917] dark:text-white focus:border-[#1C1917] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date(2024, i, 1);
                      const monthName = date.toLocaleString(config?.language || 'sv-SE', { month: 'long' });
                      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                      
                      let cycleText = '';
                      if (frequency === Frequency.QUARTERLY) {
                        const m2 = (i + 3) % 12;
                        const m3 = (i + 6) % 12;
                        const m4 = (i + 9) % 12;
                        const getMonthShort = (idx: number) => new Date(2024, idx, 1).toLocaleString(config?.language || 'sv-SE', { month: 'short' });
                        cycleText = ` (${getMonthShort(i)}, ${getMonthShort(m2)}, ${getMonthShort(m3)}, ${getMonthShort(m4)})`;
                      } else if (frequency === Frequency.SEMI_ANNUALLY) {
                        const m2 = (i + 6) % 12;
                        const getMonthShort = (idx: number) => new Date(2024, idx, 1).toLocaleString(config?.language || 'sv-SE', { month: 'short' });
                        cycleText = ` (${getMonthShort(i)}, ${getMonthShort(m2)})`;
                      }

                      return (
                        <option key={i} value={i}>
                          {capitalizedMonth}{cycleText}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-color)]/30">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-medium text-[var(--text-secondary)] ml-1">{t('category')}</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(categories || []).map(cat => {
                const isActive = category === cat.name;
                return (
                  <CategoryTile
                    key={cat.name}
                    name={cat.name}
                    icon={cat.icon}
                    color={cat.color}
                    isActive={isActive}
                    onClick={() => setCategory(cat.name)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="shrink-0 px-6 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-[var(--border-color)] bg-[var(--bg-color)]">
          <Button 
            type="button"
            onClick={handleSave} 
            variant="primary"
            fullWidth
            size="lg"
            icon={<Check size={18} strokeWidth={2.5} />}
          >
            {income ? t('saveChanges') : t('addIncome')}
          </Button>
        </div>

        {/* Compact Icon Selector Popover */}
        <AnimatePresence>
          {showIconSelector && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIconSelector(false)}
                className="absolute inset-0 bg-black/60"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[18px] border border-[var(--border-color)] relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <IconButton 
                    icon={<X size={16} strokeWidth={1.5} />}
                    onClick={() => setShowIconSelector(false)}
                    variant="muted"
                    size="sm"
                    aria-label={t('close')}
                  />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                  <IconSelector
                    name={name}
                    currentLogo={logo}
                    currentIcon={icon}
                    onLogoChange={(newLogo) => {
                      setLogo(newLogo);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    onIconChange={(newIcon) => {
                      setIcon(newIcon);
                      setLogo(undefined);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    isPro={isPro}
                    userId={userId}
                    onRestoreAuto={() => {
                      setManualSelectionThisSession(false);
                      setLogo(undefined);
                      setIcon('receipt');
                      setShowIconSelector(false);
                    }}
                    t={t}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={t('delete')}
          message={t('deleteConfirm')}
          onConfirm={() => {
            onDelete?.();
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          t={t}
        />
      )}
    </motion.div>
  );
}

// --- Fixed Expense View Modal ---

interface FixedExpenseViewModalProps {
  expense: FixedExpense;
  onClose: () => void;
  onEdit: (expense: FixedExpense) => void;
  onDelete: (id: string) => void;
  t: (key: TranslationKey) => string;
  currency: string;
  config: Config;
  currentPeriodId: string;
}

export function FixedExpenseViewModal({ expense, onClose, onEdit, onDelete, t, currency, config, currentPeriodId }: FixedExpenseViewModalProps) {
  useScrollLock(true);
  const dragControls = useDragControls();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const expenseCompatible = {
    ...expense,
    note: expense.name,
    type: 'expense' as const,
    timestamp: Date.now()
  };

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const displayAmount = (expense.isVariable && expense.periodOverrides && currentPeriodId && expense.periodOverrides[currentPeriodId] !== undefined)
    ? expense.periodOverrides[currentPeriodId]
    : expense.amount;

  const freqKey = Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === expense.frequency)?.toLowerCase();
  const freqText = freqKey ? t(`freq_${freqKey}` as TranslationKey) : 'Månadsvis';
  const categoryName = typeof expense.category === 'object' ? (expense.category as any)?.name : (expense.category || 'Övrigt');

  // Next payment date calculation demo
  const nextPaymentDate = '31 okt. 2026';
  const historyDate = '1 okt. 2026';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4"
      onMouseDown={(e) => {
        backdropMouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        if (backdropMouseDownTarget.current === e.target && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.75 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 70 || info.velocity.y > 350) {
            onClose();
          }
        }}
        className="bg-gradient-to-b from-[#2A1742] via-[#181124] to-[#111011] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border border-white/[0.08] relative max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pb-6 font-sans text-[#F7F5F7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full pt-3 pb-1 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="w-12 h-1.5 bg-white/25 rounded-full" />
        </div>

        {/* Header with Redigera button */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <TransactionLogo transaction={expenseCompatible as any} config={config} size="lg" />
          </div>
          
          <button 
            type="button"
            onClick={() => onEdit(expense)} 
            className="px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white text-[14px] font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>{t('edit')}</span>
          </button>
        </div>

        {/* Title and Large Amount */}
        <div className="px-6 pt-2 pb-5 shrink-0">
          <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-white leading-tight truncate">
            {expense.name}
          </h2>
          <div className="mt-1 flex items-baseline gap-1.5 font-amount">
            <span className="text-[38px] sm:text-[44px] font-bold tracking-tight text-white tabular-nums">
              {formatAmount(displayAmount, config.language)}
            </span>
            <span className="text-[18px] sm:text-[20px] font-medium text-[#B3ADB7]">
              {currency}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4 custom-scrollbar touch-pan-y overscroll-contain min-h-0 pb-4">
          
          {/* Details list card */}
          <div className="bg-[#211F22] rounded-[24px] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
            
            {/* Fakturering */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-[14px] text-[#B3ADB7]">Fakturering</span>
              <span className="text-[15px] font-medium text-white text-right">{freqText}</span>
            </div>

            {/* Nästa betalning */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-[14px] text-[#B3ADB7]">Nästa betalning</span>
              <span className="text-[15px] font-medium text-white text-right tabular-nums">{nextPaymentDate}</span>
            </div>

            {/* Totalt spenderat */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-[14px] text-[#B3ADB7]">Totalt spenderat</span>
              <span className="text-[15px] font-medium text-white text-right tabular-nums">
                {formatAmount(displayAmount, config.language)} {currency}
              </span>
            </div>

            {/* Prenumererad */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-[14px] text-[#B3ADB7]">Prenumererad</span>
              <span className="text-[15px] font-medium text-white text-right">0 dygn</span>
            </div>

            {/* Kategori */}
            <div className="p-4 flex items-center justify-between">
              <span className="text-[14px] text-[#B3ADB7]">{t('category')}</span>
              <span className="text-[15px] font-medium text-white text-right">{categoryName}</span>
            </div>
          </div>

          {/* Faktureringshistorik Sub-card */}
          <div className="bg-[#211F22] rounded-[24px] border border-white/[0.08] p-4 flex items-center justify-between">
            <div>
              <p className="text-[16px] font-semibold text-white mb-1">Faktureringshistorik</p>
              <div className="flex items-center gap-3 text-[14px]">
                <span className="text-[#B3ADB7] tabular-nums">{historyDate}</span>
                <span className="text-white font-medium">Prenumererad</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => onEdit(expense)}
              className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.12] flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
              aria-label={t('edit')}
            >
              <Pencil size={15} strokeWidth={1.75} />
            </button>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[var(--color-accent,#635BFF)] to-[var(--color-accent,#635BFF)] opacity-95 hover:opacity-100 text-white font-semibold text-[16px] shadow-lg transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Markera som avbruten</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-center text-[#B3ADB7] hover:text-white text-[14px] font-medium transition-colors cursor-pointer"
            >
              Ta bort prenumeration
            </button>
          </div>

        </div>
      </motion.div>

      <div>
        {showDeleteConfirm && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title={t('delete')}
            message={t('deleteConfirm')}
            onConfirm={() => {
              onDelete(expense.id);
              onClose();
            }}
            onCancel={() => setShowDeleteConfirm(false)}
            t={t}
          />
        )}

        {/* AI Cancellation Assistant Modal */}
        {isCancelModalOpen && (
          <CancelSubscriptionModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            expense={expense}
            config={config}
            onDeleteExpense={(id) => {
              onDelete(id);
              onClose();
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

// --- Fixed Expense Modal ---

interface FixedExpenseModalProps {
  expense?: FixedExpense | null;
  onClose: () => void;
  onSave: (expense: Omit<FixedExpense, 'id'>) => void;
  onDelete?: () => void;
  t: (key: TranslationKey) => string;
  currency: string;
  userId?: string;
  isPro: boolean;
  paymentMethods: any[];
}

export function FixedExpenseModal({ expense, onClose, onSave, onDelete, t, currency, categories, userId, isPro, paymentMethods, _currentPeriodId, config }: FixedExpenseModalProps & { categories: Category[], _currentPeriodId?: string, currentPeriodId?: string, config: Config }) {
  useScrollLock(true);
  const [amount, setAmount] = useState(formatAmount(expense?.amount || ''));
  const [note, setNote] = useState(expense?.note || '');
  
  const [category, setCategory] = useState(typeof expense?.category === 'object' ? (expense.category as any)?.name : (expense?.category || (categories && categories.length > 0 ? categories[0].name : '')));
  const [name, setName] = useState(expense?.name || '');
  const [deductionDay, setDeductionDay] = useState(expense?.deductionDay || 1);
  const [startMonth, setStartMonth] = useState(expense?.startMonth ?? new Date().getMonth());
  const [frequency, setFrequency] = useState(expense?.frequency || Frequency.MONTHLY);
  const firstPaymentMethod = paymentMethods && paymentMethods.length > 0 ? (typeof paymentMethods[0] === 'string' ? paymentMethods[0] : paymentMethods[0]?.name) : 'Autogiro';
  const [paymentMethod, setPaymentMethod] = useState(typeof expense?.paymentMethod === 'string' ? expense.paymentMethod : (expense?.paymentMethod as any)?.name || firstPaymentMethod);
  const [isVariable, setIsVariable] = useState(expense?.isVariable || false);
  const [icon, setIcon] = useState(expense?.icon || '🏠');
  const originalName = useRef(expense?.name || '');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  
  const [logo, setLogo] = useState<string | undefined>(expense?.logo);
  const [autoLogo, setAutoLogo] = useState<string | undefined>(expense?.name ? getLogoUrl(expense.name) : undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!name || name.length < 2) {
      if (!manualSelectionThisSession) setLogo(undefined);
      setAutoLogo(undefined);
      return;
    }
    
    const timer = setTimeout(async () => {
      const url = await fetchLogoForName(name);
      setAutoLogo(url);
      
      // Auto-select if name changed and not manually picked this session
      if (url && !manualSelectionThisSession && (name !== originalName.current || !logo)) {
        setLogo(url);
        setIcon('none');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [name, manualSelectionThisSession]);

  const handleSave = () => {
    const parsedAmount = parseAmount(amount);

    onSave({ 
      name, 
      note,
      amount: parsedAmount, 
      frequency, 
      paymentMethod, 
      category, 
      icon, 
      logo, 
      deductionDay, 
      startMonth: frequency === Frequency.MONTHLY ? undefined : startMonth,
      isVariable, 
      periodOverrides: isVariable ? (expense?.periodOverrides || {}) : {} 
    });
  };

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => {
        backdropMouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        if (backdropMouseDownTarget.current === e.target && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="bg-white dark:bg-[#242424] w-full max-w-lg rounded-t-[28px] sm:rounded-[26px] border-t sm:border border-[#E6E2D8] dark:border-[#383838] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[#D6D1C7] dark:bg-[#3D3D3D] rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[#E6E2D8] dark:border-[#383838]">
          <div className="flex justify-start">
            <button
              key="icon"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowIconSelector(true);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 active:scale-95 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] shrink-0"
              title={t('chooseIcon')}
            >
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : isEmojiString(icon) ? (
                icon
              ) : (
                (() => {
                  const Icon = ICON_MAP[icon] || Receipt;
                  return <Icon size={20} className="text-accent" />;
                })()
              )}
            </button>
          </div>
          <div className="flex justify-center overflow-hidden">
            <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-[#211F1C] dark:text-white text-center truncate px-2">
              {expense 
                ? (config?.language === 'en' ? 'Edit fixed expense' : 'Redigera fast utgift')
                : (config?.language === 'en' ? 'New fixed expense' : 'Ny fast utgift')
              }
            </h2>
          </div>
          <div className="flex justify-end">
            <IconButton 
              icon={<X size={18} strokeWidth={2} />} 
              onClick={onClose} 
              variant="muted" 
              size="sm" 
              aria-label={t('close')}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="shrink overflow-y-auto px-5 sm:px-6 py-5 space-y-5 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          {/* Amount Inputs Section: 88px height, 40px font-medium, plain kr text */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="bg-[#EAE6DE] dark:bg-white/[0.04] rounded-[12px] h-[88px] px-4 sm:px-5 flex items-center justify-between transition-all border border-[#E2DDD4] dark:border-white/[0.06] focus-within:border-[#211F1C] dark:focus-within:border-white group cursor-text"
              >
                <div className="shrink-0 min-w-[48px]" />
                <div className="flex-1 flex items-baseline justify-center gap-1.5">
                  <input 
                    ref={amountInputRef}
                    type="text" 
                    inputMode="decimal"
                    value={amount} 
                    onChange={(e) => setAmount(formatAmount(e.target.value))}
                    onBlur={() => setAmount(evaluateAndFormatAmount(amount))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setAmount(evaluateAndFormatAmount(amount));
                      }
                    }}
                    placeholder="0" 
                    className="w-full bg-transparent text-[#211F1C] dark:text-white outline-none font-amount text-[32px] sm:text-[34px] font-medium text-center tracking-tight leading-none placeholder:font-normal placeholder-[#777168]/40 dark:placeholder-white/30" 
                  />
                  <span className="text-[15px] font-normal text-[#6D6962] dark:text-[#A8A8A8] select-none font-sans shrink-0">
                    {currency}
                  </span>
                </div>
                <div className="shrink-0 min-w-[48px]" />
              </div>

              <QuickMathToolbar value={amount} onChange={setAmount} inputRef={amountInputRef} currency={currency} showMathTools={false} />
            </div>

            {/* Varierande belopp: compact row with text and switch + help text */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#EAE6DE] dark:bg-white/[0.04] border border-[#E2DDD4] dark:border-white/[0.06] rounded-[12px] transition-all">
              <div className="flex flex-col gap-0.5 pr-2">
                <span className="text-[14px] font-medium text-[#211F1C] dark:text-white tracking-tight">Varierande belopp</span>
                <span className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8]">Ändras månad till månad</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVariable(!isVariable)}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer ${isVariable ? 'bg-[#635BFF]' : 'bg-[#D5CFC4] dark:bg-[#444444]'}`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-xs ${isVariable ? 'left-[22px]' : 'left-0.5'}`}
                />
              </button>
            </div>
          </div>

          {/* Name / Provider Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8]">
                {config?.language === 'en' ? 'Provider / Name' : 'Leverantör'}
              </label>
              {autoLogo && !manualSelectionThisSession && name !== originalName.current && (
                <span className="text-[10px] font-semibold text-[#05B862] bg-[#E8F8F0] dark:bg-[#0D2E1F] px-2 py-0.5 rounded-full">
                  Auto
                </span>
              )}
            </div>
            <div className="relative group">
              <input 
                ref={nameInputRef}
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder={t('fixedExpensePlaceholder')} 
                className="w-full h-[48px] bg-[#EAE6DE] dark:bg-[#2D2D2D] text-[14px] font-normal text-[#211F1C] dark:text-white outline-none transition-all placeholder:font-normal placeholder-[#777168] dark:placeholder-[#71717A] rounded-[12px] px-4 border border-[#E2DDD4] dark:border-[#383838] focus:border-[#211F1C] dark:focus:border-white" 
              />
              {name && (
                <button 
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777168] hover:text-[#211F1C] dark:text-[#71717A] dark:hover:text-white p-1 cursor-pointer"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <label className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block">
              {t('ownNote')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Skriv en notering..."
              rows={2}
               className="w-full bg-[#EAE6DE] dark:bg-[#2D2D2D] text-[14px] font-normal text-[#211F1C] dark:text-white outline-none transition-all placeholder:font-normal placeholder-[#777168] dark:placeholder-[#71717A] rounded-[12px] px-4 py-3 border border-[#E2DDD4] dark:border-[#383838] focus:border-[#211F1C] dark:focus:border-white min-h-[48px] resize-y"
            />
          </div>

          {/* Deduction Day & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block">
                {paymentMethod === 'autogiro' || (typeof paymentMethod === 'string' && (paymentMethod.toLowerCase().includes('autogiro') || paymentMethod.toLowerCase().includes('kort')))
                  ? (config?.language === 'en' ? 'Deduction day' : 'Dragningsdag')
                  : (config?.language === 'en' ? 'Payment day' : 'Betaldag')}
              </label>
              <div className="relative">
                <select
                  value={deductionDay}
                  onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                  className="w-full h-[48px] appearance-none bg-[#EAE6DE] dark:bg-[#2D2D2D] border border-[#E2DDD4] dark:border-[#383838] rounded-[12px] px-4 text-[14px] font-normal text-[#211F1C] dark:text-white focus:border-[#211F1C] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#777168] dark:text-[#71717A]" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block">{t('paymentMethod')}</label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-[48px] appearance-none bg-[#EAE6DE] dark:bg-[#2D2D2D] border border-[#E2DDD4] dark:border-[#383838] rounded-[12px] px-4 text-[14px] font-normal text-[#211F1C] dark:text-white focus:border-[#211F1C] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                >
                  {(paymentMethods || []).map((method, idx) => {
                    const methodName = typeof method === 'string' ? method : method?.name || '';
                    return (
                      <option key={methodName || idx} value={methodName}>{methodName}</option>
                    );
                  })}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#777168] dark:text-[#71717A]" />
              </div>
            </div>
          </div>

          <div className={`grid gap-3 ${frequency !== Frequency.MONTHLY ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-2">
              <label className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block">{t('frequency')}</label>
              <div className="relative">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full h-[48px] appearance-none bg-[#EAE6DE] dark:bg-[#2D2D2D] border border-[#E2DDD4] dark:border-[#383838] rounded-[12px] px-4 text-[14px] font-normal text-[#211F1C] dark:text-white focus:border-[#211F1C] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                >
                  {(Object.keys(Frequency) as Array<keyof typeof Frequency>).map(key => (
                    <option key={key} value={Frequency[key]}>{t(`freq_${key.toLowerCase()}` as TranslationKey)}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#777168] dark:text-[#71717A]" />
              </div>
            </div>

            {frequency !== Frequency.MONTHLY && (
              <div className="space-y-2">
                <label className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block">{t('startMonthLabel')}</label>
                <div className="relative">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(parseInt(e.target.value))}
                    className="w-full h-[48px] appearance-none bg-[#EAE6DE] dark:bg-[#2D2D2D] border border-[#E2DDD4] dark:border-[#383838] rounded-[12px] px-4 text-[14px] font-normal text-[#211F1C] dark:text-white focus:border-[#211F1C] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date(2024, i, 1);
                      const monthName = date.toLocaleString(config?.language || 'sv-SE', { month: 'long' });
                      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                      
                      let cycleText = '';
                      if (frequency === Frequency.QUARTERLY) {
                        const m2 = (i + 3) % 12;
                        const m3 = (i + 6) % 12;
                        const m4 = (i + 9) % 12;
                        const getMonthShort = (idx: number) => new Date(2024, idx, 1).toLocaleString(config?.language || 'sv-SE', { month: 'short' });
                        cycleText = ` (${getMonthShort(i)}, ${getMonthShort(m2)}, ${getMonthShort(m3)}, ${getMonthShort(m4)})`;
                      } else if (frequency === Frequency.SEMI_ANNUALLY) {
                        const m2 = (i + 6) % 12;
                        const getMonthShort = (idx: number) => new Date(2024, idx, 1).toLocaleString(config?.language || 'sv-SE', { month: 'short' });
                        cycleText = ` (${getMonthShort(i)}, ${getMonthShort(m2)})`;
                      }

                      return (
                        <option key={i} value={i}>
                          {capitalizedMonth}{cycleText}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2 pt-1">
            <label className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] block">{t('category')}</label>
            <button
              type="button"
              onClick={() => setIsCategorySelectorOpen(true)}
              className="w-full h-[48px] bg-[#EAE6DE] dark:bg-[#2D2D2D] border border-[#E2DDD4] dark:border-[#383838] rounded-[12px] px-4 flex items-center justify-between text-[14px] font-normal text-[#211F1C] dark:text-white transition-all cursor-pointer hover:border-[#211F1C] dark:hover:border-white"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CategoryIcon icon={categories.find(c => c.name === category)?.icon || 'receipt'} size="xs" />
                <span className="truncate">{category || (config?.language === 'en' ? 'Select category' : 'Välj kategori')}</span>
              </div>
              <ChevronRight size={16} className="text-[#777168] dark:text-[#71717A] shrink-0" />
            </button>
          </div>

          {/* Category Selector Bottom Sheet Modal */}
          {isCategorySelectorOpen && createPortal(
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategorySelectorOpen(false)} />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#242424] rounded-t-[24px] sm:rounded-[20px] border border-[#E2DDD4] dark:border-[#383838] shadow-2xl max-h-[80dvh] h-auto flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-[#D6D1C7] dark:bg-[#3D3D3D] rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
                <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-[#E2DDD4] dark:border-[#383838] shrink-0">
                  <h3 className="text-[18px] font-semibold text-[#211F1C] dark:text-white tracking-tight">{t('category')}</h3>
                  <button
                    type="button"
                    onClick={() => setIsCategorySelectorOpen(false)}
                    className="w-8 h-8 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] hover:bg-[#EDE9DF] dark:hover:bg-[#383838] text-[#6D6962] dark:text-[#A8A8A8] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <div className="p-3 overflow-y-auto space-y-1 shrink min-h-0 custom-scrollbar">
                  {(categories || []).map(cat => {
                    const isSelected = category === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setCategory(cat.name);
                          setIsCategorySelectorOpen(false);
                        }}
                        className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-[12px] transition-all cursor-pointer text-left ${
                          isSelected ? 'bg-[#EAE6DE] dark:bg-[#2D2D2D] text-[#211F1C] dark:text-white font-medium' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/[0.04] text-[#6D6962] dark:text-[#A8A8A8]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                          <span className="text-[15px] font-normal">{cat.name}</span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#211F1C] dark:bg-white text-white dark:text-[#211F1C] flex items-center justify-center shrink-0">
                            <Check size={12} strokeWidth={2.5} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>,
            document.body
          )}

          {expense && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full p-3.5 rounded-[12px] bg-[var(--surface-muted)] dark:bg-[#2D2D2D] hover:bg-[var(--surface-hover)] dark:hover:bg-[#333333] border border-[#E2DDD4] dark:border-[#383838] flex items-center justify-between group transition-all cursor-pointer active:scale-[0.99] text-left"
              >
                <div>
                  <p className="text-[14px] font-medium text-[#211F1C] dark:text-white">
                    {config?.language === 'en' ? 'Show how to cancel' : 'Visa hur du säger upp'}
                  </p>
                  <p className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8] mt-0.5">
                    {config?.language === 'en' ? 'Instructions and link to provider' : 'Instruktioner och länk till leverantören'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-[#6D6962] dark:text-[#A8A8A8] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Action Button Footer */}
        <div className="shrink-0 px-6 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-[var(--border-color)] bg-[var(--bg-color)]">
          <Button 
            type="button"
            onClick={handleSave} 
            variant="primary"
            fullWidth
            size="lg"
            icon={<Check size={18} strokeWidth={2.5} />}
          >
            {expense ? t('saveChanges') : t('addFixedExpense')}
          </Button>
        </div>

        {/* Compact Icon Selector Popover */}
        <AnimatePresence>
          {showIconSelector && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIconSelector(false)}
                className="absolute inset-0 bg-black/60"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[18px] border border-[var(--border-color)] relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <IconButton 
                    icon={<X size={16} strokeWidth={1.5} />}
                    onClick={() => setShowIconSelector(false)}
                    variant="muted"
                    size="sm"
                    aria-label={t('close')}
                  />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                  <IconSelector
                    name={name}
                    currentLogo={logo}
                    currentIcon={icon}
                    onLogoChange={(newLogo) => {
                      setLogo(newLogo);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    onIconChange={(newIcon) => {
                      setIcon(newIcon);
                      setLogo(undefined);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    isPro={isPro}
                    userId={userId}
                    onRestoreAuto={() => {
                      setManualSelectionThisSession(false);
                      setLogo(undefined);
                      setIcon('receipt');
                      setShowIconSelector(false);
                    }}
                    t={t}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={t('delete')}
          message={t('deleteConfirm')}
          onConfirm={() => {
            onDelete?.();
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          t={t}
        />
      )}

      {isCancelModalOpen && expense && (
        <CancelSubscriptionModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          expense={expense}
          config={config || { language: 'sv', currency: 'kr' } as any}
          onDeleteExpense={() => {
            onDelete?.();
            onClose();
          }}
        />
      )}
    </motion.div>
  );
}

// --- Monthly Saving View Modal ---

interface MonthlySavingViewModalProps {
  saving: MonthlySaving;
  onClose: () => void;
  onEdit: (saving: MonthlySaving) => void;
  onDelete: (id: string) => void;
  t: (key: TranslationKey) => string;
  currency: string;
  config: Config;
}

export function MonthlySavingViewModal({ saving, onClose, onEdit, onDelete, t, currency, config }: MonthlySavingViewModalProps) {
  useScrollLock(true);
  const dragControls = useDragControls();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const expenseCompatible = {
    ...saving,
    note: saving.name,
    type: 'savings' as const,
    timestamp: Date.now()
  };

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => {
        backdropMouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        if (backdropMouseDownTarget.current === e.target && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.75 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 70 || info.velocity.y > 350) {
            onClose();
          }
        }}
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[22px] rounded-b-none sm:rounded-[22px] border-t sm:border border-[var(--border-color)] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full py-2.5 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="w-10 h-1 bg-[var(--border-color)] hover:bg-[var(--text-secondary)]/50 rounded-full transition-colors" />
        </div>

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[var(--border-color)]">
          <div className="flex justify-start">
            <TransactionLogo transaction={expenseCompatible as any} config={config} size="sm" />
          </div>
          <div className="flex justify-center overflow-hidden">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate text-center px-2">
              {saving.name}
            </h2>
          </div>
          <div className="flex justify-end">
            <IconButton 
              icon={<X size={17} />} 
              onClick={onClose} 
              variant="muted" 
              size="sm" 
              aria-label={t('close')}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          {/* Actions Bar */}
          <div className="flex justify-end gap-2 pt-1">
            <IconButton 
              icon={<Pencil size={15} />} 
              onClick={() => onEdit(saving)} 
              variant="muted" 
              size="sm" 
              aria-label={t('edit')}
              title={t('edit')}
            />
            <IconButton 
              icon={<Trash2 size={15} />} 
              onClick={() => setShowDeleteConfirm(true)} 
              variant="danger" 
              size="sm" 
              aria-label={t('delete')}
              title={t('delete')}
            />
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#312f2f] p-4 sm:p-5 rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.05] shadow-xs dark:shadow-none">
            <p className="text-[13px] font-normal text-[#6D6962] dark:text-[#A8A8A8] mb-1">{t('amount')}</p>
            <p className="text-[22px] sm:text-[24px] font-semibold text-[#211F1C] dark:text-white font-amount tabular-nums">
              <span className="opacity-75 mr-0.5">→</span>
              <span className="font-amount">{formatAmount(saving.amount)}</span>
              <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] ml-[3px] font-sans">{currency}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FFFFFF] dark:bg-[#312f2f] p-4 rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.05] col-span-2 shadow-xs dark:shadow-none">
              <p className="text-xs font-medium text-[#6E6961] dark:text-[var(--text-secondary)] opacity-75 mb-1.5">{t('savingsGoal') || 'Sparmål'}</p>
              <p className="text-base font-medium text-[#1C1917] dark:text-white break-words">{saving.name}</p>
            </div>

            <div className="bg-[#FFFFFF] dark:bg-[#312f2f] p-4 rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.05] col-span-2 shadow-xs dark:shadow-none">
              <p className="text-xs font-medium text-[#6E6961] dark:text-[var(--text-secondary)] opacity-75 mb-1.5">{t('type')}</p>
              <div className="flex items-center gap-2.5">
                <CategoryIcon 
                  icon={saving.icon || 'piggy-bank'} 
                  size="sm" 
                />
                <p className="text-base font-medium text-[#1C1917] dark:text-white break-words">
                  {t('monthlySavings')}
                </p>
              </div>
            </div>

            {saving.deductionDay ? (
              <div className="bg-[#FFFFFF] dark:bg-[#312f2f] p-4 rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.05] shadow-xs dark:shadow-none">
                <p className="text-xs font-medium text-[#6E6961] dark:text-[var(--text-secondary)] opacity-75 mb-1.5">{t('deductionDay')}</p>
                <p className="text-base font-medium text-[#1C1917] dark:text-white">{`${saving.deductionDay}e`}</p>
              </div>
            ) : null}

            {saving.paymentMethod ? (
              <div className="bg-[#FFFFFF] dark:bg-[#312f2f] p-4 rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.05] shadow-xs dark:shadow-none">
                <p className="text-xs font-medium text-[#6E6961] dark:text-[var(--text-secondary)] opacity-75 mb-1.5">{t('paymentMethod')}</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const methodStr = typeof saving.paymentMethod === 'object' ? (saving.paymentMethod as any)?.name : (saving.paymentMethod || '');
                    const PaymentIcon = getPaymentMethodIcon(methodStr);
                    return <span className="text-[#6E6961] dark:text-[var(--text-secondary)]"><PaymentIcon size={16} /></span>;
                  })()}
                  <p className="text-base font-medium text-[#1C1917] dark:text-white break-words">
                    {typeof saving.paymentMethod === 'object' ? (saving.paymentMethod as any)?.name : saving.paymentMethod}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <div>
        {showDeleteConfirm && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title={t('delete')}
            message={t('deleteConfirm')}
            onConfirm={() => {
              onDelete(saving.id);
              onClose();
            }}
            onCancel={() => setShowDeleteConfirm(false)}
            t={t}
          />
        )}
      </div>
    </motion.div>
  );
}

// --- Monthly Saving Modal ---

interface MonthlySavingModalProps {
  saving?: MonthlySaving | null;
  onClose: () => void;
  onSave: (saving: Omit<MonthlySaving, 'id'>) => void;
  onDelete?: () => void;
  t: (key: TranslationKey) => string;
  currency: string;
  userId?: string;
  isPro: boolean;
}

export function MonthlySavingModal({ saving, onClose, onSave, onDelete, t, currency, userId, isPro, paymentMethods, _currentPeriodId, config }: MonthlySavingModalProps & { paymentMethods: any[], _currentPeriodId?: string, currentPeriodId?: string, config: Config }) {
  useScrollLock(true);
  const [name, setName] = useState(saving?.name || '');
  const [amount, setAmount] = useState(formatAmount(saving?.amount || ''));
  
  const [deductionDay, setDeductionDay] = useState(saving?.deductionDay || 25);
  const [startMonth, setStartMonth] = useState(saving?.startMonth ?? new Date().getMonth());
  const [frequency, setFrequency] = useState(saving?.frequency || Frequency.MONTHLY);
  const firstPaymentMethod = paymentMethods && paymentMethods.length > 0 ? (typeof paymentMethods[0] === 'string' ? paymentMethods[0] : paymentMethods[0]?.name) : 'Autogiro';
  const [paymentMethod, setPaymentMethod] = useState(typeof saving?.paymentMethod === 'string' ? saving.paymentMethod : (saving?.paymentMethod as any)?.name || firstPaymentMethod);
  const [isVariable, setIsVariable] = useState(saving?.isVariable || false);
  const [icon, setIcon] = useState(saving?.icon || 'piggy-bank');
  const originalName = useRef(saving?.name || '');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  
  const [logo, setLogo] = useState<string | undefined>(saving?.logo);
  const [autoLogo, setAutoLogo] = useState<string | undefined>(saving?.name ? getLogoUrl(saving.name) : undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [showIconSelector, setShowIconSelector] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!name || name.length < 2) {
      if (!manualSelectionThisSession) setLogo(undefined);
      setAutoLogo(undefined);
      return;
    }
    
    const timer = setTimeout(async () => {
      const url = await fetchLogoForName(name);
      setAutoLogo(url);
      
      // Auto-select if name changed and not manually picked this session
      if (url && !manualSelectionThisSession && (name !== originalName.current || !logo)) {
        setLogo(url);
        setIcon('none');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [name, manualSelectionThisSession]);

  const handleSave = () => {
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      amountInputRef.current?.focus();
      return;
    }

    const finalName = name.trim() || t('monthlySavings') || 'Månadssparande';

    onSave({ 
      name: finalName, 
      amount: parsedAmount, 
      icon, 
      logo, 
      deductionDay, 
      startMonth: frequency === Frequency.MONTHLY ? undefined : startMonth,
      frequency,
      paymentMethod, 
      isVariable, 
      periodOverrides: isVariable ? (saving?.periodOverrides || {}) : {} 
    });
  };

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => {
        backdropMouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        if (backdropMouseDownTarget.current === e.target && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="bg-white dark:bg-[#242424] w-full max-w-lg rounded-t-[28px] sm:rounded-[26px] border-t sm:border border-[#E6E2D8] dark:border-[#383838] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[#D6D1C7] dark:bg-[#3D3D3D] rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[#E6E2D8] dark:border-[#383838]">
          <div className="flex justify-start">
            <button
              key="icon"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowIconSelector(true);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 active:scale-95 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] shrink-0"
              title={t('chooseIcon')}
            >
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : isEmojiString(icon) ? (
                icon
              ) : (
                (() => {
                  const Icon = ICON_MAP[icon] || PiggyBank;
                  return <Icon size={20} className="text-accent" />;
                })()
              )}
            </button>
          </div>
          <div className="flex justify-center overflow-hidden">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] text-center truncate px-2">
              {saving ? `${t('edit')} ${saving.name}` : `${t('new')} ${t('monthlySavings').toLowerCase()}`}
            </h2>
          </div>
          <div className="flex justify-end">
            <IconButton 
              icon={<X size={18} strokeWidth={2} />} 
              onClick={onClose} 
              variant="muted" 
              size="sm" 
              aria-label={t('close')}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="shrink overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          {/* Amount Inputs Section */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="bg-[var(--surface-muted)]/50 rounded-[16px] py-5 px-5 flex items-center justify-between transition-all cursor-text border border-[var(--border-color)] group"
              >
                <div className="shrink-0 flex items-center min-w-[72px]" />
                <div className="flex-1 flex justify-center">
                  <input 
                    ref={amountInputRef}
                    type="text" 
                    inputMode="decimal"
                    value={amount} 
                    onChange={(e) => setAmount(formatAmount(e.target.value))}
                    onBlur={() => setAmount(evaluateAndFormatAmount(amount))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setAmount(evaluateAndFormatAmount(amount));
                      }
                    }}
                    placeholder="0" 
                    className="w-full bg-transparent text-[var(--text-primary)] outline-none font-amount text-[32px] sm:text-[34px] font-medium text-center tracking-tight leading-none placeholder:[var(--text-tertiary)]/30" 
                  />
                </div>
                <div className="shrink-0 flex items-center justify-end min-w-[72px]">
                  <span className="text-xs font-semibold text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-3 py-1.5 rounded-full group-focus-within:bg-[var(--accent-color)]/20 transition-colors">
                    {currency}
                  </span>
                </div>
              </div>

              <QuickMathToolbar value={amount} onChange={setAmount} inputRef={amountInputRef} currency={currency} showMathTools={false} />
            </div>

            <div className="flex items-center justify-between px-5 py-4 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] transition-all">
              <div className="flex flex-col gap-0.5 pr-2">
                <span className="text-[13.5px] font-semibold text-[var(--text-primary)] tracking-tight">Varierande belopp</span>
                <span className="text-[11.5px] font-normal text-[var(--text-secondary)] opacity-70 tracking-tight leading-none">Ändras månad till månad</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVariable(!isVariable)}
                className={`w-12 h-7 rounded-full relative transition-colors duration-300 shrink-0 cursor-pointer ${isVariable ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-xs ${isVariable ? 'left-6' : 'left-1'}`}
                />
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1">
                {t('whatAreYouSavingFor')}
              </label>
              {autoLogo && !manualSelectionThisSession && name !== originalName.current && (
                <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full animate-pulse">
                  Auto
                </span>
              )}
            </div>
            <div className="relative group">
              <input 
                ref={nameInputRef}
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder={t('savingsGoalPlaceholder')} 
                className="w-full h-[48px] bg-[#F7F5F0] dark:bg-[#2D2D2D] text-sm font-semibold text-[#1C1917] dark:text-white outline-none transition-all placeholder-[#8C867C] dark:placeholder-[#71717A] rounded-[14px] px-4 border border-[#E6E2D8] dark:border-[#383838] focus:border-[#1C1917] dark:focus:border-white" 
              />
              {name && (
                <button 
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C867C] hover:text-[#1C1917] dark:text-[#71717A] dark:hover:text-white p-1 cursor-pointer"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Deduction Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5 block">{t('deductionDay') || 'Dragningsdag'}</label>
            <div className="relative">
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="w-full h-[48px] appearance-none bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] rounded-[14px] px-4 text-[14px] font-normal text-[#1C1917] dark:text-white focus:border-[#1C1917] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867C] dark:text-[#71717A]" />
            </div>
          </div>

          <div className={`grid gap-3 ${frequency !== Frequency.MONTHLY ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5 block">{t('frequency')}</label>
              <div className="relative">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full h-[48px] appearance-none bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] rounded-[14px] px-4 text-[14px] font-normal text-[#1C1917] dark:text-white focus:border-[#1C1917] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                >
                  {(Object.keys(Frequency) as Array<keyof typeof Frequency>).map(key => (
                    <option key={key} value={Frequency[key]}>{t(`freq_${key.toLowerCase()}` as TranslationKey)}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867C] dark:text-[#71717A]" />
              </div>
            </div>

            {frequency !== Frequency.MONTHLY && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-0.5 block">{t('startMonthLabel')}</label>
                <div className="relative">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(parseInt(e.target.value))}
                    className="w-full h-[48px] appearance-none bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] rounded-[14px] px-4 text-[14px] font-normal text-[#1C1917] dark:text-white focus:border-[#1C1917] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date(2024, i, 1);
                      const monthName = date.toLocaleString(config?.language || 'sv-SE', { month: 'long' });
                      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                      
                      let cycleText = '';
                      if (frequency === Frequency.QUARTERLY) {
                        const m2 = (i + 3) % 12;
                        const m3 = (i + 6) % 12;
                        const m4 = (i + 9) % 12;
                        const getMonthShort = (idx: number) => new Date(2024, idx, 1).toLocaleString(config?.language || 'sv-SE', { month: 'short' });
                        cycleText = ` (${getMonthShort(i)}, ${getMonthShort(m2)}, ${getMonthShort(m3)}, ${getMonthShort(m4)})`;
                      } else if (frequency === Frequency.SEMI_ANNUALLY) {
                        const m2 = (i + 6) % 12;
                        const getMonthShort = (idx: number) => new Date(2024, idx, 1).toLocaleString(config?.language || 'sv-SE', { month: 'short' });
                        cycleText = ` (${getMonthShort(i)}, ${getMonthShort(m2)})`;
                      }

                      return (
                        <option key={i} value={i}>
                          {capitalizedMonth}{cycleText}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          {paymentMethods && paymentMethods.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1 block">{t('paymentMethod') || 'Betalsätt'}</label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-[48px] appearance-none bg-[#F7F5F0] dark:bg-[#2D2D2D] border border-[#E6E2D8] dark:border-[#383838] rounded-[14px] px-4 text-[14px] font-normal text-[#1C1917] dark:text-white focus:border-[#1C1917] dark:focus:border-white outline-none transition-all pr-10 cursor-pointer"
                >
                  {paymentMethods.map((pm: any) => {
                    const pmName = typeof pm === 'string' ? pm : pm.name;
                    return <option key={pmName} value={pmName}>{pmName}</option>;
                  })}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
              </div>
            </div>
          )}
        </div>

        {/* Action Button Footer */}
        <div className="shrink-0 px-6 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-[var(--border-color)] bg-[var(--bg-color)]">
          <Button 
            type="button"
            onClick={handleSave} 
            variant="primary"
            fullWidth
            size="lg"
            icon={<Check size={18} strokeWidth={2.5} />}
          >
            {saving ? t('saveChanges') : t('addSaving')}
          </Button>
        </div>

        {/* Compact Icon Selector Popover */}
        <AnimatePresence>
          {showIconSelector && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIconSelector(false)}
                className="absolute inset-0 bg-black/60"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[18px] border border-[var(--border-color)] relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <IconButton 
                    icon={<X size={16} strokeWidth={1.5} />}
                    onClick={() => setShowIconSelector(false)}
                    variant="muted"
                    size="sm"
                    aria-label={t('close')}
                  />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                  <IconSelector
                    name={name}
                    currentLogo={logo}
                    currentIcon={icon}
                    onLogoChange={(newLogo) => {
                      setLogo(newLogo);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    onIconChange={(newIcon) => {
                      setIcon(newIcon);
                      setLogo(undefined);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    isPro={isPro}
                    userId={userId}
                    onRestoreAuto={() => {
                      setManualSelectionThisSession(false);
                      setLogo(undefined);
                      setIcon('receipt');
                      setShowIconSelector(false);
                    }}
                    t={t}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={t('delete')}
          message={t('deleteConfirm')}
          onConfirm={() => {
            onDelete?.();
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          t={t}
        />
      )}
    </motion.div>
  );
}
// --- Payment Method Modal ---

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialIcon?: string;
  initialColor?: string;
  onSave: (name: string, icon: string, color: string) => void;
  onDelete?: () => void;
  t: (key: TranslationKey) => string;
}

export function PaymentMethodModal({ isOpen, onClose, initialName, initialIcon, initialColor, onSave, onDelete, t }: PaymentMethodModalProps) {
  const [name, setName] = useState(initialName || '');
  const [icon, setIcon] = useState(initialIcon || 'credit-card');
  const [color, setColor] = useState(initialColor || '#6366f1');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    setName(initialName || '');
    setIcon(initialIcon || 'credit-card');
    setColor(initialColor || '#6366f1');
  }, [isOpen, initialName, initialIcon, initialColor]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-[#242424] w-full max-w-sm rounded-[24px] overflow-hidden flex flex-col relative border border-[#E6E2D8] dark:border-[#383838] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[#E6E2D8] dark:border-[#383838]">
            <h2 className="text-base sm:text-lg font-bold text-[#1C1917] dark:text-white tracking-tight">
              {initialName ? t('edit') : 'Ny betalningsmetod'}
            </h2>
            <div className="flex items-center gap-2">
              {initialName && onDelete && (
                <IconButton 
                  icon={<Trash2 size={16} />}
                  onClick={() => { onDelete(); onClose(); }}
                  variant="danger"
                  size="sm"
                  aria-label={t('delete')}
                />
              )}
              <IconButton 
                icon={<X size={18} strokeWidth={2} />}
                onClick={onClose}
                variant="muted"
                size="sm"
                aria-label={t('close')}
              />
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setShowIconPicker(true)}
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2"
                style={{ backgroundColor: `${color}20`, color: color }}
              >
                <CategoryIcon icon={icon} color={color} size="xl" />
              </button>
              <span className="text-xs text-[var(--text-secondary)]">Klicka för att ändra</span>
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Namn på betalningsmetod"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-[12px] px-4 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] focus:bg-[var(--surface-color)] focus:border-accent/30 shadow-xs transition-all outline-none"
              />

              <div className="flex flex-wrap gap-2">
                {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#a855f7'].map(c => (
                  <button
                    key={c}
                    className="w-8 h-8 rounded-full border-2 border-transparent transition-all"
                    style={{ backgroundColor: c, borderColor: color === c ? 'var(--text-primary)' : 'transparent' }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>

              <Button
                onClick={() => { if (name.trim()) { onSave(name.trim(), icon, color); onClose(); } }}
                disabled={!name.trim()}
                variant="primary"
                fullWidth
                size="lg"
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </motion.div>
        <IconPickerModal
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          selectedIcon={icon}
          onSelectIcon={setIcon}
          t={t}
        />
      </motion.div>
    </AnimatePresence>
  );
}
