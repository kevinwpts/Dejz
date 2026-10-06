import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { Language, TranslationKey } from '../i18n';
import { formatAmount, capitalize } from '../utils/format';
import { Config, Frequency } from '../types';
import { TransactionLogo } from './TransactionLogo';
import { getCategoryIconName } from '../utils/icons';
import { Calendar } from 'lucide-react';
import { DEFAULT_PAYMENT_METHODS } from '../constants';

interface BudgetItemProps {
  item: any;
  onClick: () => void;
  currency: string;
  type?: 'income' | 'expense';
  language: Language;
  t: (key: TranslationKey) => string;
  config?: Config;
  currentPeriodId?: string;
  isGrouped?: boolean;
}

export function BudgetItemLogo({ item, type, config }: { item: any, type: 'income' | 'expense', config?: Config }) {
  const tx = {
    ...item,
    merchant: item.name || item.merchant || item.category,
    type: type,
  };
  return <TransactionLogo transaction={tx} config={config} />;
}

export function BudgetItem({ item, onClick, currency, type = 'expense', language, t, config, currentPeriodId, isGrouped: _isGrouped }: BudgetItemProps) {
  const isFixed = Boolean(item.frequency || item.deductionDay); 
  const isSaving = !isFixed && type === 'expense' && !('category' in item);
  
  const displayName = item.name || (isFixed ? item.category : t('savings' as any));

  const hasOverride = Boolean(item.isVariable && currentPeriodId && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined);
  const rawAmount = hasOverride ? item.periodOverrides[currentPeriodId] : (item.amount || 0);
  
  let displayAmount = rawAmount;
  if (item.frequency && item.frequency !== Frequency.MONTHLY) {
    if (item.frequency === Frequency.QUARTERLY) displayAmount = rawAmount / 3;
    else if (item.frequency === Frequency.SEMI_ANNUALLY) displayAmount = rawAmount / 6;
    else if (item.frequency === Frequency.ANNUALLY) displayAmount = rawAmount / 12;
  }

  // Format deduction info for right side under amount
  const isEn = language === 'en';
  const daySuffix = isEn 
    ? (item.deductionDay === 1 ? 'st' : item.deductionDay === 2 ? 'nd' : item.deductionDay === 3 ? 'rd' : 'th')
    : ':e';
  const dayString = item.deductionDay ? `${item.deductionDay}${daySuffix}` : '';
  const paymentString = item.paymentMethod ? (typeof item.paymentMethod === 'string' ? item.paymentMethod : item.paymentMethod?.name) : '';
  
  const matchedPaymentMethod = React.useMemo(() => {
    if (!paymentString) return null;
    const pMethods = config?.paymentMethods && config.paymentMethods.length > 0 ? config.paymentMethods : DEFAULT_PAYMENT_METHODS;
    const found = pMethods.find((pm: any) => {
      const pmName = typeof pm === 'string' ? pm : pm?.name;
      return (pmName || '').trim().toLowerCase() === paymentString.trim().toLowerCase();
    });
    if (found) {
      if (typeof found === 'string') {
        const defaultFound = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === (found as string).toLowerCase());
        return defaultFound || { name: found, icon: 'credit-card' };
      }
      return found;
    }
    const defaultFound = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === paymentString.toLowerCase());
    return defaultFound || { name: paymentString, icon: 'credit-card' };
  }, [paymentString, config?.paymentMethods]);

  const pmIconKey = matchedPaymentMethod?.icon || 'credit-card';

  const amountColor = type === 'income' 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : 'text-[#777168] dark:text-[#A8A8A8]';

  return (
    <div 
      onClick={onClick}
      className="px-4 py-3.5 sm:py-4 min-h-[68px] relative z-10 flex items-center justify-between gap-3 group transition-colors duration-150 bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-[12px] shadow-none border-none cursor-pointer select-none"
    >
      {/* Left side: Logo + Name + Category / Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex-shrink-0">
          <BudgetItemLogo item={item} type={type} config={config} />
          {item.isVariable && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-color)] border-none rounded-full flex items-center justify-center z-10 select-none">
              <span className="text-[8px] font-extrabold text-[var(--on-accent)] leading-none flex items-center justify-center text-center -translate-y-[0.5px]">
                {t('variableShort' as any)}
              </span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p 
            className="text-[14px] font-medium text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight"
            title={displayName}
          >
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[var(--text-secondary)]">
            {!isSaving && item.category && (
              <div className="flex items-center gap-1 shrink-0 text-[var(--text-secondary)]">
                {(() => {
                  const searchCategory = (item.category || '').trim().toLowerCase();
                  const category = [...(config?.categories || []), ...(config?.incomeCategories || [])].find(
                    c => (c?.name || '').trim().toLowerCase() === searchCategory
                  );
                  const iconKey = category?.icon || getCategoryIconName(item.category);
                  if (iconKey) {
                    return (
                      <CategoryIcon 
                        icon={iconKey} 
                        color="currentColor" 
                        size="2xs" 
                      />
                    );
                  }
                  return null;
                })()}
                <span className="text-[11px] font-normal text-[#777168] dark:text-[#A8A8A8] tracking-tight whitespace-nowrap truncate max-w-[130px] sm:max-w-[180px]">
                  {capitalize(item.category || '')}
                </span>
              </div>
            )}

            {item.note && (
              <span className="text-[11px] font-normal text-[#777168] dark:text-[#A8A8A8] truncate min-w-0 flex-1">
                • {item.note}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side: Amount + Deduction metadata */}
      <div className="flex flex-col items-end justify-center flex-shrink-0 whitespace-nowrap pl-2">
        <p className={`text-[12px] font-medium whitespace-nowrap tracking-tight ${amountColor}`}>
          <span className="opacity-75 mr-0.5">{type === 'income' ? '+' : '−'}</span>
          <span className="font-amount tabular-nums font-medium tracking-tight">{formatAmount(Math.round(displayAmount), language)}</span>
          <span className="text-[10px] font-normal text-[#777168] dark:text-[#A8A8A8] ml-[2px]">{currency}</span>
        </p>

        {/* Right-aligned deduction metadata micro-badges */}
        {(dayString || paymentString) && (
          <div className="flex items-center gap-1 mt-1 justify-end max-w-full overflow-hidden">
            {dayString && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border border-black/5 dark:border-white/10 shrink-0 select-none tabular-nums">
                <Calendar size={10} strokeWidth={2} className="opacity-70 shrink-0" />
                <span>{dayString}</span>
              </span>
            )}
            {paymentString && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border border-black/5 dark:border-white/10 shrink-0 select-none truncate max-w-[90px] sm:max-w-[120px]">
                <CategoryIcon icon={pmIconKey} size="2xs" className="shrink-0" />
                <span className="truncate">{paymentString}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
