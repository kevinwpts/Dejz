import React, { useState, useEffect } from 'react';
import { Transaction, Config } from '../types';
import { resolveEntityVisual } from '../utils/resolver';
import { fetchLogoForName, findKnownBrandDomain } from '../utils/logo';
import { Receipt } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

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

    const hasExplicitIcon = Boolean(transaction.icon && transaction.icon !== 'none' && transaction.icon !== 'receipt' && transaction.icon !== '🧾');
    const isBrand = Boolean(findKnownBrandDomain(merchantName));

    if (!directLogoUrl && !hasExplicitIcon && isBrand && merchantName && merchantName.trim().length >= 2) {
      fetchLogoForName(merchantName).then(url => {
        if (active && url) {
          setAsyncLogoUrl(url);
        }
      });
    } else {
      setAsyncLogoUrl(null);
    }

    return () => { active = false; };
  }, [directLogoUrl, merchantName, transaction.id, transaction.icon]);

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
      container: 'w-16 h-16 rounded-full',
      icon: 30,
    },
    lg: {
      container: 'w-14 h-14 rounded-full',
      icon: 26,
    },
    md: {
      container: 'w-[42px] h-[42px] rounded-full',
      icon: 20,
    },
    sm: {
      container: 'w-8 h-8 rounded-full',
      icon: 15,
    },
  }[size] || {
    container: 'w-[42px] h-[42px] rounded-full',
    icon: 20,
  };

  // If this is an empty new transaction waiting for input, render a clean neutral placeholder
  if (visual.source === 'neutral_placeholder') {
    const IconComponent = visual.iconComponent || Receipt;
    return (
      <div
        className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] select-none`}
      >
        <IconComponent size={sizeConfig.icon} strokeWidth={2} />
      </div>
    );
  }

  // If there's an official logo and no load error (Klarna / Apple Pay squircle app icon style)
  if (activeLogoUrl && !imgError) {
    return (
      <div
        className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 bg-white dark:bg-white/5 select-none`}
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

  // Fallback Category / Default Icon (with Icons8 Color support)
  const categoryIconKey = (visual as any).categoryIcon || (visual as any).iconKey;
  const rawCatName = (visual as any).categoryName || transaction.category;
  const categoryName = typeof rawCatName === 'object' ? (rawCatName as any)?.name : (rawCatName || '');

  if (categoryIconKey || categoryName) {
    return (
      <CategoryIcon
        icon={categoryIconKey}
        color={visual.backgroundColor}
        categoryName={categoryName}
        size={size}
      />
    );
  }

  const IconComponent = visual.iconComponent || Receipt;
  const bgColor = visual.backgroundColor;
  const textColor = visual.textColor;

  return (
    <div
      className={`${sizeConfig.container} flex items-center justify-center overflow-hidden flex-shrink-0 select-none ${!bgColor ? "bg-[var(--surface-muted)] text-[var(--text-primary)]" : ""}`}
      style={bgColor ? { backgroundColor: bgColor, color: textColor } : undefined}
    >
      <IconComponent size={sizeConfig.icon} strokeWidth={2} />
    </div>
  );
}
