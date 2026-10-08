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
      : (transaction.merchant || transaction.note || '');

  const visual = resolveEntityVisual(transaction, config);
  const rawExplicitLogo = (transaction.logo && transaction.logo !== 'none') ? transaction.logo : undefined;
  const directLogoUrl = (rawExplicitLogo && !rawExplicitLogo.includes('google.com/s2/favicons')) 
    ? rawExplicitLogo 
    : (visual.logoUrl || rawExplicitLogo);

  useEffect(() => {
    setImgError(false);
    let active = true;

    if (transaction.id === 'preview') {
      setAsyncLogoUrl(null);
      return;
    }

    if (!directLogoUrl && merchantName && merchantName.trim().length >= 2) {
      fetchLogoForName(merchantName).then(url => {
        if (active && url) {
          setAsyncLogoUrl(url);
        }
      });
    } else {
      setAsyncLogoUrl(null);
    }

    return () => { active = false; };
  }, [directLogoUrl, merchantName, transaction.id]);

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
      container: 'w-16 h-16 rounded-[10px]',
      icon: 30,
    },
    lg: {
      container: 'w-14 h-14 rounded-[10px]',
      icon: 26,
    },
    md: {
      container: 'w-[42px] h-[42px] rounded-[8px]',
      icon: 20,
    },
    sm: {
      container: 'w-8 h-8 rounded-[6px]',
      icon: 15,
    },
  }[size] || {
    container: 'w-[42px] h-[42px] rounded-[8px]',
    icon: 20,
  };

  // If this is an empty new transaction waiting for input, render a clean neutral placeholder
  if (visual.source === 'neutral_placeholder') {
    const IconComponent = visual.iconComponent || Receipt;
    return (
      <div
        className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs select-none`}
      >
        <IconComponent size={sizeConfig.icon} strokeWidth={2} />
      </div>
    );
  }

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
