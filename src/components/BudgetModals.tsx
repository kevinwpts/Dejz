import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

import { X, Check, Trash2, ChevronDown, PiggyBank, Pencil, ChevronRight, Calendar, Repeat, CreditCard } from 'lucide-react';
import { Income, FixedExpense, Frequency, Category, Config, MonthlySaving } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { fetchLogoForName, getLogoUrl, findKnownBrandDomain } from '../utils/logo';
import { IconSelector } from './IconSelector';
import { IconPickerModal } from './IconPickerModal';
import { ICON_MAP, isEmojiString, getPaymentMethodIcon, getCategoryIconName } from '../utils/icons';
import { ConfirmModal } from './ConfirmModal';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { Button, IconButton, Modal } from './ui';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { getTransactionDominantColor, extractDominantColorFromImage } from '../utils/brandColor';
import { resolveEntityVisual } from '../utils/resolver';
import { feedback } from '../utils/feedback';
import { getCategoryColor, DEFAULT_CATEGORY_PALETTE } from '../utils/categoryColors';

function _hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(124, 58, 237, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(124, 58, 237, ${alpha})`;
}

function getFrequencyLabel(freq: Frequency | string | undefined, t: (key: TranslationKey) => string): string {
  if (!freq) return t('freq_monthly' as TranslationKey);
  const foundKey = (Object.keys(Frequency) as Array<keyof typeof Frequency>).find(
    (k) => Frequency[k] === freq || k.toLowerCase() === String(freq).toLowerCase()
  );
  if (foundKey) {
    return t(`freq_${foundKey.toLowerCase()}` as TranslationKey);
  }
  return String(freq);
}

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



  const [_brandColor, setBrandColor] = useState(() => getTransactionDominantColor(expenseCompatible as any, config));

  useEffect(() => {
    const initial = getTransactionDominantColor(expenseCompatible as any, config);
    setBrandColor(initial);

    const visual = resolveEntityVisual(expenseCompatible as any, config);
    if (visual.logoUrl && !visual.logoUrl.startsWith('data:image/svg+xml')) {
      extractDominantColorFromImage(visual.logoUrl).then((extracted) => {
        if (extracted) {
          setBrandColor(extracted);
        }
      });
    }
  }, [income, config]);

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const displayAmount = (income.isVariable && income.periodOverrides && currentPeriodId && income.periodOverrides[currentPeriodId] !== undefined)
    ? income.periodOverrides[currentPeriodId]
    : income.amount;

  const hasAdjustment = income.isVariable && income.periodOverrides && currentPeriodId && income.periodOverrides[currentPeriodId] !== undefined;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
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
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl font-sans border-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full pt-3 pb-1.5 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0 relative z-20"
        >
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full transition-colors" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-4 sm:pt-7 pb-5 space-y-4.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10">
          {/* Hero Section: Centered Logo, Title below, Price below title */}
          <div className="relative flex flex-col items-center text-center pt-6 sm:pt-8 pb-4">
            {/* Close Button top-right */}
            <div className="absolute top-0 right-0 z-10">
              <button 
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  onClose();
                }} 
                className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
                title={t('close')}
                aria-label={t('close')}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Centered Logo */}
            <div className="scale-135 sm:scale-150 mb-7 pt-3">
              <TransactionLogo transaction={expenseCompatible as any} config={config} size="xl" />
            </div>

            {/* Title */}
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight max-w-[90%] truncate px-2">
              {income.name}
            </h2>

            {/* Price */}
            <p className="text-[28px] sm:text-[34px] font-semibold font-amount tabular-nums tracking-tight mt-1.5 flex items-baseline justify-center text-emerald-600 dark:text-emerald-400">
              <span className="opacity-80 mr-1">+</span>
              <span>{formatAmount(displayAmount, config.language)}</span>
              <span className="text-[14px] font-medium text-[var(--text-secondary)] ml-1.5 font-sans self-end pb-1">{currency}</span>
            </p>
            {hasAdjustment && (
              <p className="text-[12px] font-normal text-[var(--text-secondary)] mt-1 tabular-nums">
                {t('adjustmentFor')} {currentPeriodId} ({t('plannedAmount')}: {formatAmount(income.amount, config.language)} {currency})
              </p>
            )}
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines */}
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-left">
            {/* Category */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center justify-end gap-2">
                {(() => {
                  const catName = typeof income.category === 'object' ? (income.category as any)?.name : (income.category || t('income'));
                  const searchCat = catName.trim().toLowerCase();
                  const cat = [...(config.incomeCategories || []), ...(config.categories || [])].find(
                    c => c.name.trim().toLowerCase() === searchCat
                  );
                  const iconKey = income.icon || cat?.icon || getCategoryIconName(catName);
                  return (
                    <>
                      {iconKey && <CategoryIcon icon={iconKey} color={cat?.color} size="xs" />}
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">{catName}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Type */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right">
                {income.isVariable ? (config.language === 'en' ? 'Variable' : 'Varierande') : (config.language === 'en' ? 'Fixed amount' : 'Fast belopp')}
              </span>
            </div>

            {/* Arrival Day */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('arrivalDay')}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right tabular-nums">
                {income.deductionDay ? `${income.deductionDay}e` : '-'}
              </span>
            </div>

            {/* Note */}
            {income.note && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0 pt-0.5">
                  {t('ownNote')}
                </span>
                <span className="text-[14px] font-medium text-[var(--text-primary)] text-right max-w-[70%] break-words">
                  {income.note}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer: Bred Redigera-knapp och Radera */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10">
          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onEdit(income);
            }} 
            className="flex-1 h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-primary)] dark:text-white font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] border-none shadow-none"
          >
            <Pencil size={14.5} strokeWidth={2} className="dark:text-white" />
            <span>{t('edit')}</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setShowDeleteConfirm(true);
            }} 
            className="w-[42px] h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
            title={config.language === 'en' ? 'Delete' : 'Ta bort'}
            aria-label={config.language === 'en' ? 'Delete' : 'Ta bort'}
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>

        {showDeleteConfirm && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title={config.language === 'en' ? "Delete income?" : "Radera inkomst?"}
            message={
              config.language === 'en'
                ? `Do you want to delete ${income.name} (${formatAmount(income.amount, config.language)} ${currency})?`
                : `Vill du radera ${income.name} (${formatAmount(income.amount, config.language)} ${currency})?`
            }
            confirmText={config.language === 'en' ? "Delete" : "Radera"}
            cancelText={config.language === 'en' ? "Cancel" : "Avbryt"}
            variant="danger"
            onConfirm={() => {
              onDelete(income.id);
              setShowDeleteConfirm(false);
              onClose();
            }}
            onCancel={() => setShowDeleteConfirm(false)}
            t={t}
          />
        )}
      </motion.div>
    </motion.div>,
    document.body
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
  const [icon, setIcon] = useState(income?.icon || 'none');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  
  const [logo, setLogo] = useState<string | undefined>(income?.logo);
  const [_autoLogo, setAutoLogo] = useState<string | undefined>(income?.name ? getLogoUrl(income.name) : undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!name || name.trim().length < 2) {
      if (!manualSelectionThisSession) {
        setLogo(undefined);
        setIcon('none');
      }
      setAutoLogo(undefined);
      return;
    }

    if (manualSelectionThisSession) return;

    const trimmedName = name.trim();
    const knownDomain = findKnownBrandDomain(trimmedName);
    const instantLogo = knownDomain 
      ? `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128` 
      : getLogoUrl(trimmedName);

    if (instantLogo) {
      setLogo(instantLogo);
      setIcon('none');
      setAutoLogo(instantLogo);
      return;
    }

    const timer = setTimeout(async () => {
      const url = await fetchLogoForName(trimmedName);
      setAutoLogo(url);
      
      if (url && !manualSelectionThisSession) {
        setLogo(url);
        setIcon('none');
      }
    }, 200);
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

  const incomeCompatible = {
    ...income,
    name,
    amount: parseAmount(amount),
    note,
    category,
    logo,
    icon,
    type: 'income' as const,
    timestamp: Date.now()
  };



  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0"
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
        className="bg-[var(--bg-color)] w-full max-w-none rounded-t-[28px] relative flex flex-col overflow-hidden max-h-[92dvh] shadow-2xl h-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >


        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden relative z-20" />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 max-w-xl mx-auto w-full">
          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
              {income 
                ? (config?.language === 'en' ? 'Edit Income' : 'Redigera inkomst') 
                : (config?.language === 'en' ? 'New Income' : 'Ny inkomst')}
            </h2>
            <button 
              type="button"
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
              aria-label={t('close')}
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* 1. Main Hero Card: Icon + Name & Amount Input */}
          <div className="p-4 sm:p-5 rounded-[22px] bg-[var(--surface-color)] border-none shadow-none space-y-4">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setShowIconSelector(true)}
                className="relative rounded-[14px] overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer shrink-0 hover:ring-2 hover:ring-[var(--accent-color)]/30 group"
                title={t('chooseIcon')}
                aria-label={t('chooseIcon')}
              >
                <TransactionLogo 
                  size="lg"
                  config={config}
                  transaction={incomeCompatible as any} 
                />
              </button>
              <div className="flex-1 min-w-0">
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('incomePayerPlaceholder')} 
                  className="text-[19px] sm:text-[21px] font-bold tracking-tight text-[var(--text-primary)] leading-tight bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-baseline justify-start gap-1">
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="flex items-baseline font-amount text-[48px] sm:text-[64px] font-bold tabular-nums tracking-tight cursor-text w-full leading-none text-[var(--text-primary)]"
              >
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
                  className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] placeholder:font-normal placeholder:text-[var(--text-tertiary)] w-full leading-none"
                />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] select-none ml-2 mb-1.5 font-sans shrink-0">
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Grouped Details Module with Dividers */}
          <div className="rounded-[22px] bg-[var(--surface-color)] divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden border-none shadow-none">
            {/* Row 1: Category */}
            <div 
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setIsCategorySelectorOpen(true);
              }}
              className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all cursor-pointer group min-h-[58px]"
            >
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 text-white shadow-2xs"
                  style={{ 
                    backgroundColor: (categories || []).find(c => c.name === category)?.color || 'var(--accent-color)'
                  }}
                >
                  <CategoryIcon 
                    icon={(categories || []).find(c => c.name === category)?.icon || 'tag'} 
                    size="sm" 
                    noBackground 
                    whiteIcon 
                  />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                  {category || t('income')}
                </span>
                <ChevronRight size={16} strokeWidth={2} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
              </div>
            </div>

            {/* Row 2: Arrival / Payout Day */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('arrivalDay')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors tabular-nums">
                  {deductionDay}:e
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('arrivalDay')}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)] font-bold">{day}:e</option>
                ))}
              </select>
            </div>

            {/* Row 3: Frequency */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('frequency')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Repeat size={14} strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
                  {getFrequencyLabel(frequency, t)}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('frequency')}
              >
                {(Object.keys(Frequency) as Array<keyof typeof Frequency>).map(key => (
                  <option key={key} value={Frequency[key]} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">
                    {t(`freq_${key.toLowerCase()}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4 (if non-monthly): Start Month (directly below frequency) */}
            {frequency !== Frequency.MONTHLY && (
              <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                  {t('startMonthLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    <Calendar size={14} strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                    {new Date(2024, startMonth, 1).toLocaleString(config?.language || 'sv-SE', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                  <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
                </div>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(parseInt(e.target.value))}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  title={t('startMonthLabel')}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2024, i, 1);
                    const monthName = date.toLocaleString(config?.language || 'sv-SE', { month: 'long' });
                    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                    return (
                      <option key={i} value={i} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">
                        {capitalizedMonth}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Row 5: Type (Fixed / Variable) */}
            <div className="p-4 flex items-center justify-between min-h-[58px]">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-bold text-[var(--text-primary)]">
                  {isVariable ? (config?.language === 'en' ? 'Variable' : 'Varierande') : (config?.language === 'en' ? 'Fixed' : 'Fast belopp')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsVariable(!isVariable)}
                  className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer ${isVariable ? 'bg-[var(--accent-color)]' : 'bg-black/20 dark:bg-white/20'}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${isVariable ? 'left-[18px]' : 'left-0.5'}`}
                  />
                </button>
              </div>
            </div>

            {/* Row 6: Own Note */}
            <div className="p-4 flex items-center justify-between min-h-[58px] gap-3">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('ownNote')}
              </span>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={config?.language === 'en' ? 'Add note...' : 'Skriv notering...'}
                  className="text-[13.5px] font-medium text-[var(--text-primary)] text-right bg-transparent outline-none w-full max-w-[220px] placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
                />
                {note && (
                  <button 
                    type="button"
                    onClick={() => setNote('')}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0 transition-colors"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Selector Bottom Sheet Modal */}
          {isCategorySelectorOpen && createPortal(
            <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategorySelectorOpen(false)} />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className="relative w-full sm:max-w-md bg-[var(--bg-color)] rounded-t-[28px] sm:rounded-[28px] border-none shadow-2xl max-h-[85dvh] h-[78dvh] sm:h-auto flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
                <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
                  <h3 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">{t('category')}</h3>
                  <button
                    type="button"
                    onClick={() => setIsCategorySelectorOpen(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-3">
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
                          style={{ backgroundColor: cat.color || getCategoryColor(cat.name, categories) }}
                          className={`h-28 sm:h-32 p-3.5 rounded-[22px] flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm relative overflow-hidden text-left ${
                            isSelected ? 'ring-3 ring-white ring-offset-2 ring-offset-black/50' : ''
                          }`}
                        >
                          <CategoryIcon icon={cat.icon} size="lg" noBackground whiteIcon />
                          <span className="text-[13.5px] sm:text-[14px] font-bold text-white text-center truncate w-full px-1 drop-shadow-xs">
                            {cat.name}
                          </span>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-white">
                              <Check size={14} strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>,
            document.body
          )}
        </div>

        {/* Action Button Footer: Bred Spara-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10 max-w-xl mx-auto w-full">
          <button 
            type="button"
            onClick={handleSave} 
            className="flex-1 h-[42px] rounded-full bg-[var(--accent-color)] hover:opacity-95 text-[var(--text-on-accent)] text-[13.5px] font-medium tracking-tight flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-none"
          >
            <Check size={15} strokeWidth={2.5} />
            <span>{income ? (config?.language === 'en' ? 'Save changes' : 'Spara ändringar') : (config?.language === 'en' ? 'Add income' : 'Lägg till inkomst')}</span>
          </button>

          {income && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowDeleteConfirm(true);
              }}
              className="w-[42px] h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
              title={config?.language === 'en' ? 'Delete' : 'Ta bort'}
              aria-label={config?.language === 'en' ? 'Delete' : 'Ta bort'}
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Compact Icon Selector Popover */}
        <AnimatePresence>
          {showIconSelector && (
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIconSelector(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="bg-[var(--bg-color)] w-full max-w-xl rounded-t-[28px] sm:rounded-[28px] border-none relative overflow-hidden flex flex-col h-[90vh] sm:h-[88vh] shadow-2xl font-sans"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <IconButton 
                    icon={<X size={16} strokeWidth={2} />}
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
    timestamp: Date.now() // Dummy for logo logic
  };



  const [_brandColor, setBrandColor] = useState(() => getTransactionDominantColor(expenseCompatible as any, config));

  useEffect(() => {
    const initial = getTransactionDominantColor(expenseCompatible as any, config);
    setBrandColor(initial);

    const visual = resolveEntityVisual(expenseCompatible as any, config);
    if (visual.logoUrl && !visual.logoUrl.startsWith('data:image/svg+xml')) {
      extractDominantColorFromImage(visual.logoUrl).then((extracted) => {
        if (extracted) {
          setBrandColor(extracted);
        }
      });
    }
  }, [expense, config]);

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const displayAmount = (expense.isVariable && expense.periodOverrides && currentPeriodId && expense.periodOverrides[currentPeriodId] !== undefined)
    ? expense.periodOverrides[currentPeriodId]
    : expense.amount;

  const hasAdjustment = expense.isVariable && expense.periodOverrides && currentPeriodId && expense.periodOverrides[currentPeriodId] !== undefined;

  const methodStr = typeof expense.paymentMethod === 'object' ? (expense.paymentMethod as any)?.name : (expense.paymentMethod || '');
  const PaymentIcon = getPaymentMethodIcon(methodStr);
  const freqText = getFrequencyLabel(expense.frequency, t);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
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
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl font-sans border-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full pt-3 pb-1.5 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0 relative z-20"
        >
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full transition-colors" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-4 sm:pt-7 pb-5 space-y-4.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10">
          {/* Hero Section: Centered Logo, Title below, Price below title */}
          <div className="relative flex flex-col items-center text-center pt-6 sm:pt-8 pb-4">
            {/* Close Button top-right */}
            <div className="absolute top-0 right-0 z-10">
              <button 
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  onClose();
                }} 
                className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
                title={t('close')}
                aria-label={t('close')}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Centered Logo */}
            <div className="scale-135 sm:scale-150 mb-7 pt-3">
              <TransactionLogo transaction={expenseCompatible as any} config={config} size="xl" />
            </div>

            {/* Title */}
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight max-w-[90%] truncate px-2">
              {expense.name}
            </h2>

            {/* Price */}
            <p className="text-[28px] sm:text-[34px] font-semibold font-amount tabular-nums tracking-tight mt-1.5 flex items-baseline justify-center text-[var(--text-primary)]">
              <span className="opacity-80 mr-1">−</span>
              <span>{formatAmount(displayAmount, config.language)}</span>
              <span className="text-[14px] font-medium text-[var(--text-secondary)] ml-1.5 font-sans self-end pb-1">{currency}</span>
            </p>
            {hasAdjustment && (
              <p className="text-[12px] font-normal text-[var(--text-secondary)] mt-1 tabular-nums">
                {t('adjustmentFor')} {currentPeriodId} ({t('plannedAmount')}: {formatAmount(expense.amount, config.language)} {currency})
              </p>
            )}
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines */}
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-left">
            {/* Category */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center justify-end gap-2">
                {(() => {
                  const catName = typeof expense.category === 'object' ? (expense.category as any)?.name : (expense.category || '');
                  const searchCat = catName.trim().toLowerCase();
                  const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
                    c => c.name.trim().toLowerCase() === searchCat
                  );
                  const iconKey = expense.icon || cat?.icon || getCategoryIconName(catName);
                  return (
                    <>
                      {iconKey && <CategoryIcon icon={iconKey} color={cat?.color} size="xs" />}
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">{catName}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Type */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right">
                {expense.isVariable ? (config.language === 'en' ? 'Variable' : 'Varierande') : (config.language === 'en' ? 'Fixed amount' : 'Fast belopp')}
              </span>
            </div>

            {/* Frequency */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('frequency')}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right">
                {freqText}
              </span>
            </div>

            {/* Deduction Day / Payment Day */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {expense.paymentMethod === 'autogiro' || (typeof expense.paymentMethod === 'string' && (expense.paymentMethod.toLowerCase().includes('autogiro') || expense.paymentMethod.toLowerCase().includes('kort')))
                  ? (config.language === 'en' ? 'Deduction day' : 'Dragningsdag')
                  : (config.language === 'en' ? 'Payment day' : 'Betaldag')}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right tabular-nums">
                {expense.deductionDay ? `${expense.deductionDay}e` : '-'}
                {expense.frequency !== Frequency.MONTHLY && expense.startMonth !== undefined && (
                  <span className="text-[13px] font-normal text-[var(--text-secondary)] ml-1">
                    ({new Date(2024, expense.startMonth, 1).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE', { month: 'short' })})
                  </span>
                )}
              </span>
            </div>

            {/* Payment Method */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('paymentMethod')}
              </span>
              <div className="flex items-center justify-end gap-2">
                {methodStr && <PaymentIcon size={14} className="text-[var(--text-secondary)]" />}
                <span className="text-[14px] font-medium text-[var(--text-primary)]">
                  {methodStr || '-'}
                </span>
              </div>
            </div>

            {/* Note */}
            {expense.note && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0 pt-0.5">
                  {t('ownNote')}
                </span>
                <span className="text-[14px] font-medium text-[var(--text-primary)] text-right max-w-[70%] break-words">
                  {expense.note}
                </span>
              </div>
            )}
          </div>

          {/* Neutral Secondary Action: Visa hur du säger upp */}
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="w-full mt-2 p-3.5 bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] rounded-[14px] flex items-center justify-between group transition-colors cursor-pointer active:scale-[0.99] text-left border-none shadow-none"
          >
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                {config.language === 'en' ? 'Show how to cancel' : 'Visa hur du säger upp'}
              </p>
              <p className="text-[11.5px] font-normal text-[var(--text-secondary)] mt-0.5">
                {config.language === 'en' ? 'Instructions and link to provider' : 'Instruktioner och länk till leverantören'}
              </p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        </div>

        {/* Action Buttons Footer: Bred Redigera-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10">
          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onEdit(expense);
            }} 
            className="flex-1 h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-primary)] dark:text-white font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] border-none shadow-none"
          >
            <Pencil size={14.5} strokeWidth={2} className="dark:text-white" />
            <span>{t('edit')}</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setShowDeleteConfirm(true);
            }} 
            className="w-[42px] h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
            title={config.language === 'en' ? 'Delete' : 'Ta bort'}
            aria-label={config.language === 'en' ? 'Delete' : 'Ta bort'}
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>

        {showDeleteConfirm && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title={config.language === 'en' ? "Delete fixed expense?" : "Radera fast kostnad?"}
            message={
              config.language === 'en'
                ? `Do you want to delete ${expense.name} (${formatAmount(expense.amount, config.language)} ${currency})?`
                : `Vill du radera ${expense.name} (${formatAmount(expense.amount, config.language)} ${currency})?`
            }
            confirmText={config.language === 'en' ? "Delete" : "Radera"}
            cancelText={config.language === 'en' ? "Cancel" : "Avbryt"}
            variant="danger"
            onConfirm={() => {
              onDelete(expense.id);
              setShowDeleteConfirm(false);
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
      </motion.div>
    </motion.div>,
    document.body
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
  const [icon, setIcon] = useState(expense?.icon || 'none');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  
  const [logo, setLogo] = useState<string | undefined>(expense?.logo);
  const [_autoLogo, setAutoLogo] = useState<string | undefined>(expense?.name ? getLogoUrl(expense.name) : undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!name || name.trim().length < 2) {
      if (!manualSelectionThisSession) {
        setLogo(undefined);
        setIcon('none');
      }
      setAutoLogo(undefined);
      return;
    }

    if (manualSelectionThisSession) return;

    const trimmedName = name.trim();
    const instantLogo = getLogoUrl(trimmedName, category);

    if (instantLogo) {
      setLogo(instantLogo);
      setIcon('none');
      setAutoLogo(instantLogo);
      if (!instantLogo.includes('google.com/s2/favicons')) {
        return;
      }
    }

    const timer = setTimeout(async () => {
      const url = await fetchLogoForName(trimmedName);
      setAutoLogo(url);
      
      if (url && !manualSelectionThisSession) {
        setLogo(url);
        setIcon('none');
      }
    }, 200);
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

  const expenseCompatible = {
    ...expense,
    name,
    amount: parseAmount(amount),
    note,
    category,
    logo,
    icon,
    timestamp: Date.now()
  };



  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0"
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
        className="bg-[var(--bg-color)] w-full max-w-none rounded-t-[28px] relative flex flex-col overflow-hidden max-h-[92dvh] shadow-2xl h-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >


        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden relative z-20" />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 max-w-xl mx-auto w-full">
          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
              {expense 
                ? (config?.language === 'en' ? 'Edit Fixed Expense' : 'Redigera fast utgift') 
                : (config?.language === 'en' ? 'New Fixed Expense' : 'Ny fast utgift')}
            </h2>
            <button 
              type="button"
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
              aria-label={t('close')}
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* 1. Main Hero Card: Icon + Name & Amount Input */}
          <div className="p-4 sm:p-5 rounded-[22px] bg-[var(--surface-color)] border-none shadow-none space-y-4">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setShowIconSelector(true)}
                className="relative rounded-[14px] overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer shrink-0 hover:ring-2 hover:ring-[var(--accent-color)]/30 group"
                title={t('chooseIcon')}
                aria-label={t('chooseIcon')}
              >
                <TransactionLogo 
                  size="lg"
                  config={config}
                  transaction={expenseCompatible as any} 
                />
              </button>
              <div className="flex-1 min-w-0">
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('fixedExpensePlaceholder')} 
                  className="text-[19px] sm:text-[21px] font-bold tracking-tight text-[var(--text-primary)] leading-tight bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-baseline justify-start gap-1">
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="flex items-baseline font-amount text-[48px] sm:text-[64px] font-bold tabular-nums tracking-tight cursor-text w-full leading-none text-[var(--text-primary)]"
              >
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
                  className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] placeholder:font-normal placeholder-[var(--text-tertiary)] w-full leading-none"
                />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] select-none ml-2 mb-1.5 font-sans shrink-0">
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Grouped Details Module with Dividers */}
          <div className="rounded-[22px] bg-[var(--surface-color)] divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden border-none shadow-none">
            {/* Row 1: Category */}
            <div 
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setIsCategorySelectorOpen(true);
              }}
              className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all cursor-pointer group min-h-[58px]"
            >
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 text-white shadow-2xs"
                  style={{ 
                    backgroundColor: categories.find(c => c.name === category)?.color || 'var(--accent-color)'
                  }}
                >
                  <CategoryIcon 
                    icon={categories.find(c => c.name === category)?.icon || 'receipt'} 
                    size="sm" 
                    noBackground 
                    whiteIcon 
                  />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                  {category || (config?.language === 'en' ? 'Select category' : 'Välj kategori')}
                </span>
                <ChevronRight size={16} strokeWidth={2} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
              </div>
            </div>

            {/* Row 2: Deduction / Payment Day */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {paymentMethod === 'autogiro' || (typeof paymentMethod === 'string' && (paymentMethod.toLowerCase().includes('autogiro') || paymentMethod.toLowerCase().includes('kort')))
                  ? (config?.language === 'en' ? 'Deduction day' : 'Dragningsdag')
                  : (config?.language === 'en' ? 'Payment day' : 'Betaldag')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors tabular-nums">
                  {deductionDay}:e
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={paymentMethod === 'autogiro' ? (config?.language === 'en' ? 'Deduction day' : 'Dragningsdag') : (config?.language === 'en' ? 'Payment day' : 'Betaldag')}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)] font-bold">{day}:e</option>
                ))}
              </select>
            </div>

            {/* Row 3: Frequency */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('frequency')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Repeat size={14} strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
                  {getFrequencyLabel(frequency, t)}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('frequency')}
              >
                {(Object.keys(Frequency) as Array<keyof typeof Frequency>).map(key => (
                  <option key={key} value={Frequency[key]} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">
                    {t(`freq_${key.toLowerCase()}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4 (if non-monthly): Start Month (directly below Frequency) */}
            {frequency !== Frequency.MONTHLY && (
              <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                  {t('startMonthLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    <Calendar size={14} strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                    {new Date(2024, startMonth, 1).toLocaleString(config?.language || 'sv-SE', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                  <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
                </div>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(parseInt(e.target.value))}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  title={t('startMonthLabel')}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2024, i, 1);
                    const monthName = date.toLocaleString(config?.language || 'sv-SE', { month: 'long' });
                    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                    return (
                      <option key={i} value={i} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">
                        {capitalizedMonth}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Row 5: Payment Method */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('paymentMethod')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <CreditCard size={14} strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
                  {paymentMethod || (config?.language === 'en' ? 'Select method' : 'Välj metod')}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('paymentMethod')}
              >
                {(paymentMethods || []).map((method, idx) => {
                  const methodName = typeof method === 'string' ? method : method?.name || '';
                  return (
                    <option key={methodName || idx} value={methodName} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">
                      {methodName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Row 6: Type (Fixed / Variable) */}
            <div className="p-4 flex items-center justify-between min-h-[58px]">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-bold text-[var(--text-primary)]">
                  {isVariable ? (config?.language === 'en' ? 'Variable' : 'Varierande') : (config?.language === 'en' ? 'Fixed' : 'Fast belopp')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsVariable(!isVariable)}
                  className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer ${isVariable ? 'bg-[var(--accent-color)]' : 'bg-black/20 dark:bg-white/20'}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${isVariable ? 'left-[18px]' : 'left-0.5'}`}
                  />
                </button>
              </div>
            </div>

            {/* Row 7: Own Note */}
            <div className="p-4 flex items-center justify-between min-h-[58px] gap-3">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('ownNote')}
              </span>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={config?.language === 'en' ? 'Add note...' : 'Skriv notering...'}
                  className="text-[13.5px] font-medium text-[var(--text-primary)] text-right bg-transparent outline-none w-full max-w-[220px] placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
                />
                {note && (
                  <button 
                    type="button"
                    onClick={() => setNote('')}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0 transition-colors"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Selector Bottom Sheet Modal */}
          {isCategorySelectorOpen && createPortal(
            <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategorySelectorOpen(false)} />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className="relative w-full sm:max-w-md bg-[var(--bg-color)] rounded-t-[28px] sm:rounded-[28px] border-none shadow-2xl max-h-[85dvh] h-[78dvh] sm:h-auto flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
                <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
                  <h3 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">{t('category')}</h3>
                  <button
                    type="button"
                    onClick={() => setIsCategorySelectorOpen(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-3">
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
                          style={{ backgroundColor: cat.color || getCategoryColor(cat.name, categories) }}
                          className={`h-28 sm:h-32 p-3.5 rounded-[22px] flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm relative overflow-hidden text-left ${
                            isSelected ? 'ring-3 ring-white ring-offset-2 ring-offset-black/50' : ''
                          }`}
                        >
                          <CategoryIcon icon={cat.icon} size="lg" noBackground whiteIcon />
                          <span className="text-[13.5px] sm:text-[14px] font-bold text-white text-center truncate w-full px-1 drop-shadow-xs">
                            {cat.name}
                          </span>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-white">
                              <Check size={14} strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
                className="w-full p-3.5 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 flex items-center justify-between group transition-all cursor-pointer active:scale-[0.99] text-left"
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {config?.language === 'en' ? 'Show how to cancel' : 'Visa hur du säger upp'}
                  </p>
                  <p className="text-[11.5px] font-normal text-[var(--text-secondary)] mt-0.5">
                    {config?.language === 'en' ? 'Instructions and link to provider' : 'Instruktioner och länk till leverantören'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Action Button Footer: Bred Spara-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10 max-w-xl mx-auto w-full">
          <button 
            type="button"
            onClick={handleSave} 
            className="flex-1 h-[42px] rounded-full bg-[var(--accent-color)] hover:opacity-95 text-[var(--text-on-accent)] text-[13.5px] font-medium tracking-tight flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-none"
          >
            <Check size={15} strokeWidth={2.5} />
            <span>{expense ? (config?.language === 'en' ? 'Save changes' : 'Spara ändringar') : (config?.language === 'en' ? 'Add fixed expense' : 'Lägg till fast kostnad')}</span>
          </button>

          {expense && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowDeleteConfirm(true);
              }}
              className="w-[42px] h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
              title={config?.language === 'en' ? 'Delete' : 'Ta bort'}
              aria-label={config?.language === 'en' ? 'Delete' : 'Ta bort'}
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Compact Icon Selector Popover */}
        <AnimatePresence>
          {showIconSelector && (
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIconSelector(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="bg-[var(--bg-color)] w-full max-w-xl rounded-t-[28px] sm:rounded-[28px] border-none relative overflow-hidden flex flex-col h-[90vh] sm:h-[88vh] shadow-2xl font-sans"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-black/5 dark:border-white/10">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowIconSelector(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={t('close')}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
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
    category: t('savings'),
    type: 'expense' as const,
    timestamp: Date.now()
  };

  const [_brandColor, setBrandColor] = useState(() => getTransactionDominantColor(expenseCompatible as any, config));

  useEffect(() => {
    const initial = getTransactionDominantColor(expenseCompatible as any, config);
    setBrandColor(initial);

    const visual = resolveEntityVisual(expenseCompatible as any, config);
    if (visual.logoUrl && !visual.logoUrl.startsWith('data:image/svg+xml')) {
      extractDominantColorFromImage(visual.logoUrl).then((extracted) => {
        if (extracted) {
          setBrandColor(extracted);
        }
      });
    }
  }, [saving, config]);

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const methodStr = typeof saving.paymentMethod === 'object' ? (saving.paymentMethod as any)?.name : (saving.paymentMethod || '');
  const PaymentIcon = getPaymentMethodIcon(methodStr);
  const freqText = getFrequencyLabel(saving.frequency, t);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
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
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl font-sans border-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full pt-3 pb-1.5 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0 relative z-20"
        >
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full transition-colors" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-4 sm:pt-7 pb-5 space-y-4.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10">
          {/* Hero Section: Centered Logo, Title below, Price below title */}
          <div className="relative flex flex-col items-center text-center pt-6 sm:pt-8 pb-4">
            {/* Close Button top-right */}
            <div className="absolute top-0 right-0 z-10">
              <button 
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  onClose();
                }} 
                className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
                title={t('close')}
                aria-label={t('close')}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Centered Logo */}
            <div className="scale-135 sm:scale-150 mb-7 pt-3">
              <TransactionLogo transaction={expenseCompatible as any} config={config} size="xl" />
            </div>

            {/* Title */}
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight max-w-[90%] truncate px-2">
              {saving.name}
            </h2>

            {/* Price */}
            <p className="text-[28px] sm:text-[34px] font-semibold font-amount tabular-nums tracking-tight mt-1.5 flex items-baseline justify-center text-[var(--text-primary)]">
              <span className="opacity-80 mr-1">→</span>
              <span>{formatAmount(saving.amount, config.language)}</span>
              <span className="text-[14px] font-medium text-[var(--text-secondary)] ml-1.5 font-sans self-end pb-1">{currency}</span>
            </p>
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines */}
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-left">
            {/* Type */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center justify-end gap-2">
                <CategoryIcon icon={saving.icon || 'piggy-bank'} size="xs" />
                <span className="text-[14px] font-medium text-[var(--text-primary)]">
                  {t('monthlySavings')}
                </span>
              </div>
            </div>

            {/* Frequency */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('frequency')}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right">
                {freqText}
              </span>
            </div>

            {/* Deduction Day */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {config.language === 'en' ? 'Deduction day' : 'Dragningsdag'}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right tabular-nums">
                {saving.deductionDay ? `${saving.deductionDay}e` : '-'}
              </span>
            </div>

            {/* Payment Method */}
            {saving.paymentMethod && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                  {t('paymentMethod')}
                </span>
                <div className="flex items-center justify-end gap-2">
                  {methodStr && <PaymentIcon size={14} className="text-[var(--text-secondary)]" />}
                  <span className="text-[14px] font-medium text-[var(--text-primary)]">
                    {methodStr}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer: Bred Redigera-knapp och Radera */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10">
          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.tap === 'function') feedback.tap();
              onEdit(saving);
            }} 
            className="flex-1 h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-primary)] dark:text-white font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] border-none shadow-none"
          >
            <Pencil size={14.5} strokeWidth={2} className="dark:text-white" />
            <span>{t('edit')}</span>
          </button>
          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setShowDeleteConfirm(true);
            }} 
            className="w-[42px] h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
            title={t('delete')}
            aria-label={t('delete')}
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      </motion.div>

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
  const [icon, setIcon] = useState(saving?.icon || 'none');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  
  const [logo, setLogo] = useState<string | undefined>(saving?.logo);
  const [_autoLogo, setAutoLogo] = useState<string | undefined>(saving?.name ? getLogoUrl(saving.name) : undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [showIconSelector, setShowIconSelector] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!name || name.trim().length < 2) {
      if (!manualSelectionThisSession) {
        setLogo(undefined);
        setIcon('none');
      }
      setAutoLogo(undefined);
      return;
    }

    if (manualSelectionThisSession) return;

    const trimmedName = name.trim();
    const knownDomain = findKnownBrandDomain(trimmedName);
    const instantLogo = knownDomain 
      ? `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128` 
      : getLogoUrl(trimmedName);

    if (instantLogo) {
      setLogo(instantLogo);
      setIcon('none');
      setAutoLogo(instantLogo);
      return;
    }

    const timer = setTimeout(async () => {
      const url = await fetchLogoForName(trimmedName);
      setAutoLogo(url);
      
      if (url && !manualSelectionThisSession) {
        setLogo(url);
        setIcon('none');
      }
    }, 200);
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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0"
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
        className="bg-[var(--bg-color)] w-full max-w-none rounded-t-[28px] relative flex flex-col overflow-hidden max-h-[92dvh] shadow-2xl h-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden relative z-20" />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 max-w-xl mx-auto w-full">
          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
              {saving ? `${t('edit')} ${saving.name}` : `${t('new')} ${t('monthlySavings').toLowerCase()}`}
            </h2>
            <button 
              type="button"
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
              aria-label={t('close')}
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* 1. Main Hero Card: Icon + Name & Amount Input */}
          <div className="p-4 sm:p-5 rounded-[22px] bg-[var(--surface-color)] border-none shadow-none space-y-4">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setShowIconSelector(true)}
                className="relative rounded-full overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer shrink-0 hover:ring-2 hover:ring-[var(--accent-color)]/30 group"
                title={t('chooseIcon')}
                aria-label={t('chooseIcon')}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden bg-black/5 dark:bg-white/5">
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : isEmojiString(icon) ? (
                    icon
                  ) : (
                    (() => {
                      const Icon = ICON_MAP[icon] || PiggyBank;
                      return <Icon size={22} className="text-accent" />;
                    })()
                  )}
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('savingsGoalPlaceholder')} 
                  className="text-[19px] sm:text-[21px] font-bold tracking-tight text-[var(--text-primary)] leading-tight bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-baseline justify-start gap-1">
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="flex items-baseline font-amount text-[48px] sm:text-[64px] font-bold tabular-nums tracking-tight cursor-text w-full leading-none text-[var(--text-primary)]"
              >
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
                  className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] placeholder:font-normal placeholder-[var(--text-tertiary)] w-full leading-none"
                />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] select-none ml-2 mb-1.5 font-sans shrink-0">
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Grouped Details Module with Dividers */}
          <div className="rounded-[22px] bg-[var(--surface-color)] divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden border-none shadow-none">
            {/* Row 1: Deduction Day */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('deductionDay') || 'Dragningsdag'}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors tabular-nums">
                  {deductionDay}:e
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('deductionDay') || 'Dragningsdag'}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)] font-bold">{day}:e</option>
                ))}
              </select>
            </div>

            {/* Row 2: Frequency */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('frequency')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Repeat size={14} strokeWidth={2} />
                </div>
                <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
                  {getFrequencyLabel(frequency, t)}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('frequency')}
              >
                {(Object.keys(Frequency) as Array<keyof typeof Frequency>).map(key => (
                  <option key={key} value={Frequency[key]} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">
                    {t(`freq_${key.toLowerCase()}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3 (if non-monthly): Start Month (directly below frequency) */}
            {frequency !== Frequency.MONTHLY && (
              <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                  {t('startMonthLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    <Calendar size={14} strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                    {new Date(2024, startMonth, 1).toLocaleString(config?.language || 'sv-SE', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                  <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
                </div>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(parseInt(e.target.value))}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  title={t('startMonthLabel')}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2024, i, 1);
                    const monthName = date.toLocaleString(config?.language || 'sv-SE', { month: 'long' });
                    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                    return (
                      <option key={i} value={i} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">
                        {capitalizedMonth}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Row 4: Payment Method (if available) */}
            {paymentMethods && paymentMethods.length > 0 && (
              <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                  {t('paymentMethod') || 'Betalmetod'}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    <CreditCard size={14} strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
                    {paymentMethod || (config?.language === 'en' ? 'Select method' : 'Välj metod')}
                  </span>
                  <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  title={t('paymentMethod')}
                >
                  {paymentMethods.map((pm: any) => {
                    const pmName = typeof pm === 'string' ? pm : pm.name;
                    return <option key={pmName} value={pmName} className="bg-white dark:bg-[#1C1C1C] text-[var(--text-primary)]">{pmName}</option>;
                  })}
                </select>
              </div>
            )}

            {/* Row 5: Type (Fixed / Variable) */}
            <div className="p-4 flex items-center justify-between min-h-[58px]">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-bold text-[var(--text-primary)]">
                  {isVariable ? (config?.language === 'en' ? 'Variable' : 'Varierande') : (config?.language === 'en' ? 'Fixed' : 'Fast belopp')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsVariable(!isVariable)}
                  className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer ${isVariable ? 'bg-[var(--accent-color)]' : 'bg-black/20 dark:bg-white/20'}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${isVariable ? 'left-[18px]' : 'left-0.5'}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Footer: Bred Spara-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10 max-w-xl mx-auto w-full">
          <button 
            type="button"
            onClick={handleSave} 
            className="flex-1 h-[42px] rounded-full bg-[var(--accent-color)] hover:opacity-95 text-[var(--text-on-accent)] text-[13.5px] font-medium tracking-tight flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-none"
          >
            <Check size={15} strokeWidth={2.5} />
            <span>{saving ? (config?.language === 'en' ? 'Save changes' : 'Spara ändringar') : (config?.language === 'en' ? 'Add saving' : 'Lägg till månadssparande')}</span>
          </button>

          {saving && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowDeleteConfirm(true);
              }}
              className="w-[42px] h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
              title={config?.language === 'en' ? 'Delete' : 'Ta bort'}
              aria-label={config?.language === 'en' ? 'Delete' : 'Ta bort'}
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Compact Icon Selector Popover */}
        <AnimatePresence>
          {showIconSelector && (
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIconSelector(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="bg-[var(--bg-color)] w-full max-w-xl rounded-t-[28px] sm:rounded-[28px] border-none relative overflow-hidden flex flex-col h-[90vh] sm:h-[88vh] shadow-2xl font-sans"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <IconButton 
                    icon={<X size={16} strokeWidth={2} />}
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        center
        size="xs"
        title={initialName ? t('edit') : 'Ny betalningsmetod'}
        showCloseButton={true}
        headerRight={
          initialName && onDelete ? (
            <IconButton 
              icon={<Trash2 size={16} strokeWidth={2} />}
              onClick={() => { onDelete(); onClose(); }}
              variant="danger"
              size="sm"
              aria-label={t('delete')}
            />
          ) : undefined
        }
        bodyClassName="p-6 space-y-6"
      >
        {/* Preview / Icon selector */}
        <div className="flex flex-col items-center justify-center pt-1">
          <button 
            type="button"
            onClick={() => setShowIconPicker(true)}
            className="w-20 h-20 rounded-[22px] flex items-center justify-center transition-all active:scale-95 group cursor-pointer shadow-sm relative overflow-hidden"
            style={{ backgroundColor: color }}
            title="Välj ikon"
          >
            <CategoryIcon 
              icon={icon} 
              size="xl" 
              noBackground 
              whiteIcon 
            />
          </button>
        </div>

        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Namn på betalningsmetod"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-[14px] px-4 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] focus:bg-[var(--surface-color)] focus:border-accent/30 shadow-xs transition-all outline-none"
          />

          {/* Color palette */}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-0.5 mr-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                {t('color')}
              </label>
              {/* Custom hex color input picker */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[var(--text-tertiary)]">{color}</span>
                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[var(--border-color)] cursor-pointer shadow-xs">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 -translate-x-2 -translate-y-2 w-12 h-12 cursor-pointer opacity-0"
                    title="Välj anpassad färg"
                  />
                  <div className="w-full h-full" style={{ backgroundColor: color }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-8 gap-2 bg-[var(--surface-muted)] p-2.5 rounded-[16px] border border-[var(--border-color)]">
              {DEFAULT_CATEGORY_PALETTE.map((c) => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-full aspect-square rounded-full transition-transform active:scale-90 relative cursor-pointer ${
                      isSelected ? 'scale-110 shadow-sm ring-2 ring-white dark:ring-[#1C1C1C]' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Välj färg ${c}`}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
      </Modal>

      <IconPickerModal
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        selectedIcon={icon}
        onSelectIcon={setIcon}
        t={t}
      />
    </>
  );
}
