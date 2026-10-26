import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Coffee,
  Car,
  House,
  FilmSlate,
  ShoppingBag,
  Heartbeat,
  ShieldCheck,
  Receipt,
  CreditCard,
  Broadcast,
  Coins,
  Tag,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { getLogoUrl, getFallbackLogoUrl, sanitizeLogoUrl } from '../utils/logo';
import { SwishLogo } from './SwishLogo';

interface ItemLogoProps {
  name: string;
  category?: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  isRecurring?: boolean;
}

export const ItemLogo: React.FC<ItemLogoProps> = ({
  name,
  category,
  logoUrl,
  size = 'md',
  isRecurring = false,
}) => {
  const isSwish =
    (category || '').toLowerCase() === 'swish' ||
    (name || '').toLowerCase().includes('swish') ||
    Boolean(logoUrl && (logoUrl.includes('swish') || logoUrl.includes('getswish')));

  const initialSrc = sanitizeLogoUrl(logoUrl, name, category) || getLogoUrl(name, category);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(initialSrc);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const resolved = sanitizeLogoUrl(logoUrl, name, category) || getLogoUrl(name, category);
    setCurrentSrc(resolved);
    setImgFailed(false);
  }, [name, category, logoUrl]);

  const handleError = () => {
    const fallback = getFallbackLogoUrl(currentSrc, name, category);
    if (fallback && fallback !== currentSrc) {
      setCurrentSrc(fallback);
    } else {
      setImgFailed(true);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-xl',
  }[size];

  const iconSize = {
    sm: 16,
    md: 18,
    lg: 22,
  }[size];

  const renderCategoryIcon = () => {
    const cat = (category || '').toLowerCase();
    const titleLower = (name || '').toLowerCase();

    if (cat.includes('mat') || titleLower.includes('ica') || titleLower.includes('coop') || titleLower.includes('hemköp') || titleLower.includes('willys')) {
      return <ShoppingCart size={iconSize} weight="duotone" />;
    }
    if (cat.includes('fika') || cat.includes('restaurang') || titleLower.includes('kaffe') || titleLower.includes('lunch')) {
      return <Coffee size={iconSize} weight="duotone" />;
    }
    if (cat.includes('transport') || titleLower.includes('bensin') || titleLower.includes('parkering') || titleLower.includes('buss') || titleLower.includes('tåg')) {
      return <Car size={iconSize} weight="duotone" />;
    }
    if (cat.includes('boende') || titleLower.includes('hyra') || titleLower.includes('el')) {
      return <House size={iconSize} weight="duotone" />;
    }
    if (cat.includes('nöje') || titleLower.includes('bio') || titleLower.includes('spel')) {
      return <FilmSlate size={iconSize} weight="duotone" />;
    }
    if (cat.includes('shopping') || cat.includes('hem')) {
      return <ShoppingBag size={iconSize} weight="duotone" />;
    }
    if (cat.includes('hälsa') || titleLower.includes('gym') || titleLower.includes('apotek')) {
      return <Heartbeat size={iconSize} weight="duotone" />;
    }
    if (cat.includes('försäkring')) {
      return <ShieldCheck size={iconSize} weight="duotone" />;
    }
    if (cat.includes('lån') || cat.includes('kredit')) {
      return <CreditCard size={iconSize} weight="duotone" />;
    }
    if (cat.includes('abonnemang') || titleLower.includes('bredband') || titleLower.includes('mobil')) {
      return <Broadcast size={iconSize} weight="duotone" />;
    }
    if (cat.includes('lön') || cat.includes('inkomst') || cat.includes('bidrag')) {
      return <Coins size={iconSize} weight="duotone" />;
    }
    if (cat.includes('räkning')) {
      return <Receipt size={iconSize} weight="duotone" />;
    }
    if (cat.includes('swish') || titleLower.includes('swish')) {
      return <SwishLogo size={iconSize} />;
    }
    return <Tag size={iconSize} weight="duotone" />;
  };

  const badgeSizeClasses = {
    sm: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
    md: 'w-4 h-4 -bottom-1 -right-1',
    lg: 'w-4.5 h-4.5 -bottom-1 -right-1',
  }[size];

  const badgeIconSize = {
    sm: 8,
    md: 9,
    lg: 11,
  }[size];

  const ringClass = isRecurring
    ? 'ring-1.5 ring-indigo-500/40 ring-offset-1 ring-offset-[var(--surface-color)]'
    : '';

  const renderInnerContent = () => {
    if (isSwish) {
      return (
        <div
          className={`${sizeClasses} bg-white border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0 p-1.5 shadow-2xs ${ringClass}`}
          title="Swish"
        >
          <SwishLogo className="w-full h-full object-contain" />
        </div>
      );
    }

    if (currentSrc && !imgFailed) {
      return (
        <div
          className={`${sizeClasses} bg-white border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0 p-1 ${ringClass}`}
        >
          <img
            src={currentSrc}
            alt={name}
            onError={handleError}
            className="w-full h-full object-contain rounded-md"
            loading="lazy"
          />
        </div>
      );
    }

    return (
      <div
        className={`${sizeClasses} bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 ${ringClass}`}
      >
        {renderCategoryIcon()}
      </div>
    );
  };

  if (!isRecurring) {
    return renderInnerContent();
  }

  return (
    <div className="relative inline-flex shrink-0" title="Återkommande fast post">
      {renderInnerContent()}
      <span
        aria-label="Återkommande"
        className={`absolute ${badgeSizeClasses} rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center ring-2 ring-[var(--surface-color)] shadow-xs pointer-events-none`}
      >
        <ArrowsClockwise size={badgeIconSize} weight="bold" />
      </span>
    </div>
  );
};
