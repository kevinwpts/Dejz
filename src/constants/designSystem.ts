/**
 * Dejz Design System - Core Design Tokens
 * Single source of truth for design measurements, styles, and variants.
 */

export const DS = {
  radius: {
    xs: 'rounded-[8px]',
    sm: 'rounded-[12px]',
    md: 'rounded-[16px]',
    lg: 'rounded-[20px]',
    xl: 'rounded-[24px]',
    '2xl': 'rounded-[28px]',
    '3xl': 'rounded-[32px]',
    full: 'rounded-full',
  },
  heights: {
    inputSm: 'h-[38px]',
    input: 'h-[48px]',
    inputLg: 'h-[54px]',
    buttonSm: 'h-[38px]',
    button: 'h-[48px]',
    buttonLg: 'h-[52px]',
  },
  typography: {
    heroAmount: 'font-extrabold font-amount tabular-nums tracking-tighter',
    cardAmount: 'font-bold font-amount tabular-nums tracking-tight',
    bodyText: 'text-sm text-[var(--text-primary)]',
    subText: 'text-xs text-[var(--text-secondary)] font-medium',
    label: 'text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider',
  },
  transitions: {
    default: 'transition-all duration-200 ease-out',
    fast: 'transition-all duration-150 ease-out',
    bounce: 'transition-transform active:scale-[0.98]',
  },
} as const;
