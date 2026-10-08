import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

import { X, ChevronRight, Calendar, Plus, Camera, Trash2, Check, Loader2, Paperclip, FileText } from 'lucide-react';
import { Transaction, Category, TransactionSplit } from '../types';
import { TranslationKey, Language } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { fetchLogoForName, getLogoUrl, findKnownBrandDomain } from '../utils/logo';
import { uploadLogo } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { CalendarWidget } from './CalendarWidget';
import { IconSelector } from './IconSelector';
import { CategoryModal } from './CategoryModal';
import { suggestIcon, suggestCategory } from '../utils/icons';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { formatFullDate, parseReceiptDate } from '../utils/date';
import { ReceiptCameraModal } from './ReceiptCameraModal';
import { ConfirmModal } from './ConfirmModal';
import { feedback } from '../utils/feedback';
import { getCategoryColor } from '../utils/categoryColors';

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
  onDelete?: (id: string) => void;
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
    receiptUrl?: string;
    date?: Date;
  };
}

const _COLORS = ['#1C1C1C', '#2D2D2D', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#555555', '#444444'];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = (err) => {
      console.error('[Receipt Scan] FileReader error:', err);
      reject(err);
    };
    reader.readAsDataURL(file);
  });
};

const prepareReceiptImage = async (file: File): Promise<{ base64: string; mimeType: string }> => {
  console.log('[Receipt Scan] Starting image preparation:', {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  try {
    const resized = await new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        try {
          URL.revokeObjectURL(objectUrl);
          const maxDimension = 1920;
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas context unavailable');
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          if (!base64) {
            throw new Error('Canvas generated empty base64 string');
          }
          resolve({ base64, mimeType: 'image/jpeg' });
        } catch (canvasErr) {
          URL.revokeObjectURL(objectUrl);
          reject(canvasErr);
        }
      };
      img.onerror = (imgErr) => {
        URL.revokeObjectURL(objectUrl);
        reject(imgErr || new Error('Image element failed to load object URL'));
      };
      img.src = objectUrl;
    });

    console.log('[Receipt Scan] Image successfully prepared via canvas resize:', {
      mimeType: resized.mimeType,
      base64Length: resized.base64.length,
    });
    return resized;
  } catch (canvasError) {
    console.warn('[Receipt Scan] Canvas resize failed, falling back to direct FileReader:', canvasError);
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      console.log('[Receipt Scan] Image successfully prepared via FileReader fallback:', {
        mimeType,
        base64Length: base64.length,
      });
      return { base64, mimeType };
    } catch (readErr) {
      console.error('[Receipt Scan] Both canvas and FileReader failed to prepare image:', readErr);
      throw readErr;
    }
  }
};

export function TransactionModal({ 
  transaction, 
  type = 'expense', 
  date: _date, 
  categories = [], 
  transactions,
  calendarDays = [],
  _periodStart,
  _periodEnd,
  onClose, 
  onSave, 
  onDelete,
  _onChangeType, 
  t, 
  currentLang,
  isPro,
  userId,
  onCreateCategory,
  config,
  prefill
}: TransactionModalProps) {
  useScrollLock(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [amount, setAmount] = useState(formatAmount(transaction?.amount?.toString() || prefill?.amount?.toString() || ''));
  const [splits, setSplits] = useState<TransactionSplit[]>(transaction?.splits || []);
  const [category, setCategory] = useState(transaction?.category || prefill?.category || (categories && categories.length > 0 ? categories[0].name : ''));
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(!!prefill?.category);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const currentCatData = useMemo(() => {
    if (!category) return undefined;
    const catName = typeof category === 'object' ? (category as any)?.name : category;
    const norm = (catName || '').trim().toLowerCase();
    return categories.find(c => c.name.trim().toLowerCase() === norm) || 
      (config?.categories || []).find((c: any) => c.name?.trim().toLowerCase() === norm) ||
      (config?.incomeCategories || []).find((c: any) => c.name?.trim().toLowerCase() === norm);
  }, [categories, category, config]);
  const [note, setNote] = useState(transaction?.note || prefill?.note || '');
  const [merchant, setMerchant] = useState(transaction?.merchant || prefill?.name || '');
  const [icon, setIcon] = useState(transaction?.icon || 'none');
  const [logo, setLogo] = useState<string | undefined>(transaction?.logo);
  const [_logoError, setLogoError] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(transaction?.receiptUrl || prefill?.receiptUrl);
  const [_receiptFileName, setReceiptFileName] = useState<string | undefined>();
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [_scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (transaction?.timestamp) {
      return new Date(transaction.timestamp);
    }
    if (prefill?.date) {
      return prefill.date;
    }
    return _date || new Date();
  });

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const handleReceiptFile = async (file: File) => {
    console.log('[Receipt Scan] File selected by user:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Immediately display preview image to give instant feedback
    const localUrl = URL.createObjectURL(file);
    setReceiptUrl(localUrl);
    setReceiptFileName(file.name);

    setIsUploadingReceipt(true);
    setIsScanningReceipt(true);
    setScanFeedback(null);
    setIsCameraModalOpen(false);

    try {
      if (!isSupabaseConfigured) {
        console.error('[Receipt Scan] Supabase is not configured! isSupabaseConfigured is false.');
      }

      // 1. Process image to base64
      console.log('[Receipt Scan] Step 1: Processing image with prepareReceiptImage...');
      const { base64, mimeType } = await prepareReceiptImage(file);
      console.log('[Receipt Scan] Step 1 completed. Base64 length:', base64?.length, 'mimeType:', mimeType);

      if (!base64 || typeof base64 !== 'string' || base64.trim().length === 0) {
        throw new Error('Kunde inte extrahera bilddata (tom base64).');
      }

      const finalMimeType = mimeType || file.type || 'image/jpeg';
      console.log('[Receipt Scan] Step 2: Calling supabase.functions.invoke("scan-receipt", ...) with mimeType:', finalMimeType);

      // 2. Invoke Supabase Edge Function 'scan-receipt' using existing Supabase client
      const scanPromise = supabase.functions.invoke('scan-receipt', {
        body: {
          image: base64,
          mimeType: finalMimeType,
        },
      });

      // 3. Upload to Supabase Storage if user is signed in
      let uploadPromise: Promise<string | undefined> = Promise.resolve(undefined);
      if (userId && userId !== 'demo-user') {
        uploadPromise = uploadLogo(file, userId).catch((err) => {
          console.warn('[Receipt Scan] Storage upload warning:', err);
          return undefined;
        });
      }

      const [scanResult, uploadedUrl] = await Promise.allSettled([scanPromise, uploadPromise]);

      if (uploadedUrl.status === 'fulfilled' && uploadedUrl.value) {
        setReceiptUrl(uploadedUrl.value);
      }

      if (scanResult.status === 'fulfilled') {
        const { data, error } = scanResult.value;
        if (error) {
          console.error('[Receipt Scan] supabase.functions.invoke error returned:', error);
          let errMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
          if ('context' in error && (error as any).context) {
            try {
              const errBody = await (error as any).context.json();
              console.error('[Receipt Scan] Error body from edge function:', errBody);
              if (errBody?.error) errMsg = errBody.error;
            } catch {
              // ignore
            }
          }
          setScanFeedback({ type: 'error', message: `Kunde inte läsa alla uppgifter automatiskt: ${errMsg}` });
        } else if (data) {
          console.log('[Receipt Scan] scan-receipt data received successfully:', data);
          let hasPrefilled = false;

          // Företag / beskrivning = merchant
          if (data.merchant && typeof data.merchant === 'string' && data.merchant.trim()) {
            const cleanMerchant = data.merchant.trim();
            setMerchant(cleanMerchant);
            hasPrefilled = true;
          }

          // Belopp = amount
          if (data.amount !== undefined && data.amount !== null && !isNaN(Number(data.amount))) {
            const numAmount = Number(data.amount);
            setAmount(formatAmount(numAmount.toString()));
            hasPrefilled = true;
          }

          // Datum = date
          if (data.date) {
            const parsedDate = parseReceiptDate(data.date);
            if (parsedDate) {
              setSelectedDate(parsedDate);
              hasPrefilled = true;
            }
          }

          if (hasPrefilled) {
            setScanFeedback({ type: 'success', message: 'Uppgifter förifyllda från kvittot!' });
          } else {
            setScanFeedback({ type: 'error', message: 'Kunde inte läsa några giltiga uppgifter från kvittot.' });
          }
        }
      } else {
        console.error('[Receipt Scan] scan-receipt promise was rejected:', scanResult.reason);
        const reasonMsg = scanResult.reason?.message || (typeof scanResult.reason === 'string' ? scanResult.reason : JSON.stringify(scanResult.reason));
        setScanFeedback({ type: 'error', message: `Analysen misslyckades: ${reasonMsg}` });
      }
    } catch (err: any) {
      console.error('[Receipt Scan] Receipt scanning failed with error:', err);
      const errMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      setScanFeedback({ type: 'error', message: `Ett fel uppstod: ${errMsg}` });
    } finally {
      setIsUploadingReceipt(false);
      setIsScanningReceipt(false);
    }
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleReceiptFile(file);
    if (e.target) {
      e.target.value = '';
    }
  };
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

  const currency = config?.currency || 'kr';
  const categoryData = categories.find(c => c.name === category);
  const _categoryColor = categoryData?.color;

  const isSplitsValid = splits.length === 0 || splits.every(s => s.category !== '');

  useEffect(() => {
    if (validationError) setValidationError(null);
  }, [amount, note]);

  // const parsedAmount = parseAmount(amount);



  // Reset manual category choice if both inputs are cleared
  useEffect(() => {
    if (!merchant.trim() && !note.trim() && !transaction && !prefill?.category) {
      setHasManuallySelectedCategory(false);
    }
  }, [merchant, note, transaction, prefill]);

  // Keep a ref to hasManuallySelectedCategory to guard async AI response
  const hasManuallySelectedCategoryRef = useRef(hasManuallySelectedCategory);
  useEffect(() => {
    hasManuallySelectedCategoryRef.current = hasManuallySelectedCategory;
  }, [hasManuallySelectedCategory]);

  // Auto-categorize based on:
  // 1. User's previous transactions first (no AI)
  // 2. Debounced AI Edge Function (categorize-transaction) only if no prior match
  useEffect(() => {
    if (transaction || hasManuallySelectedCategory) return;
    if (type !== 'expense') return;

    const normalize = (text?: string | null): string => {
      if (!text) return '';
      return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
    };

    const normMerchant = normalize(merchant);
    const normNote = normalize(note);

    if (normMerchant.length < 2 && normNote.length < 2) return;

    // Helper to find matching previous transactions for a search term
    const findMatchesForTerm = (searchTerm: string) => {
      if (!transactions || searchTerm.length < 2) return [];

      return transactions.filter(t => {
        if (!t.category) return false;
        const catNorm = normalize(t.category);
        if (catNorm === 'okategoriserat' || catNorm === 'uncategorized') return false;

        // Ensure category exists in current categories list (case-insensitive)
        const categoryExists = categories?.some(c => normalize(c.name) === catNorm);
        if (!categoryExists) return false;

        const tMerchant = normalize(t.merchant);
        const tNote = normalize(t.note);

        return tMerchant === searchTerm || tNote === searchTerm;
      });
    };

    // 1. Try to find match in previous transactions first
    let candidates: Transaction[] = [];

    if (normMerchant.length >= 2) {
      candidates = findMatchesForTerm(normMerchant);
    }

    if (candidates.length === 0 && normNote.length >= 2) {
      candidates = findMatchesForTerm(normNote);
    }

    if (candidates.length > 0) {
      // Prior match found -> use latest relevant match and DO NOT call AI
      candidates.sort((a, b) => {
        const aTypeScore = a.type === type ? 1 : 0;
        const bTypeScore = b.type === type ? 1 : 0;
        if (aTypeScore !== bTypeScore) {
          return bTypeScore - aTypeScore;
        }
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      const latestMatch = candidates[0];
      const matchedCategory = categories?.find(
        c => normalize(c.name) === normalize(latestMatch.category)
      );

      if (matchedCategory) {
        setCategory(matchedCategory.name);
        return;
      }
    }

    // 2. If NO previous match found: Call AI Edge Function "categorize-transaction" with debounce
    const targetQuery = merchant.trim() || note.trim();
    if (!targetQuery || targetQuery.length < 2) return;
    if (!categories || categories.length === 0) return;

    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (isCancelled || hasManuallySelectedCategoryRef.current) return;

      try {
        if (!supabase) return;

        const categoryNames = categories.map(c => c.name);
        console.log('[AI Categorize] Calling categorize-transaction with:', {
          merchant: targetQuery,
          categories: categoryNames,
        });

        const { data, error } = await supabase.functions.invoke('categorize-transaction', {
          body: {
            merchant: targetQuery,
            categories: categoryNames,
          },
        });

        if (isCancelled || hasManuallySelectedCategoryRef.current) return;

        if (error) {
          console.warn('[AI Categorize] Edge Function error:', error);
          const fallback = suggestCategory(targetQuery, categories);
          if (fallback && !hasManuallySelectedCategoryRef.current) {
            setCategory(fallback);
          }
          return;
        }

        if (data && typeof data.category === 'string' && data.category.trim()) {
          const suggestedCatName = data.category.trim();
          const matchedCategory = categories.find(
            c => normalize(c.name) === normalize(suggestedCatName)
          );

          if (matchedCategory && !hasManuallySelectedCategoryRef.current) {
            console.log('[AI Categorize] AI suggested category:', matchedCategory.name);
            setCategory(matchedCategory.name);
            return;
          }
        }

        // If AI returns null, fallback to local rule-based category if available
        const fallback = suggestCategory(targetQuery, categories);
        if (fallback && !hasManuallySelectedCategoryRef.current) {
          setCategory(fallback);
        }
      } catch (err) {
        console.warn('[AI Categorize] Edge function invocation failed silently:', err);
        const fallback = suggestCategory(targetQuery, categories);
        if (fallback && !hasManuallySelectedCategoryRef.current) {
          setCategory(fallback);
        }
      }
    }, 600);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [merchant, note, transaction, transactions, categories, hasManuallySelectedCategory, type]);

  useEffect(() => {
    if (categories && categories.length > 0 && !categories.find(c => c.name === category)) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  const resolveBrandVisuals = useCallback(async (customMerchant?: string, customNote?: string) => {
    if (manualSelectionThisSession) return;
    const query = (customMerchant !== undefined ? customMerchant : merchant).trim() || (customNote !== undefined ? customNote : note).trim();
    
    if (!query) {
      setLogo(undefined);
      setIcon('receipt');
      setLogoError(false);
      return;
    }

    const knownDomain = findKnownBrandDomain(query);
    const instantLogo = knownDomain ? `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128` : getLogoUrl(query);
    const suggestedIcon = suggestIcon(query);

    if (instantLogo) {
      setLogo(instantLogo);
      setIcon('receipt');
      setLogoError(false);
      return;
    }

    const url = await fetchLogoForName(query);
    setLogoError(false);
    if (url) {
      setLogo(url);
      setIcon('receipt');
    } else if (suggestedIcon && suggestedIcon !== '🧾') {
      setLogo(undefined);
      setIcon(suggestedIcon);
    } else {
      setLogo(undefined);
      setIcon('receipt');
    }
  }, [merchant, note, manualSelectionThisSession]);

  // Only resolve initial prefill brand visual on mount if not editing existing transaction
  useEffect(() => {
    if (prefill?.name && !transaction && !logo) {
      resolveBrandVisuals(prefill.name);
    }
  }, []);



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

  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
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
        className="bg-[var(--bg-color)] w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[28px] relative flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[85vh] shadow-2xl h-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >


        {/* Drawer Handle on Mobile */}
        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden relative z-20" />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 max-w-xl mx-auto w-full">
          {/* Hidden file input for tickets, receipts and documents */}
          <input 
            ref={receiptInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.heic"
            className="hidden"
            onChange={handleReceiptFileChange}
          />

          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
              {transaction 
                ? (currentLang === 'en' ? 'Edit Transaction' : 'Redigera transaktion') 
                : (type === 'income' 
                    ? (currentLang === 'en' ? 'New Income' : 'Ny inkomst') 
                    : (currentLang === 'en' ? 'New Expense' : 'Ny utgift'))}
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

          {/* Type Segmented Grid (when creating new transaction) */}
          {_onChangeType && !transaction && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/[0.04] dark:bg-white/5 rounded-[14px] border border-black/[0.04] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  _onChangeType('expense');
                }}
                className={`py-2 rounded-[12px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white dark:bg-[#2A2A2A] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {currentLang === 'en' ? 'Expense' : 'Utgift'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  _onChangeType('income');
                }}
                className={`py-2 rounded-[12px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'income'
                    ? 'bg-white dark:bg-[#2A2A2A] text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {currentLang === 'en' ? 'Income' : 'Inkomst'}
              </button>
            </div>
          )}

          {/* 1. Main Hero Card: Icon + Merchant & Amount Input */}
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
                  transaction={previewTransaction} 
                />
              </button>
              <div className="flex-1 min-w-0">
                <input 
                  ref={merchantInputRef}
                  type="text" 
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  onBlur={(e) => resolveBrandVisuals(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      resolveBrandVisuals(e.currentTarget.value);
                      amountInputRef.current?.focus();
                    }
                  }}
                  placeholder={currentLang === 'en' ? 'Name' : 'Namn'}
                  className="text-[19px] sm:text-[21px] font-bold tracking-tight text-[var(--text-primary)] leading-tight bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-baseline justify-start gap-1">
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="flex items-baseline font-amount text-[48px] sm:text-[64px] font-bold tabular-nums tracking-tight cursor-text w-full"
              >
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-secondary)] select-none mr-2 mb-1 sm:mb-2 font-sans shrink-0">
                  {currency}
                </span>
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
                  className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight placeholder:font-normal placeholder-[var(--text-tertiary)] text-[var(--text-primary)] w-full leading-none"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => {}}
                  className="text-[10px] font-bold text-[var(--text-secondary)] whitespace-nowrap bg-black/[0.04] dark:bg-white/[0.06] px-2 py-1 rounded-[10px]"
                >
                  {currentLang === 'en' ? 'Split' : 'Dela upp'}
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Widget if open */}
          <AnimatePresence>
            {showFullCalendar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <CalendarWidget 
                  calendarDays={calendarDays}
                  normalizedSelectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  t={t}
                  currentLang={currentLang}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. Grouped Details Module with Dividers */}
          <div className="rounded-[22px] bg-[var(--surface-color)] divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden border-none shadow-none">
            {/* Row 1: Category or Split Categories */}
            {type === 'expense' && splits.length > 0 ? (
              /* Inline Split Category View */
              <div className="p-4 space-y-3 bg-black/[0.015] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      {currentLang === 'en' ? 'Category Split' : 'Uppdelade kategorier'}
                    </span>
                    {/* Balance Status Indicator (shows only if there is a remaining difference) */}
                    {(() => {
                      const totalVal = parseAmount(amount);
                      const currentSum = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                      const diff = totalVal - currentSum;
                      if (Math.abs(diff) < 0.5) return null;
                      return (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-amount tabular-nums">
                          {formatAmount(Math.max(0, diff).toString())} {currency} {currentLang === 'en' ? 'left' : 'kvar'}
                        </span>
                      );
                    })()}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      setSplits([]);
                    }}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    {currentLang === 'en' ? 'Cancel split' : 'Ta bort uppdelning'}
                  </button>
                </div>

                {/* Split Category Rows */}
                <div className="space-y-2">
                  {splits.map((split, index) => {
                    const catData = categories.find(c => c.name === split.category);

                    return (
                      <div key={split.id || index} className="flex items-center justify-between p-2 rounded-[14px] bg-[var(--surface-color)] border border-black/5 dark:border-white/5 gap-2">
                        {/* Category Selector Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof feedback?.light === 'function') feedback.light();
                            setActiveSplitIndex(index);
                            setIsCategoryPickerOpen(true);
                          }}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer group"
                        >
                          <div 
                            className="w-7 h-7 rounded-[10px] flex items-center justify-center text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: split.category ? (catData?.color || getCategoryColor(split.category, categories)) : 'var(--surface-muted)' }}
                          >
                            <CategoryIcon icon={catData?.icon || 'tag'} size="xs" color={split.category ? "#fff" : "var(--text-tertiary)"} />
                          </div>
                          <span className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] truncate">
                            {split.category || (currentLang === 'en' ? 'Select category' : 'Välj kategori')}
                          </span>
                        </button>

                        {/* Amount Input with Auto-balancing on other splits */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={split.amount ?? ''}
                            onChange={(e) => {
                              const rawVal = parseAmount(e.target.value);
                              const totalVal = parseAmount(amount);

                              if (splits.length <= 1) return;

                              if (splits.length === 2) {
                                // 2 splits: editing index automatically adjusts the other split!
                                const otherIndex = index === 0 ? 1 : 0;
                                const clampedVal = Math.min(totalVal, Math.max(0, rawVal));
                                const newSplits = [...splits];
                                newSplits[index] = { ...newSplits[index], amount: clampedVal };
                                newSplits[otherIndex] = { ...newSplits[otherIndex], amount: totalVal - clampedVal };
                                setSplits(newSplits);
                              } else {
                                // 3 or more splits: editing index adjusts target, and adjusts either the last or second-to-last split
                                const targetAdjustIndex = index === splits.length - 1 ? splits.length - 2 : splits.length - 1;
                                
                                const fixedSum = splits.reduce((sum, s, i) => {
                                  if (i === index || i === targetAdjustIndex) return sum;
                                  return sum + (Number(s.amount) || 0);
                                }, 0);

                                const maxForEdit = Math.max(0, totalVal - fixedSum);
                                const clampedVal = Math.min(maxForEdit, Math.max(0, rawVal));
                                const remainder = Math.max(0, totalVal - fixedSum - clampedVal);

                                const newSplits = [...splits];
                                newSplits[index] = { ...newSplits[index], amount: clampedVal };
                                newSplits[targetAdjustIndex] = { ...newSplits[targetAdjustIndex], amount: remainder };
                                setSplits(newSplits);
                              }
                            }}
                            className="w-20 bg-black/5 dark:bg-white/5 rounded-[10px] px-2 py-1 text-[13.5px] font-bold font-amount tabular-nums text-[var(--text-primary)] text-right outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                            placeholder="0"
                          />
                          <span className="text-[11px] font-bold text-[var(--text-tertiary)] select-none font-amount">
                            {currency}
                          </span>

                          <button 
                            type="button"
                            onClick={() => {
                              if (typeof feedback?.light === 'function') feedback.light();
                              const totalVal = parseAmount(amount);
                              const newSplits = splits.filter((_, i) => i !== index);
                              if (newSplits.length <= 1) {
                                setSplits([]);
                              } else {
                                // Redistribute to maintain total sum
                                const perSplit = Math.floor(totalVal / newSplits.length);
                                let rem = totalVal - perSplit * newSplits.length;
                                setSplits(newSplits.map(s => {
                                  const add = rem > 0 ? 1 : 0;
                                  if (rem > 0) rem--;
                                  return { ...s, amount: perSplit + add };
                                }));
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-rose-500 rounded-full transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons: + Kategori & Fördela jämnt */}
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      const totalVal = parseAmount(amount);
                      const usedCats = splits.map(s => s.category);
                      const unusedCat = categories.find(c => !usedCats.includes(c.name))?.name || '';
                      const newCount = splits.length + 1;
                      const perSplit = Math.floor(totalVal / newCount);
                      let rem = totalVal - perSplit * newCount;

                      const updatedSplits = splits.map(s => {
                        const add = rem > 0 ? 1 : 0;
                        if (rem > 0) rem--;
                        return { ...s, amount: perSplit + add };
                      });
                      updatedSplits.push({ id: Math.random().toString(), amount: perSplit + (rem > 0 ? 1 : 0), category: unusedCat, tags: [] });
                      setSplits(updatedSplits);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-color)] hover:opacity-80 cursor-pointer py-1 px-2.5 rounded-[10px] bg-[var(--accent-color)]/10"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>{currentLang === 'en' ? 'Add category' : 'Kategori'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      const totalVal = parseAmount(amount);
                      if (splits.length === 0) return;
                      const perSplit = Math.floor(totalVal / splits.length);
                      let remainder = totalVal - perSplit * splits.length;
                      setSplits(splits.map(s => {
                        const add = remainder > 0 ? 1 : 0;
                        if (remainder > 0) remainder--;
                        return { ...s, amount: perSplit + add };
                      }));
                    }}
                    className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {currentLang === 'en' ? 'Equalize' : 'Fördela jämnt'}
                  </button>
                </div>
              </div>
            ) : (
              /* Single Category Row with Inline Split Button */
              <div className="p-4 flex items-center justify-between min-h-[60px] gap-2">
                <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                  {t('category')}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      setActiveSplitIndex(null);
                      setIsCategoryPickerOpen(true);
                    }}
                    className="flex items-center gap-2 p-1.5 px-2.5 rounded-[14px] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer group"
                  >
                    <div 
                      className="w-6 h-6 rounded-[10px] flex items-center justify-center shrink-0 text-white shadow-2xs"
                      style={{ 
                        backgroundColor: currentCatData?.color || 'var(--accent-color)',
                      }}
                    >
                      <CategoryIcon 
                        icon={currentCatData?.icon || 'tag'} 
                        size="xs" 
                        noBackground 
                        whiteIcon 
                      />
                    </div>
                    <span className="text-[13.5px] font-bold text-[var(--text-primary)] truncate max-w-[120px] sm:max-w-[160px]">
                      {category || (currentLang === 'en' ? 'Select category' : 'Välj kategori')}
                    </span>
                    <ChevronRight size={15} strokeWidth={2} className="text-[var(--text-secondary)] opacity-60 shrink-0" />
                  </div>

                  {type === 'expense' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof feedback?.light === 'function') feedback.light();
                        const totalVal = parseAmount(amount);
                        const cat1 = category || categories[0]?.name || '';
                        const cat2 = categories.find(c => c.name !== cat1)?.name || categories[1]?.name || '';
                        const half = Math.floor(totalVal / 2);
                        setSplits([
                          { id: Math.random().toString(), amount: half, category: cat1, tags: [] },
                          { id: Math.random().toString(), amount: totalVal - half, category: cat2, tags: [] }
                        ]);
                      }}
                      className="h-8 px-2.5 rounded-[12px] bg-[var(--accent-color)]/10 hover:bg-[var(--accent-color)]/20 text-[var(--accent-color)] text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
                      title="Dela upp i flera kategorier"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>{currentLang === 'en' ? 'Split' : 'Dela upp'}</span>
                    </button>
                    )}
                </div>
              </div>
            )}

            {/* Row 2: Date */}
            <div className="p-4 flex items-center justify-between min-h-[60px]">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('date')}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(new Date());
                    setShowFullCalendar(false);
                  }}
                  className={`h-[28px] px-2.5 rounded-[12px] text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                    !showFullCalendar && new Date(selectedDate).toDateString() === new Date().toDateString()
                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t('todayLabel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday);
                    setShowFullCalendar(false);
                  }}
                  className={`h-[28px] px-2.5 rounded-[12px] text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
                    !showFullCalendar && new Date(selectedDate).toDateString() === new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t('yesterdayLabel')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullCalendar(!showFullCalendar)}
                  className={`h-[28px] px-2 rounded-[12px] transition-all flex items-center justify-center cursor-pointer gap-1 ${
                    showFullCalendar || (new Date(selectedDate).toDateString() !== new Date().toDateString() && new Date(selectedDate).toDateString() !== new Date(Date.now() - 86400000).toDateString())
                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs' 
                      : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title={t('chooseDate')}
                >
                  <Calendar size={13} strokeWidth={2} />
                  {new Date(selectedDate).toDateString() !== new Date().toDateString() && new Date(selectedDate).toDateString() !== new Date(Date.now() - 86400000).toDateString() && (
                    <span className="text-[11px] font-bold tabular-nums">
                      {formatFullDate(selectedDate, currentLang)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Row 3: Note */}
            <div className="p-4 flex items-center justify-between min-h-[60px] gap-3">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('ownNote')}
              </span>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <input 
                  ref={noteInputRef}
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={(e) => resolveBrandVisuals(undefined, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      resolveBrandVisuals(undefined, e.currentTarget.value);
                    }
                  }}
                  placeholder={type === 'income' ? t('incomeNotePlaceholder') : (currentLang === 'en' ? 'Add note...' : 'Skriv notering...')}
                  className={`text-[14px] font-medium text-[var(--text-primary)] text-right bg-transparent outline-none w-full max-w-[220px] placeholder:text-[var(--text-tertiary)] placeholder:font-normal ${
                    validationError === 'note' ? 'text-rose-500' : ''
                  }`}
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

            {/* Row 4: Receipt / Attachment */}
            <div className="p-4 flex items-center justify-between min-h-[60px]">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {currentLang === 'en' ? 'Receipt / Document' : 'Kvitto / Bilaga'}
              </span>

              {isScanningReceipt ? (
                <div className="flex items-center gap-2 py-0.5">
                  <Loader2 size={13} className="animate-spin text-[var(--accent-color)]" />
                  <span className="text-[11px] text-[var(--accent-color)] font-medium">
                    {currentLang === 'en' ? 'Uploading…' : 'Laddar upp…'}
                  </span>
                </div>
              ) : receiptUrl ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-[8px] overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {receiptUrl.includes('.pdf') ? (
                      <FileText size={13} className="text-[var(--text-secondary)]" />
                    ) : (
                      <img src={receiptUrl} alt="Attached" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11.5px] font-semibold text-[var(--text-primary)] hover:underline truncate max-w-[120px]"
                  >
                    {currentLang === 'en' ? 'View file' : 'Visa fil'}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptUrl(undefined);
                      setReceiptFileName(undefined);
                      setScanFeedback(null);
                    }}
                    className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                    title={currentLang === 'en' ? 'Remove' : 'Ta bort'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={isUploadingReceipt}
                    className="h-[28px] px-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/20 text-[var(--text-primary)] text-[11px] font-semibold rounded-[12px] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                  >
                    <Paperclip size={11} strokeWidth={2} />
                    <span>{currentLang === 'en' ? 'File' : 'Fil'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    disabled={isUploadingReceipt}
                    className="h-[28px] px-2.5 bg-[var(--accent-color)] text-[var(--text-on-accent)] hover:opacity-90 text-[11px] font-semibold rounded-[12px] shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Camera size={11} strokeWidth={2} />
                    <span>{currentLang === 'en' ? 'Camera' : 'Kamera'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Register / Save Button & Delete Button */}
          <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10">
            <button 
              type="button"
              disabled={!isSplitsValid}
              onClick={() => {
                if (!isSplitsValid) return;
                if (typeof feedback?.light === 'function') feedback.light();
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
              className="flex-1 h-[42px] rounded-full bg-[var(--accent-color)] hover:opacity-95 text-[var(--text-on-accent)] text-[13.5px] font-medium tracking-tight flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-none"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>
                {transaction 
                  ? (currentLang === 'en' ? 'Save changes' : 'Spara ändringar')
                  : (type === 'income' ? (t('registerIncome' as any) || 'Registrera inkomst') : (t('registerExpense' as any) || 'Registrera utgift'))}
              </span>
            </button>

            {transaction && transaction.id && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  setShowDeleteConfirm(true);
                }}
                className="w-[42px] h-[42px] rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                title={currentLang === 'en' ? 'Delete' : 'Ta bort'}
                aria-label={currentLang === 'en' ? 'Delete' : 'Ta bort'}
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            )}
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
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[28px] border-none relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl font-sans"
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{t('chooseIcon')}</h3>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] opacity-70 mt-0.5">Välj logotyp eller ikon</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIconSelector(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={t('close')}
                  >
                    <X size={16} strokeWidth={2.5} />
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
                      setLogo(undefined);
                      setIcon('receipt');
                      setLogoError(false);
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

        {/* Category Picker Popover Modal */}
        <AnimatePresence>
          {isCategoryPickerOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCategoryPickerOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 16 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[28px] border-none relative overflow-hidden flex flex-col max-h-[80vh] shadow-2xl z-10"
              >
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
                  <div>
                    <h3 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-tight">
                      {t('category')}
                    </h3>
                    <p className="text-[11px] font-normal text-[var(--text-secondary)] mt-0.5">
                      {currentLang === 'en' ? 'Choose category for transaction' : 'Välj kategori för transaktionen'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(false)}
                    className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={t('close')}
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-0">
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map(cat => {
                      const isSelected = (category || '').toLowerCase() === cat.name.toLowerCase();
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => {
                            if (activeSplitIndex !== null) {
                              const newSplits = [...splits];
                              newSplits[activeSplitIndex].category = cat.name;
                              setSplits(newSplits);
                              setActiveSplitIndex(null);
                            } else {
                              setCategory(cat.name);
                              setHasManuallySelectedCategory(true);
                            }
                            setIsCategoryPickerOpen(false);
                          }}
                          style={{ backgroundColor: cat.color || '#6366f1' }}
                          className={`h-28 sm:h-32 p-3.5 rounded-[22px] flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm relative overflow-hidden text-left ${
                            isSelected ? 'ring-3 ring-white ring-offset-2 ring-offset-black/50' : ''
                          }`}
                        >
                          <CategoryIcon icon={cat.icon} size="lg" noBackground whiteIcon />
                          <span className="text-[14px] font-bold text-white text-center truncate w-full px-1 drop-shadow-xs">
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

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryPickerOpen(false);
                        setIsAddingCategory(true);
                      }}
                      className="w-full py-2.5 rounded-[14px] border border-dashed border-black/15 dark:border-white/15 text-[13px] font-medium text-[#777168] dark:text-[#A8A8A8] hover:text-[var(--text-primary)] hover:border-black/30 dark:hover:border-white/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>{t('newCategory')}</span>
                    </button>
                  </div>
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
                setHasManuallySelectedCategory(true);
              }
            }
            setIsAddingCategory(false);
          }}
          t={t}
          hideBudget={true}
        />

        <ReceiptCameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={handleReceiptFile}
          isProcessing={isScanningReceipt}
          language={currentLang}
        />

        {showDeleteConfirm && transaction && transaction.id && onDelete && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title={currentLang === 'en' ? "Delete transaction?" : "Radera transaktion?"}
            message={
              currentLang === 'en'
                ? `Do you want to delete the transaction of ${formatAmount(transaction.amount, currentLang)} ${config?.currency || 'kr'}?`
                : `Vill du radera transaktionen på ${formatAmount(transaction.amount, currentLang)} ${config?.currency || 'kr'}?`
            }
            confirmText={currentLang === 'en' ? "Delete" : "Radera"}
            cancelText={currentLang === 'en' ? "Cancel" : "Avbryt"}
            variant="danger"
            onConfirm={() => {
              onDelete(transaction.id);
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
