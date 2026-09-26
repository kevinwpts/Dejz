import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Transaction, Config } from '../types';
import { TransactionLogo } from './TransactionLogo';
import { formatAmount, capitalize } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryIconName } from '../utils/icons';
import { Paperclip, Trash2, AlertTriangle } from 'lucide-react';
import { feedback } from '../utils/feedback';

interface TransactionItemProps {
  transaction: Transaction;
  config: Config;
  onView?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  isFixed?: boolean;
  squared?: boolean;
  onClick?: () => void;
  displayAmount?: number;
  showAllCategories?: boolean;
  isGrouped?: boolean;
  variant?: 'default' | 'nested' | 'transparent';
  hideCategoryBadge?: boolean;
  showDate?: boolean;
}

export function TransactionItem({ 
  transaction: originalTransaction, 
  config, 
  onView, 
  onDelete,
  isFixed, 
  squared, 
  onClick, 
  displayAmount,
  showAllCategories,
  isGrouped,
  variant,
  hideCategoryBadge,
  showDate
}: TransactionItemProps) {
  const transaction = originalTransaction as any;
  const canEdit = onView && !isFixed;
  const isClickable = Boolean(onClick || (canEdit && onView));
  const canSwipe = Boolean(onDelete && !isFixed);

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-84, -20, 0], [1, 0.7, 0]);

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

  const getL10n = (sv: string, en: string, no?: string, da?: string, fi?: string) => {
    const lang = config?.language || 'sv';
    if (lang === 'sv') return sv;
    if (lang === 'no') return no || sv;
    if (lang === 'da') return da || sv;
    if (lang === 'fi') return fi || sv;
    return en;
  };

  const finalAmount = displayAmount !== undefined ? displayAmount : transaction.amount;
  const amountColor = transaction.type === 'income' ? 'text-emerald-400' : 'text-white';

  // Determine layout style classes with exact dark glass materials
  let containerClasses = "";
  let paddingClasses = "px-[14px] sm:px-[16px] py-[12px] min-h-[66px]";
  if (squared) {
    containerClasses = "bg-transparent rounded-none shadow-none border-b border-white/[0.04] last:border-none py-3 px-2";
    paddingClasses = "";
  } else if (variant === 'transparent') {
    containerClasses = "bg-transparent hover:bg-white/[0.03] rounded-none shadow-none border-none transition-colors";
  } else if (variant === 'nested') {
    containerClasses = "bg-white/[0.025] hover:bg-white/[0.05] shadow-none border border-white/[0.025] rounded-[18px] backdrop-blur-[16px]";
  } else {
    const isTransparentGrouped = isGrouped && !variant;
    if (isTransparentGrouped) {
      containerClasses = "bg-white/[0.03] hover:bg-white/[0.05] rounded-[18px] shadow-none border-none backdrop-blur-[16px]";
    } else {
      containerClasses = "bg-white/[0.035] hover:bg-white/[0.055] border border-white/[0.02] rounded-[18px] backdrop-blur-[16px] shadow-none";
    }
  }

  // Neutral discreet category display with #9CA6BC (no pill background, no bright red/colored badge)
  const renderCategoryBadge = (categoryName: string, amount?: number) => {
    const iconKey = getCategoryIconName(categoryName || '');

    return (
      <div className="flex items-center gap-1.5 shrink-0 text-[#9CA6BC]">
        {iconKey ? (
          <CategoryIcon 
            icon={iconKey} 
            color="#9CA6BC" 
            size="xs" 
          />
        ) : null}
        <span className="text-[12px] font-medium text-[#9CA6BC] tracking-tight whitespace-nowrap">
          {capitalize(categoryName || '')}
          {amount !== undefined && <span className="ml-1 opacity-70">({formatAmount(amount, config?.language || 'sv')})</span>}
        </span>
      </div>
    );
  };

  const isSplit = (transaction as any).splits && (transaction as any).splits.length > 0;
  const merchantName = isFixed 
    ? (transaction.name || transaction.merchant || transaction.category) 
    : (transaction.merchant || transaction.category || 'Transaktion');

  const handleDeleteConfirm = () => {
    if (!onDelete || !transaction.id) return;
    setIsDeleting(true);
    feedback.success();
    setShowConfirmModal(false);
    onDelete(transaction.id);
  };

  const handleDragEnd = (_e: any, info: any) => {
    setDragDistance(Math.abs(info.offset.x));
    if (info.offset.x < -40 || info.velocity.x < -300) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className={`relative overflow-hidden ${squared ? '' : 'rounded-[18px]'} select-none`}>
        {/* Swipe Left Background Action: Delete */}
        {canSwipe && (
          <motion.div 
            style={{ opacity: actionOpacity }}
            className="absolute inset-y-0 right-0 w-[84px] bg-rose-500 text-white flex items-center justify-center z-0 cursor-pointer"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                feedback.tap();
                setShowConfirmModal(true);
              }}
              className="w-full h-full flex flex-col items-center justify-center gap-1 text-white hover:bg-rose-600 active:scale-95 transition-all cursor-pointer select-none"
              aria-label={getL10n('Ta bort', 'Delete')}
            >
              <Trash2 size={19} strokeWidth={2.2} />
              <span className="text-[10.5px] font-bold tracking-tight">
                {getL10n('Ta bort', 'Delete')}
              </span>
            </button>
          </motion.div>
        )}

        {/* Foreground Draggable Transaction Card */}
        <motion.div 
          drag={canSwipe ? "x" : false}
          dragDirectionLock
          dragConstraints={{ left: -84, right: 0 }}
          dragElastic={0.12}
          animate={{ x: isOpen ? -84 : 0 }}
          style={{ x }}
          onDragEnd={handleDragEnd}
          onClick={(e) => {
            if (dragDistance > 6) {
              setDragDistance(0);
              return;
            }
            if (isOpen) {
              e.stopPropagation();
              setIsOpen(false);
              return;
            }
            if (onClick) {
              onClick();
            } else if (canEdit && onView) {
              onView(transaction);
            }
          }}
          className={`${paddingClasses} relative z-10 flex items-center justify-between gap-[12px] group transition-colors duration-150 ${containerClasses} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-center gap-[12px] min-w-0 flex-1">
            {/* Real Logo in original color */}
            <div className="flex-shrink-0">
              <TransactionLogo transaction={transaction} config={config} />
            </div>
            
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              {/* Primary Merchant Name */}
              <p className="text-[14px] sm:text-[14.5px] font-semibold text-white leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
                {merchantName}
              </p>
              
              {/* Secondary Details (Category, Note, Paperclip) in #9CA6BC */}
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[#9CA6BC]">
                {hideCategoryBadge ? (
                  (transaction.timestamp || transaction.date) ? (
                    <span className="text-[12px] font-normal text-[#9CA6BC] opacity-80 tabular-nums">
                      {new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
                    </span>
                  ) : isFixed ? (
                    <span className="text-[11px] font-medium text-[#9CA6BC] opacity-80">
                      {getL10n('Fast utgift', 'Fixed expense', 'Fast utgift', 'Fast udgift', 'Kiinteä kulu')}
                    </span>
                  ) : null
                ) : showAllCategories && isSplit ? (
                  (transaction as any).splits.map((split: any, idx: number) => (
                    <React.Fragment key={idx}>
                      {renderCategoryBadge(split.category, split.amount)}
                    </React.Fragment>
                  ))
                ) : (
                  renderCategoryBadge(transaction.category)
                )}

                {transaction.note && !isFixed && (
                  <span className="text-[12px] font-normal text-[#9CA6BC]/80 truncate min-w-0 flex-1">
                    {hideCategoryBadge ? `• ${transaction.note}` : `• ${transaction.note}`}
                  </span>
                )}
                {transaction.receiptUrl && (
                  <Paperclip className="w-3 h-3 text-[#9CA6BC] opacity-75 shrink-0" />
                )}
              </div>
            </div>
          </div>
          
          {/* Primary Amount (Semibold 600) */}
          <div className="flex flex-col items-end justify-center flex-shrink-0 whitespace-nowrap pl-2">
            <p className={`text-[14.5px] sm:text-[15px] font-semibold whitespace-nowrap tracking-tight ${amountColor}`}>
              <span className="opacity-75 mr-0.5 text-[13px] font-semibold">{transaction.type === 'income' ? '+' : '−'}</span>
              <span className="font-amount tabular-nums font-semibold tracking-tight">{formatAmount(finalAmount, config?.language || 'sv')}</span>
              <span className="text-[12px] font-normal text-[#9CA6BC] ml-1">{config?.currency || 'kr'}</span>
            </p>
            {(transaction.timestamp || transaction.date) && !isFixed ? (
              <p className="text-[11px] font-normal text-[#9CA6BC]/75 mt-0.5 tabular-nums">
                {showDate 
                  ? new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
                  : new Date(transaction.timestamp || transaction.date).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : isFixed && (
              <span className="text-[10px] font-normal text-[#9CA6BC] opacity-80 px-1.5 py-0.5 rounded-md mt-0.5 whitespace-nowrap">
                {getL10n(
                  transaction.type === 'income' ? 'Fast inkomst' : transaction.type === 'saving' ? 'Fast sparande' : 'Fast utgift',
                  transaction.type === 'income' ? 'Fixed income' : transaction.type === 'saving' ? 'Fixed savings' : 'Fixed expense',
                  transaction.type === 'income' ? 'Fast inntekt' : transaction.type === 'saving' ? 'Fast sparing' : 'Fast utgift',
                  transaction.type === 'income' ? 'Fast indkomst' : transaction.type === 'saving' ? 'Fast opsparing' : 'Fast udgift',
                  transaction.type === 'income' ? 'Kiinteä tulo' : transaction.type === 'saving' ? 'Kiinteä säästö' : 'Kiinteä kulu'
                )}
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal before Delete */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.16 }}
              className="bg-[#14141E] border border-white/[0.08] rounded-[24px] p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-white tracking-tight">
                    {getL10n('Ta bort transaktion?', 'Delete transaction?')}
                  </h3>
                  <p className="text-xs text-[#9CA6BC] mt-0.5">
                    {getL10n('Denna åtgärd går inte att ångra.', 'This action cannot be undone.')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between text-xs">
                <span className="font-semibold text-white truncate max-w-[180px]">
                  {merchantName}
                </span>
                <span className="font-amount font-bold text-rose-500 tabular-nums">
                  {formatAmount(finalAmount, config?.language || 'sv')} {config?.currency || 'kr'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setIsOpen(false);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-all cursor-pointer active:scale-95"
                >
                  {getL10n('Avbryt', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirm}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{getL10n('Ta bort', 'Delete')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
