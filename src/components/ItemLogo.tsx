import React, { useState, useEffect } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import {
  getLogoUrl,
  getFallbackLogoUrl,
  sanitizeLogoUrl,
  fetchLogoForName,
  isMerchantCategoryIconPreferred,
} from '../utils/logo';
import { CategoryIcon, categoryColorStyle } from './CategoryIcon';
import { SwishLogo } from './SwishLogo';
import { MonogramTile, LOGO_TILE_SIZE_CLASSES } from './MonogramTile';
import { findBankMark } from '../utils/bankMarks';

/** Bilder som redan laddats och godkänts – visas direkt utan reservruta (ingen blinkning vid flikbyte). */
const verifiedLogoSrcs = new Set<string>();

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
  const [preferCatIcon, setPreferCatIcon] = useState<boolean>(() =>
    Boolean(logoUrl === 'none' || isMerchantCategoryIconPreferred(name))
  );

  // Räkna om valet när namnet eller loggan ändras (justeras direkt under render)
  const [prefInputs, setPrefInputs] = useState({ name, logoUrl });
  if (prefInputs.name !== name || prefInputs.logoUrl !== logoUrl) {
    setPrefInputs({ name, logoUrl });
    setPreferCatIcon(Boolean(logoUrl === 'none' || isMerchantCategoryIconPreferred(name)));
  }

  // …och när användaren ändrar logga/ikon-valet någon annanstans i appen
  useEffect(() => {
    const handlePrefChange = () => {
      setPreferCatIcon(Boolean(logoUrl === 'none' || isMerchantCategoryIconPreferred(name)));
    };
    window.addEventListener('dejz-logo-pref-changed', handlePrefChange);
    return () => window.removeEventListener('dejz-logo-pref-changed', handlePrefChange);
  }, [name, logoUrl]);

  // Banker: en lokal appikon per bank (eller bokstavsruta) – aldrig favicons/ordbilder från nätet
  const bankMark = preferCatIcon ? undefined : findBankMark(name);

  const isSwish =
    !bankMark &&
    !preferCatIcon &&
    ((category || '').toLowerCase() === 'swish' ||
      (name || '').toLowerCase().includes('swish') ||
      Boolean(logoUrl && (logoUrl.includes('swish') || logoUrl.includes('getswish'))));

  const resolvedSrc = preferCatIcon
    ? undefined
    : bankMark
      ? bankMark.icon
      : sanitizeLogoUrl(logoUrl, name, category) || getLogoUrl(name, category);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(resolvedSrc);
  const [imgFailed, setImgFailed] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined);

  // Börja om med rätt bild när butik, kategori eller logga ändras (justeras direkt under render)
  const [srcInputs, setSrcInputs] = useState({ name, category, logoUrl, preferCatIcon });
  if (
    srcInputs.name !== name ||
    srcInputs.category !== category ||
    srcInputs.logoUrl !== logoUrl ||
    srcInputs.preferCatIcon !== preferCatIcon
  ) {
    setSrcInputs({ name, category, logoUrl, preferCatIcon });
    setCurrentSrc(resolvedSrc);
    setImgFailed(false);
  }

  // Ingen känd logga: leta upp en via nätet (lite fördröjt så att snabb scrollning inte skickar anrop)
  useEffect(() => {
    if (preferCatIcon || bankMark || resolvedSrc || !name || name.trim().length < 3 || isSwish) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchLogoForName(name, category)
        .then((foundUrl) => {
          if (!cancelled && foundUrl) {
            setCurrentSrc(foundUrl);
            setImgFailed(false);
          }
        })
        .catch(() => {});
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, category, logoUrl, isSwish, preferCatIcon, resolvedSrc, bankMark]);

  const handleError = () => {
    const fallback = bankMark ? undefined : getFallbackLogoUrl(currentSrc, name, category);
    if (fallback && fallback !== currentSrc) {
      setCurrentSrc(fallback);
    } else {
      setImgFailed(true);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const ratio = h > 0 ? w / h : 0;
    if (
      (w <= 1 && h <= 1) ||
      (currentSrc && currentSrc.includes('sz=128') && w <= 16 && h <= 16) ||
      // Ordbild (t.ex. en bred banklogga) blir oläslig i en kvadrat → bokstavsruta i stället
      (!currentSrc?.startsWith('data:') && (ratio > 1.6 || ratio < 0.6))
    ) {
      handleError();
      return;
    }
    if (currentSrc) {
      verifiedLogoSrcs.add(currentSrc);
      setLoadedSrc(currentSrc);
    }
  };

  const sizeClasses = LOGO_TILE_SIZE_CLASSES[size];

  const iconSize = {
    sm: 24,
    md: 30,
    lg: 34,
    xl: 50,
  }[size];

  const badgeSizeClasses = {
    sm: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
    md: 'w-4 h-4 -bottom-1 -right-1',
    lg: 'w-[18px] h-[18px] -bottom-1 -right-1',
    xl: 'w-6 h-6 -bottom-0.5 -right-0.5',
  }[size];

  const badgeIconSize = {
    sm: 8,
    md: 9,
    lg: 10,
    xl: 13,
  }[size];

  const renderInnerContent = () => {
    if (isSwish) {
      return (
        <div
          className={`${sizeClasses} ui-logo-tile flex items-center justify-center overflow-hidden shrink-0`}
          title="Swish"
        >
          <SwishLogo className="w-[66%] h-[66%] object-contain" />
        </div>
      );
    }

    if (!preferCatIcon && currentSrc && !imgFailed) {
      // Tills bilden har laddats och godkänts visas bokstavsrutan – aldrig en tom vit ruta
      const isVerified =
        loadedSrc === currentSrc ||
        currentSrc.startsWith('data:') ||
        verifiedLogoSrcs.has(currentSrc);
      const isFullBleedTile =
        Boolean(bankMark) ||
        currentSrc.includes('img.logo.dev/') ||
        currentSrc.startsWith('data:image/jpeg') ||
        (currentSrc.startsWith('data:image/svg+xml') && currentSrc.includes('viewBox=%270%200%20120%20120%27')) ||
        (currentSrc.startsWith('data:image/svg+xml') && currentSrc.includes("viewBox='0 0 120 120'"));
      const img = (
        <img
          src={currentSrc}
          alt={name}
          onLoad={handleLoad}
          onError={handleError}
          className={
            isVerified
              ? isFullBleedTile
                ? 'w-full h-full object-cover scale-[1.04]'
                : 'w-full h-full object-cover'
              : 'absolute w-px h-px opacity-0 pointer-events-none'
          }
          loading="lazy"
        />
      );
      if (!isVerified) {
        return (
          <div className="relative shrink-0 inline-flex">
            <MonogramTile name={name} size={size} tint={bankMark?.tint} />
            {img}
          </div>
        );
      }
      return (
        <div
          className={`${sizeClasses} ui-logo-tile flex items-center justify-center overflow-hidden shrink-0`}
        >
          {img}
        </div>
      );
    }

    // En bank eller en logga som inte gick att visa: bokstavsruta (aldrig en tom vit ruta)
    if (!preferCatIcon && (bankMark || imgFailed)) {
      return <MonogramTile name={name} size={size} tint={bankMark?.tint} />;
    }

    return (
      <div
        className={`${sizeClasses} ui-cat-tile flex items-center justify-center shrink-0`}
        style={categoryColorStyle(category || name)}
      >
        <CategoryIcon category={category || name} size={Math.round(iconSize * 0.62)} muted />
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
        <ArrowsClockwise size={badgeIconSize} />
      </span>
    </div>
  );
};

