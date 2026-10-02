/**
 * Dejz Design System - Locked Design Tokens
 * Single source of truth for design measurements, styles, colors, and typography.
 */

export const DEJZ_COLORS = {
  light: {
    canvas: '#EFECE6',
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
    canvas: '#121416',
    surface: '#1C1F23',
    surfaceRaised: '#25292E',
    surfaceHigh: '#30353B',
    surfaceMuted: '#30353B',
    surfaceHover: '#30353B',
    textPrimary: '#FFFFFF',
    textSecondary: '#B3BAC3',
    textMuted: '#929BA6',
    textTertiary: '#929BA6',
    textDisabled: '#69717C',
    textInactive: '#69717C',
    borderSubtle: '#343A42',
    border: '#343A42',
    borderStrong: '#7B8592',
    borderControl: '#7B8592',
    accent: '#7C75FF',
    accentHover: '#8C86FF',
    accentPressed: '#6D66EF',
    onAccent: '#121416',
    accentContainer: '#292640',
    onAccentContainer: '#D5D1FF',
    accentOnSolid: '#121416',
    success: '#4ADE80',
    successContainer: '#163025',
    warning: '#FBBF24',
    warningContainer: '#342A16',
    danger: '#FF808B',
    dangerContainer: '#381F26',
    info: '#93C5FD',
    infoContainer: '#1C2B3E',
    scrim: 'rgba(0,0,0,0.60)',
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
    heroAmount: 'text-[36px] sm:text-[40px] md:text-[42px] font-semibold tracking-tight font-amount tabular-nums',
    pageTitle: 'text-[22px] sm:text-[24px] font-semibold tracking-tight text-[#211F1C] dark:text-white',
    sectionTitle: 'text-[20px] sm:text-[22px] font-semibold text-[#211F1C] dark:text-white tracking-tight',
    contentSectionTitle: 'text-[20px] sm:text-[22px] font-semibold text-[#211F1C] dark:text-white tracking-tight',
    modalTitle: 'text-[17px] sm:text-[18px] font-semibold tracking-tight text-[#211F1C] dark:text-white',
    cardTitle: 'text-[14px] font-medium text-[#211F1C] dark:text-white',
    merchantName: 'text-[14px] font-medium text-[#211F1C] dark:text-white tracking-tight',
    body: 'text-[14px] sm:text-[15px] font-normal text-[#211F1C] dark:text-white',
    input: 'text-[15px] sm:text-[16px] font-normal text-[#211F1C] dark:text-white',
    label: 'text-[13px] sm:text-[14px] font-normal text-[#6D6962] dark:text-[#B3BAC3]',
    button: 'text-[15px] sm:text-[16px] font-semibold text-[#211F1C] dark:text-white',
    filter: 'text-[13px] sm:text-[14px] font-medium',
    secondaryAction: 'text-[13px] sm:text-[14px] font-medium text-[var(--accent-color)]',
    secondary: 'text-[12px] font-normal text-[#6D6962] dark:text-[#B3BAC3]',
    caption: 'text-[12px] text-[#6D6962] dark:text-[#B3BAC3] font-normal',
    micro: 'text-[11px] font-medium tracking-normal',
    amount: 'text-[14px] font-medium font-amount tabular-nums',
    metadata: 'text-[11.5px] text-[#777168] dark:text-[#929BA6] tabular-nums font-normal',
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
