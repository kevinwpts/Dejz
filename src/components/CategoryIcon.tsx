import React from 'react';
import { Tag } from 'lucide-react';
import { ICON_MAP, resolveLucideIcon } from '../utils/icons';

interface CategoryIconProps {
  icon: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isActive?: boolean;
}

export function CategoryIcon({ 
  icon, 
  color, 
  size = 'md', 
  className = '',
  isActive = false 
}: CategoryIconProps) {
  const iconKey = resolveLucideIcon(icon);
  const IconComp = ICON_MAP[iconKey] || Tag;
  
  const sizeClasses = {
    xs: 'w-auto h-auto text-xs',
    sm: 'w-8 h-8 rounded-full text-sm',
    md: 'w-10 h-10 rounded-full text-lg',
    lg: 'w-12 h-12 rounded-full text-xl',
    xl: 'w-14 h-14 rounded-full text-2xl',
  };

  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 18,
    lg: 22,
    xl: 26,
  };

  // Clean style: subtle opacity tint of category color with rich colored stroke, no container borders
  const getMatureStyles = () => {
    if (size === 'xs') {
      return {
        backgroundColor: 'transparent',
        color: color || 'currentColor',
      };
    }

    if (color) {
      return {
        backgroundColor: `${color}${isActive ? '30' : '18'}`, // slightly stronger opacity when active
        color: color,
      };
    }

    return {
      backgroundColor: isActive ? 'var(--accent-color)/10' : 'var(--surface-color)',
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
        strokeWidth={size === 'xs' ? 2 : 1.75} 
      />
    </div>
  );
}
