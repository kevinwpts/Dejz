import React from 'react';

interface DejzLogoProps {
  className?: string;
  size?: number | string;
  textColor?: string;
}

export function DejzLogo({
  className = 'h-7 w-auto',
  textColor = 'var(--logo-color, #0B3DA5)',
}: DejzLogoProps) {
  return (
    <span
      className={`font-black tracking-tighter inline-flex items-center select-none font-sans lowercase ${className}`}
      style={{
        color: textColor,
        letterSpacing: '-0.06em',
        lineHeight: 1,
      }}
    >
      dejz
    </span>
  );
}
