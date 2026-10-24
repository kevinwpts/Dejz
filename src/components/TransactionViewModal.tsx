import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';

import { X, Pencil, Tag, Repeat, Paperclip, FileText, Trash2, ChevronDown, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Button, IconButton } from './ui';
import { Transaction, Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount, getTransactionReceipts } from '../utils/format';
import { formatShortDate } from '../utils/date';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { getCategoryIconName } from '../utils/icons';
import { feedback } from '../utils/feedback';
import { getTransactionDominantColor, extractDominantColorFromImage } from '../utils/brandColor';
import { resolveEntityVisual } from '../utils/resolver';
import { ConfirmModal } from './ConfirmModal';
import { findKnownBrandDomain } from '../utils/logo';
import { TransactionItem } from './TransactionItem';
import { getCategoryColor } from '../utils/categoryColors';

interface TransactionViewModalProps {
  transaction: Transaction;
  transactions?: Transaction[];
  onSelectTransaction?: (transaction: Transaction) => void;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onDuplicate: (transaction: Transaction) => void;
  onToggleStar?: (transaction: Transaction) => void;
  t: (key: TranslationKey) => string;
  config: Config;
  onUpdateTransaction?: (transaction: Transaction) => void;
}

export function TransactionViewModal({ 
  transaction, 
  transactions = [],
  onSelectTransaction,
  onClose, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onToggleStar,
  t, 
  config,
  onUpdateTransaction: _onUpdateTransaction
}: TransactionViewModalProps) {
  const [currentTx, setCurrentTx] = useState<Transaction>(transaction);

  useEffect(() => {
    setCurrentTx(transaction);
  }, [transaction]);

  useScrollLock(true);
  const dragControls = useDragControls();
  const isIncome = currentTx.type === 'income';
  const isSavings = currentTx.type === 'savings';
  const isStarred = Boolean(currentTx.isStarred || (currentTx.tags && currentTx.tags.includes('starred')));

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptLightbox, setShowReceiptLightbox] = useState(false);
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0);
  const [showSimilar, setShowSimilar] = useState(false);
  const [_brandColor, setBrandColor] = useState(() => getTransactionDominantColor(transaction, config));

  // Compute similar transactions (fuzzy merchant name match, brand domain match, etc.)
  const similarTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const getRawMerchant = (tx: Transaction) => {
      const m = typeof tx.merchant === 'object' ? (tx.merchant as any)?.name : (tx.merchant || (typeof tx.category === 'object' ? (tx.category as any)?.name : tx.category));
      return String(m || '').trim();
    };

    const cleanMerchant = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\b(ab|aktiebolag|as|oy|aps|ltd|gmbh|inc|llc|sverige|sweden|butik|butiken|online|ecom|store)\b/gi, '')
        .replace(/[^a-z0-9åäö]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const currentRawName = getRawMerchant(transaction);
    const currentCleanName = cleanMerchant(currentRawName);
    const currentDomain = findKnownBrandDomain(currentRawName);
    const currentFirstWord = currentCleanName.split(' ')[0] || '';

    return transactions.filter(t => {
      if (t.id === transaction.id) return false;
      const otherRaw = getRawMerchant(t);
      if (!otherRaw) return false;

      // 1. Exact raw match (case insensitive)
      if (currentRawName.toLowerCase() === otherRaw.toLowerCase()) return true;

      // 2. Domain match (e.g. Stadium vs Stadium Barkarby both match stadium.se)
      if (currentDomain) {
        const otherDomain = findKnownBrandDomain(otherRaw);
        if (otherDomain && otherDomain === currentDomain) return true;
      }

      // 3. Cleaned name substring match (e.g. "stadium" in "stadium ab")
      const otherClean = cleanMerchant(otherRaw);
      if (currentCleanName && otherClean) {
        if (currentCleanName === otherClean) return true;
        if (currentCleanName.length >= 3 && otherClean.includes(currentCleanName)) return true;
        if (otherClean.length >= 3 && currentCleanName.includes(otherClean)) return true;
      }

      // 4. First significant word match (e.g. "stadium" in "stadium kungsgatan")
      if (currentFirstWord && currentFirstWord.length >= 3) {
        const otherFirstWord = otherClean.split(' ')[0] || '';
        if (currentFirstWord === otherFirstWord) return true;
      }

      return false;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transaction, transactions]);

  useEffect(() => {
    const initial = getTransactionDominantColor(transaction, config);
    setBrandColor(initial);

    const visual = resolveEntityVisual(transaction, config);
    if (visual.logoUrl && !visual.logoUrl.startsWith('data:image/svg+xml')) {
      extractDominantColorFromImage(visual.logoUrl).then((extracted) => {
        if (extracted) {
          setBrandColor(extracted);
        }
      });
    }
  }, [transaction, config]);

  const getLocale = () => {
    const lang = config?.language || 'sv';
    const mapping: Record<string, string> = {
      sv: 'sv-SE',
      en: 'en-US',
      no: 'no-NO',
      da: 'da-DK',
      fi: 'fi-FI'
    };
    return mapping[lang] || 'sv-SE';
  };

  const date = new Date(currentTx.timestamp || transaction.timestamp);
  const formattedDate = formatShortDate(date, config?.language || 'sv');
  const hasSpecificTime = !isNaN(date.getTime()) && !(date.getHours() === 0 && date.getMinutes() === 0);
  const formattedTime = hasSpecificTime
    ? date.toLocaleTimeString(getLocale(), {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const merchantName = typeof currentTx.merchant === 'object'
    ? (currentTx.merchant as any)?.name
    : (currentTx.merchant || (typeof currentTx.category === 'object' ? (currentTx.category as any)?.name : currentTx.category));

  const hasNote = Boolean(currentTx.note && currentTx.note.trim().length > 0);
  const receiptUrls = useMemo(() => getTransactionReceipts(currentTx), [currentTx]);
  const hasReceipt = receiptUrls.length > 0;
  const activeReceiptUrl = receiptUrls[Math.min(activeReceiptIndex, Math.max(0, receiptUrls.length - 1))] || receiptUrls[0];
  const hasTags = Boolean(currentTx.tags && currentTx.tags.length > 0);

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
        className="bg-[var(--bg-color)] w-full sm:max-w-lg rounded-t-[var(--radius-modal,24px)] sm:rounded-[var(--radius-modal,24px)] relative max-h-[90dvh] sm:max-h-[85vh] h-auto flex flex-col overflow-hidden shadow-modal font-sans border-none"
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-5 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain min-h-0 relative z-10 w-full">
          {/* Top Bar with Title & Close */}
          <div className="flex items-center justify-between pb-1 px-1">
            <h2 className="text-section-title text-[var(--text-primary)] tracking-tight">
              {config?.language === 'en' ? 'Transaction' : 'Transaktion'}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.light === 'function') feedback.light();
                  const currentStarred = Boolean(currentTx.isStarred || (currentTx.tags && currentTx.tags.includes('starred')));
                  const nextStarred = !currentStarred;
                  const currentTags = Array.isArray(currentTx.tags) ? currentTx.tags : [];
                  const nextTags = nextStarred
                    ? Array.from(new Set([...currentTags, 'starred']))
                    : currentTags.filter((tag) => tag !== 'starred');
                  const updated = {
                    ...currentTx,
                    isStarred: nextStarred,
                    tags: nextTags,
                  };
                  setCurrentTx(updated);
                  if (onToggleStar) {
                    onToggleStar(currentTx);
                  } else if (_onUpdateTransaction) {
                    _onUpdateTransaction(updated);
                  }
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isStarred
                    ? 'text-[var(--danger-color)] bg-red-500/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title={isStarred ? (config?.language === 'en' ? 'Remove from saved' : 'Ta bort från sparade') : (config?.language === 'en' ? 'Save transaction' : 'Spara transaktion')}
                aria-label={isStarred ? (config?.language === 'en' ? 'Remove from saved' : 'Ta bort från sparade') : (config?.language === 'en' ? 'Save transaction' : 'Spara transaktion')}
              >
                <Heart 
                  size={18} 
                  fill={isStarred ? 'currentColor' : 'none'} 
                  strokeWidth={2} 
                />
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

          {/* 1. First Group: Left-aligned Summary (Logo + Name on top, Amount below) */}
          <div className="p-4 sm:p-5 rounded-card bg-[var(--surface-color)] space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="relative rounded-full overflow-hidden shrink-0">
                <TransactionLogo 
                  size="lg"
                  config={config}
                  transaction={currentTx} 
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-label font-medium text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Name' : 'Namn'}
                </span>
                <div className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-snug py-0.5 truncate">
                  {merchantName}
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-divider flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-label font-medium text-[var(--text-tertiary)] block mb-0.5">
                  {config?.language === 'en' ? 'Amount' : 'Belopp'}
                </span>
                <div className={`flex items-baseline gap-1.5 font-amount w-full ${isIncome ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'}`}>
                  <span className="text-hero-amount leading-none">
                    {isIncome ? '+' : isSavings ? '→' : '−'}{formatAmount(currentTx.amount, config?.language)}
                  </span>
                  <span className="text-secondary font-medium text-[var(--text-tertiary)] tracking-tight select-none shrink-0 font-sans ml-1 pb-1">
                    {config?.currency || 'kr'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Second Group: Category, Date, Time (when present), Note (when non-empty), Attachment (when non-empty) */}
          <div className="rounded-card bg-[var(--surface-color)] overflow-hidden divide-y divide-subtle text-left">
            {/* Row 1: Category */}
            <div className="p-4 flex items-center justify-between min-h-[58px] gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="text-right min-w-0">
                {(() => {
                  const rawSplits = currentTx.splits || transaction.splits;
                  const splitsArray = Array.isArray(rawSplits)
                    ? rawSplits
                    : (typeof rawSplits === 'string' ? (() => { try { const p = JSON.parse(rawSplits); return Array.isArray(p) ? p : []; } catch { return []; } })() : []);

                  const allCats = [...(config?.categories || []), ...(config?.incomeCategories || [])];

                  if (splitsArray.length > 0) {
                    return (
                      <div className="space-y-1.5">
                        {splitsArray.map((split: any, idx: number) => {
                          const splitCatName = typeof split.category === 'object' ? (split.category as any)?.name : (split.category || '');
                          const searchCat = splitCatName.trim().toLowerCase();
                          const cat = allCats.find(
                            c => c.name.trim().toLowerCase() === searchCat || c.id === searchCat
                          );
                          const iconKey = cat?.icon || getCategoryIconName(splitCatName);
                          const catColor = cat?.color || getCategoryColor(splitCatName, allCats);
                          return (
                            <div key={split.id || idx} className="flex items-center justify-end gap-2">
                              <CategoryIcon 
                                icon={iconKey} 
                                color={catColor}
                                categoryName={splitCatName} 
                                variant="primary" 
                                size="xs" 
                              />
                              <span className="text-sm font-medium text-[var(--text-primary)] truncate">{splitCatName}</span>
                              <span className="text-label text-[var(--text-secondary)] font-amount tabular-nums shrink-0">
                                ({formatAmount(split.amount, config?.language)} {config.currency})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  const catName = typeof currentTx.category === 'object' ? (currentTx.category as any)?.name : (currentTx.category || transaction.category || '');
                  const searchCat = catName.trim().toLowerCase();
                  const cat = allCats.find(
                    c => c.name.trim().toLowerCase() === searchCat || c.id === searchCat
                  );
                  const iconKey = cat?.icon || getCategoryIconName(catName);
                  const catColor = cat?.color || 'var(--accent-color)';
                  return (
                    <div className="flex items-center justify-end gap-2 min-w-0">
                      <CategoryIcon 
                        icon={iconKey} 
                        color={catColor}
                        categoryName={catName} 
                        variant="primary" 
                        size="xs" 
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px] sm:max-w-[240px]">
                        {catName}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Row 2: Date */}
            <div className="p-4 flex items-center justify-between min-h-[58px] gap-4">
              <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                {t('date')}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] text-right tabular-nums">
                {formattedDate}
              </span>
            </div>

            {/* Row 3: Time (when present) */}
            {formattedTime && (
              <div className="p-4 flex items-center justify-between min-h-[58px] gap-4">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {config?.language === 'en' ? 'Time' : config?.language === 'fi' ? 'Aika' : 'Tid'}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] text-right tabular-nums">
                  {formattedTime}
                </span>
              </div>
            )}

            {/* Row 4: Note (only if non-empty) */}
            {hasNote && (
              <div className="p-4 flex items-start justify-between min-h-[58px] gap-4">
                <span className="text-body font-normal text-[var(--text-secondary)] shrink-0">
                  {t('ownNote')}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] text-right max-w-[70%] break-words">
                  {currentTx.note}
                </span>
              </div>
            )}

            {/* Row 5: Attachment / Receipts (Supports 1 or multiple) */}
            {hasReceipt && (
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-body font-normal text-[var(--text-secondary)]">
                      {receiptUrls.length > 1
                        ? (config?.language === 'en' ? 'Receipts & Attachments' : 'Kvitton & Bilagor')
                        : (config?.language === 'en' ? 'Receipt / Attachment' : 'Kvitto / Bilaga')}
                    </span>
                    {receiptUrls.length > 1 && (
                      <span className="text-label font-semibold text-[var(--text-secondary)] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full tabular-nums">
                        {receiptUrls.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReceiptIndex(0);
                      setShowReceiptLightbox(true);
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--accent-color)] hover:underline cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-icon-button overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                      {receiptUrls[0].toLowerCase().includes('.pdf') ? (
                        <FileText size={13} className="text-[var(--text-secondary)]" />
                      ) : (
                        <img src={receiptUrls[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <span>{config?.language === 'en' ? 'View full screen' : 'Visa i helskärm'}</span>
                  </button>
                </div>

                {receiptUrls.length === 1 ? (
                  <div 
                    onClick={() => {
                      setActiveReceiptIndex(0);
                      setShowReceiptLightbox(true);
                    }}
                    className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-card-nested overflow-hidden bg-black/5 dark:bg-black/20 flex items-center justify-center cursor-pointer group transition-all"
                  >
                    {receiptUrls[0].toLowerCase().includes('.pdf') ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                        <FileText size={36} className="text-[var(--text-secondary)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {config?.language === 'en' ? 'PDF document (Click to open)' : 'PDF-dokument (Klicka för att öppna)'}
                        </span>
                      </div>
                    ) : (
                      <img 
                        src={receiptUrls[0]} 
                        alt={config?.language === 'en' ? 'Attachment' : 'Bilaga'} 
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {receiptUrls.map((url, idx) => {
                      const isPdf = url.toLowerCase().includes('.pdf');
                      return (
                        <div
                          key={`${url}-${idx}`}
                          onClick={() => {
                            setActiveReceiptIndex(idx);
                            setShowReceiptLightbox(true);
                          }}
                          className="relative aspect-[4/3] rounded-card-nested overflow-hidden bg-black/5 dark:bg-black/20 flex items-center justify-center cursor-pointer group transition-all"
                        >
                          {isPdf ? (
                            <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                              <FileText size={28} className="text-[var(--text-secondary)]" />
                              <span className="text-xs font-medium text-[var(--text-primary)]">
                                {config?.language === 'en' ? `PDF ${idx + 1}` : `PDF ${idx + 1}`}
                              </span>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Bilaga ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-semibold text-white tabular-nums">
                            {idx + 1}/{receiptUrls.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Optional Tags Row (only if non-empty) */}
            {hasTags && (
              <div className="p-4 flex items-start justify-between min-h-[58px] gap-4">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] shrink-0">
                  <Tag size={13} strokeWidth={2} />
                  <span className="text-body font-normal">{t('tags')}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {(currentTx.tags || []).map((tag, index) => (
                    <span key={index} className="text-sm font-medium text-[var(--text-primary)]">
                      {tag}{index < (currentTx.tags?.length || 0) - 1 ? ' · ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lightbox Modal Portal */}
          {showReceiptLightbox && activeReceiptUrl && createPortal(
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-8 pt-[max(2.5rem,env(safe-area-inset-top,3rem))] pb-[max(2rem,env(safe-area-inset-bottom,2rem))]"
              onClick={() => setShowReceiptLightbox(false)}
            >
              <div className="w-full flex items-center justify-between max-w-5xl py-3 px-2 sm:px-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white">
                  <Paperclip size={18} />
                  <span className="text-sm font-medium">
                    {config?.language === 'en' ? 'Receipt / Attachment' : 'Kvitto / Bilaga'}
                    {receiptUrls.length > 1 ? ` (${activeReceiptIndex + 1}/${receiptUrls.length})` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a 
                    href={activeReceiptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-btn-sm text-xs font-medium transition-colors"
                  >
                    {config?.language === 'en' ? 'Open original' : 'Öppna original'}
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowReceiptLightbox(false)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={t('close')}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div 
                className="relative flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto p-2 sm:p-4 my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {receiptUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveReceiptIndex((prev) => (prev - 1 + receiptUrls.length) % receiptUrls.length)}
                    className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    aria-label={config?.language === 'en' ? 'Previous attachment' : 'Föregående bilaga'}
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}

                {activeReceiptUrl.toLowerCase().includes('.pdf') ? (
                  <div className="bg-white dark:bg-[var(--surface-color)] p-8 rounded-modal text-center space-y-4">
                    <FileText size={64} className="mx-auto text-[var(--accent-color)]" />
                    <p className="text-sm font-medium text-[var(--text-primary)] dark:text-white">PDF-dokument</p>
                    <a 
                      href={activeReceiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-white px-5 py-2.5 rounded-btn text-sm font-semibold transition-colors"
                    >
                      {config?.language === 'en' ? 'Open PDF in new tab' : 'Öppna PDF i ny flik'}
                    </a>
                  </div>
                ) : (
                  <img 
                    src={activeReceiptUrl} 
                    alt="Receipt Fullscreen" 
                    className="max-h-[75vh] max-w-full object-contain rounded-card"
                    referrerPolicy="no-referrer"
                  />
                )}

                {receiptUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveReceiptIndex((prev) => (prev + 1) % receiptUrls.length)}
                    className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    aria-label={config?.language === 'en' ? 'Next attachment' : 'Nästa bilaga'}
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>

              {receiptUrls.length > 1 && (
                <div
                  className="flex items-center justify-center gap-2 pt-2 overflow-x-auto max-w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {receiptUrls.map((url, idx) => {
                    const isPdf = url.toLowerCase().includes('.pdf');
                    const isSelected = idx === activeReceiptIndex;
                    return (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setActiveReceiptIndex(idx)}
                        className={`w-12 h-12 rounded-btn-sm overflow-hidden shrink-0 transition-all cursor-pointer flex items-center justify-center bg-white/10 ${
                          isSelected ? 'ring-2 ring-white scale-105 opacity-100' : 'opacity-50 hover:opacity-80'
                        }`}
                      >
                        {isPdf ? (
                          <FileText size={18} className="text-white" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>,
            document.body
          )}

          {/* Similar Transactions Section */}
          {similarTransactions.length > 0 && (
            <div className="pt-0.5">
              <div className="rounded-card bg-[var(--surface-color)] divide-y divide-subtle overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.light === 'function') feedback.light();
                    setShowSimilar(prev => !prev);
                  }}
                  className="w-full py-3.5 px-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all flex items-center justify-between cursor-pointer text-left touch-press"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-body font-semibold text-[var(--text-primary)] tracking-tight">
                      {config?.language === 'en' ? 'Similar transactions' : 'Liknande transaktioner'}
                    </span>
                    <span className="text-label font-medium text-[var(--text-secondary)] opacity-75 tabular-nums">
                      {similarTransactions.length}
                    </span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`text-[var(--text-secondary)] transition-transform duration-200 shrink-0 ml-2 ${showSimilar ? 'rotate-180' : ''}`} 
                  />
                </button>

                {showSimilar && (
                  <div className="divide-y divide-subtle">
                    {similarTransactions.map((similarTx) => (
                      <TransactionItem
                        key={similarTx.id}
                        transaction={similarTx}
                        config={config}
                        showDate={true}
                        isGrouped={true}
                        onClick={() => {
                          if (typeof feedback?.selection === 'function') feedback.selection();
                          if (onSelectTransaction) {
                            onSelectTransaction(similarTx);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer: Primary 'Redigera', Secondary 'Duplicera' with visible label, and Global Delete IconButton */}
        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-subtle bg-[var(--bg-color)] flex items-center gap-2.5 relative z-10 w-full">
          <Button 
            type="button"
            variant="primary"
            size="lg"
            className="flex-1 rounded-[var(--radius-button,12px)] text-body-medium font-semibold"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onEdit(currentTx);
            }} 
          >
            {t('edit')}
          </Button>

          <Button 
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onDuplicate(transaction);
            }} 
            className="rounded-[var(--radius-button,12px)] px-4 text-label font-semibold shrink-0"
            title={config?.language === 'en' ? 'Create a copy of this transaction' : 'Skapa en kopia av transaktionen'}
            aria-label={config?.language === 'en' ? 'Duplicate transaction' : 'Duplicera transaktion'}
          >
            {t('duplicate')}
          </Button>

          {onDelete && (
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

        {showDeleteConfirm && transaction && transaction.id && onDelete && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title={config?.language === 'en' ? "Delete transaction?" : "Radera transaktion?"}
            message={
              config?.language === 'en'
                ? `Do you want to delete the transaction of ${formatAmount(transaction.amount, config?.language)} ${config?.currency || 'kr'}?`
                : `Vill du radera transaktionen på ${formatAmount(transaction.amount, config?.language)} ${config?.currency || 'kr'}?`
            }
            confirmText={config?.language === 'en' ? "Delete" : "Radera"}
            cancelText={config?.language === 'en' ? "Cancel" : "Avbryt"}
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

