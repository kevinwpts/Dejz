import React, { useState, useEffect } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { getLogoUrl, getFallbackLogoUrl, sanitizeLogoUrl } from '../utils/logo';
import { CategoryIcon, resolveCategoryColor } from './CategoryIcon';
import { SwishLogo } from './SwishLogo';

interface ItemLogoProps {
  name: string;
  category?: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
    sm: 'w-8 h-8 rounded-[11px]',
    md: 'w-10 h-10 rounded-[13px]',
    lg: 'w-11 h-11 rounded-[14px]',
    xl: 'w-14 h-14 rounded-[18px]',
  }[size];

  const iconSize = {
    sm: 16,
    md: 19,
    lg: 22,
    xl: 26,
  }[size];

  const badgeSizeClasses = {
    sm: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
    md: 'w-4 h-4 -bottom-1 -right-1',
    lg: 'w-[18px] h-[18px] -bottom-1 -right-1',
    xl: 'w-5 h-5 -bottom-1 -right-1',
  }[size];

  const badgeIconSize = {
    sm: 8,
    md: 9,
    lg: 10,
    xl: 11,
  }[size];

  const tintColor = resolveCategoryColor(category || name);

  const renderInnerContent = () => {
    if (isSwish) {
      return (
        <div
          className={`${sizeClasses} bg-white border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0`}
          title="Swish"
        >
          <SwishLogo className="w-[66%] h-[66%] object-contain" />
        </div>
      );
    }

    if (currentSrc && !imgFailed) {
      const isFullBleedTile =
        currentSrc.includes('img.logo.dev/') ||
        currentSrc.startsWith('data:image/jpeg') ||
        (currentSrc.startsWith('data:image/svg+xml') && currentSrc.includes('viewBox=%270%200%20120%20120%27')) ||
        (currentSrc.startsWith('data:image/svg+xml') && currentSrc.includes("viewBox='0 0 120 120'"));
      return (
        <div
          className={`${sizeClasses} ${
            isFullBleedTile ? 'bg-[#121519]' : 'bg-white'
          } border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0`}
        >
          <img
            src={currentSrc}
            alt={name}
            onError={handleError}
            className={
              isFullBleedTile
                ? 'w-full h-full object-cover'
                : 'w-[68%] h-[68%] object-contain'
            }
            loading="lazy"
          />
        </div>
      );
    }

    return (
      <div
        className={`${sizeClasses} border border-transparent flex items-center justify-center shrink-0`}
        style={{
          backgroundColor: `${tintColor}18`,
          color: tintColor,
        }}
      >
        <CategoryIcon category={category || name} size={iconSize} color={tintColor} />
      </div>
    );
  };

  if (!isRecurring) {
    return renderInnerContent();
  }

  return (
    <div className="relative shrink-0 inline-flex">
      {renderInnerContent()}
      <span
        title="Fast / återkommande"
        className={`absolute ${badgeSizeClasses} rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] ring-2 ring-[var(--surface-color)] flex items-center justify-center pointer-events-none z-10`}
      >
        <ArrowsClockwise size={badgeIconSize} weight="bold" />
      </span>
    </div>
  );
};
