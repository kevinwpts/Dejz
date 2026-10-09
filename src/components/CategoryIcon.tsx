import React from 'react';
import { Tag } from 'lucide-react';
import { ICON_MAP, resolveLucideIcon, isEmojiString } from '../utils/icons';

export interface CategoryIconProps {
  icon?: string;
  color?: string;
  variant?: 'primary' | 'minimal';
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isActive?: boolean;
  // Backwards compatibility props
  solidBackground?: boolean;
  whiteIcon?: boolean;
  noBackground?: boolean;
}

/**
 * Ensures category color is rich, saturated, and never washed-out/pale pastel.
 * Guarantees crisp contrast for the white icon in Primary variant across Light & Dark mode.
 */
function getRichCategoryColor(color: string | undefined): string {
  if (!color) return '#6658E8';
  let clean = color.trim();
  if (clean.startsWith('var(')) {
    return '#6658E8';
  }
  if (!clean.startsWith('#')) {
    const namedColors: Record<string, string> = {
      indigo: '#6658E8',
      purple: '#A855F7',
      blue: '#3B82F6',
      cyan: '#06B6D4',
      teal: '#14B8A6',
      green: '#10B981',
      lime: '#84CC16',
      emerald: '#10B981',
      yellow: '#EAB308',
      amber: '#F59E0B',
      orange: '#F97316',
      red: '#EF4444',
      rose: '#F43F5E',
      pink: '#EC4899',
      fuchsia: '#D946EF',
      slate: '#64748B',
      gray: '#6B7280',
    };
    return namedColors[clean.toLowerCase()] || '#6658E8';
  }

  // Parse hex
  clean = clean.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return '#6658E8';

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Ensure saturation is high (>= 70%) and lightness is deep/medium (32% - 52%)
  // to avoid pale pastel colors and ensure perfect contrast with white icon
  const hue = Math.round(h * 360);
  const saturatedS = Math.max(Math.round(s * 100), 70);
  let adjustedL = Math.round(l * 100);
  if (adjustedL > 54) {
    adjustedL = 48;
  } else if (adjustedL < 28) {
    adjustedL = 36;
  }

  return `hsl(${hue}, ${saturatedS}%, ${adjustedL}%)`;
}

export function CategoryIcon({
  icon,
  color,
  variant = 'primary',
  size = 'md',
  className = '',
  isActive = false,
  solidBackground: _solidBackground,
  whiteIcon: _whiteIcon,
  noBackground = false,
}: CategoryIconProps) {
  const iconKey = icon ? resolveLucideIcon(icon) : 'receipt';
  const IconComp = (iconKey && ICON_MAP[iconKey]) ? ICON_MAP[iconKey] : Tag;
  const isEmoji = isEmojiString(icon);

  // Determine variant (minimal if noBackground is passed or variant is minimal)
  const isMinimal = variant === 'minimal' || noBackground;

  if (isMinimal) {
    // 2. Minimal Category Icon
    // - Only a small category icon, NO background or circle
    // - Dark gray/black in Light Mode, Light gray/white in Dark Mode
    // - No category color
    // - Discreet size
    const minimalSizes = {
      '2xs': 11,
      xs: 13,
      sm: 15,
      md: 17,
      lg: 20,
      xl: 24,
    };

    const strokeWidth = size === '2xs' || size === 'xs' ? 2.2 : 2;

    return (
      <span 
        className={`inline-flex items-center justify-center shrink-0 select-none text-neutral-700 dark:text-neutral-300 transition-colors ${className}`}
        aria-hidden="true"
      >
        {isEmoji ? (
          <span style={{ fontSize: `${minimalSizes[size]}px` }} className="leading-none flex items-center justify-center">
            {icon}
          </span>
        ) : (
          <IconComp size={minimalSizes[size]} strokeWidth={strokeWidth} />
        )}
      </span>
    );
  }

  // 1. Primary Category Icon
  // - Round circle with category's own color as background
  // - Dark, saturated and clear colors (no pale pastels)
  // - White icon centered in circle
  // - Same look in Light Mode and Dark Mode
  const primaryContainerSizes = {
    '2xs': 'w-[18px] h-[18px]',
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-[34px] h-[34px] sm:w-9 sm:h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  const primaryIconSizes = {
    '2xs': 10,
    xs: 13,
    sm: 16,
    md: 19,
    lg: 22,
    xl: 28,
  };

  const strokeWidth = size === '2xs' || size === 'xs' ? 2.2 : 2;
  const richBgColor = getRichCategoryColor(color);

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 text-white select-none transition-transform ${primaryContainerSizes[size]} ${
        isActive ? 'ring-2 ring-white shadow-subtle scale-105' : ''
      } ${className}`}
      style={{ backgroundColor: richBgColor }}
      aria-hidden="true"
    >
      {isEmoji ? (
        <span 
          style={{ fontSize: `${primaryIconSizes[size] - 2}px` }} 
          className="leading-none flex items-center justify-center"
        >
          {icon}
        </span>
      ) : (
        <IconComp 
          size={primaryIconSizes[size]} 
          strokeWidth={strokeWidth}
          className="text-white"
        />
      )}
    </div>
  );
}
