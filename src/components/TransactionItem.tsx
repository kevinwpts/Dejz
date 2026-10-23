import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Transaction, Config } from '../types';
import { TransactionLogo } from './TransactionLogo';
import { formatAmount, capitalize, formatDeductionDayDisplay, getTransactionReceipts } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryIconName } from '../utils/icons';
import { Paperclip, Trash2, RotateCw, Clock } from 'lucide-react';
import { getCancellationBadgeText } from '../utils/cancellation';
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
  hideSign?: boolean;
  showDate?: boolean;
  isVariable?: boolean;
  compact?: boolean;
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
  isGrouped,
  variant,
  hideCategoryBadge,
  hideFixedBadge,
  hideSign,
  showDate,
  isVariable,
  compact = false,
  onToggleStar: _onToggleStar,
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

  // Determine layout style classes
  let containerClasses = "";
  let paddingClasses = compact
    ? "pl-9 sm:pl-11 pr-3.5 sm:pr-4 py-2.5 min-h-[48px]"
    : "px-3.5 sm:px-4 py-2.5 sm:py-3 min-h-[54px]";
  if (squared) {
    containerClasses = "bg-[var(--surface-color)] rounded-none shadow-none border-b border-subtle last:border-none py-3.5 px-3.5";
    paddingClasses = "";
  } else if (isGrouped) {
    containerClasses = "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-none shadow-none border-none";
  } else if (variant === 'transparent') {
    containerClasses = "bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-none shadow-none border-none transition-colors";
    paddingClasses = compact
      ? "pl-9 sm:pl-11 pr-3.5 sm:pr-4 py-2.5 min-h-[48px]"
      : "px-3.5 sm:px-4 py-2.5 sm:py-3 min-h-[54px]";
  } else if (variant === 'nested') {
    containerClasses = "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] shadow-none border-none rounded-[var(--radius-card,12px)]";
  } else {
    containerClasses = "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-[var(--radius-card,12px)] shadow-none border-none";
  }

  // Neutral discreet category display
  const renderCategoryBadge = (categoryName: string, amount?: number, extraCount?: number) => {
    const searchCat = (categoryName || '').trim().toLowerCase();
    const matchedCategory = (config?.categories || []).concat(config?.incomeCategories || []).find(
      (c) => (c?.name || '').trim().toLowerCase() === searchCat || c?.id === categoryName || (c?.id || '').toLowerCase() === searchCat
    );
    const iconKey = matchedCategory?.icon || getCategoryIconName(categoryName || '');

    return (
      <div className="flex items-center gap-1 min-w-0 text-[var(--text-secondary)]">
        {iconKey ? (
          <CategoryIcon 
            icon={iconKey} 
            categoryName={categoryName}
            variant="minimal" 
            size="2xs" 
          />
        ) : null}
        <span className={`${compact ? 'text-micro-label' : 'text-secondary'} text-[var(--text-secondary)] truncate`}>
          {capitalize(categoryName || '')}{extraCount && extraCount > 0 ? ` +${extraCount}` : ''}
          {amount !== undefined && <span className="ml-0.5 opacity-70">({formatAmount(amount, config?.language || 'sv')})</span>}
        </span>
      </div>
    );
  };

  const rawSplits = (transaction as any).splits;
  const splitsArray = Array.isArray(rawSplits)
    ? rawSplits
    : (typeof rawSplits === 'string' ? (() => { try { const p = JSON.parse(rawSplits); return Array.isArray(p) ? p : []; } catch { return []; } })() : []);
  const isSplit = splitsArray.length > 1;
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

  const dayFormatted = transaction?.deductionDay 
    ? formatDeductionDayDisplay(transaction.deductionDay, config?.language || 'sv', true)
    : '';

  const formattedDayText = dayFormatted ? dayFormatted.replace(':', '') : '';
  const fixedSubtitleRight = [methodStr, formattedDayText].filter(Boolean).join(' · ');

  // Format date or valid time for variable transactions (never show default 00:00 or 12:00 timestamps)
  const formattedDateOrTime = (() => {
    if (isFixedItem) return null;
    const ts = transaction.timestamp || transaction.createdAt || transaction.date;
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    if (showDate) {
      return d.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
    }
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hrs}:${mins}`;
    if (timeStr === '00:00' || (transaction.isBackdated && timeStr === '12:00')) return null;
    return timeStr;
  })();

  const receiptCount = getTransactionReceipts(transaction).length;

  return (
    <>
      <div className={`relative overflow-hidden ${squared || isGrouped ? '' : 'rounded-[var(--radius-card,14px)]'} select-none`}>
        {/* Swipe Left Background Action: Delete */}
        {canSwipe && (
          <motion.div 
            style={{ opacity: actionOpacity, display: actionDisplay }}
            className="absolute inset-y-0 right-0 w-[84px] bg-[var(--danger-color)] text-white flex items-center justify-center z-0 cursor-pointer"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                feedback.tap();
                setShowConfirmModal(true);
              }}
              className="w-full h-full flex flex-col items-center justify-center gap-1 text-white hover:bg-black/10 active:scale-95 transition-all cursor-pointer select-none"
              aria-label={getL10n('Ta bort', 'Delete')}
            >
              <Trash2 size={18} strokeWidth={2} />
              <span className="text-micro-label font-medium tracking-tight">
                {getL10n('Ta bort', 'Delete')}
              </span>
            </button>
          </motion.div>
        )}

        {/* Foreground Draggable Transaction Card - Unified 2-Row Structure */}
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
          className={`${paddingClasses} relative z-10 flex items-center gap-2.5 sm:gap-3 group transition-colors duration-150 ${containerClasses} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {/* Left: Proportional Uncropped Logo */}
          <div className="flex-shrink-0 relative">
            <TransactionLogo transaction={transaction} config={config} size={compact ? 'sm' : 'md'} />
          </div>
          
          {/* Right: 2-Row Content (Row 1: Name + Amount, Row 2: Secondary metadata) */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            {/* Row 1: Name on left (truncates cleanly) + Amount on right (never pushed off) */}
            <div className="flex items-baseline justify-between gap-3 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <p className={`${compact ? 'text-[13px] font-medium' : 'text-list-name'} text-[var(--text-primary)] leading-snug truncate min-w-0`}>
                  {merchantName}
                </p>
                {isFixedItem && !hideFixedBadge && (
                  <span 
                    title={getL10n(
                      'Återkommande betalning',
                      'Recurring payment',
                      'Gjentakende betaling',
                      'Tilbagevendende betaling',
                      'Toistuva maksu'
                    )}
                    className="inline-flex items-center justify-center text-[var(--text-tertiary)] shrink-0 select-none align-middle"
                  >
                    <RotateCw size={11} strokeWidth={2.2} className="shrink-0" />
                  </span>
                )}
                {(transaction as any).isPlanned && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--surface-muted)] text-[var(--text-secondary)] text-micro-label font-medium shrink-0 select-none leading-none">
                    {getL10n('Planerad', 'Planned', 'Planlagt', 'Planlagt', 'Suunniteltu')}
                  </span>
                )}
              </div>

              <p className={`${compact ? 'text-[13.5px] font-semibold font-amount tabular-nums' : 'text-list-amount'} whitespace-nowrap shrink-0 ${
                (transaction as any).isPlanned
                  ? 'text-[var(--text-secondary)]'
                  : transaction.type === 'income'
                  ? 'text-[var(--success-color)]'
                  : 'text-[var(--text-primary)]'
              }`}>
                {hideSign ? (
                  isVariableItem ? <span className="opacity-70 mr-0.5">~</span> : null
                ) : transaction.type !== 'saving' && transaction.type !== 'savings' ? (
                  <span className="opacity-80 mr-0.5">{transaction.type === 'income' ? '+' : '−'}</span>
                ) : null}
                <span className="tabular-nums">{formatAmount(finalAmount, config?.language || 'sv')}</span>
                <span className="text-unit text-[var(--text-secondary)] font-normal ml-1">
                  {config?.currency || 'kr'}
                  {transaction.frequency ? (
                    <span className="text-micro-label text-[var(--text-tertiary)] ml-0.5">
                      {transaction.frequency === 'Månadsvis' || transaction.frequency === 'MONTHLY' ? (config?.language === 'en' ? '/mo' : '/mån') :
                      transaction.frequency === 'Kvartalsvis' || transaction.frequency === 'QUARTERLY' ? (config?.language === 'en' ? '/quarter' : '/kvartal') :
                      transaction.frequency === 'Halvårsvis' || transaction.frequency === 'SEMI_ANNUALLY' ? (config?.language === 'en' ? '/half-year' : '/halvår') :
                      transaction.frequency === 'Årsvis' || transaction.frequency === 'ANNUALLY' ? (config?.language === 'en' ? '/yr' : '/år') : (config?.language === 'en' ? '/mo' : '/mån')}
                    </span>
                  ) : ''}
                </span>
              </p>
            </div>
            
            {/* Row 2: Secondary information (Category / Date / Payment Method) */}
            <div className="mt-0.5 flex items-center justify-between gap-2 min-w-0 w-full">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 text-[var(--text-secondary)] overflow-hidden">
                {(transaction as any).isCancelled && (
                  <span className="inline-flex items-center gap-1 text-micro-label font-medium text-[var(--text-secondary)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full shrink-0 select-none">
                    <Clock size={10} strokeWidth={2} />
                    <span>{getCancellationBadgeText(transaction as any, config?.language)}</span>
                  </span>
                )}
                {hideCategoryBadge ? (
                  isFixedItem ? (
                    <span className={`${compact ? 'text-micro-label' : 'text-secondary'} text-[var(--text-secondary)] truncate tabular-nums`}>
                      {fixedSubtitleRight || getL10n('Fast utgift', 'Fixed expense')}
                    </span>
                  ) : formattedDateOrTime ? (
                    <span className={`${compact ? 'text-micro-label' : 'text-secondary'} text-[var(--text-secondary)] truncate tabular-nums`}>
                      {formattedDateOrTime}
                    </span>
                  ) : null
                ) : showAllCategories && isSplit ? (
                  splitsArray.map((split: any, idx: number) => (
                    <React.Fragment key={idx}>
                      {renderCategoryBadge(split.category, split.amount)}
                    </React.Fragment>
                  ))
                ) : isSplit ? (
                  renderCategoryBadge(splitsArray[0]?.category || transaction.category, undefined, splitsArray.length - 1)
                ) : (
                  renderCategoryBadge(transaction.category)
                )}

                {receiptCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[var(--text-tertiary)] shrink-0">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    {receiptCount > 1 && (
                      <span className="text-[10px] font-medium tabular-nums leading-none">
                        {receiptCount}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Right secondary info (only when category badge is shown on the left so info is never duplicated) */}
              {!hideCategoryBadge && (
                !isFixedItem ? (
                  formattedDateOrTime ? (
                    <span className={`${compact ? 'text-micro-label' : 'text-secondary'} text-[var(--text-tertiary)] tabular-nums whitespace-nowrap shrink-0 text-right`}>
                      {formattedDateOrTime}
                    </span>
                  ) : null
                ) : (
                  (transaction.originalAmount || fixedSubtitleRight) ? (
                    <div className="flex items-center justify-end gap-1 shrink-0 whitespace-nowrap text-right">
                      {transaction.originalAmount ? (
                        <span className="text-secondary text-[var(--text-tertiary)] font-normal tabular-nums">
                          {formatAmount(transaction.originalAmount, config?.language || "sv")} {config?.currency || "kr"}
                          {transaction.frequency === "Kvartalsvis" || transaction.frequency === "QUARTERLY" ? (config?.language === "en" ? "/qtr" : "/kvartal") :
                           transaction.frequency === "Halvårsvis" || transaction.frequency === "SEMI_ANNUALLY" ? (config?.language === "en" ? "/half-yr" : "/halvår") :
                           (config?.language === "en" ? "/yr" : "/år")}
                        </span>
                      ) : null}
                      {transaction.originalAmount && fixedSubtitleRight ? (
                        <span className="text-[var(--text-tertiary)] opacity-50 text-micro-label select-none">·</span>
                      ) : null}
                      {fixedSubtitleRight ? (
                        <span className="text-secondary text-[var(--text-tertiary)] font-normal tabular-nums select-none">
                          {fixedSubtitleRight}
                        </span>
                      ) : null}
                    </div>
                  ) : null
                )
              )}
            </div>
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
