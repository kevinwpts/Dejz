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
  Tag
} from '@phosphor-icons/react';
import { getLogoUrl, getFallbackLogoUrl, sanitizeLogoUrl } from '../utils/logo';

interface ItemLogoProps {
  name: string;
  category?: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ItemLogo: React.FC<ItemLogoProps> = ({
  name,
  category,
  logoUrl,
  size = 'md',
}) => {
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
    return <Tag size={iconSize} weight="duotone" />;
  };

  if (currentSrc && !imgFailed) {
    return (
      <div
        className={`${sizeClasses} bg-white border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0 p-1`}
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
      className={`${sizeClasses} bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center shrink-0`}
    >
      {renderCategoryIcon()}
    </div>
  );
};
