import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

import { X, ChevronRight, ChevronDown, ChevronUp, Calendar, Plus, Camera, Trash2, Check, Loader2, Paperclip, FileText, GitFork, Heart } from 'lucide-react';
import { IconButton, Button } from './ui';
import { Transaction, Category, TransactionSplit } from '../types';
import { TranslationKey, Language } from '../i18n';
import { formatAmount, parseAmount, getTransactionReceipts } from '../utils/format';
import { fetchLogoForName, getLogoUrl } from '../utils/logo';
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
import { formatShortDate, parseReceiptDate } from '../utils/date';
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
  onDuplicate?: (t: Transaction) => void;
  onToggleStar?: (t: Transaction) => void;
  onSelectTransaction?: (t: Transaction) => void;
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
    receiptUrls?: string[];
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
  onDuplicate: _onDuplicate,
  onToggleStar,
  onSelectTransaction: _onSelectTransaction,
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
  const dragControls = useDragControls();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isStarred, setIsStarred] = useState<boolean>(
    Boolean(transaction?.isStarred || (transaction?.tags && transaction.tags.includes('starred')))
  );
  const parseSplits = (rawSplits: any): TransactionSplit[] => {
    if (!rawSplits) return [];
    if (Array.isArray(rawSplits)) return rawSplits;
    if (typeof rawSplits === 'string') {
      try {
        const parsed = JSON.parse(rawSplits);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const [amount, setAmount] = useState(formatAmount(transaction?.amount?.toString() || prefill?.amount?.toString() || ''));
  const [splits, setSplits] = useState<TransactionSplit[]>(() => parseSplits(transaction?.splits));
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
  const [receiptUrls, setReceiptUrls] = useState<string[]>(() =>
    getTransactionReceipts(
      transaction || (prefill ? { receiptUrl: prefill.receiptUrl, receiptUrls: prefill.receiptUrls } : null)
    )
  );
  const receiptUrl = receiptUrls[0];
  const [_receiptFileName, setReceiptFileName] = useState<string | undefined>();
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [_scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(() => {
    return Boolean(
      transaction ||
      prefill?.note ||
      prefill?.receiptUrl ||
      (prefill?.receiptUrls && prefill.receiptUrls.length > 0) ||
      (prefill?.name && prefill.name !== prefill.category) ||
      (transaction?.splits && transaction.splits.length > 0)
    );
  });

  const quickCategories = useMemo(() => {
    const list = categories && categories.length > 0 ? categories : [];
    return list.slice(0, 6);
  }, [categories]);

  const handleSelectQuickCategory = (catName: string) => {
    if (typeof feedback?.light === 'function') feedback.light();
    setCategory(catName);
    setHasManuallySelectedCategory(true);
  };

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (transaction?.timestamp) {
      return new Date(transaction.timestamp);
    }
    if (prefill?.date) {
      return prefill.date;
    }
    return _date || new Date();
  });
  const [hasManuallySelectedDate, setHasManuallySelectedDate] = useState(false);
  const hasManuallySelectedDateRef = useRef(false);
  useEffect(() => {
    hasManuallySelectedDateRef.current = hasManuallySelectedDate;
  }, [hasManuallySelectedDate]);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const handleReceiptFile = async (file: File) => {
    console.log('[Receipt Scan] File selected by user:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Immediately append preview image to give instant feedback
    const localUrl = URL.createObjectURL(file);
    setReceiptUrls((prev) => [...prev, localUrl]);
    setReceiptFileName(file.name);

    setIsUploadingReceipt(true);
    setIsScanningReceipt(true);
    setScanFeedback(null);
    setIsCameraModalOpen(false);

    try {
      if (userId === 'sandbox') {
        setScanFeedback({
          type: 'success',
          message: 'Testläge: Kvittobild bifogad lokalt (ingen extern uppladdning).',
        });
        setIsScanningReceipt(false);
        return;
      }
      if (!isSupabaseConfigured) {
        console.error('[Receipt Scan] Supabase is not configured! isSupabaseConfigured is false.');
      }

      const isPdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      // 1. Upload to Supabase Storage if user is signed in
      let uploadPromise: Promise<string | undefined> = Promise.resolve(undefined);
      if (userId && userId !== 'demo-user') {
        uploadPromise = uploadLogo(file, userId).catch((err) => {
          console.warn('[Receipt Scan] Storage upload warning:', err);
          return undefined;
        });
      }

      if (isPdfFile) {
        const uploadedUrl = await uploadPromise;
        if (uploadedUrl) {
          setReceiptUrls((prev) => prev.map((u) => (u === localUrl ? uploadedUrl : u)));
        }
        return;
      }

      // 2. Process image to base64 for receipt OCR scan
      console.log('[Receipt Scan] Step 1: Processing image with prepareReceiptImage...');
      const { base64, mimeType } = await prepareReceiptImage(file);
      console.log('[Receipt Scan] Step 1 completed. Base64 length:', base64?.length, 'mimeType:', mimeType);

      if (!base64 || typeof base64 !== 'string' || base64.trim().length === 0) {
        throw new Error('Kunde inte extrahera bilddata (tom base64).');
      }

      const finalMimeType = mimeType || file.type || 'image/jpeg';
      console.log('[Receipt Scan] Step 2: Calling supabase.functions.invoke("scan-receipt", ...) with mimeType:', finalMimeType);

      const scanPromise = supabase.functions.invoke('scan-receipt', {
        body: {
          image: base64,
          mimeType: finalMimeType,
        },
      });

      const [scanResult, uploadedUrl] = await Promise.allSettled([scanPromise, uploadPromise]);

      if (uploadedUrl.status === 'fulfilled' && uploadedUrl.value) {
        const finalUrl = uploadedUrl.value;
        setReceiptUrls((prev) => prev.map((u) => (u === localUrl ? finalUrl : u)));
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

          // Företag / beskrivning = merchant (only prefill if user hasn't already entered a name)
          if (data.merchant && typeof data.merchant === 'string' && data.merchant.trim()) {
            const cleanMerchant = data.merchant.trim();
            setMerchant(prev => prev.trim() ? prev : cleanMerchant);
            hasPrefilled = true;
          }

          // Belopp = amount (only prefill if user hasn't already entered an amount)
          if (data.amount !== undefined && data.amount !== null && !isNaN(Number(data.amount))) {
            const numAmount = Number(data.amount);
            setAmount(prev => (prev.trim() && parseAmount(prev) > 0) ? prev : formatAmount(numAmount.toString()));
            hasPrefilled = true;
          }

          // Datum = date (only prefill if user hasn't manually chosen a date and not editing an existing tx)
          if (data.date) {
            const parsedDate = parseReceiptDate(data.date);
            if (parsedDate && !hasManuallySelectedDateRef.current && !transaction) {
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
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    for (const file of files) {
      await handleReceiptFile(file);
    }
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

  const totalVal = parseAmount(amount);
  const currentSplitSum = useMemo(() => splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0), [splits]);
  const isSplitSumExact = splits.length === 0 || Math.abs(currentSplitSum - totalVal) < 0.01;
  const isSplitsValid = (splits.length === 0 || splits.every(s => (s.category || '').trim() !== '')) && isSplitSumExact;

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
        if (!supabase || userId === 'sandbox') {
          const fallback = suggestCategory(targetQuery, categories);
          if (fallback && !hasManuallySelectedCategoryRef.current) {
            setCategory(fallback);
          }
          return;
        }

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
    if (categories && categories.length > 0 && !category) {
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

    const instantLogo = getLogoUrl(query, category);
    const suggestedIcon = suggestIcon(query);

    if (instantLogo) {
      setLogo(instantLogo);
      setIcon('receipt');
      setLogoError(false);
      return;
    }

    const url = await fetchLogoForName(query, category);
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
  }, [merchant, note, category, manualSelectionThisSession]);

  // Synchronize state only when switching to a different transaction ID so unsaved edits are preserved
  const syncedTxIdRef = useRef<string | null>(transaction?.id || null);
  useEffect(() => {
    if (transaction && transaction.id !== syncedTxIdRef.current) {
      syncedTxIdRef.current = transaction.id;
      setAmount(formatAmount(transaction.amount?.toString() || ''));
      setSplits(parseSplits(transaction.splits));
      setCategory(transaction.category || (categories && categories.length > 0 ? categories[0].name : ''));
      setMerchant(transaction.merchant || '');
      setNote(transaction.note || '');
      if (transaction.logo) setLogo(transaction.logo);
      if (transaction.icon) setIcon(transaction.icon);
      setReceiptUrls(getTransactionReceipts(transaction));
      if (transaction.timestamp) {
        setSelectedDate(new Date(transaction.timestamp));
      }
    }
  }, [transaction]);

  // Live brand logo resolution as the user types merchant/name
  useEffect(() => {
    if (manualSelectionThisSession) return;
    const query = merchant.trim() || prefill?.name?.trim() || '';
    if (!query) {
      if (!transaction) {
        setLogo(undefined);
      }
      return;
    }

    // If editing an existing transaction and merchant hasn't changed and it already has a valid logo, keep it
    if (
      transaction &&
      query.toLowerCase() === (transaction.merchant || '').trim().toLowerCase() &&
      transaction.logo &&
      transaction.logo !== 'none'
    ) {
      return;
    }

    // Instant synchronous resolution for known brands
    const instant = getLogoUrl(query, category);
    if (instant) {
      setLogo(instant);
      setLogoError(false);
      return;
    }

    // Debounced async resolution for online company lookup
    const timer = setTimeout(() => {
      resolveBrandVisuals(query, note);
    }, 280);

    return () => clearTimeout(timer);
  }, [merchant, category, manualSelectionThisSession]);

  const previewTransaction = useMemo(() => ({
    ...transaction,
    id: transaction?.id || 'preview',
    merchant: merchant.trim(),
    note: note.trim(),
    category: category,
    amount: parseAmount(amount),
    type: type as any,
    logo: logo || getLogoUrl(merchant.trim(), category) || undefined,
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
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[var(--radius-modal,24px)] sm:rounded-[var(--radius-modal,24px)] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-modal h-auto font-sans border-none"
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

        {/* Pinned Top Bar with Title & Close */}
        <div className="shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-2.5 border-b border-subtle bg-[var(--bg-color)] flex items-center justify-between relative z-20 w-full">
          <h2 className="text-section-title text-[var(--text-primary)] tracking-tight">
            {transaction 
              ? (currentLang === 'en' ? 'Edit Transaction' : 'Redigera transaktion') 
              : (type === 'income' 
                  ? (currentLang === 'en' ? 'New Income' : 'Ny inkomst') 
                  : (currentLang === 'en' ? 'New Expense' : 'Ny utgift'))}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                const nextStarred = !isStarred;
                setIsStarred(nextStarred);
                if (transaction && onToggleStar) {
                  onToggleStar({
                    ...transaction,
                    isStarred: nextStarred,
                  });
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isStarred
                  ? 'text-[var(--danger-color)] bg-red-500/10'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title={isStarred ? (currentLang === 'en' ? 'Remove from saved' : 'Ta bort från sparade') : (currentLang === 'en' ? 'Save transaction' : 'Spara transaktion')}
              aria-label={isStarred ? (currentLang === 'en' ? 'Remove from saved' : 'Ta bort från sparade') : (currentLang === 'en' ? 'Save transaction' : 'Spara transaktion')}
            >
              <Heart size={18} fill={isStarred ? 'currentColor' : 'none'} strokeWidth={2} />
            </button>
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
        </div>

        {/* Main Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3.5 pb-8 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 w-full">
          {/* Hidden file input for tickets, receipts and documents (supports multiple files) */}
          <input 
            ref={receiptInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.heic"
            className="hidden"
            onChange={handleReceiptFileChange}
          />

          {/* Type Segmented Grid (when creating new transaction) */}
          {_onChangeType && !transaction && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--surface-muted)] rounded-card-nested">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  _onChangeType('expense');
                }}
                className={`py-2 rounded-[var(--radius-button-sm,10px)] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'expense'
                    ? 'bg-[var(--surface-color)] text-[var(--text-primary)]'
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
                className={`py-2 rounded-[var(--radius-button-sm,10px)] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'income'
                    ? 'bg-[var(--surface-color)] text-[var(--success-color)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {currentLang === 'en' ? 'Income' : 'Inkomst'}
              </button>
            </div>
          )}

          {/* 1. Primärt kort: Namn, Belopp & Samlat Kategorival */}
          <div className="p-4 sm:p-5 rounded-card bg-[var(--surface-color)] space-y-4">
            {/* Butik / Namn & Logga */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIconSelector(true)}
                className="relative rounded-full overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer shrink-0 hover:ring-2 hover:ring-[var(--accent-color)]/30 group"
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
                <label className="text-label font-medium text-[var(--text-tertiary)] block mb-0.5">
                  {currentLang === 'en' ? 'Store / Name (optional)' : 'Namn / Butik'}
                </label>
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
                  placeholder={category || (currentLang === 'en' ? 'e.g. ICA, Spotify' : 'T.ex. ICA, Spotify')}
                  className="text-base font-semibold tracking-tight text-[var(--text-primary)] leading-snug bg-transparent outline-none w-full placeholder:text-[var(--text-tertiary)] placeholder:font-normal py-0.5"
                />
              </div>
            </div>

            {/* Belopp */}
            <div className="pt-3 border-t border-divider">
              <label className="text-label font-medium text-[var(--text-tertiary)] block mb-1">
                {currentLang === 'en' ? 'Amount' : 'Belopp'}
              </label>
              <div 
                onClick={() => amountInputRef.current?.focus()}
                className="flex items-baseline gap-2 font-amount cursor-text w-full"
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
                  className="bg-transparent outline-none text-hero-amount placeholder:font-normal placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)] w-full leading-none shrink min-w-[60px]"
                  placeholder="0"
                />
                <span className="text-lg font-medium text-[var(--text-tertiary)] select-none shrink-0 font-sans ml-1 pb-1">
                  {currency}
                </span>
              </div>
            </div>

            {/* Samlat Kategorival (Snabbval, Alla kategorier & Dela upp på flera kategorier) */}
            <div className="pt-3 border-t border-divider space-y-2.5">
              {type === 'expense' && splits.length > 0 ? (
                <div className="rounded-card-nested bg-black/[0.02] dark:bg-white/[0.02] border border-subtle overflow-hidden">
                  <div className="px-3.5 pt-3 pb-2 border-b border-divider">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label font-semibold text-[var(--text-primary)]">
                        {currentLang === 'en' ? 'Split across categories' : 'Uppdelat på flera kategorier'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof feedback?.light === 'function') feedback.light();
                          if (splits.length > 0 && splits[0].category) {
                            setCategory(splits[0].category);
                          }
                          setSplits([]);
                        }}
                        className="text-xs font-medium text-[var(--danger-color)] hover:underline cursor-pointer shrink-0"
                      >
                        {currentLang === 'en' ? 'Remove split' : 'Ta bort uppdelning'}
                      </button>
                    </div>

                    <div className="mt-0.5">
                      {(() => {
                        const totalVal = parseAmount(amount);
                        const currentSum = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                        const isExact = Math.abs(currentSum - totalVal) < 0.01;
                        return (
                          <span className={`text-[11px] font-medium flex items-center gap-1 font-amount ${
                            isExact ? 'text-[var(--text-tertiary)]' : 'text-[var(--warning-color)] font-medium'
                          }`}>
                            {currentSum} av {totalVal} {currency} fördelat
                            {isExact && totalVal > 0 && (
                              <Check size={12} className="text-emerald-500 stroke-[2.5] shrink-0" />
                            )}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="divide-y divide-subtle">
                    {splits.map((split, index) => {
                      const catData = categories.find(c => c.name.toLowerCase() === (split.category || '').toLowerCase());

                      return (
                        <div key={split.id || index} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof feedback?.light === 'function') feedback.light();
                              setActiveSplitIndex(index);
                              setIsCategoryPickerOpen(true);
                            }}
                            className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer group"
                          >
                            <CategoryIcon 
                              icon={catData?.icon || 'tag'} 
                              color={split.category ? (catData?.color || getCategoryColor(split.category, categories)) : '#716e68'} 
                              categoryName={split.category}
                              variant="primary"
                              size="xs" 
                            />
                            <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-color)] truncate max-w-[120px] sm:max-w-[180px]">
                              {split.category || (currentLang === 'en' ? 'Select category' : 'Välj kategori')}
                            </span>
                            <ChevronRight size={14} strokeWidth={2} className="text-[var(--text-tertiary)] opacity-60 group-hover:opacity-100 shrink-0" />
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={split.amount ?? ''}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const rawVal = parseAmount(e.target.value);
                                  const totalVal = parseAmount(amount);

                                  if (splits.length <= 1) return;

                                  if (splits.length === 2) {
                                    const otherIndex = index === 0 ? 1 : 0;
                                    const clampedVal = Math.min(totalVal, Math.max(0, rawVal));
                                    const newSplits = [...splits];
                                    newSplits[index] = { ...newSplits[index], amount: clampedVal };
                                    newSplits[otherIndex] = { ...newSplits[otherIndex], amount: Math.max(0, totalVal - clampedVal) };
                                    setSplits(newSplits);
                                  } else {
                                    const oldVal = Number(splits[index].amount) || 0;
                                    const newSplits = [...splits];
                                    const delta = rawVal - oldVal;

                                    if (delta > 0) {
                                      let remainingToReduce = delta;
                                      for (let i = 0; i < newSplits.length; i++) {
                                        if (i === index) continue;
                                        const curAmt = Number(newSplits[i].amount) || 0;
                                        const reduceBy = Math.min(curAmt, remainingToReduce);
                                        newSplits[i] = { ...newSplits[i], amount: curAmt - reduceBy };
                                        remainingToReduce -= reduceBy;
                                        if (remainingToReduce <= 0) break;
                                      }
                                      const finalVal = rawVal - remainingToReduce;
                                      newSplits[index] = { ...newSplits[index], amount: finalVal };
                                    } else if (delta < 0) {
                                      const absDelta = Math.abs(delta);
                                      newSplits[index] = { ...newSplits[index], amount: Math.max(0, rawVal) };
                                      const targetIdx = index === newSplits.length - 1 ? newSplits.length - 2 : index + 1;
                                      const curAmt = Number(newSplits[targetIdx].amount) || 0;
                                      newSplits[targetIdx] = { ...newSplits[targetIdx], amount: curAmt + absDelta };
                                    }
                                    setSplits(newSplits);
                                  }
                                }}
                                className="w-20 sm:w-24 bg-black/5 dark:bg-white/5 rounded-[var(--radius-button-sm,10px)] px-2.5 py-1 text-sm font-bold font-amount tabular-nums text-[var(--text-primary)] text-right outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                                placeholder="0"
                              />
                              <span className="text-xs font-semibold text-[var(--text-tertiary)] select-none font-amount">
                                {currency}
                              </span>
                            </div>

                            <button 
                              type="button"
                              onClick={() => {
                                if (typeof feedback?.light === 'function') feedback.light();
                                const newSplits = splits.filter((_, i) => i !== index);
                                if (newSplits.length <= 1) {
                                  if (newSplits.length === 1 && newSplits[0].category) {
                                    setCategory(newSplits[0].category);
                                  }
                                  setSplits([]);
                                } else {
                                  const totalVal = parseAmount(amount);
                                  const perSplit = Math.floor(totalVal / newSplits.length);
                                  let rem = totalVal - perSplit * newSplits.length;
                                  setSplits(newSplits.map(s => {
                                    const add = rem > 0 ? 1 : 0;
                                    if (rem > 0) rem--;
                                    return { ...s, amount: perSplit + add };
                                  }));
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger-color)] rounded-full transition-colors cursor-pointer"
                              title={currentLang === 'en' ? 'Remove category' : 'Ta bort kategori'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    const totalVal = parseAmount(amount);
                    const currentSum = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const isExact = Math.abs(currentSum - totalVal) < 0.01;
                    if (isExact) return null;
                    return (
                      <div className="px-3.5 py-2 bg-[var(--warning-container)]/30 border-t border-[var(--warning-color)]/20 text-xs font-medium text-[var(--warning-color)] flex items-center justify-between">
                        <span>
                          {currentLang === 'en'
                            ? `Sum (${currentSum} ${currency}) must equal total amount (${totalVal} ${currency}).`
                            : `Kategoriernas summa (${currentSum} ${currency}) måste motsvara totalbeloppet (${totalVal} ${currency}).`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof feedback?.light === 'function') feedback.light();
                            const perSplit = Math.floor(totalVal / splits.length);
                            let remainder = totalVal - perSplit * splits.length;
                            setSplits(splits.map(s => {
                              const add = remainder > 0 ? 1 : 0;
                              if (remainder > 0) remainder--;
                              return { ...s, amount: perSplit + add };
                            }));
                          }}
                          className="text-xs font-bold underline cursor-pointer shrink-0 ml-2"
                        >
                          {currentLang === 'en' ? 'Adjust automatically' : 'Justera automatiskt'}
                        </button>
                      </div>
                    );
                  })()}

                  <div className="px-3.5 py-2.5 border-t border-subtle flex items-center justify-between gap-2 bg-black/[0.01] dark:bg-white/[0.01]">
                    {splits.length < categories.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof feedback?.light === 'function') feedback.light();
                          const usedCats = splits.map(s => (s.category || '').toLowerCase().trim());
                          const unusedCat = categories.find(c => !usedCats.includes(c.name.toLowerCase().trim()))?.name;
                          if (!unusedCat) return;

                          setSplits([
                            ...splits,
                            { id: Math.random().toString(), amount: 0, category: unusedCat, tags: [] }
                          ]);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-color)] hover:underline cursor-pointer py-0.5"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>{currentLang === 'en' ? 'Add category' : 'Lägg till kategori'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)] italic">
                        {currentLang === 'en' ? 'All categories added' : 'Alla kategorier tillagda'}
                      </span>
                    )}

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
                      className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer py-0.5"
                    >
                      {currentLang === 'en' ? 'Equalize' : 'Fördela jämnt'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-label font-medium text-[var(--text-tertiary)]">
                      {currentLang === 'en' ? 'Category' : 'Kategori'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof feedback?.light === 'function') feedback.light();
                        setActiveSplitIndex(null);
                        setIsCategoryPickerOpen(true);
                      }}
                      className="text-xs font-semibold text-[var(--accent-color)] hover:underline cursor-pointer"
                    >
                      {currentLang === 'en' ? 'All categories' : 'Alla kategorier'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(() => {
                      const trimmedSel = (category || '').trim().toLowerCase();
                      const isInQuick = quickCategories.some(
                        (c) => c.name.trim().toLowerCase() === trimmedSel
                      );
                      const visibleCategories =
                        !isInQuick && trimmedSel
                          ? [
                              currentCatData || {
                                id: trimmedSel,
                                name: category,
                                icon: getCategoryIconName(category),
                                color: getCategoryColor(category, categories),
                              },
                              ...quickCategories.slice(0, 5),
                            ]
                          : quickCategories;

                      return visibleCategories.map((c) => {
                        const isSelected =
                          (category || '').trim().toLowerCase() === c.name.trim().toLowerCase() &&
                          splits.length === 0;
                        return (
                          <button
                            key={c.id || c.name}
                            type="button"
                            onClick={() => handleSelectQuickCategory(c.name)}
                            className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                              isSelected
                                ? 'bg-[var(--accent-color)] text-white shadow-sm'
                                : 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10'
                            }`}
                          >
                            <CategoryIcon
                              icon={c.icon || 'receipt'}
                              color={
                                isSelected
                                  ? '#ffffff'
                                  : c.color || getCategoryColor(c.name, categories)
                              }
                              size="xs"
                              categoryName={c.name}
                            />
                            <span className="truncate max-w-[125px]">{c.name}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {type === 'expense' && (
                    <div className="pt-1 flex items-center justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof feedback?.light === 'function') feedback.light();
                          const totalVal = parseAmount(amount);
                          const cat1 = category || categories[0]?.name || '';
                          const cat2 = categories.find(c => c.name.toLowerCase() !== cat1.toLowerCase())?.name || categories[1]?.name || '';
                          setSplits([
                            { id: Math.random().toString(), amount: totalVal, category: cat1, tags: [] },
                            { id: Math.random().toString(), amount: 0, category: cat2, tags: [] }
                          ]);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-color)] hover:underline cursor-pointer active:scale-98 transition-all py-0.5"
                      >
                        <GitFork size={13} strokeWidth={2} />
                        <span>{currentLang === 'en' ? 'Split into multiple categories' : 'Dela upp på flera kategorier'}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 2. Fler detaljer (ihopfällbart för snabb och ren upplevelse) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowMoreDetails(!showMoreDetails);
              }}
              className="w-full py-2.5 px-4 rounded-card-nested bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none"
            >
              <span>
                {showMoreDetails
                  ? (currentLang === 'en' ? 'Hide details' : 'Dölj fler detaljer')
                  : (currentLang === 'en' ? 'More details (date, note, receipt...)' : 'Fler detaljer (datum, notering, kvitto...)')}
              </span>
              {showMoreDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            <AnimatePresence>
              {showMoreDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-3"
                >

                  {/* Grouped Details Module (Date, Note, Receipts) */}
                  <div className="rounded-card bg-[var(--surface-color)] overflow-hidden divide-y divide-subtle">
                    {/* Row 1: Date */}
                    <div>
                      <div className="p-4 flex items-center justify-between min-h-[58px] gap-4">
                        <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                          {t('date')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDate(new Date());
                              setHasManuallySelectedDate(true);
                              setShowFullCalendar(false);
                            }}
                            className={`h-[28px] px-2.5 rounded-[var(--radius-button-sm,10px)] text-label font-bold tracking-tight transition-all cursor-pointer ${
                              !showFullCalendar && new Date(selectedDate).toDateString() === new Date().toDateString()
                                ? 'bg-[var(--accent-color)] text-white'
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
                              setHasManuallySelectedDate(true);
                              setShowFullCalendar(false);
                            }}
                            className={`h-[28px] px-2.5 rounded-[var(--radius-button-sm,10px)] text-label font-bold tracking-tight transition-all cursor-pointer ${
                              !showFullCalendar && new Date(selectedDate).toDateString() === new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
                                ? 'bg-[var(--accent-color)] text-white'
                                : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {t('yesterdayLabel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowFullCalendar(!showFullCalendar)}
                            className={`h-[28px] px-2.5 rounded-[var(--radius-button-sm,10px)] transition-all flex items-center justify-center cursor-pointer gap-1.5 ${
                              showFullCalendar || (new Date(selectedDate).toDateString() !== new Date().toDateString() && new Date(selectedDate).toDateString() !== new Date(Date.now() - 86400000).toDateString())
                                ? 'bg-[var(--accent-color)] text-white' 
                                : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            title={t('chooseDate')}
                            aria-label={t('chooseDate')}
                          >
                            <Calendar size={13} strokeWidth={2} />
                            {new Date(selectedDate).toDateString() !== new Date().toDateString() && new Date(selectedDate).toDateString() !== new Date(Date.now() - 86400000).toDateString() && (
                              <span className="text-label font-bold tabular-nums text-white">
                                {formatShortDate(selectedDate, currentLang)}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showFullCalendar && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-subtle p-2 bg-[var(--surface-color)]"
                          >
                            <CalendarWidget 
                              calendarDays={calendarDays}
                              normalizedSelectedDate={selectedDate}
                              setSelectedDate={(d: Date) => {
                                setSelectedDate(d);
                                setHasManuallySelectedDate(true);
                              }}
                              t={t}
                              currentLang={currentLang}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Row 3: Note */}
                    <div className="p-4 flex items-center justify-between min-h-[58px] gap-4">
                      <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
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
                          className={`text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none w-full max-w-[220px] placeholder:text-[var(--text-tertiary)] placeholder:font-normal ${
                            validationError === 'note' ? 'text-[var(--danger-color)]' : ''
                          }`}
                        />
                        {note && (
                          <button 
                            type="button"
                            onClick={() => setNote('')}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0 transition-colors"
                            aria-label={t('close')}
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Receipts / Attachments (Supports multiple) */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between min-h-[26px] gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-body font-normal text-[var(--text-secondary)]">
                            {currentLang === 'en' ? 'Receipts & Attachments' : 'Kvitton & Bilagor'}
                          </span>
                          {receiptUrls.length > 0 && (
                            <span className="text-label font-semibold text-[var(--text-secondary)] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full tabular-nums">
                              {receiptUrls.length}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isScanningReceipt && (
                            <div className="flex items-center gap-1.5 mr-1">
                              <Loader2 size={13} className="animate-spin text-[var(--accent-color)]" />
                              <span className="text-label text-[var(--accent-color)] font-medium">
                                {currentLang === 'en' ? 'Uploading…' : 'Laddar upp…'}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => receiptInputRef.current?.click()}
                            disabled={isUploadingReceipt}
                            className="h-[28px] px-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/20 text-[var(--text-primary)] text-label font-semibold rounded-[var(--radius-button-sm,10px)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Paperclip size={11} strokeWidth={2} />
                            <span>
                              {receiptUrls.length > 0
                                ? (currentLang === 'en' ? '+ File' : '+ Fil')
                                : (currentLang === 'en' ? 'File' : 'Fil')}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCameraModalOpen(true)}
                            disabled={isUploadingReceipt}
                            className="h-[28px] px-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/20 text-[var(--text-primary)] text-label font-semibold rounded-[var(--radius-button-sm,10px)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Camera size={11} strokeWidth={2} />
                            <span>
                              {receiptUrls.length > 0
                                ? (currentLang === 'en' ? '+ Camera' : '+ Kamera')
                                : (currentLang === 'en' ? 'Camera' : 'Kamera')}
                            </span>
                          </button>
                        </div>
                      </div>

                      {receiptUrls.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {receiptUrls.map((url, idx) => {
                            const isPdf = url.toLowerCase().includes('.pdf');
                            return (
                              <div
                                key={`${url}-${idx}`}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-card-nested bg-black/[0.03] dark:bg-white/[0.04]"
                              >
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 min-w-0 flex-1 group"
                                >
                                  <div className="w-9 h-9 rounded-btn-sm overflow-hidden bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                                    {isPdf ? (
                                      <FileText size={16} className="text-[var(--text-secondary)]" />
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Bilaga ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:underline truncate">
                                      {isPdf
                                        ? (currentLang === 'en' ? `PDF Document ${idx + 1}` : `PDF-dokument ${idx + 1}`)
                                        : (currentLang === 'en' ? `Receipt / Attachment ${idx + 1}` : `Kvitto / Bilaga ${idx + 1}`)}
                                    </p>
                                    <p className="text-caption text-[var(--text-secondary)]">
                                      {currentLang === 'en' ? 'Tap to open' : 'Tryck för att öppna'}
                                    </p>
                                  </div>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof feedback?.light === 'function') feedback.light();
                                    setReceiptUrls((prev) => prev.filter((_, i) => i !== idx));
                                    setScanFeedback(null);
                                  }}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger-color)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                                  title={currentLang === 'en' ? 'Remove attachment' : 'Ta bort bilaga'}
                                  aria-label={currentLang === 'en' ? 'Remove attachment' : 'Ta bort bilaga'}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Register / Save Button & Delete Button */}
          <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-[var(--bg-color)] flex items-center gap-2.5 relative z-10 w-full">
            <Button 
              type="button"
              variant="accent"
              size="lg"
              disabled={!isSplitsValid}
              onClick={() => {
                if (!isSplitsValid) return;
                if (typeof feedback?.light === 'function') feedback.light();
                const currentTags = Array.isArray(transaction?.tags) ? transaction!.tags : [];
                const nextTags = isStarred
                  ? Array.from(new Set([...currentTags, 'starred']))
                  : currentTags.filter((tag) => tag !== 'starred');
                const finalMerchant = merchant.trim() || category || (type === 'income' ? 'Inkomst' : 'Utgift');
                onSave({
                  merchant: finalMerchant,
                  note,
                  category: splits.length > 0 ? (splits[0]?.category || category) : category,
                  amount: parseAmount(amount),
                  type: type as any,
                  logo: logo || getLogoUrl(finalMerchant, category) || 'none',
                  icon: icon || 'receipt',
                  paymentMethod: transaction?.paymentMethod,
                  receiptUrl: receiptUrls[0],
                  receiptUrls,
                  tags: nextTags,
                  isStarred,
                  splits: splits,
                  date: selectedDate
                });
                onClose();
              }}
              className="flex-1 rounded-[var(--radius-button,12px)] text-body-medium font-semibold"
            >
              {transaction 
                ? (currentLang === 'en' ? 'Save changes' : 'Spara ändringar')
                : (type === 'income' ? (t('registerIncome' as any) || 'Registrera inkomst') : (t('registerExpense' as any) || 'Registrera utgift'))}
            </Button>

            {transaction && transaction.id && onDelete && (
              <IconButton
                icon={<Trash2 size={16} strokeWidth={2} />}
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  setShowDeleteConfirm(true);
                }}
                variant="danger"
                size="xl"
                shape="button"
                title={currentLang === 'en' ? 'Delete' : 'Ta bort'}
                aria-label={currentLang === 'en' ? 'Delete' : 'Ta bort'}
              />
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
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[var(--radius-modal,16px)] border-none relative overflow-hidden flex flex-col max-h-[80vh] shadow-modal font-sans"
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
                className="bg-[var(--bg-color)] w-full max-w-sm rounded-[var(--radius-modal,16px)] border-none relative overflow-hidden flex flex-col max-h-[80vh] shadow-modal z-10"
              >
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-subtle shrink-0">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                      {t('category')}
                    </h3>
                    <p className="text-label font-normal text-[var(--text-secondary)] mt-0.5">
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

                <div className="flex-1 overflow-y-auto p-3.5 space-y-1 custom-scrollbar min-h-0">
                  <div className="space-y-1">
                    {categories.map(cat => {
                      const isSelected = activeSplitIndex !== null
                        ? (splits[activeSplitIndex]?.category || '').toLowerCase() === cat.name.toLowerCase()
                        : (category || '').toLowerCase() === cat.name.toLowerCase();

                      const isAlreadyUsedInOtherSplit = activeSplitIndex !== null && splits.some((s, idx) => idx !== activeSplitIndex && (s.category || '').toLowerCase() === cat.name.toLowerCase());

                      return (
                        <button
                          key={cat.name}
                          type="button"
                          disabled={isAlreadyUsedInOtherSplit}
                          onClick={() => {
                            if (isAlreadyUsedInOtherSplit) return;
                            if (typeof feedback?.light === 'function') feedback.light();
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
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-card-sm,12px)] transition-colors text-left ${
                            isAlreadyUsedInOtherSplit
                              ? 'opacity-40 cursor-not-allowed bg-black/[0.01] dark:bg-white/[0.01]'
                              : isSelected
                              ? 'bg-black/[0.04] dark:bg-white/[0.06] cursor-pointer active:scale-[0.99]'
                              : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer active:scale-[0.99]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <CategoryIcon 
                              icon={cat.icon} 
                              color={cat.color} 
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
                          {isAlreadyUsedInOtherSplit && (
                            <span className="text-xs text-[var(--text-tertiary)] italic shrink-0">
                              {currentLang === 'en' ? 'Already selected' : 'Redan vald'}
                            </span>
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
                      className="w-full py-2.5 rounded-btn-sm border border-dashed border-subtle text-body font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-subtle dark:hover:border-subtle transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
