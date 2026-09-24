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

  return (
    <motion.div 
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`px-[18px] py-[15px] min-h-[78px] rounded-[16px] flex items-center justify-between gap-[12px] group transition-all duration-200 ${
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
          <p className="text-[14px] sm:text-[14.5px] font-semibold text-[var(--text-primary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis tracking-tight transition-colors group-hover:text-[var(--accent-color)]">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden">
            {!isSaving && (
              <div className="flex items-center gap-1 px-2 h-[22px] rounded-full bg-[var(--chip-bg)] shrink-0 max-w-[85%] border-none">
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
                <span className="text-[12px] font-medium text-[var(--text-secondary)] opacity-90 tracking-tight whitespace-nowrap">
                  {capitalize(item.category || '')}
                </span>
              </div>
            )}
            {isFixed && (
              <div className="flex items-center gap-1 px-2 h-[22px] rounded-full bg-[var(--chip-bg)] shrink-0 max-w-[85%] border-none">
                <span className="text-[10px] font-medium text-[var(--text-secondary)] opacity-70 tracking-tight whitespace-nowrap">
                  {item.deductionDay ? `Dras ${item.deductionDay}e` : '-'} via {item.paymentMethod || '-'}
                </span>
              </div>
            )}
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
