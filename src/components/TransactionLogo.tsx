import React, { useState, useEffect } from 'react';
import { Transaction, Config } from '../types';
import { resolveEntityVisual } from '../utils/resolver';
import { analyzeLogoBackground, LogoVisualConfig } from '../utils/logoVisuals';
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
  const [logoConfig, setLogoConfig] = useState<LogoVisualConfig | null>(null);

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
    if (visual.logoUrl) {
      analyzeLogoBackground(visual.logoUrl, merchantName).then((cfg) => {
        setLogoConfig(cfg);
      });
    } else {
      setLogoConfig(null);
    }
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
      container: 'w-16 h-16 rounded-[20px]',
      icon: 32,
      innerImg: 'w-[75%] h-[75%] rounded-[10px]',
    },
    lg: {
      container: 'w-14 h-14 rounded-[16px]',
      icon: 26,
      innerImg: 'w-[75%] h-[75%] rounded-[8px]',
    },
    md: {
      container: 'w-[42px] h-[42px] rounded-[13px]',
      icon: 21,
      innerImg: 'w-[76%] h-[76%] rounded-[6px]',
    },
    sm: {
      container: 'w-8 h-8 rounded-[9px]',
      icon: 16,
      innerImg: 'w-[76%] h-[76%] rounded-[4px]',
    },
  }[size] || {
    container: 'w-[42px] h-[42px] rounded-[13px]',
    icon: 21,
    innerImg: 'w-[76%] h-[76%] rounded-[6px]',
  };

  if (visual.logoUrl && !imgError) {
    const bgColor = logoConfig?.backgroundColor || '#FFFFFF';
    const isTransparent = logoConfig?.isTransparent;

    return (
      <div
        className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 border border-black/[0.04] dark:border-white/[0.06] shadow-2xs transition-colors duration-200 select-none`}
        style={{ backgroundColor: bgColor }}
      >
        <img
          src={visual.logoUrl}
          alt={merchantName || 'Logo'}
          className={
            isTransparent
              ? "w-[85%] h-[85%] object-contain object-center select-none pointer-events-none block"
              : "w-full h-full object-cover object-center select-none pointer-events-none block"
          }
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    );
  }

  const IconComponent = visual.iconComponent || Receipt;
  const bgColor = visual.backgroundColor || '#6E6961';
  const textColor = visual.textColor || '#ffffff';

  return (
    <div
      className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 border border-black/[0.04] dark:border-white/[0.06] shadow-2xs select-none`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <IconComponent size={sizeConfig.icon} strokeWidth={1.8} />
    </div>
  );
}
