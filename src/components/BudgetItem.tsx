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
  const isFixed = (type === 'expense' || type === 'income') && 'frequency' in item && item.frequency; 
  const isSaving = !isFixed && type === 'expense' && !('category' in item);
  
  const displayName = item.name || (isFixed ? item.category : t('savings' as any));

  const hasOverride = Boolean(item.isVariable && currentPeriodId && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined);
  const currentAmount = hasOverride ? item.periodOverrides[currentPeriodId] : (item.amount || 0);

  // Format deduction day (e.g., 20e, 1a, 21a in Swedish, or 20th in English)
  const formatDeductionDay = (day: number | string | undefined, lang: string) => {
    if (day === undefined || day === null || day === '') return null;
    const num = Number(day);
    if (isNaN(num) || num < 1 || num > 31) return null;
    
    if (lang === 'en') {
      const j = num % 10, k = num % 100;
      if (j === 1 && k !== 11) return `${num}st`;
      if (j === 2 && k !== 12) return `${num}nd`;
      if (j === 3 && k !== 13) return `${num}rd`;
      return `${num}th`;
    }
    
    // Swedish convention: 1a, 2a, 3e, ... 20e, 21a, 22a, 31a
    const lastDigit = num % 10;
    const lastTwo = num % 100;
    const suffix = (lastDigit === 1 || lastDigit === 2) && lastTwo !== 11 && lastTwo !== 12 ? 'a' : 'e';
    return `${num}${suffix}`;
  };

  const currentLang = language || config?.language || 'sv';
  const deductionDayStr = formatDeductionDay(item.deductionDay, currentLang);
  const paymentMethod = item.paymentMethod ? String(item.paymentMethod).trim() : null;

  let paymentInfo = '';
  if (deductionDayStr && paymentMethod) {
    paymentInfo = `${deductionDayStr} via ${paymentMethod}`;
  } else if (deductionDayStr) {
    if (type === 'income') {
      paymentInfo = currentLang === 'en' ? `Arrives on the ${deductionDayStr}` : `Kommer den ${deductionDayStr}`;
    } else {
      paymentInfo = currentLang === 'en' ? `Charged on the ${deductionDayStr}` : `Dras den ${deductionDayStr}`;
    }
  } else if (paymentMethod) {
    paymentInfo = `via ${paymentMethod}`;
  }

  const searchCategory = (item.category || '').trim().toLowerCase();
  const categoryObj = [...(config?.categories || []), ...(config?.incomeCategories || [])].find(
    c => c.name.trim().toLowerCase() === searchCategory
  );
  const iconKey = categoryObj?.icon;
  const color = categoryObj?.color;
  const categoryName = item.category ? capitalize(item.category) : '';
  const shouldShowCategory = !isSaving && item.category && item.category.trim().toLowerCase() !== displayName.trim().toLowerCase();

  return (
    <motion.div 
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`px-[14px] py-[10px] min-h-[64px] rounded-[16px] flex items-center justify-between gap-[12px] group transition-all duration-200 ${
        isGrouped 
          ? 'bg-transparent' 
          : 'bg-[var(--transaction-bg)] shadow-xs border border-[var(--border-color)]'
      } hover:bg-[var(--surface-muted)] cursor-pointer active:scale-[0.99]`}
    >
      <div className="flex items-center gap-[12px] min-w-0 flex-1">
        <div className="relative flex-shrink-0">
          <BudgetItemLogo item={item} type={type} config={config} />
          {item.isVariable && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[var(--accent-color)] rounded-full flex items-center justify-center shadow-sm">
              <span className="text-[7.5px] font-bold text-[var(--text-on-accent)]">{t('variableShort' as any)}</span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight transition-colors group-hover:text-[var(--accent-color)]">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden">
            {paymentInfo ? (
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden text-[12px] text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-secondary)] opacity-90 whitespace-nowrap shrink-0">
                  {paymentInfo}
                </span>
                {shouldShowCategory && (
                  <>
                    <span className="opacity-35 shrink-0">•</span>
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      {color && (
                        <span 
                          className="w-1.5 h-1.5 rounded-full shrink-0" 
                          style={{ backgroundColor: color }} 
                        />
                      )}
                      <span className="opacity-75 truncate">
                        {categoryName}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : !isSaving && item.category ? (
              <div className="flex items-center gap-1 px-2 h-[22px] rounded-full bg-[var(--chip-bg)] shrink-0 max-w-[85%] border-none">
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
                <span className="text-[12px] font-medium text-[var(--text-secondary)] opacity-90 tracking-tight whitespace-nowrap">
                  {categoryName}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end justify-center flex-shrink-0 whitespace-nowrap pl-2">
        <p className={`text-[14.5px] sm:text-[15px] font-bold whitespace-nowrap tracking-tight ${type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'}`}>
          <span className="opacity-70 mr-0.5 text-[13px] font-bold">{type === 'income' ? '+' : '-'}</span>
          <span className="font-amount tabular-nums font-bold tracking-tight">{formatAmount(currentAmount, language)}</span>
          <span className="text-[11px] font-semibold opacity-60 ml-1">{currency}</span>
        </p>
        {(hasOverride || item.isVariable) && (
          <span className="text-[10px] font-medium text-[var(--accent-color)] bg-[var(--accent-color)]/10 px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap">
            {hasOverride ? t('thisPeriod' as any) : t('variable' as any)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
