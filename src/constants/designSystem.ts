/**
 * Dejz Design System - Central Semantic Design Tokens (Phase 1)
 * Single source of truth for design measurements, styles, colors, typography, and layout.
 * Controlled via CSS custom properties in index.css with strict fallback values.
 */

export const DEJZ_COLORS = {
  light: {
    canvas: 'var(--bg-color, #F2F0F0)',
    surface: 'var(--surface-color, #FFFFFF)',
    surfaceRaised: 'var(--surface-raised, #FFFFFF)',
    surfaceHigh: 'var(--surface-high, #ECEAEA)',
    surfaceMuted: 'var(--surface-muted, #ECEAEA)',
    surfaceInput: 'var(--surface-input, #ECEAEA)',
    surfaceHover: 'var(--surface-hover, #E8E6E6)',
    textPrimary: 'var(--text-primary, #151718)',
    textMetricLabel: 'var(--text-metric-label, #454C4E)',
    textSecondary: 'var(--text-secondary, #60686B)',
    textTertiary: 'var(--text-tertiary, #747D80)',
    textMuted: 'var(--text-muted, #747D80)',
    textDisabled: 'var(--text-disabled, #A4ACAF)',
    textInactive: 'var(--text-inactive, #A4ACAF)',
    borderSubtle: 'var(--border-subtle, transparent)',
    border: 'var(--border-color, transparent)',
    borderStrong: 'var(--border-strong, transparent)',
    borderControl: 'var(--border-control, transparent)',
    borderDivider: 'var(--border-divider, rgba(21, 23, 24, 0.06))',
    accent: 'var(--accent-color, #FF385C)',
    accentHover: 'var(--accent-hover, #E0294A)',
    accentPressed: 'var(--accent-pressed, #C41E3D)',
    accentSoft: 'var(--accent-soft, rgba(255, 56, 92, 0.10))',
    accentContainer: 'var(--accent-container, rgba(255, 56, 92, 0.10))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #FF385C)',
    danger: 'var(--danger-color, #EF4444)',
    dangerContainer: 'var(--danger-container, rgba(239, 68, 68, 0.10))',
    warning: 'var(--warning-color, #F59E0B)',
    warningContainer: 'var(--warning-container, rgba(245, 158, 11, 0.12))',
    success: 'var(--success-color, #05B862)',
    successContainer: 'var(--success-container, rgba(5, 184, 98, 0.10))',
    info: 'var(--info-color, #1C1917)',
    infoContainer: 'var(--info-container, var(--surface-muted))',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
  dark: {
    canvas: 'var(--bg-color, #141414)',
    surface: 'var(--surface-color, #1C1C1C)',
    surfaceRaised: 'var(--surface-raised, #242424)',
    surfaceHigh: 'var(--surface-high, #252525)',
    surfaceMuted: 'var(--surface-muted, #252525)',
    surfaceInput: 'var(--surface-input, #252525)',
    surfaceHover: 'var(--surface-hover, #2E2E2E)',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textMetricLabel: 'var(--text-metric-label, #D6D6D6)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, transparent)',
    border: 'var(--border-color, transparent)',
    borderStrong: 'var(--border-strong, transparent)',
    borderControl: 'var(--border-control, transparent)',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.05))',
    accent: 'var(--accent-color, #FF385C)',
    accentHover: 'var(--accent-hover, #FF5976)',
    accentPressed: 'var(--accent-pressed, #E0294A)',
    accentSoft: 'var(--accent-soft, rgba(255, 56, 92, 0.18))',
    accentContainer: 'var(--accent-container, rgba(255, 56, 92, 0.20))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #FF6B85)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, rgba(239, 68, 68, 0.16))',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, rgba(251, 191, 36, 0.15))',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, rgba(74, 222, 128, 0.15))',
    info: 'var(--info-color, #FFFFFF)',
    infoContainer: 'var(--info-container, var(--surface-muted))',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
  black: {
    canvas: 'var(--bg-color, #0A0A0A)',
    surface: 'var(--surface-color, #121212)',
    surfaceRaised: 'var(--surface-raised, #181818)',
    surfaceHigh: 'var(--surface-high, #1A1A1A)',
    surfaceMuted: 'var(--surface-muted, #1A1A1A)',
    surfaceInput: 'var(--surface-input, #1A1A1A)',
    surfaceHover: 'var(--surface-hover, #222222)',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textMetricLabel: 'var(--text-metric-label, #D6D6D6)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, transparent)',
    border: 'var(--border-color, transparent)',
    borderStrong: 'var(--border-strong, transparent)',
    borderControl: 'var(--border-control, transparent)',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.06))',
    accent: 'var(--accent-color, #FF385C)',
    accentHover: 'var(--accent-hover, #FF5976)',
    accentPressed: 'var(--accent-pressed, #E0294A)',
    accentSoft: 'var(--accent-soft, rgba(255, 56, 92, 0.18))',
    accentContainer: 'var(--accent-container, rgba(255, 56, 92, 0.20))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #FF6B85)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, rgba(239, 68, 68, 0.16))',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, rgba(251, 191, 36, 0.15))',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, rgba(74, 222, 128, 0.15))',
    info: 'var(--info-color, #FFFFFF)',
    infoContainer: 'var(--info-container, var(--surface-muted))',
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
    card: 'rounded-[var(--radius-card,20px)]',
    cardNested: 'rounded-[var(--radius-card-nested,12px)]',
    button: 'rounded-[var(--radius-button,12px)]',
    buttonSm: 'rounded-[var(--radius-button-sm,10px)]',
    buttonLg: 'rounded-[var(--radius-button-lg,12px)]',
    input: 'rounded-[var(--radius-input,12px)]',
    modal: 'rounded-[var(--radius-modal,24px)]',
    modalSheet: 'rounded-t-[var(--radius-modal,24px)] sm:rounded-[var(--radius-modal,24px)]',
    chip: 'rounded-[var(--radius-chip,9999px)]',
    badge: 'rounded-[var(--radius-badge,9999px)]',
    sm: 'rounded-[var(--radius-sm,6px)]',
    xs: 'rounded-[var(--radius-xs,8px)]',
    icon: 'rounded-[var(--radius-icon-button,10px)]',
    pill: 'rounded-[var(--radius-pill,9999px)]',
    bottomNav: 'rounded-[var(--radius-modal,24px)]',
    container: 'rounded-[var(--radius-container,20px)]',
  },

  /**
   * Component Dimensions / Heights
   */
  heights: {
    input: 'h-[var(--height-input,46px)]',
    button: 'h-[var(--height-button,46px)]',
    buttonSm: 'h-[var(--height-button-sm,32px)]',
    buttonLg: 'h-[var(--height-button-lg,48px)]',
    buttonPill: 'h-8',
    search: 'h-[var(--height-search,46px)]',
    iconButtonXs: 'w-7 h-7',
    iconButtonSm: 'w-8 h-8',
    iconButton: 'w-9 h-9',
    iconButtonLg: 'w-10 h-10',
    iconButtonXl: 'w-12 h-12',
    iconContainerSm: 'w-8 h-8',
    iconContainer: 'w-10 h-10',
    iconContainerLg: 'w-12 h-12',
    header: 'h-[var(--height-header,64px)]',
    bottomNav: 'h-[var(--height-bottom-nav,64px)]',
  },

  /**
   * Standard Typography token classes
   */
  typography: {
    heroNumber: 'text-hero-number',
    heroAmount: 'text-hero-amount',
    largeAmount: 'text-large-amount',
    listAmount: 'text-list-amount',
    listName: 'text-list-name',
    pageTitle: 'text-page-title',
    sectionTitle: 'text-section-title',
    sectionHeader: 'text-section-header',
    dateHeader: 'text-date-header',
    cardTitle: 'text-card-title',
    metricLabel: 'text-metric-label',
    body: 'text-body',
    bodyMedium: 'text-body-medium',
    secondary: 'text-secondary',
    unit: 'text-unit',
    label: 'text-label',
    caption: 'text-caption',
    micro: 'text-micro-label',
    amount: 'text-list-amount tabular-nums',
    metadata: 'text-micro-label',
    button: 'text-body-medium',
    input: 'text-body',
  },

  weights: {
    regular: 'font-normal',
    ui: 'font-medium',
    emphasis: 'font-semibold',
    strong: 'font-semibold',
  },

  /**
   * Border, Divide, Shadow & Ring Tokens
   */
  borders: {
    subtle: 'border-subtle',
    control: 'border-control',
    strong: 'border-strong',
    divider: 'border-divider',
  },
  shadows: {
    none: 'shadow-none',
    subtle: 'shadow-subtle',
    modal: 'shadow-modal',
  },
  divides: {
    subtle: 'divide-subtle',
    divider: 'divide-divider',
    menu: 'divide-menu',
  },
  rings: {
    focus: 'ring-focus',
    control: 'ring-control',
    accent: 'ring-accent',
  },

  /**
   * Spacing & Layout Tokens
   */
  spacing: {
    pageContainer: 'page-container',
    pagePx: 'page-px',
    pageMax: 'page-max',
    cardPadding: 'card-p',
    cardPaddingMd: 'card-p-md',
    cardPaddingSm: 'card-p-sm',
    cardPaddingLg: 'card-p-lg',
    rowPadding: 'row-p',
    elementGap: 'gap-element',
    sectionGap: 'gap-section',
    sectionSpace: 'space-y-section',
    elementSpace: 'space-y-element',
    modalPadding: 'modal-p',
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
