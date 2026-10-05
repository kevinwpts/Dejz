import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';

import { X, Pencil, Tag, Repeat, Paperclip, FileText, Trash2 } from 'lucide-react';
import { Transaction, Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { getCategoryIconName } from '../utils/icons';
import { feedback } from '../utils/feedback';
import { getTransactionDominantColor, extractDominantColorFromImage } from '../utils/brandColor';
import { resolveEntityVisual } from '../utils/resolver';
import { ConfirmModal } from './ConfirmModal';

interface TransactionViewModalProps {
  transaction: Transaction;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onDuplicate: (transaction: Transaction) => void;
  t: (key: TranslationKey) => string;
  config: Config;
}

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

export function TransactionViewModal({ transaction, onClose, onEdit, onDelete, onDuplicate, t, config }: TransactionViewModalProps) {
  useScrollLock(true);
  const dragControls = useDragControls();
  const isIncome = transaction.type === 'income';
  const isSavings = transaction.type === 'savings';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptLightbox, setShowReceiptLightbox] = useState(false);
  const [_brandColor, setBrandColor] = useState(() => getTransactionDominantColor(transaction, config));

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
    const lang = config.language || 'sv';
    const mapping: Record<string, string> = {
      sv: 'sv-SE',
      en: 'en-US',
      no: 'no-NO',
      da: 'da-DK',
      fi: 'fi-FI'
    };
    return mapping[lang] || 'sv-SE';
  };

  const date = new Date(transaction.timestamp);
  const formatDateLike1Nov2026 = (timestamp: number, lang: string) => {
    const d = new Date(timestamp);
    const day = d.getDate();
    const monthsSv = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = lang === 'en' ? monthsEn : monthsSv;
    const monthStr = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}. ${monthStr} ${year}`;
  };
  const formattedDate = formatDateLike1Nov2026(transaction.timestamp, config.language);
  const formattedTime = date.toLocaleTimeString(getLocale(), {
    hour: '2-digit',
    minute: '2-digit'
  });

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const merchantName = typeof transaction.merchant === 'object' ? (transaction.merchant as any)?.name : (transaction.merchant || (typeof transaction.category === 'object' ? (transaction.category as any)?.name : transaction.category));

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
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>

            {/* Centered Logo */}
            <div className="scale-135 sm:scale-150 mb-7 pt-3">
              <TransactionLogo transaction={transaction} config={config} size="xl" />
            </div>

            {/* Title */}
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight max-w-[90%] truncate px-2">
              {merchantName}
            </h2>

            {/* Price */}
            <p className={`text-[28px] sm:text-[34px] font-semibold font-amount tabular-nums tracking-tight mt-1.5 flex items-baseline justify-center ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'}`}>
              <span className="opacity-80 mr-1">{isIncome ? '+' : isSavings ? '→' : '−'}</span>
              <span>{formatAmount(transaction.amount, config.language)}</span>
              <span className="text-[14px] font-medium text-[var(--text-secondary)] ml-1.5 font-sans self-end pb-1">{config.currency}</span>
            </p>
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines without background */}
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-left">
            {/* Category */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('category')}
              </span>
              <div className="text-right">
                {transaction.splits && transaction.splits.length > 0 ? (
                  <div className="space-y-1.5">
                    {transaction.splits.map((split, idx) => {
                      const splitCatName = typeof split.category === 'object' ? (split.category as any)?.name : (split.category || '');
                      const searchCat = splitCatName.trim().toLowerCase();
                      const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
                        c => c.name.trim().toLowerCase() === searchCat
                      );
                      const iconKey = cat?.icon || getCategoryIconName(splitCatName);
                      return (
                        <div key={split.id || idx} className="flex items-center justify-end gap-2">
                          {iconKey && <CategoryIcon icon={iconKey} color={cat?.color} size="sm" solidBackground whiteIcon />}
                          <span className="text-[14px] font-medium text-[var(--text-primary)]">{splitCatName}</span>
                          <span className="text-[12px] font-normal text-[var(--text-secondary)]">({formatAmount(split.amount, config.language)} {config.currency})</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    {(() => {
                      const catName = typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '');
                      const searchCat = catName.trim().toLowerCase();
                      const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
                        c => c.name.trim().toLowerCase() === searchCat
                      );
                      const iconKey = cat?.icon || getCategoryIconName(catName);
                      if (!iconKey) return null;
                      return <CategoryIcon icon={iconKey} color={cat?.color} size="sm" solidBackground whiteIcon />;
                    })()}
                    <span className="text-[14px] font-medium text-[var(--text-primary)]">
                      {typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Date Field */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('date')}
              </span>
              <span className="text-[14px] font-medium text-[var(--text-primary)] text-right tabular-nums">
                {formattedDate}
              </span>
            </div>

            {/* Time Field */}
            {formattedTime && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0">
                  {config.language === 'en' ? 'Time' : config.language === 'fi' ? 'Aika' : 'Tid'}
                </span>
                <span className="text-[14px] font-medium text-[var(--text-primary)] text-right tabular-nums">
                  {formattedTime}
                </span>
              </div>
            )}

            {/* Note if exists */}
            {transaction.note && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-[13px] font-normal text-[var(--text-secondary)] shrink-0 pt-0.5">
                  {t('ownNote')}
                </span>
                <span className="text-[14px] font-medium text-[var(--text-primary)] text-right max-w-[70%] break-words">
                  {transaction.note}
                </span>
              </div>
            )}

            {/* Tags Section if exists */}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] shrink-0 pt-0.5">
                  <Tag size={13} strokeWidth={1.75} />
                  <span className="text-[13px] font-normal">{t('tags')}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {(transaction.tags || []).map((tag, index) => (
                    <span key={index} className="bg-[var(--surface-color)] text-[var(--text-primary)] px-2.5 py-1 rounded-full text-[11px] font-medium border-none shadow-none">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attached file / Receipt Section if exists (Option 2: Full-width card with Lightbox preview) */}
            {transaction.receiptUrl && (
              <>
                <div className="py-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <Paperclip size={13} strokeWidth={1.75} />
                      <span className="text-[13px] font-normal">
                        {config.language === 'en' ? 'Attached file / Receipt' : 'Bifogad fil / Kvitto'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReceiptLightbox(true)}
                      className="text-[12px] font-medium text-[var(--accent-color)] hover:underline cursor-pointer"
                    >
                      {config.language === 'en' ? 'View full screen' : 'Visa i helskärm'}
                    </button>
                  </div>
                  <div 
                    onClick={() => setShowReceiptLightbox(true)}
                    className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-[22px] overflow-hidden bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer group shadow-sm hover:shadow-md transition-all"
                  >
                    {transaction.receiptUrl.includes('.pdf') ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                        <FileText size={40} className="text-[#777168] dark:text-[#A8A8A8]" />
                        <span className="text-[13px] font-medium text-[var(--text-primary)]">PDF-dokument (Klicka för att öppna)</span>
                      </div>
                    ) : (
                      <img 
                        src={transaction.receiptUrl} 
                        alt="Attachment" 
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
                      <span className="bg-white/95 dark:bg-zinc-900/95 text-black dark:text-white px-4 py-2.5 rounded-[14px] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                        {config.language === 'en' ? 'Click to zoom' : 'Klicka för att förstora'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lightbox Modal Portal */}
                {showReceiptLightbox && createPortal(
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
                          {config.language === 'en' ? 'Receipt / Attachment' : 'Kvitto / Bilaga'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <a 
                          href={transaction.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-[14px] text-xs font-medium transition-colors"
                        >
                          {config.language === 'en' ? 'Open original' : 'Öppna original'}
                        </a>
                        <button
                          type="button"
                          onClick={() => setShowReceiptLightbox(false)}
                          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div 
                      className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto p-2 sm:p-4 my-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {transaction.receiptUrl.includes('.pdf') ? (
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[22px] text-center space-y-4 shadow-2xl">
                          <FileText size={64} className="mx-auto text-violet-500" />
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">PDF-dokument</p>
                          <a 
                            href={transaction.receiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-[14px] text-sm font-semibold transition-colors shadow-lg"
                          >
                            {config.language === 'en' ? 'Open PDF in new tab' : 'Öppna PDF i ny flik'}
                          </a>
                        </div>
                      ) : (
                        <img 
                          src={transaction.receiptUrl} 
                          alt="Receipt Fullscreen" 
                          className="max-h-[80vh] max-w-full object-contain rounded-[14px] shadow-2xl"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  </motion.div>,
                  document.body
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Buttons Footer: Bred Redigera-knapp, Duplicera och Radera */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-black/[0.05] dark:border-white/[0.06] bg-transparent flex items-center gap-2.5 relative z-10">
          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onEdit(transaction);
            }} 
            className="flex-1 h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-primary)] dark:text-white font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] border-none shadow-none"
          >
            <Pencil size={14.5} strokeWidth={1.9} className="dark:text-white" />
            <span>{t('edit')}</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onDuplicate(transaction);
            }} 
            className="w-[42px] h-[42px] rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 border-none shadow-none"
            title={t('duplicate')}
            aria-label={t('duplicate')}
          >
            <Repeat size={16} strokeWidth={1.9} className="dark:text-white" />
          </button>

          {onDelete && (
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
              <Trash2 size={16} strokeWidth={1.9} className="dark:text-white" />
            </button>
          )}
        </div>

        {showDeleteConfirm && transaction && transaction.id && onDelete && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title={config.language === 'en' ? "Delete transaction?" : "Radera transaktion?"}
            message={
              config.language === 'en'
                ? `Do you want to delete the transaction of ${formatAmount(transaction.amount, config.language)} ${config?.currency || 'kr'}?`
                : `Vill du radera transaktionen på ${formatAmount(transaction.amount, config.language)} ${config?.currency || 'kr'}?`
            }
            confirmText={config.language === 'en' ? "Delete" : "Radera"}
            cancelText={config.language === 'en' ? "Cancel" : "Avbryt"}
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
