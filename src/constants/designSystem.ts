/**
 * Dejz Design System - Central Semantic Design Tokens (Phase 1)
 * Single source of truth for design measurements, styles, colors, typography, and layout.
 * Controlled via CSS custom properties in index.css with strict fallback values.
 */

export const DEJZ_COLORS = {
  light: {
    canvas: 'var(--bg-color, #F7F7F7)',
    surface: 'var(--surface-color, #FFFFFF)',
    surfaceRaised: 'var(--surface-raised, #FFFFFF)',
    surfaceHigh: 'var(--surface-high, #F5F5F5)',
    surfaceMuted: 'var(--surface-muted, #F0F0F0)',
    surfaceHover: 'var(--bg-hover, #F0F0F0)',
    textPrimary: 'var(--text-primary, #211F1C)',
    textSecondary: 'var(--text-secondary, #6D6962)',
    textTertiary: 'var(--text-tertiary, #777168)',
    textMuted: 'var(--text-muted, #777168)',
    textDisabled: 'var(--text-disabled, #A8A39D)',
    textInactive: 'var(--text-inactive, #A8A39D)',
    borderSubtle: 'var(--border-subtle, #E2DDD4)',
    border: 'var(--border-color, #E2DDD4)',
    borderStrong: 'var(--border-strong, #D5CFC4)',
    borderControl: 'var(--border-control, #D5CFC4)',
    accent: 'var(--accent-color, #3B82F6)',
    accentHover: 'var(--accent-hover, #2563EB)',
    accentPressed: 'var(--accent-pressed, #1D4ED8)',
    accentSoft: 'var(--accent-soft, rgba(59, 130, 246, 0.08))',
    accentContainer: 'var(--accent-container, #EFF6FF)',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #3B82F6)',
    danger: 'var(--danger-color, #EF4444)',
    dangerContainer: 'var(--danger-container, #FEE2E2)',
    warning: 'var(--warning-color, #F59E0B)',
    warningContainer: 'var(--warning-container, #FEF3C7)',
    success: 'var(--success-color, #05B862)',
    successContainer: 'var(--success-container, #DCFCE7)',
    info: 'var(--info-color, #1C1917)',
    infoContainer: 'var(--info-container, #DBEAFE)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
  dark: {
    canvas: 'var(--bg-color, #191919)',
    surface: 'var(--surface-color, #1C1C1C)',
    surfaceRaised: 'var(--surface-raised, #1C1C1C)',
    surfaceHigh: 'var(--surface-high, rgba(255, 255, 255, 0.06))',
    surfaceMuted: 'var(--surface-muted, rgba(255, 255, 255, 0.05))',
    surfaceHover: 'var(--bg-hover, rgba(255, 255, 255, 0.08))',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
    border: 'var(--border-color, rgba(255, 255, 255, 0.08))',
    borderStrong: 'var(--border-strong, #858585)',
    borderControl: 'var(--border-control, #858585)',
    accent: 'var(--accent-color, #3B82F6)',
    accentHover: 'var(--accent-hover, #2563EB)',
    accentPressed: 'var(--accent-pressed, #1D4ED8)',
    accentSoft: 'var(--accent-soft, rgba(59, 130, 246, 0.18))',
    accentContainer: 'var(--accent-container, rgba(59, 130, 246, 0.22))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #FFFFFF)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #381F1F)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #342A16)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #163025)',
    info: 'var(--info-color, #FFFFFF)',
    infoContainer: 'var(--info-container, #1C1C1C)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
  black: {
    canvas: 'var(--bg-color, #0A0A0A)',
    surface: 'var(--surface-color, #0A0A0A)',
    surfaceRaised: 'var(--surface-raised, #121212)',
    surfaceHigh: 'var(--surface-high, #1A1A1A)',
    surfaceMuted: 'var(--surface-muted, #1A1A1A)',
    surfaceHover: 'var(--bg-hover, #222222)',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, #1E1E1E)',
    border: 'var(--border-color, #1E1E1E)',
    borderStrong: 'var(--border-strong, #333333)',
    borderControl: 'var(--border-control, #2A2A2A)',
    accent: 'var(--accent-color, #3B82F6)',
    accentHover: 'var(--accent-hover, #2563EB)',
    accentPressed: 'var(--accent-pressed, #1D4ED8)',
    accentSoft: 'var(--accent-soft, rgba(59, 130, 246, 0.18))',
    accentContainer: 'var(--accent-container, rgba(59, 130, 246, 0.22))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #FFFFFF)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #381F1F)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #342A16)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #163025)',
    info: 'var(--info-color, #FFFFFF)',
    infoContainer: 'var(--info-container, #1C1C1C)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
} as const;

export const DS = {
  colors: DEJZ_COLORS,

  /**
   * Semantic Corner Radii tokens
   * Any change in index.css CSS variables will automatically propagate.
   */
  radius: {
    card: 'rounded-[var(--radius-card,14px)]',
    cardNested: 'rounded-[var(--radius-card-nested,10px)]',
    button: 'rounded-[var(--radius-button,14px)]',
    buttonSm: 'rounded-[var(--radius-button-sm,10px)]',
    buttonLg: 'rounded-[var(--radius-button-lg,14px)]',
    input: 'rounded-[var(--radius-input,14px)]',
    modal: 'rounded-[var(--radius-modal,16px)]',
    modalSheet: 'rounded-t-[var(--radius-modal,16px)] sm:rounded-[var(--radius-modal,16px)]',
    chip: 'rounded-[var(--radius-chip,9999px)]',
    badge: 'rounded-[var(--radius-badge,9999px)]',
    icon: 'rounded-[var(--radius-icon-button,8px)]',
    pill: 'rounded-[var(--radius-pill,9999px)]',
    bottomNav: 'rounded-[var(--radius-modal,16px)]',
    container: 'rounded-[var(--radius-container,16px)]',
  },

  /**
   * Component Dimensions / Heights
   */
  heights: {
    input: 'h-[var(--height-input,48px)]',
    button: 'h-[var(--height-button,48px)]',
    buttonSm: 'h-[var(--height-button-sm,32px)]',
    buttonLg: 'h-[var(--height-button-lg,52px)]',
    buttonPill: 'h-8',
    search: 'h-[var(--height-search,44px)]',
    iconButtonSm: 'w-7 h-7',
    iconButton: 'w-8 h-8',
    iconButtonLg: 'w-9 h-9 sm:w-10 sm:h-10',
    header: 'h-[var(--height-header,64px)]',
    bottomNav: 'h-[var(--height-bottom-nav,64px)]',
  },

  /**
   * Standard Typography token classes
   */
  typography: {
    heroAmount: 'text-[36px] sm:text-[40px] md:text-[42px] font-semibold tracking-tight font-amount tabular-nums',
    pageTitle: 'text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--text-primary)]',
    sectionTitle: 'text-[20px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight',
    contentSectionTitle: 'text-[20px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight',
    modalTitle: 'text-[17px] sm:text-[18px] font-semibold tracking-tight text-[var(--text-primary)]',
    cardTitle: 'text-[14px] font-medium text-[var(--text-primary)]',
    merchantName: 'text-[14px] font-medium text-[var(--text-primary)] tracking-tight',
    body: 'text-[14px] sm:text-[15px] font-normal text-[var(--text-primary)]',
    input: 'text-[15px] sm:text-[16px] font-normal text-[var(--text-primary)]',
    label: 'text-[13px] sm:text-[14px] font-normal text-[var(--text-secondary)]',
    button: 'text-[15px] sm:text-[16px] font-semibold text-[var(--text-primary)]',
    filter: 'text-[13px] sm:text-[14px] font-medium',
    secondaryAction: 'text-[13px] sm:text-[14px] font-medium text-[var(--accent-color)]',
    secondary: 'text-[12px] font-normal text-[var(--text-secondary)]',
    caption: 'text-[12px] text-[var(--text-secondary)] font-normal',
    micro: 'text-[11px] font-medium tracking-normal',
    amount: 'text-[14px] font-medium font-amount tabular-nums',
    metadata: 'text-[11.5px] text-[var(--text-tertiary)] tabular-nums font-normal',
  },

  weights: {
    regular: 'font-normal',
    ui: 'font-medium',
    emphasis: 'font-semibold',
    strong: 'font-semibold',
  },

  /**
   * Spacing & Layout Tokens
   */
  spacing: {
    pageContainer: 'px-4 max-w-xl mx-auto',
    cardPadding: 'p-4',
    rowPadding: 'p-3.5 sm:p-4',
    elementGap: 'gap-2 sm:gap-3',
    sectionGap: 'space-y-6',
  },

  /**
   * Layering & Z-Index constants
   */
  zIndex: {
    base: 1,
    dropdown: 20,
    sticky: 30,
    header: 40,
    bottomNav: 40,
    backdrop: 90,
    modal: 100,
    sheet: 110,
    toast: 120,
    tooltip: 130,
  },

  /**
   * Transitions & Motion
   */
  transitions: {
    default: 'transition-all duration-150 ease-out',
    fast: 'transition-all duration-100 ease-out',
    bounce: 'transition-transform active:scale-[0.98]',
  },
} as const;

export const designSystem = DS;
