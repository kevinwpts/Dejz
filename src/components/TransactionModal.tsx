import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { X, ChevronDown, Calendar, Plus, Camera, Trash2, Check } from 'lucide-react';
import { Transaction, Category, TransactionSplit } from '../types';
import { TranslationKey, Language } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { fetchLogoForName, getLogoUrl, findKnownBrandDomain } from '../utils/logo';
import { uploadLogo } from '../services/storageService';
import { CalendarWidget } from './CalendarWidget';
import { IconSelector } from './IconSelector';
import { CategoryModal } from './CategoryModal';
import { CategoryTile } from './CategoryTile';
import { suggestIcon, suggestCategory } from '../utils/icons';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { QuickMathToolbar } from './QuickMathToolbar';
import { evaluateAndFormatAmount } from '../utils/mathUtils';

interface TransactionModalProps {
  transaction: Transaction | null;
  transactions?: Transaction[];
  type?: 'income' | 'expense' | 'savings';
  date?: Date;
  categories: Category[];
  calendarDays: any[];
  periodStart: Date;
  periodEnd: Date;
  onClose: () => void;
  onSave: (e: Omit<Transaction, 'id' | 'timestamp'> & { date?: Date }) => void;
  onChangeType?: (type: 'income' | 'expense') => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
  isPro: boolean;
  userId?: string;
  onCreateCategory?: (name: string, icon: string, type: 'income' | 'expense') => Promise<Category | null>;
  config?: any;
  prefill?: {
    amount?: number;
    name?: string;
    category?: string;
    note?: string;
  };
}

const COLORS = ['#2A2A2A', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#333333', '#222222', '#555555', '#444444'];

export function TransactionModal({ 
  transaction, 
  type = 'expense', 
  date, 
  categories = [], 
  transactions,
  calendarDays = [],
  _periodStart,
  _periodEnd,
  onClose, 
  onSave, 
  onChangeType, 
  t, 
  currentLang,
  isPro,
  userId,
  onCreateCategory,
  config,
  prefill
}: TransactionModalProps) {
  useScrollLock(true);
  const getLocale = () => {
    const lang = currentLang || 'sv';
    const mapping: Record<string, string> = {
      sv: 'sv-SE',
      en: 'en-US',
      no: 'no-NO',
      da: 'da-DK',
      fi: 'fi-FI'
    };
    return mapping[lang] || 'sv-SE';
  };
  const [amount, setAmount] = useState(formatAmount(transaction?.amount?.toString() || prefill?.amount?.toString() || ''));
  const [splits, setSplits] = useState<TransactionSplit[]>(transaction?.splits || []);
  const [category, setCategory] = useState(transaction?.category || prefill?.category || (categories && categories.length > 0 ? categories[0].name : ''));
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(!!prefill?.category);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [note, setNote] = useState(transaction?.note || prefill?.note || '');
  const [merchant, setMerchant] = useState(transaction?.merchant || prefill?.name || '');
  const [icon, setIcon] = useState(transaction?.icon || 'none');
  const [logo, setLogo] = useState<string | undefined>(transaction?.logo);
  const [_logoError, setLogoError] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(transaction?.receiptUrl);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const originalMerchant = useRef(transaction?.merchant || '');
  const originalNote = useRef(transaction?.note || '');
  const [manualSelectionThisSession, setManualSelectionThisSession] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [_showAdvanced, _setShowAdvanced] = useState(true);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [validationError, setValidationError] = useState<'amount' | 'note' | null>(null);
  const _inputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const merchantInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const currency = t('currency') || 'SEK';
  const categoryData = categories.find(c => c.name === category);
  const _categoryColor = categoryData?.color;

  const isSplitsValid = splits.length === 0 || splits.every(s => s.category !== '');

  useEffect(() => {
    if (validationError) setValidationError(null);
  }, [amount, note]);

  // const parsedAmount = parseAmount(amount);



  useEffect(() => {
    if (transaction || hasManuallySelectedCategory) return;
    
    // Auto-categorize based on merchant or note
    const query = merchant.trim().toLowerCase() || note.trim().toLowerCase();
    if (query.length >= 2) {
      // 1. Check user's previous transaction history
      const match = transactions?.find(t => 
        (t.merchant && t.merchant.trim().toLowerCase() === query) ||
        (t.note && t.note.trim().toLowerCase() === query)
      );
      
      if (match && match.category && categories && categories.some(c => c.name === match.category)) {
        setCategory(match.category);
        return;
      }

      // 2. Fall back to smart category suggestion (e.g. Fitness 24/7 -> Hälsa)
      const suggested = suggestCategory(query, categories);
      if (suggested) {
        setCategory(suggested);
      }
    }
  }, [merchant, note, transaction, transactions, categories, hasManuallySelectedCategory]);

  useEffect(() => {
    if (categories && categories.length > 0 && !categories.find(c => c.name === category)) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  useEffect(() => {
    const brandQuery = merchant.trim() || note.trim();
    
    if (!brandQuery) {
      if (!manualSelectionThisSession) {
        setLogo(undefined);
        setIcon('receipt');
      }
      setLogoError(false);
      return;
    }

    const searchName = brandQuery;
    // 1. Instant check for known brand domains (e.g. Coop -> coop.se, ICA -> ica.se, Willys, SATS, etc.)
    const knownDomain = findKnownBrandDomain(merchant) || findKnownBrandDomain(note) || findKnownBrandDomain(brandQuery);
    const instantLogo = knownDomain ? `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128` : getLogoUrl(brandQuery);
    const suggestedIcon = suggestIcon(searchName);

    if (!manualSelectionThisSession) {
      if (instantLogo) {
        setLogo(instantLogo);
        setIcon('receipt');
        setLogoError(false);
        return;
      } else if (suggestedIcon && suggestedIcon !== '🧾') {
        const hasChanged = merchant !== originalMerchant.current || note !== originalNote.current;
        if (hasChanged || !logo) {
          setIcon(suggestedIcon);
        }
      }
    }

    const timer = setTimeout(async () => {
      if (manualSelectionThisSession) return;

      const url = await fetchLogoForName(brandQuery || searchName);
      setLogoError(false);
      
      const hasChanged = merchant !== originalMerchant.current || note !== originalNote.current;

      if (url && (hasChanged || !logo)) {
        setLogo(url);
        setIcon('receipt');
      } else if (!url && hasChanged) {
        // If no logo found, suggest an icon based on the name
        setLogo(undefined);
        if (suggestedIcon && suggestedIcon !== '🧾') {
          setIcon(suggestedIcon);
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [merchant, note, category, manualSelectionThisSession]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (transaction?.timestamp) {
      return new Date(transaction.timestamp);
    }
    
    const now = new Date();
    if (date) {
      const d = new Date(date);
      const isToday = d.getDate() === now.getDate() && 
                      d.getMonth() === now.getMonth() && 
                      d.getFullYear() === now.getFullYear();
      
      if (isToday) {
        return now;
      }
      
      if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
      return d;
    }
    
    return now;
  });

  const previewTransaction = useMemo(() => ({
    ...transaction,
    id: transaction?.id || 'preview',
    merchant: merchant.trim(),
    note: note.trim(),
    category: category,
    amount: parseAmount(amount),
    type: type as any,
    logo: logo || 'none',
    icon: icon || 'receipt',
    timestamp: selectedDate?.getTime() || Date.now(),
    tags: [],
    splits: splits
  }), [transaction, merchant, note, category, amount, type, logo, icon, selectedDate, splits]);

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
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[28px] border-t sm:border border-[var(--border-color)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-[var(--border-color)] rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header Section */}
        <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-[var(--border-color)]">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setShowIconSelector(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all duration-300 active:scale-95 ${(merchant.trim() || note.trim()) ? 'shadow-xs' : ''}`}
              title={t('chooseIcon')}
            >
              <TransactionLogo 
                size="sm"
                config={config}
                transaction={previewTransaction} 
              />
            </button>
          </div>
          <div className="flex justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {!transaction && onChangeType ? (
                <motion.div 
                  key="type-selector"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="inline-flex p-1 bg-[var(--surface-muted)] rounded-[10px] border border-[var(--border-color)]"
                >
                  <button
                    onClick={() => onChangeType('expense')}
                    className={`px-4 py-1.5 text-[11px] font-semibold rounded-[8px] transition-all ${
                      type === 'expense' 
                        ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs' 
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {t('expense')}
                  </button>
                  <button
                    onClick={() => onChangeType('income')}
                    className={`px-4 py-1.5 text-[11px] font-semibold rounded-[8px] transition-all ${
                      type === 'income' 
                        ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs' 
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {t('income')}
                  </button>
                </motion.div>
              ) : (
                <motion.h2 
                  key="title-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg font-semibold tracking-tight text-[var(--text-primary)] text-center truncate px-2"
                >
                  {transaction ? t('edit') : (type === 'income' ? t('newIncome') : t('newExpense'))}
                </motion.h2>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-[var(--border-color)] rounded-full transition-all text-[var(--text-secondary)] active:scale-90 justify-self-end shrink-0"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="shrink overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
              {/* Amount Input */}
              <div className="flex flex-col gap-1">
                <div 
                  onClick={() => amountInputRef.current?.focus()}
                  className="bg-[var(--surface-muted)]/50 rounded-[16px] py-5 px-5 flex items-center justify-between transition-all cursor-text border border-[var(--border-color)] group"
                >
                  <div className="shrink-0 flex items-center min-w-[72px]">
                    {type === 'expense' && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (splits.length === 0) {
                            setSplits([{ id: Math.random().toString(), amount: parseAmount(amount), category: '', tags: [] }]);
                          } else {
                            setSplits([]);
                          }
                        }}
                        className={`text-xs font-medium transition-all px-3 py-1 rounded-full border shadow-xs cursor-pointer ${
                          splits.length > 0 
                            ? "bg-danger text-white border-transparent" 
                            : "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20"
                        }`}
                      >
                        {splits.length > 0 ? "Avbryt" : "Splitta"}
                      </button>
                    )}
                  </div>
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

                <QuickMathToolbar value={amount} onChange={setAmount} inputRef={amountInputRef} currency={currency} />
              </div>

              {/* Merchant Input & Quick Icons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-1">
                    {type === 'income' ? t('incomeSource') : t('merchant')}
                  </label>
                </div>
                <div className="relative group">
                  <input 
                    ref={merchantInputRef}
                    type="text" 
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder={type === 'income' ? t('incomeSourcePlaceholder') : t('merchantPlaceholder')}
                    className={`w-full bg-[var(--surface-muted)]/50 text-[15px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]/30 rounded-[16px] px-4 py-3.5 border border-[var(--border-color)] focus:border-accent/40`}
                  />
                  {merchant && (
                    <button 
                      onClick={() => setMerchant('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1"
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>

              {/* Note Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-[var(--text-secondary)] ml-2">
                  {t('ownNote')}
                </label>
                <div className="relative group">
                  <input 
                    ref={noteInputRef}
                    type="text" 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={type === 'income' ? t('incomeNotePlaceholder') : t('description')}
                    className={`w-full bg-[var(--surface-muted)]/50 text-[15px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]/30 rounded-[16px] px-4 py-3.5 border border-[var(--border-color)] focus:border-accent/40 ${
                      validationError === 'note' ? 'border-danger/30 bg-danger/5' : ''
                    }`}
                  />
                  {note && (
                    <button 
                      onClick={() => setNote('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1"
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>

              {/* Split Transaction */}
              {type === 'expense' && (
                <div className="space-y-4 pt-2">
                  {splits.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-6 bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] overflow-hidden"
                    >
                      {/* Splits List with Sliders */}
                      <div className="space-y-6">
                        {splits.map((split, index) => {
                          const catData = categories.find(c => c.name === split.category);
                          const totalVal = parseAmount(amount);
                          
                          return (
                            <div key={split.id} className="space-y-3 p-3 bg-[var(--surface-color)] rounded-[12px] border border-[var(--border-color)] group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shadow-xs transition-all"
                                    style={{ backgroundColor: split.category ? (catData?.color || COLORS[index % COLORS.length]) : 'var(--surface-muted)' }}
                                  >
                                    <CategoryIcon icon={catData?.icon || 'tag'} size="sm" color={split.category ? "#fff" : "var(--text-tertiary)"} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`text-[13px] font-bold ${split.category ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                                      {split.category || 'Välj kategori'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={split.amount || ''}
                                        onChange={(e) => {
                                          const val = parseAmount(e.target.value);
                                          const newSplits = [...splits];
                                          newSplits[index].amount = val;
                                          setSplits(newSplits);
                                        }}
                                        className="w-24 bg-transparent border-none text-[16px] font-bold text-[var(--text-primary)] text-right outline-none p-0"
                                      />
                                      <span className="text-[12px] font-bold text-[var(--text-secondary)] opacity-40">{currency}</span>
                                    </div>
                                    <div className="h-0.5 w-full bg-[var(--accent-color)]/20 rounded-full mt-0.5" />
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newSplits = splits.filter((_, i) => i !== index);
                                      if (newSplits.length === 1) {
                                        newSplits[0].amount = totalVal;
                                      }
                                      setSplits(newSplits);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-[var(--text-tertiary)] hover:text-danger hover:bg-danger/10 rounded-full transition-all ml-1"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Slider for Split */}
                              <div className="px-1">
                                <input 
                                  type="range"
                                  min="0"
                                  max={totalVal}
                                  step="1"
                                  value={split.amount}
                                  onChange={(e) => {
                                    const newVal = parseFloat(e.target.value);
                                    const newSplits = [...splits];
                                    const diff = newVal - split.amount;
                                    newSplits[index].amount = newVal;
                                    
                                    if (newSplits.length > 1) {
                                      const otherIndices = newSplits.map((_, i) => i).filter(i => i !== index);
                                      const otherSum = otherIndices.reduce((sum, i) => sum + newSplits[i].amount, 0);
                                      
                                      if (otherSum > 0) {
                                        otherIndices.forEach(i => {
                                          const share = newSplits[i].amount / otherSum;
                                          newSplits[i].amount = Math.max(0, newSplits[i].amount - (diff * share));
                                        });
                                      } else {
                                        const nextIdx = (index + 1) % newSplits.length;
                                        newSplits[nextIdx].amount = Math.max(0, totalVal - newVal);
                                      }
                                      
                                      const finalSum = newSplits.reduce((sum, s) => sum + s.amount, 0);
                                      const finalDiff = totalVal - finalSum;
                                      if (Math.abs(finalDiff) > 0.01) {
                                         const lastIdx = otherIndices[otherIndices.length - 1] ?? index;
                                         newSplits[lastIdx].amount = Math.max(0, newSplits[lastIdx].amount + finalDiff);
                                      }
                                    }
                                    setSplits(newSplits);
                                  }}
                                  className="w-full accent-accent h-2 bg-[var(--surface-muted)] rounded-full appearance-none cursor-pointer border border-[var(--border-color)]/20"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Category Add */}
                      <div className="space-y-3">
                         <div className="flex items-center justify-between px-1">
                           <span className="text-xs font-semibold text-[var(--text-secondary)]">Lägg till kategori</span>
                           <span className="text-[11px] font-medium text-[var(--text-tertiary)]">{categories.length} tillgängliga</span>
                         </div>
                         <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-2 px-2">
                           {categories.map(cat => {
                             const isAlreadyInSplit = splits.some(s => s.category === cat.name);
                             return (
                               <button
                                 key={cat.name}
                                 disabled={isAlreadyInSplit}
                                 type="button"
                                 onClick={() => {
                                    const emptySplitIndex = splits.findIndex(s => s.category === '');
                                    if (emptySplitIndex !== -1) {
                                      const newSplits = [...splits];
                                      newSplits[emptySplitIndex].category = cat.name;
                                      setSplits(newSplits);
                                    } else {
                                      const totalVal = parseAmount(amount);
                                      const currentSum = splits.reduce((sum, s) => sum + s.amount, 0);
                                      const remainder = Math.max(0, totalVal - currentSum);
                                      setSplits([...splits, { id: Math.random().toString(), amount: remainder, category: cat.name, tags: [] }]);
                                    }
                                 }}
                                 className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-[14px] border transition-all ${
                                   isAlreadyInSplit 
                                     ? 'bg-[var(--surface-muted)]/50 border-transparent opacity-40' 
                                     : 'bg-[var(--surface-color)] border-[var(--border-color)] hover:border-accent/40 active:scale-95 shadow-xs'
                                 }`}
                               >
                                 <div 
                                   className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white"
                                   style={{ backgroundColor: cat.color || COLORS[0] }}
                                 >
                                   <CategoryIcon icon={cat.icon} size="sm" color="#fff" />
                                 </div>
                                 <span className="text-[10px] font-bold tracking-tight max-w-[60px] truncate">{cat.name}</span>
                               </button>
                             );
                           })}
                         </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

                  {/* Category Selection */}
                  <div className={`space-y-4 pt-6 border-t border-[var(--border-color)]/30 mt-6 ${splits.length > 0 ? 'hidden' : ''}`}>
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[11px] font-medium text-[var(--text-secondary)] ml-1">{t('category')}</h3>
                      <button 
                        onClick={() => setIsCategorySelectorOpen(!isCategorySelectorOpen)}
                        className="text-[11px] font-semibold text-accent hover:opacity-80 transition-opacity flex items-center gap-1.5"
                      >
                        {isCategorySelectorOpen ? t('close') : t('all')} <ChevronDown size={14} strokeWidth={2} className={`transition-transform duration-300 ${isCategorySelectorOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {(isCategorySelectorOpen ? categories : categories.slice(0, 5)).map(cat => {
                        const isActive = category === cat.name;
                        return (
                          <CategoryTile
                            key={cat.name}
                            name={cat.name}
                            icon={cat.icon}
                            color={cat.color}
                            isActive={isActive}
                            onClick={() => {
                              setCategory(cat.name);
                              setHasManuallySelectedCategory(true);
                            }}
                          />
                        );
                      })}
                        {isCategorySelectorOpen ? (
                          <button
                            type="button"
                            onClick={() => setIsAddingCategory(true)}
                            className="flex flex-col items-center justify-center gap-2 p-2.5 sm:p-3 min-h-[88px] rounded-[16px] bg-[var(--surface-muted)]/50 text-[var(--text-primary)] hover:bg-[var(--surface-color)] transition-all group border border-[var(--border-color)] border-solid cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-[10px] bg-[var(--surface-color)] border border-[var(--border-color)] flex items-center justify-center transition-all group-hover:scale-105">
                              <Plus size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-[11.5px] font-medium tracking-tight text-center line-clamp-2 leading-snug break-words opacity-90 w-full px-0.5">
                              {t('newCategory')}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsCategorySelectorOpen(true)}
                            className="flex flex-col items-center justify-center gap-2 p-2.5 sm:p-3 min-h-[88px] rounded-[16px] bg-[var(--surface-muted)]/50 text-[var(--text-tertiary)] hover:bg-[var(--surface-color)] hover:text-[var(--text-secondary)] transition-all group border border-[var(--border-color)] cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-[10px] bg-[var(--bg-color)] border border-[var(--border-color)] flex items-center justify-center group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-color)] transition-all shadow-inner">
                              <Plus size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-[11.5px] font-medium tracking-tight text-center line-clamp-1 opacity-90 w-full px-0.5">
                              {t('more')}
                            </span>
                          </button>
                        )}
                    </div>
                  </div>
            
                  {/* Date Selection */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between ml-2 mr-1">
                      <h3 className="text-[11px] font-medium text-[var(--text-secondary)]">{t('date')}</h3>
                      {new Date(selectedDate).toDateString() !== new Date().toDateString() &&
                       new Date(selectedDate).toDateString() !== new Date(Date.now() - 86400000).toDateString() && (
                        <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                          {new Date(selectedDate).toLocaleDateString(getLocale(), {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDate(new Date());
                          setShowFullCalendar(false);
                        }}
                        className={`flex-1 py-3.5 rounded-[16px] text-[12px] font-semibold tracking-tight transition-all flex items-center justify-center gap-2 ${
                          !showFullCalendar && new Date(selectedDate).toDateString() === new Date().toDateString()
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xs'
                            : 'bg-[var(--surface-muted)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]'
                        }`}
                      >
                        {t('todayLabel')}
                      </button>
                      <button
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          setSelectedDate(yesterday);
                          setShowFullCalendar(false);
                        }}
                        className={`flex-1 py-3.5 rounded-[16px] text-[12px] font-semibold tracking-tight transition-all flex items-center justify-center gap-2 ${
                          !showFullCalendar && new Date(selectedDate).toDateString() === new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xs'
                            : 'bg-[var(--surface-muted)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]'
                        }`}
                      >
                        {t('yesterdayLabel')}
                      </button>
                      <button
                        onClick={() => setShowFullCalendar(!showFullCalendar)}
                        className={`w-14 py-3.5 rounded-[16px] transition-all flex items-center justify-center ${
                          showFullCalendar 
                            ? 'bg-accent text-[var(--text-on-accent)] shadow-xs' 
                            : 'bg-[var(--surface-muted)]/50 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]'
                        }`}
                      >
                        <Calendar size={20} strokeWidth={2} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showFullCalendar && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-[var(--surface-muted)]/50 rounded-[16px] p-4 border border-[var(--border-color)]">
                            <CalendarWidget 
                              calendarDays={calendarDays}
                              normalizedSelectedDate={selectedDate}
                              setSelectedDate={setSelectedDate}
                              t={t}
                              currentLang={currentLang}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Receipt Section */}
                  {type !== 'income' && (
                    <div className="pt-4 space-y-4 pb-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[11px] font-medium text-[var(--text-secondary)] ml-2">{t('receipt')}</h3>
                          {!isPro && (
                            <span className="text-[9px] font-medium text-accent bg-accent/10 px-2.5 py-0.5 rounded-[8px] border border-accent/20">
                              {t('proFeature')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <input 
                            ref={receiptInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !userId) return;
                              
                              setIsUploadingReceipt(true);
                              try {
                                const url = await uploadLogo(file, userId);
                                setReceiptUrl(url);
                              } catch (_error) {
                                console.error('Error uploading receipt:', _error);
                              } finally {
                                setIsUploadingReceipt(false);
                              }
                            }}
                          />
                          {receiptUrl ? (
                            <div className="relative w-24 h-24 rounded-[16px] overflow-hidden group shadow-sm border border-[var(--border-color)]">
                              <img src={receiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setReceiptUrl(undefined)}
                                className="absolute inset-0 bg-danger/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[var(--text-on-accent)]"
                              >
                                <Trash2 size={22} strokeWidth={2} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => isPro && receiptInputRef.current?.click()}
                              disabled={!isPro || isUploadingReceipt}
                              className={`w-24 h-24 rounded-[16px] flex flex-col items-center justify-center gap-2 transition-all border ${
                                !isPro 
                                  ? 'bg-[var(--surface-muted)]/50 border-[var(--border-color)] opacity-50 cursor-not-allowed text-[var(--text-tertiary)]'
                                  : 'bg-[var(--surface-muted)]/50 text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-accent/40 hover:text-accent shadow-xs'
                              }`}
                            >
                              {isUploadingReceipt ? (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                  <span className="text-[10px] font-medium text-accent">{t('uploading')}</span>
                                </div>
                              ) : (
                                <>
                                  <Camera size={24} strokeWidth={1.5} />
                                  <span className="text-[10px] font-medium">{t('add')}</span>
                                </>
                              )}
                            </button>
                          )}
                          
                          {isPro && !receiptUrl && (
                            <p className="text-[13px] font-medium text-[var(--text-tertiary)] opacity-60 max-w-[160px] leading-relaxed">
                              {t('uploadReceipt')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
          </div>

          {/* Register Button */}
          <div className="shrink-0 px-6 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-[var(--border-color)] bg-[var(--bg-color)]">
            <button 
              disabled={!isSplitsValid}
              onClick={() => {
                if (!isSplitsValid) return;
                onSave({
                  merchant,
                  note,
                  category,
                  amount: parseAmount(amount),
                  type: type as any,
                  logo: logo || 'none',
                  icon: icon || 'receipt',
                  paymentMethod: transaction?.paymentMethod,
                  receiptUrl,
                  tags: [],
                  splits: splits,
                  date: selectedDate
                });
                onClose();
              }}
              className="w-full py-3.5 px-5 rounded-[16px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:grayscale cursor-pointer disabled:cursor-not-allowed"
            >
              <Check size={18} strokeWidth={2.5} />
              {type === 'income' ? (t('registerIncome' as any) || 'Registrera inkomst') : (t('registerExpense' as any) || 'Registrera utgift')}
            </button>
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
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <button 
                    onClick={() => setShowIconSelector(false)}
                    className="w-8 h-8 rounded-[10px] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                  <IconSelector
                    name={merchant || note || category}
                    currentLogo={logo}
                    currentIcon={icon}
                    onLogoChange={(newLogo) => {
                      setLogo(newLogo);
                      setLogoError(false);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    onIconChange={(newIcon) => {
                      setIcon(newIcon);
                      setLogo(undefined);
                      setLogoError(false);
                      setManualSelectionThisSession(true);
                      setShowIconSelector(false);
                    }}
                    onRestoreAuto={() => {
                      setManualSelectionThisSession(false);
                      setLogoError(false);
                      setShowIconSelector(false);
                      // The useEffect in TransactionModal will re-trigger the auto-suggestion
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

        <CategoryModal 
          isOpen={isAddingCategory}
          onClose={() => setIsAddingCategory(false)}
          type={type === 'income' ? 'income' : 'expense'}
          initialData={null}
          onSave={async (data) => {
            if (onCreateCategory) {
              const newCat = await onCreateCategory(data.name, data.icon, type === 'income' ? 'income' : 'expense');
              if (newCat) {
                setCategory(newCat.name);
              }
            }
            setIsAddingCategory(false);
          }}
          t={t}
        />
      </motion.div>
    </motion.div>
  );
}
