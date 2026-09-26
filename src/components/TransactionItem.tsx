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

  const getL10n = (sv: string, en: string, no?: string, da?: string, fi?: string) => {
    const lang = config.language || 'sv';
    if (lang === 'sv') return sv;
    if (lang === 'no') return no || sv;
    if (lang === 'da') return da || sv;
    if (lang === 'fi') return fi || sv;
    return en;
  };

  const finalAmount = displayAmount !== undefined ? displayAmount : transaction.amount;
  const amountColor = transaction.type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]';

  // Determine layout style classes
  let containerClasses = "";
  let paddingClasses = "px-[18px] py-[15px] min-h-[78px]";
  if (squared) {
    containerClasses = "bg-transparent rounded-none shadow-none border-b border-[var(--border-color)]/20 last:border-none py-3.5 px-2";
    paddingClasses = "";
  } else if (variant === 'transparent') {
    containerClasses = "bg-[var(--surface-color)] hover:bg-[var(--surface-muted)]/60 rounded-none first:rounded-t-[20px] last:rounded-b-[20px] shadow-none border-none";
  } else if (variant === 'nested') {
    containerClasses = "bg-[var(--card-nested-bg)] hover:bg-[var(--card-nested-bg)]/85 shadow-none border border-[var(--border-color)]/10 rounded-[16px]";
  } else {
    const isTransparentGrouped = isGrouped && !variant;
    if (isTransparentGrouped) {
      containerClasses = "bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] rounded-[16px] shadow-none border-none";
    } else {
      containerClasses = "bg-[var(--transaction-bg)] shadow-xs border border-[var(--border-color)] rounded-[16px] hover:bg-[var(--surface-muted)]";
    }
  }

  const renderCategoryBadge = (categoryName: string, amount?: number) => {
    const searchCat = (categoryName || '').trim().toLowerCase();
    const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
      c => c.name.trim().toLowerCase() === searchCat
    );
    const iconKey = cat?.icon || getCategoryIconName(categoryName || '');
    const color = cat?.color;

    return (
      <div className="flex items-center gap-1 px-2 h-[22px] rounded-full bg-[var(--chip-bg)] shrink-0 border-none">
        {iconKey ? (
          <CategoryIcon 
            icon={iconKey} 
            color={color} 
            size="xs" 
          />
        ) : color ? (
          <span 
            className="w-1.5 h-1.5 rounded-full shrink-0" 
            style={{ backgroundColor: color }} 
          />
        ) : null}
        <span className="text-[12px] font-medium text-[var(--text-secondary)] tracking-tight whitespace-nowrap">
          {capitalize(categoryName || '')}
          {amount !== undefined && <span className="ml-1 opacity-60">({formatAmount(amount, config.language)})</span>}
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
      <div className={`relative overflow-hidden ${squared ? '' : 'rounded-[16px]'} select-none`}>
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
            <div className="flex-shrink-0">
              <TransactionLogo transaction={transaction} config={config} />
            </div>
            
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-[14px] sm:text-[14.5px] font-semibold text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight transition-colors group-hover:text-[var(--accent-color)]">
                {merchantName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden">
                {hideCategoryBadge ? (
                  (transaction.timestamp || transaction.date) ? (
                    <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-80 tabular-nums">
                      {new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
                    </span>
                  ) : isFixed ? (
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-80">
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
                  <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-75 truncate italic min-w-0 flex-1">
                    {hideCategoryBadge ? `• ${transaction.note}` : transaction.note}
                  </span>
                )}
                {transaction.receiptUrl && (
                  <Paperclip className="w-3 h-3 text-[var(--text-secondary)] opacity-75 shrink-0" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end justify-center flex-shrink-0 whitespace-nowrap pl-2">
            <p className={`text-[14.5px] sm:text-[15px] font-bold whitespace-nowrap tracking-tight ${amountColor}`}>
              <span className="opacity-70 mr-0.5 text-[13px] font-bold">{transaction.type === 'income' ? '+' : '-'}</span>
              <span className="font-amount tabular-nums font-bold tracking-tight">{formatAmount(finalAmount, config.language)}</span>
              <span className="text-[11px] font-semibold opacity-60 ml-1">{config.currency}</span>
            </p>
            {(transaction.timestamp || transaction.date) && !isFixed ? (
              <p className="text-[11px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5 tabular-nums">
                {showDate 
                  ? new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
                  : new Date(transaction.timestamp || transaction.date).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : isFixed && (
              <span className="text-[10px] font-medium text-[var(--text-secondary)] opacity-85 bg-white/10 dark:bg-white/[0.06] px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">
                {getL10n(
                  transaction.type === 'income' ? 'FAST INKOMST' : transaction.type === 'saving' ? 'FAST SPARANDE' : 'FAST UTGIFT',
                  transaction.type === 'income' ? 'FIXED INCOME' : transaction.type === 'saving' ? 'FIXED SAVINGS' : 'FIXED EXPENSE',
                  transaction.type === 'income' ? 'FAST INNTEKT' : transaction.type === 'saving' ? 'FAST SPARING' : 'FAST UTGIFT',
                  transaction.type === 'income' ? 'FAST INDKOMST' : transaction.type === 'saving' ? 'FAST OPSPARING' : 'FAST UDGIFT',
                  transaction.type === 'income' ? 'KIINTEÄ TULO' : transaction.type === 'saving' ? 'KIINTEÄ SÄÄSTÖ' : 'KIINTEÄ KULU'
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
              className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[24px] p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight">
                    {getL10n('Ta bort transaktion?', 'Delete transaction?')}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {getL10n('Denna åtgärd går inte att ångra.', 'This action cannot be undone.')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-muted)]/70 border border-[var(--border-color)]/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-[180px]">
                  {merchantName}
                </span>
                <span className="font-amount font-bold text-rose-500 tabular-nums">
                  {formatAmount(finalAmount, config.language)} {config.currency || 'kr'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setIsOpen(false);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]/80 border border-[var(--border-color)] transition-all cursor-pointer active:scale-95"
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
