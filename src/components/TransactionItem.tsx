import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Transaction, Config } from '../types';
import { TransactionLogo } from './TransactionLogo';
import { formatAmount, capitalize } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryIconName } from '../utils/icons';
import { Paperclip, Trash2, RotateCw, Heart } from 'lucide-react';
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
  hideFixedBadge?: boolean;
  showDate?: boolean;
  isVariable?: boolean;
  onToggleStar?: (transaction: Transaction) => void;
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
  hideFixedBadge,
  showDate,
  isVariable,
  onToggleStar: _onToggleStar,
}: TransactionItemProps) {
  const transaction = originalTransaction as any;
  const isStarred = Boolean(transaction.isStarred || (transaction.tags && Array.isArray(transaction.tags) && transaction.tags.includes('starred')));
  const isFixedItem = Boolean(
    isFixed || 
    transaction?.isFixed || 
    transaction?.is_fixed || 
    transaction?.isFixedExpense || 
    transaction?.fixed_expense_id || 
    (typeof transaction?.id === 'string' && transaction.id.startsWith('fixed-'))
  );
  const isVariableItem = Boolean(
    isVariable ??
    transaction?.isVariable ??
    transaction?.is_variable
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
    ? 'text-[var(--success-color)]' 
    : 'text-[var(--text-metric-label)]';

  // Determine layout style classes with translucent glass surfaces
  let containerClasses = "";
  let paddingClasses = "px-4 py-3 sm:py-3.5 min-h-[56px]";
  if (squared) {
    containerClasses = "bg-[var(--surface-color)] rounded-none shadow-none border-b border-subtle last:border-none py-4 px-3";
    paddingClasses = "";
  } else if (variant === 'transparent') {
    containerClasses = "bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-none shadow-none border-none transition-colors";
    paddingClasses = "px-4 py-3.5 sm:py-4 min-h-[60px]";
  } else if (variant === 'nested') {
    containerClasses = "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] shadow-none border-none rounded-[var(--radius-card,12px)]";
  } else {
    containerClasses = "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-[var(--radius-card,12px)] shadow-none border-none";
  }

  // Neutral discreet category display
  const renderCategoryBadge = (categoryName: string, amount?: number) => {
    const searchCat = (categoryName || '').trim().toLowerCase();
    const matchedCategory = (config?.categories || []).concat(config?.incomeCategories || []).find(
      (c) => (c?.name || '').trim().toLowerCase() === searchCat || c?.id === categoryName || (c?.id || '').toLowerCase() === searchCat
    );
    const iconKey = matchedCategory?.icon || getCategoryIconName(categoryName || '');

    return (
      <div className="flex items-end gap-1 shrink-0 text-[var(--text-secondary)]">
        {iconKey ? (
          <CategoryIcon 
            icon={iconKey} 
            categoryName={categoryName}
            variant="minimal" 
            size="2xs" 
          />
        ) : null}
        <span className="text-secondary text-[var(--text-secondary)] whitespace-nowrap">
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

  const methodRaw = typeof transaction?.paymentMethod === 'object'
    ? (transaction.paymentMethod as any)?.name
    : (typeof transaction?.paymentMethod === 'string' ? transaction.paymentMethod : '');

  const methodStr = methodRaw ? capitalize(methodRaw.trim()) : '';

  const dayStr = transaction?.deductionDay 
    ? `${transaction.deductionDay}${config?.language === 'en' ? 'th' : ':e'}`
    : '';

  let fixedBadgeLabel = '';
  if (dayStr && methodStr) {
    fixedBadgeLabel = `${dayStr} (${methodStr})`;
  } else if (dayStr) {
    fixedBadgeLabel = dayStr;
  } else if (methodStr) {
    fixedBadgeLabel = methodStr;
  }

  return (
    <>
      <div className={`relative overflow-hidden ${squared ? '' : 'rounded-[var(--radius-card,14px)]'} select-none`}>
        {/* Swipe Left Background Action: Delete */}
        {canSwipe && (
          <motion.div 
            style={{ opacity: actionOpacity, display: actionDisplay }}
            className="absolute inset-y-0 right-0 w-[84px] bg-[var(--surface-muted)] text-[var(--text-primary)] text-white flex items-center justify-center z-0 cursor-pointer"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                feedback.tap();
                setShowConfirmModal(true);
              }}
              className="w-full h-full flex flex-col items-center justify-center gap-1 text-white hover:bg-[var(--surface-hover)] active:scale-95 transition-all cursor-pointer select-none"
              aria-label={getL10n('Ta bort', 'Delete')}
            >
              <Trash2 size={19} strokeWidth={2} />
              <span className="text-micro-label font-medium tracking-tight">
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
            {/* Real Logo in original color with floating Variable 'R' badge */}
            <div className="flex-shrink-0 relative">
              <TransactionLogo transaction={transaction} config={config} />
              {isVariableItem && (
                <span
                  title={getL10n(
                    'Varierande belopp',
                    'Variable amount',
                    'Varierende beløp',
                    'Varierende beløb',
                    'Vaihteleva summa'
                  )}
                  className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-micro-label font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--surface-color)] shadow-xs pointer-events-none z-20 select-none font-sans"
                >
                  R
                </span>
              )}
            </div>
            
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              {/* Primary Merchant Name + Fixed Icon Badge */}
              <div className="flex items-center min-w-0">
                <p className="text-body-medium font-medium text-[var(--text-primary)] leading-snug truncate flex-1 min-w-0 flex items-center">
                  <span className="truncate">{merchantName}</span>
                  {isStarred && (
                    <span title={getL10n('Hjärtmarkerad', 'Starred')} className="inline-flex items-center ml-1.5 shrink-0 text-rose-500">
                      <Heart size={13} className="fill-rose-500 text-rose-500" />
                    </span>
                  )}
                  {isFixedItem && !hideFixedBadge && (
                    <span 
                      title={getL10n(
                        transaction.type === 'income' ? 'Fast inkomst' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fast sparande' : 'Fast utgift',
                        transaction.type === 'income' ? 'Fixed income' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fixed savings' : 'Fixed expense',
                        transaction.type === 'income' ? 'Fast inntekt' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fast sparing' : 'Fast utgift',
                        transaction.type === 'income' ? 'Fast indkomst' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Fast opsparing' : 'Fast udgift',
                        transaction.type === 'income' ? 'Kiinteä tulo' : (transaction.type === 'saving' || transaction.type === 'savings') ? 'Kiinteä säästö' : 'Kiinteä kulu'
                      )}
                      className="inline-flex items-center justify-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[var(--text-tertiary)] border border-subtle shrink-0 select-none align-middle ml-1.5 -translate-y-[1px]"
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
                    <span className="text-secondary text-[var(--text-tertiary)] tabular-nums">
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
          
          {/* Primary Amount */}
          <div className="flex flex-col items-end justify-center flex-shrink-0 whitespace-nowrap pl-1">
            <p className={`text-list-amount whitespace-nowrap ${transaction.type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'}`}>
              <span className="opacity-80 mr-0.5">{transaction.type === 'income' ? '+' : '−'}</span>
              <span className="tabular-nums">{formatAmount(finalAmount, config?.language || 'sv')}</span>
              <span className="text-secondary opacity-80 font-normal ml-1">
                {config?.currency || 'kr'}
                {transaction.frequency ? (
                  <span className="text-micro-label opacity-70 ml-0.5">
                    {transaction.originalAmount ? (config?.language === 'en' ? '/mo' : '/mån') :
                    transaction.frequency === 'Månadsvis' || transaction.frequency === 'MONTHLY' ? (config?.language === 'en' ? '/mo' : '/mån') :
                    transaction.frequency === 'Kvartalsvis' || transaction.frequency === 'QUARTERLY' ? (config?.language === 'en' ? '/quarter' : '/kvartal') :
                    transaction.frequency === 'Halvårsvis' || transaction.frequency === 'SEMI_ANNUALLY' ? (config?.language === 'en' ? '/half-year' : '/halvår') :
                    transaction.frequency === 'Årsvis' || transaction.frequency === 'ANNUALLY' ? (config?.language === 'en' ? '/yr' : '/år') : ''}
                  </span>
                ) : ''}
              </span>
            </p>
            {(transaction.timestamp || transaction.date) && !isFixedItem ? (
              <p className="text-secondary text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                {showDate 
                  ? new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })
                  : new Date(transaction.timestamp || transaction.date).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : isFixedItem && (
              <div className="mt-1 flex items-center justify-end gap-1 flex-wrap">
                {transaction.originalAmount ? (
                  <span className="text-secondary text-[var(--text-tertiary)] font-normal mr-0.5 tabular-nums">
                    {formatAmount(transaction.originalAmount, config?.language || "sv")} {config?.currency || "kr"}
                    {transaction.frequency === "Kvartalsvis" || transaction.frequency === "QUARTERLY" ? (config?.language === "en" ? "/qtr" : "/kvartal") :
                     transaction.frequency === "Halvårsvis" || transaction.frequency === "SEMI_ANNUALLY" ? (config?.language === "en" ? "/half-yr" : "/halvår") :
                     (config?.language === "en" ? "/yr" : "/år")}
                  </span>
                ) : null}
                {fixedBadgeLabel ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-micro-label font-medium bg-black/[0.04] dark:bg-white/[0.08] text-[var(--text-secondary)] border border-[var(--border-subtle)] select-none leading-none tracking-tight">
                    {fixedBadgeLabel}
                  </span>
                ) : (transaction.timestamp || transaction.date) ? (
                  <span className="text-secondary text-[var(--text-tertiary)] tabular-nums">
                    {new Date(transaction.timestamp || transaction.date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
                  </span>
                ) : null}
              </div>
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
