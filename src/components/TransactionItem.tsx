import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Transaction, Config } from '../types';
import { TransactionLogo } from './TransactionLogo';
import { formatAmount, capitalize } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryIconName } from '../utils/icons';
import { Paperclip, Trash2, RotateCw } from 'lucide-react';
import { feedback } from '../utils/feedback';
import { useScrollLock } from '../hooks/useScrollLock';
import { ConfirmModal } from './ConfirmModal';

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
  isGrouped: _isGrouped,
  variant,
  hideCategoryBadge,
  showDate
}: TransactionItemProps) {
  const transaction = originalTransaction as any;
  const isFixedItem = Boolean(
    isFixed || 
    transaction?.isFixed || 
    transaction?.is_fixed || 
    transaction?.isFixedExpense || 
    transaction?.fixed_expense_id || 
    (typeof transaction?.id === 'string' && transaction.id.startsWith('fixed-'))
  );
  const canEdit = Boolean(onView);
  const isClickable = Boolean(onClick || onView);
  const canSwipe = Boolean(onDelete && !isFixedItem);

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  useScrollLock(showConfirmModal);

  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-84, -36, -6, 0], [1, 0.9, 0, 0]);
  const actionDisplay = useTransform(x, (val) => (val < -4 ? 'flex' : 'none'));

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
  const _amountColor = transaction.type === 'income' 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : 'text-[#4A453F] dark:text-[#D1D1D6]';

  // Determine layout style classes with translucent glass surfaces
  let containerClasses = "";
  let paddingClasses = "px-4 py-3.5 sm:py-4 min-h-[68px]";
  if (squared) {
    containerClasses = "bg-[var(--surface-color)] rounded-none shadow-none border-b border-black/5 dark:border-white/[0.06] last:border-none py-3.5 px-2";
    paddingClasses = "";
  } else if (variant === 'transparent') {
    containerClasses = "bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-none shadow-none border-none transition-colors";
    paddingClasses = "px-4 py-2.5 sm:py-3 min-h-[52px]";
  } else if (variant === 'nested') {
    containerClasses = "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] shadow-none border-none rounded-[12px]";
  } else {
    containerClasses = "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-[12px] shadow-none border-none";
  }

  // Neutral discreet category display
  const renderCategoryBadge = (categoryName: string, amount?: number) => {
    const iconKey = getCategoryIconName(categoryName || '');

    return (
      <div className="flex items-center gap-1 shrink-0 text-[#777168] dark:text-[#A8A8A8]">
        {iconKey ? (
          <CategoryIcon 
            icon={iconKey} 
            variant="minimal" 
            size="2xs" 
          />
        ) : null}
        <span className="text-[11px] font-normal text-[#777168] dark:text-[#A8A8A8] tracking-tight whitespace-nowrap">
          {capitalize(categoryName || '')}
          {amount !== undefined && <span className="ml-0.5 opacity-70">({formatAmount(amount, config?.language || 'sv')})</span>}
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
      <div className={`relative overflow-hidden ${squared ? '' : 'rounded-[14px]'} select-none`}>
        {/* Swipe Left Background Action: Delete */}
        {canSwipe && (
          <motion.div 
            style={{ opacity: actionOpacity, display: actionDisplay }}
            className="absolute inset-y-0 right-0 w-[84px] bg-[#6E6961] dark:bg-[#4A453F] text-white flex items-center justify-center z-0 cursor-pointer"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                feedback.tap();
                setShowConfirmModal(true);
              }}
              className="w-full h-full flex flex-col items-center justify-center gap-1 text-white hover:bg-[#5C574F] active:scale-95 transition-all cursor-pointer select-none"
              aria-label={getL10n('Ta bort', 'Delete')}
            >
              <Trash2 size={19} strokeWidth={2} />
              <span className="text-[11px] font-medium tracking-tight">
                {getL10n('Ta bort', 'Delete')}
              </span>
            </button>
          </motion.div>
        )}

        {/* Foreground Draggable Transaction Card */}
        <motion.div 
          drag={canSwipe ? "x" : false}
          dragDirectionLock={true}
          dragMomentum={false}
          dragConstraints={{ left: -84, right: 0 }}
          dragElastic={0.06}
          animate={{ x: isOpen ? -84 : 0 }}
          style={{ x, touchAction: 'pan-y' }}
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
          className={`${paddingClasses} relative z-10 flex items-center justify-between gap-3 group transition-colors duration-150 ${containerClasses} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Real Logo in original color */}
            <div className="flex-shrink-0">
              <TransactionLogo transaction={transaction} config={config} />
            </div>
            
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              {/* Primary Merchant Name + Fixed Icon Badge */}
              <div className="flex items-center min-w-0">
                <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug break-words tracking-tight flex-1 min-w-0">
                  <span>{merchantName}</span>
                  {isFixedItem && (
                    <span 
                      title={getL10n(
                        transaction.type === 'income' ? 'Fast inkomst' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fast sparande' : 'Fast utgift',
                        transaction.type === 'income' ? 'Fixed income' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fixed savings' : 'Fixed expense',
                        transaction.type === 'income' ? 'Fast inntekt' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fast sparing' : 'Fast utgift',
                        transaction.type === 'income' ? 'Fast indkomst' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fast opsparing' : 'Fast udgift',
                        transaction.type === 'income' ? 'Kiinteä tulo' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Kiinteä säästö' : 'Kiinteä kulu'
                      )}
                      className="inline-flex items-center justify-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[var(--text-tertiary)] border border-black/5 dark:border-white/10 shrink-0 select-none align-middle ml-1.5 -translate-y-[1px]"
                    >
                      <RotateCw size={9.5} strokeWidth={2.4} className="shrink-0" />
                    </span>
                  )}
                </p>
              </div>
              
              {/* Secondary Details: smaller category icon & text */}
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[var(--text-secondary)] flex-wrap">
                {hideCategoryBadge ? (
                  (transaction.timestamp || transaction.date) ? (
                    <span className="text-[11px] font-normal text-[var(--text-tertiary)] tabular-nums">
                      {new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
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

                {transaction.receiptUrl && (
                  <Paperclip className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                )}
              </div>
            </div>
          </div>
          
          {/* Primary Amount: matching title size and color, normal weight */}
          <div className="flex flex-col items-end justify-center flex-shrink-0 whitespace-nowrap pl-2">
            <p className={`text-[14px] font-normal whitespace-nowrap tracking-tight ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'}`}>
              <span className="opacity-75 mr-0.5">{transaction.type === 'income' ? '+' : '−'}</span>
              <span className="font-amount tabular-nums font-normal tracking-tight">{formatAmount(finalAmount, config?.language || 'sv')}</span>
              <span className="text-[11px] font-normal opacity-75 ml-[2px]">{config?.currency || 'kr'}</span>
            </p>
            {(transaction.timestamp || transaction.date) && !isFixedItem ? (
              <p className="text-[9.5px] font-normal text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                {showDate 
                  ? new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
                  : new Date(transaction.timestamp || transaction.date).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : isFixedItem && (
              <span className="text-[9.5px] font-normal text-[#777168] dark:text-[#71717A] mt-0.5 whitespace-nowrap tabular-nums">
                {transaction.deductionDay 
                  ? `${transaction.deductionDay}${config?.language === 'en' ? 'th' : ':e'}`
                  : (transaction.timestamp || transaction.date) 
                    ? new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
                    : ''}
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal before Delete */}
      {showConfirmModal && (
        <ConfirmModal
          isOpen={showConfirmModal}
          title={config?.language === 'en' ? 'Delete transaction?' : 'Radera transaktion?'}
          message={
            config?.language === 'en'
              ? `Do you want to delete the transaction of ${formatAmount(finalAmount, config?.language || 'sv')} ${config?.currency || 'kr'}?`
              : `Vill du radera transaktionen på ${formatAmount(finalAmount, config?.language || 'sv')} ${config?.currency || 'kr'}?`
          }
          confirmText={config?.language === 'en' ? 'Delete' : 'Radera'}
          cancelText={config?.language === 'en' ? 'Cancel' : 'Avbryt'}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowConfirmModal(false);
            setIsOpen(false);
          }}
          variant="danger"
        />
      )}
    </>
  );
}
