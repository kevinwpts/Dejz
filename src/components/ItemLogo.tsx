import React, { useState, useEffect } from 'react';
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
        currentSrc.includes('img.logo.dev/') || currentSrc.startsWith('data:image/jpeg');
      return (
        <div
          className={`${sizeClasses} bg-white border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0`}
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

  return renderInnerContent();
};
