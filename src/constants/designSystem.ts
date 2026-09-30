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
    textPrimary: '#211F1C',
    textSecondary: '#6D6962',
    textTertiary: '#777168',
    border: '#E2DDD4',
    borderStrong: '#D5CFC4',
    accent: '#635BFF',
    accentSoft: '#EEECFF',
    accentPressed: '#5148E5',
    accentOnSolid: '#FFFFFF',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#05B862',
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
    accent: '#7C75FF',
    accentSoft: 'rgba(99, 91, 255, 0.2)',
    accentPressed: '#5148E5',
    accentOnSolid: '#FFFFFF',
    danger: '#F87171',
    warning: '#FBBF24',
    success: '#05B862',
  },
} as const;

export const DS = {
  colors: DEJZ_COLORS,

  radius: {
    card: 'rounded-[20px]',
    modal: 'rounded-t-[24px] sm:rounded-[20px]',
    input: 'rounded-[12px]',
    button: 'rounded-[12px]',
    icon: 'rounded-xl',
    pill: 'rounded-full',
    bottomNav: 'rounded-[24px]',
  },

  heights: {
    input: 'h-[48px]',
    button: 'h-[48px]',
    buttonPill: 'h-8',
    search: 'h-[44px]',
    iconButtonSm: 'w-7 h-7',
    iconButton: 'w-8 h-8',
    iconButtonLg: 'w-9 h-9 sm:w-10 sm:h-10',
    header: 'h-[64px]',
    bottomNav: 'h-[64px]',
  },

  typography: {
    heroAmount: 'text-3xl sm:text-4xl md:text-[48px] font-semibold tracking-tight font-amount tabular-nums',
    pageTitle: 'text-[24px] font-semibold tracking-tight text-[#211F1C] dark:text-white',
    sectionTitle: 'text-[20px] font-semibold text-[#211F1C] dark:text-white tracking-tight',
    contentSectionTitle: 'text-[20px] font-semibold text-[#211F1C] dark:text-white tracking-tight',
    modalTitle: 'text-[18px] sm:text-[20px] font-semibold tracking-tight text-[#211F1C] dark:text-white',
    cardTitle: 'text-[16px] font-medium text-[#211F1C] dark:text-white',
    merchantName: 'text-[16px] font-medium text-[#211F1C] dark:text-white tracking-tight',
    body: 'text-[16px] font-normal text-[#211F1C] dark:text-white',
    input: 'text-[16px] font-normal text-[#211F1C] dark:text-white',
    label: 'text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8]',
    button: 'text-[15px] sm:text-[16px] font-medium text-[#211F1C] dark:text-white',
    filter: 'text-[15px] sm:text-[16px] font-medium',
    secondaryAction: 'text-[14px] font-medium text-[var(--accent-color)]',
    secondary: 'text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8]',
    caption: 'text-[13px] sm:text-[14px] text-[#6D6962] dark:text-[#A8A8A8] font-normal',
    micro: 'text-[12px] font-medium tracking-normal',
    amount: 'text-[15px] sm:text-[16px] font-medium font-amount tabular-nums',
    metadata: 'text-[14px] text-[#777168] dark:text-[#71717A] tabular-nums font-normal',
  },

  weights: {
    regular: 'font-normal',
    ui: 'font-medium',
    emphasis: 'font-semibold',
    strong: 'font-semibold',
  },

  spacing: {
    pageContainer: 'px-4 max-w-xl mx-auto',
    cardPadding: 'p-4',
    rowPadding: 'p-3.5 sm:p-4',
    elementGap: 'gap-2 sm:gap-3',
    sectionGap: 'space-y-6',
  },

  transitions: {
    default: 'transition-all duration-150 ease-out',
    fast: 'transition-all duration-100 ease-out',
    bounce: 'transition-transform active:scale-[0.98]',
  },
} as const;

export const designSystem = DS;
