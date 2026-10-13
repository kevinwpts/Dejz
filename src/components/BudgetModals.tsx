import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

import { X, Check, Trash2, ChevronDown, PiggyBank, Pencil, ChevronRight, Calendar, Repeat, CreditCard, Clock, RotateCcw } from 'lucide-react';
import { Income, FixedExpense, Frequency, Category, Config, MonthlySaving } from '../types';
import { DEFAULT_PAYMENT_METHODS } from '../constants';
import { TranslationKey } from '../i18n';
import { formatAmount, parseAmount, formatDeductionDayDisplay, getDeductionDayOptions } from '../utils/format';
import { fetchLogoForName, getLogoUrl, findKnownBrandDomain } from '../utils/logo';
import { IconSelector } from './IconSelector';
import { IconPickerModal } from './IconPickerModal';
import { ICON_MAP, isEmojiString, getPaymentMethodIcon, getCategoryIconName } from '../utils/icons';
import { ConfirmModal } from './ConfirmModal';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { Button, IconButton, Modal, Input, Switch } from './ui';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { getTransactionDominantColor, extractDominantColorFromImage } from '../utils/brandColor';
import { resolveEntityVisual } from '../utils/resolver';
import { getCategoryColor } from '../utils/categoryColors';
import { feedback } from '../utils/feedback';
import { getLastPaymentDate, formatShortDate, getCancellationBadgeText } from '../utils/cancellation';

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

  if (typeof document === 'undefined' || !document.body) return null;

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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-modal font-sans border-none"
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
              <IconButton 
                icon={<X size={15} strokeWidth={2.5} />}
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  onClose();
                }} 
                variant="muted"
                size="md"
                title={t('close')}
                aria-label={t('close')}
              />
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
            <p className="text-[28px] sm:text-[34px] font-semibold font-amount tabular-nums tracking-tight mt-1.5 flex items-baseline justify-center text-[var(--success-color)]">
              <span className="opacity-80 mr-1">+</span>
              <span>{formatAmount(displayAmount, config.language)}</span>
              <span className="text-sm font-medium text-[var(--text-secondary)] ml-1.5 font-sans self-end pb-1">{currency}</span>
            </p>
            {hasAdjustment && (
              <p className="text-secondary font-normal text-[var(--text-secondary)] mt-1 tabular-nums">
                {t('adjustmentFor')} {currentPeriodId} ({t('plannedAmount')}: {formatAmount(income.amount, config.language)} {currency})
              </p>
            )}
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines */}
          <div className="divide-y divide-subtle text-left">
            {/* Category */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center justify-end gap-2">
                {(() => {
                  const catName = typeof income.category === 'object' ? (income.category as any)?.name : (income.category || t('income'));
                  const searchCat = (catName || '').trim().toLowerCase();
                  const cat = [...(config.incomeCategories || []), ...(config.categories || [])].find(
                    c => (c?.name || '').trim().toLowerCase() === searchCat || c?.id === searchCat
                  );
                  const iconKey = cat?.icon || getCategoryIconName(catName);
                  const _catColor = cat?.color || getCategoryColor(catName, config.incomeCategories);
                  return (
                    <>
                      {iconKey && <CategoryIcon icon={iconKey} categoryName={catName} variant="minimal" size="xs" />}
                      <span className="text-sm font-medium text-[var(--text-primary)]">{catName}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Type */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right">
                {income.isVariable ? (config.language === 'en' ? 'Variable' : 'Varierande') : (config.language === 'en' ? 'Fixed amount' : 'Fast belopp')}
              </span>
            </div>

            {/* Arrival Day */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('arrivalDay')}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right tabular-nums">
                {formatDeductionDayDisplay(income.deductionDay, config.language, true)}
              </span>
            </div>

            {/* Note */}
            {income.note && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0 pt-0.5">
                  {t('ownNote')}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] text-right max-w-[70%] break-words">
                  {income.note}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer: Bred Redigera-knapp och Radera */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-transparent flex items-center gap-2.5 relative z-10">
          <Button 
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 rounded-full text-body font-medium"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onEdit(income);
            }} 
            icon={<Pencil size={14.5} strokeWidth={2} className="dark:text-white" />}
          >
            {t('edit')}
          </Button>

          <IconButton 
            icon={<Trash2 size={16} strokeWidth={2} className="text-[var(--text-primary)]" />}
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setShowDeleteConfirm(true);
            }} 
            variant="default"
            size="lg"
            className="rounded-[var(--radius-button,12px)] bg-[var(--surface-muted)] dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
            title={config.language === 'en' ? 'Delete' : 'Ta bort'}
            aria-label={config.language === 'en' ? 'Delete' : 'Ta bort'}
          />
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



  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
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
        className="bg-[var(--bg-color)] w-full sm:max-w-xl rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] relative flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[85vh] shadow-modal h-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >


        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden relative z-20" />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 max-w-xl mx-auto w-full">
          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-section-title text-[var(--text-primary)] tracking-tight">
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
          <div className="p-4 sm:p-5 rounded-[var(--radius-card,14px)] bg-[var(--surface-color)] border-none shadow-none space-y-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIconSelector(true)}
                className="relative rounded-[var(--radius-xs,8px)] overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer shrink-0 hover:ring-2 hover:ring-[var(--accent-color)]/30 group"
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
                <label className="text-label font-medium uppercase tracking-wider text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Name / Payer' : 'Namn / Betalare'}
                </label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('incomePayerPlaceholder')} 
                  className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-snug bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-subtle flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-label font-medium uppercase tracking-wider text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Amount' : 'Belopp'}
                </label>
                <div 
                  onClick={() => amountInputRef.current?.focus()}
                  className="flex items-center gap-2 font-amount cursor-text w-full"
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
                    className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] text-[30px] sm:text-[36px] placeholder:font-normal placeholder:text-[var(--text-tertiary)] w-full leading-none shrink min-w-[60px]"
                  />
                  <span className="text-secondary font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-black/[0.04] dark:bg-white/[0.06] border border-subtle px-2.5 py-1 rounded-[var(--radius-xs,8px)] select-none shrink-0 font-sans">
                    {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Grouped Details Module with Dividers */}
          <div className="rounded-[var(--radius-card,14px)] bg-[var(--surface-color)] overflow-hidden border-none shadow-none">
            {/* Row 1: Category */}
            <div 
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setIsCategorySelectorOpen(true);
              }}
              className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all cursor-pointer group min-h-[58px] border-b border-subtle"
            >
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                {(() => {
                  const matched = (categories || []).find(c => (c.name || '').trim().toLowerCase() === (category || '').trim().toLowerCase() || c.id === category);
                  return (
                    <CategoryIcon 
                      icon={matched?.icon || 'tag'} 
                      color={matched?.color || 'var(--accent-color)'}
                      size="xs" 
                      variant="primary" 
                      categoryName={category}
                    />
                  );
                })()}
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                  {category || t('income')}
                </span>
                <ChevronRight size={16} strokeWidth={2} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
              </div>
            </div>

            {/* Row 2: Arrival / Payout Day */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group border-b border-subtle">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('arrivalDay')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors tabular-nums">
                  {formatDeductionDayDisplay(deductionDay, config?.language, true)}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('arrivalDay')}
              >
                {getDeductionDayOptions(config?.language).map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-surface text-[var(--text-primary)] font-medium">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3: Frequency */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group border-b border-subtle">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('frequency')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Repeat size={14} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
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
                  <option key={key} value={Frequency[key]} className="bg-white dark:bg-surface text-[var(--text-primary)]">
                    {t(`freq_${key.toLowerCase()}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4 (if non-monthly): Start Month (directly below frequency) */}
            {frequency !== Frequency.MONTHLY && (
              <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group border-b border-subtle">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {t('startMonthLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    <Calendar size={14} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
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
                      <option key={i} value={i} className="bg-white dark:bg-surface text-[var(--text-primary)]">
                        {capitalizedMonth}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Row 5: Type (Fixed / Variable) */}
            <div className="p-4 flex items-center justify-between min-h-[58px] border-b border-subtle">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {isVariable ? (config?.language === 'en' ? 'Variable' : 'Varierande') : (config?.language === 'en' ? 'Fixed' : 'Fast belopp')}
                </span>
                <Switch
                  checked={isVariable}
                  onChange={setIsVariable}
                  size="sm"
                  aria-label={t('type')}
                />
              </div>
            </div>

            {/* Row 6: Own Note */}
            <div className="p-4 flex items-center justify-between min-h-[58px] gap-3 last:border-none">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('ownNote')}
              </span>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={config?.language === 'en' ? 'Add note...' : 'Skriv notering...'}
                  className="text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none w-full max-w-[220px] placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
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
          {isCategorySelectorOpen && typeof document !== 'undefined' && document.body && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategorySelectorOpen(false)} />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className="relative w-full sm:max-w-md bg-[var(--bg-color)] rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] border-none shadow-modal max-h-[85dvh] flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
                <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-subtle shrink-0">
                  <h3 className="text-section-title text-[var(--text-primary)] tracking-tight">{t('category')}</h3>
                  <button
                    type="button"
                    onClick={() => setIsCategorySelectorOpen(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="p-3.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar space-y-1">
                  {(categories || []).map(cat => {
                    const isSelected = category === cat.name;
                    const catColor = cat.color || getCategoryColor(cat.name, categories);
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          if (typeof feedback?.light === 'function') feedback.light();
                          setCategory(cat.name);
                          setIsCategorySelectorOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-card-sm,12px)] transition-colors cursor-pointer text-left active:scale-[0.99] ${
                          isSelected
                            ? 'bg-black/[0.04] dark:bg-white/[0.06]'
                            : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <CategoryIcon 
                            icon={cat.icon} 
                            color={catColor} 
                            size="sm" 
                            variant="primary" 
                            categoryName={cat.name} 
                          />
                          <span className={`text-sm truncate ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>
                            {cat.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white shrink-0">
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
        </div>

        {/* Action Button Footer: Bred Spara-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-transparent flex items-center gap-2.5 relative z-10 max-w-xl mx-auto w-full">
          <Button 
            type="button"
            variant="accent"
            size="lg"
            className="flex-1 rounded-[var(--radius-button,12px)] text-body-medium font-semibold"
            onClick={handleSave} 
            icon={<Check size={16} strokeWidth={2.5} />}
          >
            {income ? (config?.language === 'en' ? 'Save changes' : 'Spara ändringar') : (config?.language === 'en' ? 'Add income' : 'Lägg till inkomst')}
          </Button>

          {income && onDelete && (
            <IconButton
              icon={<Trash2 size={16} strokeWidth={2} />}
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowDeleteConfirm(true);
              }}
              variant="danger"
              size="xl"
              shape="button"
              title={config?.language === 'en' ? 'Delete' : 'Ta bort'}
              aria-label={config?.language === 'en' ? 'Delete' : 'Ta bort'}
            />
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
                className="bg-[var(--bg-color)] w-full max-w-xl rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] border-none relative overflow-hidden flex flex-col h-[90vh] sm:h-[88vh] shadow-modal font-sans"
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
    </motion.div>,
    document.body
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

  if (typeof document === 'undefined' || !document.body) return null;

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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-modal font-sans border-none"
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
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-3 sm:pt-5 pb-5 space-y-3 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10">
          {/* Hero Section: Centered Logo, Title below, Price below title */}
          <div className="relative flex flex-col items-center text-center pt-2 sm:pt-4 pb-1">
            {/* Close Button top-right */}
            <div className="absolute top-0 right-0 z-10">
              <IconButton 
                icon={<X size={15} strokeWidth={2.5} />}
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  onClose();
                }} 
                variant="muted"
                size="md"
                title={t('close')}
                aria-label={t('close')}
              />
            </div>

            {/* Centered Logo (56px) */}
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shrink-0 mb-2.5 mt-1">
              <TransactionLogo transaction={expenseCompatible as any} config={config} size="lg" />
            </div>

            {/* Title */}
            <h2 className="text-page-title text-[var(--text-primary)] leading-tight max-w-[90%] truncate px-2">
              {expense.name}
            </h2>

            {/* Price */}
            <p className="text-large-amount font-amount tabular-nums mt-1 flex items-baseline justify-center text-[var(--text-primary)]">
              <span className="opacity-80 mr-1">−</span>
              <span>{formatAmount(displayAmount, config.language)}</span>
              <span className="text-secondary font-medium text-[var(--text-secondary)] ml-1.5 self-end pb-0.5">{currency}</span>
            </p>
            {hasAdjustment && (
              <p className="text-secondary text-[var(--text-secondary)] mt-1 tabular-nums">
                {t('adjustmentFor')} {currentPeriodId} ({t('plannedAmount')}: {formatAmount(expense.amount, config.language)} {currency})
              </p>
            )}
            {expense.isCancelled && (
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-500/30">
                  <Clock size={13} />
                  <span>{getCancellationBadgeText(expense, config.language)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines */}
          <div className="divide-y divide-subtle text-left">
            {/* Category */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center justify-end gap-2">
                {(() => {
                  const catName = typeof expense.category === 'object' ? (expense.category as any)?.name : (expense.category || '');
                  const searchCat = (catName || '').trim().toLowerCase();
                  const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
                    c => (c?.name || '').trim().toLowerCase() === searchCat || c?.id === searchCat
                  );
                  const iconKey = cat?.icon || getCategoryIconName(catName);
                  const _catColor = cat?.color || getCategoryColor(catName, config.categories);
                  return (
                    <>
                      {iconKey && <CategoryIcon icon={iconKey} categoryName={catName} variant="minimal" size="xs" />}
                      <span className="text-body-medium text-[var(--text-primary)] font-medium">{catName}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Type */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <span className="text-body-medium text-[var(--text-primary)] font-medium text-right">
                {expense.isVariable ? (config.language === 'en' ? 'Variable' : 'Varierande') : (config.language === 'en' ? 'Fixed amount' : 'Fast belopp')}
              </span>
            </div>

            {/* Frequency */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                {t('frequency')}
              </span>
              <span className="text-body-medium text-[var(--text-primary)] font-medium text-right">
                {freqText}
              </span>
            </div>

            {/* Deduction Day / Payment Day */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                {expense.paymentMethod === 'autogiro' || (typeof expense.paymentMethod === 'string' && (expense.paymentMethod.toLowerCase().includes('autogiro') || expense.paymentMethod.toLowerCase().includes('kort')))
                  ? (config.language === 'en' ? 'Deduction day' : 'Dragningsdag')
                  : (config.language === 'en' ? 'Payment day' : 'Betaldag')}
              </span>
              <span className="text-body-medium text-[var(--text-primary)] font-medium text-right tabular-nums">
                {formatDeductionDayDisplay(expense.deductionDay, config.language, true)}
                {expense.frequency !== Frequency.MONTHLY && expense.startMonth !== undefined && (
                  <span className="text-secondary text-[var(--text-secondary)] ml-1">
                    ({new Date(2024, expense.startMonth, 1).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE', { month: 'short' })})
                  </span>
                )}
              </span>
            </div>

            {/* Payment Method */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                {t('paymentMethod')}
              </span>
              <div className="flex items-center justify-end gap-2">
                {methodStr && <PaymentIcon size={14} className="text-[var(--text-secondary)]" />}
                <span className="text-body-medium text-[var(--text-primary)] font-medium">
                  {methodStr || '-'}
                </span>
              </div>
            </div>

            {/* Cancellation breakdown rows if cancelled */}
            {expense.isCancelled && (
              <>
                {expense.cancelledAt && (
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                      {config.language === 'en' ? 'Cancelled on' : 'Uppsägningsdatum'}
                    </span>
                    <span className="text-body-medium text-[var(--text-primary)] font-medium text-right tabular-nums">
                      {new Date(expense.cancelledAt).toLocaleDateString(config.language === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {expense.cancellationDate && (
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                      {config.language === 'en' ? 'End date' : 'Slutdatum'}
                    </span>
                    <span className="text-body-medium text-[var(--text-primary)] font-medium text-right tabular-nums">
                      {formatShortDate(expense.cancellationDate, config.language)}
                    </span>
                  </div>
                )}
                {getLastPaymentDate(expense) && (
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-secondary text-[var(--text-secondary)] shrink-0">
                      {config.language === 'en' ? 'Last payment' : 'Sista betalningsdag'}
                    </span>
                    <span className="text-body-medium text-[var(--text-primary)] font-medium text-right tabular-nums font-bold text-[var(--accent-color)]">
                      {formatShortDate(getLastPaymentDate(expense)!, config.language)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Note */}
            {expense.note && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-secondary text-[var(--text-secondary)] shrink-0 pt-0.5">
                  {t('ownNote')}
                </span>
                <span className="text-body-medium text-[var(--text-primary)] font-medium text-right max-w-[70%] break-words">
                  {expense.note}
                </span>
              </div>
            )}
          </div>

          {/* Cancellation Actions */}
          <div className="space-y-2 mt-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full p-3.5 bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] rounded-[var(--radius-card-nested,12px)] flex items-center justify-between group transition-colors cursor-pointer active:scale-[0.99] text-left border-none shadow-none"
            >
              <div>
                <p className="text-body-medium font-medium text-[var(--text-primary)]">
                  {expense.isCancelled
                    ? (config.language === 'en' ? 'Edit cancellation dates' : 'Ändra uppsägningsdatum')
                    : (config.language === 'en' ? 'Cancel subscription' : 'Säg upp abonnemang')}
                </p>
                <p className="text-secondary text-[var(--text-secondary)] mt-0.5">
                  {config.language === 'en' ? 'Instructions, guide & direct link' : 'Instruktioner, villkor och direktlänk'}
                </p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>

            {expense.isCancelled && (
              <button
                type="button"
                onClick={() => {
                  feedback.success();
                  onEdit({
                    ...expense,
                    isCancelled: false,
                    cancellationDate: undefined,
                    cancelledAt: undefined,
                    lastPaymentDate: undefined,
                  });
                  onClose();
                }}
                className="w-full p-3.5 bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] rounded-[var(--radius-card-nested,12px)] flex items-center justify-between text-left cursor-pointer active:scale-[0.99] border-none text-[var(--accent-color)] font-semibold text-sm"
              >
                <span>{config.language === 'en' ? 'Reactivate subscription' : 'Återaktivera abonnemang'}</span>
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons Footer: Bred Redigera-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-transparent flex items-center gap-2.5 relative z-10">
          <Button 
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 text-body-medium font-medium"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onEdit(expense);
            }} 
            icon={<Pencil size={14.5} strokeWidth={2} className="dark:text-white" />}
          >
            {t('edit')}
          </Button>

          <IconButton 
            icon={<Trash2 size={16} strokeWidth={2} className="text-[var(--text-primary)]" />}
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setShowDeleteConfirm(true);
            }} 
            variant="default"
            size="lg"
            className="rounded-[var(--radius-button,12px)] bg-[var(--surface-muted)] dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
            title={config.language === 'en' ? 'Delete' : 'Ta bort'}
            aria-label={config.language === 'en' ? 'Delete' : 'Ta bort'}
          />
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
            onUpdateExpense={(updated) => {
              onEdit(updated);
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
  const [isCancelled, setIsCancelled] = useState(expense?.isCancelled || false);
  const [cancellationDate, setCancellationDate] = useState<string>(() => {
    if (expense?.cancellationDate) return expense.cancellationDate;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [icon, setIcon] = useState(expense?.icon || 'none');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  
  const [logo, setLogo] = useState<string | undefined>(expense?.logo);
  const [_autoLogo, setAutoLogo] = useState<string | undefined>(expense?.name ? getLogoUrl(expense.name) : undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);

  const pmIcon = React.useMemo(() => {
    if (!paymentMethod) return <CreditCard size={14} strokeWidth={2} />;
    const found = (config?.paymentMethods || DEFAULT_PAYMENT_METHODS).find((pm: any) => {
      const pmName = typeof pm === 'string' ? pm : pm?.name;
      return pmName?.toLowerCase() === paymentMethod.toLowerCase();
    });
    const nameToMatch = typeof found === 'string' ? found : found?.name || paymentMethod;
    const isDefault = DEFAULT_PAYMENT_METHODS.some(dm => dm.name.toLowerCase() === nameToMatch.toLowerCase());
    if (isDefault) {
      const IconComp = getPaymentMethodIcon(nameToMatch);
      if (IconComp) return <IconComp size={14} strokeWidth={2} />;
    }
    const iconKey = (found && typeof found !== 'string') ? (found.icon || 'credit-card') : 'credit-card';
    return <CategoryIcon icon={iconKey} size="2xs" noBackground />;
  }, [paymentMethod, config?.paymentMethods]);
  
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
    const isBrand = Boolean(findKnownBrandDomain(trimmedName, category));

    if (isBrand) {
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
        const url = await fetchLogoForName(trimmedName, category);
        setAutoLogo(url);
        
        if (url && !manualSelectionThisSession) {
          setLogo(url);
          setIcon('none');
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setAutoLogo(undefined);
      if (!expense?.logo && !manualSelectionThisSession) {
        setLogo(undefined);
      }
    }
  }, [name, category, manualSelectionThisSession, expense?.logo]);

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
      periodOverrides: isVariable ? (expense?.periodOverrides || {}) : {},
      isCancelled,
      cancellationDate: isCancelled ? cancellationDate : undefined,
      cancelledAt: isCancelled ? (expense?.cancelledAt || Date.now()) : undefined,
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



  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
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
        className="bg-[var(--bg-color)] w-full sm:max-w-xl rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] relative flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[85vh] shadow-modal h-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >


        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden relative z-20" />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 max-w-xl mx-auto w-full">
          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-section-title text-[var(--text-primary)] tracking-tight">
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
          <div className="p-4 sm:p-5 rounded-[var(--radius-card,14px)] bg-[var(--surface-color)] border-none shadow-none space-y-2.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIconSelector(true)}
                className="relative rounded-[var(--radius-xs,8px)] overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer shrink-0 hover:ring-2 hover:ring-[var(--accent-color)]/30 group"
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
                <label className="text-label font-medium uppercase tracking-wider text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Name / Expense' : 'Namn / Utgift'}
                </label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('fixedExpensePlaceholder')} 
                  className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-snug bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            <div className="pt-2.5 border-t border-subtle flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-label font-medium uppercase tracking-wider text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Amount' : 'Belopp'}
                </label>
                <div 
                  onClick={() => amountInputRef.current?.focus()}
                  className="flex items-baseline gap-1.5 font-amount cursor-text w-full"
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
                    className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] text-[30px] sm:text-[36px] placeholder:font-normal placeholder:text-[var(--text-tertiary)] w-full leading-none shrink min-w-[60px]"
                  />
                  <span className="text-secondary font-medium text-[var(--text-tertiary)] uppercase tracking-tight select-none shrink-0 font-sans ml-1 pb-1">
                    {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Grouped Details Module with Dividers */}
          <div className="rounded-[var(--radius-card,20px)] bg-[var(--surface-color)] divide-y divide-subtle overflow-hidden border-none shadow-none">
            {/* Row 1: Category */}
            <div 
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setIsCategorySelectorOpen(true);
              }}
              className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all cursor-pointer group min-h-[58px]"
            >
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                {(() => {
                  const matched = (categories || []).find(c => (c.name || '').trim().toLowerCase() === (category || '').trim().toLowerCase() || c.id === category);
                  return (
                    <CategoryIcon 
                      icon={matched?.icon || 'receipt'} 
                      color={matched?.color || 'var(--accent-color)'}
                      size="xs" 
                      variant="primary" 
                      categoryName={category}
                    />
                  );
                })()}
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                  {category || (config?.language === 'en' ? 'Select category' : 'Välj kategori')}
                </span>
                <ChevronRight size={16} strokeWidth={2} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
              </div>
            </div>

            {/* Row 2: Deduction / Payment Day */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {paymentMethod === 'autogiro' || (typeof paymentMethod === 'string' && (paymentMethod.toLowerCase().includes('autogiro') || paymentMethod.toLowerCase().includes('kort')))
                  ? (config?.language === 'en' ? 'Deduction day' : 'Dragningsdag')
                  : (config?.language === 'en' ? 'Payment day' : 'Betaldag')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors tabular-nums">
                  {formatDeductionDayDisplay(deductionDay, config?.language, true)}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={paymentMethod === 'autogiro' ? (config?.language === 'en' ? 'Deduction day' : 'Dragningsdag') : (config?.language === 'en' ? 'Payment day' : 'Betaldag')}
              >
                {getDeductionDayOptions(config?.language).map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-surface text-[var(--text-primary)] font-medium">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3: Frequency */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('frequency')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Repeat size={14} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
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
                  <option key={key} value={Frequency[key]} className="bg-white dark:bg-surface text-[var(--text-primary)]">
                    {t(`freq_${key.toLowerCase()}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4 (if non-monthly): Start Month (directly below Frequency) */}
            {frequency !== Frequency.MONTHLY && (
              <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {t('startMonthLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    <Calendar size={14} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
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
                      <option key={i} value={i} className="bg-white dark:bg-surface text-[var(--text-primary)]">
                        {capitalizedMonth}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Row 5: Payment Method */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('paymentMethod')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  {pmIcon}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
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
                    <option key={methodName || idx} value={methodName} className="bg-white dark:bg-surface text-[var(--text-primary)]">
                      {methodName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Row 6: Type (Fixed / Variable) */}
            <div className="p-4 flex items-center justify-between min-h-[58px]">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {isVariable ? (config?.language === 'en' ? 'Variable' : 'Varierande') : (config?.language === 'en' ? 'Fixed' : 'Fast belopp')}
                </span>
                <Switch
                  checked={isVariable}
                  onChange={setIsVariable}
                  size="sm"
                  aria-label={t('type')}
                />
              </div>
            </div>

            {/* Row 7: Cancellation Status */}
            <div className="p-4 flex items-center justify-between min-h-[58px]">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {config?.language === 'en' ? 'Sagt upp abonnemang' : 'Sagt upp abonnemang'}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {isCancelled ? (config?.language === 'en' ? 'Yes, cancelled' : 'Ja, sagt upp') : (config?.language === 'en' ? 'No, active' : 'Nej, aktivt')}
                </span>
                <Switch
                  checked={isCancelled}
                  onChange={setIsCancelled}
                  size="sm"
                  aria-label={config?.language === 'en' ? 'Sagt upp abonnemang' : 'Sagt upp abonnemang'}
                />
              </div>
            </div>

            {/* Row 8 (if cancelled): Cancellation Date */}
            {isCancelled && (
              <div className="p-4 flex items-center justify-between min-h-[58px] gap-3 bg-black/[0.02] dark:bg-white/[0.03]">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {config?.language === 'en' ? 'Expiration date' : 'Sista dag (uppsägningsdatum)'}
                </span>
                <input
                  type="date"
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                  className="text-body font-semibold text-[var(--text-primary)] bg-transparent outline-none border border-subtle rounded-[var(--radius-input,14px)] px-2 py-1"
                />
              </div>
            )}

            {/* Row 7: Own Note */}
            <div className="p-4 flex items-center justify-between min-h-[58px] gap-3">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('ownNote')}
              </span>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={config?.language === 'en' ? 'Add note...' : 'Skriv notering...'}
                  className="text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none w-full max-w-[220px] placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
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
          {isCategorySelectorOpen && typeof document !== 'undefined' && document.body && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCategorySelectorOpen(false)} />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className="relative w-full sm:max-w-md bg-[var(--bg-color)] rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] border-none shadow-modal max-h-[85dvh] flex flex-col z-10 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
                <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-subtle shrink-0">
                  <h3 className="text-section-title text-[var(--text-primary)] tracking-tight">{t('category')}</h3>
                  <button
                    type="button"
                    onClick={() => setIsCategorySelectorOpen(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="p-3.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar space-y-1">
                  {(categories || []).map(cat => {
                    const isSelected = category === cat.name;
                    const catColor = cat.color || getCategoryColor(cat.name, categories);
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          if (typeof feedback?.light === 'function') feedback.light();
                          setCategory(cat.name);
                          if (!manualSelectionThisSession && (!expense?.logo || !findKnownBrandDomain(name, cat.name))) {
                            setLogo(undefined);
                          }
                          setIsCategorySelectorOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-card-sm,12px)] transition-colors cursor-pointer text-left active:scale-[0.99] ${
                          isSelected
                            ? 'bg-black/[0.04] dark:bg-white/[0.06]'
                            : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <CategoryIcon 
                            icon={cat.icon} 
                            color={catColor} 
                            size="sm" 
                            variant="primary" 
                            categoryName={cat.name} 
                          />
                          <span className={`text-sm truncate ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>
                            {cat.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white shrink-0">
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
                className="w-full p-3.5 rounded-card-nested bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-subtle flex items-center justify-between group transition-all cursor-pointer touch-press text-left"
              >
                <div>
                  <p className="text-body font-medium text-[var(--text-primary)]">
                    {config?.language === 'en' ? 'Cancel subscription' : 'Säg upp abonnemang'}
                  </p>
                  <p className="text-secondary font-normal text-[var(--text-secondary)] mt-0.5">
                    {config?.language === 'en' ? 'Instructions and direct link' : 'Instruktioner och direktlänk'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Action Button Footer: Bred Spara-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-transparent flex items-center gap-2.5 relative z-10 max-w-xl mx-auto w-full">
          <Button 
            type="button"
            variant="accent"
            size="lg"
            className="flex-1 rounded-[var(--radius-button,12px)] text-body-medium font-semibold"
            onClick={handleSave} 
            icon={<Check size={16} strokeWidth={2.5} />}
          >
            {expense ? (config?.language === 'en' ? 'Save changes' : 'Spara ändringar') : (config?.language === 'en' ? 'Add fixed expense' : 'Lägg till fast kostnad')}
          </Button>

          {expense && onDelete && (
            <IconButton
              icon={<Trash2 size={16} strokeWidth={2} />}
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowDeleteConfirm(true);
              }}
              variant="danger"
              size="xl"
              shape="button"
              title={config?.language === 'en' ? 'Delete' : 'Ta bort'}
              aria-label={config?.language === 'en' ? 'Delete' : 'Ta bort'}
            />
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
                className="bg-[var(--bg-color)] w-full max-w-xl rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] border-none relative overflow-hidden flex flex-col h-[90vh] sm:h-[88vh] shadow-modal font-sans"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0 border-b border-subtle">
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
          config={config || { language: 'sv', currency: currency || 'kr' } as any}
          onDeleteExpense={() => {
            onDelete?.();
            onClose();
          }}
        />
      )}
    </motion.div>,
    document.body
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

  if (typeof document === 'undefined' || !document.body) return null;

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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-modal font-sans border-none"
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
              <IconButton 
                icon={<X size={15} strokeWidth={2.5} />}
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  onClose();
                }} 
                variant="muted"
                size="md"
                title={t('close')}
                aria-label={t('close')}
              />
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
              <span className="text-sm font-medium text-[var(--text-secondary)] ml-1.5 font-sans self-end pb-1">{currency}</span>
            </p>
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines */}
          <div className="divide-y divide-subtle text-left">
            {/* Type */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center justify-end gap-2">
                <CategoryIcon icon={saving.icon || 'piggy-bank'} variant="minimal" size="xs" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {t('monthlySavings')}
                </span>
              </div>
            </div>

            {/* Frequency */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('frequency')}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right">
                {freqText}
              </span>
            </div>

            {/* Deduction Day */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {config.language === 'en' ? 'Deduction day' : 'Dragningsdag'}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right tabular-nums">
                {formatDeductionDayDisplay(saving.deductionDay, config.language, true)}
              </span>
            </div>

            {/* Payment Method */}
            {saving.paymentMethod && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {t('paymentMethod')}
                </span>
                <div className="flex items-center justify-end gap-2">
                  {methodStr && <PaymentIcon size={14} className="text-[var(--text-secondary)]" />}
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {methodStr}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer: Bred Redigera-knapp och Radera */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-transparent flex items-center gap-2.5 relative z-10">
          <Button 
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 rounded-full text-body font-medium"
            onClick={() => {
              if (typeof feedback?.tap === 'function') feedback.tap();
              onEdit(saving);
            }} 
            icon={<Pencil size={14.5} strokeWidth={2} className="dark:text-white" />}
          >
            {t('edit')}
          </Button>

          <IconButton 
            icon={<Trash2 size={16} strokeWidth={2} />}
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              setShowDeleteConfirm(true);
            }} 
            variant="default"
            size="md"
            title={t('delete')}
            aria-label={t('delete')}
          />
        </div>
      </motion.div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={config.language === 'en' ? "Delete monthly saving?" : "Radera månadssparande?"}
          message={
            config.language === 'en'
              ? `Do you want to delete ${saving.name} (${formatAmount(saving.amount, config.language)} ${currency})?`
              : `Vill du radera ${saving.name} (${formatAmount(saving.amount, config.language)} ${currency})?`
          }
          confirmText={config.language === 'en' ? "Delete" : "Radera"}
          cancelText={config.language === 'en' ? "Cancel" : "Avbryt"}
          variant="danger"
          onConfirm={() => {
            onDelete(saving.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          t={t}
        />
      )}
    </motion.div>,
    document.body
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
  const rawAmount = saving?.amount !== undefined && saving?.amount !== null ? saving.amount : (saving as any)?.targetAmount;
  const [amount, setAmount] = useState(formatAmount(rawAmount !== undefined && rawAmount !== null ? String(rawAmount) : ''));
  
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

  const pmIcon = React.useMemo(() => {
    if (!paymentMethod) return <CreditCard size={14} strokeWidth={2} />;
    const found = (config?.paymentMethods || DEFAULT_PAYMENT_METHODS).find((pm: any) => {
      const pmName = typeof pm === 'string' ? pm : pm?.name;
      return pmName?.toLowerCase() === paymentMethod.toLowerCase();
    });
    const nameToMatch = typeof found === 'string' ? found : found?.name || paymentMethod;
    const isDefault = DEFAULT_PAYMENT_METHODS.some(dm => dm.name.toLowerCase() === nameToMatch.toLowerCase());
    if (isDefault) {
      const IconComp = getPaymentMethodIcon(nameToMatch);
      if (IconComp) return <IconComp size={14} strokeWidth={2} />;
    }
    const iconKey = (found && typeof found !== 'string') ? (found.icon || 'credit-card') : 'credit-card';
    return <CategoryIcon icon={iconKey} size="2xs" noBackground />;
  }, [paymentMethod, config?.paymentMethods]);

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

  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
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
        className="bg-[var(--bg-color)] w-full sm:max-w-xl rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] relative flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[85vh] shadow-modal h-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden relative z-20" />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 max-w-xl mx-auto w-full">
          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-section-title text-[var(--text-primary)] tracking-tight">
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
          <div className="p-4 sm:p-5 rounded-[var(--radius-card,14px)] bg-[var(--surface-color)] border-none shadow-none space-y-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIconSelector(true)}
                className="relative rounded-full overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer shrink-0 hover:ring-2 hover:ring-[var(--accent-color)]/30 group"
                title={t('chooseIcon')}
                aria-label={t('chooseIcon')}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl overflow-hidden bg-black/5 dark:bg-white/5">
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
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <label className="text-label font-medium uppercase tracking-wider text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Name / Goal' : 'Namn / Sparmål'}
                </label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('savingsGoalPlaceholder')} 
                  className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-snug bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-subtle flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-label font-medium uppercase tracking-wider text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Amount' : 'Belopp'}
                </label>
                <div 
                  onClick={() => amountInputRef.current?.focus()}
                  className="flex items-center gap-2 font-amount cursor-text w-full"
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
                    className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] text-[30px] sm:text-[36px] placeholder:font-normal placeholder:text-[var(--text-tertiary)] w-full leading-none shrink min-w-[60px]"
                  />
                  <span className="text-secondary font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-black/[0.04] dark:bg-white/[0.06] border border-subtle px-2.5 py-1 rounded-[var(--radius-button-sm,8px)] select-none shrink-0 font-sans">
                    {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Grouped Details Module with Dividers */}
          <div className="rounded-[var(--radius-card,20px)] bg-[var(--surface-color)] divide-y divide-subtle overflow-hidden border-none shadow-none">
            {/* Row 1: Deduction Day */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('deductionDay') || 'Dragningsdag'}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-icon-button flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors tabular-nums">
                  {formatDeductionDayDisplay(deductionDay, config?.language, true)}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-0.5" />
              </div>
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title={t('deductionDay') || 'Dragningsdag'}
              >
                {getDeductionDayOptions(config?.language).map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-surface text-[var(--text-primary)] font-medium">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 2: Frequency */}
            <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('frequency')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-icon-button flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Repeat size={14} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
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
                  <option key={key} value={Frequency[key]} className="bg-white dark:bg-surface text-[var(--text-primary)]">
                    {t(`freq_${key.toLowerCase()}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3 (if non-monthly): Start Month (directly below frequency) */}
            {frequency !== Frequency.MONTHLY && (
              <div className="p-4 flex items-center justify-between min-h-[58px] relative cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {t('startMonthLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-icon-button flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    <Calendar size={14} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
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
                      <option key={i} value={i} className="bg-white dark:bg-surface text-[var(--text-primary)]">
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
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {t('paymentMethod') || 'Betalmetod'}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-icon-button flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors">
                    {pmIcon}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate max-w-[140px] sm:max-w-[180px]">
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
                    return <option key={pmName} value={pmName} className="bg-white dark:bg-surface text-[var(--text-primary)]">{pmName}</option>;
                  })}
                </select>
              </div>
            )}

            {/* Row 5: Type (Fixed / Variable) */}
            <div className="p-4 flex items-center justify-between min-h-[58px]">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('type')}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {isVariable ? (config?.language === 'en' ? 'Variable' : 'Varierande') : (config?.language === 'en' ? 'Fixed' : 'Fast belopp')}
                </span>
                <Switch
                  checked={isVariable}
                  onChange={setIsVariable}
                  size="sm"
                  aria-label={t('type')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Footer: Bred Spara-knapp och Radera-knapp */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-transparent flex items-center gap-2.5 relative z-10 max-w-xl mx-auto w-full">
          <Button 
            type="button"
            variant="accent"
            size="lg"
            className="flex-1 rounded-[var(--radius-button,12px)] text-body-medium font-semibold"
            onClick={handleSave} 
            icon={<Check size={16} strokeWidth={2.5} />}
          >
            {saving ? (config?.language === 'en' ? 'Save changes' : 'Spara ändringar') : (config?.language === 'en' ? 'Add saving' : 'Lägg till månadssparande')}
          </Button>

          {saving && onDelete && (
            <IconButton
              icon={<Trash2 size={16} strokeWidth={2} />}
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowDeleteConfirm(true);
              }}
              variant="danger"
              size="xl"
              shape="button"
              title={config?.language === 'en' ? 'Delete' : 'Ta bort'}
              aria-label={config?.language === 'en' ? 'Delete' : 'Ta bort'}
            />
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
                className="bg-[var(--bg-color)] w-full max-w-xl rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)] border-none relative overflow-hidden flex flex-col h-[90vh] sm:h-[88vh] shadow-modal font-sans"
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
    </motion.div>,
    document.body
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
            className="w-16 h-16 rounded-icon-button bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center transition-all active:scale-95 group cursor-pointer border border-subtle relative overflow-hidden text-[var(--text-primary)]"
            title="Välj ikon"
          >
            <CategoryIcon 
              icon={icon} 
              size="lg" 
              noBackground 
            />
          </button>
          <span className="text-label font-medium text-[var(--text-tertiary)] mt-2">
            Tryck för att byta ikon (valfritt)
          </span>
        </div>

        <div className="space-y-4">
          <Input 
            type="text" 
            placeholder="Namn på betalningsmetod"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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
