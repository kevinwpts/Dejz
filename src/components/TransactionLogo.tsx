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

  const containerSize =
    size === 'xl'
      ? 'w-16 h-16'
      : size === 'lg'
      ? 'w-14 h-14'
      : size === 'sm'
      ? 'w-8 h-8'
      : 'w-[42px] h-[42px]';

  const iconSize = size === 'xl' ? 32 : size === 'lg' ? 24 : size === 'sm' ? 16 : 21;

  if (visual.logoUrl && !imgError) {
    const bgColor = logoConfig?.backgroundColor || '#FFFFFF';

    return (
      <div
        className={`${containerSize} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-none outline-none ring-0 shadow-none transition-colors duration-200 select-none`}
        style={{ backgroundColor: bgColor }}
      >
        {/* Maximum 70% width and height, object-fit contain, strictly centered without cropping or stretching */}
        <img
          src={visual.logoUrl}
          alt={merchantName || 'Logo'}
          className="w-[70%] h-[70%] max-w-[70%] max-h-[70%] object-contain object-center border-none outline-none ring-0 select-none pointer-events-none block"
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
      className={`${containerSize} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-none outline-none ring-0 shadow-none select-none`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <IconComponent size={iconSize} strokeWidth={1.75} />
    </div>
  );
}
