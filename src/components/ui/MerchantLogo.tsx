import React from 'react';
import { TransactionLogo } from '../TransactionLogo';
import { Transaction, Config } from '../../types';

export interface MerchantLogoProps {
  transaction: Transaction;
  config?: Config;
  size?: 'sm' | 'md' | 'lg';
}

export function MerchantLogo({ transaction, config, size = 'md' }: MerchantLogoProps) {
  return <TransactionLogo transaction={transaction} config={config} size={size} />;
}
