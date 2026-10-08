import React from 'react';
import { CategoryIcon } from './CategoryIcon';
import { Language, TranslationKey } from '../i18n';
import { formatAmount, capitalize, formatDeductionDayDisplay } from '../utils/format';
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

export function BudgetItem({ item, onClick, currency, type = 'expense', language, t, config, currentPeriodId, isGrouped }: BudgetItemProps) {
  const isFixed = Boolean(item.frequency || item.deductionDay); 
  const isSaving = !isFixed && type === 'expense' && !('category' in item);
  
  const displayName = item.name || (isFixed ? item.category : t('savings' as any));

  const hasOverride = Boolean(item.isVariable && currentPeriodId && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined);
  const rawAmount = hasOverride ? item.periodOverrides[currentPeriodId] : (item.amount || 0);
  
  const displayAmount = rawAmount;

  // Format deduction info for right side under amount
  const dayString = item.deductionDay ? formatDeductionDayDisplay(item.deductionDay, language, true) : '';
  const paymentString = item.paymentMethod ? (typeof item.paymentMethod === 'string' ? item.paymentMethod : item.paymentMethod?.name) : '';
  
  const matchedPaymentMethod = React.useMemo(() => {
    if (!paymentString) return null;
    const pMethods = config?.paymentMethods && config.paymentMethods.length > 0 ? config.paymentMethods : DEFAULT_PAYMENT_METHODS;
    let found = pMethods.find((pm: any) => {
      const pmName = typeof pm === 'string' ? pm : pm?.name;
      return (pmName || '').trim().toLowerCase() === paymentString.trim().toLowerCase();
    });
    if (!found) {
      found = pMethods.find((pm: any) => {
        const pmName = typeof pm === 'string' ? pm : pm?.name;
        if (!pmName) return false;
        const normPm = pmName.trim().toLowerCase();
        const normPay = paymentString.trim().toLowerCase();
        return normPm.includes(normPay) || normPay.includes(normPm);
      });
    }
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
    : 'text-[var(--text-primary)]';

  return (
    <div 
      onClick={onClick}
      className={`px-4 py-3 sm:py-3.5 min-h-[64px] relative z-10 flex items-center gap-3 group transition-colors duration-150 bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] ${
        isGrouped ? 'rounded-none' : 'rounded-[12px]'
      } shadow-none border-none cursor-pointer select-none`}
    >
      {/* Logo */}
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
      
      {/* Main Content: 2 clean aligned rows */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        {/* Row 1: Title & Price in line, title stretches all the way */}
        <div className="flex items-baseline justify-between gap-2.5 min-w-0">
          <p 
            className="text-[14px] font-medium text-[var(--text-primary)] leading-snug break-words tracking-tight flex-1 min-w-0"
            title={displayName}
          >
            {displayName}
          </p>
          <div className="flex-shrink-0 whitespace-nowrap pl-1 text-right">
            {(() => {
              let freqSuffix = '';
              if (type === 'expense' && item.frequency) {
                const freq = item.frequency;
                if (freq === 'Månadsvis' || freq === 'MONTHLY' || freq === Frequency.MONTHLY) {
                  freqSuffix = language === 'en' ? '/mo' : '/mån';
                } else if (freq === 'Kvartalsvis' || freq === 'QUARTERLY' || freq === Frequency.QUARTERLY) {
                  freqSuffix = language === 'en' ? '/quarter' : '/kvartal';
                } else if (freq === 'Halvårsvis' || freq === 'SEMI_ANNUALLY' || freq === Frequency.SEMI_ANNUALLY) {
                  freqSuffix = language === 'en' ? '/half-year' : '/halvår';
                } else if (freq === 'Årsvis' || freq === 'ANNUALLY' || freq === Frequency.ANNUALLY) {
                  freqSuffix = language === 'en' ? '/yr' : '/år';
                }
              }
              return (
                <p className={`text-[14px] font-normal whitespace-nowrap tracking-tight ${amountColor}`}>
                  <span className="opacity-75 mr-0.5">{type === 'income' ? '+' : '−'}</span>
                  <span className="font-amount tabular-nums font-normal tracking-tight">{formatAmount(Math.round(displayAmount), language)}</span>
                  <span className="text-[11px] font-normal opacity-75 ml-[2px]">{currency}{freqSuffix}</span>
                </p>
              );
            })()}
          </div>
        </div>

        {/* Row 2: Category & Status (left) & Payment Method / Deduction Day (right) */}
        <div className="flex items-center justify-between gap-2 min-w-0 text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-1">
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
                <span className="text-[11px] font-normal text-[#777168] dark:text-[#A8A8A8] tracking-tight whitespace-nowrap truncate max-w-[140px] sm:max-w-[220px]">
                  {capitalize(item.category || '')}
                </span>
              </div>
            )}

            {item.isCancelled && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                {language === 'en' ? 'Cancelled' : 'Uppsagd'}
              </span>
            )}
          </div>

          {/* Right side: deduction day and payment method combined into a single pill */}
          {(dayString || paymentString) && (
            <div className="flex items-center shrink-0 justify-end max-w-[65%] overflow-hidden">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border border-black/5 dark:border-white/10 shrink-0 select-none truncate tabular-nums">
                {paymentString ? (
                  <CategoryIcon icon={pmIconKey} size="2xs" className="shrink-0" />
                ) : (
                  <Calendar size={10.5} strokeWidth={2} className="opacity-70 shrink-0" />
                )}
                <span className="truncate">
                  {dayString && paymentString 
                    ? `${dayString} · ${matchedPaymentMethod?.name || paymentString}` 
                    : (dayString || matchedPaymentMethod?.name || paymentString)}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
