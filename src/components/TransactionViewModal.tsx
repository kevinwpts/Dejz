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
  const _accentColor = isIncome ? 'var(--success-color)' : isSavings ? '#ec4899' : 'var(--accent-color)';
  const _accentBg = isIncome ? 'rgba(16, 185, 129, 0.1)' : isSavings ? 'rgba(236, 72, 153, 0.1)' : 'rgba(var(--accent-rgb), 0.1)';

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
            <TransactionLogo transaction={transaction} config={config} size="sm" />
          </div>
          <div className="flex justify-center overflow-hidden">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] text-center truncate px-2">
              {transaction.merchant || transaction.category}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-[var(--border-color)] rounded-full transition-all text-[var(--text-secondary)] active:scale-90 justify-self-end shrink-0 cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
          {/* Actions Bar */}
          <div className="flex justify-end gap-2 pt-1">
            <button 
              onClick={() => onDuplicate(transaction)} 
              className="w-8 h-8 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-[var(--border-color)] rounded-full transition-all text-[var(--text-secondary)] active:scale-90 cursor-pointer"
              title={t('duplicate')}
            >
              <Repeat size={15} />
            </button>
            <button 
              onClick={() => onEdit(transaction)} 
              className="w-8 h-8 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-[var(--border-color)] rounded-full transition-all text-[var(--text-secondary)] active:scale-90 cursor-pointer"
              title={t('edit')}
            >
              <Pencil size={15} />
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="w-8 h-8 flex items-center justify-center bg-[var(--surface-muted)] hover:bg-danger/10 rounded-full transition-all text-danger active:scale-90 cursor-pointer"
              title={t('delete')}
            >
              <Trash2 size={15} />
            </button>
          </div>
          {/* Amount Box */}
          <div className="bg-[var(--surface-muted)]/50 p-5 rounded-[16px] border border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1">{t('amount')}</p>
            <p className={`text-3xl font-semibold ${isIncome ? 'text-success' : isSavings ? 'text-accent' : 'text-[var(--text-primary)]'} font-amount`}>
              <span className="opacity-40 mr-1">{isIncome ? '+' : isSavings ? '→' : '-'}</span>
              <span className="font-amount">{formatAmount(transaction.amount, config.language)}</span>
              <span className="text-xl font-semibold text-[var(--text-secondary)] opacity-40 ml-2 font-sans">{config.currency}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Merchant */}
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
               <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('merchant')}</p>
               <p className="text-base font-medium text-[var(--text-primary)] break-words">{transaction.merchant || transaction.category}</p>
            </div>

            {/* Date */}
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
               <div className="flex items-center justify-between mb-1.5">
                 <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60">{t('date')}</p>
                 {formattedTime && (
                   <span className="text-[10px] font-normal text-[var(--text-secondary)] opacity-50 tabular-nums">
                     {formattedTime}
                   </span>
                 )}
               </div>
               <p className="text-base font-medium text-[var(--text-primary)] capitalize break-words leading-snug">
                 {formattedDate}
               </p>
            </div>

            {/* Category */}
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
               <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('category')}</p>
               <div className="space-y-3">
                 {transaction.splits && transaction.splits.length > 0 ? (
                   transaction.splits.map((split, idx) => {
                     const searchCat = (split.category || '').trim().toLowerCase();
                     const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
                       c => c.name.trim().toLowerCase() === searchCat
                     );
                     const iconKey = cat?.icon || getCategoryIconName(split.category || '');
                     return (
                       <div key={split.id || idx} className="flex items-center justify-between">
                         <div className="flex items-center gap-2.5">
                           {iconKey && <CategoryIcon icon={iconKey} color={cat?.color} size="sm" />}
                           <p className="text-base font-medium text-[var(--text-primary)] break-words">{split.category}</p>
                         </div>
                         <p className="text-sm font-medium text-[var(--text-secondary)] opacity-60">
                           {formatAmount(split.amount, config.language)} {config.currency}
                         </p>
                       </div>
                     );
                   })
                 ) : (
                   <div className="flex items-center gap-2.5">
                     {(() => {
                       const searchCat = (transaction.category || '').trim().toLowerCase();
                       const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
                         c => c.name.trim().toLowerCase() === searchCat
                       );
                       const iconKey = cat?.icon || getCategoryIconName(transaction.category || '');
                       if (!iconKey) return null;
                       return <CategoryIcon icon={iconKey} color={cat?.color} size="sm" />;
                     })()}
                     <p className="text-base font-medium text-[var(--text-primary)] break-words">{transaction.category}</p>
                   </div>
                 )}
               </div>
            </div>
            
            {/* Note Section if exists */}
            {transaction.note && (
              <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)] col-span-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 mb-1.5">{t('ownNote')}</p>
                <p className="text-sm font-normal text-[var(--text-secondary)] leading-relaxed break-words">
                  {transaction.note}
                </p>
              </div>
            )}
          </div>

          {/* Tags Section if exists */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-2 text-[var(--text-tertiary)] opacity-60">
                <Tag size={12} />
                <p className="text-xs font-medium">{t('tags')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(transaction.tags || []).map((tag, index) => (
                  <span key={index} className="bg-accent/10 text-accent px-2 py-0.5 rounded-[8px] text-[10px] font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Receipt Section if exists */}
          {transaction.receiptUrl && (
            <div className="bg-[var(--surface-muted)]/50 p-4 rounded-[16px] border border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-3 text-[var(--text-tertiary)] opacity-60">
                <Receipt size={12} />
                <p className="text-xs font-medium">{t('receipt')}</p>
              </div>
              <div className="relative aspect-[3/4] rounded-[10px] overflow-hidden bg-black/5">
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
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all group"
                >
                  <span className="bg-white text-black px-3 py-1.5 rounded-[8px] text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-xs">
                    Visa fullstorlek
                  </span>
                </a>
              </div>
            </div>
          )}
        </div>
        

      </motion.div>

      <div>
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
      </div>
    </motion.div>
  );
}
