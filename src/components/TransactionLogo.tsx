import React, { useState, useEffect } from 'react';
import { Transaction, Config } from '../types';
import { resolveEntityVisual } from '../utils/resolver';
import { fetchLogoForName } from '../utils/logo';
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
  const [asyncLogoUrl, setAsyncLogoUrl] = useState<string | null>(null);

  const merchantName =
    typeof transaction.merchant === 'object'
      ? (transaction.merchant as any)?.name
      : transaction.merchant ||
        transaction.note ||
        (typeof transaction.category === 'object'
          ? (transaction.category as any)?.name
          : transaction.category);

  const visual = resolveEntityVisual(transaction, config);
  const rawExplicitLogo = (transaction.logo && transaction.logo !== 'none') ? transaction.logo : undefined;
  const directLogoUrl = (rawExplicitLogo && !rawExplicitLogo.includes('google.com/s2/favicons')) 
    ? rawExplicitLogo 
    : (visual.logoUrl || rawExplicitLogo);

  useEffect(() => {
    setImgError(false);
    let active = true;

    if (!directLogoUrl && merchantName && merchantName.length >= 2) {
      fetchLogoForName(merchantName).then(url => {
        if (active && url) {
          setAsyncLogoUrl(url);
        }
      });
    } else {
      setAsyncLogoUrl(null);
    }

    return () => { active = false; };
  }, [directLogoUrl, merchantName]);

  const activeLogoUrl = directLogoUrl || asyncLogoUrl;

  const handleImageError = () => {
    if (activeLogoUrl && !activeLogoUrl.includes('google.com/s2/favicons')) {
      const knownDomain = merchantName ? findKnownBrandDomain(merchantName) : undefined;
      if (knownDomain) {
        const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128`;
        if (activeLogoUrl !== fallbackFavicon) {
          setAsyncLogoUrl(fallbackFavicon);
          return;
        }
      }
    }
    setImgError(true);
  };

  const sizeConfig = {
    xl: {
      container: 'w-16 h-16 rounded-[14px]',
      icon: 30,
    },
    lg: {
      container: 'w-14 h-14 rounded-[14px]',
      icon: 26,
    },
    md: {
      container: 'w-[42px] h-[42px] rounded-[12px]',
      icon: 20,
    },
    sm: {
      container: 'w-8 h-8 rounded-[12px]',
      icon: 15,
    },
  }[size] || {
    container: 'w-[42px] h-[42px] rounded-[12px]',
    icon: 20,
  };

  // If there's an official logo and no load error (Klarna / Apple Pay squircle app icon style)
  if (activeLogoUrl && !imgError) {
    return (
      <div
        className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 bg-white dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs select-none`}
      >
        <img
          src={activeLogoUrl}
          alt={merchantName || 'Logo'}
          className="w-full h-full object-cover object-center select-none pointer-events-none block"
          onError={handleImageError}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback Category / Default Icon (same uniform squircle shape)
  const IconComponent = visual.iconComponent || Receipt;
  const bgColor = visual.backgroundColor || '#6E6961';
  const textColor = visual.textColor || '#ffffff';

  return (
    <div
      className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs select-none`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <IconComponent size={sizeConfig.icon} strokeWidth={2} />
    </div>
  );
}
