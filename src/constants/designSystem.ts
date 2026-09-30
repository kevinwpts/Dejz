/**
 * Dejz Design System - Locked Design Tokens
 * Single source of truth for design measurements, styles, colors, and typography.
 */

export const DEJZ_COLORS = {
  light: {
    canvas: '#F2EFE8',
    surface: '#FFFFFF',
    surfaceMuted: '#EAE6DE',
    surfaceHover: '#DFD9CF',
    textPrimary: '#1C1917',
    textSecondary: '#6E6961',
    textTertiary: '#8C867C',
    border: '#E2DDD4',
    borderStrong: '#D5CFC4',
    accent: '#05B862',
    accentSoft: '#E5F6ED',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  dark: {
    canvas: '#181818',
    surface: '#242424',
    surfaceMuted: '#2D2D2D',
    surfaceHover: '#333333',
    textPrimary: '#FFFFFF',
    textSecondary: '#A8A8A8',
    textTertiary: '#71717A',
    border: '#383838',
    borderStrong: '#3D3D3D',
    accent: '#05B862',
    accentSoft: '#0D2E1F',
    danger: '#F87171',
    warning: '#FBBF24',
  },
} as const;

export const DS = {
  colors: DEJZ_COLORS,

  radius: {
    card: 'rounded-[18px]',
    modal: 'rounded-t-[28px] sm:rounded-[24px]',
    input: 'rounded-[14px]',
    icon: 'rounded-xl',
    pill: 'rounded-full',
  },

  heights: {
    input: 'h-[48px]',
    button: 'h-[48px]',
    buttonPill: 'h-8',
    search: 'h-[44px]',
    iconButtonSm: 'w-7 h-7',
    iconButton: 'w-8 h-8',
    iconButtonLg: 'w-9 h-9 sm:w-10 sm:h-10',
    header: 'h-14',
    bottomNav: 'h-[64px] sm:h-[68px]',
  },

  typography: {
    heroAmount: 'text-4xl sm:text-5xl font-extrabold tracking-tight font-amount tabular-nums',
    pageTitle: 'text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1917] dark:text-white',
    sectionTitle: 'text-base font-bold text-[#1C1917] dark:text-white',
    cardAmount: 'text-sm sm:text-base font-bold font-amount tabular-nums',
    body: 'text-sm font-semibold text-[#1C1917] dark:text-white',
    caption: 'text-xs text-[#6E6961] dark:text-[#A8A8A8] font-medium',
    micro: 'text-[11px] font-bold tracking-wide uppercase',
  },

  spacing: {
    pageContainer: 'px-4 sm:px-6 max-w-xl mx-auto',
    cardPadding: 'p-4 sm:p-5',
    rowPadding: 'p-3.5 sm:p-4',
    stackGap: 'gap-2.5 space-y-2.5',
    sectionGap: 'space-y-6',
  },

  transitions: {
    default: 'transition-all duration-150 ease-out',
    fast: 'transition-all duration-100 ease-out',
    bounce: 'transition-transform active:scale-[0.98]',
  },
} as const;
