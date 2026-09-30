import React, { useState, useEffect } from 'react';
import { Transaction, Config } from '../types';
import { resolveEntityVisual } from '../utils/resolver';
import { Receipt } from 'lucide-react';

export function TransactionLogo({ transaction, config, size = 'md' }: { transaction: Transaction, config?: Config, size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [transaction.logo, transaction.icon, transaction.merchant, transaction.note, transaction.category]);

  const containerSize = size === 'lg' ? 'w-16 h-16 rounded-full' : size === 'sm' ? 'w-10 h-10 rounded-full' : 'w-[42px] h-[42px] rounded-full';
  const iconSize = size === 'lg' ? 28 : size === 'sm' ? 17 : 20;

  const visual = resolveEntityVisual(transaction, config);

  if (visual.logoUrl && !imgError) {
    return (
      <div className={`${containerSize} bg-white flex items-center justify-center overflow-hidden flex-shrink-0`}>
        <img 
          src={visual.logoUrl} 
          alt={transaction.merchant || 'Logo'} 
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  const IconComponent = visual.iconComponent || Receipt;
  const bgColor = visual.backgroundColor || '#6E6961';
  const textColor = visual.textColor || '#ffffff';

  return (
    <div 
      className={`${containerSize} flex items-center justify-center overflow-hidden flex-shrink-0`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <IconComponent size={iconSize} strokeWidth={1.75} />
    </div>
  );
}
