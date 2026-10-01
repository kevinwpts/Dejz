import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';

import { X, Pencil, Trash2, Tag, Receipt, Repeat, MoreHorizontal } from 'lucide-react';
import { Transaction, Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { useScrollLock } from '../hooks/useScrollLock';
import { getCategoryIconName } from '../utils/icons';
import { formatFullDate } from '../utils/date';
import { feedback } from '../utils/feedback';

interface TransactionViewModalProps {
  transaction: Transaction;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onDuplicate: (transaction: Transaction) => void;
  t: (key: TranslationKey) => string;
  config: Config;
}

export function TransactionViewModal({ transaction, onClose, onEdit, onDelete, onDuplicate, t, config }: TransactionViewModalProps) {
  useScrollLock(true);
  const dragControls = useDragControls();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isIncome = transaction.type === 'income';
  const isSavings = transaction.type === 'savings';

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
  const formattedDate = formatFullDate(transaction.timestamp, config.language, { includeYear: true });
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
        className="bg-white dark:bg-[#080611] w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-black/10 dark:border-white/10 relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-5 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full py-2.5 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full transition-colors" />
        </div>

        {/* Clean Header: Close button only */}
        <div className="px-5 sm:px-6 pt-2 sm:pt-4 pb-2 flex items-center justify-end shrink-0">
          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onClose();
            }} 
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            aria-label={t('close')}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-2 space-y-4 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          {/* Hero Section: Logo to the left, name & cost in line to the right */}
          <div className="flex items-center gap-4 text-left pt-1 pb-3">
            <div className="shrink-0">
              <TransactionLogo transaction={transaction} config={config} size="xl" />
            </div>

            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-tight text-[var(--text-primary)] truncate">
                {merchantName}
              </h2>

              <p className={`text-[28px] sm:text-[32px] font-semibold font-amount tabular-nums tracking-tight leading-tight mt-0.5 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                <span className="opacity-75 mr-0.5">{isIncome ? '+' : isSavings ? '→' : '−'}</span>
                <span>{formatAmount(transaction.amount, config.language)}</span>
                <span className="text-[15px] font-normal text-[var(--text-secondary)] ml-[3px] font-sans">{config.currency}</span>
              </p>
            </div>
          </div>

          {/* Details Section: Clean list with discrete subtle divider lines without background */}
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-left">
            {/* Category */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <span className="text-[14px] font-normal text-[var(--text-secondary)] shrink-0">
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
                          {iconKey && <CategoryIcon icon={iconKey} color={cat?.color} size="xs" />}
                          <span className="text-[15px] font-medium text-[var(--text-primary)]">{splitCatName}</span>
                          <span className="text-[13px] font-normal text-[var(--text-secondary)]">({formatAmount(split.amount, config.language)} {config.currency})</span>
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
                      return <CategoryIcon icon={iconKey} color={cat?.color} size="xs" />;
                    })()}
                    <span className="text-[15px] font-medium text-[var(--text-primary)]">
                      {typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Date Field */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <span className="text-[14px] font-normal text-[var(--text-secondary)] shrink-0">
                {t('date')}
              </span>
              <span className="text-[15px] font-medium text-[var(--text-primary)] text-right tabular-nums">
                {formattedDate}
              </span>
            </div>

            {/* Time Field */}
            {formattedTime && (
              <div className="py-3.5 flex items-center justify-between gap-4">
                <span className="text-[14px] font-normal text-[var(--text-secondary)] shrink-0">
                  {config.language === 'en' ? 'Time' : config.language === 'fi' ? 'Aika' : 'Tid'}
                </span>
                <span className="text-[15px] font-medium text-[var(--text-primary)] text-right tabular-nums">
                  {formattedTime}
                </span>
              </div>
            )}

            {/* Note if exists */}
            {transaction.note && (
              <div className="py-3.5 flex items-start justify-between gap-4">
                <span className="text-[14px] font-normal text-[var(--text-secondary)] shrink-0 pt-0.5">
                  {t('ownNote')}
                </span>
                <span className="text-[15px] font-medium text-[var(--text-primary)] text-right max-w-[70%] break-words">
                  {transaction.note}
                </span>
              </div>
            )}

            {/* Tags Section if exists */}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="py-3.5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] shrink-0 pt-0.5">
                  <Tag size={13} strokeWidth={1.75} />
                  <span className="text-[14px] font-normal">{t('tags')}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {(transaction.tags || []).map((tag, index) => (
                    <span key={index} className="bg-black/5 dark:bg-white/10 text-[var(--text-primary)] px-2.5 py-1 rounded-[8px] text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Receipt Section if exists */}
            {transaction.receiptUrl && (
              <div className="py-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Receipt size={13} strokeWidth={1.75} />
                  <span className="text-[14px] font-normal">{t('receipt')}</span>
                </div>
                <div className="relative aspect-[3/4] max-w-[180px] rounded-[14px] overflow-hidden bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10">
                  <img 
                    src={transaction.receiptUrl} 
                    alt="Receipt" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <a 
                    href={transaction.receiptUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group"
                  >
                    <span className="bg-white/95 text-black px-3.5 py-2 rounded-xl text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                      Visa fullstorlek
                    </span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ergonomic Action Bar in Footer (Alternative 2) */}
        <div className="px-5 sm:px-6 pt-3 pb-1 shrink-0 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2.5 relative">
          <button
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onEdit(transaction);
            }}
            className="flex-1 h-12 bg-[#211F1C] dark:bg-white text-white dark:text-[#080611] font-semibold text-[15px] rounded-2xl flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Pencil size={16} strokeWidth={2} />
            <span>{t('edit')}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowMoreMenu(!showMoreMenu);
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                showMoreMenu 
                  ? 'bg-black/10 dark:bg-white/20 text-[var(--text-primary)]' 
                  : 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Fler åtgärder"
              aria-label="Fler åtgärder"
            >
              <MoreHorizontal size={19} strokeWidth={2} />
            </button>

            {showMoreMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMoreMenu(false)} 
                />
                <div className="absolute right-0 bottom-full mb-2.5 z-50 w-48 bg-white dark:bg-[#191523] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 py-1.5 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      setShowMoreMenu(false);
                      onDuplicate(transaction);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-[14px] text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Repeat size={15} strokeWidth={1.8} className="text-[var(--text-secondary)]" />
                    <span>{t('duplicate')}</span>
                  </button>

                  <div className="h-px bg-black/5 dark:bg-white/[0.06] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      setShowMoreMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-[14px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} strokeWidth={1.8} />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={config.language === 'en' ? "Delete transaction?" : "Radera transaktion?"}
          message={
            config.language === 'en'
              ? `Do you want to delete the transaction of ${formatAmount(transaction.amount, config.language)} ${config.currency}?`
              : `Vill du radera transaktionen på ${formatAmount(transaction.amount, config.language)} ${config.currency}?`
          }
          confirmText={config.language === 'en' ? "Delete" : "Radera"}
          cancelText={config.language === 'en' ? "Cancel" : "Avbryt"}
          variant="danger"
          onConfirm={() => {
            onDelete(transaction.id);
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
