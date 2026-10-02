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
    canvas: '#141414',
    surface: '#202020',
    surfaceRaised: '#2A2A2A',
    surfaceHigh: '#353535',
    surfaceMuted: '#353535',
    surfaceHover: '#353535',
    textPrimary: '#FFFFFF',
    textSecondary: '#B8B8B8',
    textMuted: '#999999',
    textTertiary: '#999999',
    textDisabled: '#707070',
    textInactive: '#707070',
    borderSubtle: '#383838',
    border: '#383838',
    borderStrong: '#858585',
    borderControl: '#858585',
    accent: '#FFFFFF',
    accentHover: '#E8E8E8',
    accentPressed: '#D0D0D0',
    onAccent: '#141414',
    accentContainer: '#353535',
    onAccentContainer: '#FFFFFF',
    accentOnSolid: '#141414',
    success: '#4ADE80',
    successContainer: '#163025',
    warning: '#FBBF24',
    warningContainer: '#342A16',
    danger: '#FF8080',
    dangerContainer: '#381F1F',
    info: '#FFFFFF',
    infoContainer: '#2A2A2A',
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
    label: 'text-[13px] sm:text-[14px] font-normal text-[#6D6962] dark:text-[#B8B8B8]',
    button: 'text-[15px] sm:text-[16px] font-semibold text-[#211F1C] dark:text-white',
    filter: 'text-[13px] sm:text-[14px] font-medium',
    secondaryAction: 'text-[13px] sm:text-[14px] font-medium text-[var(--accent-color)]',
    secondary: 'text-[12px] font-normal text-[#6D6962] dark:text-[#B8B8B8]',
    caption: 'text-[12px] text-[#6D6962] dark:text-[#B8B8B8] font-normal',
    micro: 'text-[11px] font-medium tracking-normal',
    amount: 'text-[14px] font-medium font-amount tabular-nums',
    metadata: 'text-[11.5px] text-[#777168] dark:text-[#999999] tabular-nums font-normal',
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
