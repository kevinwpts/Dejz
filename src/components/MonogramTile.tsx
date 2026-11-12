// Bokstavsruta: reserv när en logga saknas, inte laddar eller är en ordbild som inte går att läsa.
// Färgen väljs deterministiskt (samma namn → samma färg) bland designsystemets toner (--mono-1 … --mono-8).
import React from 'react';

export type LogoTileSize = 'sm' | 'md' | 'lg' | 'xl';

/** Samma mått och hörn som butiks- och kategorirutorna. */
export const LOGO_TILE_SIZE_CLASSES: Record<LogoTileSize, string> = {
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-11 h-11 rounded-2xl',
  xl: 'w-14 h-14 rounded-2xl',
};

const LETTER_CLASSES: Record<LogoTileSize, string> = {
  sm: 'text-callout',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const MONO_TINT_COUNT = 8;

/** Enkel, stabil hash (FNV-1a) så att samma namn alltid får samma ton. */
function monogramTintIndex(name: string): number {
  let h = 0x811c9dc5;
  const s = name.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % MONO_TINT_COUNT) + 1;
}

function monogramLetter(name: string): string {
  const match = name.trim().match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase('sv-SE') : '•';
}

interface MonogramTileProps {
  name: string;
  size?: LogoTileSize;
  /** Tvinga en viss ton (1–8), t.ex. en bank som ska ha "sin" färg. */
  tint?: number;
  className?: string;
}

export const MonogramTile: React.FC<MonogramTileProps> = ({
  name,
  size = 'md',
  tint,
  className = '',
}) => {
  const index = tint ?? monogramTintIndex(name);
  return (
    <div
      className={`${LOGO_TILE_SIZE_CLASSES[size]} ui-cat-tile flex items-center justify-center shrink-0 select-none font-display font-bold leading-none ${LETTER_CLASSES[size]} ${className}`}
      style={{ '--cat': `var(--mono-${index})` } as React.CSSProperties}
      aria-hidden="true"
    >
      {monogramLetter(name)}
    </div>
  );
};
