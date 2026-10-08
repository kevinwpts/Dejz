import React from 'react';
import { Tag } from 'lucide-react';
import { ICON_MAP, resolveLucideIcon, isEmojiString } from '../utils/icons';

interface CategoryIconProps {
  icon?: string;
  color?: string;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isActive?: boolean;
  solidBackground?: boolean;
  whiteIcon?: boolean;
  noBackground?: boolean;
}

// Helper to convert hex color to light/dark tinted and saturated HSL variants
function getHslColors(hexColor: string | undefined) {
  let cleanHex = (hexColor || '#6366f1').trim().toLowerCase();
  
  if (cleanHex.startsWith('var(')) {
    cleanHex = '#6366f1';
  }
  
  if (!cleanHex.startsWith('#')) {
    const colorMap: Record<string, string> = {
      red: '#ef4444',
      orange: '#f97316',
      amber: '#f59e0b',
      yellow: '#eab308',
      green: '#10b981',
      emerald: '#10b981',
      teal: '#14b8a6',
      cyan: '#06b6d4',
      sky: '#0ea5e9',
      blue: '#3b82f6',
      indigo: '#6366f1',
      violet: '#8b5cf6',
      purple: '#a855f7',
      fuchsia: '#d946ef',
      pink: '#ec4899',
      rose: '#f43f5e',
      slate: '#64748b',
      gray: '#6b7280',
    };
    cleanHex = colorMap[cleanHex] || '#6366f1';
  }

  cleanHex = cleanHex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;

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

  const hue = Math.round(h * 360);
  const sat = Math.round(s * 100);

  // Light Mode Colors:
  // Background: Lightly tinted (very light, lower-medium saturation)
  // Icon: Saturated and darker for high legibility
  const bgLight = `hsl(${hue}, ${Math.max(sat, 35)}%, 93%)`;
  const iconLight = `hsl(${hue}, ${Math.max(sat, 80)}%, 38%)`;

  // Dark Mode Colors:
  // Background: Darkly tinted background
  // Icon: Saturated and light color for high contrast
  const bgDark = `hsl(${hue}, ${Math.min(sat, 45)}%, 14%)`;
  const iconDark = `hsl(${hue}, ${Math.max(sat, 85)}%, 75%)`;

  return { bgLight, iconLight, bgDark, iconDark };
}

export function CategoryIcon({ 
  icon, 
  color, 
  size = 'md', 
  className = '',
  isActive = false,
  solidBackground: _solidBackground = false,
  whiteIcon: _whiteIcon = false,
  noBackground: _noBackground = false,
}: CategoryIconProps) {
  // Always resolve Lucide icon key
  const iconKey = icon ? resolveLucideIcon(icon) : 'receipt';
  const IconComp = (iconKey && ICON_MAP[iconKey]) ? ICON_MAP[iconKey] : Tag;
  const isEmoji = isEmojiString(icon);

  // Universal sizes with beautiful proportions and circular layout
  const sizeClasses = {
    '2xs': 'w-[18px] h-[18px]',
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-[34px] h-[34px] sm:w-9 sm:h-9',
    lg: 'w-11 h-11',
    xl: 'w-12 h-12',
  };

  const iconSizes = {
    '2xs': 10.5,
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 26,
  };

  // 2.5 stroke for compact sizes to increase clarity, 2 for larger ones
  const strokeWidth = size === '2xs' || size === 'xs' ? 2.5 : 2;

  const { bgLight, iconLight, bgDark, iconDark } = getHslColors(color);

  // If active, increase tint saturation or opacity slightly
  const activeStyles = isActive ? {
    '--bg-light': `hsl(${parseInt(bgLight.split(',')[0].replace('hsl(', ''))}, 65%, 90%)`,
    '--bg-dark': `hsl(${parseInt(bgDark.split(',')[0].replace('hsl(', ''))}, 50%, 18%)`,
  } : {};

  const customStyles = {
    '--bg-light': bgLight,
    '--icon-light': iconLight,
    '--bg-dark': bgDark,
    '--icon-dark': iconDark,
    ...activeStyles,
  } as React.CSSProperties;

  return (
    <div 
      className={`flex items-center justify-center flex-shrink-0 rounded-full transition-all bg-[var(--bg-light)] text-[var(--icon-light)] dark:bg-[var(--bg-dark)] dark:text-[var(--icon-dark)] ${sizeClasses[size]} ${className}`}
      style={customStyles}
    >
      {isEmoji ? (
        <span 
          style={{ fontSize: `${iconSizes[size] - 2}px` }} 
          className="leading-none select-none flex items-center justify-center"
        >
          {icon}
        </span>
      ) : (
        <IconComp 
          size={iconSizes[size]} 
          strokeWidth={strokeWidth} 
        />
      )}
    </div>
  );
}
