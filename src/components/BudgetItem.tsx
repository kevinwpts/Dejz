import React from 'react';
import { motion } from 'motion/react';

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

export function BudgetItem({ item, onClick, currency, type = 'expense', language, t, config, currentPeriodId, isGrouped }: BudgetItemProps) {
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
    <motion.div 
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`px-3.5 sm:px-4.5 py-3 sm:py-3.5 min-h-[72px] rounded-[16px] flex items-center justify-between gap-2.5 sm:gap-3 group transition-all duration-200 ${
        isGrouped 
          ? 'bg-transparent' 
          : 'bg-[var(--transaction-bg)] shadow-xs border border-[var(--border-color)]'
      } hover:bg-[var(--surface-muted)] cursor-pointer active:scale-[0.99]`}
    >
      {/* Left side: Logo + Name + Category badge */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        <div className="relative flex-shrink-0">
          <BudgetItemLogo item={item} type={type} config={config} />
          {item.isVariable && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[var(--accent-color)] rounded-full flex items-center justify-center shadow-sm">
              <span className="text-[7.5px] font-bold text-[var(--text-on-accent)]">{t('variableShort' as any)}</span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p 
            className="text-[14px] sm:text-[14.5px] font-semibold text-[var(--text-primary)] leading-tight truncate tracking-tight transition-colors group-hover:text-[var(--accent-color)]"
            title={displayName}
          >
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-1 min-w-0 overflow-hidden">
            {!isSaving && item.category && (
              <div className="inline-flex items-center gap-1 px-2 h-[20px] rounded-full bg-[var(--chip-bg)] shrink-0 max-w-full border-none">
                {(() => {
                  const searchCategory = (item.category || '').trim().toLowerCase();
                  const category = [...(config?.categories || []), ...(config?.incomeCategories || [])].find(
                    c => c.name.trim().toLowerCase() === searchCategory
                  );
                  const iconKey = category?.icon;
                  const color = category?.color;
                  if (iconKey) {
                    return (
                      <CategoryIcon 
                        icon={iconKey} 
                        color={color} 
                        size="xs" 
                      />
                    );
                  }
                  if (color) {
                    return (
                      <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                        style={{ backgroundColor: color }} 
                      />
                    );
                  }
                  return null;
                })()}
                <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-90 tracking-tight whitespace-nowrap truncate max-w-[130px] sm:max-w-[180px]">
                  {capitalize(item.category || '')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side: Amount + Deduction metadata badge */}
      <div className="flex flex-col items-end justify-center shrink-0 max-w-[46%] sm:max-w-[42%] text-right pl-1">
        <p className={`text-[14.5px] sm:text-[15px] font-bold whitespace-nowrap tracking-tight ${type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'}`}>
          <span className="opacity-70 mr-0.5 text-[13px] font-bold">{type === 'income' ? '+' : '-'}</span>
          <span className="font-amount tabular-nums font-bold tracking-tight">{formatAmount(currentAmount, language)}</span>
          <span className="text-[11px] font-semibold opacity-60 ml-1">{currency}</span>
        </p>

        {/* Right-aligned deduction metadata badge under the amount */}
        <div className="flex items-center gap-1 mt-0.5 justify-end max-w-full overflow-hidden">
          {(dayString || paymentString) && (
            <span className="inline-flex items-center gap-1 px-2 h-[19px] rounded-full bg-[var(--chip-bg)] text-[10px] sm:text-[10.5px] font-medium text-[var(--text-secondary)] opacity-85 tracking-tight border border-[var(--border-color)]/20 max-w-full truncate">
              {dayString && <span className="font-semibold text-[var(--text-primary)]/90 shrink-0">{dayString}</span>}
              {dayString && paymentString && <span className="opacity-60 text-[9px] font-normal shrink-0">via</span>}
              {paymentString && <span className="truncate max-w-[70px] sm:max-w-[100px]">{paymentString}</span>}
            </span>
          )}

          {(hasOverride || item.isVariable) && (
            <span className="text-[9px] font-medium text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-1.5 h-[19px] inline-flex items-center rounded-full whitespace-nowrap shrink-0">
              {hasOverride ? t('thisPeriod' as any) : t('variable' as any)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
