import React, { useState, useRef } from 'react';
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
  const rawFormattedDate = date.toLocaleDateString(getLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedDate = rawFormattedDate ? rawFormattedDate.charAt(0).toUpperCase() + rawFormattedDate.slice(1) : '';
  const formattedTime = date.toLocaleTimeString(getLocale(), {
    hour: '2-digit',
    minute: '2-digit'
  });

  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  const merchantName = typeof transaction.merchant === 'object' ? (transaction.merchant as any)?.name : (transaction.merchant || (typeof transaction.category === 'object' ? (transaction.category as any)?.name : transaction.category));

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
        className="bg-[var(--bg-color)] dark:bg-[#232323] w-full max-w-lg rounded-t-[22px] rounded-b-none sm:rounded-[22px] border-t sm:border border-[var(--border-color)] dark:border-white/[0.08] relative max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Handle on Mobile */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={onClose}
          className="w-full py-3 flex items-center justify-center sm:hidden cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="w-10 h-1 bg-[var(--border-color)] dark:bg-white/20 hover:bg-[var(--text-secondary)] dark:hover:bg-white/40 rounded-full transition-colors" />
        </div>

        {/* Compact Header Section */}
        <div className="px-5 sm:px-6 pt-2 sm:pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--border-color)]/60 dark:border-white/[0.04]">
          <div className="flex items-center gap-3 min-w-0">
            <TransactionLogo transaction={transaction} config={config} size="sm" />
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] dark:text-white truncate">
              {merchantName}
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              type="button"
              onClick={() => onDuplicate(transaction)} 
              className="w-8 h-8 rounded-full bg-[var(--surface-muted)] dark:bg-white/[0.04] hover:bg-[var(--border-color)]/50 dark:hover:bg-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] dark:text-[#9CA6BC] hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer"
              title={t('duplicate')}
              aria-label={t('duplicate')}
            >
              <Repeat size={14} strokeWidth={1.75} />
            </button>
            <button 
              type="button"
              onClick={() => onEdit(transaction)} 
              className="w-8 h-8 rounded-full bg-[var(--surface-muted)] dark:bg-white/[0.04] hover:bg-[var(--border-color)]/50 dark:hover:bg-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] dark:text-[#9CA6BC] hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer"
              title={t('edit')}
              aria-label={t('edit')}
            >
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            <button 
              type="button"
              onClick={() => setShowDeleteConfirm(true)} 
              className="w-8 h-8 rounded-full bg-rose-500/[0.1] hover:bg-rose-500/[0.2] flex items-center justify-center text-rose-500 dark:text-rose-400 transition-colors cursor-pointer"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
            <div className="w-px h-4 bg-[var(--border-color)] dark:bg-white/10 mx-0.5" />
            <button 
              type="button"
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-[var(--surface-muted)] dark:bg-white/[0.04] hover:bg-[var(--border-color)]/50 dark:hover:bg-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] dark:text-[#9CA6BC] hover:text-[var(--text-primary)] dark:hover:text-white transition-colors cursor-pointer"
              aria-label={t('close')}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Main Content Area: One Cohesive Detail Surface */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          <div className="bg-[var(--surface-color)] dark:bg-[#312f2f] rounded-[18px] border border-[var(--border-color)] dark:border-white/[0.05] divide-y divide-[var(--border-color)]/50 dark:divide-white/[0.05] overflow-hidden shadow-xs dark:shadow-none">
            
            {/* Amount Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between">
              <span className="text-xs font-normal text-[var(--text-secondary)] dark:text-[#9CA6BC]">
                {t('amount')}
              </span>
              <div className="text-right">
                <p className={`text-xl sm:text-2xl font-semibold font-amount tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)] dark:text-white'}`}>
                  <span className="opacity-75 mr-1">{isIncome ? '+' : isSavings ? '→' : '−'}</span>
                  <span>{formatAmount(transaction.amount, config.language)}</span>
                  <span className="text-sm font-normal text-[var(--text-secondary)] dark:text-[#9CA6BC] ml-1.5 font-sans">{config.currency}</span>
                </p>
              </div>
            </div>

            {/* Merchant / Store Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <span className="text-xs font-normal text-[var(--text-secondary)] dark:text-[#9CA6BC] shrink-0">
                {t('merchant')}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] dark:text-white text-right truncate">
                {merchantName}
              </span>
            </div>

            {/* Date Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <span className="text-xs font-normal text-[var(--text-secondary)] dark:text-[#9CA6BC] shrink-0">
                {t('date')}
              </span>
              <div className="text-right">
                <span className="text-sm font-medium text-[var(--text-primary)] dark:text-white capitalize block">
                  {formattedDate}
                </span>
                {formattedTime && (
                  <span className="text-[11px] font-normal text-[var(--text-secondary)] dark:text-[#9CA6BC] mt-0.5 block tabular-nums">
                    {formattedTime}
                  </span>
                )}
              </div>
            </div>

            {/* Category Row */}
            <div className="p-4 sm:p-4.5 flex items-center justify-between gap-4">
              <span className="text-xs font-normal text-[var(--text-secondary)] dark:text-[#9CA6BC] shrink-0">
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
                          <span className="text-sm font-medium text-[var(--text-primary)] dark:text-white">{splitCatName}</span>
                          <span className="text-xs text-[var(--text-secondary)] dark:text-[#9CA6BC]">({formatAmount(split.amount, config.language)} {config.currency})</span>
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
                    <span className="text-sm font-medium text-[var(--text-primary)] dark:text-white">
                      {typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Note Row if exists */}
            {transaction.note && (
              <div className="p-4 sm:p-4.5 flex items-start justify-between gap-4">
                <span className="text-xs font-normal text-[var(--text-secondary)] dark:text-[#9CA6BC] shrink-0 pt-0.5">
                  {t('ownNote')}
                </span>
                <span className="text-sm font-normal text-[var(--text-primary)] dark:text-white text-right max-w-[65%] break-words">
                  {transaction.note}
                </span>
              </div>
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
          title={t('delete')}
          message={t('deleteConfirm')}
          onConfirm={() => {
            onDelete(transaction.id);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          t={t}
        />
      )}
    </motion.div>
  );
}
