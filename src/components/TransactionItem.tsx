import React from 'react';
import { motion } from 'motion/react';
import { Transaction, Config } from '../types';
import { TransactionLogo } from './TransactionLogo';
import { formatAmount, capitalize } from '../utils/format';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryIconName } from '../utils/icons';
import { Paperclip } from 'lucide-react';

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
  
  const amountColor = transaction.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400';

  // Determine actual layout style classes based on variants & props
  let containerClasses = "";
  let paddingClasses = "px-[16px] py-[12px] min-h-[72px]";
  if (squared) {
    containerClasses = "bg-transparent rounded-none shadow-none border-b border-[var(--border-color)]/20 last:border-none py-2 px-1";
    paddingClasses = "";
  } else if (variant === 'transparent') {
    containerClasses = "bg-transparent hover:bg-[var(--surface-muted)]/60 rounded-none first:rounded-t-[20px] last:rounded-b-[20px] shadow-none border-none";
  } else if (variant === 'nested') {
    containerClasses = "bg-[var(--card-nested-bg)] hover:bg-[var(--card-nested-bg)]/85 shadow-none border border-[var(--border-color)]/10 rounded-[16px]";
  } else {
    // Default individual transaction card look
    const isTransparentGrouped = isGrouped && !variant;
    if (isTransparentGrouped) {
      containerClasses = "bg-transparent hover:bg-[var(--surface-muted)] rounded-[16px] shadow-none border-none";
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

  return (
    <motion.div 
      whileHover={squared ? undefined : { scale: 1.005 }}
      whileTap={squared ? undefined : { scale: 0.99 }}
      onClick={() => {
        if (onClick) {
          onClick();
        } else if (canEdit && onView) {
          onView(transaction);
        }
      }}
      className={`${paddingClasses} flex items-center justify-between gap-[12px] group transition-all duration-200 ${containerClasses} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-[12px] min-w-0 flex-1">
        <div className="flex-shrink-0">
          <TransactionLogo transaction={transaction} config={config} />
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight transition-colors group-hover:text-[var(--accent-color)]">
            {isFixed ? (transaction.name || transaction.merchant || transaction.category) : (transaction.merchant || transaction.category)}
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
  );
}
