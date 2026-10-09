import React from 'react';
import { Language, TranslationKey } from '../i18n';
import { Config, Transaction } from '../types';
import { TransactionItem } from './TransactionItem';
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
  const isFixed = Boolean(item.frequency || item.deductionDay || item.isVariable);
  const displayName = item.name || (isFixed ? item.category : t('savings' as any));

  const hasOverride = Boolean(item.isVariable && currentPeriodId && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined);
  const rawAmount = hasOverride ? item.periodOverrides[currentPeriodId] : (item.amount || 0);
  const displayAmount = rawAmount;

  const tx: Transaction = {
    id: item.id,
    amount: displayAmount,
    category: item.category || (type === 'income' ? (language === 'en' ? 'Income' : 'Inkomst') : (language === 'en' ? 'Savings' : 'Sparande')),
    merchant: displayName,
    type: type === 'income' ? 'income' : 'expense',
    timestamp: Date.now(),
    logo: item.logo,
    icon: item.icon,
    paymentMethod: item.paymentMethod as any,
    deductionDay: item.deductionDay,
    frequency: item.frequency,
    isCancelled: item.isCancelled,
  };

  return (
    <TransactionItem
      transaction={tx}
      config={config || { currency, language } as any}
      isFixed={true}
      onClick={onClick}
      isGrouped={isGrouped}
      displayAmount={displayAmount}
    />
  );
}
