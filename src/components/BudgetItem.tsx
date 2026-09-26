import React from 'react';

import { CategoryIcon } from './CategoryIcon';
import { Language, TranslationKey } from '../i18n';
import { formatAmount, capitalize } from '../utils/format';
import { Config } from '../types';
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
  const currentAmount = hasOverride ? item.periodOverrides[currentPeriodId] : (item.amount || 0);

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
      className="px-3.5 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3 group transition-colors hover:bg-white/[0.03] cursor-pointer"
    >
      {/* Left side: Logo + Name + Category */}
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
        <div className="relative flex-shrink-0">
          <BudgetItemLogo item={item} type={type} config={config} />
          {item.isVariable && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#818cf8] rounded-full flex items-center justify-center shadow-sm">
              <span className="text-[7.5px] font-bold text-white">{t('variableShort' as any)}</span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p 
            className="text-[14px] sm:text-[14.5px] font-medium text-white leading-tight truncate tracking-tight group-hover:text-white"
            title={displayName}
          >
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-1 min-w-0 overflow-hidden text-[#9CA6BC]">
            {!isSaving && item.category && (
              <div className="inline-flex items-center gap-1 shrink-0 max-w-full text-[#9CA6BC]">
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
                        color="#9CA6BC" 
                        size="xs" 
                      />
                    );
                  }
                  return null;
                })()}
                <span className="text-xs font-normal text-[#9CA6BC] tracking-tight whitespace-nowrap truncate max-w-[130px] sm:max-w-[180px]">
                  {capitalize(item.category || '')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side: Amount + Deduction metadata */}
      <div className="flex flex-col items-end justify-center shrink-0 max-w-[46%] sm:max-w-[42%] text-right pl-1">
        <p className={`text-[14px] sm:text-[14.5px] font-semibold whitespace-nowrap tracking-tight ${type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
          <span className="opacity-75 mr-0.5 text-[13px] font-semibold">{type === 'income' ? '+' : '−'}</span>
          <span className="font-amount tabular-nums font-semibold tracking-tight">{formatAmount(currentAmount, language)}</span>
          <span className="text-[12px] font-normal text-[#9CA6BC] ml-1">{currency}</span>
        </p>

        {/* Right-aligned deduction metadata under amount */}
        <div className="flex items-center gap-1 mt-0.5 justify-end max-w-full overflow-hidden text-[#9CA6BC]">
          {(dayString || paymentString) && (
            <span className="text-[11px] font-normal text-[#9CA6BC] tracking-tight truncate">
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
