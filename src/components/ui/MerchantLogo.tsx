import React from 'react';
import { Transaction, Config } from '../../types';

export interface MerchantLogoProps {
  transaction: Transaction;
  config?: Config;
  size?: 'sm' | 'md' | 'lg';
}

export function MerchantLogo({ transaction, size = 'md' }: MerchantLogoProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  const letter = (transaction.merchant || transaction.category || 'T').charAt(0).toUpperCase();

  return (
    <div
      className={`${sizeClasses} rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center font-bold text-[var(--text-primary)]`}
    >
      {letter}
    </div>
  );
}
