import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { BottomSheet } from './ui';

import { BudgetItemLogo } from './BudgetItem';
import { Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { useScrollLock } from '../hooks/useScrollLock';
import { Button } from './ui';

interface VariableAmountUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onSave: (amount: number) => void;
  config: Config;
  t: (key: TranslationKey) => string;
  periodName?: string;
}

export function VariableAmountUpdateModal({
  isOpen,
  onClose,
  item,
  onSave,
  config,
  t,
  periodName: _periodName
}: VariableAmountUpdateModalProps) {
  const [amount, setAmount] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen && item) {
      setAmount('');
    }
  }, [isOpen, item]);

  if (!item) return null;

  const handleSave = () => {
    const numValue = parseAmount(amount);
    const finalAmount = amount.trim() === '' ? Number(item.amount || 0) : numValue;
    onSave(finalAmount);
    onClose();
  };

  const defaultAmountText = formatAmount(item.amount || 0);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      headerLeading={
        <BudgetItemLogo item={item} type={item.budgetType === 'income' ? 'income' : 'expense'} config={config} />
      }
      size="sm"
      zIndex={110}
      footer={
        <Button
          type="button"
          onClick={handleSave}
          variant="primary"
          fullWidth
          size="lg"
        >
          {t('save')}
        </Button>
      }
    >


      <div className="px-5 py-5">
        <div
          onClick={() => inputRef.current?.focus()}
          className="p-4 sm:p-5 rounded-card bg-[var(--surface-color)] cursor-text"
        >
          <span className="text-label font-medium text-[var(--text-tertiary)] block mb-1">
            {config?.language === 'en' ? 'Amount this period' : 'Belopp denna period'}
          </span>
          <div className="flex items-baseline gap-2 font-amount w-full">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(formatAmount(e.target.value))}
              onBlur={() => setAmount(evaluateAndFormatAmount(amount))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setAmount(evaluateAndFormatAmount(amount));
                  handleSave();
                }
              }}
              placeholder={defaultAmountText}
              className="bg-transparent outline-none font-amount font-bold tabular-nums tracking-tight placeholder:font-normal placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)] text-[34px] sm:text-[40px] w-full leading-none shrink min-w-[60px]"
            />
            <span className="text-lg font-medium text-[var(--text-tertiary)] select-none shrink-0 font-sans ml-1 pb-1">
              {config?.currency || 'kr'}
            </span>
          </div>
        </div>
      </div>

    </BottomSheet>
  );
}

