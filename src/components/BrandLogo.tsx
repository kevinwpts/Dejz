import React from 'react';

/**
 * Dejz riktiga logga (public/dejz_mork.png, beskuren till dejz_logo_trim.png) i valfri färg.
 * Färgen styrs med text-färg: lila på ljust (text-[var(--accent-color)]), vit på lila (text-white).
 * Använd den här i stället för den omritade DejzLogo-vektorn.
 */
export const BrandLogo: React.FC<{ className?: string; title?: string }> = ({ className = 'h-6', title = 'Dejz' }) => (
  <span
    role="img"
    aria-label={title}
    className={`inline-block align-middle bg-current ${className}`}
    style={{
      aspectRatio: '1044 / 434',
      WebkitMaskImage: 'url(/dejz_logo_trim.png)',
      maskImage: 'url(/dejz_logo_trim.png)',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    }}
  />
);
