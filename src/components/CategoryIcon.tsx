import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import { ICON_MAP, resolveLucideIcon, isEmojiString } from '../utils/icons';
import { resolveIcons8Key, getIcons8Url, getIcons8CdnUrl } from '../constants/icons8Categories';

export interface CategoryIconProps {
  icon?: string;
  color?: string;
  variant?: 'primary' | 'minimal';
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isActive?: boolean;
  categoryName?: string;
  // Backwards compatibility props
  solidBackground?: boolean;
  whiteIcon?: boolean;
  noBackground?: boolean;
}

/**
 * CategoryIcon - Renders rich Icons8 Color category illustrations.
 * 
 * - In accordance with Section 4 of user instructions:
 *   The illustrations are NOT placed on heavy, dark colored circles.
 *   Instead they render clearly and gracefully with a discreet neutral background
 *   (or none where specified), working seamlessly in Light, Dark, and Black modes.
 * - Primary variant: Soft neutral background (or light tint) with the color illustration.
 * - Minimal variant: Clean, frameless illustration.
 * - Automatic fallback between local asset -> CDN -> Lucide vector fallback.
 */
export function CategoryIcon({
  icon,
  color: _color,
  variant = 'primary',
  size = 'md',
  className = '',
  isActive = false,
  categoryName,
  solidBackground: _solidBackground,
  whiteIcon: _whiteIcon,
  noBackground = false,
}: CategoryIconProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [useCdn, setUseCdn] = useState(false);

  const isEmoji = isEmojiString(icon);
  const isMinimal = variant === 'minimal' || noBackground;

  // Resolve Icons8 Key
  const icons8Key = !isEmoji ? resolveIcons8Key(icon, categoryName) : null;

  // Container sizing
  const containerSizes: Record<string, string> = {
    '2xs': 'w-[18px] h-[18px]',
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-[38px] h-[38px] sm:w-[42px] sm:h-[42px]',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  // Icon / image pixel sizing
  const imageSizes: Record<string, number> = {
    '2xs': 14,
    xs: 18,
    sm: 24,
    md: 30,
    lg: 34,
    xl: 44,
  };

  const currentPx = imageSizes[size] || 30;

  // If emoji was explicitly chosen
  if (isEmoji) {
    if (isMinimal) {
      return (
        <span 
          className={`inline-flex items-center justify-center shrink-0 select-none leading-none ${className}`}
          style={{ fontSize: `${currentPx - 4}px` }}
          aria-hidden="true"
        >
          {icon}
        </span>
      );
    }

    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 select-none transition-transform bg-black/[0.04] dark:bg-white/[0.08] ${containerSizes[size]} ${
          isActive ? 'ring-2 ring-[var(--accent-color)] scale-105' : ''
        } ${className}`}
        aria-hidden="true"
      >
        <span 
          style={{ fontSize: `${currentPx - 4}px` }} 
          className="leading-none flex items-center justify-center"
        >
          {icon}
        </span>
      </div>
    );
  }

  // Icons8 Color Image rendering
  if (icons8Key && !loadFailed) {
    const iconUrl = useCdn ? getIcons8CdnUrl(icons8Key) : getIcons8Url(icons8Key);

    const handleImgError = () => {
      if (!useCdn) {
        // First fallback: try CDN
        setUseCdn(true);
      } else {
        // Second fallback: render Lucide vector
        setLoadFailed(true);
      }
    };

    if (isMinimal) {
      return (
        <span 
          className={`inline-flex items-center justify-center shrink-0 select-none transition-transform ${className}`}
          style={{ width: `${currentPx}px`, height: `${currentPx}px` }}
          aria-hidden="true"
        >
          <img
            src={iconUrl}
            alt={categoryName || icon || 'icon'}
            width={currentPx}
            height={currentPx}
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-2xs"
            loading="lazy"
            onError={handleImgError}
          />
        </span>
      );
    }

    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 select-none transition-transform bg-black/[0.04] dark:bg-white/[0.06] ${containerSizes[size]} ${
          isActive ? 'ring-2 ring-[var(--accent-color)] shadow-subtle scale-105' : ''
        } ${className}`}
        aria-hidden="true"
      >
        <img
          src={iconUrl}
          alt={categoryName || icon || 'icon'}
          width={currentPx}
          height={currentPx}
          className="object-contain pointer-events-none select-none drop-shadow-2xs"
          style={{
            width: `${Math.round(currentPx * 0.88)}px`,
            height: `${Math.round(currentPx * 0.88)}px`
          }}
          loading="lazy"
          onError={handleImgError}
        />
      </div>
    );
  }

  // Fallback to Lucide vector icon if image failed or couldn't resolve
  const iconKey = icon ? resolveLucideIcon(icon) : 'receipt';
  const IconComp = (iconKey && ICON_MAP[iconKey]) ? ICON_MAP[iconKey] : Tag;
  const strokeWidth = size === '2xs' || size === 'xs' ? 2.2 : 2;

  if (isMinimal) {
    return (
      <span 
        className={`inline-flex items-center justify-center shrink-0 select-none text-neutral-700 dark:text-neutral-300 transition-colors ${className}`}
        aria-hidden="true"
      >
        <IconComp size={currentPx * 0.75} strokeWidth={strokeWidth} />
      </span>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 text-[var(--text-primary)] bg-black/[0.04] dark:bg-white/[0.06] select-none transition-transform ${containerSizes[size]} ${
        isActive ? 'ring-2 ring-[var(--accent-color)] shadow-subtle scale-105' : ''
      } ${className}`}
      aria-hidden="true"
    >
      <IconComp 
        size={currentPx * 0.7} 
        strokeWidth={strokeWidth}
        className="text-[var(--text-primary)]"
      />
    </div>
  );
}
