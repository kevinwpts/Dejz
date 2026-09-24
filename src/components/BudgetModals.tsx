import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

import { X, Check, Trash2, ChevronDown, Receipt, PiggyBank, Banknote, Pencil } from 'lucide-react';
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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6"
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
              {income.name}
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
              onClick={() => onEdit(income)} 
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

          <div className="bg-[var(--surface-muted)]/50 p-5 rounded-[16px] border border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1">{t('amount')}</p>
            <div className="flex flex-col">
              <p className="text-3xl font-semibold text-success font-amount">
                <span className="opacity-40 mr-1">+</span>
                <span className="font-amount">{formatAmount((income.isVariable && income.periodOverrides && currentPeriodId && income.periodOverrides[currentPeriodId] !== undefined) ? income.periodOverrides[currentPeriodId] : income.amount)}</span>
                <span className="text-xl font-semibold text-[var(--text-secondary)] opacity-40 ml-2 font-sans">{currency}</span>
              </p>
              {(income.isVariable && income.periodOverrides && currentPeriodId && income.periodOverrides[currentPeriodId] !== undefined) && (
                <p className="text-xs font-medium text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
                  <span>{t('adjustmentFor')} {currentPeriodId}</span>
                  <span className="opacity-70">({t('plannedAmount')}: {formatAmount(income.amount)} {currency})</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('merchant')}</p>
              <p className="text-base font-medium text-[var(--text-primary)] break-words">{income.name}</p>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('category')}</p>
              <div className="flex items-center gap-2.5">
                <CategoryIcon 
                  icon={income.icon || '💰'} 
                  size="sm" 
                />
                <p className="text-base font-medium text-[var(--text-primary)] break-words">
                  {income.category || '-'}
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('type')}</p>
              <p className="text-base font-medium text-[var(--text-primary)]">{income.isVariable ? 'Varierande' : 'Fast belopp'}</p>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('arrivalDay')}</p>
              <p className="text-base font-medium text-[var(--text-primary)]">{income.deductionDay ? `${income.deductionDay}e` : '-'}</p>
            </div>

            {income.note && (
              <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">Notering</p>
                <p className="text-base font-medium text-[var(--text-primary)] break-words">{income.note}</p>
              </div>
            )}
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
              onDelete(income.id);
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

export function IncomeModal({ income, onClose, onSave, onDelete, t, currency, userId, isPro, categories, paymentMethods, _currentPeriodId, initialDeductionDay }: IncomeModalProps & { paymentMethods: any[], _currentPeriodId?: string, currentPeriodId?: string, initialDeductionDay?: number }) {
  useScrollLock(true);
  const [name, setName] = useState(income?.name || '');
  const [note, setNote] = useState(income?.note || '');
  const [amount, setAmount] = useState(formatAmount(income?.amount || ''));
  
  const [deductionDay, setDeductionDay] = useState(income?.deductionDay || initialDeductionDay || 25);
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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[var(--border-color)]/60 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[var(--border-color)]">
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
                    className="w-full bg-transparent text-[var(--text-primary)] outline-none font-amount text-[44px] font-semibold text-center tracking-tighter leading-none placeholder-[var(--text-tertiary)]/30"
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
                placeholder={t('incomePayerPlaceholder')} 
                className="w-full bg-[var(--surface-muted)]/50 text-[15px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]/30 rounded-[16px] px-4 py-3.5 border border-[var(--border-color)] focus:border-accent/40" 
              />
              {name && (
                <button 
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1 cursor-pointer"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1 block">Egen notering</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Skriv en notering..."
              className="w-full bg-[var(--surface-muted)]/50 text-[15px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]/30 rounded-[16px] px-4 py-3.5 border border-[var(--border-color)] focus:border-accent/40 min-h-[100px] resize-none"
            />
          </div>

          {/* Arrival Day */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1 block">{t('arrivalDay')}</label>
            <div className="relative">
              <select
                value={deductionDay}
                onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                className="w-full appearance-none bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] px-4 py-3.5 text-[15px] font-medium text-[var(--text-primary)] focus:border-accent/40 outline-none transition-all pr-10 cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
            </div>
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
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[24px] border border-[var(--border-color)] relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
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
  const expenseCompatible = {
    ...expense,
    note: expense.name,
    type: 'expense' as const,
    timestamp: Date.now() // Dummy for logo logic
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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6"
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
              {expense.name}
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
              onClick={() => onEdit(expense)} 
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

          <div className="bg-[var(--surface-muted)]/50 p-5 rounded-[16px] border border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1">{t('amount')}</p>
            <div className="flex flex-col">
              <p className="text-3xl font-semibold text-[var(--text-primary)] font-amount">
                <span className="opacity-40 mr-1">-</span>
                <span className="font-amount">{formatAmount((expense.isVariable && expense.periodOverrides && currentPeriodId && expense.periodOverrides[currentPeriodId] !== undefined) ? expense.periodOverrides[currentPeriodId] : expense.amount)}</span>
                <span className="text-xl font-semibold text-[var(--text-secondary)] opacity-40 ml-2 font-sans">{currency}</span>
              </p>
              {(expense.isVariable && expense.periodOverrides && currentPeriodId && expense.periodOverrides[currentPeriodId] !== undefined) && (
                <p className="text-xs font-medium text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
                  <span>{t('adjustmentFor')} {currentPeriodId}</span>
                  <span className="opacity-70">({t('plannedAmount')}: {formatAmount(expense.amount)} {currency})</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('merchant')}</p>
              <p className="text-base font-medium text-[var(--text-primary)] break-words">{expense.name}</p>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('category')}</p>
              <div className="flex items-center gap-2.5">
                <CategoryIcon 
                  icon={expense.icon || '🏠'} 
                  size="sm" 
                />
                <p className="text-base font-medium text-[var(--text-primary)] break-words">
                  {typeof expense.category === 'object' ? (expense.category as any)?.name : (expense.category || '')}
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('type')}</p>
              <p className="text-base font-medium text-[var(--text-primary)]">{expense.isVariable ? 'Varierande' : 'Fast belopp'}</p>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('frequency')}</p>
              <p className="text-base font-medium text-[var(--text-primary)]">{t(`freq_${Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === expense.frequency)?.toLowerCase()}` as TranslationKey)}</p>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('deductionDay')}</p>
              <p className="text-base font-medium text-[var(--text-primary)]">{expense.deductionDay ? `${expense.deductionDay}e` : '-'}</p>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('paymentMethod')}</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const methodStr = typeof expense.paymentMethod === 'object' ? (expense.paymentMethod as any)?.name : (expense.paymentMethod || '');
                  const PaymentIcon = getPaymentMethodIcon(methodStr);
                  return <span className="text-[var(--text-secondary)]"><PaymentIcon size={16} /></span>;
                })()}
                <p className="text-base font-medium text-[var(--text-primary)] break-words">
                  {typeof expense.paymentMethod === 'object' ? (expense.paymentMethod as any)?.name : (expense.paymentMethod || '-')}
                </p>
              </div>
            </div>

            {expense.note && (
              <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">Notering</p>
                <p className="text-base font-medium text-[var(--text-primary)] break-words">{expense.note}</p>
              </div>
            )}
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

export function FixedExpenseModal({ expense, onClose, onSave, onDelete, t, currency, categories, userId, isPro, paymentMethods, _currentPeriodId }: FixedExpenseModalProps & { categories: Category[], _currentPeriodId?: string, currentPeriodId?: string }) {
  useScrollLock(true);
  const [amount, setAmount] = useState(formatAmount(expense?.amount || ''));
  const [note, setNote] = useState(expense?.note || '');
  
  const [category, setCategory] = useState(typeof expense?.category === 'object' ? (expense.category as any)?.name : (expense?.category || (categories && categories.length > 0 ? categories[0].name : '')));
  const [name, setName] = useState(expense?.name || '');
  const [deductionDay, setDeductionDay] = useState(expense?.deductionDay || 1);
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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[var(--border-color)]/60 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[var(--border-color)]">
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
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] text-center truncate px-2">
              {expense ? t('edit') : t('newFixedExpense')}
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
                    className="w-full bg-transparent text-[var(--text-primary)] outline-none font-amount text-[44px] font-semibold text-center tracking-tighter leading-none placeholder-[var(--text-tertiary)]/30" 
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
                {t('fixedExpenseLabel')}
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
                placeholder={t('fixedExpensePlaceholder')} 
                className="w-full bg-[var(--surface-muted)]/50 text-[15px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]/30 rounded-[16px] px-4 py-3.5 border border-[var(--border-color)] focus:border-accent/40" 
              />
              {name && (
                <button 
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1 cursor-pointer"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1 block">Egen notering</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Skriv en notering..."
              className="w-full bg-[var(--surface-muted)]/50 text-[15px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]/30 rounded-[16px] px-4 py-3.5 border border-[var(--border-color)] focus:border-accent/40 min-h-[100px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1 block">{t('deductionDay')}</label>
              <div className="relative">
                <select
                  value={deductionDay}
                  onChange={(e) => setDeductionDay(parseInt(e.target.value))}
                  className="w-full appearance-none bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] px-4 py-3.5 text-[15px] font-medium text-[var(--text-primary)] focus:border-accent/40 outline-none transition-all pr-10 cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1 block">{t('paymentMethod')}</label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full appearance-none bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] px-4 py-3.5 text-[15px] font-medium text-[var(--text-primary)] focus:border-accent/40 outline-none transition-all pr-10 cursor-pointer"
                >
                  {(paymentMethods || []).map((method, idx) => {
                    const methodName = typeof method === 'string' ? method : method?.name || '';
                    return (
                      <option key={methodName || idx} value={methodName}>{methodName}</option>
                    );
                  })}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
              </div>
            </div>
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

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1 block">{t('frequency')}</label>
            <div className="relative">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full appearance-none bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] px-4 py-3.5 text-[15px] font-medium text-[var(--text-primary)] focus:border-accent/40 outline-none transition-all pr-10 cursor-pointer"
              >
                {(Object.keys(Frequency) as Array<keyof typeof Frequency>).map(key => (
                  <option key={key} value={Frequency[key]}>{t(`freq_${key.toLowerCase()}` as TranslationKey)}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]" />
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
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[24px] border border-[var(--border-color)] relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6"
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

          <div className="bg-[var(--surface-muted)]/50 p-5 rounded-[16px] border border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1">{t('amount')}</p>
            <p className="text-3xl font-semibold text-accent font-amount">
              <span className="opacity-40 mr-1">→</span>
              <span className="font-amount">{formatAmount(saving.amount)}</span>
              <span className="text-xl font-semibold text-[var(--text-secondary)] opacity-40 ml-2 font-sans">{currency}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('savingsGoal') || 'Sparmål'}</p>
              <p className="text-base font-medium text-[var(--text-primary)] break-words">{saving.name}</p>
            </div>

            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('type')}</p>
              <div className="flex items-center gap-2.5">
                <CategoryIcon 
                  icon={saving.icon || 'piggy-bank'} 
                  size="sm" 
                />
                <p className="text-base font-medium text-[var(--text-primary)] break-words">
                  {t('monthlySavings')}
                </p>
              </div>
            </div>

            {saving.deductionDay ? (
              <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('deductionDay')}</p>
                <p className="text-base font-medium text-[var(--text-primary)]">{`${saving.deductionDay}e`}</p>
              </div>
            ) : null}

            {saving.paymentMethod ? (
              <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('paymentMethod')}</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const methodStr = typeof saving.paymentMethod === 'object' ? (saving.paymentMethod as any)?.name : (saving.paymentMethod || '');
                    const PaymentIcon = getPaymentMethodIcon(methodStr);
                    return <span className="text-[var(--text-secondary)]"><PaymentIcon size={16} /></span>;
                  })()}
                  <p className="text-base font-medium text-[var(--text-primary)] break-words">
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

export function MonthlySavingModal({ saving, onClose, onSave, onDelete, t, currency, userId, isPro, paymentMethods, _currentPeriodId }: MonthlySavingModalProps & { paymentMethods: any[], _currentPeriodId?: string, currentPeriodId?: string }) {
  useScrollLock(true);
  const [name, setName] = useState(saving?.name || '');
  const [amount, setAmount] = useState(formatAmount(saving?.amount || ''));
  
  const deductionDay = saving?.deductionDay || 1;
  const firstPaymentMethod = paymentMethods && paymentMethods.length > 0 ? (typeof paymentMethods[0] === 'string' ? paymentMethods[0] : paymentMethods[0]?.name) : 'Autogiro';
  const paymentMethod = typeof saving?.paymentMethod === 'string' ? saving.paymentMethod : (saving?.paymentMethod as any)?.name || firstPaymentMethod;
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

    onSave({ 
      name, 
      amount: parsedAmount, 
      icon, 
      logo, 
      deductionDay, 
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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[var(--border-color)]/60 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[var(--border-color)]">
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
                    className="w-full bg-transparent text-[var(--text-primary)] outline-none font-amount text-[44px] font-semibold text-center tracking-tighter leading-none placeholder-[var(--text-tertiary)]/30" 
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
                className="w-full bg-[var(--surface-muted)]/50 text-[15px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]/30 rounded-[16px] px-4 py-3.5 border border-[var(--border-color)] focus:border-accent/40" 
              />
              {name && (
                <button 
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1 cursor-pointer"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              )}
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
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[24px] border border-[var(--border-color)] relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
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
          className="bg-[var(--bg-color)] w-full max-w-sm rounded-[28px] overflow-hidden flex flex-col relative border border-[var(--border-color)] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
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
