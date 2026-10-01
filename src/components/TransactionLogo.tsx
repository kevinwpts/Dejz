import React, { useState, useEffect } from 'react';
import { Transaction, Config } from '../types';
import { resolveEntityVisual } from '../utils/resolver';
import { Receipt } from 'lucide-react';

export function TransactionLogo({ transaction, config, size = 'md' }: { transaction: Transaction, config?: Config, size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [transaction.logo, transaction.icon, transaction.merchant, transaction.note, transaction.category]);

  const containerSize = size === 'xl' ? 'w-16 h-16 rounded-full' : size === 'lg' ? 'w-14 h-14 rounded-full' : size === 'sm' ? 'w-8 h-8 rounded-full' : 'w-[42px] h-[42px] rounded-full';
  const iconSize = size === 'xl' ? 32 : size === 'lg' ? 24 : size === 'sm' ? 16 : 21;

  const visual = resolveEntityVisual(transaction, config);

  if (visual.logoUrl && !imgError) {
    return (
      <div className={`${containerSize} bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border-none outline-none ring-0 shadow-none`}>
        <img 
          src={visual.logoUrl} 
          alt={transaction.merchant || 'Logo'} 
          className="w-full h-full object-cover rounded-full border-none outline-none ring-0"
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
      className={`${containerSize} flex items-center justify-center overflow-hidden flex-shrink-0 border-none outline-none ring-0 shadow-none`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <IconComponent size={iconSize} strokeWidth={1.75} />
    </div>
  );
}
