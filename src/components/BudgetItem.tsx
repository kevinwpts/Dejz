import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { Language, TranslationKey } from '../i18n';
import { formatAmount, capitalize } from '../utils/format';
import { Config, Frequency } from '../types';
import { TransactionLogo } from './TransactionLogo';

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

  return (
    <div 
      onClick={onClick}
      className="px-3.5 sm:px-4 py-3 sm:py-3.5 min-h-[66px] flex items-center justify-between gap-3 group transition-colors bg-white dark:bg-[#333333] hover:bg-black/[0.02] dark:hover:bg-[#3a3a3a] rounded-[20px] shadow-none border-none cursor-pointer"
    >
      {/* Left side: Logo + Name + Category */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex-shrink-0">
          <BudgetItemLogo item={item} type={type} config={config} />
          {item.isVariable && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#1C1917] dark:bg-white border border-white dark:border-[#242424] rounded-full flex items-center justify-center z-10 select-none">
              <span className="text-[8px] font-extrabold text-white dark:text-[#1C1917] leading-none flex items-center justify-center text-center -translate-y-[0.5px]">
                {t('variableShort' as any)}
              </span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p 
            className="text-[14px] font-medium text-[#211F1C] dark:text-white leading-snug truncate tracking-tight"
            title={displayName}
          >
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[#6D6962] dark:text-[#A8A8A8]">
            {!isSaving && item.category && (
              <div className="inline-flex items-center gap-1 shrink-0 max-w-full text-[#6D6962] dark:text-[#A8A8A8]">
                {(() => {
                  const searchCategory = (item.category || '').trim().toLowerCase();
                  const category = [...(config?.categories || []), ...(config?.incomeCategories || [])].find(
                    c => c.name.trim().toLowerCase() === searchCategory
                  );
                  const iconKey = category?.icon;
                  if (iconKey) {
                    return (
                      <CategoryIcon 
                        icon={iconKey} 
                        color="currentColor" 
                        size="xs" 
                      />
                    );
                  }
                  return null;
                })()}
                <span className="text-[12px] font-normal tracking-tight whitespace-nowrap truncate max-w-[130px] sm:max-w-[180px] text-[#6D6962] dark:text-[#A8A8A8]">
                  {capitalize(item.category || '')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side: Amount + Deduction metadata */}
      <div className="flex flex-col items-end justify-center shrink-0 max-w-[46%] sm:max-w-[42%] text-right pl-2">
        <p className="text-[14px] font-medium whitespace-nowrap tracking-tight text-[#211F1C] dark:text-white">
          <span className="opacity-75 mr-0.5">{type === 'income' ? '+' : '−'}</span>
          <span className="font-amount tabular-nums font-medium tracking-tight">{formatAmount(Math.round(displayAmount), language)}</span>
          <span className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8] ml-[2.5px]">{currency}</span>
        </p>

        {/* Right-aligned deduction metadata under amount */}
        <div className="flex flex-col items-end gap-0.5 mt-0.5 justify-end max-w-full overflow-hidden text-[#777168] dark:text-[#71717A]">
          {(dayString || paymentString) && (
            <span className="text-[11.5px] font-normal tracking-tight truncate tabular-nums">
              {dayString && <span>{dayString}</span>}
              {dayString && paymentString && <span className="mx-1 opacity-50">·</span>}
              {paymentString && <span className="truncate max-w-[70px] sm:max-w-[100px]">{paymentString}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
