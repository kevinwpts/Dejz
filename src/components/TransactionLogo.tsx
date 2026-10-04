import React, { useState, useEffect } from 'react';
import { Transaction, Config } from '../types';
import { resolveEntityVisual } from '../utils/resolver';
import { Receipt } from 'lucide-react';

export function TransactionLogo({
  transaction,
  config,
  size = 'md',
}: {
  transaction: Transaction;
  config?: Config;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [imgError, setImgError] = useState(false);

  const merchantName =
    typeof transaction.merchant === 'object'
      ? (transaction.merchant as any)?.name
      : transaction.merchant ||
        transaction.note ||
        (typeof transaction.category === 'object'
          ? (transaction.category as any)?.name
          : transaction.category);

  const visual = resolveEntityVisual(transaction, config);

  useEffect(() => {
    setImgError(false);
  }, [
    visual.logoUrl,
    transaction.logo,
    transaction.icon,
    transaction.merchant,
    transaction.note,
    transaction.category,
    merchantName,
  ]);

  const sizeConfig = {
    xl: {
      container: 'w-16 h-16',
      icon: 30,
      padding: 'p-3',
    },
    lg: {
      container: 'w-14 h-14',
      icon: 26,
      padding: 'p-2.5',
    },
    md: {
      container: 'w-[42px] h-[42px]',
      icon: 20,
      padding: 'p-2',
    },
    sm: {
      container: 'w-8 h-8',
      icon: 15,
      padding: 'p-1.5',
    },
  }[size] || {
    container: 'w-[42px] h-[42px]',
    icon: 20,
    padding: 'p-2',
  };

  // If there's an official logo and no load error (standard Revolut / Apple Pay / Monzo style)
  if (visual.logoUrl && !imgError) {
    return (
      <div
        className={`${sizeConfig.container} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-white dark:bg-[#242424] border border-black/[0.08] dark:border-white/[0.1] shadow-2xs select-none`}
      >
        <img
          src={visual.logoUrl}
          alt={merchantName || 'Logo'}
          className={`w-full h-full object-contain ${sizeConfig.padding} object-center select-none pointer-events-none block`}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback Category / Default Icon
  const IconComponent = visual.iconComponent || Receipt;
  const bgColor = visual.backgroundColor || '#6E6961';
  const textColor = visual.textColor || '#ffffff';

  return (
    <div
      className={`${sizeConfig.container} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs select-none`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <IconComponent size={sizeConfig.icon} strokeWidth={1.8} />
    </div>
  );
}
