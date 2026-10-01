import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';

import { X, Pencil, Trash2, Tag, Receipt, Repeat } from 'lucide-react';
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
        className="bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-2xl w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-black/10 dark:border-white/10 relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full py-3 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full transition-colors" />
        </div>

        {/* Header with Navigation and Actions: Actions left, Close button right */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[#E6E2D8] dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onDuplicate(transaction);
              }} 
              className="w-8 h-8 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] hover:bg-[#EDE9DF] dark:hover:bg-[#383838] text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title={t('duplicate')}
              aria-label={t('duplicate')}
            >
              <Repeat size={14} strokeWidth={1.8} />
            </button>
            <button 
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onEdit(transaction);
              }} 
              className="w-8 h-8 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] hover:bg-[#EDE9DF] dark:hover:bg-[#383838] text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title={t('edit')}
              aria-label={t('edit')}
            >
              <Pencil size={14} strokeWidth={1.8} />
            </button>
            <button 
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                setShowDeleteConfirm(true);
              }} 
              className="w-8 h-8 rounded-full bg-rose-500/[0.1] hover:bg-rose-500/[0.18] flex items-center justify-center text-rose-600 dark:text-rose-400 transition-colors cursor-pointer active:scale-95"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <Trash2 size={14} strokeWidth={1.8} />
            </button>
          </div>

          <button 
            type="button"
            onClick={() => {
              if (typeof feedback?.light === 'function') feedback.light();
              onClose();
            }} 
            className="w-8 h-8 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] hover:bg-[#EDE9DF] dark:hover:bg-[#383838] text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            aria-label={t('close')}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        {/* Main Content Area: Modern Consumer App Presentation */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          {/* Hero Section: Logo, Merchant, Prominent Amount, and Swedish Formatted Date */}
          <div className="flex flex-col items-center text-center pt-2 pb-2">
            <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/[0.08] border border-[#E6E2D8] dark:border-white/[0.1] flex items-center justify-center shadow-xs overflow-hidden">
              <TransactionLogo transaction={transaction} config={config} size="md" />
            </div>

            <h2 className="text-[17px] sm:text-[18px] font-semibold tracking-tight text-[#211F1C] dark:text-white mt-3 truncate max-w-full px-4">
              {merchantName}
            </h2>

            <p className={`text-[30px] sm:text-[34px] font-semibold font-amount tabular-nums tracking-tight leading-tight mt-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#211F1C] dark:text-white'}`}>
              <span className="opacity-75 mr-0.5">{isIncome ? '+' : isSavings ? '→' : '−'}</span>
              <span>{formatAmount(transaction.amount, config.language)}</span>
              <span className="text-[15px] font-normal text-[#6D6962] dark:text-[#A8A8A8] ml-[3px] font-sans">{config.currency}</span>
            </p>

            <p className="text-[12px] sm:text-[13px] font-normal text-[#777168] dark:text-[#71717A] mt-1 select-none tabular-nums">
              {formattedDate}{formattedTime ? ` · ${formattedTime}` : ''}
            </p>
          </div>

          {/* Details Section: Clean, Lightweight, and Non-Administrative */}
          <div className="bg-[#EAE6DE] dark:bg-white/[0.04] rounded-2xl p-4 space-y-3.5 border border-[#E2DDD4] dark:border-white/[0.06]">
            {/* Category */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] shrink-0">
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
                          <span className="text-[15px] font-medium text-[#211F1C] dark:text-white">{splitCatName}</span>
                          <span className="text-[13px] font-normal text-[#6D6962] dark:text-[#A8A8A8]">({formatAmount(split.amount, config.language)} {config.currency})</span>
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
                    <span className="text-[15px] font-medium text-[#211F1C] dark:text-white">
                      {typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Note if exists */}
            {transaction.note && (
              <>
                <div className="h-px bg-[#E6E2D8] dark:bg-white/[0.06]" />
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] shrink-0 pt-0.5">
                    {t('ownNote')}
                  </span>
                  <span className="text-[15px] font-medium text-[#211F1C] dark:text-white text-right max-w-[70%] break-words">
                    {transaction.note}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Tags Section if exists */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="p-4 bg-[var(--surface-color)] dark:bg-[#312f2f] rounded-[18px] border border-[var(--border-color)] dark:border-white/[0.05]">
              <div className="flex items-center gap-1.5 mb-2 text-[var(--text-secondary)] dark:text-[#9CA6BC]">
                <Tag size={12} strokeWidth={1.75} />
                <span className="text-xs font-medium">{t('tags')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(transaction.tags || []).map((tag, index) => (
                  <span key={index} className="bg-[var(--surface-muted)] dark:bg-white/[0.06] text-[var(--text-primary)] dark:text-white px-2.5 py-1 rounded-[10px] text-xs font-medium border border-[var(--border-color)]/60 dark:border-transparent">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Receipt Section if exists */}
          {transaction.receiptUrl && (
            <div className="p-4 bg-[var(--surface-color)] dark:bg-[#312f2f] rounded-[18px] border border-[var(--border-color)] dark:border-white/[0.05]">
              <div className="flex items-center gap-1.5 mb-3 text-[var(--text-secondary)] dark:text-[#9CA6BC]">
                <Receipt size={12} strokeWidth={1.75} />
                <span className="text-xs font-medium">{t('receipt')}</span>
              </div>
              <div className="relative aspect-[3/4] rounded-[14px] overflow-hidden bg-black/5 dark:bg-black/20 border border-[var(--border-color)] dark:border-white/[0.05]">
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
