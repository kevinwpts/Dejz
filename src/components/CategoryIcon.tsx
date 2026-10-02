import React from 'react';
import { Tag } from 'lucide-react';
import { ICON_MAP, resolveLucideIcon } from '../utils/icons';

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

export function CategoryIcon({ 
  icon, 
  color, 
  size = 'md', 
  className = '',
  isActive = false,
  solidBackground = false,
  whiteIcon = false,
  noBackground = false,
}: CategoryIconProps) {
  const iconKey = icon ? resolveLucideIcon(icon) : 'receipt';
  const IconComp = (iconKey && ICON_MAP[iconKey]) ? ICON_MAP[iconKey] : Tag;
  
  // Container dimensions:
  // 2xs: inline transparent / 10.5px icon
  // xs: inline transparent / 16px icon
  // sm: 32px container / 16px icon
  // md: 34-36px container / 20px icon (standard category icon container)
  // lg: 40-44px container / 22px icon
  // xl: 48px container / 24px icon
  const sizeClasses = {
    '2xs': 'w-auto h-auto',
    xs: 'w-auto h-auto',
    sm: 'w-8 h-8 rounded-full',
    md: 'w-[34px] h-[34px] sm:w-9 sm:h-9 rounded-full',
    lg: 'w-11 h-11 rounded-full',
    xl: 'w-12 h-12 rounded-full',
  };

  const iconSizes = {
    '2xs': 10.5,
    xs: 16,
    sm: 16,
    md: 20,
    lg: 22,
    xl: 24,
  };

  const strokeWidth = 1.8;

  const getMatureStyles = () => {
    if (noBackground) {
      return {
        backgroundColor: 'transparent',
        color: whiteIcon ? '#ffffff' : (color || 'currentColor'),
      };
    }

    if (size === '2xs' || size === 'xs') {
      return {
        backgroundColor: 'transparent',
        color: color || 'currentColor',
      };
    }

    if (solidBackground && color) {
      return {
        backgroundColor: color,
        color: whiteIcon ? '#ffffff' : color,
      };
    }

    if (color) {
      return {
        backgroundColor: `${color}${isActive ? '30' : '18'}`,
        color: color,
      };
    }

    return {
      backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--surface-muted)',
      color: color || 'var(--text-primary)',
    };
  };

  const styles = getMatureStyles();

  return (
    <div 
      className={`flex items-center justify-center flex-shrink-0 transition-all ${sizeClasses[size]} ${className}`}
      style={styles}
    >
      <IconComp 
        size={iconSizes[size]} 
        strokeWidth={strokeWidth} 
      />
    </div>
  );
}
