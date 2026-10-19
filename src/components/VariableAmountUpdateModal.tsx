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
          icon={<Check size={18} strokeWidth={2} />}
        >
          {t('save')}
        </Button>
      }
    >


            <div className="px-6 py-6 space-y-4">
              {/* Amount Input */}
              <div className="relative group overflow-hidden rounded-[var(--radius-input,14px)]">
                <input
                  ref={inputRef}
                  type="text"
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
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-primary)] px-6 py-6 rounded-[var(--radius-input,14px)] transition-all outline-none font-amount text-4xl sm:text-5xl font-bold tracking-tighter text-center pr-20 focus:border-[var(--accent-color)]"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="text-label font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-full">
                    {config.currency || 'kr'}
                  </span>
                </div>
              </div>
            </div>

    </BottomSheet>
  );
}

