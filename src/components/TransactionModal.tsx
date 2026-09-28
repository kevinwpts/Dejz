import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { X, ChevronDown, Calendar, Plus, Camera, Trash2, Check, Loader2 } from 'lucide-react';
import { Transaction, Category, TransactionSplit } from '../types';
import { TranslationKey, Language } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { fetchLogoForName, getLogoUrl, findKnownBrandDomain } from '../utils/logo';
import { uploadLogo } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { CalendarWidget } from './CalendarWidget';
import { IconSelector } from './IconSelector';
import { CategoryModal } from './CategoryModal';
import { CategoryTile } from './CategoryTile';
import { suggestIcon, suggestCategory } from '../utils/icons';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { NumberPad } from './NumberPad';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { Button, IconButton, SegmentedControl } from './ui';
import { ReceiptCameraModal } from './ReceiptCameraModal';

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

const parseReceiptDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;
  if (typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const dateObj = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const dateObj = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
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
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (transaction?.timestamp) {
      return new Date(transaction.timestamp);
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
        className="bg-[var(--bg-color)] w-full max-w-lg rounded-t-[22px] rounded-b-none sm:rounded-[22px] border-t sm:border border-[var(--border-color)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl h-auto"
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
                >
                  <SegmentedControl
                    options={[
                      { value: 'expense', label: t('expense') },
                      { value: 'income', label: t('income') }
                    ]}
                    value={type}
                    onChange={(val) => onChangeType(val as 'expense' | 'income')}
                    size="sm"
                  />
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
              {/* Hidden file input for camera/photo library */}
              <input 
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReceiptFileChange}
              />

              {/* Skanna kvitto options for new expenses */}
              {!transaction && type === 'expense' && (
                <div className="space-y-4">
                  {isScanningReceipt ? (
                    <div className="relative overflow-hidden bg-accent/5 rounded-[20px] border border-accent/25 p-4 flex items-center justify-between transition-all">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                          <Loader2 size={22} className="animate-spin text-accent" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight">Läser kvittot…</h4>
                          <p className="text-[11px] font-medium text-accent mt-0.5">Analyserar belopp, företag och datum</p>
                        </div>
                      </div>
                      <div className="px-3.5 py-1.5 bg-accent/10 text-accent text-xs font-semibold rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span>Vänta…</span>
                      </div>
                    </div>
                  ) : !receiptUrl ? (
                    <div 
                      onClick={() => !isScanningReceipt && !isUploadingReceipt && setIsCameraModalOpen(true)}
                      className="relative overflow-hidden bg-[var(--surface-muted)]/40 hover:bg-[var(--surface-muted)]/60 rounded-[20px] border border-[var(--border-color)] p-4 flex items-center justify-between transition-all group cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-105 transition-transform duration-300">
                          {isUploadingReceipt ? (
                            <Loader2 size={22} className="animate-spin text-accent" />
                          ) : (
                            <Camera size={22} strokeWidth={2} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight">Skanna kvitto</h4>
                          <p className="text-[11px] font-medium text-[var(--text-tertiary)] opacity-85 mt-0.5">Fotografera med appens kamera</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCameraModalOpen(true);
                        }}
                        disabled={isUploadingReceipt}
                        className="relative px-4 py-2 bg-[var(--text-primary)] hover:opacity-90 text-[var(--bg-color)] text-xs font-bold rounded-full shadow-sm active:scale-95 transition-all cursor-pointer select-none disabled:opacity-50"
                      >
                        Öppna kamera
                      </button>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden bg-success/5 rounded-[20px] border border-success/20 p-4 flex items-center justify-between transition-all">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative w-11 h-11 rounded-[12px] overflow-hidden border border-success/20 shadow-xs shrink-0">
                          <img src={receiptUrl} alt="Bifogat kvitto" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight">Kvitto bifogat</h4>
                          <p className="text-[11px] font-medium text-success mt-0.5 truncate">
                            {scanFeedback?.message || 'Kontrollera uppgifterna nedan innan du sparar'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptUrl(undefined);
                          setScanFeedback(null);
                        }}
                        className="px-3.5 py-1.5 bg-danger/10 text-danger text-xs font-bold rounded-full hover:bg-danger/20 transition-all cursor-pointer shrink-0 ml-2"
                      >
                        Ta bort
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div className="flex flex-col gap-2.5">
                <div 
                  className="bg-[var(--surface-muted)]/50 rounded-[18px] py-3.5 px-4 sm:py-4 sm:px-5 flex items-center justify-between transition-all border border-[var(--border-color)] group"
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
                      inputMode="none"
                      value={amount}
                      onChange={(e) => setAmount(formatAmount(e.target.value))}
                      onBlur={() => setAmount(evaluateAndFormatAmount(amount))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setAmount(evaluateAndFormatAmount(amount));
                        }
                      }}
                      placeholder="0"
                      className="w-full bg-transparent text-[var(--text-primary)] outline-none font-amount text-[38px] sm:text-[44px] font-semibold text-center tracking-tighter leading-none placeholder-[var(--text-tertiary)]/30 cursor-default"
                    />
                  </div>
                  <div className="shrink-0 flex items-center justify-end min-w-[72px]">
                    <span className="text-xs font-semibold text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-3 py-1.5 rounded-full group-focus-within:bg-[var(--accent-color)]/20 transition-colors">
                      {currency}
                    </span>
                  </div>
                </div>

                {/* Built-in On-Screen Keypad with Math & Quick Splits */}
                <NumberPad 
                  value={amount} 
                  onChange={setAmount} 
                  currency={currency} 
                />
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
                              onClick={() => isPro && !isScanningReceipt && !isUploadingReceipt && receiptInputRef.current?.click()}
                              disabled={!isPro || isUploadingReceipt || isScanningReceipt}
                              className={`w-24 h-24 rounded-[16px] flex flex-col items-center justify-center gap-2 transition-all border ${
                                !isPro 
                                  ? 'bg-[var(--surface-muted)]/50 border-[var(--border-color)] opacity-50 cursor-not-allowed text-[var(--text-tertiary)]'
                                  : 'bg-[var(--surface-muted)]/50 text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-accent/40 hover:text-accent shadow-xs'
                              }`}
                            >
                              {isScanningReceipt ? (
                                <div className="flex flex-col items-center gap-1.5 px-1 text-center">
                                  <Loader2 size={20} className="animate-spin text-accent" />
                                  <span className="text-[10px] font-semibold text-accent leading-tight">Läser kvittot…</span>
                                </div>
                              ) : isUploadingReceipt ? (
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
            <Button 
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
              variant="primary"
              fullWidth
              size="lg"
              icon={<Check size={18} strokeWidth={2.5} />}
            >
              {type === 'income' ? (t('registerIncome' as any) || 'Registrera inkomst') : (t('registerExpense' as any) || 'Registrera utgift')}
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
                <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
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
                setHasManuallySelectedCategory(true);
              }
            }
            setIsAddingCategory(false);
          }}
          t={t}
        />

        <ReceiptCameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={handleReceiptFile}
          isProcessing={isScanningReceipt}
          language={currentLang}
        />
      </motion.div>
    </motion.div>
  );
}
