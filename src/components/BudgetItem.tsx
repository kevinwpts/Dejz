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
      className="p-4 min-h-[68px] flex items-center justify-between gap-3 group transition-all duration-200 bg-white dark:bg-[#211F22] hover:bg-[#F0EEEA] dark:hover:bg-[#2A282D] rounded-[24px] shadow-none border border-[#E5E2DC] dark:border-white/[0.08] cursor-pointer"
    >
      {/* Left side: Logo + Name + Category */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex-shrink-0 w-[44px] h-[44px] rounded-full bg-[#F0EEEA] dark:bg-[#111011] border border-[#E5E2DC] dark:border-white/[0.06] flex items-center justify-center overflow-hidden">
          <BudgetItemLogo item={item} type={type} config={config} />
          {item.isVariable && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#242321] dark:bg-[#F7F5F7] border border-white dark:border-[#211F22] rounded-full flex items-center justify-center z-10 select-none">
              <span className="text-[8px] font-extrabold text-white dark:text-[#211F22] leading-none flex items-center justify-center text-center -translate-y-[0.5px]">
                {t('variableShort' as any)}
              </span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p 
            className="text-[16px] font-medium text-[#242321] dark:text-[#F7F5F7] leading-snug truncate tracking-tight"
            title={displayName}
          >
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[#716E68] dark:text-[#B3ADB7]">
            {!isSaving && item.category && (
              <div className="inline-flex items-center gap-1 shrink-0 max-w-full text-[#716E68] dark:text-[#B3ADB7]">
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
                <span className="text-[13px] font-normal tracking-tight whitespace-nowrap truncate max-w-[130px] sm:max-w-[180px] text-[#716E68] dark:text-[#B3ADB7]">
                  {capitalize(item.category || '')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side: Amount + Deduction metadata */}
      <div className="flex flex-col items-end justify-center shrink-0 max-w-[46%] sm:max-w-[42%] text-right pl-2">
        <p className="text-[16px] font-semibold whitespace-nowrap tracking-tight text-[#242321] dark:text-[#F7F5F7]">
          <span className="opacity-75 mr-0.5">{type === 'income' ? '+' : '−'}</span>
          <span className="font-amount tabular-nums font-semibold tracking-tight">{formatAmount(Math.round(displayAmount), language)}</span>
          <span className="text-[13px] font-normal text-[#716E68] dark:text-[#B3ADB7] ml-[2.5px]">{currency}</span>
        </p>

        {/* Right-aligned deduction metadata under amount */}
        <div className="flex flex-col items-end gap-0.5 mt-0.5 justify-end max-w-full overflow-hidden text-[#716E68] dark:text-[#B3ADB7]">
          {(dayString || paymentString) && (
            <span className="text-[12px] sm:text-[13px] font-normal tracking-tight truncate tabular-nums">
              {dayString && <span>{dayString}</span>}
              {dayString && paymentString && <span className="mx-1 opacity-50">·</span>}
              {paymentString && <span className="truncate max-w-[80px] sm:max-w-[120px]">{paymentString}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
